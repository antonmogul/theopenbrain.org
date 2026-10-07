<script setup>
// A list field (OPENBRAIN-129): a list of objects (team members, columns,
// milestones) as collapsible item cards, or a list of strings (features,
// paragraphs) as inputs. Add, Duplicate, Remove, Move up and Move down are
// buttons; there is no drag here. The list's min and max are what the
// layout's grid can draw: at max Add is disabled, at min Remove is, and a
// line under the list says why. Items whose `uniqueBy` value repeats an
// earlier item's are flagged on their card.
//
// The fields inside an object item come from the `item` slot
// ({ item, index, path }); DeckField fills it with one DeckField per key, so
// this component never imports DeckField (no import cycle).
// Emits update(path, value): the whole array for list changes; item fields
// emit their own deeper paths through the slot.
//
// Each item has a key that follows it through Move, Remove, Duplicate and
// Add, so its card stays open or closed and its fields (an image upload
// still running, say) move with it, instead of staying at its old position
// and landing on whichever item takes it. Problems navigation opens a closed
// card: the field it jumps to sends a bubbling `deck-reveal` event.
import { computed, nextTick, ref, watch } from "vue";
import { fieldId } from "@/data/decks/validate.js";
import { smartPunctuation } from "@/data/decks/text.js";
import { problemsAt } from "./fieldPaths.js";
import { focusFirst } from "./editorA11y.js";
import {
  IconChevron,
  IconCopy,
  IconDown,
  IconError,
  IconPlus,
  IconTrash,
  IconUp,
  IconWarn,
} from "./editorIcons.js";
import "./deckEditor.css";

const props = defineProps({
  // A `list` or `strings` descriptor.
  descriptor: { type: Object, required: true },
  value: { type: null, default: undefined },
  path: { type: String, required: true },
  slideId: { type: String, required: true },
  problems: { type: Array, default: () => [] },
  deckId: { type: String, default: "" },
});
const emit = defineEmits(["update"]);

const d = computed(() => props.descriptor);
const isStrings = computed(() => d.value.type === "strings");
const items = computed(() => (Array.isArray(props.value) ? props.value : []));
const id = computed(() => fieldId(props.slideId, props.path));
const root = ref(null);

const min = computed(() => d.value.min ?? 0);
const max = computed(() => d.value.max ?? Infinity);
const atMax = computed(() => items.value.length >= max.value);
const atMin = computed(() => items.value.length <= min.value);

const titleOf = (item, i) => {
  if (isStrings.value) return `${d.value.label} ${i + 1}`;
  try {
    return d.value.itemLabel?.(item, i) || `${d.value.label} ${i + 1}`;
  } catch {
    return `${d.value.label} ${i + 1}`;
  }
};

// Why Add or Remove is off: "Columns take 2 to 4 items",
// "Milestones: up to 3 (designed for 3)".
const designed = computed(() =>
  d.value.designCount !== undefined
    ? ` (designed for ${d.value.designCount})`
    : ""
);
const limitReason = computed(() => {
  const { label } = d.value;
  if (atMax.value && max.value !== Infinity)
    return `${label}: up to ${max.value}${designed.value}.`;
  if (atMin.value && min.value > 0) {
    if (max.value === Infinity) return `${label}: at least ${min.value}.`;
    const range =
      min.value === max.value ? `${max.value}` : `${min.value} to ${max.value}`;
    return `${label} take ${range} items.`;
  }
  return "";
});
const reasonId = computed(() => `${id.value}--limit`);

// ── duplicates ───────────────────────────────────────────────────────────
// The same rule as validate.js: trimmed, non-empty, repeated after its
// first use.
const keyOf = (item) => {
  const v = isStrings.value ? item : item?.[d.value.uniqueBy];
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
};
const checksDuplicates = computed(() =>
  isStrings.value ? !!d.value.unique : !!d.value.uniqueBy
);
const duplicateOf = computed(() => {
  const out = {};
  if (!checksDuplicates.value) return out;
  const first = new Map();
  items.value.forEach((item, i) => {
    const k = keyOf(item);
    if (!k) return;
    if (first.has(k)) out[i] = first.get(k);
    else first.set(k, i);
  });
  return out;
});
const uniqueLabel = computed(() =>
  (d.value.of?.[d.value.uniqueBy]?.label || "value").toLowerCase()
);

