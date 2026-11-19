<script setup>
/*
 * The chapter's close (OPENBRAIN-179): where the two-column reader ends and
 * the chapter finishes across the whole width, on the dark surface it opened
 * on. It answers the opener: the chapter's title, said once more as it
 * ends; then one way to test yourself, and the next chapter leading out.
 *
 * It no longer lists the chapter's takeaways ("Chapter 1 · In short", "… in
 * three ideas"): Stuart, 14 Nov, "Remove the 'Chapter in short' section at
 * the end of the chapter. We'll replace this idea at a later point with a
 * full-page info-graphic" (OPENBRAIN-193). modules.key_takeaways stays in
 * the database for that page; nothing here reads it.
 *
 * It replaced a card in the text column (key takeaways, four stats, three
 * buttons) and the "Quiz" block above it. What that got wrong, and this
 * does not:
 * - the QUIZ link went to /quiz, a route that does not exist; the quiz route
 *   takes a quiz's id, so the chapter's published quiz is looked up here
 *   (useChapterStudyTools) and offered only when there is one;
 * - quizzes and flashcards need an account, and a signed-out reader who
 *   pressed "Review flashcards" was dropped on the home page: the button now
 *   says it signs you in, opens the sign-in dialog, and carries on to where
 *   it was going once you are in;
 * - "1 min read" was a floor, not a measurement (reading time is only kept
 *   for a signed-in reader), and "98% complete" could never read 100: the
 *   line of reading stats shows only numbers that are true, and only to the
 *   reader they belong to.
 *
 * Everything shown is the chapter's own data, passed in or fetched: nothing
 * here knows which chapter it is.
 */
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ChapterReaderFeedback from "./ChapterReaderFeedback.vue";
import { useFeedback } from "@/composables/useFeedback";
import { useChapterStudyTools } from "@/composables/useChapterStudyTools";
import { useAuthStore } from "@/stores/auth";
import { scrollToY } from "@/helper/readerJump";

const props = defineProps({
  chapterNumber: { type: [String, Number], required: true },
  chapterTitle: { type: String, default: "" },
  moduleId: { type: String, default: null },
  /** Is a reader signed in? Their stats show, and the test opens directly. */
  isAuthenticated: { type: Boolean, default: false },
  // The reader's own numbers (ChapterView computes them from composables).
  highlightCount: { type: Number, default: 0 },
  noteCount: { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },
  /**
   * The chapter after this one, or null for the book's last:
   * { number, slug, title, description?, cover?, ramp? }.
   */
  nextChapter: { type: Object, default: null },
});

const router = useRouter();
const authStore = useAuthStore();

/* ---- The reader's own numbers ----------------------------------------- */

// Only for a signed-in reader (a signed-out one has no kept time, highlights
// or notes), and only the numbers there are: no "0 notes".
const stats = computed(() => {
  if (!props.isAuthenticated) return [];
  const out = [];
  const minutes = Math.floor(props.timeSpentSeconds / 60);
  if (minutes >= 1) out.push(`${minutes} min reading`);
  if (props.highlightCount > 0)
    out.push(
      `${props.highlightCount} ${props.highlightCount === 1 ? "highlight" : "highlights"}`
    );
  if (props.noteCount > 0)
    out.push(`${props.noteCount} ${props.noteCount === 1 ? "note" : "notes"}`);
  return out;
});

/* ---- Test your knowledge ---------------------------------------------- */

const { quiz, flashcardCount } = useChapterStudyTools(() => props.moduleId);

const quizRoute = computed(() =>
  quiz.value ? `/quiz/${quiz.value.id}` : null
);
const flashcardsRoute = computed(() =>
  props.moduleId && flashcardCount.value > 0
    ? `/flashcards/${props.moduleId}`
    : null
);
const cards = computed(
  () =>
    `${flashcardCount.value} ${flashcardCount.value === 1 ? "flashcard" : "flashcards"}`
);
// The one call to action: the quiz when the chapter has one, else its cards.
const test = computed(() => {
  if (quizRoute.value) {
    const q = quiz.value;
    const facts = [];
    if (q.questionCount)
      facts.push(
        `${q.questionCount} ${q.questionCount === 1 ? "question" : "questions"}`
      );
    if (q.minutes) facts.push(`about ${q.minutes} min`);
    return {
      to: quizRoute.value,
      label: "Take the quiz",
      signIn: "Sign in to take the quiz",
      facts: [
        facts.join(", ") || q.title || "A short quiz on this chapter",
        "Your score is kept, and you can try again.",
      ],
    };
  }
  if (flashcardsRoute.value)
    return {
      to: flashcardsRoute.value,
      label: "Review the flashcards",
      signIn: "Sign in to review them",
      facts: [
        `${cards.value} from this chapter.`,
        "The ones you miss come back sooner.",
      ],
    };
  return null;
});
// The cards as a second way, beside a quiz.
const alsoCards = computed(() =>
  quizRoute.value && flashcardsRoute.value
    ? {
        to: flashcardsRoute.value,
        label: cards.value,
        signIn: `Sign in for ${cards.value}`,
      }
    : null
);

