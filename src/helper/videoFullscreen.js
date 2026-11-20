/* Native video fullscreen can resize/reflow the reader underneath it.
 * Keep its active figure mounted until the original viewport is back, then
 * restore the reading position before re-measuring scroll-linked figures.
 * Scope this to videos: figure widgets own their own fullscreen lifecycle.
 */
const heldReaders = new Set();
const nativeVideo = (doc) =>
  !!(doc.fullscreenElement || doc.webkitFullscreenElement)?.closest(".ve");

// Horizontal breakout tracks must not turn fullscreen reflow into a reader
// jump, including the brief return while the original viewport settles.
export function videoFullscreenHeld(doc = document) {
  return heldReaders.size > 0 || nativeVideo(doc);
}

export function holdVideoFullscreen(onReturn, doc = document, win = window) {
  let lastY = win.scrollY;
  let savedY = null;
  let frame = 0;
  let timer = 0;
  let returning = false;
  const reader = {};
  const held = () => savedY !== null || nativeVideo(doc);
  const remember = () => {
    if (!held()) lastY = win.scrollY;
  };
  const restore = () => {
    frame = 0;
    if (nativeVideo(doc) || savedY === null) return;
    const y = savedY;
    savedY = null;
    returning = false;
    win.scrollTo({ top: y, left: 0, behavior: "instant" });
    onReturn();
    // A refresh can itself move the page while measuring it.
    win.scrollTo({ top: y, left: 0, behavior: "instant" });
    lastY = y;
    heldReaders.delete(reader);
    // Reconcile the page-driven tracks before a delayed horizontal scroll
    // event can be mistaken for a reader gesture.
    win.dispatchEvent(new Event("scroll"));
  };
  const settle = () => {
    win.cancelAnimationFrame(frame);
    win.clearTimeout(timer);
    // GSAP's automatic resize refresh waits 200 ms; wait beyond it and
    // the breakout tracks' queued column measurements before returning.
    timer = win.setTimeout(() => {
      timer = 0;
      frame = win.requestAnimationFrame(() => {
        frame = win.requestAnimationFrame(restore);
      });
    }, 250);
  };
  const changed = () => {
    if (nativeVideo(doc)) {
      if (savedY === null) savedY = lastY;
      heldReaders.add(reader);
      returning = false;
      win.cancelAnimationFrame(frame);
      win.clearTimeout(timer);
      frame = 0;
    } else if (savedY !== null) {
      returning = true;
      settle();
    }
  };
  const resized = () => {
    if (returning) settle();
  };
  win.addEventListener("scroll", remember, { passive: true });
  win.addEventListener("resize", resized);
  doc.addEventListener("fullscreenchange", changed);
  doc.addEventListener("webkitfullscreenchange", changed);
  return {
    held,
    stop() {
      heldReaders.delete(reader);
      win.cancelAnimationFrame(frame);
      win.clearTimeout(timer);
      win.removeEventListener("scroll", remember);
      win.removeEventListener("resize", resized);
      doc.removeEventListener("fullscreenchange", changed);
      doc.removeEventListener("webkitfullscreenchange", changed);
    },
  };
}
