<template>
  <div
    class="pr-14 pl-32 flex flex-row justify-center items-center h-[100%] pointer-events-auto"
  >
    <div
      class="px-28 pt-10 z-30 fixed flex flex-col w-illus justify-between top-0 left-0"
      :class="animation.multiple ? 'items-center' : 'items-start'"
    >
      <span class="pb-0 text-baseMono">{{ animation.title }}</span>
      <div
        v-if="animation.multiple"
        class="fixed top-0 left-0 w-illus h-screen px-28 pl-28 flex flex-col justify-center items-start"
      >
        <template
          v-for="(state, index) in Object.keys(animation.states)"
          :key="state"
        >
          <IllustarionMultiple
            v-if="activeState.state === index"
            :state="state"
            :animation="animation"
            class="max-h-[600px]"
          />
        </template>
        <div v-if="animation.states">
          <p
            v-for="(state, index) of !animation.multiple
              ? animation.states
              : Object.keys(animation.states)"
            :key="state"
            class="hover:underline duration-300 text-small"
            :class="
              activeState.state == index
                ? 'italic font-semibold'
                : 'blur-xs opacity-30'
            "
            @click="setState(index, state)"
          >
            Task {{ index + 1 }}: {{ animation.states[state] }}
          </p>
        </div>
      </div>

      <div v-if="animation.switches || animation.states">
        <template v-if="!info.blockStates">
          <StateElement
            v-if="!info.blockSwitches"
            :states="!info.multiple ? info.states : Object.keys(info.states)"
            :activeState="activeState.state"
            :praefix="info.iconPraefix"
            :iconsIndex="info.icons"
            @onClick="setState"
          />
          <StateElementBlock
            v-else
            :states="!info.multiple ? info.states : Object.keys(info.states)"
            :activeState="activeState.state"
            :praefix="info.iconPraefix"
            :iconsIndex="info.icons"
            @onClick="setState"
          />
        </template>
        <div class="pt-20" v-else>
          <p
            v-for="(state, index) in !animation.multiple
              ? animation.states
              : Object.keys(animation.states)"
            :key="state"
            class="hover:text-violet hover:bg-white hover:border-violet select-none text-smaller cursor-pointer pb-2 mb-4 border-black border p-4 flex flex-col justify-center items-center"
            :class="
              activeState[index] ? 'font-semibold bg-violet text-white' : ''
            "
            @click="setBlockState(index, activeState.state)"
          >
            <img
              class="w-full h-10 my-1"
              :class="activeState[index] ? 'invert' : ''"
              :src="
                '/publicAssets/icons/' +
                animation.iconPraefix +
                '/' +
                toSlug(state) +
                '.svg'
              "
            />
            {{ state }}
          </p>
        </div>
      </div>
    </div>
    <div class="flex flex-row min-w-full">
      <template v-if="animation.illuImage">
        <div
          v-if="!animation.youtubeID"
          :class="
            animation.fullHeight
              ? 'bg-black text-white h-screen w-illus flex justify-center items-center absolute top-0 left-0'
              : ''
          "
        >
          <span
            class="px-28 pt-10 z-30 fixed flex flex-col w-illus justify-between top-0 left-0 text-baseMono"
          >
            {{ animation.title }}
          </span>
          <img
            class="max-w-full max-h-[80vh]"
            :class="animation.fullHeight ? 'p-32 ' : ''"
            :src="`/publicAssets/images/illuImages/${animation.id}.png`"
          />
          <SourceElement source="This would be a instructional text!" />
        </div>
        <div class="w-full h-[80vh]" v-else>
          <iframe
            class="w-full h-full"
            :src="`https://www.youtube.com/embed/${animation.youtubeID}`"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </template>
      <template v-else>
        <div
          v-if="!animation.multiple && !animation.flip && !animation.switch"
          :id="scopeId || animation.id"
          class="w-full"
        />
        <IllustrationFlip
          v-else-if="!animation.multiple && animation.flip"
          :animation="animation"
        />
        <IllustrationSwitch
          v-if="!animation.multiple && !animation.flip && animation.switch"
          :info="info"
          :isPaused="isPaused"
          :scope-id="scopeId"
        />
      </template>
    </div>
    <div class="absolute top-12 right-8 z-40">
      <PauseIcon
        class="icon"
        v-if="animation.loop && !isPaused"
        @click="playPause()"
      />
      <PlayIcon class="icon" v-else-if="animation.loop" @click="playPause()" />
    </div>
  </div>
</template>

<script setup>
import IllustarionMultiple from "@/components/chapter/Illus/IllustarionMultiple.vue";
import { ref, onMounted, onUnmounted } from "vue";
import { addH, removeH, toSlug, toCamelCase } from "@/helper/general";
import { loadLottie } from "@/composables/useLottie";

let lottie;

// Detect reduced-motion preference
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
import animationJSON from "@/assets/json_backend/animations.json";
import PlayIcon from "@/icons/custom/PlayIcon.vue";
import PauseIcon from "@/icons/custom/PauseIcon.vue";
import IllustrationFlip from "./IllustrationFlip.vue";
import IllustrationSwitch from "./IllustrationSwitch.vue";
import StateElement from "@/components/UI/StateElement.vue";
import StateElementBlock from "@/components/UI/StateElementBlock.vue";
import SourceElement from "@/components/UI/SourceElement.vue";

