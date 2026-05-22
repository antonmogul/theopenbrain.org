<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  chapterNumber: { type: [String, Number], required: true },
  chapterTitle: { type: String, default: "" },
  moduleId: { type: String, default: null },
  // Optional content
  keyTakeaways: { type: Array, default: () => [] },
  // Stats — passed in by the parent (already computed from composables)
  highlightCount: { type: Number, default: 0 },
  noteCount: { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
  // Next chapter (optional)
  nextChapter: {
    type: Object,
    default: null,
    // shape: { number, slug, title }
  },
});

const router = useRouter();

const showTakeaways = computed(
  () => Array.isArray(props.keyTakeaways) && props.keyTakeaways.length > 0
);

const minutes = computed(() => Math.max(1, Math.round(props.timeSpentSeconds / 60)));

const overviewRoute = computed(() => `/chapter/${props.chapterNumber}`);
const quizRoute = computed(() =>
  props.moduleId ? `/quiz/${props.moduleId}` : null
);
const flashcardsRoute = computed(() =>
  props.moduleId ? `/flashcards/${props.moduleId}` : null
);

function goNext() {
  if (!props.nextChapter) return;
  router.push(`/chapter/${props.nextChapter.number}/${props.nextChapter.slug}`);
}
</script>

<template>
  <section class="eoc-callout" aria-label="End of chapter">
    <!-- Takeaways band — only when content exists -->
    <div v-if="showTakeaways" class="takeaways">
      <header class="takeaways-header">
        <span class="check" aria-hidden="true">✓</span>
        <h3>Key takeaways</h3>
      </header>
      <ul>
        <li v-for="(t, i) in keyTakeaways" :key="i">{{ t }}</li>
      </ul>
    </div>

    <!-- Stats strip -->
    <div class="stats" role="group" aria-label="Reading stats">
      <div class="stat">
        <span class="stat-value">{{ minutes }}</span>
        <span class="stat-label">min read</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ noteCount }}</span>
        <span class="stat-label">{{ noteCount === 1 ? "note" : "notes" }}</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ highlightCount }}</span>
        <span class="stat-label">{{ highlightCount === 1 ? "highlight" : "highlights" }}</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ Math.round(progressPercent) }}%</span>
        <span class="stat-label">complete</span>
      </div>
    </div>

    <!-- CTAs -->
    <div class="ctas">
      <router-link v-if="quizRoute" :to="quizRoute" class="cta cta-primary">
        Take quiz
      </router-link>
      <router-link
        v-if="flashcardsRoute"
        :to="flashcardsRoute"
        class="cta cta-secondary"
      >
        Review flashcards
      </router-link>
      <router-link :to="overviewRoute" class="cta cta-secondary">
        Chapter overview
      </router-link>
    </div>

    <!-- Up Next -->
    <button v-if="nextChapter" type="button" class="up-next" @click="goNext">
      <div class="up-next-meta">
        <span class="up-next-label">Up next</span>
        <span class="up-next-title">
          Chapter {{ nextChapter.number }} — {{ nextChapter.title }}
        </span>
      </div>
      <span class="up-next-arrow" aria-hidden="true">→</span>
    </button>
  </section>
</template>

<style scoped>
.eoc-callout {
  margin: 6rem auto 12rem;
  max-width: var(--reading-measure, 780px);
  display: flex;
  flex-direction: column;
  gap: 2rem;
  font-family: var(--font-body);
}

.takeaways {
  background: rgb(var(--color-complete) / 0.08);
  border: 1px solid rgb(var(--color-complete) / 0.4);
  border-radius: 1.2rem;
  padding: 2rem 2.4rem;
}

.takeaways-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.takeaways-header .check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 9999px;
  background: rgb(var(--color-complete));
  color: rgb(var(--color-paper));
  font-weight: 600;
  font-size: 1.4rem;
}

.takeaways h3 {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  padding: 0;
  color: rgb(var(--color-ink));
}

.takeaways ul {
  margin: 0;
  padding-left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.takeaways li {
  font-size: 1.6rem;
  line-height: 1.6;
  color: rgb(var(--color-ink));
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 1.2rem;
  padding: 1.6rem 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 600;
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
}

.stat-label {
  font-size: 1.1rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}

.ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.cta {
  display: inline-flex;
  align-items: center;
  padding: 1rem 1.8rem;
  border-radius: 0.8rem;
  font-size: 1.4rem;
  font-family: var(--font-ui);
  text-decoration: none;
  cursor: pointer;
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

.cta:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.up-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 1.2rem;
  padding: 1.6rem 2rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, transform 0.1s;
}

.up-next:hover {
  border-color: rgb(var(--color-accent));
  transform: translateX(2px);
}

.up-next:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.up-next-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.up-next-label {
  font-size: 1.1rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
}

.up-next-title {
  font-size: 1.6rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
}

.up-next-arrow {
  font-size: 2rem;
  color: rgb(var(--color-accent));
}

@media (max-width: 767px) {
  .eoc-callout {
    margin: 4rem 1.6rem 8rem;
  }
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .ctas {
    flex-direction: column;
  }
  .cta {
    justify-content: center;
  }
}
</style>
