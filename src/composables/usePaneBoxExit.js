import { onBeforeUnmount, onMounted, watch } from "vue";
import { reducedMotionPreferred } from "@/helper/readerJump";
import { videoFullscreenHeld } from "@/helper/videoFullscreen";
import { readerScrollLocked } from "@/helper/readerScrollLock";

/** Move the pane's contents with the prose as a full-width rail arrives.
 * Geometry comes from the in-flow pause, never its sticky box/title card.
 * The pane ground stays fixed; reversing scroll retraces the same pixels.
 */
export function usePaneBoxExit(pane) {
  let frame = 0;
  let observer;
  function apply() {
    frame = 0;
    if (videoFullscreenHeld() || readerScrollLocked()) return;
    const el = pane.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let offset = 0;
    let covered = false;
    const reader = el.closest(".chapter-reader");
    for (const pause of reader?.querySelectorAll("[data-pane-box-exit]") ||
      []) {
      const box = pause.getBoundingClientRect();
      if (box.bottom <= rect.top || box.top >= rect.bottom) continue;
      offset = Math.min(offset, Math.max(-rect.height, box.top - rect.bottom));
      covered = true;
    }
    const reduced = reducedMotionPreferred();
    el.style.setProperty("--pane-box-y", `${reduced ? 0 : offset}px`);
    el.toggleAttribute("data-box-cut", reduced && covered);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(apply);
  }
  watch(pane, schedule, { flush: "post" });
  onMounted(() => {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
    schedule();
  });
  onBeforeUnmount(() => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
  });
}
