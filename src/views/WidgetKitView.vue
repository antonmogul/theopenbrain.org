<script setup>
/*
 * WidgetKitView — /widget-kit, public (OPENBRAIN-165).
 *
 * The page anyone can be sent to build a widget for the book: the skill to
 * download for Claude, its files to read, and the guide. The guide is
 * docs/widget-kit-guide.md itself (imported raw, rendered with marked), so
 * the page and the repo's copy can't drift; the kit files are the ones the
 * creator dashboard links (public/widget-kit/, rebuilt with
 * `npm run widget-kit`).
 */
import { computed, onMounted } from "vue";
import { marked } from "marked";
// eslint-disable-next-line import/no-unresolved -- Vite ?raw suffix
import guide from "../../docs/widget-kit-guide.md?raw";

const KIT = "/widget-kit";

// The guide's own H1 is this page's heading.
const html = computed(() =>
  marked.parse(guide.replace(/^# .*\n+/, ""), { gfm: true })
);

onMounted(() => {
  document.title = "Widget kit · The Open Brain";
});
</script>

<template>
  <main class="kit">
    <header class="kit__band">
      <div class="kit__inner">
        <p class="kit__eyebrow">
          <router-link to="/" class="kit__home">The Open Brain</router-link> ·
          For authors and designers
        </p>
        <h1 class="kit__h1">Build a widget for the book</h1>
        <p class="kit__lede">
          Interactive figures for The Open Brain are single HTML files made in
          Claude with the Open Brain widget skill. Download the skill, add it to
          Claude, and follow the guide below.
        </p>
        <div class="kit__actions">
          <a
            class="kit__btn kit__btn--primary"
            :href="`${KIT}/open-brain-widget.zip`"
            download
            >Download the skill (.zip)</a
          >
          <a
            class="kit__btn"
            :href="`${KIT}/open-brain-widget/SKILL.md`"
            target="_blank"
            rel="noopener"
            >Skill</a
          >
          <a
            class="kit__btn"
            :href="`${KIT}/open-brain-widget/design.md`"
            target="_blank"
            rel="noopener"
            >Design rules</a
          >
          <a
            class="kit__btn"
            :href="`${KIT}/open-brain-widget/template.html`"
            download
            >Starter template</a
          >
        </div>
      </div>
    </header>

    <!-- eslint-disable-next-line vue/no-v-html -- the repo's own guide -->
    <article class="kit__inner kit__guide" v-html="html"></article>
  </main>
</template>

<style scoped>
.kit {
  min-height: 100vh;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}
.kit__inner {
  box-sizing: border-box;
  width: 100%;
  max-width: 46rem;
  margin: 0 auto;
  padding: 0 1.25rem;
}
.kit__band {
  padding: 3.5rem 0 3rem;
  background: rgb(var(--color-dark-surface));
  color: #fff;
}
.kit__eyebrow {
  margin: 0 0 1rem;
  font: 400 var(--ui-size-12) / 1.4 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.7);
}
.kit__home {
  color: inherit;
  text-decoration: none;
}
.kit__home:hover {
  color: #fff;
}
.kit__h1 {
  margin: 0;
  padding: 0; /* the global h1 rule adds some */
  font: 600 var(--type-subhead-size, 2.25rem) / 1.2 var(--font-ui);
}
.kit__lede {
  margin: 1rem 0 0;
  max-width: 36em;
  font: 400 var(--ui-size-18) / 1.55 var(--font-ui);
  color: rgb(255 255 255 / 0.85);
}
.kit__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
}
.kit__btn {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1.1rem;
  border: 1px solid rgb(255 255 255 / 0.5);
  color: #fff;
  font: 400 var(--ui-size-13) / 1.2 var(--font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
}
.kit__btn:hover {
  background: rgb(255 255 255 / 0.1);
}
.kit__btn--primary {
  border-color: #fff;
  background: #fff;
  color: rgb(var(--color-dark-surface));
}
.kit__btn--primary:hover {
  background: rgb(255 255 255 / 0.85);
}
.kit__btn:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.kit__guide {
  padding-top: 2.5rem;
  padding-bottom: 5rem;
  font-size: var(--type-body-sm-size, 1.0625rem);
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.kit__guide :deep(h2) {
  margin: 2.5rem 0 0.75rem;
  padding: 0;
  font: 600 var(--ui-size-20) / 1.3 var(--font-ui);
}
.kit__guide :deep(p),
.kit__guide :deep(ul),
.kit__guide :deep(ol) {
  margin: 0 0 1rem;
}
.kit__guide :deep(ul),
.kit__guide :deep(ol) {
  padding-left: 1.25rem;
}
.kit__guide :deep(ul) {
  list-style: disc;
}
.kit__guide :deep(ol) {
  list-style: decimal;
}
.kit__guide :deep(li) {
  margin-bottom: 0.4rem;
}
.kit__guide :deep(code) {
  padding: 0.05em 0.3em;
  background: rgb(var(--color-ink) / 0.06);
  font: 0.9em var(--font-mono);
  hyphens: none;
}
.kit__guide :deep(a) {
  color: rgb(var(--color-accent));
}
</style>