// A signed-out press opens the sign-in dialog; once the reader is in, they
// go where the button was taking them.
const afterSignIn = ref(null);
function signInFor(to) {
  afterSignIn.value = to;
  authStore.openAuth("login");
}
watch(
  () => props.isAuthenticated,
  (signedIn) => {
    const to = afterSignIn.value;
    afterSignIn.value = null;
    if (signedIn && to) router.push(to);
  }
);
// Closing the dialog without signing in forgets the errand.
watch(
  () => authStore.activeAuth,
  (open) => {
    if (!open && !props.isAuthenticated) afterSignIn.value = null;
  }
);

/* ---- Small ways on ----------------------------------------------------- */

const overviewRoute = computed(() => `/chapter/${props.chapterNumber}`);

// "Send feedback" about this chapter (OPENBRAIN-101).
const { openFeedback } = useFeedback();
function feedback() {
  openFeedback({
    moduleId: props.moduleId,
    label: `Chapter ${props.chapterNumber}${props.chapterTitle ? ` · ${props.chapterTitle}` : ""}`,
  });
}
function toTop() {
  scrollToY(() => 0);
}

/* ---- Up next ----------------------------------------------------------- */

const nextRoute = computed(() =>
  props.nextChapter
    ? `/chapter/${props.nextChapter.number}/${props.nextChapter.slug}`
    : "/chapters"
);
// A cover that does not load leaves the card's own ground.
const coverFailed = ref(false);
watch(
  () => props.nextChapter?.cover,
  () => (coverFailed.value = false)
);
const cover = computed(() =>
  coverFailed.value ? null : props.nextChapter?.cover || null
);
</script>

