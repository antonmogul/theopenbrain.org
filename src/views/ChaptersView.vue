<script setup>
/*
 * /chapters — the book's contents with the reader's place in it
 * (OPENBRAIN-104). Anton, 25 Sep: redesign it "to feel more inline with the
 * book". Signed-in readers land here (the guard skips the home page), so it
 * opens on a dark band: the title, where they left off and what they have
 * done, then the contents in the opener's TOC style (BookContents) with
 * each chapter's progress. Chapter links go straight into the reader
 * (Stuart, 24 Sep: no overview page in between; OPENBRAIN-90).
 */
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useAuthStore } from "@/stores/auth";
import { useBookContents } from "@/composables/useBookContents";
import { useMyChapters } from "@/composables/useMyChapters";
import { coverForModule } from "@/helper/chapterCover";
import { rampForModule } from "@/helper/chapterTheme";
import { ROLE_UNAVAILABLE_QUERY } from "@/router/guards";
import BookContents from "@/components/book/BookContents.vue";
import AccountMenu from "@/components/Navigation/AccountMenu.vue";

const route = useRoute();
const authStore = useAuthStore();
const { user, session, isAuthenticated, isCreator } = useAuth();

// The auth guard lands here with ?auth=role-unavailable when a role-gated
// route had to fail closed (profile lookup errored or returned nothing).
const roleUnavailable = computed(
  () => route.query.auth === ROLE_UNAVAILABLE_QUERY
);

const { parts, chapters, loading } = useBookContents();
const {
  chapters: myChapters,
  continueReading,
  fetchMyChapters,
} = useMyChapters();

const published = computed(() => chapters.value.filter((c) => !c.isDraft));
const drafts = computed(() => chapters.value.filter((c) => c.isDraft));

// module id → { percent, status } for the contents
const progress = computed(() =>
  isAuthenticated.value
    ? Object.fromEntries(
        myChapters.value.map((c) => [
          c.module.id,
          { percent: c.percent, status: c.status },
        ])
      )
    : null
);

const cont = computed(() => {
  const c = continueReading.value;
  if (!c?.module?.slug) return null;
  return {
    module: c.module,
    percent: Math.round(c.scrollPosition || 0),
    route: {
      path: `/chapter/${c.module.order_index}/${c.module.slug}`,
      query: { resume: "1" },
    },
  };
});

// Highlight and note counts: a HEAD with count=exact returns the total in
// Content-Range without fetching the rows.
const highlightCount = ref(0);
const noteCount = ref(0);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
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
    const total = res.headers.get("content-range")?.split("/")?.[1];
    return total ? parseInt(total, 10) : 0;
  } catch {
    return 0;
  }
}

onMounted(async () => {
  if (!isAuthenticated.value) return;
  await fetchMyChapters();
  [highlightCount.value, noteCount.value] = await Promise.all([
    countRows("highlights"),
    countRows("notes"),
  ]);
});

const stats = computed(() => {
  const rows = myChapters.value;
  const done = rows.filter((c) => c.status === "done").length;
  const sec = rows.reduce((sum, c) => sum + (c.timeSpentSeconds || 0), 0);
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return [
    { label: "Chapters finished", value: `${done}/${published.value.length}` },
    { label: "Chapters opened", value: String(rows.length) },
    { label: "Highlights", value: String(highlightCount.value) },
    { label: "Notes", value: String(noteCount.value) },
    { label: "Reading time", value: h ? `${h}h ${m}m` : `${m}m` },
  ];
});
</script>

<template>
  <main class="chapters">
    <header class="band">
      <!-- The way to the dashboard, settings and log out from here (or sign
           in), as in the reader's top bar. -->
      <AccountMenu class="band__account" />
      <div class="band__title">
        <p class="band__eyebrow">
          The Open Brain · {{ published.length }}
          {{ published.length === 1 ? "chapter" : "chapters" }}
          <template v-if="drafts.length">
            · {{ drafts.length }}
            {{ drafts.length === 1 ? "draft" : "drafts" }} (only creators see
            drafts)</template
          >
        </p>
        <h1 class="band__h1">Chapters</h1>
        <p class="band__lede">
          An open access, interactive neuroscience textbook. Pick a chapter, or
          carry on where you left off.
        </p>
        <p v-if="!isAuthenticated" class="band__note">
          <button
            type="button"
            class="band__link"
            @click="authStore.openAuth()"
          >
            Sign in
          </button>
          to keep your place, highlights and notes.
        </p>
        <p v-if="isCreator" class="band__note">
          <router-link to="/dashboard?section=chapters" class="band__link"
            >Creator console →</router-link
          >
        </p>
        <p v-if="roleUnavailable" class="band__note" role="status">
          We couldn't confirm your account role, so that page stayed closed.
          Reload to try again.
        </p>
      </div>

      <router-link
        v-if="cont"
        :to="cont.route"
        class="continue"
        :data-chapter="rampForModule(cont.module)"
        :aria-label="`Continue reading ${cont.module.title}, ${cont.percent} percent read`"
      >
        <span
          class="continue__art"
          :style="{ backgroundImage: `url(${coverForModule(cont.module)})` }"
        />
        <span class="continue__body">
          <span class="continue__eyebrow">Continue reading</span>
          <span class="continue__chapter"
            ><span class="continue__num">{{ cont.module.order_index }}</span>
            {{ cont.module.title }}</span
          >
          <span class="continue__bar" aria-hidden="true"
            ><span :style="{ width: `${cont.percent}%` }"
          /></span>
          <span class="continue__meta"
            >{{ cont.percent }}% read · Resume →</span
          >
        </span>
      </router-link>
    </header>

    <dl v-if="isAuthenticated && myChapters.length" class="stats">
      <div v-for="s in stats" :key="s.label" class="stat">
        <dt>{{ s.label }}</dt>
        <dd>{{ s.value }}</dd>
      </div>
    </dl>

    <BookContents
      :parts="parts"
      :progress="progress"
      :loading="loading"
      title="Contents"
    />

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
.chapters {
  min-height: 100vh;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-body);
}

