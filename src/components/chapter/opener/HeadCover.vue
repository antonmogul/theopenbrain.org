<script setup>
/*
 * History's prying cover (OPENBRAIN-40/41). On desktop a hover plays
 * three small rocks around the tool's tip at the back of the skull's cut,
 * then eases the lid off. The pointer only nudges that contact. Phones and
 * coarse pointers play a gentle loop without touch-and-hold interaction.
 * The logic is in helper/headCover.js; this component gives it a canvas,
 * the pointer and a clock, and looks after what a page in a book needs
 * that a demo does not:
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
 *   hero's down-arrow. Phones keep ordinary scrolling and never need a
 *   finger on the canvas.
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
  headAutoplays,
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
let coarseQuery = null;
let drawn = ""; // what the canvas last showed
const pointer = { present: false, u: 0.5, v: 0.5, automatic: false }; // u, v: 0 to 1 across

function fit() {
  if (!stage.value) return;
  const r = stage.value.getBoundingClientRect();
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
  configureInput();
  schedule();
}

/* An image, ready to draw. Where there is decode() we wait for it and not
   for `load`: in WebKit `load` can come before the pixels are ready, and
   the hand, which is drawn once into its faded copy, then came out empty
   (the tool never showed, though the head still opened). */
function decode(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.src = url;
    if (typeof img.decode === "function")
      img.decode().then(() => resolve(img), reject);
    else img.onload = () => resolve(img);
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
    head.handAlpha.toFixed(2),
    head.handTurn.toFixed(3),
    head.handAlpha > 0.01
      ? `${head.hand.x.toFixed(1)},${head.hand.y.toFixed(1)}`
      : "",
  ].join("|");
  if (sig !== drawn) {
    drawn = sig;
    drawHead(canvas.value.getContext("2d"), images, props.spec, head, {
      ...view.value,
      dpr,
    });
  }
  raf = requestAnimationFrame(tick);
}
function schedule() {
  if (!raf && live.value && visible && !disposed)
    raf = requestAnimationFrame(tick);
}

/* Where the pointer is across the cover: the helper maps that into the
   tool's small region. */
function onPointer(e) {
  if (e.pointerType === "touch" || pointer.automatic) return;
  const r = stage.value?.getBoundingClientRect();
  if (!r || !(r.width > 0 && r.height > 0)) return onLeave();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  pointer.present = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
  pointer.u = x / r.width;
  pointer.v = y / r.height;
}
function onLeave() {
  pointer.present = false;
}

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointercancel", onLeave, { passive: true });
  window.addEventListener("blur", onLeave);
  document.documentElement.addEventListener("pointerleave", onLeave);
}
function unlisten() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("pointermove", onPointer);
  window.removeEventListener("pointercancel", onLeave);
  window.removeEventListener("blur", onLeave);
  document.documentElement.removeEventListener("pointerleave", onLeave);
}

/* Automatic below the reader breakpoint OR on coarse-pointer devices.
   No pointer/touch handlers are installed in that mode. */
function configureInput() {
  const automatic = headAutoplays(window.innerWidth, coarseQuery?.matches);
  if (automatic !== pointer.automatic) {
    pointer.automatic = automatic;
    onLeave();
    if (head) head = createHead(props.spec, performance.now());
  }
  if (automatic || !live.value) unlisten();
  else listen();
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
}
/* Back to the still (reduced motion was turned on). */
function goStill() {
  unlisten();
  onLeave();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  live.value = false;
}
watch(reducedMotion, (reduced) => {
  if (disposed) return;
  if (reduced) goStill();
  else goLive();
});

onMounted(async () => {
  coarseQuery = window.matchMedia("(pointer: coarse)");
  coarseQuery.addEventListener?.("change", configureInput);
  window.addEventListener("resize", configureInput);
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
      } else {
        onLeave();
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
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
  window.removeEventListener("resize", configureInput);
  coarseQuery?.removeEventListener?.("change", configureInput);
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
  touch-action: auto;
}
.head-cover__poster {
  position: absolute;
  max-width: none;
  user-select: none;
  pointer-events: none;
}
.head-cover__canvas {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
