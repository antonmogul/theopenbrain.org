<script setup>
import { onMounted, ref, computed } from "vue";
import { loadLottie } from "@/composables/useLottie";
let lottie;

import { toSlug } from "@/helper/general";
import gsap from "gsap";

import FullScreenIllustrationMultiple from "@/components/chapter/Illus/FullScreenIllustrationMultiple.vue";

import { useAnimations } from "@/composables/useAnimations";
// Legacy JSON fallback for Chapter 1 during transition
import animationsJSON from "@/assets/json_backend/animations.json";
import FullScreenIllustrationLoop from "./FullScreenIllustrationLoop.vue";
import FullScreenIllustrationSplit from "./FullScreenIllustrationSplit.vue";
import SourceElement from "../../UI/SourceElement.vue";
import TextOverlay from "./TextOverlay.vue";

const props = defineProps({
  paragraph: Object,
});

const animation = ref(null);
const totalFrames = ref(null);
const containerScroll = ref();

// Use Supabase animations with JSON fallback
const { animations: dbAnimations, fetchAnimations } = useAnimations();

// Resolve the animation: try DB first, fall back to legacy JSON
const animationSource = computed(() => {
  if (dbAnimations.value && dbAnimations.value.length > 0) {
    return dbAnimations.value;
  }
  return animationsJSON.animations;
});

const thisAnimation = ref(null);

// Initialise thisAnimation once the animation source is available
const resolveAnimation = () => {
  const source = animationSource.value;
  thisAnimation.value =
    source.find((x) => x.id == props.paragraph.animationId) || null;
};

const activeState = ref({
  state: 0,
  toggle: false,
});

onMounted(async () => {
  // Fetch DB animations (composable caches, so this is cheap if already loaded)
  try {
    await fetchAnimations();
  } catch (err) {
    console.warn("FullScreenIllustration: DB fetch failed, using JSON fallback:", err);
  }

  // Resolve animation from whichever source is available
  resolveAnimation();

  // Update activeState now that thisAnimation is resolved
  if (thisAnimation.value?.multiple && thisAnimation.value?.states) {
    activeState.value.state = Object.keys(thisAnimation.value.states)[0];
  }

  if (props.paragraph.scroll) return;
  lottie = await loadLottie();
  const id = props.paragraph.animationId;
  var svgContainer = document.getElementById("container" + id);
  if (!svgContainer || !thisAnimation.value) return;
  animation.value = lottie.loadAnimation({
    speed: 3,
    wrapper: svgContainer,
    animType: "svg",
    loop: thisAnimation.value.loop,
    autoplay: false,
    path: "/publicAssets/animations/" + id + ".json",
    rendererSettings: {
      progressiveLoad: true,
    },
  });
  animation.value.setSubframe(true);
  animation.value.setSpeed(1);
});

const toggleState = (index, activeState) => {
  const posStart = 36 + 23 + 74 * (activeState.state - 1) - 5;
  const posEnd = 36 + 23 + 74 * (activeState.state - 1) + 15;
  if (!activeState.toggle) {
    animation.value.playSegments([posStart, posEnd], true);
    activeState.toggle = !activeState.toggle;
  } else {
    animation.value.playSegments([posEnd, posStart], true);
    activeState.toggle = !activeState.toggle;
  }
};
const setState = (index, activeState) => {
  if (!totalFrames.value) {
    totalFrames.value = animation.value.totalFrames;
  }
  animation.value.playSegments([1, totalFrames.value], true);
  if (index != 0) {
    const posAfter = 36 + 23 + 72 * (index - 1) + activeState.toggle * 12;
    activeState.state = index;
    animation.value.goToAndStop(posAfter, true);
  } else {
    animation.value.goToAndStop(0, true);
    activeState.toggle = 0;
    activeState.state = index;
    console.log("clicked");
  }
};

const infoIsOpen = ref(true);
const openInfo = () => {
  const el = document.getElementById(
    "info-" + toSlug(thisAnimation.value.title)
  );
  console.log(el);
  infoIsOpen.value = !infoIsOpen.value;
  if (infoIsOpen.value) {
    gsap.to(el, {
      duration: 0.3,
      height: "auto",
    });
  } else {
    gsap.to(el, {
      duration: 0.3,
      height: 0,
    });
  }
};
</script>

