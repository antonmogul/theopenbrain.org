<script setup>
/*
 * Reactive cover (OPENBRAIN-146): the opener's "mouse responsive" drawing.
 *
 * A Lottie laid over the still cover and scrubbed, not played: the pointer's
 * position across the viewport (x by default) picks the frame outright, as
 * the 2023 Retina opener did (EyeStart.vue: lottie-web goToAndStop on a frame
 * mapped from useMouse's x over window.innerWidth, no easing). Touch drags
 * scrub too (`touch-action: pan-y` keeps vertical swipes scrolling the page).
 * Left alone for a moment it sweeps gently on its own, eased so it never
 * jumps; with reduced motion it sits on the middle frame.
 *
 * The still cover underneath is the poster and the fallback: `lottieAssetOk`
 * HEAD-checks the file first, so a missing Lottie means no request lottie-web
 * would log and no layer at all (`state` = "unavailable"). The parent reads
 * `state` for `data-reactive-cover`; nothing here touches --opener-h.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { lottieAssetOk } from "@/helper/animationResolve";
import { useReducedMotion } from "@/composables/useReducedMotion";
import {
  IDLE_AFTER_MS,
  ease,
  frameFor,
  idlePosition,
  pointerPosition,
} from "@/helper/reactiveCover";

const props = defineProps({
  /* A normalised record from reactiveCoverForModule: { lottie, axis, reverse, fit, idle }. */
  spec: { type: Object, required: true },
});
const emit = defineEmits(["state"]);

const stage = ref(null);
const reducedMotion = useReducedMotion();
let ready = false;
let anim = null;
let total = 1;
let current = 0.5; // the shown position, 0..1
let idleStart = 0; // performance.now() when the sweep began
let idleTimer = 0;
let raf = 0;
let io = null;
let visible = true;
let disposed = false;

function show(position) {
  if (!anim) return;
  current = position;
  anim.goToAndStop(frameFor(position, total), true);
}

function onPointer(e) {
  stopSweep();
  show(
    pointerPosition(
      e,
      { width: window.innerWidth, height: window.innerHeight },
      props.spec
    )
  );
  armSweep();
}

/* The idle sweep: after IDLE_AFTER_MS without input, ease towards a slow
   sine around the middle (helper/reactiveCover idlePosition). */
function armSweep() {
  if (!(props.spec.idle > 0)) return;
  idleTimer = setTimeout(() => {
    idleStart = performance.now();
    raf = requestAnimationFrame(sweep);
  }, IDLE_AFTER_MS);
}
function stopSweep() {
  clearTimeout(idleTimer);
  idleTimer = 0;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
function sweep() {
  raf = 0;
  if (disposed || !visible) return;
  const now = performance.now();
  show(ease(current, idlePosition(now - idleStart, props.spec.idle)));
  raf = requestAnimationFrame(sweep);
}

function start() {
  if (disposed || !ready || reducedMotion.value || !visible) return;
  stop();
  window.addEventListener("pointermove", onPointer, { passive: true });
  armSweep();
}
function stop() {
  window.removeEventListener("pointermove", onPointer);
  stopSweep();
}

watch(reducedMotion, (reduced) => {
  stop();
  if (!ready) return;
  if (reduced) show(0.5);
  else start();
});

onMounted(async () => {
  emit("state", "loading");
  const ok = await lottieAssetOk(props.spec.lottie);
  if (disposed) return;
  if (!ok || !stage.value) {
    emit("state", "unavailable");
    return;
  }
  const lottie = await loadLottie();
  if (disposed || !stage.value) return;
  anim = lottie.loadAnimation({
    container: stage.value,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: props.spec.lottie,
    rendererSettings: {
      preserveAspectRatio:
        props.spec.fit === "slice" ? "xMidYMid slice" : "xMidYMid meet",
    },
  });
  anim.addEventListener("data_failed", () => emit("state", "unavailable"));
  anim.addEventListener("DOMLoaded", () => {
    if (disposed) return;
    total = anim.totalFrames || 1;
    show(0.5);
    emit("state", "ready");
    ready = true;
    // Only run while the opener is on screen: the sweep and the listener
    // have nothing to show once the reader has scrolled into the chapter.
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
});

onBeforeUnmount(() => {
  disposed = true;
  stop();
  io?.disconnect();
  anim?.destroy?.();
  anim = null;
});
</script>

<template>
  <div ref="stage" class="reactive-cover" aria-hidden="true" />
</template>

<style scoped>
.reactive-cover {
  position: absolute;
  inset: 0;
  /* Horizontal drags scrub the frame; vertical ones still scroll the page. */
  touch-action: pan-y;
}
.reactive-cover :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
