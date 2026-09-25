<script setup>
/*
 * BookContents — the book's table of contents (OPENBRAIN-104), drawn the
 * way a chapter's opener draws its outline (OpenerToc): a dark block, a rule
 * above each row, numbers in circles, section titles on a hairline under
 * each chapter. The book is in five parts, one per subject ramp; each part
 * wears its ramp's colour ([data-chapter] scopes --color-chapter), and a
 * part with no chapter yet says so.
 *
 * With `progress` (chapter id → { percent, status }) each chapter shows how
 * far the reader is, for /chapters.
 */
import { authorsForModule } from "@/helper/chapterAuthors";

defineProps({
  /** useBookContents().parts */
  parts: { type: Array, required: true },
  /** Optional: module id → { percent, status: done | reading | opened } */
  progress: { type: Object, default: null },
  /** Heading level text; the block's id is for "Contents" links. */
  title: { type: String, default: "Contents" },
  id: { type: String, default: "contents" },
  loading: { type: Boolean, default: false },
});

const ROMAN = ["I", "II", "III", "IV", "V"];

function readerRoute(mod) {
  return `/chapter/${mod.order_index}/${mod.slug}`;
}
function authorLine(mod) {
  return authorsForModule(mod)
    .map((a) => a.name)
    .filter(Boolean)
    .join(", ");
}
function statusLabel(p) {
  if (!p) return "";
  if (p.status === "done") return "Finished";
  if (p.status === "reading") return `${p.percent}% read`;
  return "Opened";
}
</script>

<template>
  <section :id="id" class="bc" :aria-labelledby="`${id}-title`">
    <h2 :id="`${id}-title`" class="bc__title">{{ title }}</h2>

    <p v-if="loading" class="bc__loading">Loading the contents…</p>

    <ol v-else class="bc__parts">
      <li
        v-for="part in parts"
        :key="part.ramp"
        class="bc__part"
        :data-chapter="part.ramp"
      >
        <p class="bc__part-head">
          <span class="bc__part-num">Part {{ ROMAN[part.number - 1] }}</span>
          {{ part.name }}
        </p>

        <ol v-if="part.chapters.length" class="bc__chapters">
          <li
            v-for="{ module: mod, sections } in part.chapters"
            :key="mod.id"
            class="bc__chapter"
          >
            <router-link :to="readerRoute(mod)" class="bc__row">
              <span class="bc__num" aria-hidden="true">{{
                mod.order_index
              }}</span>
              <span class="bc__main">
                <span class="bc__chapter-title">
                  <span class="sr-only">Chapter {{ mod.order_index }}: </span
                  >{{ mod.title }}
                  <span v-if="mod.isDraft" class="bc__tag">Draft</span>
                </span>
                <span v-if="mod.description" class="bc__desc">{{
                  mod.description
                }}</span>
                <span v-if="authorLine(mod)" class="bc__authors">{{
                  authorLine(mod)
                }}</span>
              </span>
              <span
                v-if="progress?.[mod.id]"
                class="bc__progress"
                :class="`bc__progress--${progress[mod.id].status}`"
              >
                <span class="bc__progress-label">{{
                  statusLabel(progress[mod.id])
                }}</span>
                <span class="bc__bar" aria-hidden="true"
                  ><span :style="{ width: `${progress[mod.id].percent}%` }"
                /></span>
              </span>
              <span v-else class="bc__go" aria-hidden="true">Read →</span>
            </router-link>

            <ol v-if="sections.length" class="bc__sections">
              <li v-for="s in sections" :key="s.id" class="bc__section">
                {{ s.title }}
              </li>
            </ol>
          </li>
        </ol>
        <p v-else class="bc__soon">In preparation</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
/* The opener TOC's measures (OpenerToc, Figma ui/toc 286:1641), scaled for
   a whole book: number circles on the left, a rule above each row. */
