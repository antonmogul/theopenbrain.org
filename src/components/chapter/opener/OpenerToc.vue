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
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  /* From useChapterOutline.buildOutline(). */
  outline: { type: Array, default: () => [] },
  /* Element id so the hero's arrow can scroll here. */
  id: { type: String, default: "chapter-toc" },
});

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

    <nav class="opener-toc__list" aria-label="Chapter contents">
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
            <span class="opener-toc__num" aria-hidden="true">{{
              entry.label
            }}</span>
            <span class="opener-toc__label">{{ entry.title }}</span>
          </a>
          <ol v-if="entry.subsections.length" class="opener-toc__subs">
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
/* Frame: 1728 wide, padding 120 / 60 / 60, list = right half (864). */
.opener-toc {
  --toc-accent: rgb(var(--color-chapter));
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 0;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  padding: clamp(4rem, 6.9vw, 7.5rem) 0 3.75rem;
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
  padding: 0 3.75rem;
  max-width: 34.9vw; /* 602 / 1728 */
}
.opener-toc__h1 {
  margin: 0;
  font-weight: 450;
  font-size: clamp(2.25rem, 3.5vw, 3.75rem); /* 60px on the 1728 frame */
  line-height: 1.43;
  letter-spacing: 0.002em;
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

.opener-toc__list {
  padding-right: 3.75rem;
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
  padding: 1.125rem 0 1.125rem 2.625rem; /* 18 / 42 */
  line-height: 1.43;
}
.opener-toc__row--section {
  position: relative;
  border-top: 1px solid var(--toc-accent);
  color: var(--toc-accent);
  font-size: clamp(1.125rem, 1.42vw, 1.53rem); /* 24.5px */
}
/* 48px circle straddling the divider: its centre sits on the line. */
.opener-toc__num {
  position: absolute;
  left: -1.5rem;
  top: 0.75rem;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  background: var(--toc-accent);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: clamp(1.125rem, 1.42vw, 1.53rem);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.opener-toc__section--box .opener-toc__num {
  letter-spacing: 0.04em;
}
.opener-toc__subs {
  padding: 0 2.625rem;
}
.opener-toc__row--sub {
  border-top: 1px solid rgb(255 255 255 / 0.2); /* the frame's 0.2px white rule */
  color: #fff;
  font-size: clamp(1rem, 1.16vw, 1.25rem); /* 20px */
}
.opener-toc__row:hover .opener-toc__label,
.opener-toc__row--sub:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.opener-toc__row:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -2px;
}

/* Below the two-column reader the block stacks: title, then the list. */
@media (max-width: 1299px) {
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
}
</style>
