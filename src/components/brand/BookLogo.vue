<script setup>
/*
 * The book's logo (OPENBRAIN-197): the open book with the brain in it and
 * "the open brain .org" beside it. Stuart, 11 Nov: "remove the globe and
 * 'the open brain' and replace with our logo."
 *
 * It is the designers' file itself, public/publicAssets/images/logo.svg
 * (the one the home cover shows), inlined so it takes the ink of whatever
 * it sits on (`currentColor`) instead of the file's black: one artwork for
 * the paper bar, the drawer and a dark ground. The file's own <style> is
 * dropped, since a style inside an inline SVG applies to the whole page
 * (its `.st1` would restyle any other Illustrator export), and the rules
 * below say the same thing in the current colour.
 *
 * Decorative by itself: the link or heading around it carries the name.
 * `--logo-h` sets the height (default 44px). `mark` shows the book alone,
 * the left 125 of the artwork's 308.6 units, for a narrow bar; a parent
 * can do the same at a breakpoint by setting `--logo-crop: 1`.
 *
 * `icon` (OPENBRAIN-92) is the mark drawn as one of a set of line icons.
 * The artwork's 1.5-unit line is 0.43px at 30px tall, a third of the
 * icons beside it, and the brain's single line reads thinner still than
 * the book's three nested pages. So the strokes stop scaling with the
 * artwork and are given in screen pixels: `--logo-stroke` for the book
 * (0.85px) and `--logo-brain-stroke` for the brain (1.25px, the icons'
 * own), whose outline is drawn once more over the artwork
 * (helper/logoMark.js). Lighter lines for the book and a full one for the
 * brain is what makes the two weigh the same. Without `icon` nothing
 * changes: the outline is not drawn.
 */
// eslint-disable-next-line import/no-unresolved -- Vite ?raw suffix
import raw from "../../../public/publicAssets/images/logo.svg?raw";
import { brainOutline } from "@/helper/logoMark";

defineProps({
  /* The book and brain alone, without the words. */
  mark: { type: Boolean, default: false },
  /* A line icon: strokes in screen pixels, the brain's a little heavier. */
  icon: { type: Boolean, default: false },
});

const brain = brainOutline(raw);

const svg = raw
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<style[\s\S]*?<\/style>/, "")
  .replace(/\sid="Layer_1"/, "")
  .replace(/\sstyle="enable-background:[^"]*"/, "")
  .replace("<svg ", '<svg aria-hidden="true" focusable="false" ')
  .replace(
    /<\/svg>\s*$/,
    brain ? `<path class="logo-brain" d="${brain}"/></svg>` : "</svg>"
  )
  .trim();
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- our own bundled artwork -->
  <span
    class="book-logo"
    :class="{ 'book-logo--mark': mark, 'book-logo--icon': icon }"
    data-testid="book-logo"
    v-html="svg"
  ></span>
</template>

<style scoped>
/* 308.6 × 104.2 artwork; the book ends at x = 125. */
.book-logo {
  --logo-h: 44px;
  --logo-crop: 0;
  display: block;
  flex-shrink: 0;
  height: var(--logo-h);
  width: calc(var(--logo-h) * (2.9616 - var(--logo-crop) * 1.762));
  overflow: hidden;
  color: inherit;
}
.book-logo--mark {
  --logo-crop: 1;
}
.book-logo :deep(svg) {
  display: block;
  height: 100%;
  width: calc(var(--logo-h) * 2.9616);
  max-width: none;
}
.book-logo :deep(path),
.book-logo :deep(polygon) {
  fill: currentColor;
}
.book-logo :deep(.st0) {
  fill: none;
}
.book-logo :deep(.st1) {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-miterlimit: 10;
}
/* The brain's outline, over the artwork: only an icon draws it. */
.book-logo :deep(.logo-brain) {
  display: none;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.book-logo--icon :deep(.st1),
.book-logo--icon :deep(.logo-brain) {
  vector-effect: non-scaling-stroke;
}
.book-logo--icon :deep(.st1) {
  stroke-width: var(--logo-stroke, 0.85px);
}
.book-logo--icon :deep(.logo-brain) {
  display: inline;
  stroke-width: var(--logo-brain-stroke, 1.25px);
}
</style>
