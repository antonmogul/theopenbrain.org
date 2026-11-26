<script setup>
/*
 * Search this chapter (OPENBRAIN-197): the field in the reader's top bar,
 * where "Ch 1 · Where is my mind?" used to be (Stuart, 11 Nov).
 *
 * It searches the chapter the reader already holds as they type (headings,
 * paragraphs, breakout boxes, widgets, figure titles and legends:
 * helper/chapterSearch.js), lists what it finds under the field with the
 * words marked, and jumps to a result through readerJump with a flash. No
 * request: the index is built from useText the first time the field is
 * used, plus the figure records the pane has already fetched.
 *
 * Keys: "/" focuses it from anywhere on the page, the arrows move through
 * the results, Enter goes, Escape closes. It is a combobox over a listbox,
 * so focus stays in the field and the active row is announced.
 *
 * The field is behind the search icon at every width (OPENBRAIN-78): the
 * icon opens it inline, beside itself, and a second press puts it away.
 * Below 640px the bar has no room beside the icon, so the field is laid
 * across the whole bar, with its own close.
 *
 * From 641px pointing at the icon is enough to see it (OPENBRAIN-92; Maura,
 * 25 Nov): the line opens out of the icon and the words slide in from the
 * left, and both go back when the pointer leaves, unless the reader is in
 * the field or has typed in it. The line is white, not the accent.
 *
 * It takes the bar's ink from --bar-ink / --bar-bg (ReaderTopBar), and
 * falls back to the page's ink and paper on its own.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useText } from "@/stores";
import { useAnimations } from "@/composables/useAnimations";
import { sectionLabelMap } from "@/composables/useChapterOutline";
import { buildSearchIndex, searchChapter } from "@/helper/chapterSearch";
import { jumpToId } from "@/helper/readerJump";
import CloseIcon from "@/icons/custom/CloseIcon.vue";

const props = defineProps({
  /* Figure records, for stories and tests; the reader's own otherwise. */
  records: { type: Array, default: null },
});
const emit = defineEmits(["open"]);

const LIMIT = 20;

const textStore = useText();
const { animations, fetchAnimations } = useAnimations();

const root = ref(null);
const input = ref(null);
const toggle = ref(null);
const list = ref(null);

const query = ref("");
// The field has been used: build the index (not before, a chapter is long).
const used = ref(false);
// The results are showing.
const open = ref(false);
// The field is out from behind its icon.
const expanded = ref(false);
// A mouse is pointing at the icon or the field: the field shows, no more.
const peek = ref(false);
const active = ref(0);

const index = shallowRef([]);
watch(
  [used, () => textStore.text, () => props.records, animations],
  () => {
    if (!used.value) return;
    index.value = buildSearchIndex(textStore.text, {
      labels: sectionLabelMap(textStore.text?.sections),
      figures: props.records || animations.value,
    });
  },
  { immediate: true }
);
// Another chapter: nothing typed for the last one applies.
watch(
  () => textStore.text?.slug,
  () => {
    query.value = "";
    open.value = false;
  }
);

const found = computed(() =>
  searchChapter(index.value, query.value, { limit: LIMIT })
);
const results = computed(() => found.value.results);
const searching = computed(() => query.value.trim().length >= 2);
const showPanel = computed(() => open.value && searching.value);
const status = computed(() => {
  const { total } = found.value;
  if (!total) return `Nothing in this chapter for “${query.value.trim()}”`;
  if (total > LIMIT) return `${LIMIT} of ${total} results. Keep typing.`;
  return total === 1 ? "1 result" : `${total} results`;
});
const optionId = (i) => `reader-search-option-${i}`;

watch(query, () => {
  active.value = 0;
  open.value = true;
  if (list.value) list.value.scrollTop = 0;
});

function use() {
  if (used.value) return;
  used.value = true;
  // The pane fetched these already (one shared cache); a story or a
  // chapter with no figures simply has none.
  if (!props.records) fetchAnimations().catch(() => {});
}