// ── description ──────────────────────────────────────────────────────────
const listProblems = computed(() => problemsAt(props.problems, props.path));
const descId = computed(() => `${id.value}--desc`);

// ── changes ──────────────────────────────────────────────────────────────
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const write = (next) => emit("update", props.path, next);

// ── item keys ────────────────────────────────────────────────────────────
// Changed in step with each action below, before it writes. A change from
// outside that adds or removes items (undo, redo) starts them afresh, with
// every card open. Cards start open; closing one is the author's choice for
// this session, kept in `closed` by item key, so a closed card stays closed
// when it moves.
const closed = ref(new Set());
let keySeq = 0;
const freshKeys = (n) => Array.from({ length: n }, () => ++keySeq);
const keys = ref(freshKeys(items.value.length));
const keyAt = (i) => keys.value[i] ?? `at-${i}`;
function setKeys(next) {
  keys.value = next;
  const live = new Set(next);
  if ([...closed.value].some((k) => !live.has(k)))
    closed.value = new Set([...closed.value].filter((k) => live.has(k)));
}
watch(
  () => items.value.length,
  (n) => {
    if (keys.value.length === n) return;
    keys.value = freshKeys(n);
    closed.value = new Set();
  }
);

function newItem() {
  if (isStrings.value) return "";
  const item = {};
  const n = items.value.length;
  for (const [key, sub] of Object.entries(d.value.of || {})) {
    if (!sub.required) continue;
    if (sub.type === "text" || sub.type === "longtext")
      item[key] =
        key === d.value.uniqueBy ? `${sub.label} ${n + 1}` : sub.label;
    else if (sub.options?.length) item[key] = freeOption(sub, key);
    else if (sub.type === "int") item[key] = 0;
    else if (sub.type === "strings") item[key] = [];
  }
  return item;
}

// An option no other item uses yet (a new audience role), else the first.
function freeOption(sub, key) {
  const used = new Set(items.value.map((it) => it?.[key]));
  const values = sub.options.map((o) => o.value);
  if (key !== d.value.uniqueBy) return sub.default ?? values[0];
  return values.find((v) => !used.has(v)) ?? values[0];
}

function add() {
  if (atMax.value) return;
  const next = [...items.value.map(clone), newItem()];
  setKeys([...keys.value, ++keySeq]);
  write(next);
  focusItem(next.length - 1);
}

function duplicate(i) {
  if (atMax.value) return;
  const next = items.value.map(clone);
  next.splice(i + 1, 0, distinctCopy(items.value[i]));
  const nextKeys = [...keys.value];
  nextKeys.splice(i + 1, 0, ++keySeq);
  setKeys(nextKeys);
  write(next);
  focusItem(i + 1);
}

// A copy whose unique key differs from the original's, so it doesn't start
// out as a duplicate: "Stuart copy", or a role colour nobody uses yet.
function distinctCopy(item) {
  const copy = clone(item);
  if (isStrings.value) return d.value.unique && copy ? `${copy} copy` : copy;
  const key = d.value.uniqueBy;
  const sub = key && d.value.of?.[key];
  if (!sub || !copy || typeof copy !== "object") return copy;
  if (sub.options) copy[key] = freeOption(sub, key);
  else if (typeof copy[key] === "string" && copy[key].trim())
    copy[key] = `${copy[key]} copy`;
  return copy;
}

function remove(i) {
  if (atMin.value) return;
  const next = items.value.map(clone);
  next.splice(i, 1);
  setKeys(keys.value.filter((_, j) => j !== i));
  write(next);
  // Focus the item that took its place, the one before, or Add.
  nextTick(() => {
    const target = Math.min(i, next.length - 1);
    if (target >= 0) focusItem(target);
    else root.value?.querySelector(".deck-list__add")?.focus();
  });
}

