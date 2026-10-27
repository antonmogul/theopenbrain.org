<script setup>
/*
 * Skull-cutaway cover (OPENBRAIN-156): the History opener's "mouse
 * responsive" drawing. A hand holding a lifted piece of skull reaches in
 * from the top right as the pointer crosses the hero, and the crown of the
 * girl's head hinges open at the forehead to show the violet brain along
 * the cut. The pointer's x picks the position outright (no easing, as the
 * 2023 Retina eye did and ReactiveCover still does); when it leaves, the
 * cover eases shut (Anton, 27 Oct: closed is the resting state, so no idle
 * sweep either). Touch drags horizontally; `touch-action: pan-y` keeps
 * vertical swipes scrolling the page, and lifting the finger closes it.
 *
 * The two drawings are NOT one picture with a layer behind it
 * (docs/design/history-hero-cutaway-spec.md): the cutaway is a separately
 * drawn state whose face sits 8 px off the sketch's and whose hair is
 * redrawn, so a wipe or cross-fade between them tears. Instead the sketch
 * is the only drawing of the girl: its cap region (`spec.cap`, the cut
 * line and the crown above it) is clipped out of the base and drawn again
 * as its own layer that rotates about `spec.pivot`, so the face and
 * shoulder are untouched pixels at every position. The cutaway drawing
 * contributes only the brain band (`spec.band`), registered onto the
 * sketch by `spec.brainBox` (scripts/covers/register-history-hero.py,
 * chamfer-matched on the body) and hidden under the cap at rest. Everything
 * sits in one canvas sized like the opener's `background-size: cover` so
 * the layers can't drift from each other.
 *
 * Performance: this runs on every pointer move on the chapter's first
 * screen, so a move only records the goal; one requestAnimationFrame
 * applies it as two transforms on composited layers (no reactive refs, no
 * re-render — the TextComp perlin loop's 66 Hz reactive write is the
 * cautionary example), reads the hero's rect before it writes, and stops
 * once the cover has settled shut. `imageAssetOk` HEAD-checks the three
 * files and they are decoded before the layers mount, so a missing one
 * means the still cover and nothing logged, and the first move never shows
 * an unloaded layer. The parent reads `state` for `data-reactive-cover`;
 * nothing here touches --opener-h or the page's layout.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { imageAssetOk } from "@/helper/animationResolve";
import { useReducedMotion } from "@/composables/useReducedMotion";
import { pointerPosition } from "@/helper/reactiveCover";
import {
  REST,
  coverBox,
  cutoutCss,
  polygonCss,
  poseFor,
  settle,
} from "@/helper/cutawayCover";

const props = defineProps({
  /* A normalised record from reactiveCoverForModule with kind "cutaway". */
  spec: { type: Object, required: true },
  /* Pin the reveal at a 0..1 position for review (stories, screenshots);
     null follows the pointer. */
  reveal: { type: Number, default: null },
});
const emit = defineEmits(["state"]);

const stage = ref(null);
const canvas = ref(null);
const capEl = ref(null);
const handEl = ref(null);
const shown = ref(false); // the layers mount once every image is decoded
const reducedMotion = useReducedMotion();

const pct = (v) => `${v * 100}%`;
const baseClip = computed(() => cutoutCss(props.spec.cap));
const capClip = computed(() => polygonCss(props.spec.cap));
const bandClip = computed(() => polygonCss(props.spec.band));
const pivot = computed(
  () => `${pct(props.spec.pivot[0])} ${pct(props.spec.pivot[1])}`
);
const brainStyle = computed(() => {
  const b = props.spec.brainBox;
  return {
    left: pct(b.left),
    top: pct(b.top),
    width: pct(b.width),
    height: pct(b.height),
  };
});
const handStyle = computed(() => {
  const b = props.spec.handBox;
  return { left: pct(b.left), top: pct(b.top), width: pct(b.width) };
});

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));

let ready = false;
let disposed = false;
let visible = true;
let listening = false;
let inside = false; // pointer over the hero
let goal = REST;
let current = REST; // the shown position, 0..1
let posed = null; // the position the layers were last written with
let raf = 0;
let io = null;
let ro = null;
let stageTop = 0; // the hero's edges in viewport px, read once per frame
let stageBottom = 0;
let handRest = { x: 0, y: 0 }; // the hand's off-canvas offset, % of itself

function pose(position) {
  if (position === posed || !capEl.value || !handEl.value) return;
  posed = position;
  const { reach, lift } = poseFor(position);
  capEl.value.style.transform = `rotate(${(-props.spec.open * lift).toFixed(3)}deg)`;
  handEl.value.style.transform = `translate(${(handRest.x * (1 - reach)).toFixed(3)}%, ${(handRest.y * (1 - reach)).toFixed(3)}%)`;
}

function measure() {
  const r = stage.value.getBoundingClientRect();
  stageTop = r.top;
  stageBottom = r.bottom;
}

/* The frame loop: direct while the pointer is over the hero, eased towards
   REST once it has gone, and over as soon as the cover has settled shut. */
function tick() {
  raf = 0;
  if (disposed || !stage.value) return;
  measure(); // read before the writes in pose()
  current = inside ? goal : settle(current, REST);
  pose(current);
  if (inside || current !== REST) raf = requestAnimationFrame(tick);
}
function schedule() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function onPointer(e) {
  inside = e.clientY >= stageTop && e.clientY <= stageBottom;
  goal = inside
    ? pointerPosition(
        e,
        { width: window.innerWidth, height: window.innerHeight },
        props.spec
      )
    : REST;
  schedule();
}
function onLeave() {
  inside = false;
  goal = REST;
  schedule();
}
function onPointerUp(e) {
  if (e.pointerType === "touch") onLeave();
}

