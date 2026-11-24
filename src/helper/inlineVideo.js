/* Reader videos that play on their own stay in the page (OPENBRAIN-74).
 *
 * iPhone Safari opens a playing <video> in its full-screen player unless the
 * element says `playsinline`, and only lets one start by itself when it is
 * muted as an attribute (Vue sets `muted` as a property, which Safari does
 * not read for the autoplay decision). Use as a template ref on every
 * autoplaying loop: `<video :ref="primeInlineLoop" autoplay muted loop>`.
 */
export function primeInlineLoop(el) {
  if (!el) return;
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  for (const name of ["muted", "playsinline", "webkit-playsinline"])
    el.setAttribute(name, "");
  const started = el.play?.();
  if (started && typeof started.catch === "function") started.catch(() => {});
}
