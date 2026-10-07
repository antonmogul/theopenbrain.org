<script setup>
// One field of a slide's form, built from its descriptor in
// src/data/decks/fields.js (OPENBRAIN-129). Scalars are drawn here; images
// go to DeckImageField, lists and string lists to DeckListField, and groups
// and optional groups recurse into DeckField for their own fields.
//
// Every control's DOM id is fieldId(slideId, path), so the Problems drawer
// can focus it. Hint, character count and the problems at this path sit
// under the control and are linked to it with aria-describedby; an error
// marks it aria-invalid. A field that `showWhen` hides has no effect on the
// slide, so it isn't shown, unless it still holds a value: then it is shown
// dimmed with a Clear button (W_HIDDEN_FIELD).
//
// Emits update(path, value). `undefined` means "remove the key": an
// optional group with off: 'omit', a crop left at the default.
import { computed } from "vue";
import {
  FormField,
  SegmentedControl,
  Switch,
} from "@/components/dashboard/shared";
import { cspAllowed, deepClone, fieldId } from "@/data/decks/validate.js";
import { smartPunctuation } from "@/data/decks/text.js";
import DeckIconSelect from "./DeckIconSelect.vue";
import DeckImageField from "./DeckImageField.vue";
import DeckListField from "./DeckListField.vue";
import { problemsAt } from "./fieldPaths.js";
import { focusChecked, focusFirst, onRadioKeydown } from "./editorA11y.js";
import { IconError, IconWarn } from "./editorIcons.js";
import "../deck.css";
import "./deckEditor.css";

const props = defineProps({
  // { type, label, required?, maxChars?, hint?, options?, ... }
  descriptor: { type: Object, required: true },
  value: { type: null, default: undefined },
  // The object this field is a key of (the slide's props, a list item, a
  // group): what `showWhen` and image sibling keys read.
  context: { type: Object, default: () => ({}) },
  // Relative to the entry: "props.title", "props.people.2.name".
  path: { type: String, required: true },
  slideId: { type: String, required: true },
  // The slide's problems; each field shows the ones at its own path.
  problems: { type: Array, default: () => [] },
  deckId: { type: String, default: "" },
});
const emit = defineEmits(["update"]);

const d = computed(() => props.descriptor);
const type = computed(() => d.value.type);
const id = computed(() => fieldId(props.slideId, props.path));
// Ids of the parts around the control. `--` can't come out of fieldId
// (paths have no empty segments), so none of them can be another field's id:
// a group's `label` key, say, is fieldId(…, 'props.note.label').
const descId = computed(() => `${id.value}--desc`);
const labelId = computed(() => `${id.value}--label`);
const inactiveId = computed(() => `${id.value}--inactive`);
const options = computed(() => d.value.options || []);

const update = (value) => emit("update", props.path, value);
const forward = (path, value) => emit("update", path, value);

// ── visibility ───────────────────────────────────────────────────────────
function filled(v) {
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.values(v).some(filled);
  return v !== undefined && v !== null && v !== false;
}
const shownBySettings = computed(() => {
  if (typeof d.value.showWhen !== "function") return true;
  try {
    return Boolean(d.value.showWhen(props.context ?? {}));
  } catch {
    return true;
  }
});
const inactive = computed(() => !shownBySettings.value);
const rendered = computed(() => shownBySettings.value || filled(props.value));

// What Clear stores for a field the slide isn't showing.
function clear() {
  const t = type.value;
  if (["text", "longtext", "mediaUrl", "imageSrc"].includes(t)) update("");
  else if (t === "strings" || t === "list") update([]);
  else if (t === "bool") update(false);
  else if (t === "image") update({ src: "", alt: "" });
  else if (t === "optional") update(d.value.off === "omit" ? undefined : null);
  else update(undefined);
}

