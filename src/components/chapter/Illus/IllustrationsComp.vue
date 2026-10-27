<script setup>
import {
  onBeforeUnmount,
  onMounted,
  nextTick,
  ref,
  computed,
  watch,
} from "vue";

import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import { useGeneral } from "@/stores";
import { useAnimations } from "@/composables/useAnimations";
import { clog, cgroup, announce } from "@/helper/chapterDebug";

// Legacy JSON fallback for Chapter 1 during transition
import animationJSON from "@/assets/json_backend/animations.json";

import Illustration from "@/components/chapter/Illus/IllustrationComp.vue";
import IllustrationOnScroll from "@/components/chapter/Illus/IllustrationOnScroll.vue";
import TransitionWidgetSequence from "./TransitionWidgetSequence.vue";
import { FIGURE_TRANSITIONS } from "@/helper/figureTransitions";
import IllustrationTransition from "@/components/chapter/Illus/IllustrationTransition.vue";
import IllustrationPlaceholder from "@/components/chapter/Illus/IllustrationPlaceholder.vue";
import IllustrationWidget from "./IllustrationWidget.vue";
import { usesFigureShell } from "@/helper/figureCycle";
import FigureWidget from "@/widgets/figures/FigureWidget.vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_WIDE_QUERY } from "@/helper/readerLayout";
import { figureWidgetFor } from "@/widgets/figures/registry";
import { figureEnd, figureRecordFor } from "@/helper/historyFigureTiming";
import { figurePaneGround } from "@/helper/figurePane";

// Panel figures rebuilt as figure widgets (full-screen ones render in the
// text through FullScreenIllustration).
const isPanelWidget = (a) => !a.fullscreen && !!figureWidgetFor(a.id);
// The panel is hidden below xl but stays mounted; there the figure draws
// inline in the text (IllustrationInline), so don't run it twice.
const panelShows = useMediaQuery(READER_WIDE_QUERY);
gsap.registerPlugin(ScrollTrigger);

const activeAnimation = ref(null);
const paneElement = ref(null);
// The pane's ground (OPENBRAIN-152): the chapter's dark surface, unless a
// figure this chapter triggers was drawn for the paper page (the 2023 Lottie
// line art; helper/figurePane.js). Dark until the triggers are read, which
// the opener covers.
const ground = ref("dark");
const store = useGeneral();
const progress = ref(0);
const transitionProgress = ref({});
const visitedSequences = ref(new Set());
const sequences = computed(() =>
  Object.entries(FIGURE_TRANSITIONS).flatMap(([next, before]) => {
    const successor = animationList.value.find((a) => a.id === next);
    const transition = animationList.value.find((a) => a.id === before);
    return successor && transition ? [{ successor, transition }] : [];
  })
);
const inSequence = (id) =>
  sequences.value.some((s) => s.successor.id === id || s.transition.id === id);
const sequenceActive = (s) =>
  [s.successor.id.toLowerCase(), s.transition.id.toLowerCase()].includes(
    activeAnimation.value
  );
watch(activeAnimation, () => {
  for (const s of sequences.value)
    if (sequenceActive(s)) visitedSequences.value.add(s.successor.id);
});

// Use Supabase animations composable
const { animations: dbAnimations, fetchAnimations } = useAnimations();

// Determine which animation source to use:
// - Try Supabase first (dbAnimations)
// - Fall back to legacy JSON if Supabase fetch fails or returns empty
const animationList = computed(() => {
  if (dbAnimations.value && dbAnimations.value.length > 0) {
    // [4 MOUNT] which source is driving the figures + one-line inventory
    cgroup(
      "MOUNT",
      `source = SUPABASE (${dbAnimations.value.length} figures)`,
      () => {
        clog("MOUNT", "renderer each figure will mount when active", {
          list: dbAnimations.value.map((a) => ({
            id: a.id,
            renderer: isPanelWidget(a)
              ? "FigureWidget"
              : usesFigureShell(a)
                ? "Placeholder"
                : a.fullscreen
                  ? "FullScreen"
                  : a.switch
                    ? "Switch"
                    : a.scroll
                      ? "OnScroll"
                      : a.isTransition
                        ? "Transition"
                        : "Inline",
            states: a.states?.length || 0,
          })),
        });
      }
    );
    return dbAnimations.value.filter((a) => !isBlankFigure(a));
  }
  clog("MOUNT", "source = STATIC JSON fallback (Supabase empty/failed)");
  return animationJSON.animations.filter((a) => !isBlankFigure(a));
});

