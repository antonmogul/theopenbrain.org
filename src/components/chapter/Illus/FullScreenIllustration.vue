<script setup>
import { onBeforeUnmount, onMounted, ref, nextTick } from "vue";
import { loadLottie } from "@/composables/useLottie";
let lottie;

import { toSlug } from "@/helper/general";
import gsap from "gsap";

import FullScreenIllustrationMultiple from "@/components/chapter/Illus/FullScreenIllustrationMultiple.vue";

import { useAnimations } from "@/composables/useAnimations";
import { resolveAnimationRecord } from "@/helper/animationResolve";
// Chapter-1 / offline fallback — see the DECISION note in animationResolve.js.
import animationsJSON from "@/assets/json_backend/animations.json";
import FullScreenIllustrationLoop from "./FullScreenIllustrationLoop.vue";
import FullScreenIllustrationSplit from "./FullScreenIllustrationSplit.vue";
import SourceElement from "../../UI/SourceElement.vue";
import TextOverlay from "./TextOverlay.vue";
import FullBleed from "@/components/chapter/FullBleed.vue";
import FigureWidget from "@/widgets/figures/FigureWidget.vue";
import { figureWidgetFor } from "@/widgets/figures/registry";

const props = defineProps({
  paragraph: Object,
});

// Figures rebuilt as widgets (OPENBRAIN-80) draw themselves; this component
// only places them.
const asWidget = !!figureWidgetFor(props.paragraph?.animationId);
// A widget the reader scrubs through (the split) asks for a scroll length;
// this measures the reader's way through it and passes it on as progress.
const scrollLength = figureWidgetFor(props.paragraph?.animationId)?.schema
  .scrollLength;
const widgetScroll = ref(null);
const widgetProgress = ref(0);
function measureWidget() {
  const el = widgetScroll.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const range = r.height - window.innerHeight;
  widgetProgress.value =
    range > 0 ? Math.min(Math.max(-r.top / range, 0), 1) : 0;
}

const animation = ref(null);
const totalFrames = ref(null);
const containerScroll = ref();

// Resolved async in onMounted: Supabase record first, animations.json second
// (Chapter 1). The template guards on it, so nothing renders — and a warning
// fires — when neither source knows the id.
const { animations: dbAnimations, fetchAnimations } = useAnimations();
const thisAnimation = ref(null);

const activeState = ref({
  state: 0,
  toggle: false,
});

onMounted(async () => {
  // Cheap when already cached by IllustrationsComp; on failure the resolver
  // just sees an empty DB list and falls back to the JSON.
  await fetchAnimations();
  thisAnimation.value = resolveAnimationRecord(
    props.paragraph.animationId,
    dbAnimations.value,
    animationsJSON.animations
  );
  if (!thisAnimation.value) return;

  // The multiple-figure state keys only exist once the record is resolved.
  if (thisAnimation.value.multiple && thisAnimation.value.states) {
    activeState.value.state = Object.keys(thisAnimation.value.states)[0];
  }

  if (asWidget && scrollLength) {
    await nextTick();
    // Measured from where the figure is now on every scroll, so text and
    // images loading above it can't leave the measurement stale.
    window.addEventListener("scroll", measureWidget, { passive: true });
    window.addEventListener("resize", measureWidget);
    measureWidget();
  }
  if (props.paragraph.scroll || asWidget) return;
  // The container div is inside the v-if="thisAnimation" template guard, so it
  // doesn't exist until the DOM catches up with the resolution above.
  await nextTick();
  lottie = await loadLottie();
  const id = props.paragraph.animationId;
  var svgContainer = document.getElementById("container" + id);
  if (!svgContainer) return;
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

onBeforeUnmount(() => {
  window.removeEventListener("scroll", measureWidget);
  window.removeEventListener("resize", measureWidget);
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
  <!-- Full width at desktop sizes (OPENBRAIN-72): FullBleed lifts it out of
       the prose column, which clips anything wider than itself. In the
       column (below xl, or without the stage layer) it keeps the old span. -->
  <!-- Below xl a widget fills the prose column (which clips anything
       wider); either way it pins below the reader's top bar. -->
  <FullBleed v-if="thisAnimation && asWidget">
    <div
      ref="widgetScroll"
      class="mb-32 w-full"
      :style="{ height: scrollLength || '150vh' }"
    >
      <div
        class="sticky w-full top-[var(--reader-topbar-h,0px)] h-[calc(100vh-var(--reader-topbar-h,0px))]"
      >
        <FigureWidget
          :record="thisAnimation"
          :progress="scrollLength ? widgetProgress : null"
        />
      </div>
    </div>
  </FullBleed>
  <FullBleed v-else-if="thisAnimation" v-slot="{ floating }">
    <div
      ref="containerScroll"
      class="border-y bg-light text-black border-black my-[0] text-small font-mono duration-300"
      :class="[
        floating ? 'w-full' : 'w-screen -translate-x-custom -ml-20',
        !thisAnimation.split ? 'h-[150vh]' : 'h-[700vh]',
        thisAnimation.title === 'Pathway for the pupillary light reflex'
          ? '-mb-9'
          : 'mb-32',
      ]"
    >
      <!-- Pinned below the reader's top bar when full width, so its first
           row isn't hidden under it. -->
      <div
        class="sticky w-full px-24 py-10"
        :class="
          floating
            ? 'top-[var(--reader-topbar-h)] h-[calc(100vh-var(--reader-topbar-h))]'
            : 'h-screen top-0'
        "
      >
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
            :class="
              infoIsOpen && thisAnimation.infoText && 'opacity-10 blur-sm'
            "
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
                  (activeState.toggle === false &&
                    activeState.state === index) ||
                  (activeState.state === index && index === 0)
                    ? 'bg-chapter text-black pointer-events-none'
                    : activeState.state === index
                      ? 'border-chapter text-black hover:text-chapter-deep  '
                      : ' text-dark hover:text-chapter-deep hover:border-chapter',
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
                    ? 'bg-chapter text-black pointer-events-none'
                    : activeState.state === index
                      ? 'border-chapter text-black  hover:text-chapter-deep '
                      : 'bg-lighter text-dark hover:text-chapter-deep hover:border-chapter',
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
            :class="
              infoIsOpen && thisAnimation.infoText && 'opacity-10 blur-sm'
            "
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
  </FullBleed>
</template>
