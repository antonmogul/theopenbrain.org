<script setup>
/*
 * Transitions (OPENBRAIN-83): the eye's structure and the retina's cell
 * types, matched to theopenbrain.org (v0.2.3). A Lottie in the figure panel
 * that plays as the reader scrolls from one figure to the next.
 *
 * Scroll-driven: the panel passes the reader's scroll through the section
 * as `progress` (0 to 1); the Lottie runs over the schema's `scrub` stretch
 * of it, as the original did (10% to 90%).
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useFigureLottie } from "../shared/useFigureLottie.js";

const props = defineProps({
  /** No words of its own; passed by the host to every figure widget. */
  content: { type: Object, default: () => ({}) },
  /** The transition's schema: scrub { from, to }. */
  schema: { type: Object, required: true },
  lottieUrl: { type: String, required: true },
  /** How far the reader has scrolled through the section, 0 to 1. */
  progress: { type: Number, default: 0 },
});

const stage = ref(null);
const lottie = useFigureLottie(stage, props.schema.id);

function draw() {
  const a = lottie.anim;
  const total = a?.totalFrames;
  if (!total) return;
  const { from, to } = props.schema.scrub;
  const f = ((props.progress - from) / (to - from)) * total;
  a.goToAndStop(Math.min(Math.max(f, 1), total - 1), true);
}

onMounted(async () => {
  await lottie.mount(props.lottieUrl);
  draw();
});
watch(() => props.progress, draw);
onBeforeUnmount(() => lottie.destroy());
</script>

<template>
  <div class="tr">
    <div ref="stage" class="tr-stage" aria-hidden="true" />
    <p v-if="lottie.failed.value" class="tr-failed" role="alert">
      The animation didn't load. Reload the page to try again.
    </p>
  </div>
</template>

<style scoped>
.tr {
  position: relative;
  width: 100%;
  height: 100%;
  /* The original's pl-32 pr-14, at its 10px rem. */
  padding: 0 2.1875rem 0 5rem;
}
.tr-stage {
  width: 100%;
  height: 100%;
}
.tr-failed {
  position: absolute;
  right: 2rem;
  bottom: 2rem;
  max-width: 22rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #000;
  font:
    0.875rem/1.4 "IBM Plex Sans",
    system-ui,
    sans-serif;
}
</style>
