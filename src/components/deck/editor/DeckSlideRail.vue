<script setup>
// The deck editor's slide rail (OPENBRAIN-129): every slide in order as a
// numbered thumbnail with its label, a Hidden badge, a notes dot and its
// problem count. Click to select; Up/Down move the selection; Alt+Up/Down,
// drag (with an insertion line) or the item menu reorder; Delete or
// Backspace removes the focused slide. The rail only emits: the editor owns
// the entries and the undo history. Moves and deletions are announced in a
// polite live region.
//
// It lays itself out by its own width: a column in the 240px rail, a
// horizontal strip of 140px thumbnails when the editor gives it the full
// width (1024–1279px).
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { Button } from "@/components/dashboard/shared";
import SlidePreview from "../SlidePreview.vue";
import {
  IconCopy,
  IconDown,
  IconError,
  IconEyeOff,
  IconMore,
  IconPlus,
  IconTrash,
  IconUp,
  IconWarn,
} from "./editorIcons.js";
import "./deckEditor.css";

const props = defineProps({
  entries: { type: Array, required: true },
  selectedId: { type: String, default: null },
  // { [slideId]: { errors, warnings } }, as counts (or lists).
  problemsById: { type: Object, default: () => ({}) },
});
const emit = defineEmits([
  "select",
  "move",
  "moveTo",
  "duplicate",
  "remove",
  "toggleHidden",
  "add",
]);

const list = ref(null);
const announcement = ref("");
const menuFor = ref(null);

const count = (v) => (Array.isArray(v) ? v.length : Number(v) || 0);
const errorsOf = (id) => count(props.problemsById?.[id]?.errors);
const warningsOf = (id) => count(props.problemsById?.[id]?.warnings);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The one slide reachable with Tab: the selected one, or the first. Its
// Actions button is the rail's only other tab stop (arrows move the
// selection, and the Actions button with it), so Tab leaves the rail in two
// steps however long the deck is.
const tabStopId = computed(() =>
  props.entries.some((e) => e.id === props.selectedId)
    ? props.selectedId
    : props.entries[0]?.id
);

/** "Slide 3: Team, 1 error, 2 warnings, hidden, has speaker notes". */
function nameOf(entry, i) {
  const parts = [`Slide ${i + 1}: ${entry.label || "Untitled"}`];
  const errors = errorsOf(entry.id);
  const warnings = warningsOf(entry.id);
  if (errors) parts.push(plural(errors, "error"));
  if (warnings) parts.push(plural(warnings, "warning"));
  if (entry.hidden) parts.push("hidden");
  if (entry.notes) parts.push("has speaker notes");
  return parts.join(", ");
}

function say(text) {
  // Clear first so the same words twice in a row are announced twice.
  announcement.value = "";
  nextTick(() => (announcement.value = text));
}

// After a reorder or a deletion the list re-renders; put focus back on the
// slide the author is working with once it has.
function focusSlide(id) {
  nextTick(() =>
    list.value?.querySelector(`[data-slide-id="${CSS.escape(id)}"]`)?.focus()
  );
}

const indexOf = (id) => props.entries.findIndex((e) => e.id === id);

function select(id, { focus = false } = {}) {
  emit("select", id);
  if (focus) focusSlide(id);
}

function move(id, delta) {
  const from = indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= props.entries.length) return;
  emit("move", id, delta);
  say(`Slide moved to position ${to + 1}.`);
  focusSlide(id);
}

function remove(id) {
  const i = indexOf(id);
  if (i < 0) return;
  // Focus goes to the next slide, or the previous one at the end.
  const next = props.entries[i + 1]?.id ?? props.entries[i - 1]?.id;
  emit("remove", id);
  say("Slide deleted. Undo available.");
  if (next) {
    emit("select", next);
    focusSlide(next);
  }
}

function duplicate(id) {
  emit("duplicate", id);
  say("Slide duplicated.");
}

function toggleHidden(entry) {
  emit("toggleHidden", entry.id);
  say(
    entry.hidden
      ? "Slide shown when presenting."
      : "Slide hidden when presenting."
  );
}

