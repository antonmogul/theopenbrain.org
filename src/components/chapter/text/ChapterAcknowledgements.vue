<script setup>
/*
 * The chapter's acknowledgements, at the head of its back matter, above
 * the references (OPENBRAIN-200; Stuart, 17 Nov: "at the bottom, above
 * references, an acknowledgements section"). It takes the place and the
 * layout Further reading had (FurtherReading.vue, removed from History the
 * same day): the small mono title on the left, the text on the right from
 * 46rem of container width. Text comes from helper/chapterCredits.js.
 */
defineProps({
  paragraphs: { type: Array, required: true },
});
</script>

<template>
  <div
    v-if="paragraphs.length"
    id="acknowledgements"
    class="acknowledgements"
    role="region"
    aria-labelledby="acknowledgements-title"
    data-testid="chapter-acknowledgements"
  >
    <div class="acknowledgements__grid">
      <h2 id="acknowledgements-title" class="acknowledgements__title">
        Acknowledgements
      </h2>
      <div class="acknowledgements__body">
        <p v-for="(text, index) in paragraphs" :key="index">{{ text }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* FurtherReading's layout and type, unchanged. */
.acknowledgements {
  container-type: inline-size;
  width: 100%;
  padding: 0 0 clamp(2.5rem, 5cqw, 4rem);
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  letter-spacing: 0.1px;
  hyphens: manual;
}
.acknowledgements__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem 2rem;
}
.acknowledgements__title {
  margin: 0;
  padding: 0.25rem 0 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.acknowledgements__body {
  display: grid;
  gap: 0.75rem;
  max-width: 46rem;
}
.acknowledgements__body p {
  margin: 0;
  padding: 0;
  font-size: var(--type-body-sm-size);
  line-height: 1.5;
  color: rgb(var(--color-ink) / 0.78);
}

@container (min-width: 46rem) {
  .acknowledgements__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
  }
}
@container (min-width: 74rem) {
  .acknowledgements__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  }
}
</style>