const props = defineProps({
  animation: Object,
  activeAnimation: String,
  // Optional scoped DOM id for the Lottie mount node. When set (inline/mobile
  // rendering), the figure mounts into this id instead of the global
  // `animation.id`, so multiple instances don't collide. The asset PATH still
  // uses `animation.id` (the .json filename). Absent = desktop behavior.
  scopeId: { type: String, default: null },
});
let animationLottie;
let isPaused = ref(false);

// Use the animation prop directly (it now contains all config from DB or JSON).
// Fall back to JSON lookup for backward compatibility during transition.
const info = props.animation.clickTriggered !== undefined ||
  props.animation.loop !== undefined ||
  props.animation.illuImage !== undefined ||
  props.animation.flip !== undefined ||
  props.animation.switch !== undefined
    ? props.animation
    : animationJSON.animations.find((x) => x.id == props.animation.id) || props.animation;

const activeState = !info.blockStates
  ? ref({
      state: undefined,
    })
  : ref([]);

if (info.blockStates) {
  if (info.states) {
    info.states.forEach(() => {
      activeState.value.push(true);
    });
  } else {
    info.switches.forEach(() => {
      activeState.value.push(true);
    });
  }
}

const playPause = () => {
  if (isPaused.value) {
    isPaused.value = false;
    if (!animationLottie) return;
    animationLottie.playSegments(
      info.loopSection || [0, animationLottie.totalFrames],
      false
    );
  } else {
    isPaused.value = true;
    if (!animationLottie) return;
    animationLottie.pause();
  }
};

const setState = (event) => {
  let index = event.index;
  let indexBefore = event.activeState;

  if (!info.highlight) {
    if (!props.animation.multiple) {
      animationLottie.setSpeed(6);
      let totalFrames = animationLottie.animationData.op;
      const pos = (totalFrames / 6) * (indexBefore + 1);
      animationLottie.playSegments([1, totalFrames], true);
      const posAfter = (totalFrames / 6) * (index + 1);
      activeState.value.state = index;
      if (info.smooth) {
        animationLottie.playSegments([pos, posAfter], true);
      } else {
        animationLottie.goToAndStop(posAfter, true);
      }
    } else {
      activeState.value.state = index;
    }
  } else {
    let state = toCamelCase(info.states[index]);
    let els = document.getElementsByClassName(state + "Highlight");
    for (let el of els) {
      el.classList.add("highlightIllu");
      activeState.value.state = index;
    }
    if (indexBefore === undefined) return;
    let lastState = toCamelCase(info.states[indexBefore]);
    let lastEls = document.getElementsByClassName(lastState + "Highlight");
    for (let lastEl of lastEls) {
      lastEl.classList.remove("highlightIllu");
    }
  }
};

const setBlockState = (index) => {
  let newState = !activeState.value[index];
  activeState.value.splice(index, 1, newState);
  let stateName = info.states[index].replaceAll(" ", "").toLowerCase();
  let els = document.querySelectorAll("." + stateName + "Highlight");
  for (let el of els) {
    if (newState) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  }
};

onMounted(async () => {
  if (info.switch) return;
  if (info.illuImage || info.flip) return; // No Lottie needed for images/flips

  // Skip animations entirely for users with reduced-motion preference
  if (prefersReducedMotion) return;

  let svgContainer = document.getElementById(props.scopeId || props.animation.id);
  if (!svgContainer) return;

  lottie = await loadLottie();

  animationLottie = lottie.loadAnimation({
    rendererSettings: {
      progressiveLoad: true,
    },
    id: props.scopeId || props.animation.id,
    speed: info.speed || 1,
    wrapper: svgContainer,
    animType: "svg",
    loop: false,
    autoplay: props.animation.autoplay ? true : false,
    path: `/publicAssets/animations/${props.animation.id}.json`,
  });
  animationLottie.addEventListener("DOMLoaded", () => {
    const highligters = document.getElementsByClassName("highlighterIllu");
    for (let highlighter of highligters) {
      highlighter.addEventListener("mouseover", (event) => addH(event));
      highlighter.addEventListener("mouseleave", (event) => removeH(event));
    }
  });
  animationLottie.setSubframe(true);

  if (props.animation.set) {
    console.log(props.animation.set, info.states);
    let state = toCamelCase(info.states[2]);
    let wait = setInterval(() => {
      let els = document.getElementsByClassName(state + "Highlight");
      if (els.length === 0) return;
      clearInterval(wait);
      for (let el of els) {
        el.classList.add("highlightIllu");
        activeState.value.state = props.animation.set;
      }
      console.log(state + "Highlight");
    }, 10);
  }

  if (info.loop) {
    animationLottie.addEventListener("complete", () => {
      animationLottie.playSegments(
        info.loopSection || [0, animationLottie.totalFrames],
        true
      );
    });
  }
  if (!info.hasTransition) {
    if (!info.states) {
      animationLottie.play();
    } else {
      animationLottie.goToAndStop(24, true);
    }
  } else {
    setTimeout(() => {
      animationLottie.setSpeed(info.speed || 1);
      animationLottie.play();
    }, 300);
  }
});

// Release the Lottie instance on teardown. Matters most for inline/mobile
// rendering, where many figures mount and unmount as the column scrolls;
// without this each leaves a retained AnimationItem (and a live rAF for loops).
onUnmounted(() => {
  animationLottie?.destroy?.();
});
</script>

<style scoped>
.blockState {
  border: black solid 1px;
}
</style>

<style>
.highlighterIlluDisplay {
  opacity: 0;
}
.highlighterIlluDisplay.active {
  opacity: 1;
}

.highlighterIlluDisplay.highlightIllu {
  opacity: 1;
  display: block;
}
</style>
