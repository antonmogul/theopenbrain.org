/*
 * Drives the chapter-colour wash on the figure pane (OPENBRAIN-80; the
 * rules are in helper/figureTint.js).
 *
 * One passive scroll listener for the pane, one animation frame per
 * scroll, and the only thing written is the opacity of the washed copies
 * showing (`[data-figure-wash]`). It reads the window the pane's own
 * ScrollTrigger already measured, so it creates no trigger and asks for no
 * refresh.
 *
 *   pane()  the pane's element
 *   span()  { start, end } of the figure that is on, in page pixels, or
 *           null when that figure takes no wash
 *   opacity() optional override for a matching section card, null outside it
 *
 * It provides FIGURE_TINT to the pane's figures: `current()` is the wash's
 * opacity now, which a washed copy takes as it mounts (a figure arriving,
 * a gallery turning), before the next scroll.
 */
import { onBeforeUnmount, onMounted, provide } from "vue";
import { FIGURE_TINT, tintAt } from "@/helper/figureTint";

export function useFigureTint({ pane, span, opacity }) {
  let frame = 0;

  function current() {
    const override = opacity?.();
    if (override != null) return override;
    const s = span();
    return s ? tintAt(window.scrollY, s.start, s.end, window.innerHeight) : 0;
  }

  function apply() {
    frame = 0;
    // Nothing to scrub when the figure on takes no wash; a figure on its
    // way out keeps the look it left with.
    if (!span() && opacity?.() == null) return;
    const value = String(current());
    for (const el of pane()?.querySelectorAll("[data-figure-wash]") || []) {
      if (el.closest(".fade-leave-active")) continue;
      if (el.style.opacity !== value) el.style.opacity = value;
    }
    for (const el of pane()?.querySelectorAll("[data-section-zoom]") || []) {
      if (el.closest(".fade-leave-active")) continue;
      el.style.setProperty("--section-zoom", String(1 + 0.08 * Number(value)));
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(apply);
  }

  provide(FIGURE_TINT, { current });

  onMounted(() =>
    window.addEventListener("scroll", schedule, { passive: true })
  );
  onBeforeUnmount(() => {
    window.removeEventListener("scroll", schedule);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  });

  return { schedule, current };
}
