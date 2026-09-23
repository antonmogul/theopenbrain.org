<script setup>
/*
 * WidgetPicker — choose an interactive for a chapter, or change the settings
 * of one already placed (OPENBRAIN-61). Lists every catalog widget that has
 * a Vue embed (src/widgets/embeds.js); the catalog, with its raw HTML
 * sources, loads only when the picker opens. Emits `done` with a `widget`
 * block: { type, widgetId, kind, title, blurb, credit, placementId, route }.
 */
import { computed, ref, watch } from "vue";
import {
  BaseModal,
  Button,
  SearchInput,
  FormField,
} from "@/components/dashboard/shared";
import { hasEmbed } from "@/widgets/embeds";

const props = defineProps({
  open: { type: Boolean, default: false },
  /** An existing widget block to edit; null to pick a new one. */
  initial: { type: Object, default: null },
  chapterSlug: { type: String, default: "" },
});
const emit = defineEmits(["done", "close"]);

const widgets = ref([]);
const loadError = ref("");
const search = ref("");
const chosen = ref(null);
const form = ref({ kind: "breakout", title: "", blurb: "", credit: "" });

async function loadCatalog() {
  if (widgets.value.length) return;
  try {
    const { WIDGETS } = await import("@/widgets/catalog");
    widgets.value = WIDGETS.filter((w) => hasEmbed(w.id));
  } catch (err) {
    console.error("WidgetPicker: catalog failed to load", err);
    loadError.value = "The widget catalog didn't load. Try again.";
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await loadCatalog();
    search.value = "";
    if (props.initial) {
      chosen.value = widgets.value.find(
        (w) => w.id === props.initial.widgetId
      ) || {
        id: props.initial.widgetId,
        title: props.initial.title || props.initial.widgetId,
      };
      form.value = {
        kind: props.initial.kind === "inline" ? "inline" : "breakout",
        title: props.initial.title || "",
        blurb: props.initial.blurb || "",
        credit: props.initial.credit || "",
      };
    } else {
      chosen.value = null;
    }
  },
  { immediate: true }
);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return widgets.value;
  return widgets.value.filter((w) =>
    [w.title, w.desc, w.chapter, w.author]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
});

function choose(w) {
  chosen.value = w;
  form.value = {
    kind: "breakout",
    title: w.title || w.id,
    blurb: w.desc || "",
    credit: w.author || "",
  };
}

function done() {
  if (!chosen.value) return;
  const base = props.initial || {};
  emit("done", {
    ...base,
    type: "widget",
    widgetId: chosen.value.id,
    kind: form.value.kind,
    title: form.value.title.trim(),
    blurb: form.value.blurb.trim(),
    credit: form.value.credit.trim(),
    placementId:
      base.placementId ||
      [props.chapterSlug, chosen.value.id].filter(Boolean).join("-"),
    route: base.route ?? chosen.value.vuePath ?? "",
  });
}
</script>

<template>
  <BaseModal
    :model-value="open"
    :title="initial ? 'Widget settings' : 'Add a widget'"
    size="lg"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <template v-if="!chosen">
      <SearchInput v-model="search" placeholder="Search widgets…" />
      <p v-if="loadError" class="wp-error" role="alert">{{ loadError }}</p>
      <ul class="wp-list">
        <li v-for="w in filtered" :key="w.id">
          <button type="button" class="wp-item" @click="choose(w)">
            <span class="wp-title">{{ w.title }}</span>
            <span class="wp-meta">{{ w.chapter }} · {{ w.author }}</span>
            <span class="wp-desc">{{ w.desc }}</span>
          </button>
        </li>
      </ul>
      <p v-if="!loadError && !filtered.length" class="wp-empty">
        No widget matches “{{ search }}”.
      </p>
    </template>

    <form v-else class="wp-form" @submit.prevent="done">
      <p class="wp-chosen">
        <span class="wp-kind">Widget</span> {{ chosen.title }}
        <button
          v-if="!initial"
          type="button"
          class="wp-change"
          @click="chosen = null"
        >
          Change
        </button>
      </p>
      <fieldset class="wp-kinds">
        <legend>How it appears</legend>
        <label>
          <input
            id="wp-kind-breakout"
            v-model="form.kind"
            type="radio"
            value="breakout"
          />
          <span
            ><b>Breakout card</b>: a card in the text that opens the widget full
            screen</span
          >
        </label>
        <label>
          <input
            id="wp-kind-inline"
            v-model="form.kind"
            type="radio"
            value="inline"
          />
          <span
            ><b>Inline stage</b>: the widget runs in the flow of the text</span
          >
        </label>
      </fieldset>
      <FormField label="Title">
        <input id="wp-title" v-model="form.title" type="text" required />
      </FormField>
      <FormField label="Blurb" hint="One or two sentences under the title.">
        <textarea id="wp-blurb" v-model="form.blurb" rows="3" />
      </FormField>
      <FormField label="Credit">
        <input id="wp-credit" v-model="form.credit" type="text" />
      </FormField>
    </form>

    <template #footer>
      <Button variant="ghost" size="sm" @click="emit('close')">Cancel</Button>
      <Button
        variant="solid"
        size="sm"
        :disabled="!chosen || !form.title.trim()"
        @click="done"
        >{{ initial ? "Save settings" : "Add widget" }}</Button
      >
    </template>
  </BaseModal>
</template>

<style scoped>
.wp-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 55vh;
  overflow-y: auto;
}
.wp-item {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 8px;
  background: rgb(var(--color-paper));
  text-align: left;
  cursor: pointer;
  font-family: var(--font-ui);
}
.wp-item:hover,
.wp-item:focus-visible {
  border-color: rgb(var(--color-accent) / 0.6);
  outline: none;
}
.wp-title {
  font-weight: 600;
  font-size: 0.9375rem;
}
.wp-meta,
.wp-kind {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.wp-kind {
  color: rgb(var(--color-accent));
  margin-right: 6px;
}
.wp-desc {
  font-size: 0.8125rem;
  color: rgb(var(--color-mute));
  line-height: 1.4;
}
.wp-form {
  display: grid;
  gap: 14px;
}
.wp-chosen {
  margin: 0;
  font-family: var(--font-ui);
  font-weight: 600;
}
.wp-change {
  margin-left: 8px;
  border: 0;
  background: none;
  color: rgb(var(--color-accent));
  font: inherit;
  font-weight: 400;
  text-decoration: underline;
  cursor: pointer;
}
.wp-kinds {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
  font-family: var(--font-ui);
  font-size: 0.875rem;
}
.wp-kinds legend {
  margin-bottom: 6px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.wp-kinds label {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.wp-error,
.wp-empty {
  margin: 12px 0 0;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  color: rgb(var(--color-mute));
}
.wp-error {
  color: rgb(var(--color-accent));
}
</style>
