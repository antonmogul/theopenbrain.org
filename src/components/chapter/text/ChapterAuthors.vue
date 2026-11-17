<script setup>
/*
 * The chapter's authors, at the top of its introduction (OPENBRAIN-197).
 * Stuart, 11 Nov: "For chapter authors, add a circle to the left of the
 * name/affiliation with the face. And when clicked on, should take you to
 * the author's lab site."
 *
 * Each author is one link (circle, name and affiliation together, one tab
 * stop) to their lab site, in a new tab; an author without a site is plain
 * text. The circle shows the face when the data has a `photo`, and the
 * author's initials on the chapter colour until then or if the picture
 * fails to load. What to show comes from helper/chapterAuthors.js
 * (`authorCardsForModule`): nothing about a person lives here.
 */
import { reactive } from "vue";

defineProps({
  /* [{ name, affiliation, url, photo, initials }] */
  authors: { type: Array, default: () => [] },
});

// Photos that failed to load, by path: their author gets initials.
const broken = reactive(new Set());
</script>

<template>
  <ul
    v-if="authors.length"
    class="chapter-authors"
    data-testid="chapter-authors"
  >
    <li v-for="author in authors" :key="author.name">
      <component
        :is="author.url ? 'a' : 'div'"
        class="chapter-author"
        :class="{ 'chapter-author--link': author.url }"
        :href="author.url || undefined"
        :target="author.url ? '_blank' : undefined"
        :rel="author.url ? 'noopener noreferrer' : undefined"
        data-testid="chapter-author"
      >
        <span class="chapter-author__face" aria-hidden="true">
          <img
            v-if="author.photo && !broken.has(author.photo)"
            class="chapter-author__photo"
            :src="author.photo"
            alt=""
            width="48"
            height="48"
            loading="lazy"
            decoding="async"
            @error="broken.add(author.photo)"
          />
          <span v-else class="chapter-author__initials">{{
            author.initials
          }}</span>
        </span>
        <span class="chapter-author__text">
          <span class="chapter-author__name"
            >{{ author.name
            }}<span v-if="author.url" class="sr-only"
              >, lab site (opens in a new tab)</span
            ></span
          >
          <span v-if="author.affiliation" class="chapter-author__affiliation">{{
            author.affiliation
          }}</span>
        </span>
      </component>
    </li>
  </ul>
</template>

<style scoped>
.chapter-authors {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
  /* The page hyphenates (index.css); names and institutions should not. */
  hyphens: manual;
  -webkit-hyphens: manual;
}
.chapter-author {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  align-items: center;
  column-gap: 0.875rem;
  color: rgb(var(--color-ink));
  text-decoration: none;
  border-radius: var(--radius-control);
}
.chapter-author__face {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  overflow: hidden;
  background: rgb(var(--color-chapter-ground, var(--color-ink)));
  color: rgb(var(--color-chapter-on, var(--color-paper)));
  transition: box-shadow 0.12s ease;
}
.chapter-author__photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.chapter-author__initials {
  font-family: var(--font-mono);
  font-size: var(--ui-size-14);
  font-weight: 500;
  letter-spacing: 0.04em;
  line-height: 1;
}
.chapter-author__text {
  display: grid;
  gap: 0.125rem;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  line-height: 1.45;
}
.chapter-author__name {
  font-weight: 600;
}
.chapter-author__affiliation {
  color: rgb(var(--color-mute));
}
.chapter-author--link .chapter-author__name {
  text-decoration: underline;
  text-decoration-color: rgb(var(--color-line));
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
.chapter-author--link:hover .chapter-author__name {
  text-decoration-color: currentColor;
}
.chapter-author--link:hover .chapter-author__face {
  box-shadow:
    0 0 0 2px rgb(var(--color-paper)),
    0 0 0 3px rgb(var(--color-ink));
}
.chapter-author--link:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 4px;
}
</style>
