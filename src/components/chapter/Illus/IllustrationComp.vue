<template>
  <!-- Inline (scopeId: in the text, below the two-column reader) the figure
       stacks: the art at the column's width, its states in a row under it.
       In the pane the states are a column pinned beside the art
       (OPENBRAIN-99). -->
  <div
    ref="root"
    class="pointer-events-auto"
    :class="
      inline
        ? 'relative flex flex-col gap-4'
        : 'pr-14 pl-32 flex flex-row justify-center items-center h-[100%]'
    "
  >
    <div
      class="flex flex-col"
      :class="[
        inline
          ? 'relative order-2 w-full'
          : 'px-24 pt-10 z-30 fixed w-illus justify-between top-0 reader:top-[var(--reader-topbar-h,0px)] left-0',
        animation.multiple ? 'items-center' : 'items-start',
      ]"
    >
      <!-- Below the reader's top bar, in the original's title style. Inline
           (scopeId, below xl) the figure's caption already names it. -->
      <span
        v-if="!scopeId && presentation.title"
        class="pb-0 font-sans font-bold text-[1.25rem] leading-[1.55]"
        >{{ presentation.title }}</span
      >
      <div
        v-if="animation.multiple"
        class="flex flex-col justify-center items-start"
        :class="
          inline
            ? 'relative w-full'
            : 'fixed top-0 left-0 w-illus h-screen px-24'
        "
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

      <div
        v-if="animation.switches || animation.states"
        :class="inline ? 'w-full' : ''"
      >
        <template v-if="!info.blockStates">
          <StateElement
            v-if="!info.blockSwitches"
            :states="!info.multiple ? info.states : Object.keys(info.states)"
            :activeState="activeState.state"
            :praefix="info.iconPraefix"
            :iconsIndex="info.icons"
            :inline="inline"
            @onClick="setState"
          />
          <StateElementBlock
            v-else
            :states="!info.multiple ? info.states : Object.keys(info.states)"
            :activeState="activeState.state"
            :praefix="info.iconPraefix"
            :iconsIndex="info.icons"
            :inline="inline"
            @onClick="setState"
          />
        </template>
        <div
          v-else
          :class="
            inline
              ? 'grid w-full grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2'
              : 'pt-20'
          "
        >
          <p
            v-for="(state, index) in !animation.multiple
              ? animation.states
              : Object.keys(animation.states)"
            :key="state"
            class="hover:text-chapter-deep hover:bg-white hover:border-chapter select-none text-small cursor-pointer pb-2 mb-4 border-black border p-4 flex flex-col justify-center items-center"
            :class="
              activeState[index] ? 'font-semibold bg-chapter text-black' : ''
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
    <div
      class="flex flex-row min-w-full"
      :class="[
        inline ? 'order-1' : '',
        { 'illustration-captioned': presentation.caption },
      ]"
    >
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
            v-if="!inline"
            class="px-24 pt-10 z-30 fixed flex flex-col w-illus justify-between top-0 left-0 text-baseMono"
          >
            {{ animation.title }}
          </span>
          <img
            class="max-w-full max-h-[80vh]"
            :class="animation.fullHeight ? 'p-32 ' : ''"
            :src="`/publicAssets/images/illuImages/${animation.id}.png`"
          />
          <SourceElement
            source="Stare at the cross for 30 seconds. Then immediately look at a white wall (or close your eyes) to see after-images. Notice that each color gets 'replaced' by its opponent color in the after-image."
          />
        </div>
        <div class="w-full h-[80vh]" v-else>
          <iframe
            class="w-full h-full"
            :src="`https://www.youtube.com/embed/${animation.youtubeID}`"
            title="YouTube video player"
            frameborder="0"
            allow="
              accelerometer;
              autoplay;
              clipboard-write;
              encrypted-media;
              gyroscope;
              picture-in-picture;
              web-share;
            "
            allowfullscreen
          ></iframe>
        </div>
      </template>
      <template v-else>
        <figure
          v-if="!animation.multiple && !animation.flip && !animation.switch"
          class="w-full"
          :class="{ 'illustration-figure': presentation.caption }"
          :aria-label="presentation.accessibleName"
        >
          <div
            :id="scopeId || animation.id"
            ref="art"
            :class="{ 'illustration-art': presentation.caption }"
          />
          <figcaption v-if="presentation.caption" class="illustration-caption">
            {{ presentation.caption }}
          </figcaption>
        </figure>
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
    <div
      class="absolute z-40"
      :class="inline ? 'top-0 right-0' : 'top-12 right-8'"
    >
      <button
        v-if="animation.loop"
        type="button"
        class="icon illustration-playback"
        :disabled="!ready"
        :aria-label="isPaused ? 'Play animation' : 'Pause animation'"
        @click="playPause()"
      >
        <PauseIcon v-if="!isPaused" aria-hidden="true" />
        <PlayIcon v-else aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { clog } from "@/helper/chapterDebug";
