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
import IllustrationTransition from "@/components/chapter/Illus/IllustrationTransition.vue";
import IllustrationPlaceholder from "@/components/chapter/Illus/IllustrationPlaceholder.vue";
import IllustrationWidget from "./IllustrationWidget.vue";
import { usesFigureShell } from "@/helper/figureCycle";
import FigureWidget from "@/widgets/figures/FigureWidget.vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_WIDE_QUERY } from "@/helper/readerLayout";
import { figureWidgetFor } from "@/widgets/figures/registry";
import { figureEnd, figureRecordFor } from "@/helper/historyFigureTiming";

// Panel figures rebuilt as figure widgets (full-screen ones render in the
// text through FullScreenIllustration).
const isPanelWidget = (a) => !a.fullscreen && !!figureWidgetFor(a.id);
// The panel is hidden below xl but stays mounted; there the figure draws
// inline in the text (IllustrationInline), so don't run it twice.
const panelShows = useMediaQuery(READER_WIDE_QUERY);
gsap.registerPlugin(ScrollTrigger);

const activeAnimation = ref(null);
const paneElement = ref(null);
const store = useGeneral();
const progress = ref(0);

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
    return dbAnimations.value;
  }
  clog("MOUNT", "source = STATIC JSON fallback (Supabase empty/failed)");
  return animationJSON.animations;
});

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

function setupTriggers() {
  if (unmounted) return;
  // During route transitions two chapter roots can coexist. Bind only to
  // this reader, never the departing chapter's duplicate ids.
  const reader = paneElement.value?.closest(".chapter-reader") || document;
  const animationTriggers = [
    ...reader.querySelectorAll(".animationTrigger[id]"),
  ]
    .filter((trigger) => /^trigger/i.test(trigger.id))
    // A breakout draws its own artwork inline. Registering it in the pinned
    // pane too leaked that artwork as the full-width box left the screen.
    .filter((trigger) => !trigger.closest("[data-breakout-box]"));
  clog("SCROLL", `wiring ${animationTriggers.length} reader figure triggers`);
  for (const trigger of animationTriggers) {
    const scrollTrigger = ScrollTrigger.create({
      id: "scrollTriggerAnimation",
      trigger,
      start: () => `top ${window.innerHeight / 2}`,
      // Its paragraph's window, or longer for a figure that holds (still
      // images, an author's "Stays"; OPENBRAIN-131). A function, so every
      // refresh re-measures it.
      end: () => figureEnd(trigger, animationTriggers, animationList.value),
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
       (--reader-timeline-h, OPENBRAIN-128), so a figure's foot isn't under it. -->
  <div
    v-if="!store.isScrolling"
    ref="paneElement"
    class="hidden reader:block reader:fixed reader:left-0 reader:w-illus reader:z-30 pointer-events-none font-mono reader:top-[var(--reader-topbar-h)] reader:h-[calc(100vh-var(--reader-topbar-h)-var(--reader-timeline-h,0px))] bg-bg"
  >
    <template v-for="animation in animationList" :key="animation.id">
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
            :progress="progress"
            :active-animation="activeAnimation"
            class="max-w-[1000px] m-auto"
          />
        </transition>
      </template>
    </template>
  </div>
</template>

<style scoped></style>
