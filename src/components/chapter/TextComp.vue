<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, provide } from "vue";
import { useRoute } from "vue-router";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { toSlug, addH, removeH } from "@/helper/general";

import { useText, useGeneral } from "@/stores";
import { useAuth } from "@/composables/useAuth";

import { pointAdderAnimation } from "@/helper/marking";
import Section from "./text/SectionComp.vue";
import Points from "@/components/UI/PointsComp.vue";
import HoverImg from "@/components/chapter/text/HoverImg.vue";
import FurtherReading from "./text/FurtherReading.vue";
import DownloadSection from "./text/DownloadSection.vue";
import EditableBlock from "./text/EditableBlock.vue";

import FootNotes from "./text/FootNotes.vue";

import Perlin from "@/helper/perlin.ts";
import QuizSection from "./text/QuizSection.vue";

// Seed value is optional, default is 0.
const seed = Math.random();
const noise = new Perlin(seed);

gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
const store = useGeneral();
const textStore = useText();

// Get auth state
const { isCreator, session } = useAuth();

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

// Save content to Supabase
const saveContent = async ({ paragraphId, content, type }) => {
  console.log("TextComp: saveContent called", { paragraphId, content, type });

  // Get current chapter slug
  const chapterSlug = route.params.slug;

  // For Chapter 1 (JSON-based), update localStorage
  if (chapterSlug === "the-retina") {
    console.log("TextComp: Saving to localStorage (Chapter 1)");
    // Update the store directly for Chapter 1
    updateLocalContent(paragraphId, content, type);
    return;
  }

  // For Supabase chapters, make API call
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const accessToken = session.value?.access_token;

    if (!accessToken) {
      console.error("TextComp: No access token for save");
      return;
    }

    if (type === "paragraph") {
      // Update paragraph content
      const response = await fetch(
        `${supabaseUrl}/rest/v1/paragraphs?id=eq.${paragraphId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            content: { text: content },
            content_text: content.replace(/<[^>]*>/g, ""), // Strip HTML for search
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save paragraph: ${response.status}`);
      }

      console.log("TextComp: Paragraph saved to Supabase");

      // Update local store
      updateLocalContent(paragraphId, content, type);

    } else if (type === "section-title") {
      // Update section title
      const response = await fetch(
        `${supabaseUrl}/rest/v1/sections?id=eq.${paragraphId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            title: content.replace(/<[^>]*>/g, ""), // Strip HTML for title
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save section title: ${response.status}`);
      }

      console.log("TextComp: Section title saved to Supabase");

      // Update local store
      updateLocalContent(paragraphId, content, type);

    } else if (type === "intro") {
      // Update intro paragraph
      // For intro, we need to find and update the correct paragraph
      updateLocalContent(paragraphId, content, type);
    }

  } catch (error) {
    console.error("TextComp: Save error:", error);
    throw error;
  }
};

// Update content in local store
const updateLocalContent = (paragraphId, content, type) => {
  if (!source.value) return;

  if (type === "paragraph" || type === "intro") {
    // Find and update paragraph in sections
    for (const section of source.value.sections || []) {
      for (const para of section.paragraphs || []) {
        if (para.id === paragraphId) {
          para.text = content;
          return;
        }
        // Check subsections
        if (para.subSection) {
          for (const subPara of para.subSection.paragraphs || []) {
            if (subPara.id === paragraphId) {
              subPara.text = content;
              return;
            }
          }
        }
      }
    }
    // Check intro
    for (const intro of source.value.intro || []) {
      for (const para of intro.paragraphs || []) {
        if (para.id === paragraphId) {
          para.text = content;
          return;
        }
      }
    }
  } else if (type === "section-title") {
    // Find and update section title
    for (const section of source.value.sections || []) {
      if (section.id === paragraphId) {
        section.title = content.replace(/<[^>]*>/g, "");
        return;
      }
    }
  }
};

// Provide save handler to child components
provide("saveContent", saveContent);
provide("isCreator", isCreator);

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
  ScrollTrigger.getById("scrollTriggerText")?.kill();
  ScrollTrigger.getById("scrollTriggerAll")?.kill();
});
</script>