<template>
  <div class="cc" role="region" aria-label="End of chapter" data-chapter-close>
    <div class="cc-wrap">
      <!-- The chapter's name, as it ends -->
      <header class="cc-head">
        <h2 class="cc-title">
          <span class="cc-title-lead">{{ chapterTitle || "The chapter" }}</span>
          <span class="cc-title-rest">ends here.</span>
        </h2>
        <p v-if="stats.length" class="cc-stats">
          <span class="cc-stats-label">Your reading</span>
          <span v-for="s in stats" :key="s" class="cc-stat">{{ s }}</span>
        </p>
      </header>

      <!-- One way to test yourself, when the chapter has one -->
      <div v-if="test" class="cc-test" data-chapter-test>
        <div class="cc-test-text">
          <p class="cc-test-kicker">Test your knowledge</p>
          <h3 class="cc-test-title">How much of it stayed with you?</h3>
          <p class="cc-test-facts">
            <template v-for="(fact, i) in test.facts" :key="i"
              >{{ fact }}{{ " " }}</template
            >
          </p>
        </div>
        <div class="cc-test-actions">
          <router-link
            v-if="isAuthenticated"
            :to="test.to"
            class="cc-button"
            data-test-action
          >
            <span>{{ test.label }}</span>
            <span class="cc-arrow" aria-hidden="true">→</span>
          </router-link>
          <button
            v-else
            type="button"
            class="cc-button"
            data-test-action
            @click="signInFor(test.to)"
          >
            <span>{{ test.signIn }}</span>
            <span class="cc-arrow" aria-hidden="true">→</span>
          </button>
          <template v-if="alsoCards">
            <router-link
              v-if="isAuthenticated"
              :to="alsoCards.to"
              class="cc-button cc-button--quiet"
            >
              {{ alsoCards.label }}
            </router-link>
            <button
              v-else
              type="button"
              class="cc-button cc-button--quiet"
              @click="signInFor(alsoCards.to)"
            >
              {{ alsoCards.signIn }}
            </button>
          </template>
          <p v-if="!isAuthenticated" class="cc-test-note">
            Quizzes and flashcards keep your progress, so they need an account.
          </p>
        </div>
      </div>

      <ChapterReaderFeedback
        v-if="moduleId"
        :key="moduleId"
        :module-id="moduleId"
        :is-authenticated="isAuthenticated"
      />

      <nav class="cc-links" aria-label="This chapter">
        <router-link :to="overviewRoute" class="cc-link">
          Chapter overview
        </router-link>
        <button type="button" class="cc-link" @click="feedback">
          Send feedback
        </button>
        <button type="button" class="cc-link" @click="toTop">
          Back to the top <span aria-hidden="true">↑</span>
        </button>
      </nav>

      <!-- The way out: the next chapter, or the book's contents -->
      <router-link
        :to="nextRoute"
        class="cc-next"
        :class="{ 'cc-next--plain': !cover }"
        :data-chapter="nextChapter?.ramp || undefined"
        data-chapter-next
      >
        <span v-if="cover" class="cc-next-cover">
          <img
            :src="cover"
            alt=""
            loading="lazy"
            decoding="async"
            @error="coverFailed = true"
          />
        </span>
        <span class="cc-next-body">
          <span class="cc-next-kicker">
            <template v-if="nextChapter">
              Up next <span aria-hidden="true">·</span> Chapter
              {{ nextChapter.number }}
            </template>
            <template v-else>The book</template>
          </span>
          <span class="cc-next-title">{{
            nextChapter ? nextChapter.title : "All chapters"
          }}</span>
          <span v-if="nextChapter?.description" class="cc-next-desc">{{
            nextChapter.description
          }}</span>
          <span v-else-if="!nextChapter" class="cc-next-desc">
            This is the last chapter published so far. See the whole book.
          </span>
          <span class="cc-next-go" aria-hidden="true">→</span>
        </span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
/* The opener's measures: 60px side padding at 1440, the same type steps.
   Everything inside sizes from the block's own width (cqw), so it holds in
   the reader, in a story frame and on a phone. */
.cc {
  --cc-gutter: clamp(1.25rem, 4.17vw, 3.75rem);
  --cc-mute: rgb(255 255 255 / 0.62);
  --cc-line: rgb(255 255 255 / 0.18);
  container-type: inline-size;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-body);
  letter-spacing: 0.1px;
  /* The reader hyphenates prose; nothing here is prose. */
  hyphens: manual;
  padding: clamp(3.5rem, 8vw, 7.5rem) var(--cc-gutter) clamp(3rem, 6vw, 5.5rem);
}
.cc-wrap {
  max-width: 82.5rem;
  margin: 0 auto;
}

/* ---- The end ---- */
.cc-test-kicker,
.cc-next-kicker,
.cc-stats {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.cc-title {
  margin: 1.25rem 0 0;
  padding: 0;
  font-size: clamp(2rem, 4.2cqw, 3.75rem);
  font-weight: 450;
  line-height: 1.2;
  text-wrap: balance;
}
.cc-title-lead,
.cc-title-rest {
  display: block;
}
.cc-title-lead {
  color: rgb(var(--color-chapter));
}
.cc-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 1.25rem;
  margin-top: 2rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--cc-mute);
}
.cc-stats-label {
  color: #fff;
  font-weight: 600;
}

