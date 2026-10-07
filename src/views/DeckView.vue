<script setup>
// A slide deck filling the window. The slide on screen is kept in the URL
// hash (#3 is the third slide), so a link can open a given slide and a
// reload stays put.
//
// Where the slides come from is `source` (OPENBRAIN-129, useDeckSource):
//   bundled  a deck in the bundle (/deck/templates)
//   pinned   /deck: the published deck a creator showed there, or the
//            bundled October funding deck when there is none
//   shared   /deck/s/<token>: a published deck's funder link
//   draft    /dashboard/decks/<slug>/present: the working copy, with notes
// Slides go through safeSlides, so a broken entry is skipped for funders and
// shown as a "can't be shown" slide in the creator's draft. A signed-in
// creator gets an Edit link in the overlay.
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import DeckStage from "@/components/deck/DeckStage.vue";
import { safeSlides } from "@/components/deck/slides/layouts.js";
import { BUNDLED_DECKS } from "@/data/decks/index.js";
import { useDeckSource } from "@/composables/useDeckSource";
import { useAuth } from "@/composables/useAuth";

const props = defineProps({
  // A bundled deck: what `bundled` shows, and `pinned`'s fallback.
  deck: {
    type: String,
    default: "funding",
    validator: (v) => Object.hasOwn(BUNDLED_DECKS, v),
  },
  source: {
    type: String,
    default: "bundled",
    validator: (v) => ["bundled", "pinned", "shared", "draft"].includes(v),
  },
  // The share token, for `shared`.
  token: { type: String, default: "" },
  // The deck's slug, for `draft`.
  slug: { type: String, default: "" },
});

const route = useRoute();
const router = useRouter();
const { isCreator } = useAuth();

const deckSource = useDeckSource(() => ({
  source: props.source,
  deck: props.deck,
  token: props.token,
  slug: props.slug,
}));
const { status, title, entries, origin, deckSlug } = deckSource;

const isDraft = computed(() => props.source === "draft");
// Speaker notes are for whoever presents: a creator. The deck RPCs drop them
// for everyone else, but the bundled copy /deck falls back to (no Supabase,
// a failed or slow request, nothing pinned, the migration not pushed yet)
// carries them, so they go here too and a funder never gets a Notes button.
// The templates page keeps its notes: they describe each template.
const keepNotes = computed(
  () => isDraft.value || isCreator.value || props.source === "bundled"
);
const slides = computed(() => {
  const list = safeSlides(entries.value, {
    mode: isDraft.value ? "draft" : "public",
  }).slides;
  if (keepNotes.value) return list;
  return list.map((s) =>
    s.notes === undefined ? s : { ...s, notes: undefined }
  );
});
const showStage = computed(
  () => status.value === "ready" && slides.value.length > 0
);

// The stage's heading and the tab title. The bundled decks' titles start
// with the book's name, which the tab title already ends with.
const deckTitle = computed(() => title.value || "Slides");
const shortTitle = computed(() =>
  deckTitle.value.replace(/^The Open Brain — /, "")
);
watchEffect(() => {
  if (status.value !== "ready" || !title.value) return;
  document.title = `${isDraft.value ? "Draft · " : ""}${shortTitle.value} · The Open Brain`;
});

// Creators get a way back to the editor: the deck itself when it came from
// the database, the Decks section for the bundled funding copy, nothing for
// the templates.
const editTo = computed(() => {
  if (!isCreator.value) return "";
  if (isDraft.value)
    return props.slug
      ? `/dashboard/decks/${encodeURIComponent(props.slug)}`
      : "";
  if (origin.value === "db" && deckSlug.value)
    return `/dashboard/decks/${encodeURIComponent(deckSlug.value)}`;
  if (origin.value === "bundled" && props.deck === "funding")
    return "/dashboard?section=decks";
  return "";
});

// ── the slide in the hash ───────────────────────────────────────────────
const fromHash = (hash) => {
  const n = Number.parseInt(String(hash || "").replace("#", ""), 10);
  if (!Number.isFinite(n) || !slides.value.length) return 0;
  return Math.min(Math.max(n - 1, 0), slides.value.length - 1);
};
const index = ref(fromHash(route.hash));

watch(index, (i) => {
  router.replace({ hash: i > 0 ? `#${i + 1}` : "" });
});
watch(
  () => route.hash,
  (hash) => {
    const i = fromHash(hash);
    if (i !== index.value) index.value = i;
  }
);
// Slides from the database arrive after the first render: open the slide
// the link asked for once they are in.
watch(
  () => slides.value.length,
  (n, before) => {
    if (n > 0 && !before) index.value = fromHash(route.hash);
  }
);
watch(
  () => [props.deck, props.source, props.token, props.slug].join("\u0000"),
  () => (index.value = 0)
);