<template>
  <div
    id="container"
    class="absolute top-start z-40 w-full xl:w-[50vw] pointer-events-none font-sans"
  >
    <!-- Creator mode indicator -->
    <div
      v-if="isCreator"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      Edit Mode - Click any text to edit
    </div>

    <HoverImg />
    <div class="marker-center" />
    <div id="scroller" class="pointer-events-none w-full">
      <main
        id="text"
        class="text pointer-events-auto w-full text-left pt-[calc(var(--reader-topbar-h)+2rem)] ml-text z-30 xl:border-l bg-white border-black tracking-wide duration-300 text-black"
      >
        <!-- intro -->
        <section
          v-for="section in source['intro']"
          :key="section.id"
          :id="section.id"
          class="overflow-y-visible prose-measure"
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

          <!-- Intro title - editable for creators -->
          <EditableBlock
            v-if="isCreator"
            :content="section.title"
            :paragraph-id="`intro-title-${section.id}`"
            :is-creator="isCreator"
            tag="h1"
            :class-name="store.imgActive ? 'opacity-0 z-40 text-black opacity-100 capitalize' : 'z-40 text-black opacity-100 capitalize'"
            @save="({ content }) => saveContent({ paragraphId: section.id, content, type: 'intro-title' })"
          />
          <h1
            v-else
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
            <template v-for="paragraph in section.paragraphs" :key="paragraph.id">
              <EditableBlock
                v-if="isCreator"
                :content="paragraph.text"
                :paragraph-id="paragraph.id"
                :is-creator="isCreator"
                tag="p"
                class-name="P"
                @save="({ paragraphId, content }) => saveContent({ paragraphId, content, type: 'intro' })"
              />
              <div
                v-else
                :id="paragraph.id"
                :data-paragraph-id="paragraph.id"
                class="P"
                v-html="paragraph.text"
              />
            </template>
          </span>
          <span
            v-else
            class="block noHighlight"
          >
            <template v-for="paragraph in section.paragraphs" :key="paragraph.id">
              <!-- If paragraph contains a heading, render it without wrapping in <p> -->
              <template v-if="isCreator">
                <EditableBlock
                  v-if="!paragraph.hasHeading"
                  :content="paragraph.text"
                  :paragraph-id="paragraph.id"
                  :is-creator="isCreator"
                  tag="p"
                  class-name="P text-black"
                  @save="({ paragraphId, content }) => saveContent({ paragraphId, content, type: 'intro' })"
                />
                <EditableBlock
                  v-else
                  :content="paragraph.text"
                  :paragraph-id="paragraph.id"
                  :is-creator="isCreator"
                  tag="div"
                  class-name=""
                  @save="({ paragraphId, content }) => saveContent({ paragraphId, content, type: 'intro' })"
                />
              </template>
              <template v-else>
                <div v-if="paragraph.hasHeading" :id="paragraph.id" :data-paragraph-id="paragraph.id" v-html="paragraph.text" />
                <div v-else :id="paragraph.id" :data-paragraph-id="paragraph.id" class="P text-black" v-html="paragraph.text" />
              </template>
            </template>
          </span>
        </section>

        <!-- text sections -->
        <div
          v-for="(section, index) in source['sections']"
          :id="toSlug(section.title)"
          :key="section.id || toSlug(section.title)"
          ref="triggers"
          class="trigger prose-measure"
        >
          <Section
            :section="section"
            :index="index"
            :is-creator="isCreator"
            @save="saveContent"
          />
        </div>

        <div class="-ml-20 w-text">
          <QuizSection />
          <!-- End-of-chapter callout slot — ChapterView fills this with
               EndOfChapterCallout. Inside TextComp so absolute positioning
               doesn't pull it to the top of the document. -->
          <slot name="end-of-chapter" />
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
  width: 100%;
  margin-left: 0;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}
@media (min-width: 768px) {
  .ml-text {
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
@media (min-width: 1300px) {
  .ml-text {
    /* Prose column width + right-pinned offset both derive from the shared
       --reader-prose-w token (brand.css) so the figure pane and prose can't
       drift. Track 3 D1: prose = 40vw, figure pane fills the remaining ~60vw. */
    width: var(--reader-prose-w);
    margin-left: calc(100vw - var(--reader-prose-w));
    margin-right: 0;
    max-width: unset;
    padding-left: 5rem;
    padding-right: 6rem;
  }
}
</style>
