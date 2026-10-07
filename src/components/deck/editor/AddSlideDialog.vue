<script setup>
// The Add slide gallery (OPENBRAIN-129): every layout as a blank slide,
// the slide templates, and the funding deck's own slides, each shown as a
// thumbnail. Emits `pick` with the chosen entry as it is in the gallery; the
// editor clones it with a fresh id (cloneEntry) and inserts it after the
// selected slide. Only the open tab's thumbnails are rendered.
import { computed, ref, watch } from "vue";
import { BaseModal } from "@/components/dashboard/shared";
import { GALLERY } from "@/data/decks/index.js";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import SlidePreview from "../SlidePreview.vue";
import { useDialogFocus } from "./editorA11y.js";
import "./deckEditor.css";

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["pick", "close"]);

const tabs = GALLERY;
const active = ref(tabs[0]?.id);
const tabButtons = ref([]);

// Back on the first tab each time the dialog opens.
watch(
  () => props.open,
  (open) => open && (active.value = tabs[0]?.id)
);

const TEMPLATE_PREFIX = /^T\d+ · /;
const nameOf = (entry, tabId) =>
  tabId === "layouts"
    ? LAYOUT_SCHEMAS[entry.layout]?.label || entry.layout
    : (entry.label || entry.layout).replace(TEMPLATE_PREFIX, "");

// The open tab's slides in their groups (the blank layouts: Funding and
// Templates). A tab with one group shows no group heading.
const groups = computed(() => {
  const tab = tabs.find((t) => t.id === active.value);
  if (!tab) return [];
  if (Array.isArray(tab.groups) && tab.groups.length)
    return tab.groups.map((g) => ({
      name: tab.groups.length > 1 ? g.label : "",
      entries: g.entries || [],
    }));
  return [{ name: "", entries: tab.entries || [] }];
});

function onTabKeydown(event, i) {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  let next;
  if (step) next = (i + step + tabs.length) % tabs.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else return;
  event.preventDefault();
  active.value = tabs[next].id;
  tabButtons.value[next]?.focus();
}

useDialogFocus(
  () => props.open,
  () => tabButtons.value[tabs.findIndex((t) => t.id === active.value)]
);
</script>

<template>
  <BaseModal
    :model-value="open"
    title="Add a slide"
    size="full"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <div class="add-slide__tabs" role="tablist" aria-label="Slide sources">
      <button
        v-for="(tab, i) in tabs"
        :id="`add-slide-tab-${tab.id}`"
        :key="tab.id"
        ref="tabButtons"
        type="button"
        role="tab"
        class="add-slide__tab deck-ed-focus"
        :aria-selected="active === tab.id ? 'true' : 'false'"
        :aria-controls="`add-slide-panel-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        @click="active = tab.id"
        @keydown="onTabKeydown($event, i)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      :id="`add-slide-panel-${active}`"
      class="add-slide__panel"
      role="tabpanel"
      :aria-labelledby="`add-slide-tab-${active}`"
    >
      <section
        v-for="group in groups"
        :key="group.name || 'all'"
        class="add-slide__group"
        :aria-label="group.name || undefined"
      >
        <h4 v-if="group.name" class="deck-ed-heading">{{ group.name }}</h4>
        <ul class="add-slide__grid">
          <li v-for="entry in group.entries" :key="entry.id || entry.layout">
            <button
              type="button"
              class="add-slide__item deck-ed-focus"
              @click="emit('pick', entry)"
            >
              <SlidePreview :entry="entry" thumb />
              <span class="add-slide__name">{{ nameOf(entry, active) }}</span>
              <span
                v-if="active === 'layouts' && LAYOUT_SCHEMAS[entry.layout]"
                class="add-slide__desc"
                >{{ LAYOUT_SCHEMAS[entry.layout].description }}</span
              >
            </button>
          </li>
        </ul>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.add-slide__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.add-slide__tab {
  margin-bottom: -1px;
  padding: 8px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
  cursor: pointer;
}
.add-slide__tab[aria-selected="true"] {
  border-bottom-color: rgb(var(--color-ink));
  color: rgb(var(--color-ink));
}
.add-slide__panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 65vh;
  overflow-y: auto;
  padding: 2px;
}
.add-slide__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.add-slide__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.add-slide__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 6px;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  text-align: left;
  cursor: pointer;
}
.add-slide__item:hover {
  border-color: rgb(var(--color-ink) / 0.6);
}
.add-slide__name {
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  font-weight: 500;
  color: rgb(var(--color-ink));
}
.add-slide__desc {
  font-family: var(--font-ui);
  font-size: var(--ui-size-12);
  line-height: 1.4;
  color: rgb(var(--color-mute));
}
</style>
