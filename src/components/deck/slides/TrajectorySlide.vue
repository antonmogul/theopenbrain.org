<script setup>
// Where the book is going: a three-step timeline, then one bar per chapter
// coloured by status, so the unfunded share of the book is visible at a
// glance.
import { computed } from "vue";
import DeckSlide from "../DeckSlide.vue";

const props = defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // [{ when, heading, detail, highlight?, later? }]: `highlight` colours the
  // year magenta (the current step), `later` mutes it (the future one).
  milestones: { type: Array, required: true },
  // The sentence over the chapter strip, e.g. "24 of 36 chapters still need funding".
  summary: { type: String, default: "" },
  // Chapter counts by status. Their sum is the length of the strip.
  chapters: {
    type: Object,
    required: true,
    validator: (c) =>
      ["live", "inProgress", "funded", "unfunded"].every(
        (k) => Number.isInteger(c[k]) && c[k] >= 0
      ),
  },
  legend: {
    type: Object,
    default: () => ({
      live: "Live",
      inProgress: "By end of 2026",
      funded: "Funded · 2027",
      unfunded: "Unfunded",
    }),
  },
});

const STATUSES = ["live", "inProgress", "funded", "unfunded"];

const bars = computed(() =>
  STATUSES.flatMap((status) =>
    Array.from({ length: props.chapters[status] }, () => status)
  )
);
</script>

<template>
  <DeckSlide class="deck-pad trajectory">
    <span class="deck-eyebrow trajectory__eyebrow">{{ eyebrow }}</span>
    <h2 class="deck-title trajectory__title">{{ title }}</h2>

    <ol class="trajectory__steps">
      <li v-for="m in milestones" :key="m.when" class="trajectory__step">
        <span
          class="trajectory__when"
          :class="{
            'trajectory__when--now': m.highlight,
            'trajectory__when--later': m.later,
          }"
          >{{ m.when }}</span
        >
        <span class="trajectory__heading">{{ m.heading }}</span>
        <span class="trajectory__detail">{{ m.detail }}</span>
      </li>
    </ol>

    <div class="trajectory__chapters">
      <div class="trajectory__summary">
        <span class="trajectory__count">{{ summary }}</span>
        <ul class="trajectory__legend">
          <li v-for="s in STATUSES" :key="s">
            <span class="trajectory__swatch" :class="`is-${s}`" />
            <span>{{ legend[s] }}</span>
          </li>
        </ul>
      </div>
      <div
        class="trajectory__strip"
        role="img"
        :aria-label="`${bars.length} chapters: ${STATUSES.map((s) => `${chapters[s]} ${legend[s].toLowerCase()}`).join(', ')}`"
      >
        <span
          v-for="(status, i) in bars"
          :key="i"
          class="trajectory__bar"
          :class="`is-${status}`"
        />
      </div>
    </div>
  </DeckSlide>
</template>

<style scoped>
.trajectory__eyebrow {
  margin-bottom: 20px;
}
.trajectory__title {
  margin-bottom: 70px;
}
.trajectory__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 2px solid rgb(var(--color-ink));
}
.trajectory__step {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 36px 48px 0;
  border-left: 1px solid rgb(var(--color-line));
}
.trajectory__step:first-child {
  padding-left: 0;
  border-left: 0;
}
.trajectory__step:last-child {
  padding-right: 0;
}
.trajectory__when {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 28px;
}
.trajectory__when--now {
  color: rgb(var(--color-accent));
}
.trajectory__when--later {
  color: rgb(var(--color-mute));
}
.trajectory__heading {
  font-size: 40px;
  font-weight: 500;
  line-height: 1.2;
}
.trajectory__detail {
  font-size: 28px;
  line-height: 1.45;
  color: rgb(var(--color-mute));
  text-wrap: pretty;
}
.trajectory__chapters {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.trajectory__summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.trajectory__count {
  font-size: 44px;
  font-weight: 500;
}
.trajectory__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 36px;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  color: rgb(var(--color-mute));
}
.trajectory__legend li {
  display: flex;
  align-items: center;
  gap: 12px;
}
.trajectory__swatch {
  width: 22px;
  height: 22px;
}
.trajectory__strip {
  display: flex;
  gap: 8px;
  height: 120px;
}
.trajectory__bar {
  flex: 1;
}
.is-live {
  background: rgb(var(--color-ink));
}
.is-inProgress {
  background: rgb(var(--color-accent));
}
.is-funded {
  background: rgb(var(--color-complete));
}
.is-unfunded {
  box-shadow: inset 0 0 0 2px rgb(var(--color-ink));
}
</style>
