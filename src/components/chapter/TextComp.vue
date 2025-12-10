<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { toSlug, addH, removeH } from "@/helper/general";

import { useText, useGeneral } from "@/stores";

import { marker, pointAdderAnimation } from "@/helper/marking";
import Section from "./text/SectionComp.vue";
import Points from "@/components/UI/PointsComp.vue";
import HoverImg from "@/components/chapter/text/HoverImg.vue";
import FurtherReading from "./text/FurtherReading.vue";
import DownloadSection from "./text/DownloadSection.vue";

import FootNotes from "./text/FootNotes.vue";

// import noise from "@/helper/noise";

import Perlin from "@/helper/perlin.ts";
import QuizSection from "./text/QuizSection.vue";

// Seed value is optional, default is 0.
const seed = Math.random();
const noise = new Perlin(seed);

// Call the noise functions to get the noise value for that coordinates.
// noise.simplex2(x, y);
// noise.simplex3(x, y, z);

// noise.perlin2(x, y);
// noise.perlin3(x, y, z);

gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
const store = useGeneral();

const textStore = useText();

const triggers = ref(null);

// Check if this is Chapter 1 (for conditional rendering of Chapter 1-specific elements)
const isChapter1 = computed(() => route.params.number === '1');

// Use computed property for reactivity - this will update when store changes
const source = computed(() => {
  return textStore.text;
});

// Watch for store changes for debugging
watch(() => textStore.text, (newText) => {
  console.log('TextComp: Store text changed:', newText?.intro?.[0]?.title);
  console.log('TextComp: Number of sections:', newText?.sections?.length || 0);
  if (newText?.sections) {
    console.log('TextComp: Section titles:', newText.sections.map(s => s.title));
  }
}, { deep: true });

watch(source, (newSource) => {
  console.log('TextComp: Source computed changed:', newSource?.intro?.[0]?.title);
  console.log('TextComp: Number of sections in source:', newSource?.sections?.length || 0);
}, { deep: true });
const posAugeX = ref(0);
const posAugeY = ref(0);
let intervalRandom;
onMounted(() => {
  let wait = setInterval(() => {
    const _text = document.getElementById("text");
    const container = document.getElementById("container");
    if (_text) {
      clearInterval(wait);
      pointAdderAnimation();
      marker(source, container);
      const illuHighlights = document.getElementsByClassName("animationMarker");

      for (const highlight of illuHighlights) {
        highlight.addEventListener("mouseover", (event) => addH(event));
        highlight.addEventListener("mouseleave", (event) => removeH(event));
      }

      setTimeout(() => {
        for (let trigger of document.querySelectorAll(".trigger")) {
          ScrollTrigger.create({
            id: "scrollTriggerText",
            trigger: trigger,
            start: "top top",
            end: "bottom top",
            srub: 0,
            markers: false,
            onToggle: (self) => {
              if (
                self.trigger.id == "the-eye-and-retina-1" &&
                !self.isActive &&
                self.direction === -1
              ) {
                store.currentSubChapter = null;
              }
              if (!self.isActive) return;
              store.currentSubChapter = self.trigger.id;
            },
            onUpdate: (self) => {
              store.progress = self.progress;
            },
          });
        }
        ScrollTrigger.create({
          id: "scrollTriggerAll",
          trigger: "#scroller",
          start: "-=" + (window.innerHeight / 3) * 2 + " +=0",
          end: "bottom top",
          srub: 0,
          markers: false,
          onToggle: (self) => {},
          onUpdate: (self) => {
            store.activeMenu = false;
            store.superScriptActive = false;
          },
        });
      }, 10);
    }
  }, 1);
  let timer = 0;
  intervalRandom = setInterval(() => {
    timer = timer + 15;
    let speedX = 0.00006;
    let speedY = 0.00005;
    let x = noise.simplex2(timer * speedX, timer * speedX);
    let y = noise.simplex2(timer * speedY, timer * speedY);
    posAugeX.value = x * 20;
    posAugeY.value = y * 15;
  }, 15);
});
onBeforeUnmount(() => {
  clearInterval(intervalRandom);
  ScrollTrigger.getById("scrollTriggerText").kill();
  ScrollTrigger.getById("scrollTriggerAll").kill();
});
</script>