function move(i, delta) {
  const to = i + delta;
  if (to < 0 || to >= items.value.length) return;
  const next = items.value.map(clone);
  [next[i], next[to]] = [next[to], next[i]];
  const nextKeys = [...keys.value];
  [nextKeys[i], nextKeys[to]] = [nextKeys[to], nextKeys[i]];
  setKeys(nextKeys);
  write(next);
  // Keep focus on the same action of the item that moved.
  nextTick(() =>
    root.value
      ?.querySelector(
        `[data-item="${to}"] [data-action="${delta < 0 ? "up" : "down"}"]`
      )
      ?.focus()
  );
}

const FOCUSABLE =
  'input, textarea, select, [role="switch"], [role="radio"][tabindex="0"]';
function focusItem(i) {
  reveal(i);
  nextTick(() =>
    root.value
      ?.querySelector(`[data-item="${i}"]`)
      ?.querySelector(FOCUSABLE)
      ?.focus()
  );
}

// ── strings ──────────────────────────────────────────────────────────────
function setString(i, v) {
  const next = items.value.map(clone);
  next[i] = v;
  write(next);
}
function onStringBlur(i, e) {
  if (d.value.smart === false) return;
  const next = smartPunctuation(e.target.value);
  if (next !== e.target.value) setString(i, next);
}
const chars = (s) => [...(typeof s === "string" ? s : "")].length;

// ── cards ────────────────────────────────────────────────────────────────
const isClosed = (i) => closed.value.has(keyAt(i));
function toggle(i) {
  const next = new Set(closed.value);
  const k = keyAt(i);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  closed.value = next;
}
// Open a closed card: its fields can't take focus while it is closed.
function reveal(i) {
  if (isClosed(i)) toggle(i);
}

const itemPath = (i) => `${props.path}.${i}`;
const itemProblems = (i) => problemsAt(props.problems, itemPath(i));
const itemHasError = (i) =>
  props.problems.some(
    (p) =>
      p.level === "error" &&
      (p.path === itemPath(i) || p.path.startsWith(`${itemPath(i)}.`))
  );
</script>

