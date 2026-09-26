<script setup>
/*
 * WidgetBreakout — an interactive widget placed inside the chapter prose.
 *
 * Two kinds, chosen per placement in src/widgets/placements.js:
 *   breakout  a card (title, blurb, credit) with "Open interactive", which
 *             mounts the widget full-screen in DemoModal. Nothing heavy loads
 *             until the reader asks for it.
 *   inline    the widget mounts in the flow of the text once the card
 *             scrolls near the viewport, with a "Full screen" escape hatch to
 *             the same modal. Used where the author wants the tool in the
 *             flow of the text (RetINaBox at the end of Circuit computations).
 *
 * Inline stages are full-bleed at desktop widths. The prose column clips its
 * horizontal overflow (TextComp .ml-text, OPENBRAIN-4), which also clips a
 * transformed descendant, so a stage that merely slid left was invisible
 * left of the divider (OPENBRAIN-37). Instead the stage is Teleported out of
 * the column into `#reader-stage-layer`, a full-width absolutely positioned
 * layer TextComp renders beside the column, and pinned at the vertical
 * position of a same-height slot the card leaves behind. Below the desktop
 * breakpoint, or wherever the layer does not exist (Storybook, tests), the
 * stage stays in flow inside the card.
 *
 * The widget views are unchanged, self-styled pages (their own masthead and
 * responsive CSS); this component only decides when and where to mount them.
 * Every view in src/widgets/embeds.js was smoke-tested down to 390px, so the
 * prose column is a width they already handle.
 */
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
} from "vue";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";
import FullBleed from "@/components/chapter/FullBleed.vue";
import { embedLoader, hasEmbed } from "@/widgets/embeds";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";

const props = defineProps({
  /** The `widget` object of a `{ type: "widget" }` paragraph. */
  placement: { type: Object, required: true },
});

const widgetId = computed(() => props.placement?.widgetId || "");
// A placement can ask to be the card below the two-column reader, where a
// desktop-sized tool would be squeezed into the column (narrowKind).
const narrow = useMediaQuery(READER_NARROW_QUERY);
const narrowed = computed(() => narrow.value && !!props.placement?.narrowKind);
const kind = computed(() => {
  const k = narrowed.value ? props.placement.narrowKind : props.placement?.kind;
  return k === "inline" ? "inline" : "breakout";
});
const title = computed(() => props.placement?.title || widgetId.value);
const embeddable = computed(() => hasEmbed(widgetId.value));

/* One async component per widget id, created lazily so the import() only
   fires when something actually renders it. */
const asyncCache = new Map();
function widgetComponent(id) {
  if (!asyncCache.has(id)) {
    asyncCache.set(
      id,
      defineAsyncComponent({
        loader: embedLoader(id),
        delay: 0,
      })
    );
  }
  return asyncCache.get(id);
}
const Widget = computed(() =>
  embeddable.value ? widgetComponent(widgetId.value) : null
);

const modalOpen = ref(false);
function openModal() {
  modalOpen.value = true;
}
function closeModal() {
  modalOpen.value = false;
}

/* Inline stages mount when they come within ~1.5 screens of the viewport.
   Without IntersectionObserver (old browsers, some test environments) they
   mount immediately — correct, just eager. */
const rootEl = ref(null);
const nearViewport = ref(false);
let observer = null;

onMounted(() => {
  if (kind.value !== "inline") return;
  if (typeof IntersectionObserver !== "function" || !rootEl.value) {
    nearViewport.value = true;
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        nearViewport.value = true;
        observer?.disconnect();
        observer = null;
        // Re-measure right before the reader reaches the stage: a
        // position-only reflow above it (same #container height) is not
        // something the ResizeObserver can see.
        scheduleSync();
      }
    },
    { rootMargin: "150% 0px" }
  );
  observer.observe(rootEl.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

const inlineMounted = computed(
  () => kind.value === "inline" && nearViewport.value && !modalOpen.value
);

/* Full-bleed at desktop widths (OPENBRAIN-37): FullBleed teleports the stage
   into TextComp's stage layer and keeps a same-height slot (OPENBRAIN-72). */
const fullBleed = ref(null);
const scheduleSync = () => fullBleed.value?.sync();

const headingId = computed(
  () => `widget-breakout-${props.placement?.placementId || widgetId.value}`
);
</script>

<template>
  <!-- <aside>, not <section>: the reader gives every section min-height:100vh
       and a 15rem bottom pad (index.css .chapter-reader section). -->
  <aside
    ref="rootEl"
    class="wb noHighlight"
    :class="[`wb--${kind}`, { 'wb--unavailable': !embeddable }]"
    :data-widget-breakout="widgetId"
    :aria-labelledby="headingId"
  >
    <header class="wb-head">
      <p class="wb-kicker">
        <span class="wb-dot" aria-hidden="true"></span>
        Interactive
        <span v-if="kind === 'breakout'"> · breakout box</span>
      </p>
      <h3 :id="headingId" class="wb-title">{{ title }}</h3>
      <p v-if="placement.blurb" class="wb-blurb">{{ placement.blurb }}</p>
      <p v-if="narrowed" class="wb-note">
        Made for a larger screen: it opens full screen.
      </p>
    </header>

    <!-- inline: the widget lives here once it is near the viewport. At
         desktop widths the stage teleports into TextComp's stage layer and
         this slot keeps its height (see the notes at the top). -->
    <FullBleed
      v-if="kind === 'inline'"
      ref="fullBleed"
      v-slot="{ floating }"
      class="wb-fb wb-slot"
    >
      <div
        class="wb-stage"
        :class="{ 'wb-stage--floating': floating }"
        :data-widget-stage="widgetId"
        :aria-labelledby="headingId"
      >
        <component :is="Widget" v-if="inlineMounted && Widget" />
        <div v-else-if="!embeddable" class="wb-missing">
          This interactive is not available in the reader yet.
        </div>
        <div v-else class="wb-stage-placeholder" aria-hidden="true"></div>
      </div>
    </FullBleed>

    <footer class="wb-foot">
      <div class="wb-actions">
        <button
          v-if="embeddable"
          type="button"
          class="wb-btn wb-btn--primary"
          @click="openModal"
        >
          {{ kind === "inline" ? "Full screen" : "Open interactive" }}
        </button>
        <RouterLink
          v-if="placement.route"
          :to="placement.route"
          class="wb-btn"
          target="_blank"
          rel="noopener"
        >
          Open in new tab
        </RouterLink>
      </div>
      <p v-if="placement.credit" class="wb-credit">{{ placement.credit }}</p>
    </footer>

    <DemoModal :show="modalOpen" :title="title" wide @close="closeModal">
      <component :is="Widget" v-if="modalOpen && Widget" />
    </DemoModal>
  </aside>
</template>

<style scoped>
.wb {
  --wb-pad: 1.5rem;
  /* Inside a chapter the card is the chapter's colour, not the global
     magenta (OPENBRAIN-98). */
  --wb-accent: var(--color-chapter, var(--color-accent));
  position: relative;
  margin: 2.5rem 0;
  border: 1px solid rgb(var(--color-line));
  border-left: 4px solid rgb(var(--wb-accent));
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  overflow: hidden;
}

/* Inline stages break out of the prose column at desktop widths (below), so
   the card must not clip them. */
.wb--inline {
  overflow: visible;
}

.wb-head {
  padding: var(--wb-pad) var(--wb-pad) 0.75rem;
}

.wb-kicker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}