// ── description: hint, count, problems ───────────────────────────────────
const here = computed(() => problemsAt(props.problems, props.path));
const invalid = computed(() => here.value.some((p) => p.level === "error"));
const hint = computed(() =>
  [
    d.value.hint,
    type.value === "longtext" ? "Line breaks aren’t shown on the slide." : "",
  ]
    .filter(Boolean)
    .join(" ")
);
const text = computed(() =>
  typeof props.value === "string" ? props.value : (props.value ?? "") + ""
);
const charCount = computed(() => [...text.value].length);
const over = computed(
  () => d.value.maxChars && charCount.value > d.value.maxChars
);
const showCount = computed(
  () => ["text", "longtext"].includes(type.value) && d.value.maxChars
);
// A video address the site would block, before validation has caught up
// (and in stories, which pass no problems).
const cspWarning = computed(
  () =>
    type.value === "mediaUrl" &&
    text.value.trim() &&
    /^(\/|https?:\/\/)/i.test(text.value.trim()) &&
    !cspAllowed(text.value.trim(), "media") &&
    !here.value.some((p) => p.code === "W_CSP")
);
// W_HIDDEN_FIELD is said by the "Not shown on the slide" line instead.
const shownProblems = computed(() =>
  here.value.filter((p) => p.code !== "W_HIDDEN_FIELD")
);
const DRAWS_OWN = ["list", "strings", "image", "imageSrc"];
const ownDesc = computed(
  () =>
    !DRAWS_OWN.includes(type.value) &&
    (!!hint.value ||
      showCount.value ||
      shownProblems.value.length > 0 ||
      cspWarning.value)
);
const describedBy = computed(
  () =>
    [ownDesc.value && descId.value, inactive.value && inactiveId.value]
      .filter(Boolean)
      .join(" ") || undefined
);

// ── scalar inputs ────────────────────────────────────────────────────────
const smart = computed(() => d.value.smart !== false);
function onTextBlur(e) {
  if (!smart.value) return;
  const next = smartPunctuation(e.target.value);
  if (next !== e.target.value) update(next);
}
function onInt(e) {
  const raw = e.target.value;
  if (raw === "") return;
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n)) update(n);
}
function onIntBlur(e) {
  if (e.target.value === "") update(0);
}

// Up to four options read best as segments; more as a select.
const segmented = computed(
  () =>
    (type.value === "enum" && options.value.length <= 4) ||
    type.value === "position"
);
const segmentValue = computed(() => {
  if (type.value === "position") return props.value || "center";
  return props.value ?? d.value.default ?? "";
});
function onSegment(v) {
  // Choosing the option already shown is no change (an enum left at its
  // default shows the default without storing it).
  if (v === segmentValue.value) return;
  // "center" is DeckImage's default crop: leave the key out for it.
  if (type.value === "position" && v === "center") update(undefined);
  else update(v);
}
const unknownOption = computed(
  () =>
    type.value === "enum" &&
    props.value !== undefined &&
    props.value !== "" &&
    !options.value.some((o) => o.value === props.value)
);

// Arrow keys on the segments and the role colour swatches.
const chooseSegment = (i) => onSegment(options.value[i].value);
const chooseRole = (i) => update(options.value[i].value);

// ── optional groups ──────────────────────────────────────────────────────
const isOn = computed(
  () => props.value !== null && typeof props.value === "object"
);
function toggleOptional(on) {
  if (on) update(deepClone(d.value.defaults ?? {}));
  else update(d.value.off === "omit" ? undefined : null);
}
const subFields = computed(() => Object.entries(d.value.fields || {}));
const groupValue = computed(() =>
  props.value && typeof props.value === "object" ? props.value : {}
);
</script>

