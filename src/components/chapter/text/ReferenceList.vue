<script setup>
/*
 * A chapter's reference list, from the `references` table (OPENBRAIN-92).
 * Stuart, 24 Sep: "allows each ref in the end list to be a link to the
 * actual source". Each entry is the authors' own text (links in it work)
 * with a Source link (its DOI, else its URL), and an anchor (#ref-N) so a
 * citation can point at it.
 */
import { referenceDisplay } from "@/helper/chapterReferences";

defineProps({
  /** Rows of `references`, in order: number, raw_text, doi, url, … */
  references: { type: Array, required: true },
});
</script>

<template>
  <ol class="ref-list">
    <li
      v-for="r in references"
      :id="`ref-${r.number}`"
      :key="r.number"
      :value="r.number"
      class="ref-list__item"
    >
      <!-- The authors' own reference text (their HTML: italics, bold). -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="ref-list__text" v-html="referenceDisplay(r).html" />
      <a
        v-if="referenceDisplay(r).href"
        :href="referenceDisplay(r).href"
        class="ref-list__source"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ referenceDisplay(r).hrefLabel }}<span aria-hidden="true"> ↗</span>
      </a>
    </li>
  </ol>
</template>

<style scoped>
.ref-list {
  margin: 0;
  padding-left: 2.25rem;
  font-size: 0.9375rem;
  line-height: 1.55;
}
.ref-list__item {
  padding: 0.375rem 0;
  scroll-margin-top: calc(var(--reader-topbar-h, 4rem) + 1rem);
}
.ref-list__item::marker {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: rgb(var(--color-mute));
}
.ref-list__item:target {
  background: rgb(var(--color-chapter-pale, var(--color-paper)));
}
.ref-list__text :deep(a),
.ref-list__source {
  color: rgb(var(--color-accent));
  overflow-wrap: anywhere;
}
.ref-list__source {
  margin-left: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-decoration: none;
}
.ref-list__source:hover {
  text-decoration: underline;
}
</style>