/*
 * The 2023 seed's "Placeholder" Lottie (animationPlaceholder, an empty
 * animation titled "Placeholder") is what the Retina's closing sections
 * trigger to clear the pane; as a listed figure it drew a tile that said
 * "Placeholder" beside the references (OPENBRAIN-148). Left out of the
 * list, its trigger matches nothing and the pane simply empties.
 */
function isBlankFigure(a) {
  return /^animationPlaceholder$/i.test(a?.id || "");
}

// [4 MOUNT] when a figure becomes active, log which renderer branch the template
// takes for it — the placeholder/fullscreen/switch/scroll/inline decision.
watch(activeAnimation, (id) => {
  if (!id) return;
  const a = animationList.value.find((x) => x.id.toLowerCase() === id);
  if (!a) {
    clog(
      "MOUNT",
      `active="${id}" but NO matching figure in list (key mismatch?)`
    );
    return;
  }
  const renderer = isPanelWidget(a)
    ? "FigureWidget"
    : usesFigureShell(a)
      ? "IllustrationPlaceholder"
      : a.fullscreen
        ? "FullScreenIllustration"
        : a.switch
          ? "IllustrationSwitch"
          : a.scroll
            ? "IllustrationOnScroll"
            : a.isTransition
              ? "IllustrationTransition"
              : "Illustration (inline)";
  clog("MOUNT", `mount → ${renderer}`, {
    figure: a.id,
    states: a.states?.length || 0,
    statesHighlight: a.statesHighlight?.length || 0,
    switches: a.switches?.length || 0,
  });
});

const ownedTriggers = [];
const activeTriggers = new Set();
let setupTimer = null;
let refreshTimer = null;
let layoutObserver = null;
let fontSet = null;
let unmounted = false;

function updateActiveFigure() {
  // A nested/overlapping trigger leaving must not clear the one still active.
  // The last authored active trigger wins, in either scroll direction.
  const current = [...ownedTriggers]
    .reverse()
    .find((trigger) => activeTriggers.has(trigger.trigger));
  // The figure's own id, so a key the editor made (`image-…`, `widget-…`,
  // whose trigger reads `triggerAnimationimage-…`) matches its record too.
  const key = current?.trigger.id.replace(/^trigger/i, "");
  activeAnimation.value = current
    ? (figureRecordFor(key, animationList.value)?.id ?? key).toLowerCase()
    : null;
  store.animationActive = !!activeAnimation.value;
}

function refreshAfterLayout() {
  if (unmounted || refreshTimer !== null) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    if (!unmounted) ScrollTrigger.refresh();
  }, 0);
}

// The figure triggers in this reader's prose. During route transitions two
// chapter roots can coexist: bind only to this reader, never the departing
// chapter's duplicate ids. A breakout draws its own artwork inline;
// registering it in the pinned pane too leaked that artwork as the
// full-width box left the screen.
function readerTriggers() {
  const reader = paneElement.value?.closest(".chapter-reader") || document;
  return [...reader.querySelectorAll(".animationTrigger[id]")]
    .filter((trigger) => /^trigger/i.test(trigger.id))
    .filter((trigger) => !trigger.closest("[data-breakout-box]"));
}

// One ground for the whole chapter, from the figures its prose triggers.
function measureGround() {
  if (unmounted) return;
  ground.value = figurePaneGround(
    readerTriggers().map((trigger) =>
      figureRecordFor(trigger.id.replace(/^trigger/i, ""), animationList.value)
    )
  );
}

