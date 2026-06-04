<script setup>
import { useGeneral, useText } from "@/stores";
import { onMounted, onBeforeUnmount, ref, computed } from "vue";
import { watchDebounced, useMouse } from "@vueuse/core";
import { useRoute } from "vue-router";

import DownArrow from "@/icons/custom/DownArrow.vue";

const { x } = useMouse();

const store = useGeneral();
const textStore = useText();
const route = useRoute();
const animation = ref();

// Scroll-driven hero treatment: the cover stays pinned (fixed) and, as the
// reader scrolls the first viewport, it progressively blurs and darkens while
// the title fades — the text column (#container, top:100vh) rises over it.
const scrollProgress = ref(0); // 0 at top → 1 after one viewport scrolled

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
    scrollProgress.value = p;
    ticking = false;
  });
}

const heroStyle = computed(() => {
  const p = scrollProgress.value;
  return {
    backgroundImage: `url(${coverImage.value})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center 20%",
    backgroundSize: "cover",
    // Gentle blur as the banner scrolls out of view.
    filter: `blur(${(p * 8).toFixed(2)}px)`,
  };
});

// Title fades as the banner leaves; a light scrim keeps it legible early on.
const scrimOpacity = computed(() => (scrollProgress.value * 0.25).toFixed(3));
const titleOpacity = computed(() =>
  Math.max(0, 1 - scrollProgress.value * 1.6).toFixed(3)
);

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
});

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
  <!-- Hero banner: a normal in-flow block at the very top that scrolls away as
       the reader moves into the chapter. NOT fixed, so nothing lingers behind
       the split-screen — both reading panels stay fully solid. A gentle blur on
       the way out keeps a touch of the parallax feel. -->
  <div
    id="titleAnimation"
    class="bg-light absolute top-0 right-0 w-screen h-screen z-[35] flex justify-start items-start pointer-events-none overflow-hidden"
    :style="heroStyle"
  >
    <div
      class="absolute inset-0 bg-black"
      :style="{ opacity: scrimOpacity }"
    ></div>
    <div
      class="absolute top-0 left-0 w-screen h-screen text-white text-center flex justify-center items-center pb-8"
      :style="{ opacity: titleOpacity }"
    >
      <div class="flex justify-center items-center flex-col w-2/3">
        <div class="text-biggest font-text">{{ chapterTitle }}</div>
      </div>
    </div>
    <div
      v-show="scrollProgress < 0.1"
      @click="scrollToPos()"
      class="absolute bottom-8 left-1/ -ml-5 flex justify-center items-center text-center duration-300"
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