import IllustarionMultiple from "@/components/chapter/Illus/IllustarionMultiple.vue";
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";
import { toSlug, toCamelCase } from "@/helper/general";
import { loadLottie } from "@/composables/useLottie";

import { useReducedMotion } from "@/composables/useReducedMotion";
import animationJSON from "@/assets/json_backend/animations.json";
import { lottiePath, resolveAnimationConfig } from "@/helper/animationResolve";
import { figurePresentation } from "@/helper/figurePresentation";
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
// Rendered in the text rather than the pane (see the template's note).
const inline = computed(() => !!props.scopeId);
const presentation = computed(() => figurePresentation(props.animation));
let animationLottie;
const root = ref(null);
const art = ref(null);
const ready = ref(false);
const reducedMotion = useReducedMotion();
const isPaused = ref(reducedMotion.value);
let disposed = false;
let playTimer;
const highlightListeners = [];
const parts = (name) => root.value?.getElementsByClassName(name) || [];

// Use the animation prop directly (it now contains all config from DB or JSON).
// Fall back to JSON lookup for backward compatibility during transition —
// shared heuristic, see resolveAnimationConfig (warns when both sources miss).
const info = resolveAnimationConfig(props.animation, animationJSON.animations);

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
  if (!ready.value || !animationLottie) return;
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
  if (!ready.value && !props.animation.multiple) return;
  let index = event.index;
  let indexBefore = event.activeState;
  if (index === indexBefore) return;

  // [5 STATE] a state step was requested. `info.highlight` decides the branch:
  // highlight figures sync DOM highlight classes; non-highlight ones drive Lottie frames.
  clog("STATE", `setState "${props.animation?.id}" ${indexBefore} → ${index}`, {
    figure: props.animation?.id,
    from: indexBefore,
    to: index,
    mode: info.highlight ? "highlight-sync" : "lottie-frame",
    multiple: !!props.animation?.multiple,
  });

  if (!info.highlight) {
    if (!props.animation.multiple) {
      animationLottie.setSpeed(6);
      let totalFrames = animationLottie.animationData.op;
      const pos = (totalFrames / 6) * ((indexBefore ?? 0) + 1);
      const posAfter = (totalFrames / 6) * (index + 1);
      activeState.value.state = index;
      if (info.smooth && !reducedMotion.value) {
        animationLottie.playSegments([pos, posAfter], true);
      } else {
        animationLottie.goToAndStop(posAfter, true);
      }
    } else {
      activeState.value.state = index;
    }
  } else {
    let state = toCamelCase(info.states[index]);
    let els = parts(state + "Highlight");
    for (let el of els) {
      el.classList.add("highlightIllu");
      activeState.value.state = index;
    }
    if (indexBefore === undefined) return;
    let lastState = toCamelCase(info.states[indexBefore]);
    let lastEls = parts(lastState + "Highlight");
    for (let lastEl of lastEls) {
      lastEl.classList.remove("highlightIllu");
    }
  }
};

