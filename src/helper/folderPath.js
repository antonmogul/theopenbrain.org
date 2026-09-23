/*
 * folderPath — the SVG outline of one Case Cabinet folder (Figma node 3:1653).
 *
 * The folder is drawn lying in the drawer: a body with its raised tab on the
 * TOP edge. The same outline, rotated 90° clockwise, is the upright folder with
 * its tab on the right edge, which is how the cabinet pulls a file out without
 * swapping art: the view tweens these numbers and re-draws the path each frame.
 *
 *   w, h        folder size in px (tab included in h)
 *   a, b        tab start / end along the top edge, px
 *   tab         tab height, px
 *   r           body corner radius, px
 *   shoulder    how far the tab's flared base reaches out on each side, px
 */
export function folderPath({ w, h, a, b, tab, r, shoulder = tab * 0.45 }) {
  const top = tab; // the body's top edge
  const rt = Math.min(tab * 0.3, (b - a) / 4); // tab top corner radius
  const s = shoulder;
  const rr = Math.min(r, (h - top) / 2, w / 4);
  const n = (v) => Math.round(v * 10) / 10;
  return [
    `M0 ${n(h - rr)}`,
    `L0 ${n(top + rr)}`,
    `Q0 ${n(top)} ${n(rr)} ${n(top)}`,
    `L${n(a - s)} ${n(top)}`,
    // flared base, then up the tab's left side
    `C${n(a - s * 0.35)} ${n(top)} ${n(a - s * 0.1)} ${n(top * 0.8)} ${n(a)} ${n(rt)}`,
    `Q${n(a + rt * 0.25)} 0 ${n(a + rt)} 0`,
    `L${n(b - rt)} 0`,
    `Q${n(b - rt * 0.25)} 0 ${n(b)} ${n(rt)}`,
    `C${n(b + s * 0.1)} ${n(top * 0.8)} ${n(b + s * 0.35)} ${n(top)} ${n(b + s)} ${n(top)}`,
    `L${n(w - rr)} ${n(top)}`,
    `Q${n(w)} ${n(top)} ${n(w)} ${n(top + rr)}`,
    `L${n(w)} ${n(h - rr)}`,
    `Q${n(w)} ${n(h)} ${n(w - rr)} ${n(h)}`,
    `L${n(rr)} ${n(h)}`,
    `Q0 ${n(h)} 0 ${n(h - rr)}`,
    "Z",
  ].join(" ");
}
