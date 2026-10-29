import { ref } from "vue";
import {
  SHEET_DETENTS,
  SHEET_SLOP,
  dragFraction,
  keyDetent,
  releaseVelocity,
  snapDetent,
} from "@/helper/sheetDetents";

/**
 * A bottom sheet with detents (OPENBRAIN-160): the drag handle's pointer
 * and keyboard behaviour over helper/sheetDetents' maths. The component
 * draws the sheet at `fraction` of its container's height (a CSS transition
 * animates the detent changes; `dragging` turns it off under the finger).
 *
 * @param {object} opts
 * @param {() => number} opts.containerHeight  px the sheet's container is tall
 * @param {() => { half: number, full: number }} [opts.detents]  the resting
 *   fractions, read on every snap so the half detent can follow the selected
 *   region (fitHalfDetent).
 * @param {() => void} [opts.onDismiss]  called when the sheet snaps closed.
 * @returns {{ fraction, detent, dragging, open, close, snapTo,
 *   onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeydown }}
 */
export function useSheetDetents({
  containerHeight,
  detents = () => SHEET_DETENTS,
  onDismiss = () => {},
}) {
  const fraction = ref(0);
  const detent = ref("closed"); // "closed" | "half" | "full"
  const dragging = ref(false);

  let pointerId = null;
  let startY = 0;
  let startFraction = 0;
  let moved = false;
  let samples = [];
  let raf = 0;

  const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const nextFrame = (fn) => {
    if (typeof requestAnimationFrame === "function")
      raf = requestAnimationFrame(fn);
    else setTimeout(fn, 0);
  };

  /** Rest at a detent. `"closed"` reports the dismissal to the owner. */
  function snapTo(name) {
    detent.value = name;
    if (name === "closed") {
      fraction.value = 0;
      onDismiss();
      return;
    }
    fraction.value = detents()[name];
  }

  /**
   * Rise to `name` (default half). `animate` starts from closed for a frame
   * so the transition plays; a sheet already open just moves.
   */
  function open(name = "half", { animate = true } = {}) {
    if (typeof cancelAnimationFrame === "function" && raf)
      cancelAnimationFrame(raf);
    if (detent.value !== "closed" || !animate) {
      snapTo(name);
      return;
    }
    fraction.value = 0;
    detent.value = name;
    nextFrame(() => {
      raf = 0;
      if (detent.value === name) fraction.value = detents()[name];
    });
  }

  /** Close without reporting (the owner is dismissing it itself). */
  function close() {
    endDrag();
    detent.value = "closed";
    fraction.value = 0;
  }

  function endDrag() {
    dragging.value = false;
    pointerId = null;
    samples = [];
  }

  function onPointerDown(e) {
    if (e.button > 0 || detent.value === "closed") return;
    e.currentTarget?.setPointerCapture?.(e.pointerId);
    pointerId = e.pointerId;
    dragging.value = true;
    moved = false;
    startY = e.clientY;
    startFraction = fraction.value;
    samples = [{ t: now(), fraction: fraction.value }];
  }

  function onPointerMove(e) {
    if (!dragging.value || e.pointerId !== pointerId) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > SHEET_SLOP) moved = true;
    fraction.value = dragFraction(
      startFraction,
      dy,
      containerHeight(),
      detents().full
    );
    samples.push({ t: now(), fraction: fraction.value });
    if (samples.length > 12) samples.shift();
  }

  function onPointerUp(e) {
    if (!dragging.value || e.pointerId !== pointerId) return;
    const velocity = moved ? releaseVelocity(samples) : 0;
    const released = fraction.value;
    endDrag();
    // A tap on the handle toggles the detents; a drag snaps where it lands.
    if (!moved) {
      snapTo(detent.value === "full" ? "half" : "full");
      return;
    }
    snapTo(snapDetent(released, velocity, detents(), { from: detent.value }));
  }

  function onPointerCancel() {
    if (!dragging.value) return;
    endDrag();
    snapTo(detent.value);
  }

  /** The handle's keyboard alternative: arrows, Home and End. */
  function onKeydown(e) {
    const next = keyDetent(e.key, detent.value);
    if (!next) return;
    e.preventDefault();
    snapTo(next);
  }

  return {
    fraction,
    detent,
    dragging,
    open,
    close,
    snapTo,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeydown,
  };
}
