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
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import ScrollTrigger from "gsap/ScrollTrigger";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";
import { STAGE_DESKTOP_QUERY, STAGE_LAYER_ID } from "@/helper/stageLayer";
import { WIDGET_EMBEDS, hasEmbed } from "@/widgets/embeds";

const props = defineProps({
  /** The `widget` object of a `{ type: "widget" }` paragraph. */
  placement: { type: Object, required: true },
});

const widgetId = computed(() => props.placement?.widgetId || "");
const kind = computed(() =>
  props.placement?.kind === "inline" ? "inline" : "breakout"
);
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
        loader: WIDGET_EMBEDS[id],
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

/*
 * Full-bleed inline stage (OPENBRAIN-37). `layer` is TextComp's
 * #reader-stage-layer; `wide` tracks the reader's desktop breakpoint. When
 * both hold, the stage teleports into the layer, absolutely positioned at
 * the slot's offset from the layer, and the slot takes the stage's height so
 * the prose flows around it exactly as if it were still in place.
 */
const layer = ref(null);
const wide = ref(false);
const slotEl = ref(null);
const stageEl = ref(null);
const stageTop = ref(0);
const slotHeight = ref(0);

const teleported = computed(
  () => kind.value === "inline" && wide.value && !!layer.value
);
const slotStyle = computed(() =>
  teleported.value ? { height: `${slotHeight.value}px` } : null
);
const stageStyle = computed(() =>
  teleported.value ? { top: `${stageTop.value}px` } : null
);

let mql = null;
let resizeObserver = null;
let syncPending = false;

function syncStage() {
  if (!teleported.value || !slotEl.value || !stageEl.value || !layer.value)
    return;
  const slotRect = slotEl.value.getBoundingClientRect();
  const layerRect = layer.value.getBoundingClientRect();
  stageTop.value = Math.round(slotRect.top - layerRect.top);
  const h = Math.round(stageEl.value.getBoundingClientRect().height);
  if (h !== slotHeight.value) {
    slotHeight.value = h;
    // The prose below the slot moves by the difference; scroll-linked
    // figures and section triggers must re-measure (same as ChapterOpener).
    nextTick(() => ScrollTrigger.refresh());
  }
}
/* Coalesce bursts (ResizeObserver + resize event) into one measurement per
   task. A microtask, not requestAnimationFrame: rAF is paused in background
   tabs and never fires in some embedded browsers, and the observers already
   deliver after layout so measuring synchronously is safe. */
function scheduleSync() {
  if (syncPending) return;
  syncPending = true;
  Promise.resolve().then(() => {
    syncPending = false;
    syncStage();
  });
}

function observeStage() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (!teleported.value || typeof ResizeObserver !== "function") return;
  resizeObserver = new ResizeObserver(scheduleSync);
  if (stageEl.value) resizeObserver.observe(stageEl.value);
  // The layer's parent (#container) is as tall as the prose column: any
  // content change above the slot changes it, and moves the slot.
  if (layer.value?.parentElement)
    resizeObserver.observe(layer.value.parentElement);
}

onMounted(() => {
  if (kind.value !== "inline") return;
  layer.value = document.getElementById(STAGE_LAYER_ID);
  if (typeof window.matchMedia === "function") {
    mql = window.matchMedia(STAGE_DESKTOP_QUERY);
    wide.value = mql.matches;
    mql.addEventListener?.("change", onMediaChange);
  }
  window.addEventListener("resize", scheduleSync);
});
function onMediaChange(e) {
  wide.value = e.matches;
}
watch(teleported, async () => {
  await nextTick();
  observeStage();
  scheduleSync();
});
onBeforeUnmount(() => {
  mql?.removeEventListener?.("change", onMediaChange);
  window.removeEventListener("resize", scheduleSync);
  resizeObserver?.disconnect();
  resizeObserver = null;
});

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
    </header>

    <!-- inline: the widget lives here once it is near the viewport. At
         desktop widths the stage teleports into TextComp's stage layer and
         this slot keeps its height (see the notes at the top). -->
    <div
      v-if="kind === 'inline'"
      ref="slotEl"
      class="wb-slot"
      :class="{ 'wb-slot--vacated': teleported }"
      :style="slotStyle"
    >
      <Teleport :to="layer" :disabled="!teleported">
        <div
          ref="stageEl"
          class="wb-stage"
          :class="{ 'wb-stage--floating': teleported }"
          :style="stageStyle"
          :data-widget-stage="widgetId"
          :aria-labelledby="headingId"
        >
          <component :is="Widget" v-if="inlineMounted && Widget" />
          <div v-else-if="!embeddable" class="wb-missing">
            This interactive is not available in the reader yet.
          </div>
          <div v-else class="wb-stage-placeholder" aria-hidden="true"></div>
        </div>
      </Teleport>
    </div>

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
  position: relative;
  margin: 2.5rem 0;
  border: 1px solid rgb(var(--color-line));
  border-left: 4px solid rgb(var(--color-accent));
  border-radius: 12px;
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
  background: rgb(var(--color-accent));
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

.wb-stage {
  margin: 0.75rem 0 0;
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-bg));
  /* Widget views bring their own page padding; keep ours minimal. */
  padding: 0.5rem;
  container-type: inline-size;
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
  position: absolute;
  left: 0;
  width: 100%;
  margin: 0;
  padding: 1.5rem clamp(1rem, 4vw, 4rem);
  pointer-events: auto;
}

.wb-slot--vacated {
  margin-top: 0.75rem;
}

.wb-stage-placeholder {
  min-height: 12rem;
  background: repeating-linear-gradient(
    -45deg,
    rgb(var(--color-line) / 0.25) 0 8px,
    transparent 8px 16px
  );
  border-radius: 8px;
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
  border-radius: 999px;
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
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.wb-btn--primary {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.wb-btn--primary:hover {
  background: rgb(var(--color-accent));
  border-color: rgb(var(--color-accent));
}

.wb-credit {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}

[data-reduce-motion="1"] .wb-btn {
  transition: none;
}
</style>
