<template>
  <div class="pl-32 pr-14 w-full flex flex-col h-full pointer-events-auto">
    <div :id="animation.id" ref="container" class="w-full h-full" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { useReducedMotion } from "@/composables/useReducedMotion";
import { lottiePath } from "@/helper/animationResolve";

const props = defineProps({
  animation: Object,
  activeAnimation: String,
  progress: { type: Number, default: 0 },
});
const container = ref(null);
let animationLottie;
let ready = false;
let unmounted = false;
const reducedMotion = useReducedMotion();

function seek() {
  if (!ready || !animationLottie || unmounted) return;
  const total = animationLottie.totalFrames;
  // Preserve the original authored 10–90% scroll interval. Reduced motion
  // shows the finished drawing without scrubbing through the zoom.
  const frame = reducedMotion.value
    ? total - 1
    : Math.min(total - 1, Math.max(1, ((props.progress - 0.1) / 0.8) * total));
  animationLottie.goToAndStop(frame, true);
}
watch([() => props.progress, reducedMotion], seek);

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
