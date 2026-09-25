<script setup>
/*
 * The home page: the book's cover (OPENBRAIN-104). Anton, 25 Sep: redesign
 * the home and chapters pages "to feel more inline with the book". It opens
 * the way a chapter does: a split cover, the title block dark on the left
 * and the cover art on the right, the chapter-colour divider between them
 * (the reader's 50/50 split), then the book's contents in the opener's TOC
 * style (BookContents), how to read it, and the colophon.
 */
import { computed } from "vue";
import { useGeneral } from "@/stores/index";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";
import { useBookContents } from "@/composables/useBookContents";
import { coverForModule } from "@/helper/chapterCover";
import BookContents from "@/components/book/BookContents.vue";

const { parts, chapters, loading } = useBookContents();

const published = computed(() => chapters.value.filter((c) => !c.isDraft));
const first = computed(() => published.value[0] || null);
const cover = computed(() => coverForModule(first.value));
const firstRoute = computed(() =>
  first.value
    ? `/chapter/${first.value.order_index}/${first.value.slug}`
    : "/chapters"
);
// Counts the published chapters instead of hardcoding "two" (OPENBRAIN-33).
const WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"];
const countCopy = computed(() => {
  const n = published.value.length;
  if (!n) return "";
  return `${WORDS[n - 1] || n} chapter${n === 1 ? "" : "s"} to read now, more on the way.`;
});

const store = useGeneral();
const authStore = useAuthStore();
const { isAuthenticated } = useAuth();
const openAuth = () => {
  store.activeMenu = false;
  store.activeAbout = false;
  authStore.openAuth();
};

function toContents() {
  const el = document.getElementById("contents");
  if (!el) return;
  const reduce =
    document.documentElement.getAttribute("data-reduce-motion") === "1";
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

// How the book reads: what makes it more than a PDF.
const ways = [
  {
    title: "Read with the figures",
    body: "Each chapter pairs the text with its figures. As you read, the figure beside it moves to what the paragraph describes: anatomy you can click through, animations, and interactive models to try.",
  },
  {
    title: "Mark it up",
    body: "Highlight passages, write notes in your own words, and tag highlights to group them. Your place in each chapter is kept for you.",
  },
  {
    title: "Practise",
    body: "Flashcards bring back what you found hard, sooner. Chapters add quizzes and code labs as the authors write them.",
  },
];
</script>

<template>
  <main class="home">
    <!-- ── Cover ── -->
    <header class="cover">
      <div class="cover__title">
        <img
          src="/publicAssets/images/logo.svg"
          alt="The Open Brain"
          class="cover__logo"
        />
        <h1 class="cover__h1">
          <span class="cover__lead">The Open Brain:</span>
          <span class="cover__sub"
            >an interactive, open access neuroscience textbook</span
          >
        </h1>
        <p class="cover__strap">
          Free to read, forever, for anyone. Written by neuroscientists at
          McGill University.
        </p>
        <div class="cover__actions">
          <router-link :to="firstRoute" class="btn btn--solid"
            >Start reading</router-link
          >
          <button type="button" class="btn btn--ghost" @click="toContents">
            Contents
          </button>
          <button
            v-if="!isAuthenticated"
            type="button"
            class="btn btn--link"
            @click="openAuth"
          >
            Sign in
          </button>
        </div>
        <p v-if="countCopy" class="cover__count">{{ countCopy }}</p>
      </div>
      <div
        class="cover__art"
        role="img"
        :aria-label="first ? `Cover of ${first.title}` : 'Cover image'"
        :style="{ backgroundImage: `url(${cover})` }"
      />
    </header>

    <!-- ── Contents ── -->
    <BookContents :parts="parts" :loading="loading" />

    <!-- ── How to read it ── -->
    <section class="ways" aria-labelledby="ways-title">
      <h2 id="ways-title" class="ways__title">How to read this book</h2>
      <ol class="ways__list">
        <li v-for="(w, i) in ways" :key="w.title" class="ways__item">
          <span class="ways__num" aria-hidden="true">{{ i + 1 }}</span>
          <div>
            <h3 class="ways__head">{{ w.title }}</h3>
            <p class="ways__body">{{ w.body }}</p>
          </div>
        </li>
      </ol>
      <p class="ways__more">
        Want to try the code yourself?
        <router-link to="/playground">Open the Python playground →</router-link>
      </p>
    </section>

    <!-- ── Open access / funding / credits ── -->
    <footer class="foot">
      <div class="foot-cols">
        <div class="foot-col">
          <p class="foot-eyebrow">Open access</p>
          <p class="foot-text">
            theopenbrain.org is licensed under a
            <a
              href="http://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener"
              >Creative Commons Attribution 4.0 International License</a
            >
            — use, share, adapt, and redistribute freely with attribution.
          </p>
        </div>
        <div class="foot-col">
          <p class="foot-eyebrow">Funding</p>
          <p class="foot-text">
            Funded by the
            <a
              href="https://www.mcgill.ca/neuro/open-science/tanenbaum-open-science-institute-tosi"
              target="_blank"
              rel="noopener"
              >Tanenbaum Open Science Institute</a
            >
            at the
            <a
              href="https://www.mcgill.ca/neuro/"
              target="_blank"
              rel="noopener"
              >Montreal Neurological Institute</a
            >, McGill University.
          </p>
        </div>
        <div class="foot-col">
          <p class="foot-eyebrow">Credits</p>
          <p class="foot-text">
            Editor: Stuart Trenholm · Chapter authors: Arjun Krishnaswamy,
            Stuart Trenholm · Design &amp; illustration:
            <a href="https://malpeso.info/" target="_blank" rel="noopener"
              >Malpeso Studio</a
            >.
          </p>
        </div>
      </div>
      <p class="foot-legal">
        An open access project · Montreal Neurological Institute ·
        <!-- Plain anchor: Storybook is a static build beside the app. -->
        <a href="/storybook/index.html" target="_blank" rel="noopener"
          >Storybook</a
        >
      </p>
    </footer>
  </main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

/* ── Cover: the reader's 50/50 split, dark title | art ── */
.cover {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100svh;
  background: rgb(var(--color-dark-surface));
  color: #fff;
}
.cover::after {
  /* the divider, as in the reader */
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: rgb(var(--color-chapter));
  pointer-events: none;
}
.cover__title {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(1.25rem, 2.2vw, 2rem);
  padding: clamp(3rem, 8vw, 7.5rem) clamp(1.25rem, 3.47vw, 3.75rem);
}
.cover__logo {
  width: clamp(9rem, 14vw, 13rem);
  height: auto;
  filter: invert(1);
}
.cover__h1 {
  margin: 0;
  padding: 0;
  font-size: clamp(var(--type-subhead-size), 3.48vw, 3.75rem);
  line-height: 1.3;
  font-weight: 450;
  letter-spacing: 0.1px;
  text-wrap: balance;
}
.cover__lead {
  display: block;
  color: rgb(var(--color-chapter));
}
.cover__sub {
  display: block;
}
.cover__strap {
  margin: 0;
  max-width: 34rem;
  font-size: var(--type-body-lg-size);
  line-height: 1.5;
  color: rgb(255 255 255 / 0.78);
}
.cover__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.cover__count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.55);
}
.cover__art {
  background-size: cover;
  background-position: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.875rem 1.375rem;
  border: 1px solid #fff;
  border-radius: var(--radius-control);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}
