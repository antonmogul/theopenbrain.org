<script setup>
/* Breakouts occupy the reader width and keep their artwork inside their
 * own stage. Short boxes read as one viewport-sized panel; long manuscript
 * text remains in normal vertical flow until horizontal paging is designed.
 *
 * The pause (Stuart, 24 Sep and 13 Oct: "pause in the vertical scroll when
 * we enter a breakout box"). From the two-column breakpoint up, once the
 * box reaches the top bar it stays put, heading and opening text together,
 * for a short scroll (BX_PAUSE) before the page moves on: the box is a
 * different space, and the reader notices arriving in it. It is the whole
 * box that holds, never a title card on its own (the 7 Oct review), and
 * reduced motion turns it off. */
import { computed } from "vue";
import FullBleed from "@/components/chapter/FullBleed.vue";

const props = defineProps({
  /** The box section (kind "box"): id and title. */
  section: { type: Object, required: true },
  /** Its letter ("A", "B", …). */
  label: { type: String, default: "" },
});

const titleId = computed(() => `box-title-${props.section.id}`);
</script>

<template>
  <FullBleed
    v-slot="{ floating }"
    :stage-attrs="{ 'data-breakout-box': section.id }"
  >
    <div class="bx-pause" :class="{ 'bx-pause--on': floating }">
      <aside
        :id="section.id"
        class="bx"
        :class="{ 'bx--floating': floating }"
        :aria-labelledby="titleId"
      >
        <div class="bx-hold">
          <header class="bx-intro">
            <span v-if="label" class="bx-badge" aria-hidden="true">{{
              label
            }}</span>
            <p class="bx-kicker">Breakout box{{ label ? ` ${label}` : "" }}</p>
            <h2 :id="titleId" class="bx-title">{{ section.title }}</h2>
          </header>
        </div>
        <div class="bx-body">
          <slot />
        </div>
      </aside>
      <div v-if="floating" class="bx-pause-room" aria-hidden="true"></div>
    </div>
  </FullBleed>
</template>

<style scoped>
/* The chapter's palest ramp tone sets the box apart from the reading page
   (white), in every chapter's own colour. */
.bx {
  --bx-bg: rgb(var(--color-chapter-pale, var(--color-paper)));
  position: relative;
  margin: 2.5rem 0;
  border-top: 1px solid rgb(var(--color-ink));
  border-bottom: 1px solid rgb(var(--color-ink));
  background: var(--bx-bg);
  color: rgb(var(--color-ink));
}
.bx-intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.5rem 1.25rem 0.5rem;
}
.bx-badge {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 50%;
  background: rgb(var(--color-paper));
  font: 1.25rem/1 var(--font-mono);
  letter-spacing: 0.04em;
}
.bx-kicker {
  margin: 0;
  font: 0.75rem/1.3 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-ink) / 0.7);
}
.bx-title {
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(1.5rem, 2.4vw, 2.25rem);
  font-weight: 500;
  line-height: 1.25;
  text-wrap: balance;
}
.bx-body {
  padding: 0.5rem 1.25rem 2rem;
}

/* A compact heading and body share one screen where the source fits. */
.bx--floating {
  margin: 0;
  min-height: calc(100vh - var(--reader-topbar-h, 4rem));
  min-height: calc(100dvh - var(--reader-topbar-h, 4rem));
  padding: clamp(1.5rem, 4vh, 3rem) 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.bx--floating .bx-intro {
  max-width: calc(var(--reading-measure, 780px) + 4rem);
  margin: 0 auto;
  padding: 0 2rem 1.5rem;
}
.bx--floating .bx-title {
  font-size: clamp(1.75rem, 2.5vw, 2.5rem);
}
.bx--floating .bx-body {
  position: relative;
  width: 100%;
  max-width: calc(var(--reading-measure, 780px) + 4rem);
  margin: 0 auto;
  padding: 0 2rem;
}

/* The pause: the box sticks below the top bar while the room after it
   (BX_PAUSE, on the box's own colour, so the box just reads as
   taller) scrolls past, then leaves with it. */
.bx-pause--on {
  --bx-bg: rgb(var(--color-chapter-pale, var(--color-paper)));
  border-bottom: 1px solid rgb(var(--color-ink));
  background: var(--bx-bg);
}
.bx-pause-room {
  height: 45vh; /* BX_PAUSE */
}
.bx-pause--on > .bx {
  position: sticky;
  top: var(--reader-topbar-h, 4rem);
  border-bottom: 0;
}
/* Reduced motion: no pause. The reader's own setting decides
   (data-reduce-motion "1" on, "0" off); the OS setting only when unset.
   Plain selectors, never the global() wrapper: scoped CSS keeps only
   what is inside it, so the rule hit :root and hid the whole page. */
:root[data-reduce-motion="1"] .bx-pause-room {
  display: none;
}
:root[data-reduce-motion="1"] .bx-pause--on > .bx {
  position: relative;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .bx-pause-room {
    display: none;
  }
  :root:not([data-reduce-motion="0"]) .bx-pause--on > .bx {
    position: relative;
  }
}

/* The box covers the divider, so its paragraphs' figure marks (index.css)
   have no line to sit on. */
.bx--floating :deep(.animationTrigger[id]::before) {
  display: none;
}
</style>