.wb-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: rgb(var(--wb-accent));
}

.wb-title {
  margin: 0;
  padding: 0; /* global h3 rule adds vertical padding */
  font-size: 1.25rem;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.wb-blurb {
  margin: 0.5rem 0 0;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.55;
  color: rgb(var(--color-ink) / 0.8);
  max-width: 60ch;
}

.wb-note {
  margin: 0.5rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}

.wb-stage {
  margin: 0.75rem 0 0;
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-bg));
  /* Widget views bring their own page padding; keep ours minimal. */
  padding: 0.5rem;
  container-type: inline-size;
  /* A widget that fills the screen on its own route sizes to its content
     here (PhrenologyView). */
  --widget-min-h: 0px;
}

/*
 * Full-bleed inline stage (OPENBRAIN-37). The widget views size their layout
 * from the viewport (their own @media rules), so inside a ~460–580px prose
 * column a 1180px-wide tool like RetINaBox overflows. At the reader's
 * desktop breakpoint the stage is teleported into #reader-stage-layer (a
 * full-width layer beside the clipped prose column, see TextComp) and
 * absolutely positioned at the slot's offset, so it spans the real content
 * width (--app-w, scrollbar excluded — helper/appWidth.js, OPENBRAIN-4) and
 * paints over the fixed illustration pane the way a break in the reading
 * flow should. Nothing is transformed and nothing leaves the layer's box,
 * so the document's scrollable width is unchanged.
 */
.wb-stage--floating {
  /* FullBleed positions it; the stage only sheds the column spacing. */
  margin: 0;
  padding: 1.5rem clamp(1rem, 4vw, 4rem);
}

.wb-fb.fb-slot--vacated {
  margin-top: 0.75rem;
}

.wb-stage-placeholder {
  min-height: 12rem;
  background: repeating-linear-gradient(
    -45deg,
    rgb(var(--color-line) / 0.25) 0 8px,
    transparent 8px 16px
  );
  border-radius: var(--radius-control);
}

.wb-missing {
  padding: 1.5rem;
  font-size: 0.95rem;
  color: rgb(var(--color-mute));
}

.wb-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.9rem var(--wb-pad) var(--wb-pad);
}

.wb-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.wb-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.wb-btn:hover {
  background: rgb(var(--color-ink) / 0.06);
}

.wb-btn:focus-visible {
  outline: 3px solid rgb(var(--wb-accent));
  outline-offset: 2px;
}

.wb-btn--primary {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.wb-btn--primary:hover {
  background: rgb(var(--wb-accent));
  border-color: rgb(var(--wb-accent));
}

.wb-credit {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}

/* Below the two-column reader the card is a band across the page, like the
   figures (OPENBRAIN-98): rules above and below, the header in line with
   the text, the widget flush to the edges. It was a rounded card inside the
   column with the widget inset in a second frame. */
@media (max-width: 1023px) {
  .wb {
    width: var(--app-w, 100vw);
    margin-left: calc(
      50% - var(--app-w, 100vw) / 2
    ); /* the column is centred */
    border-width: 1px 0;
    border-left: 0;
    border-radius: 0;
  }
  /* The text column's own gutter (TextComp .ml-text), resolved against the
     band, which is as wide as the column's box. */
  .wb-head,
  .wb-foot {
    padding-left: var(--narrow-gutter, 0.9375rem);
    padding-right: var(--narrow-gutter, 0.9375rem);
  }
  .wb-kicker {
    color: rgb(var(--wb-accent));
  }
  .wb-stage {
    padding: 0;
    border-bottom: 0;
  }
}

[data-reduce-motion="1"] .wb-btn {
  transition: none;
}
</style>
