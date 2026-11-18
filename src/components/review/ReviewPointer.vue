<script setup>
/*
 * ReviewPointer — the point-at layer of the review widget (OPENBRAIN-204).
 *
 * A full-window layer over everything (the pinned figure pane, a sticky
 * box, the timeline dock, an upload's iframe, which would otherwise swallow
 * the pointer): it hit-tests what is under it with elementsFromPoint,
 * skipping itself, and helper/reviewAnchor.mjs decides which meaningful
 * thing that is, so a hover outlines a paragraph, a figure, a rail plate, a
 * widget, a heading, not the innermost span.
 *
 * - A mouse or pen: hover outlines, a click picks, Enter picks what is
 *   outlined, Escape cancels.
 * - Touch: a tap outlines and names it; "Use this" picks it.
 * - The page still scrolls under the layer: the wheel scrolls the page
 *   (or, sideways over a box that scrolls by itself, its track), a
 *   vertical swipe scrolls the page natively (touch-action: pan-y), and a
 *   sideways swipe over a phone's swipe box moves its track. A pinned box
 *   moves with the page, as it does without the layer.
 *
 * Emits `pick` with the anchor record (via: "point") and `cancel`.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { anchorFor, pageState, targetAt } from "@/helper/reviewAnchor.mjs";

const props = defineProps({
  /** (figureKey) → the animation record, for figure numbers and titles. */
  recordFor: { type: Function, default: null },
  /** The page to read; tests and stories pass their own. */
  doc: { type: Object, default: null },
});
const emit = defineEmits(["pick", "cancel"]);

const root = ref(null);
/** What is outlined: { target, rect, label, x, y }. */
const hover = ref(null);
/** On touch, what a tap outlined and waits for "Use this". */
const pending = ref(false);
const coarse = ref(false);

const page = () => props.doc || globalThis.document;
const win = () => page().defaultView || globalThis.window;

let last = null; // the last pointer position { x, y }
let frame = 0;
let drag = null; // a touch pan in progress

function ctx() {
  return { recordFor: props.recordFor, page: pageState(win()) };
}

function at(x, y) {
  const target = targetAt(x, y, page());
  if (!target) return null;
  const anchor = anchorFor(target, { clientX: x, clientY: y }, ctx());
  return {
    target,
    anchor,
    rect: target.el.getBoundingClientRect(),
    label: anchor?.label || "",
    x,
    y,
  };
}

function outline(x, y) {
  last = { x, y };
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    hover.value = at(x, y);
  });
}

/* The outline follows the page as it scrolls under the layer. */
function onScroll() {
  if (!last) return;
  if (pending.value && hover.value) {
    // Keep the tapped thing, move its outline with it.
    const { target } = hover.value;
    hover.value = { ...hover.value, rect: target.el.getBoundingClientRect() };
    return;
  }
  outline(last.x, last.y);
}

function pick(entry) {
  if (!entry?.target) return;
  // Measured again now: the page may have moved since the outline.
  const fresh = at(entry.x, entry.y);
  const chosen = fresh && fresh.target.el === entry.target.el ? fresh : entry;
  emit("pick", { ...chosen.anchor, via: "point" });
}

function onPointerMove(e) {
  if (e.pointerType === "touch") {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) drag.moved = true;
    // A sideways swipe over a track that scrolls by itself moves it.
    if (drag.track && Math.abs(dx) > Math.abs(dy)) {
      drag.track.scrollLeft = drag.left - dx;
    }
    return;
  }
  coarse.value = false;
  outline(e.clientX, e.clientY);
}

function trackAt(x, y) {
  const top = page()
    .elementsFromPoint(x, y)
    .find((el) => !el.closest("[data-review-ui]"));
  const track = top?.closest?.("[data-rail-scroller]");
  return track && track.getAttribute("data-rail-pinned") !== "1" ? track : null;
}

function onPointerDown(e) {
  if (e.pointerType !== "touch") return;
  coarse.value = true;
  const track = trackAt(e.clientX, e.clientY);
  drag = {
    x: e.clientX,
    y: e.clientY,
    moved: false,
    track,
    left: track?.scrollLeft || 0,
  };
}

function onPointerUp(e) {
  if (e.pointerType !== "touch" || !drag) return;
  const { moved, track } = drag;
  drag = null;
  if (moved) {
    // Let a swipe box rest on a whole page, as its own snap would.
    if (track) {
      const w = track.clientWidth || 1;
      track.scrollTo({
        left: Math.round(track.scrollLeft / w) * w,
        behavior: "smooth",
      });
    }
    return;
  }
  last = { x: e.clientX, y: e.clientY };
  const entry = at(e.clientX, e.clientY);
  // A second tap on what is already outlined picks it.
  if (
    pending.value &&
    entry &&
    hover.value &&
    entry.target.el === hover.value.target.el
  ) {
    pick(entry);
    return;
  }
  hover.value = entry;
  pending.value = !!entry;
}

function onPointerCancel() {
  drag = null;
}

function onClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (coarse.value) return; // touch picks through the confirm bar
  pick(at(e.clientX, e.clientY));
}

function deltaPx(delta, mode) {
  if (mode === 1) return delta * 16;
  if (mode === 2) return delta * (win().innerHeight || 800);
  return delta;
}

function onWheel(e) {
  e.preventDefault();
  const dx = deltaPx(e.deltaX, e.deltaMode);
  const dy = deltaPx(e.deltaY, e.deltaMode);
  if (Math.abs(dx) > Math.abs(dy)) {
    const top = page()
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => !el.closest("[data-review-ui]"));
    const track = top?.closest?.("[data-rail-scroller]");
    if (track) {
      track.scrollLeft += dx;
      return;
    }
  }
  win().scrollBy(0, dy);
}

function onKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    emit("cancel");
  } else if (e.key === "Enter" && hover.value) {
    e.preventDefault();
    pick(hover.value);
  }
}

onMounted(() => {
  const w = win();
  w.addEventListener("scroll", onScroll, { passive: true });
  w.addEventListener("keydown", onKey, true);
  root.value?.addEventListener("wheel", onWheel, { passive: false });
  coarse.value = !!w.matchMedia?.("(pointer: coarse)")?.matches;
});

onBeforeUnmount(() => {
  const w = win();
  w.removeEventListener("scroll", onScroll);
  w.removeEventListener("keydown", onKey, true);
  root.value?.removeEventListener("wheel", onWheel);
  cancelAnimationFrame(frame);
});

const boxStyle = computed(() => {
  const r = hover.value?.rect;
  if (!r) return { display: "none" };
  const vw = win().innerWidth;
  const vh = win().innerHeight;
  // Clipped to the window: a box taller than the screen still shows edges.
  const left = Math.max(2, r.left);
  const top = Math.max(2, r.top);
  const right = Math.min(vw - 2, r.right);
  const bottom = Math.min(vh - 2, r.bottom);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${Math.max(0, right - left)}px`,
    height: `${Math.max(0, bottom - top)}px`,
  };
});

const tagStyle = computed(() => {
  const r = hover.value?.rect;
  if (!r || pending.value) return { display: "none" };
  const vh = win().innerHeight;
  const top = Math.max(56, Math.min(vh - 40, r.top - 30));
  const left = Math.max(8, Math.min(win().innerWidth - 328, r.left));
  return { top: `${top}px`, left: `${left}px` };
});

const dotStyle = computed(() =>
  hover.value
    ? { left: `${hover.value.x}px`, top: `${hover.value.y}px` }
    : { display: "none" }
);
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      class="rv-point"
      data-review-ui
      data-testid="review-pointer"
      @pointermove="onPointerMove"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @click="onClick"
    >
      <div class="rv-point-box" :style="boxStyle" aria-hidden="true"></div>
      <div class="rv-point-dot" :style="dotStyle" aria-hidden="true"></div>
      <p class="rv-point-tag" :style="tagStyle" aria-hidden="true">
        {{ hover?.label }}
      </p>
      <div class="rv-point-hint" role="status" @click.stop @pointerdown.stop>
        <span class="rv-point-hint-text">
          {{
            coarse
              ? "Tap what your note is about. Scroll to move."
              : "Click what your note is about. Scroll to move, Esc to cancel."
          }}
        </span>
        <button
          type="button"
          class="rv-point-btn"
          data-testid="review-pointer-cancel"
          @click.stop="emit('cancel')"
        >
          Cancel
        </button>
      </div>
      <div
        v-if="pending && hover"
        class="rv-point-confirm"
        data-testid="review-pointer-confirm"
        @click.stop
        @pointerdown.stop
        @pointerup.stop
      >
        <p class="rv-point-confirm-label">{{ hover.label }}</p>
        <div class="rv-point-confirm-actions">
          <button
            type="button"
            class="rv-point-btn"
            @click.stop="
              pending = false;
              hover = null;
            "
          >
            Not this
          </button>
          <button
            type="button"
            class="rv-point-btn rv-point-btn--go"
            data-testid="review-pointer-use"
            @click.stop="pick(hover)"
          >
            Use this
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Above everything the reader draws, the pane, sticky boxes, the dock and
   iframes included; the overlay's own pieces take no pointer events except
   its two bars. */
.rv-point {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  cursor: crosshair;
  touch-action: pan-y;
  background: rgb(var(--color-ink) / 0.04);
  font-family: var(--font-ui);
}

.rv-point-box {
  position: fixed;
  pointer-events: none;
  border: 2px solid rgb(var(--color-accent));
  border-radius: 4px;
  background: rgb(var(--color-accent) / 0.08);
  box-shadow: 0 0 0 9999px rgb(var(--color-ink) / 0.12);
}

.rv-point-dot {
  position: fixed;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  pointer-events: none;
  background: rgb(var(--color-accent));
  box-shadow: 0 0 0 3px rgb(255 255 255 / 0.9);
}

.rv-point-tag {
  position: fixed;
  max-width: 320px;
  margin: 0;
  padding: 4px 8px;
  border-radius: 4px;
  pointer-events: none;
  background: rgb(16 16 16 / 0.92);
  color: #fff;
  font-size: var(--ui-size-12);
  line-height: 1.35;
}

.rv-point-hint,
.rv-point-confirm {
  position: fixed;
  left: 50%;
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 12px;
  width: max-content;
  max-width: calc(100vw - 24px);
  padding: 8px 8px 8px 14px;
  border-radius: 10px;
  background: rgb(16 16 16 / 0.94);
  color: #fff;
  cursor: default;
  font-size: var(--ui-size-13);
  box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
}

.rv-point-hint {
  top: 12px;
}

.rv-point-confirm {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  flex-direction: column;
  align-items: stretch;
  width: min(420px, calc(100vw - 24px));
  padding: 12px;
}

.rv-point-confirm-label {
  margin: 0;
  line-height: 1.4;
}

.rv-point-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.rv-point-btn {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid rgb(255 255 255 / 0.4);
  border-radius: 6px;
  background: transparent;
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.rv-point-btn--go {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent));
}

.rv-point-btn:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
</style>
