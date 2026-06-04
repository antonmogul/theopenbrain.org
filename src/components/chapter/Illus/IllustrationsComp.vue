<script setup>
import { onBeforeUnmount, onMounted, ref, computed } from "vue";
import { useRoute } from "vue-router";

import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import { useGeneral } from "@/stores";
import { useAnimations } from "@/composables/useAnimations";

// Legacy JSON fallback for Chapter 1 during transition
import animationJSON from "@/assets/json_backend/animations.json";

import Illustration from "@/components/chapter/Illus/IllustrationComp.vue";
import IllustrationOnScroll from "@/components/chapter/Illus/IllustrationOnScroll.vue";
import IllustrationTransition from "@/components/chapter/Illus/IllustrationTransition.vue";
import IllustrationPlaceholder from "@/components/chapter/Illus/IllustrationPlaceholder.vue";
gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
const activeAnimation = ref(null);
const store = useGeneral();
const progress = ref(0);

// Use Supabase animations composable
const { animations: dbAnimations, fetchAnimations } = useAnimations();

// Determine which animation source to use:
// - Try Supabase first (dbAnimations)
// - Fall back to legacy JSON if Supabase fetch fails or returns empty
const animationList = computed(() => {
  if (dbAnimations.value && dbAnimations.value.length > 0) {
    return dbAnimations.value;
  }
  return animationJSON.animations;
});

onMounted(async () => {
  // Attempt to load animations from Supabase
  try {
    await fetchAnimations();
  } catch (err) {
    console.warn("IllustrationsComp: Supabase fetch failed, using JSON fallback:", err);
  }

  let animationTriggers = document.getElementsByClassName("animationTrigger");
  for (let trigger of animationTriggers) {
    setTimeout(() => {
      ScrollTrigger.create({
        id: "scrollTriggerAnimation",
        trigger: trigger,
        start: "top " + window.innerHeight / 2,
        end: "bottom " + window.innerHeight / 2,
        srub: 0,
        markers: false,
        onToggle: (self) => {
          if (self.isActive) {
            trigger.classList.add("active");
            activeAnimation.value = self.trigger.id
              .replace("trigger", "")
              .toLowerCase();
            store.animationActive = true;
          } else {
            trigger.classList.remove("active");
            activeAnimation.value = null;
            store.animationActive = false;
          }
        },
        onUpdate: (self) => {},
      });
    }, 500);
  }
  let animationAnchors = document.getElementsByClassName(
    "animationScrollAnchor"
  );
  for (let trigger of animationAnchors) {
    ScrollTrigger.create({
      id: "scrollTriggerAnimation",
      trigger: trigger,
      start: "top " + window.innerHeight / 2,
      end: "bottom " + window.innerHeight / 2,
      scrub: 1,
      markers: false,
      onToggle: (self) => {},
      onUpdate: (self) => {
        progress.value = self.progress;
      },
    });
  }

  let triggerFull = document.getElementById("container");
  let bgGradient = document.getElementById("bgGradient");
  ScrollTrigger.create({
    id: "scrollTriggerFull",
    trigger: triggerFull,
    start: "top " + window.innerHeight / 2,
    end: "bottom " + window.innerHeight / 2,
    scrub: 2,
    markers: false,
    onToggle: () => {},
    onUpdate: (self) => {
      let r = Math.floor(255 - self.progress * 70);
      let g = Math.floor(255 - self.progress * 70);
      let b = Math.floor(255 - self.progress * 70);
      if (!bgGradient) return;
      bgGradient.style.backgroundColor =
        "rgba(" + r + "," + g + "," + b + ", 0.7)";
    },
  });
});

onBeforeUnmount(() => {
  ScrollTrigger.getById("scrollTriggerAnimation")?.kill();
  ScrollTrigger.getById("scrollTriggerFull")?.kill();
});
</script>

<template>
  <div
    v-if="!store.isScrolling"
    class="hidden xl:block xl:fixed xl:left-0 xl:w-illus xl:z-30 pointer-events-none font-mono xl:top-[var(--reader-topbar-h)] xl:h-[calc(100vh-var(--reader-topbar-h))] bg-bg"
  >
    <template v-for="animation in animationList" :key="animation.id">
      <!-- Typed figure/box placeholder (no artwork yet) -->
      <template v-if="animation.placeholder">
        <transition name="fade" mode="out-in">
          <IllustrationPlaceholder
            v-if="activeAnimation === animation.id.toLowerCase()"
            :animation="animation"
            class="max-w-[1000px] m-auto h-full"
          />
        </transition>
      </template>
      <template
        v-if="
          !animation.placeholder &&
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
          !animation.fullscreen && animation.scroll && !animation.isTransition
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
          !animation.fullscreen && !animation.scroll && animation.isTransition
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
