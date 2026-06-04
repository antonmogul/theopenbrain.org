<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { useAuth } from "@/composables/useAuth";

const router = useRouter();
const { user, session, isAuthenticated } = useAuth();
const { fetchCatalog, modules, loading } = useChapterCatalog();

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
    remaining = Math.max(1, Math.round((totalSec - top.time_spent_seconds) / 60));
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
        <p class="eyebrow">Book · {{ modules.length }} chapters</p>
        <h1>Chapters</h1>
        <p class="lede">
          An openly-published, interactive textbook — pick up where you left off.
        </p>
        <p v-if="!isAuthenticated" class="signin-cta">
          <router-link to="/">Sign in</router-link> to track your progress.
        </p>
      </div>

      <div v-if="continueCard" class="continue-card">
        <div class="continue-cover">
          <img
            v-if="continueCard.module.cover_image_url"
            :src="continueCard.module.cover_image_url"
            :alt="continueCard.module.title"
          />
          <div v-else class="cover-fallback" />
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
            {{ continueCard.percent }}%<template v-if="continueCard.remainingMin">
              · ~{{ continueCard.remainingMin }} min left</template>
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
      <li v-for="mod in modules" :key="mod.id">
        <div class="card">
          <router-link
            :to="chapterRoute(mod)"
            class="cover"
            :aria-label="`${mod.title} — overview`"
          >
            <img
              v-if="mod.cover_image_url"
              :src="mod.cover_image_url"
              :alt="mod.title"
            />
            <div v-else class="cover-fallback" />
            <span
              v-if="isAuthenticated && pillFor(mod.id) === 'done'"
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
              <router-link :to="chapterRoute(mod)" class="title-link">
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
              <router-link :to="chapterRoute(mod)" class="card-action card-action--muted">
                Overview →
              </router-link>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
/* Chapter index — matches prototype IndexScreen (New Design Ideas/components/
   prototype.jsx). Editorial grid: serif titles, mono metadata, hairline rules,
   sharp 4px/0 radii, magenta progress. --ob-* tokens map to live --color-*. */
.chapters {
  max-width: 132rem;
  margin: 0 auto;
  padding: 3.2rem 5.6rem 6rem;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

/* Shared mono eyebrow */
.eyebrow {
  font-family: var(--font-mono);
  font-size: 1.1rem;
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
  margin: 2.4rem 0 1.6rem;
}

/* Hero: 1fr / 1.4fr (book title | featured card) */
.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  margin: 0 0 3.6rem;
}

@media (min-width: 900px) {
  .hero {
    grid-template-columns: 1fr 1.4fr;
    gap: 5.6rem;
    align-items: center;
  }
}

.hero-text .eyebrow {
  margin-bottom: 1.8rem;
}

.hero-text h1 {
  font-size: 6.4rem;
  line-height: 0.96;
  letter-spacing: -0.02em;
  padding: 0;
  margin: 0;
}

.lede {
  margin-top: 1.8rem;
  max-width: 36rem;
  font-size: 1.8rem;
  line-height: 1.45;
  color: rgb(var(--color-mute));
}

.signin-cta {
  margin-top: 1.6rem;
  font-family: var(--font-mono);
  font-size: 1.2rem;
  color: rgb(var(--color-mute));
}

.signin-cta a {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}

/* Featured "continue reading" card — dark band (prototype IndexScreen A) */
.continue-card {
  display: grid;
  grid-template-columns: 14rem 1fr auto;
  gap: 2.4rem;
  align-items: center;
  padding: 2.4rem;
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

.cover-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgb(var(--color-accent) / 0.18),
    rgb(var(--color-complete) / 0.18)
  );
}

.continue-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.continue-label {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-accent));
  margin-bottom: 0.8rem;
}

/* On the dark band, chapter + stat lines read as dimmed paper */
.continue-chapter,
.continue-stat {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-paper) / 0.7);
}

.chapter-label,
.subtitle {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
}

.continue-chapter {
  margin-bottom: 0.4rem;
}

.continue-title {
  font-size: 2.8rem;
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0 0 1.2rem;
  padding: 0;
}

.continue-stat {
  margin-top: 0.6rem;
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
  margin-top: 0.8rem;
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
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  padding: 0.9rem 1.8rem;
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
  gap: 4rem;
  margin: 3.2rem 0 0;
  padding: 1.8rem 0;
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.stat-label {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
}
.stat-value {
  font-size: 2.2rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.loading {
  text-align: center;
  color: rgb(var(--color-mute));
  padding: 4rem;
}

/* All-chapters grid: 4 across, gap 28px, borderless cards */
.grid {
  list-style: none;
  padding: 0 0 4.8rem;
  margin: 0;
  display: grid;
  gap: 2.8rem;
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
  margin-bottom: 1.2rem;
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
  margin-bottom: 0.2rem;
}

.title {
  font-size: 1.7rem;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.005em;
  margin: 0 0 0.4rem;
  padding: 0;
}

.subtitle {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 1rem;
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
  gap: 1.6rem;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(var(--color-line));
}
.card-action {
  font-family: var(--font-mono);
  font-size: 1.1rem;
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
  top: 0.8rem;
  right: 0.8rem;
  padding: 0.2rem 0.8rem;
  border-radius: 9999px;
  font-size: 1rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.pill-done {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.pill-reading {
  background: rgb(var(--color-accent));
  color: #fff;
}
</style>
