"""
Direction selectivity in retinal ganglion cells

Four cells from mouse retina, recorded one at a time with a pipette
sealed loosely against the cell body so that each action potential
shows up as a blip of current. A 400 um bright square was swept across
the retina at 748 um/s in each of 8 directions, once per direction,
while every spike was recorded.

This is ordinary Python. It runs in your browser through Pyodide, and
it draws the two figures above. Edit anything and press Run.
"""

import math
import js
from pyodide.ffi import create_proxy

# The 8 directions the square was swept in, in degrees. 0 is rightward,
# 90 is upward, and so on counter-clockwise.
DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315]

# Every spike in this data set falls between 1.60 and 2.85 s after the
# sweep starts, which is when the square is passing over the cell. We
# plot only that window so the spikes are spread out and countable.
WINDOW = (1.58, 2.88)

# One colour per cell, reused for its name, its polar plot and its curve.
COLOURS = ["#c1272d", "#1b6ca8", "#b8770a", "#6b4e9b"]


# --- analysis ------------------------------------------------------

def tuning_curve(cell):
    """Count the spikes fired in each direction.

    Returns 8 numbers in the same order as DIRECTIONS. This is the
    entire measurement. Everything below is arithmetic and drawing
    built on top of these eight numbers.
    """
    return [len(cell["spikes"][deg]) for deg in DIRECTIONS]


def vector_sum(counts):
    """Preferred direction, and direction selectivity index (DSI).

    In words: a single number for how lopsided a cell's response is.
    Picture each of the 8 directions as a bearing on a compass. Give
    each one an arrow pointing that way, as long as the number of
    spikes the cell fired for it. Lay all 8 arrows end to end and see
    where you finish up.

    If the cell fired equally hard in every direction the arrows cancel
    and you end up back where you started. If it fired only one way,
    you end up as far out as the total spike count. So the length of
    that resultant, divided by the total number of spikes, measures
    selectivity, and the way it points is the preferred direction.

    In symbols, with n(k) spikes fired for direction t(k):

        Rx  = SUM n(k) * cos t(k)
        Ry  = SUM n(k) * sin t(k)

        DSI       = sqrt(Rx**2 + Ry**2) / SUM n(k)
        preferred = atan2(Ry, Rx)

    DSI runs from 0, meaning the cell fires the same in all directions
    and so has no preference, to 1, meaning every single spike came
    from one direction.
    """
    # cos and sin need radians, so convert from degrees as we go.
    rx = sum(n * math.cos(math.radians(t)) for n, t in zip(counts, DIRECTIONS))
    ry = sum(n * math.sin(math.radians(t)) for n, t in zip(counts, DIRECTIONS))
    total = sum(counts)
    dsi = math.hypot(rx, ry) / total          # hypot is sqrt(rx**2 + ry**2)
    preferred = math.degrees(math.atan2(ry, rx)) % 360
    return dsi, preferred


