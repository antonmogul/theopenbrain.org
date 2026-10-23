import { onBeforeUnmount, onMounted, ref } from "vue";
import { reducedMotionPreferred } from "@/helper/readerJump";

/** Follow the reader override live; otherwise follow the operating system. */
export function useReducedMotion() {
  const reduced = ref(reducedMotionPreferred());
  let observer;
  let media;
  const update = () => (reduced.value = reducedMotionPreferred());
  onMounted(() => {
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener?.("change", update);
    observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
    update();
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    media?.removeEventListener?.("change", update);
  });
  return reduced;
}
