/*
 * A re-measure must not move the reader (OPENBRAIN-188).
 *
 * ScrollTrigger measures the page by scrolling it to the top and straight
 * back (`ScrollTrigger.refresh()`, which the reader runs whenever its text
 * column changes height: a figure that grows on a phone, a font arriving,
 * an Explore card opening). Both scrolls have to be instant. But index.css
 * makes the document scroll smoothly while anything in it has focus
 * (`html:focus-within { scroll-behavior: smooth }`), and ScrollTrigger looks
 * for smooth scrolling only once, when it first meets the scroller, which is
 * before the reader has focused anything. So after a tap on a control that
 * takes focus, the scroll to the top was an animation; the scroll back,
 * asked for in the same instant, found the page still where it was and did
 * nothing, and in Safari the animation then ran on to the top of the
 * chapter. The papyrus tabs showed it: they take focus on a tap (a roving
 * tabindex) and each part is a different height on a phone.
 *
 * So for the length of a refresh the document scrolls instantly, whatever
 * has focus, and the next frame gives it back its own behaviour.
 */

const guarded = new WeakSet();

/**
 * Makes every `refresh()` of this ScrollTrigger scroll instantly. Safe to
 * call more than once; does nothing without a document or the event API
 * (a mocked ScrollTrigger in a test).
 */
export function keepRefreshInstant(scrollTrigger, root) {
  const el =
    root || (typeof document === "undefined" ? null : document.documentElement);
  if (!el || !scrollTrigger?.addEventListener || guarded.has(scrollTrigger))
    return;
  guarded.add(scrollTrigger);

  let held = false;
  let before = "";
  let frame = 0;
  const release = () => {
    frame = 0;
    if (!held) return;
    held = false;
    el.style.scrollBehavior = before;
  };
  // Returns nothing: ScrollTrigger reverts whatever a refreshInit listener
  // hands back.
  scrollTrigger.addEventListener("refreshInit", () => {
    if (!held) {
      held = true;
      before = el.style.scrollBehavior;
    }
    el.style.scrollBehavior = "auto";
    // A refresh is synchronous, so the next frame is after it, however it
    // ended; two refreshes in one frame share the one release.
    if (!frame) frame = requestAnimationFrame(release);
  });
}
