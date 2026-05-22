<script setup>
import { useGeneral, useText } from "@/stores";
import { onMounted, ref, computed } from "vue";
import { watchDebounced, useMouse } from "@vueuse/core";
import { useRoute } from "vue-router";

import DownArrow from "@/icons/custom/DownArrow.vue";

const { x } = useMouse();

const store = useGeneral();
const textStore = useText();
const route = useRoute();
const animation = ref();

// Module name - for now hardcoded, could be fetched from Supabase later
const moduleName = computed(() => {
  // Chapter 1 belongs to "Visual Perception and UX" module
  if (route.params.number === '1' || route.params.slug === 'the-retina') {
    return 'Visual Perception and UX';
  }
  // For other chapters, could fetch from module data
  return textStore.text?.moduleName || 'Visual Perception and UX';
});

// Get chapter title from store
const chapterTitle = computed(() => {
  return textStore.text?.intro?.[0]?.title || 'The Open Brain';
});

// Chapter cover image based on route
const coverImage = computed(() => {
  const slug = route.params.slug;
  if (slug === 'the-retina') return '/publicAssets/images/00-matisse-bg.jpg';
  if (slug === 'visual-perception-ux') return '/publicAssets/images/marguerite.png';
  return '/publicAssets/images/background.jpg';
});

watchDebounced(
  x,
  (x) => {
    if (!animation.value) return;
    const map = (value, x1, y1, x2, y2) =>
      ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

    // let newFrame = map(x, 0, window.innerWidth, 0, 4).toFixed(6);
    let newFrame = map(
      x,
      0,
      window.innerWidth,
      0,
      animation.value.totalFrames
    ).toFixed(6);
    animation.value.goToAndStop(newFrame, true);
    // vid.value.currentTime = newFrame;
  },
  { debounce: 0 }
);

const scrollToPos = () => {
  document.getElementById("container").scrollIntoView({ behavior: "smooth" });
};
</script>
<template>
  <div
    id="titleAnimation"
    class="bg-light absolute right-0 w-screen h-screen z-[50] duration-300 flex justify-start items-start pointer-events-none"
    :style="{ backgroundImage: `url(${coverImage})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center 20%', backgroundSize: 'cover' }"
  >
    <div
      class="absolute top-0 left-0 w-screen h-screen text-white text-center flex justify-center items-center pb-8"
    >
      <div class="flex justify-center items-center flex-col w-2/3">
        <div class="text-biggest font-text">{{ chapterTitle }}</div>
        <!-- <div class="text-4xl">The Open Brain</div> -->
      </div>
    </div>
    <div
      @click="scrollToPos()"
      class="absolute bottom-8 left-1/ -ml-5 flex justify-center items-center text-center"
    >
      <DownArrow class="pointer-events-auto icon iconMed" />
    </div>
  </div>
</template>

<style>
#animationStart > svg {
  height: calc(100vh - 5rem);
}
.h-start {
  height: calc(100vh);
}

.bg-img {
  background-image: url("/publicAssets/images/background.jpg");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
</style>
