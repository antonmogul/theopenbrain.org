<script setup>
import { onMounted } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { toSlug, addH, removeH } from "@/helper/general";

let lottie;

const props = defineProps({
  animation: Object,
  state: String,
});
let animationLottie;

onMounted(async () => {
  lottie = await loadLottie();
  let svgContainer = document.getElementById(
    props.animation.id + "-" + toSlug(props.state)
  );
  if (!svgContainer) return;
  animationLottie = lottie.loadAnimation({
    id: props.animation.id + "-" + toSlug(props.state),
    speed: 3,
    wrapper: svgContainer,
    animType: "svg",
    loop: false,
    autoplay: false,
    rendererSettings: {
      progressiveLoad: true,
    },
    path:
      "/publicAssets/animations/" +
      props.animation.id +
      "-" +
      toSlug(props.state) +
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

<template>
  <div class="flex justify-end items-end h-full flex-wrap">
    <div
      :id="animation?.id + '-' + toSlug(props.state)"
      class="flex-grow h-full w-2/3 object-contain"
    />
  </div>
</template>

<style scoped></style>
