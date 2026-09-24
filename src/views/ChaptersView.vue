<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
// One cover rule everywhere: the chapter's cover_image_url, else the
// code-side default the reader's opener uses (OPENBRAIN-67).
import { coverForModule } from "@/helper/chapterCover";
import { useAuth } from "@/composables/useAuth";
import { useAuthStore } from "@/stores/auth";
import { authedRequest } from "@/services/api/client";
import { ROLE_UNAVAILABLE_QUERY } from "@/router/guards";

const route = useRoute();
const authStore = useAuthStore();
const { user, session, isAuthenticated, isCreator } = useAuth();

// The auth guard lands here with ?auth=role-unavailable when a role-gated
// route had to fail closed (profile lookup errored or returned nothing).
const roleUnavailable = computed(
  () => route.query.auth === ROLE_UNAVAILABLE_QUERY
);
const { fetchCatalog, modules, loading } = useChapterCatalog();

// Creators also see drafts (OPENBRAIN-51). The public catalog stays
// published-only; drafts come from an authenticated read, which RLS allows
// only for creators, and are marked so the card can say so.
const creatorDrafts = ref([]);
watch(
  isCreator,
  async (creator) => {
    if (!creator) {
      creatorDrafts.value = [];
      return;
    }
    try {
      creatorDrafts.value = await authedRequest(
        "modules?status=eq.draft&select=*&order=order_index.asc"
      );
    } catch (err) {
      console.warn("ChaptersView: draft fetch failed", err);
      creatorDrafts.value = [];
    }
  },
  { immediate: true }
);
const libraryModules = computed(() =>
  [
    ...modules.value,
    ...creatorDrafts.value.map((d) => ({ ...d, isDraft: true })),
  ].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
);

// Progress rows keyed by module_id for the current user
const progressByModule = ref({});
const progressLoaded = ref(false);

// Reading stats (highlights / notes counts fetched separately; chapters,
// sessions and total time derived from the progress rows we already load).
const highlightCount = ref(0);
const noteCount = ref(0);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// PostgREST exact-count helper: a HEAD request with count=exact returns the
// total in the Content-Range header without fetching the rows.
async function countRows(table) {
  if (!user.value || !session.value?.access_token) return 0;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/${table}?user_id=eq.${user.value.id}&select=id`,
      {
        method: "HEAD",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${session.value.access_token}`,
          Prefer: "count=exact",
        },
      }
    );
    const range = res.headers.get("content-range"); // e.g. "0-24/47" or "*/0"
    const total = range?.split("/")?.[1];
    return total ? parseInt(total, 10) : 0;
  } catch {
    return 0;
  }
}