<template>
  <fieldset
    :id="id"
    ref="root"
    class="deck-ed-fieldset deck-list"
    tabindex="-1"
    :aria-describedby="descId"
    @focus="focusFirst"
  >
    <legend class="deck-ed-legend">
      {{ descriptor.label
      }}<span v-if="descriptor.required" class="deck-ed-req" aria-hidden="true">
        *</span
      >
      <span class="deck-list__count">
        · {{ items.length
        }}<template v-if="max !== Infinity"> of {{ max }}</template></span
      >
    </legend>

    <ol class="deck-list__items">
      <li
        v-for="(item, i) in items"
        :key="keyAt(i)"
        class="deck-list__item"
        :class="{
          'deck-ed-card': !isStrings,
          'is-duplicate': i in duplicateOf,
          'is-error': itemHasError(i),
        }"
        :data-item="i"
        @deck-reveal="reveal(i)"
      >
        <!-- A string: one input with its actions. -->
        <template v-if="isStrings">
          <div class="deck-list__row">
            <label class="sr-only" :for="fieldId(slideId, itemPath(i))">{{
              titleOf(item, i)
            }}</label>
            <textarea
              v-if="descriptor.multiline"
              :id="fieldId(slideId, itemPath(i))"
              class="deck-ed-input"
              rows="3"
              :value="item"
              :aria-invalid="
                itemProblems(i).some((p) => p.level === 'error')
                  ? 'true'
                  : undefined
              "
              :aria-describedby="`${fieldId(slideId, itemPath(i))}--desc`"
              @input="setString(i, $event.target.value)"
              @blur="onStringBlur(i, $event)"
            />
            <input
              v-else
              :id="fieldId(slideId, itemPath(i))"
              class="deck-ed-input"
              type="text"
              :value="item"
              :aria-invalid="
                itemProblems(i).some((p) => p.level === 'error')
                  ? 'true'
                  : undefined
              "
              :aria-describedby="`${fieldId(slideId, itemPath(i))}--desc`"
              @input="setString(i, $event.target.value)"
              @blur="onStringBlur(i, $event)"
            />
            <div class="deck-list__actions">
              <button
                type="button"
                class="deck-ed-iconbtn"
                data-action="up"
                :disabled="i === 0"
                @click="move(i, -1)"
              >
                <IconUp /><span class="sr-only"
                  >Move {{ titleOf(item, i) }} up</span
                >
              </button>
              <button
                type="button"
                class="deck-ed-iconbtn"
                data-action="down"
                :disabled="i === items.length - 1"
                @click="move(i, 1)"
              >
                <IconDown /><span class="sr-only"
                  >Move {{ titleOf(item, i) }} down</span
                >
              </button>
              <button
                type="button"
                class="deck-ed-iconbtn"
                data-action="remove"
                :aria-disabled="atMin ? 'true' : undefined"
                :aria-describedby="atMin && limitReason ? reasonId : undefined"
                @click="remove(i)"
              >
                <IconTrash /><span class="sr-only"
                  >Remove {{ titleOf(item, i) }}</span
                >
              </button>
            </div>
          </div>
          <div
            :id="`${fieldId(slideId, itemPath(i))}--desc`"
            class="deck-ed-desc"
          >
            <div v-if="descriptor.maxChars" class="deck-ed-desc__row">
              <span
                class="deck-ed-count"
                :class="{ 'is-over': chars(item) > descriptor.maxChars }"
                >{{ chars(item) }} / {{ descriptor.maxChars }}</span
              >
            </div>
            <p
              v-if="
                i in duplicateOf &&
                !itemProblems(i).some((p) => p.code === 'E_DUPLICATE')
              "
              class="deck-list__dup"
            >
              <IconError />Same as item {{ duplicateOf[i] + 1 }}
            </p>
            <ul v-if="itemProblems(i).length" class="deck-ed-problems">
              <li
                v-for="(p, k) in itemProblems(i)"
                :key="`${p.code}-${k}`"
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
            </ul>
          </div>
        </template>

        <!-- An object: a card with a header and its fields. -->
        <template v-else>
          <div class="deck-list__head">
            <button
              type="button"
              class="deck-list__toggle deck-ed-focus"
              :aria-expanded="isClosed(i) ? 'false' : 'true'"
              :aria-controls="`${fieldId(slideId, itemPath(i))}--body`"
              @click="toggle(i)"
            >
              <IconChevron
                class="deck-list__chevron"
                :class="{ 'is-open': !isClosed(i) }"
              />
              <span class="deck-list__num">{{ i + 1 }}</span>
              <span class="deck-list__title">{{ titleOf(item, i) }}</span>
            </button>
            <span v-if="i in duplicateOf" class="deck-ed-badge is-error">
              <IconError />Same {{ uniqueLabel }} as {{ duplicateOf[i] + 1 }}
            </span>
            <span
              v-else-if="itemHasError(i)"
              class="deck-ed-badge is-error"
              :title="`${titleOf(item, i)} has a problem`"
              ><IconError /><span class="sr-only">Has a problem</span></span
            >
            <div class="deck-list__actions">
              <button
                type="button"
                class="deck-ed-iconbtn"
                data-action="up"
                :disabled="i === 0"
                @click="move(i, -1)"
              >
                <IconUp /><span class="sr-only"
                  >Move {{ titleOf(item, i) }} up</span
                >
              </button>
              <button
                type="button"
                class="deck-ed-iconbtn"
                data-action="down"
                :disabled="i === items.length - 1"
                @click="move(i, 1)"
              >
                <IconDown /><span class="sr-only"
                  >Move {{ titleOf(item, i) }} down</span
                >
              </button>
              <button
                type="button"
                class="deck-ed-iconbtn"
                data-action="duplicate"
                :aria-disabled="atMax ? 'true' : undefined"
                :aria-describedby="atMax && limitReason ? reasonId : undefined"
                @click="duplicate(i)"
              >
                <IconCopy /><span class="sr-only"
                  >Duplicate {{ titleOf(item, i) }}</span
                >
              </button>
              <button
                type="button"
                class="deck-ed-iconbtn"
                data-action="remove"
                :aria-disabled="atMin ? 'true' : undefined"
                :aria-describedby="atMin && limitReason ? reasonId : undefined"
                @click="remove(i)"
              >
                <IconTrash /><span class="sr-only"
                  >Remove {{ titleOf(item, i) }}</span
                >
              </button>
            </div>
          </div>
          <div
            v-show="!isClosed(i)"
            :id="`${fieldId(slideId, itemPath(i))}--body`"
            class="deck-list__body"
          >
            <ul v-if="itemProblems(i).length" class="deck-ed-problems">
              <li
                v-for="(p, k) in itemProblems(i)"
                :key="`${p.code}-${k}`"
                class="deck-ed-problem"
                :class="p.level === 'error' ? 'is-error' : 'is-warn'"
              >
                <component :is="p.level === 'error' ? IconError : IconWarn" />
                <span>{{ p.message }}</span>
              </li>
            </ul>
            <slot name="item" :item="item" :index="i" :path="itemPath(i)" />
          </div>
        </template>
      </li>
    </ol>

    <div class="deck-list__foot">
      <button
        type="button"
        class="deck-list__add deck-ed-link"
        :aria-disabled="atMax ? 'true' : undefined"
        :aria-describedby="atMax && limitReason ? reasonId : undefined"
        @click="add"
      >
        <IconPlus />Add<span class="sr-only"> to {{ descriptor.label }}</span>
      </button>
      <span
        v-if="limitReason && (atMax || atMin)"
        :id="reasonId"
        class="deck-list__reason"
        >{{ limitReason }}</span
      >
    </div>

    <div :id="descId" class="deck-ed-desc">
      <span v-if="descriptor.hint">{{ descriptor.hint }}</span>
      <ul v-if="listProblems.length" class="deck-ed-problems">
        <li
          v-for="(p, k) in listProblems"
          :key="`${p.code}-${k}`"
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
      </ul>
    </div>
  </fieldset>
