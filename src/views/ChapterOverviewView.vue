<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { useChapter } from "@/composables/useChapter";
import { useAuth } from "@/composables/useAuth";

const route = useRoute();
const router = useRouter();
const { isAuthenticated, user, session } = useAuth();
const { fetchCatalog, modules, findByNumber } = useChapterCatalog();
const { fetchChapter, transformedData } = useChapter();

const chapterNumber = computed(() => Number(route.params.number));
const moduleSummary = computed(() => findByNumber(chapterNumber.value));

// Per-section progress for the current user (best-effort)
const progressRow = ref(null);
const notes = ref([]);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

async function loadProgressAndNotes() {
  if (!isAuthenticated.value || !moduleSummary.value || !session.value?.access_token) return;
  const mid = moduleSummary.value.id;
  try {
    const [progressRes, notesRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/reading_progress?user_id=eq.${user.value.id}&module_id=eq.${mid}&select=*`,
        { headers: authHeaders() }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/notes?user_id=eq.${user.value.id}&module_id=eq.${mid}&select=id,content,section_id,created_at&order=created_at.desc&limit=3`,
        { headers: authHeaders() }
      ),
    ]);
    if (progressRes.ok) {
      const rows = await progressRes.json();
      progressRow.value = rows[0] || null;
    }
    if (notesRes.ok) {
      notes.value = await notesRes.json();
    }
  } catch (err) {
    console.warn("ChapterOverviewView: load failed", err);
  }
}

