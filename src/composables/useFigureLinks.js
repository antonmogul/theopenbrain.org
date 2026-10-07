/* Figure trigger lookup retained for authoring tools. Reader citations are
 * deliberately non-interactive: Stuart's 1 October feedback supersedes the
 * 24 September click-to-scroll request. No global click/keyboard handlers. */
/**
 * A trigger span's figure key. Sections and subsections name it
 * `triggerAnimation<Name>` (the key without "animation"); sub-subsections
 * `trigger<key>`.
 */
function keyOf(el) {
  const id = el.id;
  if (id.startsWith("triggerAnimation"))
    return "animation" + id.slice("triggerAnimation".length);
  return id.replace(/^trigger/, "");
}

/** The trigger span that brings figure `number` into the pane, or null. */
export function findFigureTrigger(number, records = [], root = document) {
  const n = String(number).trim();
  if (!n) return null;
  const triggers = [...root.querySelectorAll(".animationTrigger[id]")].filter(
    (el) => /^trigger/i.test(el.id)
  );
  const byKey = new Map(records.map((r) => [r.id, r]));
  return (
    triggers.find((el) => String(byKey.get(keyOf(el))?.figureNumber) === n) ||
    triggers.find((el) => new RegExp(`Fig${n}$`, "i").test(el.id)) ||
    null
  );
}

/** Scroll so the trigger's top meets the reading line (mid-viewport). */
export function scrollToFigure(trigger) {
  // The reader's own setting decides ("1" on, "0" off); the OS only when unset.
  const pref = document.documentElement.getAttribute("data-reduce-motion");
  const reduce =
    pref === "1" ||
    (pref !== "0" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const top =
    trigger.getBoundingClientRect().top +
    window.scrollY -
    window.innerHeight / 2 +
    8;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}

// Kept as a no-op for older reader integrations; no animation fetch is needed.
export function useFigureLinks() {}
