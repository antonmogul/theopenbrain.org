<script setup>
// Only authored transition/replacement pairs use this handoff. Keep both
// renderers mounted for reverse scrolling; the endpoint covers the successor
// until its own Lottie artwork has loaded and had a paint opportunity.
import { computed, ref } from "vue";
import IllustrationTransition from "./IllustrationTransition.vue";
import IllustrationWidget from "./IllustrationWidget.vue";
const props = defineProps({
  transition: { type: Object, required: true },
  successor: { type: Object, required: true },
  active: String,
  progress: { type: Number, default: 0 },
});
const ready = ref(false);
const root = ref(null);
const framing = ref(null);
function widgetReady(report) {
  const art = report?.artwork;
  const rect = root.value?.getBoundingClientRect();
  if (art && rect && art.width > 0 && art.height > 0)
    framing.value = { ...art, x: art.x - rect.x, y: art.y - rect.y };
  ready.value = true;
}
const atSuccessor = computed(
  () => props.active === props.successor.id.toLowerCase()
);
const showSuccessor = computed(() => atSuccessor.value && ready.value);
</script>

<template>
  <div
    ref="root"
    class="figure-sequence w-full h-full"
    :data-sequence-ready="ready"
  >
    <IllustrationTransition
      :animation="transition"
      :progress="atSuccessor ? 1 : progress"
      :framing="framing"
      :auto-play="!transition.isTransition"
      :style="{ visibility: showSuccessor ? 'hidden' : 'visible' }"
      :aria-hidden="showSuccessor"
      class="sequence-layer"
    />
    <IllustrationWidget
      :animation="successor"
      preload
      :style="{ visibility: showSuccessor ? 'visible' : 'hidden' }"
      :inert="!showSuccessor"
      :aria-hidden="!showSuccessor"
      class="sequence-layer"
      @ready="widgetReady"
    />
  </div>
</template>

<style scoped>
.figure-sequence {
  position: relative;
}
.sequence-layer {
  position: absolute;
  inset: 0;
}
</style>