</template>

<style scoped>
.deck-list:focus {
  outline: none;
}
.deck-list__count {
  text-transform: none;
  letter-spacing: 0;
}
.deck-list__items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.deck-list__item.deck-ed-card.is-duplicate,
.deck-list__item.deck-ed-card.is-error {
  border-color: rgb(var(--color-accent) / 0.6);
}
.deck-list__row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}
.deck-list__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  padding: 4px 4px 4px 6px;
}
.deck-list__toggle {
  display: flex;
  flex: 1 1 8rem;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 2px;
  border: 0;
  background: none;
  color: rgb(var(--color-ink));
  text-align: left;
  cursor: pointer;
}
.deck-list__chevron {
  flex: none;
  color: rgb(var(--color-mute));
}
.deck-list__chevron.is-open {
  transform: rotate(90deg);
}
.deck-list__num {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  color: rgb(var(--color-mute));
}
.deck-list__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  font-weight: 500;
}
.deck-list__actions {
  display: flex;
  flex: none;
  gap: 2px;
  margin-left: auto;
}
.deck-list__actions [aria-disabled="true"] {
  color: rgb(var(--color-mute) / 0.6);
  cursor: not-allowed;
}
.deck-list__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 10px 12px 14px;
  border-top: 1px solid rgb(var(--color-line));
}
.deck-list__dup {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: rgb(var(--color-ink));
}
.deck-list__dup svg {
  width: 14px;
  height: 14px;
  color: rgb(var(--color-accent));
}
.deck-list__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}
.deck-list__add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.deck-list__add svg {
  width: 14px;
  height: 14px;
}
.deck-list__add[aria-disabled="true"] {
  color: rgb(var(--color-mute));
  cursor: not-allowed;
  text-decoration: none;
}
.deck-list__reason {
  font-family: var(--font-ui);
  font-size: var(--ui-size-12);
  color: rgb(var(--color-mute));
}
</style>