<template>
  <div
    id="container"
    class="absolute top-start z-40 w-[50vw] pointer-events-none font-sans"
  >
    <!-- :class="store.startIsActive ? 'fixed' : 'absolute'" -->
    <HoverImg />
    <div class="marker-center" />
    <div id="scroller" class="pointer-events-none w-full">
      <main
        id="text"
        class="text pointer-events-auto w-full text-left pt-[20vh] ml-text max-w-text z-30 border-l bg-white border-black tracking-wide pl-20 pr-24 duration-300 text-black"
      >
        <!-- intro -->
        <section
          v-for="section in source['intro']"
          :key="section.id"
          :id="section.id"
          class="overflow-y-visible max-w-[780px]"
        >
          <div
            class="TN shadow-md border border-black bg-white rounded-full absolute -translate-x-[8.6rem] -translate-y-[0.9rem] w-28 h-28 flex items-center justify-center"
          >
            <div
              :style="
                'transform: translate(' +
                posAugeX +
                'px, ' +
                posAugeY / 2 +
                'px);' +
                'height: ' +
                (2.5 - Math.abs(posAugeX.toFixed(2)) / 20) +
                'rem; width: ' +
                (2.5 - Math.abs(posAugeX.toFixed(2)) / 20) +
                'rem;'
              "
              class="bg-black h-14 w-14 rounded-full translate-x-2"
            />
          </div>
          <h1
            :id="isChapter1 ? 'the-eye-and-retina-intro' : section.id"
            :class="store.imgActive ? 'opacity-0' : ''"
            class="z-40 text-black opacity-100 capitalize"
          >
            {{ section.title }}
          </h1>
          <!-- Author information - only show for Chapter 1 -->
          <span v-if="isChapter1" class="font-mono text-small">
            <p class="font-semibold">Arjun Krishnaswamy</p>
            <p class="pb-5">
              Department of Physiology, McGill University, Montreal, Canada
            </p>
            <p class="font-semibold">Stuart Trenholm</p>
            <p>
              Montreal Neurological Institute, McGill University, Montreal,
              Canada
            </p>
          </span>
          <br v-if="isChapter1" />
          <!-- Intro paragraphs -->
          <span
            v-if="isChapter1"
            id="triggerAnimationDragon"
            class="animationTrigger block noHighlight"
          >
            <p
              v-for="paragraph in section.paragraphs"
              :id="paragraph.id"
              :key="paragraph.id"
              class="P"
              v-html="paragraph.text"
            />
          </span>
          <span
            v-else
            class="block noHighlight"
          >
            <template v-for="paragraph in section.paragraphs" :key="paragraph.id">
              <!-- If paragraph contains a heading, render it without wrapping in <p> -->
              <div v-if="paragraph.hasHeading" :id="paragraph.id" v-html="paragraph.text" />
              <p v-else :id="paragraph.id" class="P text-black" v-html="paragraph.text" />
            </template>
          </span>
        </section>
        <!-- text -->
        <div
          v-for="(section, index) in source['sections']"
          :id="toSlug(section.title)"
          :key="section.id || toSlug(section.title)"
          ref="triggers"
          class="trigger max-w-[780px]"
        >
          <Section :section="section" :index="index" />
        </div>
        <div class="-ml-20 w-text">
          <QuizSection />
          <DownloadSection />
          <FurtherReading :content="source['furtherReading']" />
          <FootNotes :content="source['footNotes']" />
        </div>
      </main>
      <Points />
    </div>
  </div>
</template>

<style scoped>
.top-start {
  top: calc(100vh);
}

.ml-text {
  width: min(50vw, calc(780px + 11rem));
  margin-left: calc(100vw - min(50vw, calc(780px + 11rem)));
}
</style>
