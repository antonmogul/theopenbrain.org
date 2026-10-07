import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useDraggable } from "@vueuse/core";

/**
 * Draggable floating panel with localStorage position persistence and
 * viewport clamping (Design brief §6.7: "Position persists across pan/screen.
 * Margin-clamps to viewport edges on resize.").
 *
 * Wraps @vueuse/core's useDraggable (pointer/touch handling, handle support)
 * and adds the two behaviors it doesn't provide: persist + clamp.
 *
 * @param {Ref<HTMLElement>} panelRef   the panel element to move
 * @param {Ref<HTMLElement>} handleRef  the grab handle (drag starts here only)
 * @param {object} opts
 * @param {string} opts.storageKey      localStorage key for {x,y}
 * @param {number} opts.width           panel width (px) for clamping
 * @param {number} opts.height          panel height (px) for clamping
 * @param {number} opts.margin          min gap from viewport edge (px)
 * @param {() => number} [opts.bottomInset]  px of the viewport's bottom edge
 *                                     taken by something fixed there (the
 *                                     reader's timeline dock); the panel
 *                                     keeps `margin` above it. Read on every
 *                                     clamp, so it can change.
 * @param {() => number} [opts.topInset]  the same for the top edge (the
 *                                     reader's top bar).
 * @param {number} [opts.minHeight]     the least the panel shrinks to when
 *                                     the room between the insets is less
 *                                     than `height`.
 * @returns {{ x: Ref<number>, y: Ref<number>, height: Ref<number>,
 *   refit: () => void, resetPosition: () => void }} `height` is what the
 *   panel should be drawn at (≤ opts.height); `refit` re-clamps now, for
 *   when an inset changed without a resize.
 */
export function useDraggablePanel(panelRef, handleRef, opts = {}) {
  const {
    storageKey = "ob.panelPos",
    width = 380,
    height = 620,
    margin = 16,
    bottomInset = () => 0,
    topInset = () => 0,
    minHeight = 240,
  } = opts;

  const lengthOf = (read) => Math.max(0, Number(read()) || 0);
  const inset = () => lengthOf(bottomInset);
  const top = () => lengthOf(topInset);

  // The panel's height: `height`, or the room between the insets when that
  // is less (it scrolls inside), but not below `minHeight`.
  function fitHeight() {
    const room = window.innerHeight - top() - inset() - 2 * margin;
    return Math.max(Math.min(height, minHeight), Math.min(height, room));
  }
  const panelHeight = ref(fitHeight());

  // Default position: bottom-right, a comfortable inset from the edges.
  function defaultPos() {
    const vw = window.innerWidth;
    const vh = window.innerHeight - inset();
    return {
      x: Math.max(margin, vw - width - 24),
      y: Math.max(top() + margin, vh - fitHeight() - 24),
    };
  }

  function loadPos() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.x === "number" && typeof p.y === "number") return p;
      }
    } catch (err) {
      console.warn("useDraggablePanel: failed to read saved position", err);
    }
    return defaultPos();
  }

  const initial = loadPos();

  // useDraggable owns the live x/y and pointer handling. `handle` scopes the
  // drag to the grip only, so clicking tabs/content doesn't move the panel.
  // onEnd clamps the dropped position so a drag can never leave the panel
  // off-screen (brief §6.7), mirroring the resize clamp.
  const { x, y } = useDraggable(panelRef, {
    initialValue: initial,
    handle: handleRef,
    preventDefault: true,
    onEnd: (pos) => {
      const c = clamp(pos.x, pos.y);
      x.value = c.x;
      y.value = c.y;
    },
  });

  // Keep the panel fully on-screen with `margin` px of gap on every edge
  // (inside the insets). When the viewport is smaller than the panel, the
  // range collapses — pin to the top-left margin (under the top inset) so
  // the drag handle stays reachable.
  function clamp(px, py) {
    const minY = top() + margin;
    const maxX = window.innerWidth - width - margin;
    const maxY = window.innerHeight - inset() - fitHeight() - margin;
    const x = maxX < margin ? margin : Math.min(Math.max(px, margin), maxX);
    const y = maxY < minY ? minY : Math.min(Math.max(py, minY), maxY);
    return { x, y };
  }

  // Re-fit and re-clamp whenever the window resizes so the panel can never
  // get lost off-screen (brief §6.7).
  function onResize() {
    panelHeight.value = fitHeight();
    const c = clamp(x.value, y.value);
    x.value = c.x;
    y.value = c.y;
  }

  // Persist on every settled position change (debounced via rAF coalescing).
  let saveQueued = false;
  watch([x, y], () => {
    if (saveQueued) return;
    saveQueued = true;
    requestAnimationFrame(() => {
      saveQueued = false;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ x: x.value, y: y.value })
        );
      } catch (err) {
        console.warn("useDraggablePanel: failed to save position", err);
      }
    });
  });

  onMounted(() => {
    // Clamp once on mount in case the saved position is now off-screen
    // (e.g. user resized the window between sessions).
    onResize();
    window.addEventListener("resize", onResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", onResize);
  });

  function resetPosition() {
    const d = defaultPos();
    x.value = d.x;
    y.value = d.y;
  }

  return { x, y, height: panelHeight, refit: onResize, resetPosition };
}