const setBlockState = (index) => {
  let newState = !activeState.value[index];
  activeState.value.splice(index, 1, newState);
  let stateName = info.states[index].replaceAll(" ", "").toLowerCase();
  let els = parts(stateName + "Highlight");
  for (let el of els) {
    if (newState) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  }
};

// A still must retain the original artwork. Frame 24 is the authored
// eye-structure resting state; loops use their authored loop entrance.
function park() {
  clearTimeout(playTimer);
  if (!ready.value) return;
  isPaused.value = true;
  animationLottie.goToAndStop(
    Math.min(
      animationLottie.totalFrames - 1,
      info.states ? 24 : info.loopSection?.[0] || 24
    ),
    true
  );
}
function begin() {
  if (!ready.value || disposed) return;
  if (reducedMotion.value) return park();
  if (info.states && !info.hasTransition) {
    animationLottie.goToAndStop(24, true);
  } else {
    isPaused.value = false;
    animationLottie.setSpeed(info.speed || 1);
    animationLottie.play();
  }
}
watch(reducedMotion, () => {
  clearTimeout(playTimer);
  if (reducedMotion.value) park();
  else begin();
});

onMounted(async () => {
  if (info.switch || info.illuImage || info.flip) return;
  const svgContainer = art.value;
  if (!svgContainer) return;
  const lottie = await loadLottie();
  if (disposed || !root.value) return;
  animationLottie = lottie.loadAnimation({
    rendererSettings: { progressiveLoad: true },
    container: svgContainer,
    renderer: "svg",
    loop: !!props.animation.autoLoop,
    autoplay: false,
    path: lottiePath(props.animation),
  });
  animationLottie.setSubframe(true);
  animationLottie.addEventListener("DOMLoaded", () => {
    if (disposed) return;
    ready.value = true;
    for (const element of parts("highlighterIllu")) {
      // Bind only this instance's SVG, and remove the same handlers on teardown.
      const name = [...element.classList].find((value) =>
        value.endsWith("Highlight")
      );
      const text = name
        ? document.getElementById(name.replace(/Highlight$/, ""))
        : null;
      const enter = () => {
        element.classList.add("highlightIllu");
        text?.classList.add("highlightText");
      };
      const leave = () => {
        const selected = info.states?.[activeState.value.state];
        if (!selected || name !== `${toCamelCase(selected)}Highlight`)
          element.classList.remove("highlightIllu");
        text?.classList.remove("highlightText");
      };
      element.addEventListener("mouseenter", enter);
      element.addEventListener("mouseleave", leave);
      highlightListeners.push(() => {
        element.removeEventListener("mouseenter", enter);
        element.removeEventListener("mouseleave", leave);
        text?.classList.remove("highlightText");
      });
    }
    if (
      Number.isInteger(props.animation.set) &&
      info.states?.[props.animation.set]
    ) {
      setState({ index: props.animation.set });
    }
    if (info.hasTransition && !reducedMotion.value) {
      playTimer = setTimeout(begin, 300);
    } else begin();
  });
  if (info.loop) {
    animationLottie.addEventListener("complete", () => {
      if (disposed || isPaused.value) return;
      animationLottie.playSegments(
        info.loopSection || [0, animationLottie.totalFrames],
        true
      );
    });
  }
});

onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(playTimer);
  highlightListeners.forEach((remove) => remove());
  animationLottie?.destroy?.();
});
</script>

<style scoped>
.illustration-playback {
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
}
.illustration-playback:disabled {
  opacity: 0.5;
  cursor: wait;
}
.illustration-captioned {
  height: 100%;
  min-height: 0;
}
.illustration-figure {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  gap: 1rem;
  padding-block: 4rem 2rem;
}
.illustration-art {
  min-height: 0;
  flex: 0 1 auto;
}
.illustration-art :deep(svg) {
  max-height: 100%;
}
.illustration-caption {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1.5;
}
@media (max-width: 1023px) {
  .illustration-figure {
    padding-block: 2rem 0;
  }
}
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