<template>
  <div
    v-if="thisAnimation"
    ref="containerScroll"
    class="w-screen border-y bg-light text-black border-black -translate-x-custom -ml-20 my-[0] text-small font-mono duration-300"
    :class="[
      !thisAnimation.split ? 'h-[150vh]' : 'h-[700vh]',
      thisAnimation.title === 'Pathway for the pupillary light reflex'
        ? '-mb-9'
        : 'mb-32',
    ]"
  >
    <div class="sticky w-full h-screen px-24 py-10 top-0">
      <div
        class="absolute z-50 flex flex-col justify-between"
        v-if="thisAnimation?.states"
      >
        <h4 class="inline">{{ thisAnimation.title }}</h4>
        <!-- Overlay -->
        <TextOverlay
          v-if="thisAnimation.infoText"
          :animation="thisAnimation"
          :infoIsOpen="infoIsOpen"
          @onOpen="openInfo"
        />
        <div
          class="absolute pt-52 duration-300"
          :class="infoIsOpen && thisAnimation.infoText && 'opacity-10 blur-sm'"
          v-if="!thisAnimation?.loop"
        >
          <div
            v-for="(state, index) in thisAnimation.states"
            :key="state"
            class="grid grid-cols-2 mb-4 py-0 gap-0"
          >
            <button
              class="flex justify-center items-center flex-col border p-6 border-black duration-100 text-center flex-1 max-w-[300px]"
              :class="[
                index !== 0 ? ' col-span-1	' : ' col-span-2	',
                (activeState.toggle === false && activeState.state === index) ||
                (activeState.state === index && index === 0)
                  ? 'bg-violet text-white pointer-events-none'
                  : activeState.state === index
                  ? 'border-violet text-black hover:text-violet  '
                  : ' text-dark hover:text-violet hover:border-violet',
              ]"
              @click="
                activeState.state !== index
                  ? activeState.toggle === true
                    ? (toggleState(index, activeState),
                      setState(index, activeState))
                    : setState(index, activeState)
                  : toggleState(index, activeState)
              "
            >
              <div class="">{{ state }}</div>
            </button>

            <button
              v-if="index !== 0 && !thisAnimation?.multiple"
              class="flex justify-center items-center flex-col border border-l-0 col-span-1 p-6 border-black duration-100 flex-1"
              :class="[
                activeState.toggle === true && activeState.state === index
                  ? 'bg-violet text-white pointer-events-none'
                  : activeState.state === index
                  ? 'border-violet text-black  hover:text-violet '
                  : 'bg-lighter text-dark hover:text-violet hover:border-violet',
                ,
              ]"
              @click="
                activeState.state !== index
                  ? activeState.toggle !== true //shoulb be !==
                    ? (toggleState(index, activeState),
                      setState(index, activeState, 'toggle'))
                    : setState(index, activeState, 'toggle')
                  : toggleState(index, activeState, 'toggle')
              "
            >
              {{ thisAnimation.toggle }}
            </button>
          </div>
        </div>
      </div>
      <SourceElement
        :source="thisAnimation?.source"
        class="duration-300"
        :class="infoIsOpen && thisAnimation.infoText && 'opacity-10 blur-sm'"
      />
      <div
        v-if="
          !thisAnimation?.multiple &&
          !thisAnimation?.loop &&
          !thisAnimation?.split
        "
        :id="'container' + paragraph.animationId"
        :class="infoIsOpen && thisAnimation.infoText && 'opacity-10 blur-sm'"
        class="absolute right-0 w-2/3 h-full flex flex-col justify-end items-center duration-300"
      ></div>
      <div
        v-if="
          (!thisAnimation?.multiple && thisAnimation?.loop) ||
          thisAnimation?.split
        "
        class="w-full h-full"
      >
        <FullScreenIllustrationLoop
          v-if="!thisAnimation?.multiple && thisAnimation?.loop"
          class="duration-300"
          :class="infoIsOpen && thisAnimation.infoText && 'opacity-10 blur-sm'"
          :animation="thisAnimation"
        />
        <FullScreenIllustrationSplit
          v-if="thisAnimation?.split"
          :animation="thisAnimation"
          :container="containerScroll"
        />
      </div>
      <div
        v-if="thisAnimation?.multiple && thisAnimation?.states"
        class="absolute right-0 w-2/3 h-screen flex flex-col justify-end items-center p-56"
      >
        <template
          v-for="state in Object.keys(thisAnimation.states)"
          :key="state"
        >
          <FullScreenIllustrationMultiple
            v-if="activeState?.state === state"
            :state="state"
            :animation="thisAnimation"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
