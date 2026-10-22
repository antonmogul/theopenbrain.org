<script setup>
/*
 * ExploreCard — an "Explore more" segment of a breakout box (OPENBRAIN-142).
 *
 * Stuart, 7 Oct, on the Hippocrates boxes: "a picture of Hippocrates on the
 * left and the attached drawing related to humoral theory … next to each
 * image you could have text that says something like 'Explore more about
 * Hippocrates' view on epilepsy' and 'Explore more about humoral theory',
 * and when you click on one then it reveals the relevant text and another
 * related image."
 *
 * The card is the image (with its legend) beside a title and one real
 * button; the paragraph it belongs to, figure included, is the default slot
 * and stays in the DOM folded (`hidden`), so highlights, the timeline and
 * the editor still find it by id. The button carries aria-expanded and
 * aria-controls, and opening just shows the panel: the only motion is a
 * short fade-in, off under reduced motion. The page gets taller when a
 * panel opens, so scroll-linked figures re-measure (ScrollTrigger.refresh,
 * as FullBleed does). Below 768px the image stacks above the text.
 *
 * Authored on the paragraph row as content.explore (chapterTransform's
 * exploreFor normalises it); SectionComp wraps the paragraph in this when
 * it is set.
 */
import { computed, nextTick, ref } from "vue";
import ScrollTrigger from "gsap/ScrollTrigger";
import { imageUrl } from "@/editor/media.mjs";

const props = defineProps({
  /** { title, prompt, image?: { src, alt }, legend? } from exploreFor(). */
  explore: { type: Object, required: true },
  /** The paragraph's id, for the panel's id and aria-controls. */
  paragraphId: { type: String, required: true },
  /** Start open (stories, print). */
  defaultOpen: { type: Boolean, default: false },
  paired: { type: Boolean, default: false },
});

const open = ref(props.defaultOpen);
const panelId = computed(() => `explore-panel-${props.paragraphId}`);
const titleId = computed(() => `explore-title-${props.paragraphId}`);

function toggle() {
  open.value = !open.value;
  nextTick(() => ScrollTrigger.refresh());
}
</script>

<template>
  <!-- A div, not a <section>: the reader gives every section in
       .chapter-reader a full screen's height (index.css). -->
  <div
    class="xc"
    :class="{
      'xc--open': open,
      'xc--no-image': !explore.image,
      'xc--paired': paired,
    }"
    :data-explore="paragraphId"
    role="group"
    :aria-labelledby="titleId"
  >
    <div class="xc-card">
      <figure v-if="explore.image" class="xc-figure">
        <img
          class="xc-img"
          :src="imageUrl(explore.image.src)"
          :alt="explore.image.alt || ''"
          loading="lazy"
          decoding="async"
        />
        <figcaption v-if="explore.legend" class="xc-legend">
          {{ explore.legend }}
        </figcaption>
      </figure>
      <div class="xc-lead">
        <p class="xc-kicker">Explore</p>
        <h3 :id="titleId" class="xc-title">{{ explore.title }}</h3>
        <button
          type="button"
          class="xc-btn"
          :aria-expanded="open ? 'true' : 'false'"
          :aria-controls="panelId"
          @click="toggle"
        >
          <span>{{ open ? "Hide" : explore.prompt }}</span>
          <svg
            class="xc-chevron"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>
      </div>
    </div>
    <div :id="panelId" class="xc-panel" :hidden="!open">
      <div class="xc-panel-inner">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* A card on the box's pale ground: paper, a hairline, the chapter's colour
   down the left edge like the widget breakout card (OPENBRAIN-98). */
