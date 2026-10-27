<template>
  <div :id="animation?.id + state.toUpperCase()" class="w-full" />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { addH, removeH } from "@/helper/general";

let lottie;

// (No animation-source lookup here: this component only builds asset paths
// from the id of whatever animation object the parent passes — OPENBRAIN-10
// audit found nothing else to resolve.)

const props = defineProps({
  animation: Object,
  state: String,
});

let animationLottie;
// Set on unmount so a library import that resolves afterwards creates
// nothing, and the Lottie that was made is destroyed (OPENBRAIN-151).
let disposed = false;

onMounted(async () => {
  lottie = await loadLottie();
  if (disposed) return;
  let svgContainer = document.getElementById(
    props.animation.id + props.state.toUpperCase()
  );
  if (!svgContainer) return;
  animationLottie = lottie.loadAnimation({
    id: props.animation.id + props.state.toUpperCase(),
    speed: 3,
    wrapper: svgContainer,
    animType: "svg",
    loop: true,
    autoplay: false,
    rendererSettings: {
      progressiveLoad: true,
    },
    path:
      "/publicAssets/animations/" +
      props.animation.id +
      props.state.toUpperCase() +
      ".json",
  });
  animationLottie.addEventListener("DOMLoaded", () => {
    const highligters = document.getElementsByClassName("highlighterIllu");
    for (let highlighter of highligters) {
      highlighter.addEventListener("mouseover", (event) => addH(event));
      highlighter.addEventListener("mouseleave", (event) => removeH(event));
    }
  });
  animationLottie.setSubframe(true);
  animationLottie.setSpeed(1);
  animationLottie.play();
});

onBeforeUnmount(() => {
  disposed = true;
  animationLottie?.destroy?.();
  animationLottie = null;
});
</script>

<style scoped></style>
