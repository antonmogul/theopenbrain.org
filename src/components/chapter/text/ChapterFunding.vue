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
.chapter-funding {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgb(var(--color-line));
  hyphens: manual;
  -webkit-hyphens: manual;
}
.chapter-funding__text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(var(--color-mute));
}
.chapter-funding__logo {
  display: block;
  border-radius: var(--radius-control);
}
.chapter-funding__logo img {
  display: block;
  width: 10rem;
  height: auto;
}
.chapter-funding__logo:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 4px;
}
</style>
