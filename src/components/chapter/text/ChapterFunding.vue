<script setup>
/*
 * Who funded the chapter, under its authors (OPENBRAIN-200). Stuart,
 * 17 Nov: "underneath the authors, let's put funding info: 'This chapter
 * was funded by The Montreal Neurological Institute (The Neuro)' along
 * with this logo, linked to https://www.mcgill.ca/neuro/".
 *
 * Set like the authors' affiliation lines (mono, the UI size, muted), the
 * funder's logo under the line; the logo is the link, in a new tab. What
 * to show comes from helper/chapterCredits.js (`creditsForModule`).
 */
defineProps({
  /* { text, url, logo: { src, alt, width, height } | null } */
  funding: { type: Object, required: true },
});
</script>

<template>
  <div class="chapter-funding" data-testid="chapter-funding">
    <p class="chapter-funding__kicker">Funding</p>
    <p class="chapter-funding__text">{{ funding.text }}</p>
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
  </div>
</template>

<style scoped>
/* Stuart, 18 Nov: "make that section 'pop' a tiny bit more". A panel on the
   chapter's palest step with a rule in the chapter colour, a small kicker,
   the line in ink rather than muted grey, and the logo on the same row from
   640px (stacked below that). */
.chapter-funding {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas: "kicker" "text" "logo";
  align-items: center;
  column-gap: 1.5rem;
  row-gap: 0.5rem;
  margin-top: 1.75rem;
  padding: 1rem 1.25rem 1.125rem;
  background: rgb(var(--color-chapter-pale, var(--color-paper)));
  border-left: 4px solid rgb(var(--color-chapter, var(--color-accent)));
  border-radius: 0 var(--radius-control) var(--radius-control) 0;
  hyphens: manual;
  -webkit-hyphens: manual;
}
@media (min-width: 640px) {
  .chapter-funding {
    grid-template-columns: 1fr auto;
    grid-template-areas: "kicker logo" "text logo";
  }
}
.chapter-funding__kicker {
  grid-area: kicker;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-chapter-deep, var(--color-ink)));
}
.chapter-funding__text {
  grid-area: text;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-14);
  line-height: 1.45;
  color: rgb(var(--color-ink));
}
.chapter-funding__logo {
  grid-area: logo;
  display: block;
  justify-self: start;
  margin-top: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border-radius: var(--radius-control);
}
.chapter-funding__logo img {
  display: block;
  width: 9.5rem;
  height: auto;
}
.chapter-funding__logo:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 4px;
}
</style>