function start() {
  if (
    disposed ||
    !ready ||
    listening ||
    reducedMotion.value ||
    !visible ||
    props.reveal != null
  )
    return;
  listening = true;
  measure();
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onLeave, { passive: true });
  window.addEventListener("blur", onLeave);
  document.documentElement.addEventListener("pointerleave", onLeave);
}
/* Stop following the pointer. The cover shuts at once: this runs when the
   hero has scrolled away, motion is reduced or the reveal is pinned, none
   of which should animate. */
function stop() {
  if (listening) {
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onLeave);
    window.removeEventListener("blur", onLeave);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  }
  listening = false;
  inside = false;
  goal = REST;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  current = REST;
  pose(REST);
}

/* Size the canvas like the opener's still cover (background-size: cover,
   background-position: center 20%) so the drawing sits where the poster
   underneath does, and the layers inside it keep their registration. */
function fit() {
  if (!stage.value || !canvas.value) return;
  const { width, height } = stage.value.getBoundingClientRect();
  const box = coverBox({ width, height }, props.spec.ratio);
  const s = canvas.value.style;
  s.width = `${box.width}px`;
  s.height = `${box.height}px`;
  s.left = `${box.left}px`;
  s.top = `${box.top}px`;
}

watch(
  () => props.reveal,
  (v) => {
    if (!ready) return;
    stop();
    if (v == null) start();
    else pose(clamp01(v));
  }
);
watch(reducedMotion, (reduced) => {
  if (!ready) return;
  if (reduced) stop();
  else start();
});

function decode(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => resolve(img);
    img.src = url;
    if (typeof img.decode === "function") {
      img.decode().then(() => resolve(img), reject);
    }
  });
}

onMounted(async () => {
  emit("state", "loading");
  const urls = [props.spec.base, props.spec.brain, props.spec.hand];
  const present = (await Promise.all(urls.map((u) => imageAssetOk(u)))).every(
    Boolean
  );
  if (disposed) return;
  let images = null;
  if (present) {
    try {
      images = await Promise.all(urls.map(decode));
    } catch {
      images = null;
    }
  }
  if (disposed) return;
  if (!images || !stage.value) {
    emit("state", "unavailable");
    return;
  }
  // The hand's rest offset is in fractions of its own width (chapterCover);
  // a translate() % on the y axis is of the element's height, so convert
  // with the photo's own ratio.
  const hand = images[2];
  const ratio =
    hand.naturalWidth > 0 && hand.naturalHeight > 0
      ? hand.naturalWidth / hand.naturalHeight
      : 1;
  handRest = {
    x: props.spec.handRest.x * 100,
    y: props.spec.handRest.y * ratio * 100,
  };
  shown.value = true;
  await nextTick();
  if (disposed || !stage.value) return;
  fit();
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(fit);
    ro.observe(stage.value);
  } else {
    window.addEventListener("resize", fit);
  }
  pose(props.reveal == null ? REST : clamp01(props.reveal));
  ready = true;
  emit("state", "ready");
  // Only follow the pointer while the opener is on screen.
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(stage.value);
  } else {
    start();
  }
});

onBeforeUnmount(() => {
  disposed = true;
  stop();
  io?.disconnect();
  ro?.disconnect();
  window.removeEventListener("resize", fit);
});
</script>

<template>
  <div ref="stage" class="cutaway-cover" aria-hidden="true">
    <div
      v-if="shown"
      ref="canvas"
      class="cutaway-cover__canvas"
      :style="{ background: spec.paper || 'transparent' }"
    >
      <img
        class="cutaway-cover__base"
        :src="spec.base"
        :style="{ clipPath: baseClip }"
        alt=""
        draggable="false"
      />
      <div class="cutaway-cover__band" :style="{ clipPath: bandClip }">
        <img :src="spec.brain" :style="brainStyle" alt="" draggable="false" />
      </div>
      <div
        ref="capEl"
        class="cutaway-cover__cap"
        :style="{ clipPath: capClip, transformOrigin: pivot }"
      >
        <img :src="spec.base" alt="" draggable="false" />
      </div>
      <div ref="handEl" class="cutaway-cover__hand" :style="handStyle">
        <img :src="spec.hand" alt="" draggable="false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cutaway-cover {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* Horizontal drags scrub the reveal; vertical ones still scroll the page. */
  touch-action: pan-y;
}
.cutaway-cover__canvas {
  position: absolute;
  /* Sized and placed by fit(); the paper colour fills the seam the cut
     leaves between the base and the cap. */
}
.cutaway-cover img {
  display: block;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
.cutaway-cover__base,
.cutaway-cover__band,
.cutaway-cover__cap {
  position: absolute;
  inset: 0;
}
.cutaway-cover__base,
.cutaway-cover__cap > img {
  width: 100%;
  height: 100%;
}
.cutaway-cover__band > img {
  position: absolute;
}
.cutaway-cover__cap,
.cutaway-cover__hand {
  will-change: transform;
}
.cutaway-cover__hand {
  position: absolute;
}
.cutaway-cover__hand > img {
  width: 100%;
  height: auto;
}
</style>
