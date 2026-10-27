<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { toSlug, addH, removeH } from "@/helper/general";

let lottie;

const props = defineProps({
  animation: Object,
  state: String,
});
let animationLottie;
// The parent swaps these per state (v-if on activeState), so every state
// change used to leave a Lottie behind (OPENBRAIN-151). Set on unmount so a
// library import that resolves afterwards creates nothing either.
let disposed = false;

onMounted(async () => {
  lottie = await loadLottie();
  if (disposed) return;
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

onBeforeUnmount(() => {
  disposed = true;
  animationLottie?.destroy?.();
  animationLottie = null;
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
