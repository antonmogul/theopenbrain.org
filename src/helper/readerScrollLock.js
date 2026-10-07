/* Reader overlays can nest (a figure gallery inside a breakout). Release only
   the lock a caller acquired, and restore the exact pre-overlay styles once
   the last overlay closes. An inactive modal must never unlock an active one. */
let locks = 0;
let previous = null;

export function lockReaderScroll() {
  if (locks === 0) {
    previous = [
      document.documentElement.style.overflow,
      document.body.style.overflow,
    ];
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  locks++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks--;
    if (locks === 0 && previous) {
      document.documentElement.style.overflow = previous[0];
      document.body.style.overflow = previous[1];
      previous = null;
    }
  };
}
