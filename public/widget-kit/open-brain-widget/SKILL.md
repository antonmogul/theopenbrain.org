---
name: open-brain-widget
description: Build an interactive figure ("widget") for The Open Brain, the open-access neuroscience textbook, as one self-contained HTML file that drops straight into a chapter. Use whenever an author asks for a widget, interactive figure, simulation, animation or explorable for The Open Brain, or to turn a sketch, a Figma frame or a static figure into one.
---

# Open Brain widget

You are building an interactive figure for **The Open Brain**, an open-access
neuroscience textbook from McGill University (Montreal Neurological Institute).
The authors are neuroscientists; the readers are students on laptops, tablets
and phones. The finished widget is uploaded in the book's creator admin and
placed in a chapter, where it runs in a sandboxed frame beside the text.

Read `design.md` before you start. Start from `template.html`.

## What to deliver

**One file: `<name>.html`.** Everything inline: HTML, CSS, JavaScript and
images (SVG inline, or `data:` URIs). The only outside resources allowed are:

- scripts from `https://cdnjs.cloudflare.com` or `https://cdn.jsdelivr.net`
  (for example Chart.js, D3, Three.js), pinned to an exact version;
- fonts from Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`).

Anything else (other CDNs, APIs, `fetch`, images by URL, iframes) is blocked
by the book and the widget will fail its checks. No `localStorage` for
anything that matters: the frame may not keep it. Keep the file under 2 MB.

## How it must behave

1. **Fits every screen.** It must work from **360 px to 1440 px wide** with
   no horizontal scrolling. The book shows it in the chapter column on
   phones (about 360–720 px wide) and full width on desktop. Design for the
   narrow case first; widen with CSS grid or flex and `@container` or
   `@media` rules. Never set a fixed width wider than 360 px.
2. **Sets its own height.** Let the content decide the height (no
   `height: 100vh` on the page). The book resizes the frame to fit.
3. **Uses the book's tokens.** Colours, fonts and corners come from the
   `--ob-*` CSS variables in `design.md` (the book sets them; the template
   gives fallbacks so the file also works on its own). The chapter's colour
   is `--ob-accent`: use it for the one thing the reader should look at.
4. **Respects reduced motion.** When `prefers-reduced-motion: reduce` or
   `html[data-ob-reduce-motion]` is set, show the end state or step through
   without animating.
5. **Works by keyboard and touch.** Real `<button>`, `<input type="range">`
   and `<select>` elements, visible focus, targets at least 44 px on touch,
   no hover-only information.
6. **Says what it shows.** A short title and one-line instruction at the
   top ("Drag the light across the receptive field"), labels on every axis,
   and a caption or legend with units and the source of any data.
7. **Is scientifically exact.** Every label, number and claim must match the
   chapter text or a cited source. If you are unsure of a value, say so in a
   comment at the top of the file and in your reply, never guess silently.
   Put the source in the caption ("Data: Hubel & Wiesel, 1962").

## The book's bridge (optional)

The book injects a small `window.OB` object before your scripts run:

- `OB.onTheme(fn)`: called with `{ accent, reduceMotion, ramp }` when the
  book's theme is known or changes (the CSS variables are already set);
- `OB.reducedMotion`: `true` when the reader asked for less motion;
- `OB.resize()`: call after you change the layout without a DOM change
  the browser can see (the book also watches size on its own).

`template.html` includes a fallback so these calls are safe when the file is
opened on its own, in Claude or in a browser.

## Working with the author

- If they send a **sketch, a photo of a drawing or a Figma frame**, treat it
  as the brief: keep its composition and labels, redraw it cleanly in the
  book's style as inline SVG (never trace it as an image), and add the
  interaction they describe.
- Ask at most two questions before the first version; otherwise make
  sensible choices and list them.
- After each version, list in your reply: what it shows, what the reader can
  do, the checks below, and anything the author must confirm.

## Checks before you hand it over

- [ ] One `.html` file, only the allowed outside resources, under 2 MB
- [ ] No horizontal scroll at 360 px; nothing cut off at 1440 px
- [ ] Colours, fonts and corners from `--ob-*` tokens; the accent used once
- [ ] Reduced motion handled
- [ ] Keyboard and touch work; focus is visible
- [ ] Title, one-line instruction, labels, caption with units and sources
- [ ] No errors in the console
- [ ] Every scientific claim matches the chapter or a cited source