/* ── Band: title | continue ── */
.band {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(2rem, 5vw, 5rem);
  align-items: end;
  padding: clamp(3rem, 7vw, 6rem) clamp(1.25rem, 5vw, 6rem)
    clamp(2rem, 4vw, 3.5rem);
  border-bottom: 1px solid rgb(var(--color-chapter));
}
.band__account {
  position: absolute;
  top: clamp(1rem, 2vw, 1.5rem);
  right: clamp(1.25rem, 5vw, 6rem);
}
/* The account button sits on the dark band here. */
.band__account :deep(.account-btn),
.band__account :deep(.account-signin) {
  border-color: rgb(255 255 255 / 0.7);
  background: transparent;
  color: #fff;
}
.band__account :deep(.account-btn:hover),
.band__account :deep(.account-signin:hover) {
  border-color: #fff;
  background: rgb(255 255 255 / 0.1);
}
.band__eyebrow {
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.55);
}
.band__h1 {
  margin: 0;
  padding: 0;
  font-size: clamp(var(--type-h2-size), 5.5vw, var(--type-h1-size));
  line-height: 1.05;
  font-weight: 450;
  letter-spacing: -0.01em;
  color: rgb(var(--color-chapter));
}
.band__lede {
  margin: 1.25rem 0 0;
  max-width: 34rem;
  font-size: var(--type-body-lg-size);
  line-height: 1.5;
  color: rgb(255 255 255 / 0.8);
}
.band__note {
  margin: 1rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
  color: rgb(255 255 255 / 0.65);
}
.band__link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 0.25em;
  cursor: pointer;
}

/* The continue card: cover, number circle in the chapter's colour, bar */
.continue {
  display: grid;
  grid-template-columns: clamp(6rem, 10vw, 9rem) minmax(0, 1fr);
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: var(--radius-control);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s;
}
.continue:hover,
.continue:focus-visible {
  border-color: rgb(var(--color-chapter));
}
.continue:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 2px;
}
.continue__art {
  min-height: 9rem;
  background-size: cover;
  background-position: center;
}
.continue__body {
  display: grid;
  align-content: center;
  gap: 0.625rem;
  padding: 1.25rem 1.5rem;
}
.continue__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--color-chapter));
}
.continue__chapter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: var(--type-body-lg-size);
  line-height: 1.3;
}
.continue__num {
  flex: none;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: rgb(var(--color-chapter));
  font-size: 1rem;
  line-height: 1;
}
.continue__bar {
  height: 3px;
  background: rgb(255 255 255 / 0.18);
}
.continue__bar span {
  display: block;
  height: 100%;
  background: rgb(var(--color-chapter));
}
.continue__meta {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: rgb(255 255 255 / 0.7);
}

/* ── Stats: a ruled row, like the contents ── */
.stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin: 0;
  padding: 0 clamp(1.25rem, 5vw, 6rem);
  border-bottom: 1px solid rgb(255 255 255 / 0.18);
}
.stat {
  padding: 1.25rem 1rem 1.25rem 0;
}
.stat dt {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.55);
}
.stat dd {
  margin: 0.375rem 0 0;
  font-size: var(--type-subhead-size);
  line-height: 1.1;
}

.library-foot {
  display: flex;
  gap: 0.5rem;
  margin: 0;
  padding: 0 clamp(1.25rem, 5vw, 6rem) 2.5rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  color: rgb(255 255 255 / 0.5);
}
.library-foot a {
  color: inherit;
}
.library-foot a:hover,
.library-foot a:focus-visible {
  color: #fff;
}

@media (max-width: 1023px) {
  .band {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
