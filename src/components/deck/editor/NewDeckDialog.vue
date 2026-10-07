<script setup>
// New deck (OPENBRAIN-129): a title, the link name (the slug, fixed once
// the deck exists), the kind, and what to start from. The link name follows
// the title until the author edits it, and is checked as they type against
// the slug rule, the reserved words and the decks that already exist.
// Emits `create({ title, slug, kind, starter })`; the section creates the row
// and opens the editor, passing `busy` and any `error` back in.
import { computed, nextTick, ref, watch } from "vue";
import {
  BaseModal,
  Button,
  FormField,
  SegmentedControl,
} from "@/components/dashboard/shared";
import { STARTERS } from "@/data/decks/index.js";
import { SLUG_RE, isReservedSlug, slugify } from "@/data/decks/text.js";
import SlidePreview from "../SlidePreview.vue";
import { onRadioKeydown, useDialogFocus } from "./editorA11y.js";
import "./deckEditor.css";

const props = defineProps({
  open: { type: Boolean, default: false },
  // Slugs already in use (every deck, archived ones too).
  takenSlugs: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  // A write failure from the section, shown above the buttons.
  error: { type: String, default: "" },
});
const emit = defineEmits(["create", "close"]);

const KINDS = [
  { value: "funding", label: "Funding" },
  { value: "pitch", label: "Pitch" },
  { value: "talk", label: "Talk" },
];
const starters = Array.isArray(STARTERS) ? STARTERS : Object.values(STARTERS);

const title = ref("");
const slug = ref("");
const slugEdited = ref(false);
const kind = ref("funding");
const starter = ref(starters[0]?.id || "blank");
const touched = ref(false);
const titleInput = ref(null);
const slugInput = ref(null);
// Read out when Create can't go ahead and focus is already on the field to
// fix (Enter in it): moving focus there is what announces it otherwise.
const submitProblem = ref("");

// Each starter's first slide, for its card. Its description says how many
// slides it brings.
const cards = computed(() =>
  starters.map((s) => ({ ...s, first: s.entries()[0] || null }))
);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    title.value = "";
    slug.value = "";
    slugEdited.value = false;
    kind.value = "funding";
    starter.value = starters[0]?.id || "blank";
    touched.value = false;
    submitProblem.value = "";
  }
);

watch(title, (t) => {
  if (!slugEdited.value) slug.value = t.trim() ? slugify(t) : "";
});
function onSlugInput(e) {
  slugEdited.value = true;
  slug.value = e.target.value;
}

const taken = computed(() => new Set(props.takenSlugs));
const titleProblem = computed(() =>
  title.value.trim() ? "" : "Give the deck a title."
);
const slugProblem = computed(() => {
  const s = slug.value;
  if (!s) return "Choose a link name.";
  if (!SLUG_RE.test(s))
    return "Use lowercase letters, numbers and dashes, starting with a letter or number.";
  if (isReservedSlug(s)) return `“${s}” is reserved. Choose another name.`;
  if (taken.value.has(s)) return "Already used";
  return "";
});
const valid = computed(() => !titleProblem.value && !slugProblem.value);

// Create stays enabled: disabling it under the keyboard that pressed it
// would strand focus on a dead button. An invalid Create moves focus to the
// first field to fix instead, whose description now holds the problem.
async function submit() {
  touched.value = true;
  if (props.busy) return;
  if (!valid.value) {
    const target = titleProblem.value ? titleInput.value : slugInput.value;
    const problem = titleProblem.value || slugProblem.value;
    submitProblem.value = "";
    await nextTick();
    if (document.activeElement !== target) target?.focus();
    else submitProblem.value = problem;
    return;
  }
  emit("create", {
    title: title.value.trim(),
    slug: slug.value,
    kind: kind.value,
    starter: starter.value,
  });
}

// The Create button sits in the dialog footer, outside the form, so Enter
// in a text field submits by hand.
function onEnter(e) {
  if (e.target instanceof HTMLInputElement) {
    e.preventDefault();
    submit();
  }
}