function authHeaders() {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${session.value.access_token}`,
    "Content-Type": "application/json",
  };
}

async function loadChapter() {
  await fetchCatalog();
  if (!moduleSummary.value) return;
  await fetchChapter(moduleSummary.value.slug);
  await loadProgressAndNotes();
}

onMounted(loadChapter);
watch(() => route.params.number, loadChapter);

const sections = computed(() => transformedData.value?.sections || []);

const overallPercent = computed(() =>
  progressRow.value ? Math.round(progressRow.value.scroll_position || 0) : 0
);
const isComplete = computed(() => progressRow.value?.is_completed === true);

// Per-section figure count (paragraphs carrying an animation/illustration) and a
// reading-time estimate from word count (~200 wpm). Honest derivations from the
// chapter data — no fabricated demo numbers.
function sectionMeta(section) {
  const paras = section?.paragraphs || [];
  let figures = 0;
  let words = 0;
  const walk = (list) => {
    for (const p of list || []) {
      if (p.animation || p.animationFull || p.img) figures += 1;
      if (typeof p.text === "string") {
        words += p.text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      }
      if (p.subSection) walk(p.subSection);
      if (p.subSubSection) walk(p.subSubSection);
      if (p.paragraphs) walk(p.paragraphs);
    }
  };
  walk(paras);
  const mins = Math.max(1, Math.round(words / 200));
  return { figures, mins };
}

// All interactive/static figures across the chapter, for the "Figures" grid.
const chapterFigures = computed(() => {
  const out = [];
  const walk = (list) => {
    for (const p of list || []) {
      if (p.animation || p.animationFull) {
        out.push({
          id: p.animation?.id || p.animationId || `fig-${out.length}`,
          kind: p.animationFull ? "Interactive" : "Figure",
          title: p.title || p.animation?.name || `Figure ${out.length + 1}`,
        });
      }
      if (p.subSection) walk(p.subSection);
      if (p.subSubSection) walk(p.subSubSection);
      if (p.paragraphs) walk(p.paragraphs);
    }
  };
  for (const s of sections.value) walk(s.paragraphs);
  return out;
});

const primaryCta = computed(() => {
  if (!moduleSummary.value) return null;
  const baseRoute = `/chapter/${chapterNumber.value}/${moduleSummary.value.slug}`;
  if (!isAuthenticated.value) {
    return { label: "Read chapter →", route: baseRoute };
  }
  if (progressRow.value && overallPercent.value > 0) {
    return { label: "Continue reading →", route: baseRoute };
  }
  return { label: "Start reading →", route: baseRoute };
});

function sectionTitleById(id) {
  const s = sections.value.find((x) => x.id === id);
  return s?.title || "—";
}
</script>

<template>
  <main class="overview" v-if="moduleSummary">
    <aside class="rail">
      <div class="cover">
        <img
          v-if="moduleSummary.cover_image_url"
          :src="moduleSummary.cover_image_url"
          :alt="moduleSummary.title"
        />
        <div v-else class="cover-fallback" />
      </div>

      <span class="eyebrow chapter-label">Chapter {{ chapterNumber }}</span>
      <h1>{{ moduleSummary.title }}</h1>

      <div v-if="isAuthenticated" class="progress-block">
        <div class="progress-bar">
          <div
            class="progress-bar-fill"
            :style="{ width: `${overallPercent}%` }"
          />
        </div>
        <span class="progress-label">
          {{ isComplete ? "Complete" : `${overallPercent}% complete` }}
          · {{ sections.length }} sections
        </span>
      </div>

      <div class="ctas">
        <router-link
          v-if="primaryCta"
          :to="primaryCta.route"
          class="btn btn--solid"
        >
          {{ primaryCta.label }}
        </router-link>
        <div v-if="isAuthenticated" class="ctas-row">
          <router-link :to="`/quiz/${moduleSummary.id}`" class="btn">
            Take quiz
          </router-link>
          <router-link :to="`/flashcards/${moduleSummary.id}`" class="btn">
            Flashcards
          </router-link>
        </div>
      </div>

      <p v-if="!isAuthenticated" class="signin-hint">
        <router-link to="/">Sign in</router-link> to track progress and take notes.
      </p>
    </aside>

    <section class="content">
      <p class="eyebrow">Sections</p>
      <div class="sections-list">
        <router-link
          v-for="(s, i) in sections"
          :key="s.id || i"
          :to="`/chapter/${chapterNumber}/${moduleSummary.slug}#${s.slug || ''}`"
          class="section-row"
        >
          <span class="section-num">{{ i + 1 }}.</span>
          <span class="section-title">{{ s.title }}</span>
          <span class="section-meta">
            {{ sectionMeta(s).figures }} figs · {{ sectionMeta(s).mins }} min
          </span>
        </router-link>
      </div>

      <template v-if="chapterFigures.length">
        <hr class="rule" />
        <p class="eyebrow">Figures in this chapter</p>
        <div class="figures-grid">
          <router-link
            v-for="fig in chapterFigures"
            :key="fig.id"
            :to="`/chapter/${chapterNumber}/${moduleSummary.slug}`"
            class="figure-card"
          >
            <span class="figure-kind">{{ fig.kind }}</span>
            <span class="figure-title">{{ fig.title }}</span>
          </router-link>
        </div>
      </template>

      <template v-if="isAuthenticated && notes.length">
        <hr class="rule" />
        <p class="eyebrow">Recent notes</p>
        <ul class="notes-list">
          <li v-for="n in notes" :key="n.id">
            <p class="note-content">"{{ n.content }}"</p>
            <span class="note-section">— {{ sectionTitleById(n.section_id) }}</span>
          </li>
        </ul>
      </template>
    </section>
  </main>

  <main v-else class="overview-empty">
    <p>Chapter not found.</p>
    <router-link to="/chapters" class="cta cta-secondary">
      ← Back to chapters
    </router-link>
  </main>
</template>

<style scoped>
/* Chapter overview — matches prototype ChapterOverviewScreen (New Design Ideas/
   components/prototype.jsx). 320px rail + content; flat hairline section rows,
   ink/ghost buttons, figures grid, sharp radii. */
.overview {
  max-width: 132rem;
  margin: 0 auto;
  padding: 3.2rem 5.6rem 6rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 4rem;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

@media (min-width: 900px) {
  .overview {
    grid-template-columns: 32rem 1fr;
    gap: 5.6rem;
  }
}

.overview-empty {
  max-width: 60rem;
  margin: 12rem auto;
  text-align: center;
  color: rgb(var(--color-mute));
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  margin: 0 0 1.8rem;
}

.rule {
  border: 0;
  border-top: 1px solid rgb(var(--color-ink));
  margin: 3.2rem 0 1.8rem;
}

.rail {
  display: flex;
  flex-direction: column;
}

.cover {
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: rgb(var(--color-bg));
  margin-bottom: 1.8rem;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgb(var(--color-accent) / 0.18),
    rgb(var(--color-complete) / 0.18)
  );
}

.chapter-label {
  margin-bottom: 0.4rem;
}

.rail h1 {
  font-size: 3.2rem;
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0 0 1.6rem;
  padding: 0;
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* Rail progress bar is teal (complete-family), per prototype */
.progress-bar {
  width: 100%;
  height: 3px;
  background: rgb(var(--color-ink) / 0.08);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: rgb(var(--color-complete));
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 1rem;
  color: rgb(var(--color-mute));
  font-family: var(--font-mono);
}

.ctas {
  margin-top: 2.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.ctas-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

/* Bracketed/pill buttons — restrained, mono uppercase, hairline border */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.8rem 1.4rem;
  border-radius: 9999px;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-decoration: none;
  color: rgb(var(--color-ink));
  background: transparent;
  border: 1px solid rgb(var(--color-ink) / 0.85);
  transition: background 0.12s ease, color 0.12s ease;
}

.btn:hover {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.btn--solid {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  padding: 1.2rem;
}

.btn--solid:hover {
  background: rgb(var(--color-ink) / 0.85);
}

.signin-hint {
  margin-top: 1.6rem;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
}

.signin-hint a {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}

/* Flat section rows separated by hairlines — no card chrome */
.sections-list {
  display: flex;
  flex-direction: column;
}

.section-row {
  display: grid;
  grid-template-columns: 4rem 1fr auto;
  align-items: baseline;
  gap: 1.8rem;
  padding: 1.8rem 0;
  border-top: 1px solid rgb(var(--color-line));
  text-decoration: none;
  color: inherit;
  transition: padding-left 0.12s ease;
}

.section-row:last-child {
  border-bottom: 1px solid rgb(var(--color-line));
}

.section-row:hover {
  padding-left: 0.6rem;
}

.section-num {
  font-family: var(--font-mono);
  color: rgb(var(--color-mute));
  font-size: 1.2rem;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 500;
  line-height: 1.25;
}

.section-meta {
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  white-space: nowrap;
}

/* Figures grid — 3 across, paper cards, radius 4 */
.figures-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.2rem;
}

@media (min-width: 1100px) {
  .figures-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.figure-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.2rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.12s ease;
}

.figure-card:hover {
  border-color: rgb(var(--color-ink));
}

.figure-kind {
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
}

.figure-title {
  font-size: 1.4rem;
}

.notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.notes-list li {
  padding: 1.6rem 0;
  border-top: 1px solid rgb(var(--color-line));
}

.note-content {
  font-size: 1.5rem;
  font-style: italic;
  margin: 0 0 0.4rem;
}

.note-section {
  font-size: 1rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
}
</style>
