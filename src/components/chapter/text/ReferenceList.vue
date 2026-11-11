<script setup>
/*
 * A chapter's reference list (OPENBRAIN-92; set full width in
 * OPENBRAIN-179). Stuart, 24 Sep: "allows each ref in the end list to be a
 * link to the actual source".
 *
 * Each entry is the authors' own text with its parts told apart (authors,
 * title, then the source as they wrote it) and its links taken out of the
 * sentence into small labels that open the source in a new tab: the DOI as
 * written, a web page by its site's name (helper/chapterReferences.js,
 * referenceParts). Every entry has an anchor (#ref-N) a citation or a
 * Further reading link can point at.
 *
 * The entries run across in rows, not down in columns: the list is several
 * screens tall, and a number that carries on at the top of the next column
 * would send the reader back up the page. One column in a text column, two
 * and three as its box widens (a container query, so it fits wherever it is
 * put).
 */
import { computed } from "vue";
import { referenceParts } from "@/helper/chapterReferences";

const props = defineProps({
  /** Rows of `references` (number, raw_text, doi, url, authors, title, …)
   *  or a chapter's own entries ({ number, html }), in order. */
  references: { type: Array, required: true },
});

const entries = computed(() =>
  props.references.map((r) => ({ number: r.number, ...referenceParts(r) }))
);
</script>

<template>
  <div class="ref-list-box">
    <ol class="ref-list" role="list">
      <li
        v-for="r in entries"
        :id="`ref-${r.number}`"
        :key="r.number"
        :value="r.number"
        class="ref-list__item"
      >
        <span class="ref-list__n" aria-hidden="true">{{ r.number }}</span>
        <div class="ref-list__body">
          <!-- The authors' own reference text (their HTML: italics, bold). -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="ref-list__text" v-html="r.html" />
          <span v-if="r.links.length" class="ref-list__links">
            <a
              v-for="link in r.links"
              :key="link.href"
              :href="link.href"
              class="ref-list__source"
              :data-kind="link.kind"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ link.label }}<span aria-hidden="true"> ↗</span>
            </a>
          </span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.ref-list-box {
  container-type: inline-size;
}
.ref-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: clamp(1.5rem, 3.4cqw, 3.5rem);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--ui-size-15);
  line-height: 1.5;
  /* The reader hyphenates prose; a reference breaks at words. */
  hyphens: manual;
}
@container (min-width: 46rem) {
  .ref-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@container (min-width: 74rem) {
  .ref-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.ref-list__item {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  column-gap: 0.5rem;
  align-items: baseline;
  padding: 0.875rem 0.375rem 1rem 0;
  border-top: 1px solid rgb(var(--color-line));
  scroll-margin-top: calc(var(--reader-topbar-h, 4rem) + 1rem);
}
.ref-list__n {
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  color: rgb(var(--color-mute));
  font-variant-numeric: tabular-nums;
}
.ref-list__item:target {
  background: rgb(var(--color-chapter-pale, var(--color-paper)));
}
.ref-list__text {
  color: rgb(var(--color-ink) / 0.78);
  overflow-wrap: anywhere;
}
/* Who, then what: the rest is the source as the authors wrote it. */
.ref-list__text :deep(.ref-authors) {
  color: rgb(var(--color-ink));
  font-weight: 600;
}
.ref-list__text :deep(.ref-title) {
  color: rgb(var(--color-ink));
}
/* One colour for every reference link, visited or not (OPENBRAIN-145). */
.ref-list__text :deep(a),
.ref-list__text :deep(a:visited),
.ref-list__source,
.ref-list__source:visited {
  color: rgb(var(--color-accent));
  overflow-wrap: anywhere;
}
.ref-list__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.875rem;
  margin-top: 0.375rem;
}
.ref-list__source {
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  letter-spacing: 0.02em;
  line-height: 1.5;
  text-decoration: none;
}
.ref-list__source:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.ref-list__source:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
</style>