// A field the pointer opened becomes the reader's once they are in it.
function onFocus() {
  use();
  open.value = true;
  expanded.value = true;
  emit("open");
}

// Touch has no pointing: there the icon is a plain toggle.
function onPointerEnter(event) {
  if ((event.pointerType || "mouse") === "mouse") peek.value = true;
}
function onPointerLeave() {
  peek.value = false;
}

async function expand() {
  if (expanded.value) return close({ refocus: true });
  use();
  expanded.value = true;
  emit("open");
  await nextTick();
  input.value?.focus();
}

async function close({ refocus = false } = {}) {
  const wasExpanded = expanded.value;
  open.value = false;
  expanded.value = false;
  query.value = "";
  await nextTick();
  open.value = false;
  if (refocus && wasExpanded) toggle.value?.focus();
  else if (refocus) input.value?.blur();
}

// The field's ×: with words in it, start again; empty (a phone), put the
// field away.
function onCloseButton() {
  if (!query.value) return close({ refocus: true });
  query.value = "";
  input.value?.focus();
}

function move(step) {
  const n = results.value.length;
  if (!n) return;
  open.value = true;
  active.value = (active.value + step + n) % n;
  nextTick(() => {
    list.value
      ?.querySelector(`#${optionId(active.value)}`)
      ?.scrollIntoView?.({ block: "nearest" });
  });
}

async function go(result) {
  if (!result) return;
  const id = result.entry.id;
  await close();
  input.value?.blur();
  await nextTick();
  jumpToId(id, { align: "top", flash: true, focus: true, focusVisible: false });
}

function onKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    move(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    move(-1);
  } else if (event.key === "Enter") {
    if (!showPanel.value) return;
    event.preventDefault();
    go(results.value[active.value]);
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close({ refocus: true });
  }
}

// Leaving the field (Tab, a press elsewhere) puts the results away; the
// words stay, so coming back shows them again.
function onFocusOut(event) {
  const next = event.relatedTarget;
  if (next && root.value?.contains(next)) return;
  open.value = false;
  if (expanded.value && !query.value) expanded.value = false;
}

const EDITABLE =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
function onSlash(event) {
  if (event.key !== "/" || event.defaultPrevented) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target?.closest?.(EDITABLE)) return;
  event.preventDefault();
  // Behind its icon the field is hidden and cannot take focus: open it.
  input.value?.focus();
  if (document.activeElement !== input.value) expand();
}

onMounted(() => window.addEventListener("keydown", onSlash));
onBeforeUnmount(() => window.removeEventListener("keydown", onSlash));

defineExpose({ close });
</script>

