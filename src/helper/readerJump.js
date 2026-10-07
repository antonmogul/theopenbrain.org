/*
 * readerJump — the one way the reader scrolls to something (OPENBRAIN-128).
 *
 * The chapter timeline, the top bar's section menu, the sidebar's notebook
 * and trending lists and the opener's contents each used to scroll their own
 * way (scrollIntoView, a hard-coded 60px top bar, querySelector('#' + slug)),
 * so a jump landed differently depending on where it started and ignored the
 * reader's reduced-motion setting. They all come through here: find the
 * anchor, land it below the fixed top bar (the same offset as the reader's
 * scroll-margin-top in index.css), smooth unless motion is reduced, and
 * optionally flash it (.ob-flash, index.css).
 *
 * Framework-free: plain DOM, so it works from components, composables and
 * tests alike.
 */

const FLASH_MS = 1600;
// A smooth jump cut short tries again this many times, within this long.
const RESUME_TRIES = 3;
const RESUME_MS = 3000;
// The reader taking over the scroll: a jump stops trying to land.
const READER_INPUT = ["wheel", "touchstart", "pointerdown", "keydown"];
// --reader-topbar-h's value in brand.css (4rem), for when it can't be read.
const TOPBAR_FALLBACK = 64;
// Breathing room under the top bar: the 1rem of scroll-margin-top.
const TOP_GAP = 16;

const flashTimers = new WeakMap();

/** "1" → true, "0" → false, otherwise the OS prefers-reduced-motion query. */
export function reducedMotionPreferred(
  root = globalThis.document?.documentElement
) {
  // The reader's own setting decides; the OS only when it is unset
  // (usePreferences writes data-reduce-motion, as useFigureLinks reads it).
  const pref = root?.getAttribute?.("data-reduce-motion");
  if (pref === "1") return true;
  if (pref === "0") return false;
  return !!globalThis.window?.matchMedia?.("(prefers-reduced-motion: reduce)")
    ?.matches;
}

/* A CSS length as px: px and rem directly (brand.css uses rem); anything
   else (calc(), em) resolved by the browser on a hidden probe. */