def rate_at(counts, deg):
    """Estimate the response at any angle, not just the 8 we measured.

    We only tested 8 directions, so for anything in between we draw a
    straight line from one measured point to the next and read off the
    value. The % 360 makes the angles wrap around, so 350 deg is
    correctly treated as sitting between 315 and 0.
    """
    deg = deg % 360
    i = int(deg // 45)          # which measured direction we are past
    f = (deg - i * 45) / 45.0   # how far along to the next one, 0 to 1
    a, b = counts[i % 8], counts[(i + 1) % 8]
    return a + (b - a) * f


def certainty_curve(selected, n_points=90):
    """How sure could a decoder be of the direction, using only these cells?

    Imagine something downstream that sees the spike counts and has to
    say which way the square moved. Real spike counts are noisy: a cell
    whose average is 20 spikes will sometimes fire 17, sometimes 24.
    Poisson noise is the usual first guess for that variability, and it
    has a convenient property - the spread is set by the average, so
    there is nothing extra to fit.

    So for each true direction we take the expected counts, and ask how
    likely every other direction would have been to produce them. That
    gives a spread of belief across the compass. If the belief is packed
    around one direction the decoder is sure; if it is smeared out, or
    split between two directions, the decoder cannot tell them apart.

    Certainty is how tightly that belief clusters: 1 means pinned to one
    direction, 0 means no idea at all.
    """
    if not selected:
        return [0.0] * n_points

    grid = [i * 360.0 / n_points for i in range(n_points)]
    curves = [tuning_curve(CELLS[i]) for i in selected]

    # Expected count for every selected cell at every direction, worked
    # out once up front. The floor keeps log() from blowing up on zeros.
    lam = [[max(rate_at(c, g), 0.05) for c in curves] for g in grid]
    log_lam = [[math.log(v) for v in row] for row in lam]
    sum_lam = [sum(row) for row in lam]

    out = []
    for a in range(n_points):
        observed = lam[a]                 # what the cells would fire here
        # Log likelihood of every candidate direction. For Poisson counts
        # this is sum of n*log(lambda) - lambda, dropping constants.
        log_p = [sum(n * ll for n, ll in zip(observed, log_lam[b])) - sum_lam[b]
                 for b in range(n_points)]
        biggest = max(log_p)
        weight = [math.exp(v - biggest) for v in log_p]   # back to probabilities
        total = sum(weight)
        # Average the candidate directions as points on a circle. The
        # length of the average tells us how clustered they are.
        cx = sum(w * math.cos(math.radians(g)) for w, g in zip(weight, grid)) / total
        cy = sum(w * math.sin(math.radians(g)) for w, g in zip(weight, grid)) / total
        out.append(math.hypot(cx, cy))
    return out


# --- drawing helpers -----------------------------------------------
# Python has no drawing canvas of its own inside a browser, so instead
# it reaches out to the page and builds SVG shapes there. SVG is just
# tags - <line>, <circle>, <text> - with attributes for position, size
# and colour.
#
# Two things to keep in mind while reading the drawing code:
#   * On a screen y grows DOWNWARDS, the opposite of a maths graph.
#     That is why angles get negated whenever a compass bearing is
#     turned into a position or a rotation.
#   * Coordinates are in the figure's own units, fixed by viewBox. The
#     browser then scales the whole figure to fit the page.

SVG_NS = "http://www.w3.org/2000/svg"


def el(tag, parent=None, **attrs):
    """Make one SVG shape and attach it to the page.

    Underscores in the keyword names become hyphens, so writing
    stroke_width=2 sets the stroke-width attribute.
    """
    node = js.document.createElementNS(SVG_NS, tag)
    for key, value in attrs.items():
        node.setAttribute(key.replace("_", "-"), str(value))
    if parent is not None:
        parent.appendChild(node)
    return node


def label(parent, x, y, string, cls="", anchor="middle"):
    """Put a piece of text at (x, y). anchor says whether that point is
    the text's start, middle or end."""
    node = el("text", parent, x=x, y=y, **{"class": cls})
    node.setAttribute("text-anchor", anchor)
    node.textContent = str(string)
    return node


def motion_arrow(parent, cx, cy, deg, scale=1.0):
    """A small arrow showing which way the square moved. It is drawn
    pointing right, then rotated into place."""
    g = el("g", parent, transform="translate(%g,%g) rotate(%g) scale(%g)"
                                  % (cx, cy, -deg, scale))
    el("line", g, x1=-22, y1=0, x2=10, y2=0, **{"class": "glyph-shaft"})
    el("path", g, d="M23 0 L9 -6.8 L9 6.8 Z", **{"class": "glyph-head"})
    return g


# --- figure 1: spike rasters and polar tuning ----------------------
# A raster is the simplest possible picture of a recording: one short
# vertical tick for every spike, placed left to right by when it
# happened. Eight columns, one per direction; four rows, one per cell.

W, H = 1480, 794                              # size of the whole figure
PAD_L, PAD_R, PAD_T, PAD_B = 140, 16, 96, 56  # margins around the panels
POLAR, RADIUS = 150, 38                       # width of, and radius in,
                                              # the polar plot column
COL = (W - PAD_L - PAD_R - POLAR) / 8.0       # width of one direction
ROW = (H - PAD_T - PAD_B) / 4.0               # height of one cell's row


def draw_rasters(mount):
    mount.innerHTML = ""            # clear whatever was drawn last time
    svg = el("svg", mount, viewBox="0 0 %d %d" % (W, H), **{"class": "fig"})

    # Column headings: an arrow and an angle for each direction.
    label(svg, PAD_L - 26, 30, "direction", "hdr", "end")
    label(svg, PAD_L - 26, 48, "of motion", "hdr", "end")
    for i, deg in enumerate(DIRECTIONS):
        cx = PAD_L + i * COL + COL / 2
        motion_arrow(svg, cx, 34, deg)
        label(svg, cx, 70, "%d°" % deg, "deg")
    el("line", svg, x1=PAD_L - 6, y1=84, x2=W - PAD_R, y2=84,
       **{"class": "rule-strong"})

    # One row per cell.
    for r, cell in enumerate(CELLS):
        counts = tuning_curve(cell)
        peak_count = max(counts)
        dsi, preferred = vector_sum(counts)
        colour = COLOURS[r]
        top = PAD_T + r * ROW       # top edge of this row
        mid = top + 52              # vertical middle, where ticks sit
        peak = counts.index(peak_count)   # which direction was strongest

        if r > 0:
            el("line", svg, x1=PAD_L - 6, y1=top - 8, x2=W - PAD_R, y2=top - 8,
               **{"class": "rule"})

        name = label(svg, PAD_L - 26, mid + 8, cell["id"], "cell-name", "end")
        name.setAttribute("fill", colour)

        # The rasters themselves.
        for i, deg in enumerate(DIRECTIONS):
            x0 = PAD_L + i * COL    # left edge of this direction's panel
            if i == peak:
                # Tint the panel behind the cell's strongest direction.
                el("rect", svg, x=x0 + 4, y=mid - 34, width=COL - 8, height=68,
                   rx=3, fill=colour, opacity=0.20)
            for t in cell["spikes"][deg]:
                if t < WINDOW[0] or t > WINDOW[1]:
                    continue
                # Turn a spike time into a position across the panel.
                fraction = (t - WINDOW[0]) / (WINDOW[1] - WINDOW[0])
                x = x0 + 8 + fraction * (COL - 16)
                el("line", svg, x1=x, y1=mid - 26, x2=x, y2=mid + 26,
                   **{"class": "spike"})

        # The polar plot: the same 8 counts arranged around a compass.
        # Distance from the centre is the spike count as a fraction of
        # this cell's own best direction, so the outer circle is always
        # that cell's maximum.
        pcx = W - PAD_R - POLAR / 2
        pcy = top + 52
        g = el("g", svg, transform="translate(%g,%g)" % (pcx, pcy))
        for f in (0.5, 1.0):                      # two guide circles
            el("circle", g, cx=0, cy=0, r=RADIUS * f,
               **{"class": "ring-out" if f == 1.0 else "ring"})
        for deg in DIRECTIONS:                    # spokes
            a = math.radians(-deg)
            el("line", g, x1=0, y1=0, x2=RADIUS * math.cos(a),
               y2=RADIUS * math.sin(a), **{"class": "spoke"})
        label(g, RADIUS + 7, 4, "0°", "polar-ax", "start")
        label(g, 0, -(RADIUS + 8), "90°", "polar-ax")
        label(g, -(RADIUS + 7), 4, "180°", "polar-ax", "end")
        label(g, 0, RADIUS + 17, "270°", "polar-ax")

        points = []
        for i, deg in enumerate(DIRECTIONS):
            a = math.radians(-deg)
            rr = counts[i] / peak_count * RADIUS
            points.append((rr * math.cos(a), rr * math.sin(a)))
        el("polygon", g, points=" ".join("%g,%g" % p for p in points),
           fill=colour, fill_opacity=0.12, stroke=colour,
           stroke_width=2.2, stroke_linejoin="round")
        for px, py in points:
            el("circle", g, cx=px, cy=py, r=2.8, fill=colour)

        # The preferred-direction arrow. Its length is the DSI, so an
        # arrow reaching the outer circle would mean a DSI of 1.
        length = dsi * RADIUS
        arrow = el("g", g, transform="rotate(%g)" % (-preferred))
        el("line", arrow, x1=0, y1=0, x2=length - 7, y2=0,
           stroke=colour, stroke_width=3.4)
        el("path", arrow, fill=colour, d="M%g 0 L%g -6.5 L%g 6.5 Z"
           % (length, length - 11, length - 11))

        label(svg, pcx, pcy + RADIUS + 37, "DSI %.2f" % dsi, "stat")
        label(svg, pcx, pcy + RADIUS + 57, "radius = %d spikes" % peak_count,
              "polar-scale")

    # A 1 second scale bar, so the time axis can be read without ticks.
    y = H - PAD_B + 26
    bar = 1.0 / (WINDOW[1] - WINDOW[0]) * (COL - 16)
    for x in (PAD_L + 8, PAD_L + 8 + bar):
        el("line", svg, x1=x, y1=y - 5, x2=x, y2=y + 5, **{"class": "scale"})
    el("line", svg, x1=PAD_L + 8, y1=y, x2=PAD_L + 8 + bar, y2=y,
       **{"class": "scale"})
    label(svg, PAD_L + 8 + bar + 12, y + 5, "1 s", "scale-label", "start")


# --- figure 2: population coding -----------------------------------
# The same tuning curves, unrolled. A polar plot is this graph bent
# into a circle. Here direction runs left to right, and height is the
# spike count as a percentage of each cell's own peak, so the four
# cells can be compared directly.

TW, TH = 1180, 534
TP_L, TP_R = 104, 26
PLOT_W = TW - TP_L - TP_R
TUNE_T, TUNE_H = 26, 236        # the tuning curves panel
CERT_T, CERT_H = 300, 150       # the decoder certainty panel below it

_handlers = []       # keeps the event callbacks alive after Run finishes


def draw_tuning(mount):
    mount.innerHTML = ""
    svg = el("svg", mount, viewBox="0 0 %d %d" % (TW, TH),
             tabindex="0", role="img",
             **{"class": "fig tuning",
                "aria-label": "Firing rate and decoder certainty against direction of "
                              "motion. Use the left and right arrow keys to change direction."})

    # Three little helpers that turn data into positions on the page.
    def X(deg):
        return TP_L + deg / 360.0 * PLOT_W

    def Y(frac):                       # tuning panel, top
        return TUNE_T + (1 - frac) * TUNE_H

    def YC(frac):                      # certainty panel, below it
        return CERT_T + (1 - frac) * CERT_H

    # Tuning panel: horizontal grid and its axis labels.
    for f in (0, 0.25, 0.5, 0.75, 1.0):
        el("line", svg, x1=TP_L, y1=Y(f), x2=TP_L + PLOT_W, y2=Y(f),
           **{"class": "rule-strong" if f == 0 else "grid"})
        label(svg, TP_L - 14, Y(f) + 5, "%d%%" % round(f * 100), "tick", "end")
    t1 = label(svg, 26, TUNE_T + TUNE_H / 2, "spikes, % of the cell's peak",
               "axis-title")
    t1.setAttribute("transform", "rotate(-90 26 %g)" % (TUNE_T + TUNE_H / 2))

    # Certainty panel: same idea, its own scale. Its y axis label runs over two
    # lines because the panel is not tall enough for it on one.
    mid_c = CERT_T + CERT_H / 2
    for x, line in ((18, "how sure a decoder is"), (38, "of motion direction")):
        t = label(svg, x, mid_c, line, "axis-title")
        t.setAttribute("transform", "rotate(-90 %g %g)" % (x, mid_c))
    for f in (0, 0.5, 1.0):
        el("line", svg, x1=TP_L, y1=YC(f), x2=TP_L + PLOT_W, y2=YC(f),
           **{"class": "rule-strong" if f == 0 else "grid"})
        label(svg, TP_L - 14, YC(f) + 5, "%d%%" % round(f * 100), "tick", "end")

    # Shared x axis, drawn once underneath both panels.
    for deg in range(0, 361, 45):
        el("line", svg, x1=X(deg), y1=TUNE_T, x2=X(deg), y2=Y(0), **{"class": "grid-v"})
        el("line", svg, x1=X(deg), y1=CERT_T, x2=X(deg), y2=YC(0), **{"class": "grid-v"})
        label(svg, X(deg), YC(0) + 24, "%d°" % deg, "tick")
        motion_arrow(svg, X(deg), YC(0) + 46, deg, 0.55)
    label(svg, TP_L + PLOT_W / 2, TH - 8, "direction of motion", "axis-title")

    # Normalise each cell to its own peak so the shapes can be compared.
    curves = []
    for cell in CELLS:
        counts = tuning_curve(cell)
        peak = max(counts)
        curves.append({"counts": counts, "peak": peak,
                       "norm": [n / peak for n in counts]})

    # One line per cell. 0 deg is repeated at 360 so the curve joins up.
    cell_art = []
    for i, curve in enumerate(curves):
        points = [(X(d), Y(rate_at(curve["norm"], d))) for d in range(0, 361, 45)]
        line = el("polyline", svg, points=" ".join("%g,%g" % p for p in points),
                  fill="none", stroke=COLOURS[i], stroke_width=3.6,
                  stroke_linejoin="round", stroke_linecap="round")
        marks = [el("circle", svg, cx=px, cy=py, r=4.4, fill=COLOURS[i])
                 for px, py in points]
        cell_art.append((line, marks))

    # The certainty curve. Filled underneath so it reads as a level.
    cert_area = el("polygon", svg, points="", fill="#14161a", fill_opacity=0.09)
    cert_line = el("polyline", svg, points="", fill="none", stroke="#14161a",
                   stroke_width=3.2, stroke_linejoin="round")

    # The draggable line, crossing both panels.
    cursor = el("g", svg)
    rule = el("line", cursor, y1=TUNE_T - 8, y2=YC(0) + 8, **{"class": "cursor-line"})
    knob = el("path", cursor, d="M0 -10 L8 -24 L-8 -24 Z", **{"class": "cursor-knob"})
    dots = [el("circle", cursor, r=7.5, fill="#fff", stroke=COLOURS[i],
               stroke_width=3.6) for i in range(len(curves))]
    cert_dot = el("circle", cursor, r=7.5, fill="#fff", stroke="#14161a",
                  stroke_width=3.6)

    # Which cells the decoder is allowed to listen to. Click a row in the
    # table beside the graph to add or remove one.
    selected = [True, True, True, True]
    state = {"angle": 45.0, "cert": []}

    def cert_at(deg):
        """Read the certainty curve at any angle."""
        c = state["cert"]
        if not c:
            return 0.0
        n = len(c)
        x = deg / 360.0 * n
        i = int(x) % n
        f = x - int(x)
        return c[i] + (c[(i + 1) % n] - c[i]) * f

    def place(deg):
        """Move the line to this direction and update everything else."""
        angle = deg % 360
        state["angle"] = angle
        x = X(angle)
        rule.setAttribute("x1", str(x))
        rule.setAttribute("x2", str(x))
        knob.setAttribute("transform", "translate(%g,%g)" % (x, TUNE_T))
        for i, curve in enumerate(curves):
            dots[i].setAttribute("cx", str(x))
            dots[i].setAttribute("cy", str(Y(rate_at(curve["norm"], angle))))
        cert_dot.setAttribute("cx", str(x))
        cert_dot.setAttribute("cy", str(YC(cert_at(angle))))
        update_readout(angle,
                       [(rate_at(c["norm"], angle), rate_at(c["counts"], angle))
                        for c in curves],
                       selected, cert_at(angle))

    def refresh():
        """Recompute after the set of listened-to cells changes."""
        chosen = [i for i, on in enumerate(selected) if on]
        state["cert"] = certainty_curve(chosen)
        n = len(state["cert"])
        pts = [(X(i * 360.0 / n), YC(state["cert"][i])) for i in range(n)]
        pts.append((X(360), YC(state["cert"][0])))
        cert_line.setAttribute("points", " ".join("%g,%g" % p for p in pts))
        cert_area.setAttribute("points",
                               "%g,%g " % (X(0), YC(0))
                               + " ".join("%g,%g" % p for p in pts)
                               + " %g,%g" % (X(360), YC(0)))
        # Fade the cells the decoder is ignoring.
        for i, (line, marks) in enumerate(cell_art):
            shade = "1" if selected[i] else "0.12"
            line.setAttribute("opacity", shade)
            for m in marks:
                m.setAttribute("opacity", shade)
            dots[i].setAttribute("opacity", shade)
        place(state["angle"])

    def from_event(event):
        """Turn a mouse or finger position into an angle."""
        box = svg.getBoundingClientRect()
        px = (event.clientX - box.left) / box.width * TW
        place(max(0.0, min(360.0, (px - TP_L) / PLOT_W * 360.0)))

    drag = {"on": False}

    def on_down(event):
        drag["on"] = True
        svg.setPointerCapture(event.pointerId)
        from_event(event)

    def on_move(event):
        if drag["on"]:
            from_event(event)

    def on_up(event):
        drag["on"] = False

    def on_key(event):
        step = 45 if event.shiftKey else 5
        if event.key == "ArrowRight":
            place(state["angle"] + step)
            event.preventDefault()
        elif event.key == "ArrowLeft":
            place(state["angle"] - step)
            event.preventDefault()

    # create_proxy lets the browser call these Python functions.
    for name, fn in (("pointerdown", on_down), ("pointermove", on_move),
                     ("pointerup", on_up), ("keydown", on_key)):
        proxy = create_proxy(fn)
        _handlers.append(proxy)
        svg.addEventListener(name, proxy)

    def on_toggle(event):
        row = event.target.closest("tr[data-cell]")
        if row is None:
            return
        i = int(row.getAttribute("data-cell"))
        selected[i] = not selected[i]
        refresh()

    proxy = create_proxy(on_toggle)
    _handlers.append(proxy)
    js.document.getElementById("readout-rows").addEventListener("click", proxy)

    refresh()


def update_readout(angle, values, selected, certainty):
    """Fill in the dial, the four cell rows, and the certainty meter."""
    js.document.getElementById("ang-val").innerHTML = "%d&deg;" % round(angle)
    js.document.getElementById("dial-arrow").setAttribute(
        "transform", "translate(66,66) rotate(%g)" % (-angle))
    a = math.radians(-angle)
    square = js.document.getElementById("dial-square")
    square.setAttribute("x", str(66 + 46 * math.cos(a) - 7))
    square.setAttribute("y", str(66 + 46 * math.sin(a) - 7))

    rows = []
    for i, (pct, spikes) in enumerate(values):
        on = selected[i]
        rows.append(
            "<tr data-cell='%d' class='%s'><td><span class='chk'>%s</span>"
            "<span class='sw' style='background:%s'></span>Cell %d</td>"
            "<td class='val'>%d%%</td><td class='spk'>%d spk</td></tr>"
            % (i, "" if on else "off", "✓" if on else "",
               COLOURS[i], i + 1, round(pct * 100), round(spikes)))
    js.document.getElementById("readout-rows").innerHTML = "".join(rows)

    js.document.getElementById("cert-val").textContent = "%d%%" % round(certainty * 100)
    fill = js.document.getElementById("cert-fill")
    fill.style.width = "%.1f%%" % (certainty * 100)
    fill.style.background = "#c1272d" if certainty < 0.6 else "#14161a"
    js.document.getElementById("cert-note").textContent = (
        "another direction would look the same" if certainty < 0.6
        else "no other direction looks like this")


# --- data ----------------------------------------------------------

# Each cell is a dictionary. "spikes" maps a direction of motion, in
# degrees, to the list of times at which the cell fired during that
# sweep. Times are seconds measured from the moment the square
# started moving. Nothing here has been averaged or smoothed.

CELLS = [
    {
        "id": "Cell 1",
        "spikes": {
              0: [
                1.73, 1.75, 1.761, 1.769, 1.777, 1.784, 1.79, 1.795, 1.801, 1.805, 1.812,
                1.819, 1.827, 1.834, 1.84, 1.847, 1.854, 1.862, 1.869, 1.877, 1.883,
                1.891, 1.898, 1.905, 1.912, 1.921, 1.929, 1.94, 1.95, 1.96, 1.97, 1.98,
                1.994, 2.011, 2.028, 2.393, 2.441, 2.62, 2.641, 2.664, 2.685
            ],
             45: [
                1.745, 1.768, 1.778, 1.787, 1.795, 1.802, 1.809, 1.817, 1.825, 1.832,
                1.84, 1.847, 1.853, 1.859, 1.866, 1.872, 1.879, 1.885, 1.892, 1.899,
                1.906, 1.914, 1.923, 1.93, 1.938, 1.949, 1.96, 1.976, 1.998
            ],
             90: [
                1.777, 1.789, 1.793, 1.803, 1.818, 1.836, 1.877, 1.89, 1.905, 1.919,
                1.938, 1.968, 2.02, 2.545
            ],
            135: [1.892, 1.915, 1.952],
            180: [1.899, 2.566, 2.621],
            225: [
                1.674, 1.696, 1.719, 1.736, 1.749, 1.76, 1.766, 1.772, 1.782, 1.792,
                1.801, 1.807, 1.817, 1.827, 1.839, 1.85, 1.874, 1.897, 2.564, 2.638
            ],
            270: [
                1.682, 1.712, 1.721, 1.729, 1.737, 1.743, 1.751, 1.758, 1.763, 1.77,
                1.777, 1.784, 1.79, 1.797, 1.805, 1.812, 1.819, 1.827, 1.833, 1.841,
                1.849, 1.855, 1.862, 1.871, 1.879, 1.889, 1.901, 1.92, 1.959, 2.499,
                2.514, 2.527, 2.54, 2.557
            ],
            315: [
                1.696, 1.71, 1.723, 1.736, 1.744, 1.752, 1.759, 1.765, 1.773, 1.779,
                1.785, 1.791, 1.798, 1.806, 1.813, 1.82, 1.828, 1.836, 1.844, 1.851,
                1.858, 1.866, 1.874, 1.881, 1.89, 1.898, 1.911, 1.923, 1.945, 1.956,
                1.975, 2.021, 2.462, 2.515, 2.555, 2.62, 2.633, 2.645, 2.653, 2.664,
                2.681
            ]
        },
    },
    {
        "id": "Cell 2",
        "spikes": {
              0: [
                1.869, 1.887, 1.908, 1.931, 1.968, 2.01, 2.45, 2.459, 2.467, 2.479,
                2.494
            ],
             45: [
                1.668, 1.687, 1.696, 1.706, 1.712, 1.719, 1.724, 1.729, 1.736, 1.75,
                1.756, 1.764, 1.771, 1.78, 1.787, 1.795, 1.808, 1.817, 1.841, 1.855,
                1.866, 1.875, 1.89, 1.899, 1.905, 1.912, 1.92, 1.927, 1.935, 1.944,
                1.956, 1.976, 2.007, 2.29, 2.312, 2.42, 2.456
            ],
             90: [
                1.676, 1.702, 1.709, 1.714, 1.719, 1.733, 1.743, 1.756, 1.785, 1.808,
                1.823, 1.834, 1.845, 1.851, 1.86, 1.866, 1.873, 1.88, 1.89, 1.896, 1.903,
                1.91, 1.917, 1.924, 1.934, 1.947, 1.953, 1.961, 1.973, 1.996, 2.023,
                2.288, 2.306, 2.324, 2.358, 2.466, 2.493, 2.54
            ],
            135: [
                1.816, 1.829, 1.835, 1.842, 1.849, 1.854, 1.861, 1.868, 1.875, 1.88,
                1.886, 1.893, 1.902, 1.909, 1.917, 1.924, 1.931, 1.942, 2.392, 2.416,
                2.456, 2.48, 2.491
            ],
            180: [
                1.774, 1.785, 1.796, 1.804, 1.811, 1.833, 1.863, 1.954, 2.365, 2.404,
                2.454
            ],
            225: [],
            270: [],
            315: [1.808, 1.84, 1.853, 1.873, 1.916, 2.385]
        },
    },
    {
        "id": "Cell 3",
        "spikes": {
              0: [1.765, 1.855, 1.907, 2.029, 2.249],
             45: [
                1.596, 1.617, 1.641, 1.655, 1.669, 1.686, 1.704, 1.718, 1.738, 1.752,
                1.802, 2.019, 2.165, 2.795
            ],
             90: [
                1.628, 1.667, 1.706, 1.729, 1.748, 1.773, 1.78, 1.807, 1.819, 1.83,
                1.838, 1.847, 1.855, 1.863, 1.879, 1.889, 1.908, 1.949, 1.959, 1.981,
                1.996, 2.013, 2.037, 2.052, 2.065, 2.083, 2.093, 2.114, 2.13, 2.14,
                2.149, 2.176
            ],
            135: [
                1.724, 1.798, 1.853, 1.899, 1.924, 1.939, 1.951, 1.966, 1.981, 1.993, 2,
                2.007, 2.014, 2.02, 2.025, 2.034, 2.039, 2.044, 2.049, 2.056, 2.062,
                2.073, 2.082, 2.09, 2.101, 2.107, 2.121, 2.13, 2.139, 2.145, 2.16, 2.169,
                2.183, 2.196, 2.21, 2.233, 2.85
            ],
            180: [
                1.892, 1.955, 1.988, 2.004, 2.019, 2.031, 2.039, 2.047, 2.055, 2.063,
                2.07, 2.081, 2.087, 2.093, 2.1, 2.105, 2.113, 2.118, 2.124, 2.129, 2.135,
                2.144, 2.15, 2.16, 2.166, 2.173, 2.182, 2.19, 2.2, 2.213, 2.228, 2.596,
                2.605, 2.616, 2.631, 2.651, 2.664, 2.677, 2.686, 2.695, 2.701, 2.718,
                2.725, 2.734, 2.75
            ],
            225: [
                1.924, 1.943, 1.952, 1.963, 1.971, 1.985, 2.014, 2.054, 2.089, 2.113,
                2.124, 2.132, 2.139, 2.15, 2.155, 2.171, 2.189, 2.201, 2.463, 2.484,
                2.528, 2.616, 2.65, 2.665, 2.677, 2.688, 2.696
            ],
            270: [1.931, 1.984, 2.015, 2.037, 2.059, 2.081, 2.099, 2.152, 2.184, 2.285],
            315: []
        },
    },
    {
        "id": "Cell 4",
        "spikes": {
              0: [
                1.73, 1.834, 1.852, 1.876, 1.902, 1.927, 1.945, 1.964, 1.979, 1.996,
                2.009, 2.027, 2.039, 2.057, 2.09, 2.128, 2.516, 2.551, 2.631
            ],
             45: [2.048, 2.076, 2.102, 2.135],
             90: [2.02, 2.054, 2.114],
            135: [1.724, 1.751, 1.771, 1.961, 2.003, 2.035],
            180: [
                1.666, 1.68, 1.697, 1.713, 1.73, 1.74, 1.749, 1.758, 1.767, 1.779, 1.792,
                1.809, 1.817, 1.827, 1.847, 1.855, 1.867, 1.878, 1.891, 1.904, 1.919,
                1.937, 1.958
            ],
            225: [
                1.653, 1.671, 1.68, 1.686, 1.693, 1.7, 1.71, 1.717, 1.724, 1.731, 1.737,
                1.744, 1.75, 1.757, 1.765, 1.775, 1.783, 1.789, 1.796, 1.803, 1.809,
                1.815, 1.823, 1.829, 1.837, 1.844, 1.85, 1.857, 1.864, 1.873, 1.882,
                1.891, 1.899, 1.907, 1.916, 1.928, 1.941, 1.963, 1.994
            ],
            270: [
                1.621, 1.639, 1.657, 1.675, 1.685, 1.694, 1.698, 1.709, 1.713, 1.723,
                1.731, 1.74, 1.748, 1.756, 1.763, 1.769, 1.776, 1.783, 1.79, 1.798,
                1.806, 1.813, 1.82, 1.828, 1.834, 1.841, 1.848, 1.854, 1.86, 1.867,
                1.876, 1.884, 1.893, 1.9, 1.911, 1.923, 1.934, 1.951, 1.964, 1.985,
                2.016
            ],
            315: [
                1.734, 1.746, 1.755, 1.763, 1.773, 1.782, 1.789, 1.795, 1.802, 1.808,
                1.817, 1.823, 1.83, 1.836, 1.841, 1.846, 1.851, 1.857, 1.864, 1.87,
                1.875, 1.88, 1.886, 1.893, 1.901, 1.908, 1.916, 1.924, 1.934, 1.943,
                1.952, 1.961, 1.971, 1.98, 1.989, 2, 2.025, 2.051, 2.085
            ]
        },
    },
]

# --- draw ----------------------------------------------------------

draw_rasters(js.document.getElementById("rasters"))
draw_tuning(js.document.getElementById("tuning"))
