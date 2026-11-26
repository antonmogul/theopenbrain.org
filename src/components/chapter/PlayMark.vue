<script setup>
/*
 * The reader's one play button (OPENBRAIN-87; Maura, 25 Nov, on Fig 24:
 * "This play button has a different size and padding than the one on the
 * thumbnails. Please choose one style and apply it to the whole page").
 *
 * The style is the one the Loewi figure already shows in the book: a white
 * square (the book's controls have no rounded corners; uploaded widgets get
 * the same rule from widgetHost) with the rounded triangle in the plate's
 * dark, the triangle 42% of the square and centred by its weight, as that
 * figure's large button has it. Every size is this one drawing scaled, so
 * the padding around the triangle is the same share of the button anywhere:
 * a video's poster, a gallery's thumbnail and tile, and the gallery's own
 * play and pause.
 *
 * It is a mark, not a button: the control that holds it (a poster, a
 * thumbnail, the slideshow button) carries the name and the press. Set its
 * size with `--play-mark-size` (a length, or 100% of the control).
 *
 * `cut` is for a button on a ground this file cannot know (the dark pane,
 * paper below 1024px, a coloured breakout box): the square takes the ink it
 * is given and the triangle is a hole in it, so the ground shows through.
 * Over a picture the triangle is always the dark, so it reads on any photo.
 */
defineProps({
  /** "play" | "pause" (the slideshow's button shows what a press does). */
  icon: { type: String, default: "play" },
  cut: { type: Boolean, default: false },
});

/* One path, even-odd: the square, with the icon as a hole in it. The
   triangle is the Loewi figure's, scaled into a 100-unit square. */
const SQUARE = "M0 0H100V100H0Z";
const ICONS = {
  play: "M37.7 32.3C37.7 29.8 40.5 28.2 42.7 29.5L73 47.1C75.2 48.4 75.2 51.6 73 52.9L42.7 70.5C40.5 71.8 37.7 70.2 37.7 67.7Z",
  pause:
    "M35 29H43A2 2 0 0 1 45 31V69A2 2 0 0 1 43 71H35A2 2 0 0 1 33 69V31A2 2 0 0 1 35 29Z" +
    "M57 29H65A2 2 0 0 1 67 31V69A2 2 0 0 1 65 71H57A2 2 0 0 1 55 69V31A2 2 0 0 1 57 29Z",
};
</script>

<template>
  <span
    class="play-mark"
    :class="{ 'play-mark--cut': cut }"
    :data-icon="icon === 'pause' ? 'pause' : 'play'"
    aria-hidden="true"
  >
    <svg viewBox="0 0 100 100" focusable="false">
      <path fill-rule="evenodd" :d="SQUARE + (ICONS[icon] || ICONS.play)" />
    </svg>
  </span>
</template>

<style scoped>
.play-mark {
  --play-mark-ink: rgb(var(--color-dark-surface, 28 28 28));
  display: block;
  flex: none;
  width: var(--play-mark-size, 2.5rem);
  aspect-ratio: 1;
  color: #fff;
  /* The dark shows through the hole only: kept inside the square's edge, so
     no dark fringe is drawn around the white. */
  background: linear-gradient(var(--play-mark-ink), var(--play-mark-ink))
    center / 72% 72% no-repeat;
  box-shadow: var(--play-mark-shadow, none);
  transition: transform 0.15s ease;
}
.play-mark svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentColor;
}
.play-mark--cut {
  color: inherit;
  background: none;
}
/* The control that holds it answers the pointer and the keyboard in the
   chapter's colour, as the Loewi figure's button does. */
:is(button, a):is(:hover, :focus-visible) .play-mark:not(.play-mark--cut) {
  --play-mark-ink: rgb(var(--color-chapter-deep, var(--color-accent)));
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .play-mark {
    transition: none;
  }
}
</style>