function setupTriggers() {
  if (unmounted) return;
  const reader = paneElement.value?.closest(".chapter-reader") || document;
  const animationTriggers = readerTriggers();
  measureGround();
  clog("SCROLL", `wiring ${animationTriggers.length} reader figure triggers`);
  for (const trigger of animationTriggers) {
    const scrollTrigger = ScrollTrigger.create({
      id: "scrollTriggerAnimation",
      trigger,
      start: () => `top ${window.innerHeight / 2}`,
      // Its paragraph's window, or longer for a figure that holds (still
      // images, an author's "Stays"; OPENBRAIN-131). A function, so every
      // refresh re-measures it.
      end: () => {
        // The title between an entrance and its successor is part of the
        // handoff: retain the finished drawing until that figure takes over.
        const pair = sequences.value.find(
          (s) =>
            s.transition.id.toLowerCase() ===
            trigger.id.replace(/^trigger/i, "").toLowerCase()
        );
        const next =
          pair &&
          animationTriggers.find(
            (candidate) =>
              candidate !== trigger &&
              figureRecordFor(
                candidate.id.replace(/^trigger/i, ""),
                animationList.value
              )?.id === pair.successor.id
          );
        return next
          ? next.getBoundingClientRect().top +
              window.scrollY -
              window.innerHeight / 2
          : figureEnd(trigger, animationTriggers, animationList.value);
      },
      markers: false,
      onToggle: (self) => {
        trigger.classList.toggle("active", self.isActive);
        if (self.isActive) activeTriggers.add(trigger);
        else activeTriggers.delete(trigger);
        updateActiveFigure();
      },
    });
    ownedTriggers.push(scrollTrigger);
    // GSAP may activate a trigger during create, before it is in our list.
    if (scrollTrigger.isActive) activeTriggers.add(trigger);
  }
  updateActiveFigure();

  for (const trigger of reader.querySelectorAll(".animationScrollAnchor")) {
    if (trigger.closest("[data-breakout-box]")) continue;
    ownedTriggers.push(
      ScrollTrigger.create({
        id: "scrollTriggerAnimation",
        trigger,
        start: () => `top ${window.innerHeight / 2}`,
        end: () => `bottom ${window.innerHeight / 2}`,
        scrub: 1,
        markers: false,
        onUpdate: (self) => {
          progress.value = self.progress;
          transitionProgress.value[
            trigger.id.replace(/^trigger/i, "").toLowerCase()
          ] = self.progress;
        },
      })
    );
  }

  const triggerFull = reader.querySelector("#container");
  const bgGradient = reader.querySelector("#bgGradient");
  if (triggerFull)
    ownedTriggers.push(
      ScrollTrigger.create({
        id: "scrollTriggerFull",
        trigger: triggerFull,
        start: () => `top ${window.innerHeight / 2}`,
        end: () => `bottom ${window.innerHeight / 2}`,
        scrub: 2,
        markers: false,
        onUpdate: (self) => {
          if (!bgGradient) return;
          const shade = Math.floor(255 - self.progress * 70);
          bgGradient.style.backgroundColor = `rgba(${shade},${shade},${shade},0.7)`;
        },
      })
    );
  // Text wrapping and late font subsets can move prose after initial setup.
  // Keep ScrollTrigger's cached positions aligned with the actual reader.
  const content = reader.querySelector("#container");
  if (content && typeof ResizeObserver === "function") {
    let previousSize = null;
    layoutObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (previousSize?.width === width && previousSize?.height === height)
        return;
      previousSize = { width, height };
      refreshAfterLayout();
    });
    layoutObserver.observe(content);
  }
  fontSet = document.fonts;
  fontSet?.addEventListener?.("loadingdone", refreshAfterLayout);
  fontSet?.ready?.then(refreshAfterLayout);
}

onMounted(async () => {
  announce();
  try {
    await fetchAnimations();
  } catch (err) {
    console.warn("IllustrationsComp: using JSON fallback:", err);
  }
  await nextTick();
  if (unmounted) return;
  // The ground as soon as the records are in, so a reader landing
  // mid-chapter (?resume=1, #section) doesn't see it change at setup.
  measureGround();
  // Let initial artwork layout settle; own this timeout so interrupted
  // navigation cannot register a second set against the next chapter.
  setupTimer = setTimeout(setupTriggers, 500);
});

onBeforeUnmount(() => {
  unmounted = true;
  clearTimeout(setupTimer);
  clearTimeout(refreshTimer);
  layoutObserver?.disconnect();
  fontSet?.removeEventListener?.("loadingdone", refreshAfterLayout);
  for (const trigger of ownedTriggers.splice(0)) {
    trigger.trigger?.classList.remove("active");
    trigger.kill();
  }
  activeTriggers.clear();
  activeAnimation.value = null;
  store.animationActive = false;
});
</script>

