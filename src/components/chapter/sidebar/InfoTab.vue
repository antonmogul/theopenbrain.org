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
/* Info tab — matches prototype FloatingPanel info (tools.jsx): magenta eyebrow,
   serif title, teal progress, bordered 3×2 stats grid, mono collapsibles. */
.info-tab {
  padding: 18px;
  font-family: var(--font-body);
}

.chapter-header {
  margin-bottom: 16px;
}

.chapter-label {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-accent));
}

.chapter-title {
  font-family: var(--font-body);
  font-size: 2.2rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
  margin: 6px 0 0 0;
  line-height: 1.15;
}

.reading-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-bar-track {
  flex: 1;
  height: 4px;
  background: rgb(var(--color-ink) / 0.08);
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: rgb(var(--color-complete));
  transition: width 0.3s ease;
}

.stat-icon {
  color: rgb(var(--color-mute));
  flex-shrink: 0;
}

.stat-text {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  white-space: nowrap;
}

/* Stats grid — bordered with internal hairlines, serif values */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid rgb(var(--color-line));
  margin-bottom: 18px;
}

.stats-card {
  display: flex;
  flex-direction: column;
  padding: 12px 10px;
  border-right: 1px solid rgb(var(--color-line));
  border-top: 1px solid rgb(var(--color-line));
}

/* No top border on the first row, no right border on the last column */
.stats-card:nth-child(-n + 3) {
  border-top: none;
}

.stats-card:nth-child(3n) {
  border-right: none;
}

.stats-value {
  font-family: var(--font-body);
  font-size: 2rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
  line-height: 1;
}

.stats-label {
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  margin-top: 4px;
}

.toc {
  border-top: 1px solid rgb(var(--color-line));
  padding-top: 14px;
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
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-ink));
}

.collapsible-count {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
}

.chevron {
  display: flex;
  align-items: center;
  color: rgb(var(--color-mute));
  transition: transform 0.2s ease;
  transform: rotate(0deg);
}

.chevron.open {
  transform: rotate(90deg);
}

.toc-list {
  display: flex;
  flex-direction: column;
}

.toc-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: padding-left 0.12s ease;
  width: 100%;
}

.toc-item:hover {
  padding-left: 4px;
}

.toc-item.active .toc-number {
  color: rgb(var(--color-accent));
}

.toc-item.active .toc-title {
  color: rgb(var(--color-ink));
  font-weight: 500;
}

.toc-number {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  flex-shrink: 0;
  width: 20px;
}

.toc-title {
  font-size: 1.4rem;
  color: rgb(var(--color-ink));
  line-height: 1.35;
}

/* References section */
.refs-section {
  margin-top: 14px;
}

.refs-list {
  display: flex;
  flex-direction: column;
}

.ref-item {
  display: flex;
  gap: 8px;
  padding: 10px 0;
  background: none;
  border: none;
  border-top: 1px solid rgb(var(--color-line));
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: padding-left 0.12s ease;
}

.ref-item:hover {
  padding-left: 4px;
}

.ref-number {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  flex-shrink: 0;
  width: 24px;
  text-align: right;
}

.ref-body {
  flex: 1;
  min-width: 0;
}

.ref-text {
  font-size: 1.2rem;
  color: rgb(var(--color-ink) / 0.75);
  line-height: 1.5;
}

.ref-doi {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-accent));
  text-decoration: none;
  margin-left: 4px;
}

.ref-doi:hover {
  text-decoration: underline;
}
</style>