<template>
  <div
    v-if="rendered"
    class="deck-field"
    :class="{ 'is-inactive': inactive }"
    :data-type="type"
  >
    <!-- Lists and images draw their own chrome and description. -->
    <DeckListField
      v-if="type === 'list' || type === 'strings'"
      :descriptor="descriptor"
      :value="value"
      :path="path"
      :slide-id="slideId"
      :problems="problems"
      :deck-id="deckId"
      @update="forward"
    >
      <template v-if="type === 'list'" #item="{ item, path: itemPath }">
        <DeckField
          v-for="[key, sub] in Object.entries(descriptor.of || {})"
          :key="key"
          :descriptor="sub"
          :value="item?.[key]"
          :context="item || {}"
          :path="`${itemPath}.${key}`"
          :slide-id="slideId"
          :problems="problems"
          :deck-id="deckId"
          @update="forward"
        />
      </template>
    </DeckListField>

    <DeckImageField
      v-else-if="type === 'image' || type === 'imageSrc'"
      :descriptor="descriptor"
      :value="value"
      :context="context"
      :path="path"
      :slide-id="slideId"
      :problems="problems"
      :deck-id="deckId"
      @update="forward"
    />

    <!-- A group: its fields under one legend. -->
    <fieldset
      v-else-if="type === 'group'"
      :id="id"
      class="deck-ed-fieldset"
      tabindex="-1"
      :aria-describedby="describedBy"
      @focus="focusFirst"
    >
      <legend class="deck-ed-legend">
        {{ descriptor.label
        }}<span
          v-if="descriptor.required"
          class="deck-ed-req"
          aria-hidden="true"
        >
          *</span
        >
      </legend>
      <div class="deck-ed-group">
        <DeckField
          v-for="[key, sub] in subFields"
          :key="key"
          :descriptor="sub"
          :value="groupValue[key]"
          :context="groupValue"
          :path="`${path}.${key}`"
          :slide-id="slideId"
          :problems="problems"
          :deck-id="deckId"
          @update="forward"
        />
      </div>
    </fieldset>

    <!-- An optional group: a switch, then its fields while it is on. -->
    <fieldset v-else-if="type === 'optional'" class="deck-ed-fieldset">
      <legend :id="labelId" class="deck-ed-legend">
        {{ descriptor.label }}
      </legend>
      <div class="deck-field__switchrow">
        <Switch
          :id="id"
          :checked="isOn"
          :aria-labelledby="labelId"
          :aria-describedby="describedBy"
          @update:checked="toggleOptional"
        />
        <span class="deck-field__switchstate" aria-hidden="true">{{
          isOn ? "On" : "Off"
        }}</span>
      </div>
      <div v-if="isOn" class="deck-ed-group">
        <DeckField
          v-for="[key, sub] in subFields"
          :key="key"
          :descriptor="sub"
          :value="groupValue[key]"
          :context="groupValue"
          :path="`${path}.${key}`"
          :slide-id="slideId"
          :problems="problems"
          :deck-id="deckId"
          @update="forward"
        />
      </div>
    </fieldset>

    <!-- A switch, its label beside it. -->
    <div v-else-if="type === 'bool'" class="deck-field__boolrow">
      <label :id="labelId" :for="id" class="deck-field__boollabel">{{
        descriptor.label
      }}</label>
      <Switch
        :id="id"
        :checked="value === true"
        :aria-labelledby="labelId"
        :aria-describedby="describedBy"
        :aria-invalid="invalid ? 'true' : undefined"
        @update:checked="update"
      />
    </div>

    <!-- Segments: a short enum, the crop. -->
    <fieldset v-else-if="segmented" class="deck-ed-fieldset">
      <legend class="deck-ed-legend">{{ descriptor.label }}</legend>
      <SegmentedControl
        :id="id"
        class="deck-field__segments"
        tabindex="-1"
        :model-value="segmentValue"
        :options="options"
        :aria-label="descriptor.label"
        :aria-describedby="describedBy"
        :aria-invalid="invalid ? 'true' : undefined"
        @focus="focusChecked"
        @keydown="onRadioKeydown($event, chooseSegment)"
        @update:model-value="onSegment"
      />
    </fieldset>

    <fieldset v-else-if="type === 'icon'" class="deck-ed-fieldset">
      <legend class="deck-ed-legend">
        {{ descriptor.label
        }}<span
          v-if="descriptor.required"
          class="deck-ed-req"
          aria-hidden="true"
        >
          *</span
        >
      </legend>
      <DeckIconSelect
        :id="id"
        :model-value="value || ''"
        :label="descriptor.label"
        :aria-describedby="describedBy"
        :aria-invalid="invalid ? 'true' : undefined"
        @update:model-value="update"
      />
    </fieldset>

    <fieldset v-else-if="type === 'roleColor'" class="deck-ed-fieldset">
      <legend class="deck-ed-legend">
        {{ descriptor.label
        }}<span
          v-if="descriptor.required"
          class="deck-ed-req"
          aria-hidden="true"
        >
          *</span
        >
      </legend>
      <div
        :id="id"
        class="deck-ed-radios deck-field__swatches"
        role="radiogroup"
        :aria-label="descriptor.label"
        :aria-describedby="describedBy"
        :aria-invalid="invalid ? 'true' : undefined"
        tabindex="-1"
        @focus="focusChecked"
        @keydown="onRadioKeydown($event, chooseRole)"
      >
        <button
          v-for="(opt, i) in options"
          :key="opt.value"
          type="button"
          role="radio"
          class="deck-ed-radio"
          :aria-checked="value === opt.value ? 'true' : 'false'"
          :tabindex="
            value === opt.value ||
            (i === 0 && !options.some((o) => o.value === value))
              ? 0
              : -1
          "
          @click="chooseRole(i)"
        >
          <span
            class="deck-field__swatch"
            :class="`deck-role--${opt.value}`"
            aria-hidden="true"
          />
          {{ opt.label }}
        </button>
      </div>
    </fieldset>

    <!-- One native control in a FormField. -->
    <FormField
      v-else
      :label="descriptor.label"
      :required="!!descriptor.required"
    >
      <textarea
        v-if="type === 'longtext'"
        :id="id"
        :value="text"
        rows="3"
        :placeholder="descriptor.placeholder"
        :aria-required="descriptor.required ? 'true' : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="update($event.target.value)"
        @blur="onTextBlur"
      />
      <select
        v-else-if="type === 'enum'"
        :id="id"
        :value="value ?? descriptor.default ?? ''"
        :aria-required="descriptor.required ? 'true' : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        @change="update($event.target.value)"
      >
        <option v-if="unknownOption" :value="value" disabled>
          {{ value }} (not an option)
        </option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <input
        v-else-if="type === 'int'"
        :id="id"
        type="number"
        inputmode="numeric"
        step="1"
        :min="descriptor.min ?? 0"
        :max="descriptor.max"
        :value="value ?? ''"
        :aria-required="descriptor.required ? 'true' : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="onInt"
        @blur="onIntBlur"
      />
      <input
        v-else-if="type === 'mediaUrl'"
        :id="id"
        type="url"
        inputmode="url"
        spellcheck="false"
        autocomplete="off"
        :value="text"
        :placeholder="descriptor.placeholder || '/publicAssets/deck/…'"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="update($event.target.value.trim())"
      />
      <input
        v-else
        :id="id"
        type="text"
        :value="text"
        :placeholder="descriptor.placeholder"
        :aria-required="descriptor.required ? 'true' : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="update($event.target.value)"
        @blur="onTextBlur"
      />
    </FormField>

    <!-- Hint, count and problems (lists and images draw their own). -->
    <div v-if="ownDesc" :id="descId" class="deck-ed-desc">
      <div v-if="hint || showCount" class="deck-ed-desc__row">
        <span v-if="hint">{{ hint }}</span>
        <span
          v-if="showCount"
          class="deck-ed-count"
          :class="{ 'is-over': over }"
          >{{ charCount }} / {{ descriptor.maxChars
          }}<template v-if="over">
            · {{ charCount - descriptor.maxChars }} over</template
          ></span
        >
      </div>
      <ul v-if="shownProblems.length || cspWarning" class="deck-ed-problems">
        <li
          v-for="(p, i) in shownProblems"
          :key="`${p.code}-${i}`"
          class="deck-ed-problem"
          :class="p.level === 'error' ? 'is-error' : 'is-warn'"
        >
          <component :is="p.level === 'error' ? IconError : IconWarn" />
          <span
            ><span class="sr-only">{{
              p.level === "error" ? "Error: " : "Warning: "
            }}</span
            >{{ p.message }}</span
          >
        </li>
        <li v-if="cspWarning" class="deck-ed-problem is-warn">
          <IconWarn />
          <span
            ><span class="sr-only">Warning: </span>The site blocks videos from
            this address. Use a /publicAssets/ path or a Supabase Storage
            URL.</span
          >
        </li>
      </ul>
    </div>

    <p v-if="inactive" :id="inactiveId" class="deck-field__inactive">
      <IconWarn />
      <span>Not shown on the slide with the current settings.</span>
      <button
        type="button"
        class="deck-ed-link"
        :aria-label="`Clear ${descriptor.label}`"
        @click="clear"
      >
        Clear
      </button>
    </p>
  </div>
</template>

<style scoped>
.deck-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.deck-field.is-inactive {
  padding: 10px;
  border: 1px dashed rgb(var(--color-line));
}
.deck-field__boolrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.deck-field__boollabel {
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  color: rgb(var(--color-ink));
}
.deck-field__switchrow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.deck-field__switchstate {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}
.deck-field__segments {
  align-self: flex-start;
}
.deck-field__segments:focus {
  outline: none;
}
.deck-field__swatches {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.deck-field__swatch {
  flex: none;
  width: 18px;
  height: 18px;
  background: rgb(var(--role));
  box-shadow: inset 0 0 0 1px rgb(var(--color-ink) / 0.15);
}
.deck-field__inactive {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-12);
  color: rgb(var(--color-mute));
}
.deck-field__inactive svg {
  width: 14px;
  height: 14px;
  color: rgb(var(--color-warn));
}
</style>