<template>
  <div
    ref="root"
    class="reader-search"
    :class="{
      'is-expanded': expanded,
      'is-peek': peek,
      'is-open': showPanel,
    }"
    data-testid="reader-search"
    @focusout="onFocusOut"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <!-- The field is behind this button. -->
    <button
      ref="toggle"
      type="button"
      class="search-toggle"
      aria-label="Search this chapter"
      :aria-expanded="expanded"
      data-testid="reader-search-toggle"
      @click="expand"
    >
      <!-- 20px in a 1.25px line: the weight of the mark's brain beside it
           and of the drawer's home icon (OPENBRAIN-92). -->
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
    </button>

    <div class="search-field" role="search">
      <svg
        class="search-glass"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
      <input
        ref="input"
        v-model="query"
        class="search-input"
        type="text"
        inputmode="search"
        enterkeyhint="search"
        role="combobox"
        aria-label="Search this chapter"
        aria-autocomplete="list"
        aria-controls="reader-search-results"
        :aria-expanded="showPanel"
        :aria-activedescendant="
          showPanel && results.length ? optionId(active) : undefined
        "
        placeholder="Search this chapter"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        data-testid="reader-search-input"
        @focus="onFocus"
        @keydown="onKeydown"
      />
      <kbd v-if="!query" class="search-key" aria-hidden="true">/</kbd>
      <button
        v-if="query || expanded"
        type="button"
        class="search-close"
        :aria-label="query ? 'Clear search' : 'Close search'"
        data-testid="reader-search-close"
        @click="onCloseButton"
      >
        <CloseIcon :width="14" :height="14" />
      </button>
    </div>

    <div
      v-show="showPanel"
      class="search-panel"
      data-testid="reader-search-panel"
      @mousedown.prevent
    >
      <p class="search-status" role="status" aria-live="polite">
        {{ showPanel ? status : "" }}
      </p>
      <ul
        id="reader-search-results"
        ref="list"
        class="search-list"
        role="listbox"
        aria-label="Search results"
      >
        <li
          v-for="(result, i) in results"
          :id="optionId(i)"
          :key="`${result.entry.order}`"
          class="search-result"
          :class="{ 'is-active': i === active }"
          role="option"
          :aria-selected="i === active"
          :data-kind="result.entry.kind"
          @pointermove="active = i"
          @click="go(result)"
        >
          <span
            v-if="result.entry.tag || result.title.length"
            class="result-head"
          >
            <span v-if="result.entry.tag" class="result-tag">{{
              result.entry.tag
            }}</span>
            <span v-if="result.title.length" class="result-title"
              ><template v-for="(part, k) in result.title" :key="k"
                ><mark v-if="part.hit" class="search-hit">{{ part.text }}</mark
                ><template v-else>{{ part.text }}</template></template
              ></span
            >
          </span>
          <span v-if="result.body.length" class="result-body"
            ><template v-for="(part, k) in result.body" :key="k"
              ><mark v-if="part.hit" class="search-hit">{{ part.text }}</mark
              ><template v-else>{{ part.text }}</template></template
            ></span
          >
          <span v-if="result.entry.where" class="result-where">{{
            result.entry.where
          }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.reader-search {
  --search-ink: var(--bar-ink, var(--color-ink));
  --search-bg: var(--bar-bg, var(--color-paper));
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  /* The page hyphenates (index.css); a results list should not. */
  hyphens: manual;
  -webkit-hyphens: manual;
}

.search-toggle {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--search-ink));
  cursor: pointer;
}
/* Not on touch, where a hover sticks after the tap. */
@media (hover: hover) {
  .search-toggle:hover {
    background: rgb(var(--search-ink) / 0.1);
  }
}

/* The field: a line of type on the bar, ruled underneath, no box. */
.search-field {
  display: none;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 0 0 4px;
  border-bottom: 1px solid rgb(var(--search-ink) / 0.6);
  color: rgb(var(--search-ink));
  transition: border-color 0.12s ease;
}
.reader-search.is-expanded .search-field {
  display: flex;
}
/* In the field: the line is full white and a pixel heavier. White, not
   the accent (Maura, 25 Nov). */
.search-field:focus-within {
  border-bottom-color: rgb(var(--search-ink));
  box-shadow: 0 1px 0 rgb(var(--search-ink));
}

/* The icon that opened the field stands for it from 640px up. */
.search-glass {
  display: none;
  flex-shrink: 0;
  color: rgb(var(--search-ink) / 0.65);
}
.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--font-ui);
  /* 16px: iOS zooms the page into any field set smaller. */
  font-size: var(--ui-size-16);
  line-height: 1.2;
  outline: none;
}
.search-input::placeholder {
  color: rgb(var(--search-ink) / 0.65);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.search-key {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  border: 1px solid rgb(var(--search-ink) / 0.35);
  border-radius: 3px;
  color: rgb(var(--search-ink) / 0.65);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1;
}
.search-close {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--search-ink) / 0.65);
  cursor: pointer;
}
.search-close:hover {
  color: rgb(var(--search-ink));
  background: rgb(var(--search-ink) / 0.1);
}
.search-toggle:focus-visible,
.search-close:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: -3px;
}

/* The results: under the field, as wide as a line of reading, on paper
   like the bar's other panels. An overlay, so dvh is right here (never in
   the flow). */
