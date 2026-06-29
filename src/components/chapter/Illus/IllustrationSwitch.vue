<template>
  <div class="w-full h-full flex justify-end items-start">
    <div class="absolute top-40 left-20 z-50">
      <StateElement
        v-if="!info.blockSwitches"
        :states="info.switches"
        :activeState="activeState"
        @onClick="setState"
      />
      <StateElementBlock
        v-else
        :states="info.switches"
        :activeState="activeState"
        :praefix="info.iconPraefix"
        @onClick="setState"
      />
      <LegendElement
        v-if="info.legend"
        :legend="info.legend"
        iconPraefix="retinalCircuits"
      />
    </div>
    <template v-for="(switchWord, index) of info.switches" :key="switchWord">
      <div
        :class="store.legendIsActive && 'w-[80%]'"
        v-show="index === activeState"
        :id="
          (scopeId || info.id) +
          switchWord[0].toUpperCase() +
          switchWord.substring(1).replaceAll(' ', '')
        "
        class="w-full duration-300"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { loadLottie } from "@/composables/useLottie";
import StateElement from "../../UI/StateElement.vue";

let lottie;
import StateElementBlock from "../../UI/StateElementBlock.vue";
import LegendElement from "@/components/UI/LegendElement.vue";
import { useGeneral } from "../../../stores";

const props = defineProps({
  info: Object,
  isPaused: Boolean,
  // Optional scoped DOM id base for inline/mobile rendering. The mount node id
  // is scoped so multiple instances don't collide; the asset path keeps using
  // the real `info.id`. Absent = desktop behavior.
  scopeId: { type: String, default: null },
});
let animationLottie = [];
const store = useGeneral();
let activeState = ref(0);

let setState = (event) => {
  let max = props.info.switches.length;
  animationLottie[event.index || (activeState.value + 1) % max].goToAndPlay(
    0,
    true
  );
  activeState.value = event.index || (activeState.value + 1) % max;
};

watch(
  () => props.isPaused,
  (isPaused) => {
    if (!isPaused) {
      animationLottie[activeState.value].play();
    } else {
      animationLottie[activeState.value].pause();
    }
  }
);

onMounted(async () => {
  lottie = await loadLottie();

  let switches = props.info.switches;
  for (let index in switches) {
    let suffix =
      switches[index][0].toUpperCase() +
      switches[index].substring(1).replaceAll(" ", "");
    // Asset path keys off the real id (the .json filename); the mount id is
    // scoped so inline instances don't collide. Identical when scopeId absent.
    let assetId = props.info.id + suffix;
    let mountId = (props.scopeId || props.info.id) + suffix;
    let svgContainer = document.getElementById(mountId);
    if (!svgContainer) return;
    animationLottie[index] = lottie.loadAnimation({
      rendererSettings: {
        progressiveLoad: true,
      },
      id: mountId,
      speed: 1,
      wrapper: svgContainer,
      animType: "svg",
      loop: true,
      autoplay: props.info.loop ? true : false,
      path: "/publicAssets/animations/" + assetId + ".json",
    });
    animationLottie[index].setSubframe(true);
    animationLottie[index].play();
  }
});

// Release all switch Lottie instances on teardown (see IllustrationComp note).
onUnmounted(() => {
  animationLottie.forEach((a) => a?.destroy?.());
});
</script>

<style scoped></style>
