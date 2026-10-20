/* Reader overlays can nest (a figure gallery inside a breakout). Release only
   the lock a caller acquired, and restore the exact pre-overlay styles once
   the last overlay closes. An inactive modal must never unlock an active one. */
let locks = 0;
let previous = null;
let lockedY = 0;

/* An overlay must not move the page it covers (Stuart, 7 Oct: closing the
   menu "brings me back to the very top of the chapter"). The lock notes
   the scroll position it found and, when the last overlay closes, puts it
   back if the page went to the top meanwhile: a layout change under the
   lock once collapsed the document to one screen (OPENBRAIN-145). Only
   that case, so a jump an overlay starts as it closes (the phone
   scrubber's) is left alone. */
export function lockReaderScroll() {
  if (locks === 0) {
    previous = [
      document.documentElement.style.overflow,
      document.body.style.overflow,
    ];
    lockedY = window.scrollY || window.pageYOffset || 0;
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
      const now = window.scrollY || window.pageYOffset || 0;
      if (now === 0 && lockedY > 0)
        window.scrollTo({ top: lockedY, left: 0, behavior: "auto" });
    }
  };
}
