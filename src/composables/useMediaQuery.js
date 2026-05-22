import { ref, onMounted, onBeforeUnmount } from "vue";

/**
 * Reactive media-query matcher.
 *
 * const isMobile = useMediaQuery("(max-width: 767px)");
 * Use inside <script setup> in component or in another composable;
 * cleans up its listener automatically on unmount.
 */
export function useMediaQuery(query) {
  const matches = ref(false);
  let mq = null;
  const handler = (e) => {
    matches.value = e.matches;
  };

  onMounted(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    mq = window.matchMedia(query);
    matches.value = mq.matches;
    mq.addEventListener?.("change", handler);
  });

  onBeforeUnmount(() => {
    mq?.removeEventListener?.("change", handler);
    mq = null;
  });

  return matches;
}