async function loadProgress() {
  if (!user.value || !session.value?.access_token) {
    progressLoaded.value = true;
    return;
  }
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/reading_progress?user_id=eq.${user.value.id}&select=module_id,scroll_position,is_completed,last_accessed_at,time_spent_seconds`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${session.value.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      progressLoaded.value = true;
      return;
    }
    const rows = await res.json();
    const map = {};
    for (const row of rows) map[row.module_id] = row;
    progressByModule.value = map;
  } catch (err) {
    console.warn("ChaptersView: progress fetch failed", err);
  } finally {
    progressLoaded.value = true;
  }
}

onMounted(async () => {
  await fetchCatalog();
  await loadProgress();
  // Stat counts (only meaningful when signed in)
  if (isAuthenticated.value) {
    [highlightCount.value, noteCount.value] = await Promise.all([
      countRows("highlights"),
      countRows("notes"),
    ]);
  }
});

function progressFor(moduleId) {
  return progressByModule.value[moduleId];
}

function percentFor(moduleId) {
  const p = progressFor(moduleId);
  if (!p) return 0;
  return Math.round(p.scroll_position || 0);
}

function pillFor(moduleId) {
  const p = progressFor(moduleId);
  if (!p) return null;
  if (p.is_completed) return "done";
  if ((p.scroll_position || 0) > 0) return "reading";
  return null;
}

// "Continue reading" = most recently accessed incomplete chapter
const continueCard = computed(() => {
  if (!isAuthenticated.value || !progressLoaded.value) return null;
  const rows = Object.values(progressByModule.value).filter(
    (r) => !r.is_completed && (r.scroll_position || 0) > 0
  );
  if (rows.length === 0) return null;
  rows.sort((a, b) =>
    (b.last_accessed_at || "").localeCompare(a.last_accessed_at || "")
  );
  const top = rows[0];
  const mod = modules.value.find((m) => m.id === top.module_id);
  if (!mod) return null;
  const percent = Math.round(top.scroll_position || 0);
  // Rough time-remaining estimate: time-so-far × (1/p - 1), bounded
  let remaining = null;
  if (top.time_spent_seconds && percent > 5) {
    const totalSec = top.time_spent_seconds / (percent / 100);
    remaining = Math.max(
      1,
      Math.round((totalSec - top.time_spent_seconds) / 60)
    );
  }
  return {
    module: mod,
    percent,
    remainingMin: remaining,
  };
});

// Reading stats row — all derived from real data (counts fetched above;
// chapters / sessions / time from the reading_progress rows we already loaded).
const stats = computed(() => {
  const rows = Object.values(progressByModule.value);
  const completed = rows.filter((r) => r.is_completed).length;
  const totalSec = rows.reduce(
    (sum, r) => sum + (r.time_spent_seconds || 0),
    0
  );
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.round((totalSec % 3600) / 60);
  const timeLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  return [
    { label: "Chapters", value: `${completed}/${modules.value.length}` },
    { label: "Highlights", value: String(highlightCount.value) },
    { label: "Notes", value: String(noteCount.value) },
    // "Sessions" = distinct chapters opened (one reading_progress row each)
    { label: "Sessions", value: String(rows.length) },
    { label: "Total time", value: timeLabel },
  ];
});

// order_index is 1-based in DB and matches /chapter/:n URL numbering directly.
// The numeric route is the chapter OVERVIEW; the slug route is the READER.
function chapterRoute(mod) {
  return `/chapter/${mod.order_index}`;
}

function readerRoute(mod) {
  return `/chapter/${mod.order_index}/${mod.slug}`;
}

function chapterNumberFor(mod) {
  return mod.order_index;
}
</script>

<template>
  <main class="chapters">
    <!-- Hero: book title (left) + featured continue card (right), per
         prototype IndexScreen. Grid 1fr / 1.4fr. -->
    <header class="hero">
      <div class="hero-text">
        <p class="eyebrow">
          Book · {{ modules.length }} chapters<template
            v-if="creatorDrafts.length"
          >
            · {{ creatorDrafts.length }}
            {{ creatorDrafts.length === 1 ? "draft" : "drafts" }} (only creators
            see drafts)</template
          >
        </p>
        <h1>Chapters</h1>
        <p class="lede">
          An openly-published, interactive textbook — pick up where you left
          off.
        </p>
        <p v-if="isCreator" class="signin-cta">
          <router-link to="/dashboard?section=chapters"
            >Creator console →</router-link
          >
        </p>
        <p v-if="!isAuthenticated" class="signin-cta">
          <button type="button" @click="authStore.openAuth()">Sign in</button>
          to track your progress.
        </p>
        <p v-if="roleUnavailable" class="auth-notice" role="status">
          We couldn't confirm your account role, so that page stayed closed.
          Reload to try again.
        </p>
      </div>

      <div v-if="continueCard" class="continue-card">
        <div class="continue-cover">
          <img
            :src="coverForModule(continueCard.module)"
            :alt="continueCard.module.title"
          />
        </div>
        <div class="continue-meta">
          <span class="continue-label">● Continue reading</span>
          <span class="continue-chapter">
            Chapter {{ chapterNumberFor(continueCard.module) }}
          </span>
          <h2 class="continue-title">{{ continueCard.module.title }}</h2>
          <div class="progress-bar progress-bar--dark">
            <div
              class="progress-bar-fill progress-bar-fill--teal"
              :style="{ width: `${continueCard.percent}%` }"
            />
          </div>
          <span class="continue-stat">
            {{ continueCard.percent }}%<template
              v-if="continueCard.remainingMin"
            >
              · ~{{ continueCard.remainingMin }} min left</template
            >
          </span>
        </div>
        <router-link
          :to="readerRoute(continueCard.module)"
          class="resume-btn"
          aria-label="Resume reading"
        >
          Resume →
        </router-link>
      </div>
    </header>

    <!-- Reading stats (signed-in only — anonymous users have no data) -->
    <div v-if="isAuthenticated && progressLoaded" class="stats">
      <div v-for="s in stats" :key="s.label" class="stat">
        <span class="stat-label">{{ s.label }}</span>
        <span class="stat-value">{{ s.value }}</span>
      </div>
    </div>

    <hr class="rule" />
    <p class="eyebrow section-label">All chapters</p>

    <div v-if="loading" class="loading">Loading chapters…</div>

    <ul v-else class="grid">
      <li v-for="mod in libraryModules" :key="mod.id">
        <div class="card" :class="{ 'card--draft': mod.isDraft }">
          <!-- A draft has no public overview page, so it links to the reader. -->
          <router-link
            :to="mod.isDraft ? readerRoute(mod) : chapterRoute(mod)"
            class="cover"
            :aria-label="`${mod.title} — ${mod.isDraft ? 'draft' : 'overview'}`"
          >
            <img :src="coverForModule(mod)" :alt="mod.title" />
            <span v-if="mod.isDraft" class="pill pill-draft">Draft</span>
            <span
              v-else-if="isAuthenticated && pillFor(mod.id) === 'done'"
              class="pill pill-done"
            >
              ✓ Done
            </span>
            <span
              v-else-if="isAuthenticated && pillFor(mod.id) === 'reading'"
              class="pill pill-reading"
            >
              Reading
            </span>
          </router-link>
          <div class="meta">
            <span class="chapter-label">
              Chapter {{ chapterNumberFor(mod) }}
            </span>
            <h3 class="title">
              <router-link
                :to="mod.isDraft ? readerRoute(mod) : chapterRoute(mod)"
                class="title-link"
              >
                {{ mod.title }}
              </router-link>
            </h3>
            <p v-if="mod.subtitle" class="subtitle">{{ mod.subtitle }}</p>
            <div
              v-if="isAuthenticated && pillFor(mod.id) === 'reading'"
              class="progress-bar progress-bar--thin"
            >
              <div
                class="progress-bar-fill"
                :style="{ width: `${percentFor(mod.id)}%` }"
              />
            </div>
            <div class="card-actions">
              <router-link :to="readerRoute(mod)" class="card-action">
                Read →
              </router-link>
              <router-link
                v-if="!mod.isDraft"
                :to="chapterRoute(mod)"
                class="card-action card-action--muted"
              >
                Overview →
              </router-link>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <!-- Signed-in users land here (the guard skips the home page and its
         footer), so the team's Storybook link lives here too. Plain anchor:
         Storybook is a static build served beside the app. -->
    <p class="library-foot">
      <a href="/storybook/index.html" target="_blank" rel="noopener"
        >Storybook</a
      >
      <span aria-hidden="true">·</span>
      <router-link to="/styleguide">Styleguide</router-link>
    </p>
  </main>
</template>

<style scoped>
.library-foot {
  display: flex;
  gap: 0.5rem;
  margin: 3rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}
.library-foot a {
  color: inherit;
}
.library-foot a:hover,
.library-foot a:focus-visible {
  color: rgb(var(--color-accent));
}

/* Chapter index — matches prototype IndexScreen (New Design Ideas/components/
   prototype.jsx). Editorial grid: serif titles, mono metadata, hairline rules,
   sharp 4px/0 radii, magenta progress. --ob-* tokens map to live --color-*. */
.chapters {
  max-width: 82.5rem;
  margin: 0 auto;
  padding: 2rem 3.5rem 3.75rem;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

/* Shared mono eyebrow */
.eyebrow {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  margin: 0;
}

.rule {
  border: 0;
  border-top: 1px solid rgb(var(--color-ink));
  margin: 0;
}

.section-label {
  margin: 1.5rem 0 1rem;
}

/* Hero: 1fr / 1.4fr (book title | featured card) */
.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.875rem;
  margin: 0 0 2.25rem;
}

@media (min-width: 900px) {
  .hero {
    grid-template-columns: 1fr 1.4fr;
    gap: 3.5rem;
    align-items: center;
  }
}

.hero-text .eyebrow {
  margin-bottom: 1.125rem;
}

.hero-text h1 {
  font-size: 4rem;
  line-height: 0.96;
  letter-spacing: -0.02em;
  padding: 0;
  margin: 0;
}

.lede {
  margin-top: 1.125rem;
  max-width: 22.5rem;
  font-size: 1.125rem;
  line-height: 1.45;
  color: rgb(var(--color-mute));
}

.signin-cta {
  margin-top: 1rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}

.signin-cta button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}
.signin-cta a,
.signin-cta button {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}

/* One-line notice for the guard's fail-closed landing (see router/guards.js) */
.auth-notice {
  margin-top: 1rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-warn));
}

/* Featured "continue reading" card — dark band (prototype IndexScreen A) */
.continue-card {
  display: grid;
  grid-template-columns: 8.75rem 1fr auto;
  gap: 1.5rem;
  align-items: center;
  padding: 1.5rem;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border-radius: 6px;
}

.continue-cover {
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: rgb(var(--color-bg));
}

.continue-cover img,
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.continue-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.continue-label {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-accent));
  margin-bottom: 0.5rem;
}

/* On the dark band, chapter + stat lines read as dimmed paper */
.continue-chapter,
.continue-stat {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-paper) / 0.7);
}

.chapter-label,
.subtitle {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-mute));
}

.continue-chapter {
  margin-bottom: 0.25rem;
}

.continue-title {
  font-size: 1.75rem;
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0 0 0.75rem;
  padding: 0;
}

.continue-stat {
  margin-top: 0.375rem;
}

/* Progress bars: square, magenta, thin */
.progress-bar {
  width: 100%;
  height: 3px;
  background: rgb(var(--color-ink) / 0.08);
  overflow: hidden;
}

.progress-bar--thin {
  height: 2px;
  margin-top: 0.5rem;
}

.progress-bar-fill {
  height: 100%;
  background: rgb(var(--color-accent));
  transition: width 0.3s ease;
}

/* Dark-band variants (continue card) */
.progress-bar--dark {
  background: rgb(var(--color-paper) / 0.18);
}
.progress-bar-fill--teal {
  background: rgb(var(--color-complete));
}

/* Resume button (continue card) */
.resume-btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  padding: 0.5625rem 1.125rem;
  border-radius: 999px;
  background: rgb(var(--color-complete));
  color: #0a3d33;
  text-decoration: none;
  transition: opacity 0.12s ease;
}
.resume-btn:hover {
  opacity: 0.88;
}

/* Stats row — hairline top + bottom, evenly spaced */
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  margin: 2rem 0 0;
  padding: 1.125rem 0;
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.stat-label {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
}
.stat-value {
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.loading {
  text-align: center;
  color: rgb(var(--color-mute));
  padding: 2.5rem;
}

/* All-chapters grid: 4 across, gap 28px, borderless cards */
.grid {
  list-style: none;
  padding: 0 0 3rem;
  margin: 0;
  display: grid;
  gap: 1.75rem;
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1300px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
}

.cover {
  position: relative;
  aspect-ratio: 3 / 4;
  background: rgb(var(--color-bg));
  overflow: hidden;
  margin-bottom: 0.75rem;
  transition: opacity 0.15s ease;
}

.card:hover .cover {
  opacity: 0.92;
}

.meta {
  display: flex;
  flex-direction: column;
}

.chapter-label {
  margin-bottom: 0.125rem;
}

.title {
  font-size: 1.0625rem;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.005em;
  margin: 0 0 0.25rem;
  padding: 0;
}

.subtitle {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.625rem;
  margin: 0;
}

.title-link {
  color: inherit;
  text-decoration: none;
}
.title-link:hover {
  text-decoration: underline;
  text-decoration-color: rgb(var(--color-accent));
}

/* Two-link action row: Read (→ reader) · Overview (→ overview page) */
.card-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid rgb(var(--color-line));
}
.card-action {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-decoration: none;
  color: rgb(var(--color-accent));
  transition: opacity 0.12s ease;
}
.card-action:hover {
  text-decoration: underline;
}
.card-action--muted {
  color: rgb(var(--color-mute));
}

/* Status pills sit on the cover, top-right */
.pill {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.pill-done {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.pill-draft {
  background: rgb(var(--color-warn));
  color: rgb(var(--color-ink));
}
.card--draft .cover {
  outline: 1px dashed rgb(var(--color-warn));
  outline-offset: -1px;
}
.pill-reading {
  background: rgb(var(--color-accent));
  color: #fff;
}
</style>