.btn--solid {
  background: #fff;
  color: rgb(var(--color-dark-surface));
}
.btn--solid:hover {
  background: rgb(var(--color-chapter));
  border-color: rgb(var(--color-chapter));
  color: #fff;
}
.btn--ghost {
  background: transparent;
  color: #fff;
}
.btn--ghost:hover {
  background: rgb(255 255 255 / 0.1);
}
.btn--link {
  border-color: transparent;
  background: transparent;
  color: rgb(255 255 255 / 0.8);
  text-decoration: underline;
  text-underline-offset: 0.25em;
}
.btn--link:hover {
  color: #fff;
}
.btn:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 3px;
}

/* ── How to read this book: numbered rows with a rule above each ── */
.ways {
  max-width: 78rem;
  margin: 0 auto;
  padding: clamp(3.5rem, 7vw, 6.5rem) clamp(1.25rem, 5vw, 6rem);
}
.ways__title {
  margin: 0 0 clamp(1.75rem, 3vw, 2.75rem);
  padding: 0;
  font-size: var(--type-h3-size);
  line-height: 1.2;
  font-weight: 450;
}
.ways__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: clamp(1.5rem, 3vw, 3rem);
}
.ways__item {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 1rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgb(var(--color-ink));
}
.ways__num {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-bg));
  font-size: 1.0625rem;
  line-height: 1;
}
.ways__head {
  margin: 0 0 0.5rem;
  padding: 0;
  font-size: var(--type-body-lg-size);
  line-height: 1.3;
  font-weight: 500;
}
.ways__body {
  margin: 0;
  font-size: var(--type-body-sm-size);
  line-height: 1.6;
  color: rgb(var(--color-ink) / 0.78);
}
.ways__more {
  margin: clamp(2rem, 3vw, 3rem) 0 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
  color: rgb(var(--color-mute));
}
.ways__more a {
  color: rgb(var(--color-ink));
}

/* ── Colophon ── */
.foot {
  border-top: 1px solid rgb(var(--color-ink));
  padding: clamp(2.5rem, 5vw, 4rem) clamp(1.25rem, 5vw, 6rem) 2.5rem;
}
.foot-cols {
  max-width: 78rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1.5rem, 3vw, 3rem);
}
.foot-eyebrow {
  margin: 0 0 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.foot-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(var(--color-ink) / 0.8);
}
.foot-text a {
  color: rgb(var(--color-ink));
  text-underline-offset: 0.2em;
}
.foot-legal {
  max-width: 78rem;
  margin: 2.5rem auto 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}
.foot-legal a {
  color: inherit;
}

/* ── Below the two-column reader: art above, title below ── */
@media (max-width: 1023px) {
  .cover {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .cover::after {
    display: none;
  }
  .cover__art {
    order: -1;
    height: 52svh;
    border-bottom: 1px solid rgb(var(--color-chapter));
  }
  .ways__list,
  .foot-cols {
    grid-template-columns: 1fr;
    row-gap: 2rem;
  }
}
</style>