function lengthToPx(raw, root) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const m = /^(-?\d*\.?\d+)(px|rem)?$/.exec(value);
  if (m) {
    const n = parseFloat(m[1]);
    if (m[2] !== "rem") return n;
    const base = parseFloat(getComputedStyle(root).fontSize);
    return n * (base > 0 ? base : 16);
  }
  const body = root.ownerDocument?.body;
  if (!body) return null;
  const probe = root.ownerDocument.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:${value}`;
  body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px > 0 ? px : null;
}

/** px below the viewport top a jump should land at: the resolved --reader-topbar-h + 16. */
export function readerTopInset() {
  const root = globalThis.document?.documentElement;
  if (!root) return TOPBAR_FALLBACK + TOP_GAP;
  const raw = getComputedStyle(root).getPropertyValue("--reader-topbar-h");
  const px = lengthToPx(raw, root);
  return (px != null && px >= 0 ? px : TOPBAR_FALLBACK) + TOP_GAP;
}

// An attribute value inside double quotes: only quotes, backslashes and
// newlines need escaping. Not CSS.escape, which is for identifiers: it turns
// a UUID's leading digit into "\31 ", which happy-dom (the unit tests)
// doesn't match.
const quoted = (value) =>
  value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ");

/**
 * The element for an id: getElementById, else [data-timeline-id] (widgets
 * and breaks), else [data-paragraph-id] (a paragraph in the creator's
 * editor, which renders no id). Null when nothing matches.
 */
export function findReaderAnchor(id) {
  const doc = globalThis.document;
  if (!doc || id == null || id === "") return null;
  const key = String(id);
  const attr = quoted(key);
  return (
    doc.getElementById(key) ||
    doc.querySelector(`[data-timeline-id="${attr}"]`) ||
    doc.querySelector(`[data-paragraph-id="${attr}"]`)
  );
}

/** Briefly mark an element (.ob-flash, removed after 1600ms). */
export function flashElement(el) {
  if (!el?.classList) return;
  clearTimeout(flashTimers.get(el));
  // Off, a reflow, on: a second jump to the same element flashes again.
  el.classList.remove("ob-flash");
  void el.offsetWidth;
  el.classList.add("ob-flash");
  flashTimers.set(
    el,
    setTimeout(() => {
      el.classList.remove("ob-flash");
      flashTimers.delete(el);
    }, FLASH_MS)
  );
}

// Elements that take focus without a tabindex.
const FOCUSABLE =
  "a[href], area[href], button, input, select, textarea, iframe, summary, [contenteditable]:not([contenteditable='false'])";

/**
 * Move keyboard and screen-reader focus to `el` without scrolling (the jump
 * already scrolls), so Tab and the reading cursor carry on from where the
 * reader landed rather than from the control they jumped with. An element
 * that can't take focus (a paragraph, a section) gets tabindex="-1" and
 * data-jump-target until focus leaves it; index.css paints no focus ring on
 * it (the jump's flash, or the heading at the top, marks the spot).
 * `focusVisible: false` is for a jump made with a click or tap, where the
 * browser takes it (Firefox, Safari): after a press that focused nothing,
 * a script's focus otherwise counts as the keyboard's. Chrome (141) ignores
 * the option, so the ring there is index.css's to hide. Returns false if
 * !el.
 */
export function focusElement(el, { focusVisible } = {}) {
  if (typeof el?.focus !== "function") return false;
  if (!el.hasAttribute("tabindex") && !el.matches(FOCUSABLE)) {
    el.setAttribute("tabindex", "-1");
    el.setAttribute("data-jump-target", "");
    el.addEventListener(
      "blur",
      () => {
        el.removeAttribute("tabindex");
        el.removeAttribute("data-jump-target");
      },
      { once: true }
    );
  }
  const options = { preventScroll: true };
  if (focusVisible === false) options.focusVisible = false;
  el.focus(options);
  return true;
}

// The dev trigger lines either side of a section's transition spacer
// (SectionComp, ?markers=1).
const MARKER = ".marker-start, .marker-end";

/**
 * Where reading starts in `el`. A section whose first paragraph runs a
 * figure transition opens with a 200vh .section-transition-spacer
 * (SectionComp; shown from 1024px), so landing on the <section> shows a
 * blank stretch with its heading two screens down. When `el` opens with a
 * spacer that takes up room, this is the first element after it (past the
 * .marker-* lines); otherwise `el` itself.
 */
export function readingStartOf(el) {
  const skipMarkers = (node) => {
    while (node?.matches(MARKER)) node = node.nextElementSibling;
    return node;
  };
  const spacer = skipMarkers(el?.firstElementChild);
  if (
    !spacer?.matches(".section-transition-spacer") ||
    !(spacer.getBoundingClientRect().height > 0)
  )
    return el;
  return skipMarkers(spacer.nextElementSibling) || el;
}

let stopLanding = null;

/**
 * Scroll the window to `topOf()` (a scrollY, ≥ 0), smooth unless reduced
 * motion. Returns false, without scrolling, when it isn't a number.
 *
 * A smooth scroll something else cuts short still lands: ScrollTrigger's
 * refresh (IllustrationsComp runs one when a font or the text column
 * finishes loading or resizing, as a jump's first preview card or the
 * figures it passes can make it) scrolls to 0 and back to measure, which
 * stops the scroll where it was. So at each scrollend short of `topOf()`,
 * asked again in case the page moved, it scrolls on, a few times at most;
 * the reader's own wheel, touch, click or key lets it go.
 */
export function scrollToY(topOf) {
  const y = () => {
    const top = Number(topOf());
    return Number.isFinite(top) ? Math.max(0, Math.round(top)) : null;
  };
  const first = y();
  if (first === null) return false;
  stopLanding?.();
  const smooth = !reducedMotionPreferred();
  window.scrollTo({ top: first, behavior: smooth ? "smooth" : "auto" });
  if (!smooth) return true;

  let tries = 0;
  const until = Date.now() + RESUME_MS;
  const stop = () => {
    window.removeEventListener("scrollend", onEnd);
    for (const type of READER_INPUT)
      window.removeEventListener(type, stop, true);
    if (stopLanding === stop) stopLanding = null;
  };
  function onEnd() {
    const top = y();
    const max = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const now = window.scrollY || window.pageYOffset || 0;
    if (
      top === null ||
      Math.abs(now - Math.min(top, max)) <= 2 ||
      ++tries > RESUME_TRIES ||
      Date.now() > until
    )
      return stop();
    window.scrollTo({ top, behavior: "smooth" });
  }
  window.addEventListener("scrollend", onEnd);
  for (const type of READER_INPUT)
    window.addEventListener(type, stop, { capture: true, passive: true });
  stopLanding = stop;
  return true;
}

/**
 * Scroll so `el` sits at the top inset ("top"), the viewport centre
 * ("center") or the reading line at 50vh ("reading-line"); smooth unless
 * reduced motion (scrollToY). An element too tall to centre below the top
 * bar lands at the top instead, so its start isn't hidden. `flash` marks it,
 * `focus` moves focus to it (focusElement, with `focusVisible`). Returns
 * false if !el.
 */
export function jumpToElement(
  el,
  { align = "top", flash = false, focus = false, focusVisible } = {}
) {
  if (!el?.getBoundingClientRect) return false;
  // A section that opens with a figure transition starts with a blank
  // 200vh spacer: land where its reading starts (the opener TOC, the top
  // bar's section menu and the Info tab jump here too).
  if (align === "top") el = readingStartOf(el);
  scrollToY(() => {
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const viewport =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const inset = readerTopInset();
    const docTop = rect.top + scrollY;
    if (align === "center" && rect.height <= viewport - 2 * inset)
      return docTop + rect.height / 2 - viewport / 2;
    if (align === "reading-line") return docTop - viewport / 2;
    return docTop - inset;
  });
  if (flash) flashElement(el);
  if (focus) focusElement(el, { focusVisible });
  return true;
}

/** jumpToElement for the anchor findReaderAnchor(id) finds. */
export function jumpToId(id, opts) {
  return jumpToElement(findReaderAnchor(id), opts);
}
