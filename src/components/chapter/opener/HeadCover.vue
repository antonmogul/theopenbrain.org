<script setup>
/*
 * "Open the head" cover (OPENBRAIN-171): the History opener as the
 * designers delivered it. A girl writes in a loop; over the upper right of
 * the drawing the pointer becomes a hand holding a tool, and rubbing it
 * back and forth over her head slides the top off and lets the brain rise.
 * Moving off the head closes it. The logic and its numbers are theirs, in
 * helper/headCover.js; this component gives it a canvas, the pointer and a
 * clock, and looks after what a page in a book needs that a demo does not:
 *
 * - First paint and reduced motion. The resting drawing is one still
 *   (`spec.poster`), laid out by the same sceneFit as the canvas, so
 *   nothing moves when the canvas takes over. Under reduced motion the
 *   still is all there is, and the layers are never fetched.
 * - Weight. The still is one request; the layers (about 0.8 MB, nineteen
 *   frames of the girl) load after it and the loop starts when they are
 *   all decoded.
 * - The reader's battery. The girl moves at 12 frames a second, so the
 *   canvas is redrawn only when something it shows has changed, and not at
 *   all once the opener has scrolled away.
 * - The page. The drawing keeps clear of the top bar, the timeline and the
 *   hero's down-arrow; on
 *   a phone a vertical swipe still scrolls (`touch-action: pan-y`), and a
 *   sideways rub works the head.
 *
 * `imageAssetOk` checks the still first: a missing file means the opener's
 * ordinary cover and nothing logged. The parent reads `state` for
 * `data-reactive-cover`; nothing here touches --opener-h or the layout.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { imageAssetOk } from "@/helper/animationResolve";
import { useReducedMotion } from "@/composables/useReducedMotion";
import {
  createHead,
  drawHead,
  fadedHand,
  sceneFit,
  stepHead,
} from "@/helper/headCover";

const props = defineProps({
  /* A normalised record from reactiveCoverForModule with kind "head". */
  spec: { type: Object, required: true },
});
const emit = defineEmits(["state"]);

const stage = ref(null);
const canvas = ref(null);
const live = ref(false); // the canvas has taken over from the still
const view = ref({ scale: 0, left: 0, top: 0 });
const reducedMotion = useReducedMotion();

// The still is the whole artwork, placed where the canvas draws it.
const posterStyle = computed(() => ({
  left: `${view.value.left}px`,
  top: `${view.value.top}px`,
  width: `${props.spec.size[0] * view.value.scale}px`,
  height: `${props.spec.size[1] * view.value.scale}px`,
}));

// The hero's down-arrow sits 4.3rem up from the bottom, 3rem tall: the
// drawing is fitted above it. The canvas still runs to the bottom edge.
const ARROW_ROOM = 80;

let disposed = false;
let visible = true;
let images = null;
let head = null;
let raf = 0;
let io = null;
let ro = null;
let dpr = 1;
let box = { left: 0, top: 0 }; // the stage in the viewport, read on a move
let drawn = ""; // what the canvas last showed
const pointer = { present: false, x: 0, y: 0 };

function fit() {
  if (!stage.value) return;
  const r = stage.value.getBoundingClientRect();
  box = { left: r.left, top: r.top };
  view.value = sceneFit(
    { width: r.width, height: Math.max(0, r.height - ARROW_ROOM) },
    props.spec.fit
  );
  const c = canvas.value;
  if (c) {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
  }
  drawn = "";
  schedule();
}

function decode(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => resolve(img);
    img.src = url;
    if (typeof img.decode === "function")
      img.decode().then(() => resolve(img), reject);
  });
}

async function loadLayers() {
  const s = props.spec;
  const [oval, brain, lid, lidOutline, hand, body] = await Promise.all([
    decode(s.oval.src),
    decode(s.brain.src),
    decode(s.lid.src),
    decode(s.lid.outline),
    decode(s.hand.src),
    Promise.all(s.body.frames.map(decode)),
  ]);
  const makeCanvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  return {
    oval,
    brain,
    lid,
    lidOutline,
    body,
    hand: fadedHand(hand, s, makeCanvas),
  };
}

