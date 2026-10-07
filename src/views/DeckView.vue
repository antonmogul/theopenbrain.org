<script setup>
// /deck and /deck/templates: a slide deck filling the window. The slide on
// screen is kept in the URL hash (#3 is the third slide), so a link can open
// a given slide and a reload stays put.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DeckStage from "@/components/deck/DeckStage.vue";
import { toSlides } from "@/components/deck/slides/layouts.js";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";

const DECKS = {
  funding: { title: "The Open Brain — Funding deck", entries: FUNDING_DECK },
  templates: {
    title: "The Open Brain — Slide templates",
    entries: DECK_TEMPLATES,
  },
};

const props = defineProps({
  deck: {
    type: String,
    default: "funding",
    validator: (v) => ["funding", "templates"].includes(v),
  },
});

const route = useRoute();
const router = useRouter();

const current = computed(() => DECKS[props.deck]);
const slides = computed(() => toSlides(current.value.entries));

const fromHash = (hash) => {
  const n = Number.parseInt(String(hash || "").replace("#", ""), 10);
  if (!Number.isFinite(n)) return 0;
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
watch(
  () => props.deck,
  () => (index.value = 0)
);

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
  <div class="deck-view">
    <DeckStage v-model="index" :slides="slides" :title="current.title" />
  </div>
</template>

<style scoped>
.deck-view {
  position: fixed;
  inset: 0;
  z-index: 40;
}
@media print {
  .deck-view {
    position: static;
  }
}
</style>
