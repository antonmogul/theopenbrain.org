<script setup>
/*
 * The split figure (OPENBRAIN-83): lateral organization, matched to
 * theopenbrain.org (v0.2.3). As the reader scrolls through it, two Lotties
 * run together, the retina's layers on the left and each layer's mosaic on
 * the right, with a caption while a layer is on screen.
 *
 * Scroll-driven: the host measures the reader's scroll through the figure
 * and passes it as `progress` (0 to 1); this only draws from it. Both
 * sides render as SVG: the mosaics fade in through a Gaussian blur, an
 * effect lottie-web's canvas renderer doesn't draw.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { versionedUrl } from "../content.js";
import { useFigureLottie } from "../shared/useFigureLottie.js";

const props = defineProps({
  /** figureContent(schema, record): title, infos, sources. */
  content: { type: Object, required: true },
  /** The figure's schema: left, right, startFrame, layers, lottieVersion. */
  schema: { type: Object, required: true },
  /** How far the reader has scrolled through the figure, 0 to 1. */
  progress: { type: Number, default: 0 },
  /** Passed by the host to every figure widget; this one plays two files. */
  lottieUrl: { type: String, default: "" },
});

const leftStage = ref(null);
const rightStage = ref(null);
const left = useFigureLottie(leftStage, `${props.schema.id} (layers)`);
const right = useFigureLottie(rightStage, `${props.schema.id} (mosaics)`);
const frame = ref(0);

/** The original's mapping: the scroll runs frames startFrame to the end. */
function frameFor(p) {
  const total = left.anim?.totalFrames;
  if (!total) return 0;
  const f = props.schema.startFrame + p * (total - 1 - props.schema.startFrame);
  return Math.min(Math.max(f, 1), total - 1);
}
function draw() {
  frame.value = frameFor(props.progress);
  left.anim?.goToAndStop(frame.value, true);
  right.anim?.goToAndStop(frame.value, true);
}

/** The layer whose caption shows now, or -1 between layers. */
const layer = computed(() =>
  props.schema.layers.findIndex(
    (l) => l.from < frame.value && frame.value < l.to
  )
);
const failed = computed(() => left.failed.value || right.failed.value);

onMounted(async () => {
  const v = props.schema.lottieVersion;
  await Promise.all([
    left.mount(versionedUrl(props.schema.left, v)),
    right.mount(versionedUrl(props.schema.right, v)),
  ]);
  draw();
});
watch(() => props.progress, draw);
onBeforeUnmount(() => {
  left.destroy();
  right.destroy();
});
</script>

<template>
  <div class="sp">
    <h4 class="sp-title">{{ content.title }}</h4>
    <div class="sp-halves" aria-hidden="true">
      <div class="sp-left">
        <div ref="leftStage" class="sp-stage-left" />
      </div>
      <div class="sp-right">
        <div ref="rightStage" class="sp-stage-right" />
      </div>
    </div>
    <div v-if="layer >= 0" class="sp-caption" aria-live="polite">
      <p v-if="content.infos[layer]" class="sp-info">
        {{ content.infos[layer] }}
      </p>
      <p v-if="content.sources[layer]" class="sp-source">
        {{ content.sources[layer] }}
      </p>
    </div>
    <p v-if="failed" class="sp-failed" role="alert">
      The animation didn't load. Reload the page to try again.
    </p>
  </div>
</template>

<style scoped>
/* The original's ground for its full-screen figures without an intro. */
.sp {
  --sp-bg: #8f9e9d;
  --sp-ink: #000;
  --sp-sans: "IBM Plex Sans", system-ui, sans-serif;
  --sp-mono: "IBM Plex Mono", ui-monospace, monospace;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--sp-bg);
  color: var(--sp-ink);
  font-family: var(--sp-mono);
}
.sp .sp-title {
  position: absolute;
  z-index: 3;
  top: 1.375rem;
  left: 3.75rem;
  margin: 0;
  font-family: var(--sp-sans);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.55;
  user-select: none;
}
.sp-halves {
  position: absolute;
  inset: 0;
  display: flex;
}
.sp-left {
  width: 50%;
  height: 100%;
  display: flex;
}
.sp-stage-left {
  width: 100%;
  max-width: 50rem;
  height: 100%;
  margin: auto;
  padding: 7.5rem 0;
}
.sp-right {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-left: 1px solid var(--sp-ink);
}
.sp-stage-right {
  width: calc(100% - 3.75rem);
  height: calc(100% + 3.125rem);
  margin: 1.875rem;
}
.sp-caption {
  position: absolute;
  z-index: 3;
  left: 3.75rem;
  bottom: 3.125rem;
  max-width: 35.625rem;
  padding-right: 3.125rem;
}
.sp-caption p {
  margin: 0;
}
.sp-info {
  padding-bottom: 0.5rem;
  font: 0.9375rem/1.45 var(--sp-mono);
}
.sp-source {
  font: 0.6875rem/1.4 var(--sp-mono);
}
.sp-failed {
  position: absolute;
  z-index: 3;
  right: 2rem;
  bottom: 2rem;
  max-width: 22rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fff;
  font: 0.875rem/1.4 var(--sp-sans);
}

/* Narrow screens: the layers above their mosaic. */
@container figure (max-width: 760px) {
  .sp .sp-title {
    left: 1rem;
    top: 1rem;
  }
  .sp-halves {
    flex-direction: column;
    padding-top: 3.5rem;
  }
  .sp-left,
  .sp-right {
    width: 100%;
    height: 50%;
  }
  .sp-stage-left {
    padding: 0.5rem 0;
  }
  .sp-right {
    border-left: 0;
    border-top: 1px solid var(--sp-ink);
  }
  .sp-stage-right {
    width: calc(100% - 2rem);
    height: calc(100% - 2rem);
    margin: 1rem;
  }
  .sp-caption {
    left: 1rem;
    bottom: 1rem;
    padding-right: 1rem;
    background: rgb(143 158 157 / 0.85);
  }
}
</style>