const chooseStarter = (i) => (starter.value = cards.value[i].id);

useDialogFocus(
  () => props.open,
  () => titleInput.value
);
</script>

<template>
  <BaseModal
    :model-value="open"
    title="New deck"
    size="lg"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <form
      class="new-deck"
      novalidate
      @submit.prevent="submit"
      @keydown.enter="onEnter"
    >
      <div class="deck-ed-field">
        <FormField label="Title" required>
          <input
            id="new-deck-title"
            ref="titleInput"
            v-model="title"
            type="text"
            maxlength="200"
            autocomplete="off"
            :aria-invalid="touched && titleProblem ? 'true' : undefined"
            aria-describedby="new-deck-title-desc"
          />
        </FormField>
        <p id="new-deck-title-desc" class="deck-ed-desc">
          <span v-if="touched && titleProblem" class="deck-ed-problem is-error">
            {{ titleProblem }}
          </span>
        </p>
      </div>

      <div class="deck-ed-field">
        <FormField label="Link name" required>
          <input
            id="new-deck-slug"
            ref="slugInput"
            :value="slug"
            type="text"
            maxlength="80"
            autocomplete="off"
            spellcheck="false"
            :aria-invalid="
              slugProblem && (touched || slugEdited) ? 'true' : undefined
            "
            aria-describedby="new-deck-slug-desc"
            @input="onSlugInput"
          />
        </FormField>
        <p id="new-deck-slug-desc" class="deck-ed-desc">
          <span
            v-if="slugProblem && (touched || slugEdited || taken.has(slug))"
            class="deck-ed-problem is-error"
            >{{ slugProblem }}</span
          >
          <span
            >The editor opens at /dashboard/decks/{{ slug || "…" }}. It can't
            change later. Funders never see it.</span
          >
        </p>
      </div>

      <fieldset class="deck-ed-fieldset">
        <legend class="deck-ed-legend">Kind</legend>
        <SegmentedControl
          v-model="kind"
          :options="KINDS"
          aria-label="Kind of deck"
        />
      </fieldset>

      <fieldset class="deck-ed-fieldset">
        <legend class="deck-ed-legend">Start from</legend>
        <div
          class="new-deck__starters"
          role="radiogroup"
          aria-label="Start from"
          @keydown="onRadioKeydown($event, chooseStarter)"
        >
          <button
            v-for="card in cards"
            :key="card.id"
            type="button"
            role="radio"
            class="new-deck__starter deck-ed-radio"
            :aria-checked="starter === card.id ? 'true' : 'false'"
            :tabindex="starter === card.id ? 0 : -1"
            @click="starter = card.id"
          >
            <SlidePreview v-if="card.first" :entry="card.first" thumb />
            <span class="new-deck__starter-name">{{ card.label }}</span>
            <span class="new-deck__starter-desc">{{ card.description }}</span>
          </button>
        </div>
      </fieldset>

      <p v-if="error" class="new-deck__error" role="alert">{{ error }}</p>
      <p class="sr-only" aria-live="assertive">{{ submitProblem }}</p>
    </form>

    <template #footer>
      <Button variant="ghost" size="sm" @click="emit('close')">Cancel</Button>
      <Button size="sm" :loading="busy" @click="submit">Create</Button>
    </template>
  </BaseModal>
</template>

<style scoped>
.new-deck {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.new-deck__starters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
@media (max-width: 560px) {
  .new-deck__starters {
    grid-template-columns: 1fr;
  }
}
.new-deck__starter {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 6px;
}
.new-deck__starter-name {
  font-weight: 500;
}
.new-deck__starter-desc {
  font-size: var(--ui-size-12);
  line-height: 1.4;
  color: rgb(var(--color-mute));
}
.new-deck__error {
  margin: 0;
  padding: 8px 10px;
  border-left: 3px solid rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.06);
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}
</style>
