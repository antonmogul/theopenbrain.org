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
 */
export function useDraggablePanel(panelRef, handleRef, opts = {}) {
  const {
    storageKey = "ob.panelPos",
    width = 380,
    height = 620,
    margin = 16,
  } = opts;

  // Default position: bottom-right, a comfortable inset from the edges.
  function defaultPos() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.max(margin, vw - width - 24),
      y: Math.max(margin, vh - height - 24),
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

  // Keep the panel fully on-screen with `margin` px of gap on every edge.
  // When the viewport is smaller than the panel (maxX < margin), the range
  // collapses — pin to the top-left margin so the drag handle stays reachable.
  function clamp(px, py) {
    const maxX = window.innerWidth - width - margin;
    const maxY = window.innerHeight - height - margin;
    const x = maxX < margin ? margin : Math.min(Math.max(px, margin), maxX);
    const y = maxY < margin ? margin : Math.min(Math.max(py, margin), maxY);
    return { x, y };
  }

  // Re-clamp whenever the window resizes so the panel can never get lost
  // off-screen (brief §6.7).
  function onResize() {
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

  return { x, y, resetPosition };
}
