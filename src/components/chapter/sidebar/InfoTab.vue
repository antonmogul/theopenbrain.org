<script setup>
import { computed, inject, ref } from "vue";
import { useRoute } from "vue-router";
import { useGeneral, useText } from "@/stores";
import { useReadingProgress } from "@/composables/useReadingProgress";
import { toSlug } from "@/helper/general.js";

const route = useRoute();
const store = useGeneral();
const textStore = useText();

const chapterNumber = computed(() => route.params.number);
const chapterTitle = computed(() => textStore.text?.intro?.[0]?.title || "");

// Injected data from ChapterView
const highlightsCtx = inject("highlights", null);
const notesCtx = inject("notes", null);
const refsCtx = inject("references", null);

// Collapsible section state
const tocOpen = ref(true);
const refsOpen = ref(true);

// Reading progress from composable (already initialized by ChapterView)
const { timeSpent } = useReadingProgress();

// Progress percentage from GSAP ScrollTrigger (0-1 float in store)
const progressPercent = computed(() => Math.round(store.progress * 100));

// Format time spent as "X min" or "X hr Y min"
const formattedTime = computed(() => {
  const seconds = timeSpent.value || 0;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return `${hours} hr ${remainingMin} min`;
});

// Sections from current chapter text data
const sections = computed(() => {
  return (textStore.text?.sections || []).map((s) => ({
    title: s.title,
    slug: toSlug(s.title),
  }));
});

// Chapter stats
const sectionCount = computed(() => sections.value.length);