.bc {
  --bc-num: clamp(2.25rem, 2.6vw, 3rem);
  --bc-indent: calc(var(--bc-num) + clamp(1rem, 1.6vw, 1.5rem));
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-body);
  /* Titles break at words, not hyphenated like the prose. */
  hyphens: manual;
  padding: clamp(3rem, 7vw, 6.5rem) clamp(1.25rem, 5vw, 6rem)
    clamp(3rem, 6vw, 5rem);
}
.bc__title {
  margin: 0 0 clamp(2rem, 4vw, 3.5rem);
  padding: 0;
  font-size: var(--type-h2-size);
  line-height: var(--type-h2-lh, 1.2);
  font-weight: 450;
  letter-spacing: 0.1px;
}
.bc__loading {
  margin: 0;
  color: rgb(255 255 255 / 0.6);
}
.bc__parts,
.bc__chapters,
.bc__sections {
  list-style: none;
  margin: 0;
  padding: 0;
}
.bc__parts {
  display: grid;
  gap: clamp(2.5rem, 4vw, 3.5rem);
}
.bc__part-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--color-chapter));
}
.bc__part-num {
  color: rgb(255 255 255 / 0.55);
}
.bc__chapter {
  border-top: 1px solid rgb(var(--color-chapter));
}
.bc__row {
  display: grid;
  grid-template-columns: var(--bc-num) minmax(0, 1fr) auto;
  column-gap: clamp(1rem, 1.6vw, 1.5rem);
  align-items: start;
  padding: clamp(1rem, 1.4vw, 1.375rem) 0;
  color: inherit;
  text-decoration: none;
}
.bc__num {
  display: grid;
  place-items: center;
  width: var(--bc-num);
  height: var(--bc-num);
  border-radius: 999px;
  background: rgb(var(--color-chapter));
  color: #fff;
  font-size: calc(var(--bc-num) * 0.5);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.bc__main {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
}
.bc__chapter-title {
  color: rgb(var(--color-chapter));
  font-size: var(--type-subhead-size);
  line-height: 1.25;
  font-weight: 450;
}
.bc__row:hover .bc__chapter-title,
.bc__row:focus-visible .bc__chapter-title {
  text-decoration: underline;
  text-underline-offset: 0.18em;
  text-decoration-thickness: 1px;
}
.bc__row:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.bc__desc {
  font-size: var(--type-body-size);
  line-height: 1.45;
  color: #fff;
}
.bc__authors {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: rgb(255 255 255 / 0.6);
}
.bc__tag {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  vertical-align: middle;
  border: 1px solid currentColor;
  border-radius: var(--radius-control);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.bc__go {
  align-self: center;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.7);
}
.bc__row:hover .bc__go {
  color: #fff;
}
.bc__progress {
  align-self: center;
  display: grid;
  gap: 0.375rem;
  justify-items: end;
  min-width: 7rem;
}
.bc__progress-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: rgb(255 255 255 / 0.8);
}
.bc__bar {
  width: 7rem;
  height: 3px;
  background: rgb(255 255 255 / 0.18);
}
.bc__bar span {
  display: block;
  height: 100%;
  background: rgb(var(--color-chapter));
}
.bc__sections {
  padding-left: var(--bc-indent);
  padding-bottom: 0.5rem;
  columns: 2 22rem;
  column-gap: 2.5rem;
}
.bc__section {
  break-inside: avoid;
  padding: 0.5rem 0;
  border-top: 1px solid rgb(255 255 255 / 0.18);
  font-size: var(--type-body-sm-size);
  line-height: 1.4;
  color: rgb(255 255 255 / 0.85);
}
.bc__soon {
  margin: 0;
  padding: 1rem 0;
  border-top: 1px solid rgb(var(--color-chapter) / 0.5);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.45);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .bc__row {
    grid-template-columns: var(--bc-num) minmax(0, 1fr);
  }
  .bc__progress,
  .bc__go {
    grid-column: 2;
    justify-items: start;
    margin-top: 0.5rem;
  }
  .bc__sections {
    columns: 1;
  }
}
</style>
