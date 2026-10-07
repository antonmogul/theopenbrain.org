<script setup>
/*
 * BrainAtlasCard — the brain atlas's card for the chosen chapter or area
 * (OPENBRAIN-127). A chapter's card says why the chapter is that part of
 * the brain, names its parts and links to the reader; an area no chapter
 * covers yet says what it does and which part of the book it belongs to.
 * BrainAtlas places it (under the title on phones, after the contents on
 * wide screens), owns the selection and may focus the title (tabindex -1)
 * when the card opens; the card only asks to be closed.
 */
import { computed } from "vue";
import { RAMP_NAMES } from "@/helper/chapterTheme";
import { areaById, areaHex, rampHex } from "@/helper/brain/areas";

const props = defineProps({
  /** The chosen chapter, from bookChapters(); wins over `area`. */
  chapter: { type: Object, default: null },
  /** The chosen area no chapter covers, from AREAS. */
  area: { type: Object, default: null },
  /** All of bookChapters(), to colour an area by its chapter. */
  chapters: { type: Array, default: () => [] },
  /** The catalog has answered, so a chapter without a route is a draft. */
  loaded: { type: Boolean, default: false },
  /** Closing hands back to the tour, so the button says so. */
  backToTour: { type: Boolean, default: false },
});
defineEmits(["close"]);

const colour = computed(() =>
  props.chapter
    ? rampHex(props.chapter.ramp)
    : props.area
      ? areaHex(props.area.id, props.chapters)
      : null
);
const eyebrow = computed(() => {
  const c = props.chapter;
  if (!c) return `Not in the book yet · ${RAMP_NAMES[props.area?.system]}`;
  const lead = c.number
    ? `Chapter ${c.number}`
    : props.loaded
      ? "In preparation"
      : "Chapter";
  return `${lead} · ${RAMP_NAMES[c.ramp]}`;
});
</script>

<template>
  <article v-if="chapter || area" class="card" :style="{ '--area': colour }">
    <p class="card__eyebrow">
      <span class="dot" aria-hidden="true" />
      {{ eyebrow }}
    </p>
    <template v-if="chapter">
      <h2 class="card__title" tabindex="-1">{{ chapter.title }}</h2>
      <p class="card__blurb">{{ chapter.why }}</p>
      <ul class="card__parts">
        <li v-for="id in chapter.areas" :key="id">
          <span class="card__part">{{ areaById(id)?.name }}</span>
          <span class="card__where">{{ areaById(id)?.where }}</span>
        </li>
      </ul>
      <router-link v-if="chapter.to" :to="chapter.to" class="card__cta">
        Read the chapter →
      </router-link>
      <p v-else-if="loaded" class="card__soon">
        This chapter is in preparation.
      </p>
    </template>
    <template v-else>
      <h2 class="card__title" tabindex="-1">{{ area.name }}</h2>
      <p class="card__where">{{ area.where }}</p>
      <p class="card__blurb">{{ area.blurb }}</p>
      <p class="card__soon">
        No chapter covers this part yet; it belongs with
        {{ RAMP_NAMES[area.system] }}.
      </p>
    </template>
    <button type="button" class="card__close" @click="$emit('close')">
      {{ backToTour ? "Back to the tour" : "Close" }}
    </button>
  </article>
</template>

<style scoped>
.card {
  display: grid;
  gap: 0.75rem;
  padding-top: 1.25rem;
  border-top: 2px solid var(--area);
  color: #fff;
  font-family: var(--font-body);
}
.card__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.6);
}
.dot {
  flex: none;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  background: var(--area);
}
.card__title {
  margin: 0;
  padding: 0;
  font-size: var(--type-subhead-size);
  line-height: 1.15;
  font-weight: 450;
}
.card__blurb {
  margin: 0;
  max-width: 34rem;
  font-size: var(--type-body-sm-size);
  line-height: 1.6;
  color: rgb(255 255 255 / 0.82);
}
.card__parts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}
.card__parts li {
  display: grid;
  gap: 0.125rem;
}
.card__part {
  font-size: var(--ui-size-15);
}
.card__where {
  margin: 0;
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(255 255 255 / 0.65);
}
.card__cta {
  justify-self: start;
  padding: 0.75rem 1.125rem;
  border: 1px solid #fff;
  border-radius: var(--radius-control);
  background: #fff;
  color: rgb(var(--color-dark-surface));
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  transition:
    background-color 0.15s,
    color 0.15s;
}
.card__cta:hover {
  background: transparent;
  color: #fff;
}
.card__soon {
  margin: 0;
  font-size: var(--ui-size-15);
  color: rgb(255 255 255 / 0.75);
}
.card__close {
  justify-self: start;
  /* A full-height tap target without changing the look. */
  padding: 0.75rem 0;
  margin: -0.5rem 0;
  border: 0;
  background: none;
  color: rgb(255 255 255 / 0.75);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 0.25em;
  cursor: pointer;
}
.card__close:hover {
  color: #fff;
}
.card__title:focus {
  outline: none;
}
.card__title:focus-visible,
.card__close:focus-visible,
.card__cta:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .card__cta {
    transition: none;
  }
}
</style>
