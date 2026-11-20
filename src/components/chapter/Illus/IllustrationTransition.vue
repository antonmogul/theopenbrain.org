<template>
  <div
    class="w-full flex flex-col h-full pointer-events-auto"
    :class="framing ? '' : 'pl-32 pr-14'"
    style="position: relative"
  >
    <div :style="frameStyle" class="transition-art">
      <div :id="animation.id" ref="container" class="w-full h-full" />
    </div>
    <FigureHeading :record="animation" class="transition-heading" />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { useReducedMotion } from "@/composables/useReducedMotion";
import { lottiePath } from "@/helper/animationResolve";
import FigureHeading from "./FigureHeading.vue";

const props = defineProps({
  animation: Object,
  activeAnimation: String,
  progress: { type: Number, default: 0 },
  framing: { type: Object, default: null },
  autoPlay: { type: Boolean, default: false },
});
const container = ref(null);
const frameStyle = computed(() =>
  props.framing
    ? {
        position: "absolute",
        left: `${props.framing.x}px`,
        top: `${props.framing.y}px`,
        width: `${props.framing.width}px`,
        height: `${props.framing.height}px`,
      }
    : { width: "100%", height: "100%" }
);
let animationLottie;
let ready = false;
let unmounted = false;
const reducedMotion = useReducedMotion();

function seek() {
  if (!ready || !animationLottie || unmounted) return;
  const svg = container.value?.querySelector("svg");
  if (svg && props.framing)
    svg.setAttribute("viewBox", props.framing.viewBox.join(" "));
  if (props.autoPlay && props.progress < 1 && !reducedMotion.value) {
    animationLottie.play();
    return;
  }
  const total = animationLottie.totalFrames;
  // Preserve the original authored 10–90% scroll interval. Reduced motion
  // shows the finished drawing without scrubbing through the zoom.
  const frame = reducedMotion.value
    ? total - 1
    : Math.min(total - 1, Math.max(1, ((props.progress - 0.1) / 0.8) * total));
  animationLottie.goToAndStop(frame, true);
}
watch([() => props.progress, () => props.framing, reducedMotion], seek);

onMounted(async () => {
  const lottie = await loadLottie();
  if (unmounted || !container.value) return;
  animationLottie = lottie.loadAnimation({
    rendererSettings: { progressiveLoad: true },
    wrapper: container.value,
    animType: "svg",
    loop: false,
    autoplay: false,
    path: lottiePath(props.animation),
  });
  animationLottie.setSubframe(true);
  animationLottie.addEventListener("DOMLoaded", () => {
    ready = true;
    seek(); // Latest progress, including jumps made while the asset loaded.
  });
});
onBeforeUnmount(() => {
  unmounted = true;
  animationLottie?.destroy();
});
</script>

<style scoped>
.transition-heading {
  position: absolute;
  left: 0;
  bottom: 0;
}
</style>