function onItemKeydown(event, entry, i) {
  const back = event.key === "ArrowUp" || event.key === "ArrowLeft";
  const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
  if ((back || forward) && event.altKey) {
    event.preventDefault();
    move(entry.id, back ? -1 : 1);
  } else if (back || forward) {
    event.preventDefault();
    const target = props.entries[i + (back ? -1 : 1)];
    if (target) select(target.id, { focus: true });
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    const target =
      props.entries[event.key === "Home" ? 0 : props.entries.length - 1];
    if (target) select(target.id, { focus: true });
  } else if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    remove(entry.id);
  }
}

// ── item menu ─────────────────────────────────────────────────────────────
// In the column the menu drops below its button. In the strip the list
// scrolls sideways, which would clip a menu inside it, so the menu moves to
// <body> and is placed under its button in viewport coordinates (and closes
// when the strip or the page scrolls).
const MENU_W = 192; // .deck-rail__menu min-width (12rem)
const menuStyle = ref(null);
const menuEl = (id) => document.getElementById(`deck-rail-menu-${id}`);
const menuButton = (id) =>
  list.value?.querySelector(`[data-menu-for="${CSS.escape(id)}"]`);

function placeMenu(id) {
  const rect = isStrip.value ? menuButton(id)?.getBoundingClientRect() : null;
  if (!rect) {
    menuStyle.value = null;
    return;
  }
  const maxLeft = window.innerWidth - MENU_W - 8;
  menuStyle.value = {
    position: "fixed",
    top: `${Math.round(rect.bottom + 4)}px`,
    left: `${Math.round(Math.max(8, Math.min(rect.right - MENU_W, maxLeft)))}px`,
    right: "auto",
    bottom: "auto",
    zIndex: 40,
  };
}
function toggleMenu(id) {
  menuFor.value = menuFor.value === id ? null : id;
  if (menuFor.value) {
    placeMenu(id);
    nextTick(() => menuEl(id)?.querySelector("button:not(:disabled)")?.focus());
  }
}
// The Actions button stays in the list while its menu closes, so focus goes
// back to it at once: a dialog an action opens (Add slide below) then
// records it as the opener, and returns focus there when it closes.
function closeMenu({ refocus = false } = {}) {
  const id = menuFor.value;
  menuFor.value = null;
  if (refocus && id) menuButton(id)?.focus();
}
// Only the strip's fixed menu is left behind by a scroll; the column's menu
// moves with its slide.
const onScrollAway = () => menuFor.value && menuStyle.value && closeMenu();
// Focus goes back to the menu's button, unless the action moves it on
// (to a moved slide, or the next one after a deletion).
function menuAction(fn) {
  closeMenu({ refocus: true });
  fn();
}
function onMenuKeydown(event) {
  if (event.key === "Escape") {
    event.stopPropagation();
    closeMenu({ refocus: true });
  }
}
function onDocumentPointer(event) {
  if (!event.target.closest?.(".deck-rail__item.has-menu, .deck-rail__menu"))
    closeMenu();
}
function listen(on) {
  const method = on ? "addEventListener" : "removeEventListener";
  document[method]("pointerdown", onDocumentPointer);
  window[method]("resize", onScrollAway);
  // Capture: a scroll anywhere (the strip, the editor pane) moves the button.
  window[method]("scroll", onScrollAway, true);
}
watch(menuFor, (id, before) => {
  if (Boolean(id) !== Boolean(before)) listen(Boolean(id));
});
onBeforeUnmount(() => listen(false));

// ── drag and drop ─────────────────────────────────────────────────────────
// The insertion line sits before or after the slide under the pointer,
// whichever half of it the pointer is in. `drop` is the index in the list
// as it is now; moveTo gets the index after the dragged slide is lifted out.
const dragId = ref(null);
const drop = ref(null);

function onDragStart(event, entry) {
  dragId.value = entry.id;
  closeMenu();
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", entry.id);
}
function onDragOver(event, i) {
  if (!dragId.value) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const rect = event.currentTarget.getBoundingClientRect();
  const after = isStrip.value
    ? event.clientX > rect.left + rect.width / 2
    : event.clientY > rect.top + rect.height / 2;
  drop.value = after ? i + 1 : i;
}
function onDrop(event) {
  event.preventDefault();
  const id = dragId.value;
  const from = indexOf(id);
  const at = drop.value;
  onDragEnd();
  if (from < 0 || at === null) return;
  const to = at > from ? at - 1 : at;
  if (to === from) return;
  emit("moveTo", id, to);
  say(`Slide moved to position ${to + 1}.`);
  focusSlide(id);
}
function onDragEnd() {
  dragId.value = null;
  drop.value = null;
}

