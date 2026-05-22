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

const primaryCta = computed(() => {
  if (!moduleSummary.value) return null;
  const baseRoute = `/chapter/${chapterNumber.value}/${moduleSummary.value.slug}`;
  if (!isAuthenticated.value) {
    return { label: "Read chapter", route: baseRoute };
  }
  if (progressRow.value && overallPercent.value > 0) {
    return { label: "Continue reading", route: baseRoute };
  }
  return { label: "Start reading", route: baseRoute };
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

      <span class="chapter-label">Chapter {{ chapterNumber }}</span>
      <h1>{{ moduleSummary.title }}</h1>

      <div v-if="isAuthenticated" class="progress-block">
        <div class="progress-bar">
          <div
            class="progress-bar-fill"
            :style="{ width: `${overallPercent}%` }"
          />
        </div>
        <span class="progress-label">
          {{ isComplete ? "Complete" : `${overallPercent}% read` }}
        </span>
      </div>

      <div class="ctas">
        <router-link v-if="primaryCta" :to="primaryCta.route" class="cta cta-primary">
          {{ primaryCta.label }}
        </router-link>
        <router-link
          v-if="isAuthenticated"
          :to="`/quiz/${moduleSummary.id}`"
          class="cta cta-secondary"
        >
          Take quiz
        </router-link>
        <router-link
          v-if="isAuthenticated"
          :to="`/flashcards/${moduleSummary.id}`"
          class="cta cta-secondary"
        >
          Review flashcards
        </router-link>
      </div>

      <p v-if="!isAuthenticated" class="signin-hint">
        <router-link to="/">Sign in</router-link> to track progress and take notes.
      </p>
    </aside>

    <section class="content">
      <h2>Sections</h2>
      <ul class="sections-list">
        <li v-for="(s, i) in sections" :key="s.id || i">
          <router-link
            :to="`/chapter/${chapterNumber}/${moduleSummary.slug}#${s.slug || ''}`"
            class="section-row"
          >
            <span class="section-num">{{ i + 1 }}.</span>
            <span class="section-title">{{ s.title }}</span>
          </router-link>
        </li>
      </ul>

      <template v-if="isAuthenticated && notes.length">
        <h2>Recent notes</h2>
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
.overview {
  max-width: 140rem;
  margin: 0 auto;
  padding: 6rem 2.4rem 12rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 4rem;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

@media (min-width: 900px) {
  .overview {
    grid-template-columns: 32rem 1fr;
  }
}

.overview-empty {
  max-width: 60rem;
  margin: 12rem auto;
  text-align: center;
  color: rgb(var(--color-mute));
}

.rail {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.cover {
  aspect-ratio: 3 / 4;
  border-radius: 0.8rem;
  overflow: hidden;
  background: rgb(var(--color-bg));
  margin-bottom: 0.8rem;
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
    rgb(var(--color-accent) / 0.15),
    rgb(var(--color-complete) / 0.15)
  );
}

.chapter-label {
  font-size: 1.2rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
}

.rail h1 {
  font-size: 3.2rem;
  line-height: 1.15;
  margin: 0;
  padding: 0;
}

.progress-block {
  margin-top: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.progress-bar {
  width: 100%;
  height: 0.4rem;
  background: rgb(var(--color-line));
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: rgb(var(--color-accent));
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 1.2rem;
  color: rgb(var(--color-mute));
  font-family: var(--font-mono);
}

.ctas {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.6rem;
  border-radius: 0.8rem;
  font-size: 1.4rem;
  font-family: var(--font-ui);
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.cta-primary {
  background: rgb(var(--color-accent));
  color: rgb(var(--color-paper));
}

.cta-primary:hover {
  background: rgb(var(--color-accent) / 0.85);
}

.cta-secondary {
  background: transparent;
  color: rgb(var(--color-ink));
  border-color: rgb(var(--color-line));
}

.cta-secondary:hover {
  border-color: rgb(var(--color-accent));
  color: rgb(var(--color-accent));
}

.signin-hint {
  margin-top: 0.4rem;
  font-size: 1.2rem;
  color: rgb(var(--color-mute));
}

.signin-hint a {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}

.content h2 {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0 0 1.6rem;
  padding: 0;
}

.content h2:not(:first-child) {
  margin-top: 3.2rem;
}

.sections-list,
.notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.section-row {
  display: flex;
  gap: 1.2rem;
  padding: 1.4rem 1.6rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 0.8rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, transform 0.1s;
}

.section-row:hover {
  border-color: rgb(var(--color-accent));
  transform: translateX(2px);
}

.section-num {
  font-family: var(--font-mono);
  color: rgb(var(--color-mute));
  font-size: 1.3rem;
  flex-shrink: 0;
  width: 2.4rem;
}

.section-title {
  font-size: 1.5rem;
}

.notes-list li {
  padding: 1.4rem 1.6rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 0.8rem;
}

.note-content {
  font-size: 1.4rem;
  font-style: italic;
  margin: 0 0 0.4rem;
}

.note-section {
  font-size: 1.2rem;
  font-family: var(--font-mono);
  color: rgb(var(--color-mute));
}
</style>
