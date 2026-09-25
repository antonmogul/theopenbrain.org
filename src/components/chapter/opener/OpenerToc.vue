<script setup>
/*
 * Chapter opener — title + table of contents on the dark block
 * (OPENBRAIN-32, Figma attn/toc 1495:34232, history 3:80).
 *
 * Left half: the chapter title in the chapter's ramp colour with the
 * subtitle in white beneath it. Right half, starting on the 50/50 divider:
 * one row per section with an accent number circle straddling the divider,
 * and indented subsection rows. The dark ends with this block — the reading
 * body below is light. Accent = --color-chapter (set per module by the
 * router), never the global magenta.
 */
import { reactive } from "vue";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  /* From useChapterOutline.buildOutline(). */
  outline: { type: Array, default: () => [] },
  /* Element id so the hero's arrow can scroll here. */
  id: { type: String, default: "chapter-toc" },
});

// The outline fits one screen (Stuart, 24 Sep: it was longer than a
// fullscreen; OPENBRAIN-90): sections only, their parts behind a toggle, and
// the rows' spacing sized from the number of sections (--rows).
const openParts = reactive({});
function toggleParts(id) {
  openParts[id] = !openParts[id];
}

function go(anchor, event) {
  // Section ids are UUIDs that can start with a digit, which is not a valid
  // CSS selector — resolve by id, never with querySelector.
  const el = document.getElementById(anchor.replace(/^#/, ""));
  if (!el) return; // fall back to the default hash navigation
  event.preventDefault();
  const reduce =
    document.documentElement.getAttribute("data-reduce-motion") === "1";
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
</script>

<template>
  <section :id="id" class="opener-toc" aria-labelledby="opener-toc-title">
    <div class="opener-toc__title">
      <h1 id="opener-toc-title" class="opener-toc__h1">
        <span class="opener-toc__lead">{{ title }}:</span>
        <span v-if="subtitle" class="opener-toc__sub">{{ subtitle }}</span>
      </h1>
    </div>

    <nav
      class="opener-toc__list"
      aria-label="Chapter contents"
      :style="{ '--rows': outline.length || 1 }"
    >
      <ol class="opener-toc__sections">
        <li
          v-for="entry in outline"
          :key="entry.id"
          class="opener-toc__section"
          :class="`opener-toc__section--${entry.kind}`"
        >
          <a
            class="opener-toc__row opener-toc__row--section"
            :href="entry.anchor"
            @click="go(entry.anchor, $event)"
          >
            <!-- The number is part of the accessible name ("1 Story of the eye")
                 so repeated titles stay distinguishable. -->
            <span class="opener-toc__num">{{ entry.label }}</span>
            <span class="opener-toc__label">{{ entry.title }}</span>
          </a>
          <button
            v-if="entry.subsections.length"
            type="button"
            class="opener-toc__more"
            :aria-expanded="!!openParts[entry.id]"
            :aria-controls="`${id}-parts-${entry.id}`"
            :aria-label="`${openParts[entry.id] ? 'Hide' : 'Show'} the parts of ${entry.title}`"
            @click="toggleParts(entry.id)"
          >
            <span class="opener-toc__more-count">{{
              entry.subsections.length
            }}</span>
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </button>
          <ol
            v-if="entry.subsections.length"
            v-show="openParts[entry.id]"
            :id="`${id}-parts-${entry.id}`"
            class="opener-toc__subs"
          >
            <li v-for="sub in entry.subsections" :key="sub.id">
              <a
                class="opener-toc__row opener-toc__row--sub"
                :href="sub.anchor"
                @click="go(sub.anchor, $event)"
                >{{ sub.title }}</a
              >
            </li>
          </ol>
        </li>
      </ol>
    </nav>
  </section>
</template>

<style scoped>
/* Figma: Open-Brain-Chapters node 2029:26083 (the History TOC), a 1724-wide
   frame. Sizes below are that frame's px, as vw of 1724 with rem floors and
   ceilings: title 54px, section rows 22px, subsection rows 18px, circles
   40px, titles 53px right of the divider (OPENBRAIN-69). */
.opener-toc {
  --toc-accent: rgb(var(--color-chapter));
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 0;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  padding: clamp(2.5rem, 4.5vw, 5rem) 0 2.5rem;
  font-family: var(--font-body);
}
/* The divider line runs the full height of the block, on the 50/50 split. */
.opener-toc::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: var(--toc-accent);
  pointer-events: none;
}

.opener-toc__title {
  padding: 0 0 0 3.625rem; /* 58 */
  max-width: 47.3vw; /* 58 + a 758 text box, of 1724: the lead fits on one line */
}
.opener-toc__h1 {
  margin: 0;
  font-weight: 450;
  font-size: clamp(2.25rem, 3.13vw, 3.375rem); /* 54px */
  line-height: 1.429;
  letter-spacing: 0.1px;
  text-wrap: balance;
}
.opener-toc__lead {
  display: block;
  color: var(--toc-accent);
}
.opener-toc__sub {
  display: block;
  color: #fff;
}

/* The divider lines run to the frame's right edge (Figma); the rows carry
   the right margin instead of the list (OPENBRAIN-74). */
.opener-toc__list {
  letter-spacing: 0.1px;
  /* The reader hyphenates prose; titles in the contents break at words. */
  hyphens: manual;
}
/* Figma has no line above the first row: Introduction sits on the frame. */
.opener-toc__section--intro > .opener-toc__row--section {
  border-top: 0;
}
.opener-toc__sections,
.opener-toc__subs {
  list-style: none;
  margin: 0;
  padding: 0;
}
.opener-toc__row {
  display: flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
  padding: 1.0625rem 3.75rem 1.0625rem 3.3125rem; /* 17 / 53: a 66px row */
  line-height: 1.429;
}
/* Section rows share the screen: what the viewport leaves after the top bar
   and the block's padding, divided by the number of sections, within a 40px
   row and the design's 66px one. */
.opener-toc__section {
  position: relative;
}
.opener-toc__row--section {
  --row-pad: clamp(
    0.3125rem,
    calc(
      (100svh - var(--reader-topbar-h, 4rem) - 7.5rem) / var(--rows, 12) / 2 -
        0.7145em
    ),
    1.0625rem
  );
  padding-top: var(--row-pad);
  padding-bottom: var(--row-pad);
  position: relative;
  border-top: 1px solid var(--toc-accent);
  color: var(--toc-accent);
  font-size: clamp(1.125rem, 1.28vw, 1.375rem); /* 22px */
  font-weight: 450; /* IBM Plex Sans Text */
}
/* 40px circle straddling the divider: its centre sits on the line and on
   the first line of the title. */
.opener-toc__num {
  position: absolute;
  left: -1.25rem;
  top: calc(var(--row-pad, 1.0625rem) + 0.7145em - 1.25rem);
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: var(--toc-accent);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: clamp(1.125rem, 1.28vw, 1.375rem); /* 22px */
  font-weight: 400;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.opener-toc__section--box .opener-toc__num {
  letter-spacing: 0.04em;
}
.opener-toc__subs {
  padding: 0 0 0 3.3125rem; /* rules start under the titles, at 53 */
}
.opener-toc__row--sub {
  padding: 0.5rem 3.75rem 0.5rem 0; /* a 41px row */
  border-top: 1px solid rgb(142 142 147 / 0.45); /* the frame's 0.25px #8E8E93 */
  color: #fff;
  font-size: clamp(1rem, 1.04vw, 1.125rem); /* 18px */
  font-weight: 450;
}
.opener-toc__row:hover .opener-toc__label,
.opener-toc__row--sub:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
/* Rows with parts leave room for their toggle at the right end. */
.opener-toc__section:has(> .opener-toc__more) > .opener-toc__row--section {
  padding-right: 6.5rem;
}
/* The parts toggle sits at the row's right end. */
.opener-toc__more {
  position: absolute;
  top: 0.625rem;
  right: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 44px;
  min-height: 40px;
  padding: 0 0.5rem;
  border: 0;
  background: transparent;
  color: rgb(255 255 255 / 0.7);
  font: 0.75rem/1 var(--font-mono);
  cursor: pointer;
}
.opener-toc__more svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  transition: transform 0.15s ease;
}
.opener-toc__more[aria-expanded="true"] svg {
  transform: rotate(180deg);
}
.opener-toc__more:hover {
  color: #fff;
}
.opener-toc__more:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -2px;
}
.opener-toc__row:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -2px;
}

/* Below the two-column reader the block stacks: title, then the list. */
@media (max-width: 1023px) {
  .opener-toc {
    grid-template-columns: 1fr;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
  .opener-toc::before {
    display: none;
  }
  .opener-toc__title {
    max-width: none;
    padding: 0 0 2rem;
  }
  .opener-toc__list {
    padding: 0 0 0 1.5rem;
  }
  .opener-toc__row {
    padding-right: 0;
  }
}
</style>