<template>
  <!-- Between the top bar and the timeline docked at the bottom
       (--reader-timeline-h, OPENBRAIN-128), so a figure's foot isn't under it.
       Its ground is the chapter's dark surface, or paper for art drawn for
       it (OPENBRAIN-152); the children key their on-dark styles on
       .figure-pane--dark. -->
  <div
    v-if="!store.isScrolling"
    ref="paneElement"
    class="figure-pane hidden reader:block reader:fixed reader:left-0 reader:w-illus reader:z-30 pointer-events-none font-mono reader:top-[var(--reader-topbar-h)] reader:h-[calc(100vh-var(--reader-topbar-h)-var(--reader-timeline-h,0px))]"
    :class="`figure-pane--${ground}`"
    :data-ground="ground"
  >
    <template v-for="sequence in sequences" :key="sequence.successor.id">
      <TransitionWidgetSequence
        v-if="panelShows && visitedSequences.has(sequence.successor.id)"
        v-show="sequenceActive(sequence)"
        :transition="sequence.transition"
        :successor="sequence.successor"
        :active="activeAnimation"
        :progress="
          transitionProgress[sequence.transition.id.toLowerCase()] || 0
        "
      />
    </template>
    <template
      v-for="animation in animationList.filter((a) => !inSequence(a.id))"
      :key="animation.id"
    >
      <!-- Figure shell: image artwork, or the typed placeholder until it lands -->
      <template v-if="!isPanelWidget(animation) && usesFigureShell(animation)">
        <transition name="fade" mode="out-in">
          <IllustrationPlaceholder
            v-if="activeAnimation === animation.id.toLowerCase()"
            :animation="animation"
            class="w-full h-full"
          />
        </transition>
      </template>
      <!-- A figure rebuilt as a figure widget (OPENBRAIN-82) -->
      <template v-if="isPanelWidget(animation)">
        <transition name="fade" mode="out-in">
          <div
            v-if="panelShows && activeAnimation === animation.id.toLowerCase()"
            class="w-full h-full pointer-events-auto"
          >
            <FigureWidget
              :record="animation"
              :progress="
                figureWidgetFor(animation.id)?.schema.scrub ? progress : null
              "
            />
          </div>
        </transition>
      </template>
      <!-- An interactive widget as the figure (OPENBRAIN-70 B5) -->
      <template v-if="animation.widgetId && !isPanelWidget(animation)">
        <transition name="fade" mode="out-in">
          <IllustrationWidget
            v-if="activeAnimation === animation.id.toLowerCase()"
            :animation="animation"
            class="w-full h-full"
          />
        </transition>
      </template>
      <template
        v-if="
          !animation.widgetId &&
          !isPanelWidget(animation) &&
          !usesFigureShell(animation) &&
          !animation.fullscreen &&
          !animation.scroll &&
          !animation.isTransition
        "
      >
        <transition name="fade" mode="out-in">
          <Illustration
            v-if="activeAnimation === animation.id.toLowerCase()"
            :animation="animation"
            :active-animation="activeAnimation"
            class="max-w-[1000px] m-auto"
          />
        </transition>
      </template>
      <template
        v-if="
          !animation.fullscreen &&
          animation.scroll &&
          !animation.isTransition &&
          !isPanelWidget(animation)
        "
      >
        <transition name="fade" mode="out-in">
          <IllustrationOnScroll
            v-if="activeAnimation === animation.id.toLowerCase()"
            :animation="animation"
            :progress="progress"
            :active-animation="activeAnimation"
            class="max-w-[1000px] m-auto"
          />
        </transition>
      </template>
      <template
        v-if="
          !animation.fullscreen &&
          !animation.scroll &&
          animation.isTransition &&
          !isPanelWidget(animation)
        "
      >
        <transition name="fade" mode="out-in">
          <IllustrationTransition
            v-if="activeAnimation === animation.id.toLowerCase()"
            :animation="animation"
            :progress="transitionProgress[animation.id.toLowerCase()] || 0"
            :active-animation="activeAnimation"
            class="max-w-[1000px] m-auto"
          />
        </transition>
      </template>
    </template>
  </div>
</template>

<!-- The pane's ground (.figure-pane--paper / --dark and --figure-pane-ink)
     is styled in src/index.css with the other reader rules: it is the
     contract the children's on-dark rules and the stories key on, so a
     wrapper carrying the class must get it without this component loaded. -->
<style scoped></style>