/* One frame: step the head, and draw it if it would look different. */
function tick(now) {
  raf = 0;
  if (disposed || !live.value || !visible || !canvas.value) return;
  stepHead(head, pointer, now, props.spec);
  const sig = [
    head.frame,
    head.at.toFixed(3),
    head.kick.toFixed(3),
    head.handAlpha.toFixed(2),
    head.handAlpha > 0.01 ? `${head.hand.x | 0},${head.hand.y | 0}` : "",
  ].join("|");
  if (sig !== drawn) {
    drawn = sig;
    drawHead(canvas.value.getContext("2d"), images, props.spec, head, {
      ...view.value,
      dpr,
    });
  }
  if (stage.value) stage.value.style.cursor = head.inside ? "none" : "";
  raf = requestAnimationFrame(tick);
}
function schedule() {
  if (!raf && live.value && visible && !disposed)
    raf = requestAnimationFrame(tick);
}

/* The pointer in the artwork's pixels. */
function onPointer(e) {
  const s = view.value.scale;
  if (!s) return;
  const r = stage.value?.getBoundingClientRect();
  if (r) box = { left: r.left, top: r.top };
  const x = e.clientX - box.left;
  const y = e.clientY - box.top;
  pointer.present = !!r && x >= 0 && y >= 0 && x <= r.width && y <= r.height;
  pointer.x = (x - view.value.left) / s;
  pointer.y = (y - view.value.top) / s;
}
function onLeave() {
  pointer.present = false;
}
function onPointerUp(e) {
  if (e.pointerType === "touch") onLeave();
}

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onLeave, { passive: true });
  window.addEventListener("blur", onLeave);
  document.documentElement.addEventListener("pointerleave", onLeave);
}
function unlisten() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("pointermove", onPointer);
  window.removeEventListener("pointerdown", onPointer);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onLeave);
  window.removeEventListener("blur", onLeave);
  document.documentElement.removeEventListener("pointerleave", onLeave);
}

/* The canvas takes over from the still: fetch the layers, then run. */
let starting = false;
async function goLive() {
  if (starting || live.value || disposed || reducedMotion.value) return;
  starting = true;
  try {
    images = await loadLayers();
  } catch {
    images = null; // a layer is missing: the still stays
  }
  starting = false;
  if (disposed || !images || reducedMotion.value || !stage.value) return;
  head = createHead(props.spec, performance.now());
  live.value = true;
  fit();
  listen();
}
/* Back to the still (reduced motion was turned on). */
function goStill() {
  unlisten();
  onLeave();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  live.value = false;
  if (stage.value) stage.value.style.cursor = "";
}
watch(reducedMotion, (reduced) => {
  if (disposed) return;
  if (reduced) goStill();
  else goLive();
});

onMounted(async () => {
  emit("state", "loading");
  const ok = await imageAssetOk(props.spec.poster);
  if (disposed) return;
  if (!ok || !stage.value) {
    emit("state", "unavailable");
    return;
  }
  fit();
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(fit);
    ro.observe(stage.value);
  } else {
    window.addEventListener("resize", fit);
  }
  // Only run while the opener is on screen.
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        if (head) head.last = performance.now();
        schedule();
      } else onLeave();
    });
    io.observe(stage.value);
  }
  emit("state", "ready");
  goLive();
});

onBeforeUnmount(() => {
  disposed = true;
  unlisten();
  if (raf) cancelAnimationFrame(raf);
  io?.disconnect();
  ro?.disconnect();
  window.removeEventListener("resize", fit);
});
</script>

<template>
  <div
    class="head-cover"
    :style="{ background: spec.paper || undefined }"
    :data-live="live ? '' : undefined"
  >
    <div ref="stage" class="head-cover__stage">
      <img
        v-show="!live"
        class="head-cover__poster"
        :src="spec.poster"
        :style="posterStyle"
        alt=""
        draggable="false"
      />
      <canvas
        v-show="live"
        ref="canvas"
        class="head-cover__canvas"
        aria-hidden="true"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
.head-cover {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
/* The drawing's room: below the reader's top bar, above the timeline. */
.head-cover__stage {
  position: absolute;
  inset: var(--reader-topbar-h, 0px) 0 var(--reader-timeline-h, 0px);
  overflow: hidden;
  /* A vertical swipe scrolls the page; a sideways rub works the head. */
  touch-action: pan-y;
}
.head-cover__poster {
  position: absolute;
  max-width: none;
  user-select: none;
  pointer-events: none;
}
.head-cover__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
