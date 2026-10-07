<script setup>
// The form for the selected slide (OPENBRAIN-129), built from its layout's
// schema in src/data/decks/fields.js: the slide's own settings (label,
// layout, hidden, speaker notes), then one DeckField per prop in schema
// order, then an Advanced section with the slide id and its JSON.
//
// Switching layout keeps what the new layout can use (carryOver); when
// something would be lost, a confirmation lists it first. The trajectory
// slide gets two helpers: write the summary sentence from the counts, and
// check how many chapters the catalog has published (fetched only on
// click, so stories never touch the network).
//
// Emits update(path, value) with paths relative to the entry ("label",
// "props.title"), and change-layout(layout) once a switch is confirmed.
import { computed, ref, watch } from "vue";
import {
  ConfirmDialog,
  FormField,
  Switch,
} from "@/components/dashboard/shared";
import { LAYOUT_GROUPS, LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import {
  SLIDE_ID_RE,
  carryOver,
  fieldId,
  normalizeSlide,
} from "@/data/decks/validate.js";
import { smartPunctuation, summaryFromCounts } from "@/data/decks/text.js";
import { useChapterCatalog } from "@/composables/useChapterCatalog.js";
import DeckField from "./DeckField.vue";
import { fieldLabel, problemsAt } from "./fieldPaths.js";
import { IconError, IconWarn } from "./editorIcons.js";
import "./deckEditor.css";

const props = defineProps({
  entry: { type: Object, required: true },
  // This slide's problems (validateSlide plus overflow).
  problems: { type: Array, default: () => [] },
  // 1-based position in the deck, and the deck's length.
  position: { type: Number, default: 1 },
  total: { type: Number, default: 1 },
  deckId: { type: String, default: "" },
  // The other slides' ids: an id can't be one of them (every lookup goes by
  // id, so the second slide could no longer be selected).
  takenIds: { type: Array, default: () => [] },
});
const emit = defineEmits(["update", "change-layout"]);

const schema = computed(() =>
  Object.hasOwn(LAYOUT_SCHEMAS, props.entry.layout)
    ? LAYOUT_SCHEMAS[props.entry.layout]
    : null
);
const fields = computed(() => Object.entries(schema.value?.fields || {}));
const slideProps = computed(() => props.entry.props || {});
const idFor = (path) => fieldId(props.entry.id, path);
const update = (path, value) => emit("update", path, value);

// Layout choices in their schema groups.
const layoutGroups = computed(() =>
  LAYOUT_GROUPS.map((group) => ({
    group,
    layouts: Object.entries(LAYOUT_SCHEMAS).filter(
      ([, s]) => s.group === group
    ),
  }))
);

// ── slide-level problems ─────────────────────────────────────────────────
const at = (path) => problemsAt(props.problems, path);
const SLIDE_PATHS = ["label", "layout", "notes", "hidden", "id"];
// Problems no field shows: about the whole slide (overflow, an empty
// entry) or a path the form has no control for.
const general = computed(() =>
  props.problems.filter(
    (p) => !SLIDE_PATHS.includes(p.path) && !String(p.path).startsWith("props.")
  )
);
const level = (p) => (p.level === "error" ? "is-error" : "is-warn");

// ── label ────────────────────────────────────────────────────────────────
const labelCount = computed(() => [...(props.entry.label || "")].length);
function onLabelBlur(e) {
  const next = smartPunctuation(e.target.value);
  if (next !== e.target.value) update("label", next);
}

// ── layout switch ────────────────────────────────────────────────────────
const pendingLayout = ref(null);
const droppedNames = ref([]);
const layoutSelect = ref(null);

function onLayoutChange(e) {
  const to = e.target.value;
  // The select shows the current layout until the switch is confirmed.
  e.target.value = props.entry.layout;
  if (to === props.entry.layout) return;
  const { dropped } = carryOver(props.entry, to);
  if (!dropped.length) {
    emit("change-layout", to);
    return;
  }
  droppedNames.value = dropped.map((key) =>
    fieldLabel(props.entry.layout, `props.${key}`)
  );
  pendingLayout.value = to;
}
function confirmLayout() {
  const to = pendingLayout.value;
  pendingLayout.value = null;
  emit("change-layout", to);
  layoutSelect.value?.focus();
}
function cancelLayout() {
  pendingLayout.value = null;
  layoutSelect.value?.focus();
}
const pendingLabel = computed(
  () => LAYOUT_SCHEMAS[pendingLayout.value]?.label || pendingLayout.value
);

// ── trajectory helpers ───────────────────────────────────────────────────
const isTrajectory = computed(() => props.entry.layout === "trajectory");
const chapters = computed(() => slideProps.value.chapters || {});
const COUNT_KEYS = ["live", "inProgress", "funded", "unfunded"];
const totalChapters = computed(() =>
  COUNT_KEYS.reduce(
    (n, k) => n + (Number.isInteger(chapters.value[k]) ? chapters.value[k] : 0),
    0
  )
);
const countsSummary = computed(() => summaryFromCounts(chapters.value));
const summaryMatches = computed(
  () => (slideProps.value.summary || "").trim() === countsSummary.value
);
function writeSummary() {
  update("props.summary", countsSummary.value);
}

const catalog = useChapterCatalog();
const catalogState = ref("idle"); // idle | loading | done
const publishedCount = ref(0);
async function checkCatalog() {
  catalogState.value = "loading";
  const rows = await catalog.fetchCatalog();
  publishedCount.value = Array.isArray(rows) ? rows.length : 0;
  catalogState.value = "done";
}
function useCatalogCount() {
  update("props.chapters.live", publishedCount.value);
}
watch(
  () => props.entry.id,
  () => (catalogState.value = "idle")
);

// ── advanced ─────────────────────────────────────────────────────────────
const idDraft = ref(props.entry.id);
watch(
  () => props.entry.id,
  (id) => (idDraft.value = id)
);
const idProblem = computed(() => {
  const v = idDraft.value.trim();
  if (!v) return "The slide needs an id.";
  if (!SLIDE_ID_RE.test(v))
    return "Use lowercase letters, digits and dashes, starting with a letter or digit (at most 64).";
  if (v !== props.entry.id && props.takenIds.includes(v))
    return "Another slide already uses this id.";
  return "";
});
function commitId() {
  const v = idDraft.value.trim();
  if (idProblem.value || v === props.entry.id) return;
  update("id", v);
}

const json = computed(() =>
  JSON.stringify(normalizeSlide(props.entry), null, 2)
);
const jsonCopied = ref(false);
async function copyJson() {
  try {
    await navigator.clipboard.writeText(json.value);
    jsonCopied.value = true;
    setTimeout(() => (jsonCopied.value = false), 2000);
  } catch {
    jsonCopied.value = false;
  }
}
</script>

<template>
  <form class="deck-slide-form" novalidate @submit.prevent>
    <header class="deck-slide-form__head">
      <h2 class="deck-ed-heading">
        Slide {{ position }} of {{ total }}
        <span v-if="schema" class="deck-slide-form__layout"
          >· {{ schema.label }}</span
        >
      </h2>
      <ul v-if="general.length" class="deck-ed-problems">
        <li
          v-for="(p, k) in general"
          :key="`${p.code}-${k}`"
          class="deck-ed-problem"
          :class="level(p)"
        >
          <component :is="p.level === 'error' ? IconError : IconWarn" />
          <span
            ><span class="sr-only">{{
              p.level === "error" ? "Error: " : "Warning: "
            }}</span
            >{{ p.message }}</span
          >
        </li>
      </ul>
    </header>

    <!-- The slide itself. -->
    <section class="deck-slide-form__block" aria-labelledby="deck-form-slide">
      <h3 id="deck-form-slide" class="deck-ed-heading">Slide</h3>

      <div class="deck-ed-field">
        <FormField label="Label" required>
          <input
            :id="idFor('label')"
            type="text"
            :value="entry.label || ''"
            aria-required="true"
            :aria-invalid="
              at('label').some((p) => p.level === 'error') ? 'true' : undefined
            "
            :aria-describedby="`${idFor('label')}-desc`"
            @input="update('label', $event.target.value)"
            @blur="onLabelBlur"
          />
        </FormField>
        <div :id="`${idFor('label')}-desc`" class="deck-ed-desc">
          <div class="deck-ed-desc__row">
            <span>In the rail, the presenter's counter and the notes.</span>
            <span class="deck-ed-count" :class="{ 'is-over': labelCount > 40 }"
              >{{ labelCount }} / 40</span
            >
          </div>
          <ul v-if="at('label').length" class="deck-ed-problems">
            <li
              v-for="(p, k) in at('label')"
              :key="`${p.code}-${k}`"
              class="deck-ed-problem"
              :class="level(p)"
            >
              <component :is="p.level === 'error' ? IconError : IconWarn" />
              <span>{{ p.message }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="deck-ed-field">
        <FormField label="Layout">
          <select
            :id="idFor('layout')"
            ref="layoutSelect"
            :value="entry.layout"
            :aria-describedby="`${idFor('layout')}-desc`"
            @change="onLayoutChange"
          >
            <option v-if="!schema" :value="entry.layout" disabled>
              {{ entry.layout }} (unknown)
            </option>
            <optgroup v-for="g in layoutGroups" :key="g.group" :label="g.group">
              <option v-for="[key, s] in g.layouts" :key="key" :value="key">
                {{ s.label }}
              </option>
            </optgroup>
          </select>
        </FormField>
        <div :id="`${idFor('layout')}-desc`" class="deck-ed-desc">
          <span v-if="schema">{{ schema.description }}</span>
          <ul v-if="at('layout').length" class="deck-ed-problems">
            <li
              v-for="(p, k) in at('layout')"
              :key="`${p.code}-${k}`"
              class="deck-ed-problem"
              :class="level(p)"
            >
              <component :is="p.level === 'error' ? IconError : IconWarn" />
              <span>{{ p.message }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="deck-slide-form__switch">
        <label :id="`${idFor('hidden')}-label`" :for="idFor('hidden')"
          >Hide when presenting</label
        >
        <Switch
          :id="idFor('hidden')"
          :checked="entry.hidden === true"
          :aria-labelledby="`${idFor('hidden')}-label`"
          :aria-describedby="`${idFor('hidden')}-desc`"
          @update:checked="update('hidden', $event)"
        />
      </div>
      <p :id="`${idFor('hidden')}-desc`" class="deck-ed-desc">
        The slide stays in the deck but is skipped when presenting and on
        funders' links.
      </p>

      <div class="deck-ed-field">
        <FormField label="Speaker notes">
          <textarea
            :id="idFor('notes')"
            rows="4"
            :value="entry.notes || ''"
            :aria-describedby="`${idFor('notes')}-desc`"
            @input="update('notes', $event.target.value)"
          />
        </FormField>
        <p :id="`${idFor('notes')}-desc`" class="deck-ed-desc">
          Shown with N when a creator presents. Never sent to funders.
        </p>
      </div>
    </section>

    <!-- What the slide says: one field per prop, in schema order. -->
    <section class="deck-slide-form__block" aria-labelledby="deck-form-content">
      <h3 id="deck-form-content" class="deck-ed-heading">Content</h3>
      <p v-if="!schema" class="deck-slide-form__unknown">
        This slide uses a layout the editor doesn't know (“{{ entry.layout }}”).
        Choose a layout above to keep what it can.
      </p>
      <DeckField
        v-for="[key, descriptor] in fields"
        :key="`${entry.id}-${key}`"
        :descriptor="descriptor"
        :value="slideProps[key]"
        :context="slideProps"
        :path="`props.${key}`"
        :slide-id="entry.id"
        :problems="problems"
        :deck-id="deckId"
        @update="update"
      />

      <!-- Trajectory: the numbers behind the strip. -->
      <div
        v-if="isTrajectory"
        class="deck-slide-form__helper"
        aria-labelledby="deck-form-numbers"
        role="group"
      >
        <h4 id="deck-form-numbers" class="deck-ed-heading">Chapter numbers</h4>
        <p class="deck-slide-form__total">
          {{ totalChapters }} chapters in all
          <span class="deck-ed-desc">({{ countsSummary }})</span>
        </p>
        <div class="deck-slide-form__helper-actions">
          <button
            type="button"
            class="deck-ed-link"
            :disabled="summaryMatches"
            @click="writeSummary"
          >
            Write summary from counts
          </button>
          <button
            v-if="catalogState !== 'done'"
            type="button"
            class="deck-ed-link"
            :disabled="catalogState === 'loading'"
            @click="checkCatalog"
          >
            {{ catalogState === "loading" ? "Checking…" : "Check the catalog" }}
          </button>
        </div>
        <p
          v-if="catalogState === 'done'"
          class="deck-slide-form__catalog"
          role="status"
        >
          <template v-if="publishedCount">
            {{ publishedCount }}
            {{ publishedCount === 1 ? "chapter is" : "chapters are" }}
            published ·
            <button
              type="button"
              class="deck-ed-link"
              :disabled="chapters.live === publishedCount"
              @click="useCatalogCount"
            >
              Use</button
            ><span class="sr-only"> as the Live count</span>
          </template>
          <template v-else>
            The catalog has no published chapters, or couldn't be reached.
          </template>
        </p>
      </div>
    </section>

    <details class="deck-slide-form__advanced">
      <summary class="deck-ed-heading">Advanced</summary>
      <div class="deck-ed-field">
        <FormField label="Slide id">
          <input
            :id="idFor('id')"
            v-model="idDraft"
            type="text"
            spellcheck="false"
            autocomplete="off"
            :aria-invalid="
              idProblem || at('id').some((p) => p.level === 'error')
                ? 'true'
                : undefined
            "
            :aria-describedby="`${idFor('id')}-desc`"
            @change="commitId"
            @keydown.enter.prevent="commitId"
          />
        </FormField>
        <div :id="`${idFor('id')}-desc`" class="deck-ed-desc">
          <span
            >Keys the slide in the deck and in links (#slide). Changing it is
            rarely needed.</span
          >
          <ul v-if="idProblem || at('id').length" class="deck-ed-problems">
            <li v-if="idProblem" class="deck-ed-problem is-error">
              <IconError /><span>{{ idProblem }}</span>
            </li>
            <li
              v-for="(p, k) in at('id')"
              :key="`${p.code}-${k}`"
              class="deck-ed-problem"
              :class="level(p)"
            >
              <component :is="p.level === 'error' ? IconError : IconWarn" />
              <span>{{ p.message }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="deck-slide-form__json">
        <div class="deck-slide-form__json-head">
          <span id="deck-form-json" class="deck-ed-label">Slide JSON</span>
          <button type="button" class="deck-ed-link" @click="copyJson">
            {{ jsonCopied ? "Copied" : "Copy" }}
          </button>
        </div>
        <pre
          class="deck-slide-form__pre"
          tabindex="0"
          aria-labelledby="deck-form-json"
          >{{ json }}</pre>
      </div>
    </details>

    <ConfirmDialog
      :model-value="!!pendingLayout"
      :title="`Switch to ${pendingLabel}?`"
      confirm-label="Switch layout"
      variant="warn"
      @confirm="confirmLayout"
      @cancel="cancelLayout"
    >
      {{ pendingLabel }} has no place for: {{ droppedNames.join(", ") }}. Those
      parts are dropped; Undo brings them back.
    </ConfirmDialog>
  </form>
</template>

<style scoped>
.deck-slide-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.deck-slide-form__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.deck-slide-form__layout {
  color: rgb(var(--color-mute));
}
.deck-slide-form__block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.deck-slide-form__block > .deck-ed-heading {
  padding-bottom: 6px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.deck-slide-form__switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  color: rgb(var(--color-ink));
}
.deck-slide-form__switch + .deck-ed-desc {
  margin-top: -10px;
}
.deck-slide-form__unknown {
  margin: 0;
  padding: 8px 10px;
  border-left: 3px solid rgb(var(--color-accent));
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}
.deck-slide-form__helper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-line));
}
.deck-slide-form__total {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  color: rgb(var(--color-ink));
}
.deck-slide-form__helper-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.deck-slide-form__catalog {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}
.deck-slide-form__advanced {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgb(var(--color-line));
}
.deck-slide-form__advanced > summary {
  cursor: pointer;
}
.deck-slide-form__advanced[open] > summary {
  margin-bottom: 12px;
}
.deck-slide-form__advanced summary:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.deck-slide-form__json {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}
.deck-slide-form__json-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.deck-slide-form__pre {
  max-height: 18rem;
  margin: 0;
  padding: 10px;
  overflow: auto;
  border: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-bg));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1.5;
  white-space: pre;
  color: rgb(var(--color-ink));
}
.deck-slide-form__pre:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
</style>
