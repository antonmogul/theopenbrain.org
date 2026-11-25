<script setup>
/*
 * Who funded the chapter, under its authors (OPENBRAIN-200). Stuart,
 * 17 Nov: "underneath the authors, let's put funding info: 'This chapter
 * was funded by The Montreal Neurological Institute (The Neuro)' along
 * with this logo, linked to https://www.mcgill.ca/neuro/".
 *
 * One row, built like an author's (ChapterAuthors): the funder's logo on
 * the left where a face is, the line on its right in the same mono face
 * and size, on a quiet grey panel (Maura, 25 Nov, OPENBRAIN-91). The logo
 * is the link, in a new tab, and stands on the panel with no chip of its
 * own, so its file needs a transparent ground. What to show comes from
 * helper/chapterCredits.js (`creditsForModule`).
 */
defineProps({
  /* { text, url, logo: { src, alt, width, height } | null } */
  funding: { type: Object, required: true },
});
</script>

<template>
  <div
    class="chapter-funding"
    :class="{ 'chapter-funding--logo': funding.logo }"
    data-testid="chapter-funding"
  >
    <component
      :is="funding.url ? 'a' : 'span'"
      v-if="funding.logo"
      class="chapter-funding__logo"
      :href="funding.url || undefined"
      :target="funding.url ? '_blank' : undefined"
      :rel="funding.url ? 'noopener noreferrer' : undefined"
      data-testid="chapter-funding-link"
    >
      <img
        :src="funding.logo.src"
        :alt="
          funding.url
            ? `${funding.logo.alt} (opens in a new tab)`
            : funding.logo.alt
        "
        :width="funding.logo.width"
        :height="funding.logo.height"
        loading="lazy"
        decoding="async"
      />
    </component>
    <p class="chapter-funding__text">{{ funding.text }}</p>
  </div>
</template>

<style scoped>
/* A panel a step off the paper (Stuart, 18 Nov: "make that section 'pop' a
   tiny bit more"), in grey rather than the chapter's colour and with no
   rule down its left side (Maura, 25 Nov): the hairline grey at about half
   strength, #f0f0ed on white. The row is an author's row: the picture's
   column, 0.875rem, then the text. */
.chapter-funding {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  column-gap: 0.875rem;
  margin-top: 1.75rem;
  padding: 0.875rem 1rem;
  background: rgb(var(--color-line) / 0.58);
  border-radius: var(--radius-control);
  hyphens: manual;
  -webkit-hyphens: manual;
}
.chapter-funding--logo {
  grid-template-columns: auto minmax(0, 1fr);
}
/* The authors' text: mono at the UI size, in ink. */
.chapter-funding__text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(var(--color-ink));
}
.chapter-funding__logo {
  display: block;
  border-radius: var(--radius-control);
}
/* As tall as a face (3rem) where the logo allows: a wide one is held to
   7.5rem across, a little less on a phone so the line keeps its room. */
.chapter-funding__logo img {
  display: block;
  width: auto;
  max-width: 6.5rem;
  height: auto;
  max-height: 3rem;
}
@media (min-width: 480px) {
  .chapter-funding__logo img {
    max-width: 7.5rem;
  }
}
.chapter-funding__logo:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 4px;
}
</style>
