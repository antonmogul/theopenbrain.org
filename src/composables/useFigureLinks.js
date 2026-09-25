/*
 * Figure links (OPENBRAIN-91). Stuart, 24 Sep: "Clicking on figure links in
 * the main text doesn't do anything." A "(Figure N)" reference is a
 * <span class="figure-ref" data-figure="N">. A click scrolls the paragraph
 * that shows figure N to the reading line, so the pane switches to it (the
 * pane follows the scroll; below the two-column breakpoint the figure is
 * inline after that paragraph). The paragraph is found by the figure's
 * number (animations.config.figureNumber) or, failing that, its key
 * (animation…FigN).
 */
import { onBeforeUnmount, onMounted } from "vue";
import { useAnimations } from "@/composables/useAnimations";

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

export function useFigureLinks() {
  const { animations, fetchAnimations } = useAnimations();

  function onClick(e) {
    const ref = e.target?.closest?.(".figure-ref[data-figure]");
    if (!ref) return;
    // In a creator's editor a figure chip is for selecting, not following.
    if (
      ref.closest(
        '[contenteditable="true"], .ProseMirror, .editable-block-wrapper.is-creator'
      )
    )
      return;
    const trigger = findFigureTrigger(ref.dataset.figure, animations.value);
    if (!trigger) return;
    e.preventDefault();
    scrollToFigure(trigger);
  }

  function onKeydown(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target?.closest?.(".figure-ref[data-figure]")) onClick(e);
  }

  onMounted(() => {
    fetchAnimations();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeydown);
  });
}