// When loading ends in a message rather than slides, focus goes to it, so a
// screen reader that has read "Loading deck…" hears what happened: the
// heading for "isn't available" or an empty deck, Retry (described by the
// heading and its hint) for an error. A message there from the first render
// (a malformed link) is the page itself and needs no move.
const retryButton = ref(null);
const messageHeading = ref(null);
watch(status, (s, before) => {
  if (s === "error") nextTick(() => retryButton.value?.focus());
  else if (before === "loading" && s !== "loading" && !showStage.value)
    nextTick(() => messageHeading.value?.focus());
});

// Unlisted, not secret: keep it out of search results while it is shared by
// link.
let robots;
onMounted(() => {
  robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);
});
onBeforeUnmount(() => robots?.remove());
</script>

<template>
  <div
    class="deck-view"
    :data-deck-source="status === 'ready' ? origin : undefined"
  >
    <DeckStage
      v-if="showStage"
      v-model="index"
      :slides="slides"
      :title="deckTitle"
      :edit-to="editTo"
    />

    <div
      v-else-if="status === 'loading'"
      class="deck-view__frame"
      aria-busy="true"
    >
      <p class="deck-view__loading">Loading deck…</p>
    </div>

    <main v-else class="deck-view__frame deck-view__message">
      <template v-if="status === 'error'">
        <h1 id="deck-view-error">The deck couldn't load.</h1>
        <p id="deck-view-error-hint">Check your connection and try again.</p>
        <button
          ref="retryButton"
          type="button"
          class="deck-view__button"
          aria-describedby="deck-view-error deck-view-error-hint"
          @click="deckSource.retry()"
        >
          Retry
        </button>
      </template>

      <template v-else-if="status === 'unavailable' && isDraft">
        <h1 ref="messageHeading" tabindex="-1">No deck called “{{ slug }}”.</h1>
        <p>It may have been deleted, or the link has a typo.</p>
        <router-link to="/dashboard?section=decks" class="deck-view__button"
          >← Decks</router-link
        >
      </template>

      <template v-else-if="status === 'unavailable'">
        <h1 ref="messageHeading" tabindex="-1">This link isn't available.</h1>
        <p>Ask the person who sent it for a new one.</p>
      </template>

      <!-- Ready, but nothing to present: an empty draft, or every slide
           hidden. Only the draft presenter can get here. -->
      <template v-else>
        <h1 ref="messageHeading" tabindex="-1">No slides to present.</h1>
        <p>
          The deck is empty, or every slide is hidden when presenting. Add or
          show slides in the editor.
        </p>
        <router-link v-if="editTo" :to="editTo" class="deck-view__button"
          >Edit the deck</router-link
        >
      </template>
    </main>
  </div>
</template>

<style scoped>
.deck-view {
  position: fixed;
  inset: 0;
  z-index: 40;
}

/* Loading and message states sit in the stage's own dark letterbox, so
   nothing flashes white before the first slide. Like the slides (deck.css),
   the deck ignores the viewer's theme: its dark values are pinned here. */
.deck-view__frame {
  --frame-bg: 10 10 10; /* DeckStage's letterbox */
  --frame-ink: 243 239 230; /* .deck-slide--dark ink */
  --frame-mute: 154 152 144; /* .deck-slide--dark mute */

  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 24px 16px;
  background: rgb(var(--frame-bg));
  color: rgb(var(--frame-ink));
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  text-align: center;
}
.deck-view__loading {
  margin: 0;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: var(--ui-size-13);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--frame-mute));
}
.deck-view__message h1 {
  max-width: 32ch;
  margin: 0;
  font-size: var(--ui-size-20);
  font-weight: 500;
  line-height: 1.25;
}
.deck-view__message h1:focus {
  outline: none;
}
.deck-view__message p {
  max-width: 44ch;
  margin: 0;
  font-size: var(--ui-size-16);
  line-height: 1.5;
  color: rgb(var(--frame-mute));
}
.deck-view__button {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  margin-top: 8px;
  padding: 0 16px;
  border: 1px solid rgb(var(--frame-ink) / 0.4);
  border-radius: var(--radius-control);
  background: transparent;
  color: inherit;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: var(--ui-size-13);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}
.deck-view__button:hover {
  background: rgb(var(--frame-ink) / 0.12);
}
.deck-view__button:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

@media print {
  .deck-view {
    position: static;
  }
}
</style>
