<template>
  <div :id="animation?.id + state.toUpperCase()" class="w-full" />
</template>

<script setup>
import { onMounted } from "vue";
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

onMounted(async () => {
  lottie = await loadLottie();
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
</script>

<style scoped></style>
