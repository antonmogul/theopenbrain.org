<script setup>
/*
 * A breakout box, full screen (OPENBRAIN-91). Stuart, 24 Sep: "Breakout
 * boxes currently indistinguishable from regular scrolling. Should go full
 * screen (lose center divider line, and pause scrolling for a bit, like in
 * retina chapter)."
 *
 * From the two-column breakpoint up, the box floats full width over the
 * figure pane and the divider (FullBleed, as the full-screen figures do).
 * Its title card holds on screen for a short scroll before the text comes
 * up (the pause), and the box's own figures render inline in its text
 * while it covers the pane (useInlineFigures reads FullBleed's state).
 * Below the breakpoint it is a tinted card in the flow.
 *
 * The box's text is the slot: SectionComp renders its section into it.
 */
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
          <span v-if="floating" class="bx-cue" aria-hidden="true">↓</span>
        </header>
      </div>
      <div class="bx-body">
        <slot />
      </div>
    </aside>
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

/* Full screen: the title card holds for a short scroll (the pause), then
   the text comes up in a centred column. */
.bx--floating {
  margin: 0;
}
.bx--floating .bx-hold {
  height: calc(100vh - var(--reader-topbar-h, 4rem) + 35vh);
}
.bx--floating .bx-intro {
  position: sticky;
  top: var(--reader-topbar-h, 4rem);
  height: calc(100vh - var(--reader-topbar-h, 4rem));
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}
.bx--floating .bx-badge {
  width: 4.5rem;
  height: 4.5rem;
  font-size: 1.75rem;
}
.bx--floating .bx-title {
  max-width: 24ch;
  font-size: clamp(2rem, 3.4vw, 3.25rem);
}
.bx-cue {
  margin-top: 1.5rem;
  font-size: 1.25rem;
  opacity: 0.6;
}
.bx--floating .bx-body {
  position: relative;
  max-width: calc(var(--reading-measure, 780px) + 4rem);
  margin: 0 auto;
  padding: 0 2rem 6rem;
}

/* The box covers the divider, so its paragraphs' figure marks (index.css)
   have no line to sit on. */
.bx--floating :deep(.animationTrigger[id]::before) {
  display: none;
}

/* Reduced motion: no hold. The reader's own setting decides
   (data-reduce-motion "1" on, "0" off); the OS setting only when unset. */
:global(:root[data-reduce-motion="1"]) .bx--floating .bx-hold {
  height: auto;
}
:global(:root[data-reduce-motion="1"]) .bx--floating .bx-intro {
  position: static;
  height: auto;
  padding: 5rem 2rem 3rem;
}
@media (prefers-reduced-motion: reduce) {
  :global(:root:not([data-reduce-motion="0"])) .bx--floating .bx-hold {
    height: auto;
  }
  :global(:root:not([data-reduce-motion="0"])) .bx--floating .bx-intro {
    position: static;
    height: auto;
    padding: 5rem 2rem 3rem;
  }
}
</style>
