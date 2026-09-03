<script setup>
/*
 * WidgetBreakout — an interactive widget placed inside the chapter prose.
 *
 * Two kinds, chosen per placement in src/widgets/placements.js:
 *   breakout  a card (title, blurb, credit) with "Open interactive", which
 *             mounts the widget full-screen in DemoModal. Nothing heavy loads
 *             until the reader asks for it.
 *   inline    the widget mounts directly in the prose column once the card
 *             scrolls near the viewport, with a "Full screen" escape hatch to
 *             the same modal. Used where the author wants the tool in the
 *             flow of the text (RetINaBox at the end of Circuit computations).
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

/* Full-bleed inline stage: at desktop widths the stage spans the window
   (see the CSS), which means sliding it left by exactly the card's distance
   from the window edge. That distance depends on the reader's column
   margins and paddings, so measure it instead of restating those numbers. */
const stageOffset = ref(0);
function measureStageOffset() {
  if (kind.value !== "inline" || !rootEl.value) return;
  const rect = rootEl.value.getBoundingClientRect();
  // clientLeft is the card's left border, which the stage sits inside.
  stageOffset.value = Math.max(
    0,
    Math.round(rect.left + window.scrollX + rootEl.value.clientLeft)
  );
}
const stageStyle = computed(() =>
  kind.value === "inline" ? { "--wb-offset": `${stageOffset.value}px` } : null
);

onMounted(() => {
  if (kind.value !== "inline") return;
  measureStageOffset();
  window.addEventListener("resize", measureStageOffset);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", measureStageOffset);
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

    <!-- inline: the widget lives here once it is near the viewport -->
    <div v-if="kind === 'inline'" class="wb-stage" :style="stageStyle">
      <component :is="Widget" v-if="inlineMounted && Widget" />
      <div v-else-if="!embeddable" class="wb-missing">
        This interactive is not available in the reader yet.
      </div>
      <div v-else class="wb-stage-placeholder" aria-hidden="true"></div>
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
 * Full-bleed inline stage. The widget views size their layout from the
 * viewport (their own @media rules), so inside a ~460–580px prose column a
 * 1180px-wide tool like RetINaBox overflows. At the reader's desktop
 * breakpoint the stage takes the real content width (--app-w, scrollbar
 * excluded — see helper/appWidth.js and OPENBRAIN-4) and slides left by the
 * card's measured distance from the window edge (--wb-offset, set from the
 * script), landing on x = 0 whatever the column's margins happen to be. The
 * card's header and footer stay in the column; only the stage spans the
 * window, painting over the fixed illustration pane the way a break in the
 * reading flow should. A transform keeps the document's scrollable width
 * unchanged, so the no-horizontal-scroll smoke check still holds.
 */
@media (min-width: 1300px) {
  .wb--inline .wb-stage {
    width: var(--app-w, 100vw);
    transform: translateX(calc(-1 * var(--wb-offset, 0px)));
    padding: 1.5rem clamp(1rem, 4vw, 4rem);
    border-top: 1px solid rgb(var(--color-line));
    border-bottom: 1px solid rgb(var(--color-line));
  }
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