/* ---- Test your knowledge: the chapter's colour, the one filled thing ---- */
.cc-test {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.75rem;
  margin-top: clamp(3rem, 6cqw, 5.5rem);
  padding: clamp(1.5rem, 3.4cqw, 3rem);
  background: rgb(var(--color-chapter-ground));
  color: rgb(var(--color-chapter-on));
}
.cc-test-kicker {
  opacity: 0.85;
}
.cc-test-title {
  margin: 0.75rem 0 0;
  padding: 0;
  font-size: clamp(1.625rem, 3cqw, 2.5rem);
  font-weight: 450;
  line-height: 1.2;
  text-wrap: balance;
}
.cc-test-facts {
  margin: 0.75rem 0 0;
  padding: 0;
  max-width: 38rem;
  font-size: var(--type-body-sm-size);
  line-height: 1.5;
}
.cc-test-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}
.cc-test-note {
  margin: 0;
  padding: 0;
  max-width: 22rem;
  font-size: var(--ui-size-13);
  line-height: 1.45;
  opacity: 0.9;
}
.cc-button {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  min-height: 3.25rem;
  padding: 0.875rem 1.375rem;
  border: 1px solid rgb(var(--color-dark-surface));
  border-radius: var(--radius-control);
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.cc-button:hover {
  background: #000;
  border-color: #000;
}
.cc-button--quiet {
  background: transparent;
  color: inherit;
  border-color: currentColor;
}
.cc-button--quiet:hover {
  background: rgb(var(--color-dark-surface));
  border-color: rgb(var(--color-dark-surface));
  color: #fff;
}
.cc-arrow {
  transition: transform 0.2s ease;
}
.cc-button:hover .cc-arrow {
  transform: translateX(0.25rem);
}
.cc-button:focus-visible {
  outline: 2px solid rgb(var(--color-chapter-on));
  outline-offset: 3px;
}

/* ---- Small ways on ---- */
.cc-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  margin-top: 1.5rem;
}
.cc-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--cc-mute);
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}
.cc-link:hover {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 0.3em;
}
.cc-link:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

/* ---- Up next: the next chapter's own colour (data-chapter on the card) ---- */
.cc-next {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-top: clamp(3rem, 6cqw, 5.5rem);
  border: 1px solid var(--cc-line);
  background: rgb(var(--color-dark-surface-2));
  color: #fff;
  text-decoration: none;
  transition: border-color 0.2s ease;
}
.cc-next:hover {
  border-color: rgb(var(--color-chapter));
}
.cc-next:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}
.cc-next-cover {
  display: block;
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: rgb(var(--color-chapter-ground));
}
.cc-next-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* A tall cover shows its upper part (a figure's head, a title). */
  object-position: 50% 22%;
  transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.cc-next:hover .cc-next-cover img {
  transform: scale(1.03);
}
.cc-next-body {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.875rem;
  padding: clamp(1.5rem, 3.4cqw, 3rem);
  padding-right: clamp(4.5rem, 9cqw, 7.5rem);
}
.cc-next-kicker {
  color: rgb(var(--color-warn));
}
.cc-next-title {
  font-size: clamp(2rem, 4.6cqw, 4rem);
  font-weight: 450;
  line-height: 1.1;
  color: rgb(var(--color-chapter));
  text-wrap: balance;
}
.cc-next-desc {
  max-width: 34rem;
  font-size: var(--type-body-sm-size);
  line-height: 1.5;
  color: var(--cc-mute);
}
.cc-next-go {
  position: absolute;
  right: clamp(1.25rem, 3cqw, 2.5rem);
  bottom: clamp(1.25rem, 3cqw, 2.5rem);
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgb(255 255 255 / 0.4);
  border-radius: 50%;
  font-size: var(--ui-size-20);
  line-height: 1;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.cc-next:hover .cc-next-go {
  background: rgb(var(--color-chapter-ground));
  border-color: rgb(var(--color-chapter-ground));
  color: rgb(var(--color-chapter-on));
  transform: translateX(0.25rem);
}

/* ---- Wider than a tablet: the test's words beside its button ---- */
@container (min-width: 60rem) {
  .cc-test {
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: clamp(2rem, 5cqw, 5rem);
    align-items: end;
  }
  .cc-test-actions {
    align-items: stretch;
    min-width: 17.5rem;
  }
}
@container (min-width: 48rem) {
  .cc-next {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  }
  .cc-next--plain {
    grid-template-columns: minmax(0, 1fr);
  }
  .cc-next-cover {
    aspect-ratio: auto;
    min-height: clamp(15rem, 26cqw, 22rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .cc-arrow,
  :root:not([data-reduce-motion="0"]) .cc-next-cover img,
  :root:not([data-reduce-motion="0"]) .cc-next-go {
    transition: none;
  }
  :root:not([data-reduce-motion="0"]) .cc-next:hover .cc-next-cover img,
  :root:not([data-reduce-motion="0"]) .cc-next:hover .cc-next-go,
  :root:not([data-reduce-motion="0"]) .cc-button:hover .cc-arrow {
    transform: none;
  }
}
</style>