.search-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  width: max(100%, 30rem);
  max-width: calc(100vw - 20px);
  max-height: calc(
    100dvh - var(--reader-topbar-h, 3.5rem) - 1.5rem -
      var(--reader-timeline-h, 0px)
  );
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}
.search-status {
  flex-shrink: 0;
  margin: 0;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid rgb(var(--color-line));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  line-height: 1.4;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.search-list {
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.search-list:empty {
  display: none;
}
.search-result {
  display: grid;
  gap: 2px;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-control);
  cursor: pointer;
}
.search-result.is-active {
  background: rgb(var(--color-ink) / 0.06);
}
.result-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}
.result-tag {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.result-title {
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--color-ink));
}
.result-body {
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(var(--color-ink));
}
.result-head + .result-body {
  color: rgb(var(--color-mute));
}
.result-where {
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.06em;
  line-height: 1.4;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
/* The words asked for: the warn amber under ink, in both themes. */
.search-hit {
  padding: 0 1px;
  border-radius: 2px;
  background: rgb(var(--color-warn) / 0.45);
  color: rgb(var(--color-ink));
  font-weight: inherit;
}

/* From 641px the field is always laid out beside its icon, closed to no
   width and hidden, so it can open: the line grows out of the icon and the
   words slide in from the left, under the field's own left edge. Closed, it
   is `visibility: hidden` (once it has finished closing), so the input is
   out of the tab order as it was when the field was not drawn at all. */
@media (min-width: 641px) {
  .search-field {
    --search-time: 280ms;
    --search-ease: cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex: 0 1 auto;
    width: 0;
    padding: 0;
    overflow: hidden;
    visibility: hidden;
    transition:
      width var(--search-time) var(--search-ease),
      visibility 0s linear var(--search-time),
      border-color 0.12s ease;
  }
  .search-input,
  .search-key {
    opacity: 0;
    transition:
      transform var(--search-time) var(--search-ease),
      opacity calc(var(--search-time) * 0.5) ease;
  }
  .search-input {
    padding-left: 4px;
    transform: translateX(-2.5rem);
  }

  .reader-search.is-expanded .search-field,
  .reader-search.is-peek .search-field {
    --search-time: 420ms;
    --search-ease: cubic-bezier(0.22, 1, 0.36, 1);
    width: 23rem;
    visibility: visible;
    transition:
      width var(--search-time) var(--search-ease),
      visibility 0s,
      border-color 0.12s ease;
  }
  .reader-search.is-expanded .search-input,
  .reader-search.is-peek .search-input,
  .reader-search.is-expanded .search-key,
  .reader-search.is-peek .search-key {
    opacity: 1;
    transform: none;
    transition:
      transform var(--search-time) var(--search-ease) 60ms,
      opacity calc(var(--search-time) * 0.6) ease 60ms;
  }
}

/* Reduced motion: the field is there or it is not. Said for the reader's
   own "animations off" as well: brand.css shortens durations for it, not
   delays. */
:root[data-reduce-motion="1"] .search-field,
:root[data-reduce-motion="1"] .search-input,
:root[data-reduce-motion="1"] .search-key {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .search-field,
  :root:not([data-reduce-motion="0"]) .search-input,
  :root:not([data-reduce-motion="0"]) .search-key {
    transition: none;
  }
}

@media (max-width: 640px) {
  .reader-search,
  .reader-search.is-expanded {
    position: static;
    flex: 0 0 auto;
    max-width: none;
  }
  /* Open: the field across the whole bar, over the other controls. */
  .reader-search.is-expanded .search-field {
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    height: auto;
    padding: 0 4px 0 14px;
    border-bottom: 0;
    background: rgb(var(--search-bg));
  }
  .search-field:focus-within {
    box-shadow: inset 0 -2px 0 rgb(var(--search-ink));
  }
  .search-glass {
    display: block;
  }
  .search-key {
    display: none;
  }
  .search-close {
    width: 40px;
    height: 40px;
  }
  .search-panel {
    top: calc(100% + 6px);
    left: 8px;
    right: 8px;
    width: auto;
    max-width: none;
  }
}
</style>