// Strip or column, from the rail's own width (see the container query).
const isStrip = ref(false);
let observer;
watch(list, (el) => {
  observer?.disconnect();
  if (!el || typeof ResizeObserver === "undefined") return;
  observer = new ResizeObserver(([e]) => {
    isStrip.value = e.contentRect.width >= 480;
  });
  observer.observe(el);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <nav class="deck-rail" aria-label="Slides">
    <ol ref="list" class="deck-rail__list" @dragleave.self="drop = null">
      <li
        v-for="(entry, i) in entries"
        :key="entry.id"
        class="deck-rail__item"
        :class="{
          'is-selected': entry.id === selectedId,
          'is-dragging': entry.id === dragId,
          'drop-before': drop === i && dragId,
          'drop-after': drop === i + 1 && i === entries.length - 1 && dragId,
          'has-menu': menuFor === entry.id,
        }"
        draggable="true"
        @dragstart="onDragStart($event, entry)"
        @dragover="onDragOver($event, i)"
        @drop="onDrop"
        @dragend="onDragEnd"
      >
        <button
          type="button"
          class="deck-rail__slide"
          :data-slide-id="entry.id"
          :aria-current="entry.id === selectedId ? 'true' : undefined"
          :aria-label="nameOf(entry, i)"
          :tabindex="entry.id === tabStopId ? 0 : -1"
          @click="select(entry.id)"
          @keydown="onItemKeydown($event, entry, i)"
        >
          <span class="deck-rail__num" aria-hidden="true">{{ i + 1 }}</span>
          <span class="deck-rail__thumb">
            <SlidePreview :entry="entry" thumb :debounce="300" />
          </span>
          <span class="deck-rail__label" aria-hidden="true">{{
            entry.label || "Untitled"
          }}</span>
          <span class="deck-rail__meta" aria-hidden="true">
            <span v-if="entry.hidden" class="deck-ed-badge is-muted"
              ><IconEyeOff />Hidden</span
            >
            <span
              v-if="errorsOf(entry.id)"
              class="deck-ed-badge is-error"
              :title="plural(errorsOf(entry.id), 'error')"
              ><IconError />{{ errorsOf(entry.id) }}</span
            >
            <span
              v-if="warningsOf(entry.id)"
              class="deck-ed-badge is-warn"
              :title="plural(warningsOf(entry.id), 'warning')"
              ><IconWarn />{{ warningsOf(entry.id) }}</span
            >
            <span
              v-if="entry.notes"
              class="deck-rail__notes"
              title="Has speaker notes"
            />
          </span>
        </button>

        <button
          type="button"
          class="deck-rail__more deck-ed-iconbtn"
          :data-menu-for="entry.id"
          :aria-label="`Actions for slide ${i + 1}`"
          :aria-expanded="menuFor === entry.id ? 'true' : 'false'"
          :aria-controls="`deck-rail-menu-${entry.id}`"
          :tabindex="entry.id === tabStopId ? 0 : -1"
          @click="toggleMenu(entry.id)"
        >
          <IconMore />
        </button>
        <Teleport to="body" :disabled="!menuStyle">
          <ul
            v-if="menuFor === entry.id"
            :id="`deck-rail-menu-${entry.id}`"
            class="deck-rail__menu deck-ed-card"
            :style="menuStyle"
            @keydown="onMenuKeydown"
          >
            <li>
              <button
                type="button"
                :disabled="i === 0"
                @click="menuAction(() => move(entry.id, -1))"
              >
                <IconUp />Move<span class="sr-only"> slide {{ i + 1 }}</span> up
              </button>
            </li>
            <li>
              <button
                type="button"
                :disabled="i === entries.length - 1"
                @click="menuAction(() => move(entry.id, 1))"
              >
                <IconDown />Move<span class="sr-only"> slide {{ i + 1 }}</span>
                down
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="menuAction(() => duplicate(entry.id))"
              >
                <IconCopy />Duplicate<span class="sr-only">
                  slide {{ i + 1 }}</span
                >
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="menuAction(() => toggleHidden(entry))"
              >
                <IconEyeOff />{{ entry.hidden ? "Show" : "Hide"
                }}<span class="sr-only"> slide {{ i + 1 }}</span> when
                presenting
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="menuAction(() => emit('add', entry.id))"
              >
                <IconPlus />Add slide below<span class="sr-only">
                  slide {{ i + 1 }}</span
                >
              </button>
            </li>
            <li>
              <button
                type="button"
                class="is-danger"
                @click="menuAction(() => remove(entry.id))"
              >
                <IconTrash />Delete<span class="sr-only">
                  slide {{ i + 1 }}</span
                >
              </button>
            </li>
          </ul>
        </Teleport>
      </li>
    </ol>

    <p v-if="!entries.length" class="deck-rail__empty">
      No slides yet. Add one to start.
    </p>

    <Button
      class="deck-rail__add"
      variant="outline"
      size="sm"
      block
      @click="emit('add', selectedId || entries.at(-1)?.id || null)"
    >
      <template #icon-left><IconPlus /></template>
      Add slide
    </Button>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </nav>
</template>

<style scoped>
.deck-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  container-type: inline-size;
}
.deck-rail__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.deck-rail__item {
  position: relative;
}
.deck-rail__item.is-dragging {
  opacity: 0.45;
}
/* The insertion line, before this slide or after the last one. */
.deck-rail__item.drop-before::before,
.deck-rail__item.drop-after::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: rgb(var(--color-accent));
  z-index: 2;
}
.deck-rail__item.drop-before::before {
  top: -5px;
}
.deck-rail__item.drop-after::after {
  bottom: -5px;
}

