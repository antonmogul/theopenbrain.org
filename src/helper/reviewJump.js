/*
 * reviewJump — take the reader to where a review note points
 * (OPENBRAIN-204), from "My notes" and "All notes". The in-app twin of
 * scripts/feedback/locate.mjs: the element the anchor names
 * (findAnchorElement), landed through readerJump, which already knows the
 * side-scrolling boxes (railLandingY for a pinned track, revealInRail for
 * one that scrolls by itself) and the top bar. A pane figure is reached by
 * its trigger, just past the reading line, where the pane shows it; the
 * cover and the chrome by the scroll position they were noted at.
 */
import { flashElement, jumpToElement, jumpToId, scrollToY } from "./readerJump";
import {
  anchorHash,
  findAnchorElement,
  paneTriggerFor,
} from "./reviewAnchor.mjs";

/** Go to the anchor's place. Returns whether there was somewhere to go. */
export function goToAnchor(anchor, doc = globalThis.document) {
  if (!anchor || !doc) return false;
  const win = doc.defaultView || globalThis.window;
  if (anchor.kind === "chrome") {
    const ratio =
      anchor.docHeight > 0
        ? doc.documentElement.scrollHeight / anchor.docHeight
        : 1;
    scrollToY(() => (anchor.scrollY || 0) * ratio);
    return true;
  }
  if (anchor.kind === "figure-pane") {
    const trigger = paneTriggerFor(anchor, doc);
    if (trigger) {
      // The figure comes on when its trigger's top reaches mid-screen.
      scrollToY(
        () =>
          trigger.getBoundingClientRect().top +
          win.scrollY -
          win.innerHeight / 2 +
          40
      );
      const pane = doc.querySelector(".figure-pane");
      if (pane) setTimeout(() => flashElement(pane), 600);
      return true;
    }
  }
  const el = findAnchorElement(anchor, doc);
  if (el) {
    const short = el.getBoundingClientRect().height < win.innerHeight * 0.6;
    return jumpToElement(el, { flash: true, align: short ? "center" : "top" });
  }
  const hash = anchorHash(anchor);
  return hash ? jumpToId(hash, { flash: true }) : false;
}
