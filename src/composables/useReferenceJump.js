/*
 * From the text to an entry of the reference list, and back (OPENBRAIN-179).
 *
 * The list is the chapter's full-width back matter (ChapterReferences), four
 * or so screens below the last paragraph, so a jump to it needs a way back.
 * A citation's tooltip and a Further reading link both come through
 * jumpToReference: it lands the entry (#ref-N, ReferenceList) mid-screen and
 * flashes it, through readerJump, so the browser's Back button returns too
 * (setJumpHistory); and it remembers the element the reader jumped from, so
 * the list can offer "Back to the text" (ChapterReferences).
 *
 * Module scope: one reader, one list.
 */
import { nextTick, ref } from "vue";
import { jumpToElement } from "@/helper/readerJump";

// How long after a jump to look whether it began (see jumpToReference).
const NUDGE_MS = 300;

/** { number, origin }: the entry last jumped to and where from; or null. */
const returnTo = ref(null);
/** The number last asked for: a filtered list shows everything again. */
const requested = ref(null);

/** The list's entry for reference `number`, if it is on the page. */
export function referenceAnchor(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) return null;
  return globalThis.document?.getElementById(`ref-${n}`) || null;
}

/** Is the chapter's full-width reference list on the page? */
export function referenceListOnPage() {
  return !!globalThis.document?.querySelector("[data-chapter-references]");
}

/**
 * Land reference `number` in the list. `origin` is the element the reader
 * jumped from (the citation, the link). False when the list has no such
 * entry (nothing moves).
 */
export async function jumpToReference(number, origin = null) {
  // A new object each time: asking twice for the same entry counts twice.
  requested.value = { number: Number(number) };
  // A filtered list drops its filter first, so the entry is there to find.
  await nextTick();
  const entry = referenceAnchor(number);
  if (!entry) return false;
  returnTo.value = origin ? { number: Number(number), origin } : null;
  const from = window.scrollY;
  const landed = jumpToElement(entry, {
    align: "center",
    flash: true,
    focus: true,
    focusVisible: false,
  });
  // A smooth scroll that something stops before it has moved never ends, so
  // readerJump's resume (at scrollend) is never asked: a list that grew back
  // from a filter re-measures the page (ScrollTrigger.refresh, which scrolls
  // to 0 and back) in the frame the jump begins. Look once, and go again.
  setTimeout(() => {
    if (!entry.isConnected || Math.abs(window.scrollY - from) > 2) return;
    const { top, bottom } = entry.getBoundingClientRect();
    if (top >= 0 && bottom <= window.innerHeight) return;
    jumpToElement(entry, { align: "center", remember: false });
  }, NUDGE_MS);
  return landed;
}

/** Back to where the last jump came from. False when that is gone. */
export function returnFromReference() {
  const back = returnTo.value;
  returnTo.value = null;
  if (!back?.origin?.isConnected) return false;
  return jumpToElement(back.origin, {
    align: "center",
    flash: true,
    remember: false,
  });
}

/** Forget the way back (the chapter changed, the list went away). */
export function forgetReferenceJump() {
  returnTo.value = null;
  requested.value = null;
}

export function useReferenceJump() {
  return {
    returnTo,
    requested,
    jumpToReference,
    returnFromReference,
    forgetReferenceJump,
  };
}