.deck-rail__slide {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr);
  grid-template-areas:
    "num thumb"
    ". label"
    ". meta";
  gap: 4px 6px;
  width: 100%;
  padding: 6px 34px 6px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  text-align: left;
  cursor: pointer;
}
.deck-rail__slide:hover {
  background: rgb(var(--color-ink) / 0.04);
}
.deck-rail__slide[aria-current="true"] {
  border-color: rgb(var(--color-ink));
  background: rgb(var(--color-paper));
}
.deck-rail__slide:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.deck-rail__num {
  grid-area: num;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-mute));
}
.deck-rail__thumb {
  grid-area: thumb;
  display: block;
  pointer-events: none;
}
.deck-rail__label {
  grid-area: label;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
}
.deck-rail__meta {
  grid-area: meta;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 0;
}
.deck-rail__meta:empty {
  display: none;
}
.deck-rail__notes {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgb(var(--color-ink));
}

.deck-rail__more {
  position: absolute;
  top: 4px;
  right: 2px;
}
.deck-rail__menu {
  position: absolute;
  top: 34px;
  right: 2px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 12rem;
  margin: 0;
  padding: 4px;
  list-style: none;
  box-shadow: 0 10px 30px rgb(var(--color-ink) / 0.14);
}
.deck-rail__menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  background: none;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
  text-align: left;
  cursor: pointer;
}
.deck-rail__menu button:hover:not(:disabled) {
  background: rgb(var(--color-ink) / 0.06);
}
.deck-rail__menu button:disabled {
  color: rgb(var(--color-mute) / 0.7);
  cursor: not-allowed;
}
.deck-rail__menu button:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: -2px;
}
.deck-rail__menu button.is-danger {
  color: rgb(var(--color-ink));
  font-weight: 600;
}
.deck-rail__empty {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-mute));
}

/* Given the full width (the 1024–1279px editor), the rail is a strip of
   140px thumbnails that scrolls sideways. */
@container (min-width: 480px) {
  .deck-rail__list {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 6px;
  }
  .deck-rail__item {
    flex: none;
    width: 140px;
  }
  .deck-rail__slide {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "thumb"
      "label"
      "meta";
    padding-right: 6px;
  }
  .deck-rail__num {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1;
    padding: 0 4px;
    background: rgb(var(--color-paper) / 0.9);
  }
  .deck-rail__more {
    top: auto;
    bottom: 4px;
  }
  .deck-rail__menu {
    top: auto;
    bottom: 34px;
  }
  .deck-rail__item.drop-before::before,
  .deck-rail__item.drop-after::after {
    top: 0;
    bottom: 0;
    width: 3px;
    height: auto;
  }
  .deck-rail__item.drop-before::before {
    left: -5px;
    right: auto;
  }
  .deck-rail__item.drop-after::after {
    left: auto;
    right: -5px;
  }
  .deck-rail__add {
    align-self: flex-start;
    width: auto;
  }
}
</style>
