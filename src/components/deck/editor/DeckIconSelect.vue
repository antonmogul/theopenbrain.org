<script setup>
// Picks one of the deck's icons (ICON_NAMES) for a role or feature
// (OPENBRAIN-129). A radio group: each option shows the icon and its name,
// arrow keys move between options and choose, as native radios do. The
// group carries the field id so the Problems drawer can focus it.
import { ICON_NAMES } from "@/data/decks/fields.js";
import DeckIcon from "../DeckIcon.vue";
import { focusChecked, onRadioKeydown } from "./editorA11y.js";
import "./deckEditor.css";

const props = defineProps({
  modelValue: { type: String, default: "" },
  // Accessible name of the group, e.g. "Icon".
  label: { type: String, default: "Icon" },
  id: { type: String, default: undefined },
});
const emit = defineEmits(["update:modelValue"]);

// The one option reachable with Tab: the chosen icon, or the first.
const tabStop = (name, i) =>
  name === props.modelValue ||
  (i === 0 && !ICON_NAMES.includes(props.modelValue));

const choose = (i) => emit("update:modelValue", ICON_NAMES[i]);
</script>

<template>
  <div
    :id="id"
    class="deck-ed-radios deck-icon-select"
    role="radiogroup"
    :aria-label="label"
    tabindex="-1"
    @focus="focusChecked"
    @keydown="onRadioKeydown($event, choose)"
  >
    <button
      v-for="(name, i) in ICON_NAMES"
      :key="name"
      type="button"
      role="radio"
      class="deck-ed-radio deck-icon-select__option"
      :aria-checked="name === modelValue ? 'true' : 'false'"
      :tabindex="tabStop(name, i) ? 0 : -1"
      @click="choose(i)"
    >
      <DeckIcon :name="name" :size="20" :stroke-width="1.8" />
      <span class="deck-icon-select__name">{{ name }}</span>
    </button>
  </div>
</template>

<style scoped>
.deck-icon-select {
  grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
}
.deck-icon-select__option {
  padding: 6px;
}
.deck-icon-select__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
}
</style>