.xc {
  --xc-accent: rgb(var(--color-chapter, var(--color-accent)));
  margin: 0 0 1.5rem;
  border: 1px solid rgb(var(--color-line));
  border-left: 4px solid var(--xc-accent);
  border-radius: 0;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  overflow: hidden;
}
.xc-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}
.xc-figure {
  margin: 0;
  background: rgb(var(--color-chapter-pale, var(--color-bg)));
}
.xc-img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  /* Crop from the top: a bust keeps its head, a diagram its title. */
  object-position: center top;
}
.xc-legend {
  margin: 0;
  padding: 0.5rem 0.9rem 0.6rem;
  font: 400 var(--ui-size-11) / 1.4 var(--font-mono);
  color: rgb(var(--color-ink) / 0.7);
}
.xc-lead {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.1rem 1.25rem 1.25rem;
}
.xc-kicker {
  margin: 0;
  font: 400 var(--ui-size-11) / 1.3 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-ink) / 0.7);
}
.xc-title {
  margin: 0 0 0.35rem;
  font-family: var(--font-body);
  font-size: clamp(1.15rem, 1.4vw, 1.4rem);
  font-weight: 500;
  line-height: 1.25;
  text-wrap: balance;
}
.xc-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding: 0.45rem 0.9rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 0;
  min-height: 44px;
  background: transparent;
  color: rgb(var(--color-ink));
  font: 400 var(--ui-size-12) / 1.2 var(--font-mono);
  letter-spacing: 0.04em;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.xc-btn:hover {
  background: rgb(var(--color-chapter-pale, var(--color-bg)));
}
.xc-btn:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.xc-chevron {
  flex: none;
  transition: transform 0.2s ease;
}
.xc--open .xc-chevron {
  transform: rotate(180deg);
}

/* The folded paragraph: its own text, figure and images, in the prose's
   style (the .P padding gives the bottom its room). */
.xc-panel {
  border-top: 1px solid rgb(var(--color-line));
}
.xc-panel-inner {
  padding: 1.25rem 1.25rem 0.25rem;
}
/* Inline figure shells normally bleed to the mobile viewport. A disclosure
   is a narrower reading container: keep its complete artwork, legend and
   expand control inside the panel rather than clipping that viewport bleed. */
.xc-panel-inner :deep(.fig-shell--inline) {
  width: 100%;
  min-width: 0;
  margin-inline: 0;
}
.xc--open .xc-panel-inner {
  animation: xc-in 0.3s ease-out;
}
@keyframes xc-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
/* Reduced motion: no fade, no chevron turn. The reader's own setting
   decides (data-reduce-motion "1" on, "0" off), the OS setting when unset.
   Plain selectors, never :global() (see BreakoutBox). */
:root[data-reduce-motion="1"] .xc--open .xc-panel-inner,
:root[data-reduce-motion="1"] .xc-chevron {
  animation: none;
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .xc--open .xc-panel-inner,
  :root:not([data-reduce-motion="0"]) .xc-chevron {
    animation: none;
    transition: none;
  }
}

/* From the tablet breakpoint the image sits on the left (Stuart: "a
   picture of Hippocrates on the left"), the lead beside it. */
@media (min-width: 768px) {
  .xc-card {
    grid-template-columns: minmax(11rem, 2fr) 3fr;
  }
  .xc--no-image .xc-card {
    grid-template-columns: 1fr;
  }
  .xc-img {
    aspect-ratio: 4 / 5;
    height: 100%;
  }
  .xc-figure {
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgb(var(--color-line));
  }
  .xc-figure .xc-img {
    flex: 1 1 auto;
    min-height: 0;
    max-height: 22rem;
  }
  .xc-lead {
    justify-content: center;
    padding: 1.4rem 1.5rem 1.5rem;
  }
  .xc-btn {
    margin-top: 0.25rem;
  }
  .xc-panel-inner {
    padding: 1.5rem 1.5rem 0.25rem;
  }
}
/* Paired previews keep the complete historical artwork visible. */
.xc--paired .xc-card {
  grid-template-columns: minmax(0, 1fr);
}
.xc--paired .xc-img {
  height: 16rem;
  max-height: none;
  aspect-ratio: auto;
  object-fit: contain;
}
.xc--paired .xc-figure {
  border-right: 0;
}
.xc--paired .xc-lead {
  padding: 1.25rem;
}
.xc--paired .xc-panel-inner {
  overflow-wrap: anywhere;
}
@media print {
  .xc-panel[hidden] {
    display: block;
  }
  .xc-btn {
    display: none;
  }
}
</style>