const wordCount = computed(() => {
  const text = textStore.text;
  if (!text) return 0;
  let words = 0;
  // Count words in intro
  const intro = text.intro?.[0];
  if (intro?.paragraphs) {
    for (const p of intro.paragraphs) {
      if (p.text) words += p.text.split(/\s+/).filter(Boolean).length;
    }
  }
  // Count words in sections
  for (const section of text.sections || []) {
    for (const p of section.paragraphs || []) {
      if (p.text) words += p.text.split(/\s+/).filter(Boolean).length;
    }
    for (const sub of section.subSection || []) {
      for (const p of sub.paragraphs || []) {
        if (p.text) words += p.text.split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return words;
});

const formattedWordCount = computed(() => {
  const w = wordCount.value;
  if (w >= 1000) return (w / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(w);
});

const highlightCount = computed(() => highlightsCtx?.highlights?.value?.length || 0);
const noteCount = computed(() => notesCtx?.notes?.value?.length || 0);
const referencesList = computed(() => refsCtx?.references?.value || []);
const referenceCount = computed(() => referencesList.value.length);

// Hardcoded sessions count (would track via reading_progress in future)
const sessionCount = 1;

function isSectionActive(slug) {
  return slug === store.currentSubChapter;
}

function scrollToSection(slug) {
  const el = document.querySelector("#" + slug);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToCitation(number) {
  const el = document.querySelector(`.citation-ref[data-ref="${number}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Flash the citation so it's easy to spot
  el.classList.add("citation-flash");
  setTimeout(() => el.classList.remove("citation-flash"), 1500);
}
</script>

<template>
  <div class="info-tab">
    <!-- Chapter header -->
    <div class="chapter-header">
      <span class="chapter-label">Chapter {{ chapterNumber }}</span>
      <h2 class="chapter-title">{{ chapterTitle }}</h2>
    </div>

    <!-- Reading progress -->
    <div class="reading-stats">
      <div class="stat">
        <div class="stat-bar-track">
          <div
            class="stat-bar-fill"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
        <span class="stat-text">{{ progressPercent }}% read</span>
      </div>
      <div class="stat">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stat-icon">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span class="stat-text">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- Chapter stats grid -->
    <div class="stats-grid">
      <div class="stats-card">
        <span class="stats-value">{{ formattedWordCount }}</span>
        <span class="stats-label">Words</span>
      </div>
      <div class="stats-card">
        <span class="stats-value">{{ sectionCount }}</span>
        <span class="stats-label">Sections</span>
      </div>
      <div class="stats-card">
        <span class="stats-value">{{ highlightCount }}</span>
        <span class="stats-label">Highlights</span>
      </div>
      <div class="stats-card">
        <span class="stats-value">{{ noteCount }}</span>
        <span class="stats-label">Notes</span>
      </div>
      <div class="stats-card">
        <span class="stats-value">{{ sessionCount }}</span>
        <span class="stats-label">Sessions</span>
      </div>
    </div>

    <!-- Table of Contents (collapsible) -->
    <div class="toc">
      <button class="collapsible-heading" @click="tocOpen = !tocOpen">
        <span class="chevron" :class="{ open: tocOpen }">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span class="collapsible-label">Contents</span>
        <span class="collapsible-count">({{ sectionCount }})</span>
      </button>
      <div v-if="tocOpen" class="toc-list">
        <button
          v-for="(section, idx) in sections"
          :key="section.slug"
          class="toc-item"
          :class="{ active: isSectionActive(section.slug) }"
          @click="scrollToSection(section.slug)"
        >
          <span class="toc-number">{{ idx + 1 }}</span>
          <span class="toc-title">{{ section.title }}</span>
        </button>
      </div>
    </div>

    <!-- References (collapsible) -->
    <div v-if="referenceCount > 0" class="toc refs-section">
      <button class="collapsible-heading" @click="refsOpen = !refsOpen">
        <span class="chevron" :class="{ open: refsOpen }">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span class="collapsible-label">References</span>
        <span class="collapsible-count">({{ referenceCount }})</span>
      </button>
      <div v-if="refsOpen" class="refs-list">
        <button
          v-for="r in referencesList"
          :key="r.number"
          class="ref-item"
          @click="scrollToCitation(r.number)"
        >
          <span class="ref-number">{{ r.number }}.</span>
          <div class="ref-body">
            <span class="ref-text">
              {{ r.authors }} ({{ r.year || 'n.d.' }}). {{ r.title }}<template v-if="r.journal">. <em>{{ r.journal }}</em></template><template v-if="r.volume">, {{ r.volume }}</template><template v-if="r.pages">, {{ r.pages }}</template>.
            </span>
            <a
              v-if="r.doi"
              :href="`https://doi.org/${r.doi}`"
              target="_blank"
              rel="noopener noreferrer"
              class="ref-doi"
              @click.stop
            >
              DOI
            </a>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-tab {
  padding: 24px;
}

.chapter-header {
  margin-bottom: 24px;
}

.chapter-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8b5cf6;
}

.chapter-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  margin: 4px 0 0 0;
  line-height: 1.3;
}

.reading-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  margin-bottom: 24px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-bar-track {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: #8b5cf6;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.stat-icon {
  color: #6b7280;
  flex-shrink: 0;
}

.stat-text {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.stats-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  background: #f9fafb;
  border-radius: 8px;
}

.stats-value {
  font-size: 20px;
  font-weight: 700;
  color: #374151;
  line-height: 1.2;
}

.stats-label {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.toc {
  border-top: 1px solid #f3f4f6;
  padding-top: 16px;
}

.collapsible-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 0 12px 0;
  width: 100%;
}

.collapsible-label {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.collapsible-count {
  font-size: 12px;
  color: #d1d5db;
  font-weight: 400;
}

.chevron {
  display: flex;
  align-items: center;
  color: #9ca3af;
  transition: transform 0.2s ease;
  transform: rotate(0deg);
}

.chevron.open {
  transform: rotate(90deg);
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toc-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  width: 100%;
}

.toc-item:hover {
  background: #f3f4f6;
}

.toc-item.active {
  background: #ede9fe;
}

.toc-item.active .toc-number {
  color: #7c3aed;
}

.toc-item.active .toc-title {
  color: #5b21b6;
  font-weight: 500;
}

.toc-number {
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
  width: 20px;
}

.toc-title {
  font-size: 15px;
  color: #374151;
  line-height: 1.4;
}

/* References section */
.refs-section {
  margin-top: 8px;
}

.refs-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ref-item {
  display: flex;
  gap: 8px;
  padding: 6px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s;
}

.ref-item:hover {
  background: #f3f4f6;
}

.ref-number {
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
  width: 24px;
  text-align: right;
}

.ref-body {
  flex: 1;
  min-width: 0;
}

.ref-text {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
}

.ref-doi {
  display: inline-block;
  font-size: 11px;
  color: #7c3aed;
  text-decoration: none;
  margin-left: 4px;
}

.ref-doi:hover {
  text-decoration: underline;
}
</style>
