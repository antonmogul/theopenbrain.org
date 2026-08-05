/*
 * appWidth — publish the real content width as the --app-w custom property.
 *
 * CSS `100vw` is the viewport width INCLUDING the classic scrollbar gutter.
 * On any page that scrolls vertically — i.e. every chapter — layout built on
 * 100vw is therefore ~15px wider than the space actually available, and the
 * document gains a horizontal scrollbar. That was the cause of the chapter
 * reader scrolling sideways at every desktop width (OPENBRAIN-4).
 *
 * `documentElement.clientWidth` is the same measurement *excluding* the
 * scrollbar, which is what full-bleed breakouts actually want. Publishing it
 * as --app-w lets CSS use it wherever 100vw would have been wrong.
 *
 * Overlay scrollbars (macOS default, most touch devices) make the two values
 * identical, which is why this bug is invisible on a Mac with default settings
 * and obvious on Windows or with "always show scrollbars" enabled.
 */

/* Write the current content width to --app-w on :root. */
export function syncAppWidth(doc = document) {
  const w = doc.documentElement.clientWidth;
  doc.documentElement.style.setProperty("--app-w", `${w}px`);
  return w;
}

/*
 * Keep --app-w current across viewport changes. Returns a teardown function.
 *
 * ResizeObserver on documentElement catches the cases a resize event misses —
 * notably a scrollbar appearing or disappearing as content grows or shrinks,
 * which changes clientWidth without changing the window size.
 */
export function observeAppWidth(win = window) {
  const doc = win.document;
  syncAppWidth(doc);

  const onResize = () => syncAppWidth(doc);
  win.addEventListener("resize", onResize);

  let ro = null;
  if (typeof win.ResizeObserver === "function") {
    ro = new win.ResizeObserver(onResize);
    ro.observe(doc.documentElement);
  }

  return () => {
    win.removeEventListener("resize", onResize);
    if (ro) ro.disconnect();
  };
}
