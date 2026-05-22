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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

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

// order_index is 1-based in DB and matches /chapter/:n URL numbering directly.
function chapterRoute(mod) {
  return `/chapter/${mod.order_index}`;
}

function chapterNumberFor(mod) {
  return mod.order_index;
}
</script>

<template>
  <main class="chapters">
    <header class="hero">
      <div class="hero-text">
        <h1>Chapters</h1>
        <p class="lede">Browse the textbook — pick up where you left off.</p>
        <p v-if="!isAuthenticated" class="signin-cta">
          <router-link to="/">Sign in</router-link> to track your progress.
        </p>
      </div>

      <router-link
        v-if="continueCard"
        :to="chapterRoute(continueCard.module)"
        class="continue-card"
        aria-label="Continue reading"
      >
        <div class="continue-cover">
          <img
            v-if="continueCard.module.cover_image_url"
            :src="continueCard.module.cover_image_url"
            :alt="continueCard.module.title"
          />
          <div v-else class="cover-fallback" />
        </div>
        <div class="continue-meta">
          <span class="continue-label">Continue reading</span>
          <span class="continue-chapter">
            Chapter {{ chapterNumberFor(continueCard.module) }}
          </span>
          <h2 class="continue-title">{{ continueCard.module.title }}</h2>
          <div class="progress-bar">
            <div
              class="progress-bar-fill"
              :style="{ width: `${continueCard.percent}%` }"
            />
          </div>
          <span v-if="continueCard.remainingMin" class="time-remaining">
            ~{{ continueCard.remainingMin }} min left
          </span>
        </div>
      </router-link>
    </header>

    <div v-if="loading" class="loading">Loading chapters…</div>

    <ul v-else class="grid">
      <li v-for="mod in modules" :key="mod.id">
        <router-link :to="chapterRoute(mod)" class="card">
          <div class="cover">
            <img
              v-if="mod.cover_image_url"
              :src="mod.cover_image_url"
              :alt="mod.title"
            />
            <div v-else class="cover-fallback" />
          </div>
          <div class="meta">
            <span class="chapter-label">
              CHAPTER {{ chapterNumberFor(mod) }}
            </span>
            <h3 class="title">{{ mod.title }}</h3>
            <div
              v-if="isAuthenticated && progressFor(mod.id)"
              class="progress-bar"
            >
              <div
                class="progress-bar-fill"
                :style="{ width: `${percentFor(mod.id)}%` }"
              />
            </div>
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
              Reading · {{ percentFor(mod.id) }}%
            </span>
          </div>
        </router-link>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.chapters {
  max-width: 140rem;
  margin: 0 auto;
  padding: 6rem 2.4rem 12rem;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

.hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  margin-bottom: 4rem;
}

@media (min-width: 900px) {
  .hero {
    grid-template-columns: 1fr 36rem;
    gap: 4rem;
    align-items: end;
  }
}

.hero-text h1 {
  font-size: 5rem;
  line-height: 1.05;
  padding: 0;
  margin: 0;
}

.lede {
  margin-top: 1.2rem;
  font-size: 1.8rem;
  color: rgb(var(--color-mute));
}

.signin-cta {
  margin-top: 1.6rem;
  font-size: 1.4rem;
  color: rgb(var(--color-mute));
}

.signin-cta a {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}

.continue-card {
  display: flex;
  gap: 1.6rem;
  padding: 1.6rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 1.2rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, transform 0.1s;
}

.continue-card:hover {
  border-color: rgb(var(--color-accent));
  transform: translateY(-1px);
}

.continue-cover {
  flex: 0 0 8rem;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 0.6rem;
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
    rgb(var(--color-accent) / 0.15),
    rgb(var(--color-complete) / 0.15)
  );
}

.continue-meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.continue-label,
.chapter-label {
  font-size: 1.1rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
}

.continue-chapter {
  font-size: 1.3rem;
  font-family: var(--font-mono);
  color: rgb(var(--color-mute));
}

.continue-title {
  font-size: 1.8rem;
  font-weight: 500;
  margin: 0.2rem 0;
  padding: 0;
  line-height: 1.2;
}

.progress-bar {
  margin-top: 0.4rem;
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

.time-remaining {
  margin-top: 0.4rem;
  font-size: 1.2rem;
  color: rgb(var(--color-mute));
}

.loading {
  text-align: center;
  color: rgb(var(--color-mute));
  padding: 4rem;
}

.grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 2.4rem;
  grid-template-columns: repeat(1, 1fr);
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
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
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 1rem;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, transform 0.1s;
}

.card:hover {
  border-color: rgb(var(--color-accent));
  transform: translateY(-2px);
}

.cover {
  aspect-ratio: 3 / 4;
  background: rgb(var(--color-bg));
  overflow: hidden;
}

.meta {
  padding: 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 500;
  margin: 0;
  padding: 0;
  line-height: 1.2;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.8rem;
  border-radius: 9999px;
  font-size: 1.1rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  width: fit-content;
}

.pill-done {
  background: rgb(var(--color-complete) / 0.15);
  color: rgb(var(--color-complete));
}

.pill-reading {
  background: rgb(var(--color-accent) / 0.15);
  color: rgb(var(--color-accent));
}
</style>
