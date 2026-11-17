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
 * Below 640px the bar has no room for a field: a search button opens one
 * across the whole bar, with its own close.
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
// Phones: the field is laid over the bar.
const expanded = ref(false);
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

function onFocus() {
  use();
  open.value = true;
  emit("open");
}

async function expand() {
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
  if (input.value?.offsetParent) input.value.focus();
  else expand();
}

onMounted(() => window.addEventListener("keydown", onSlash));
onBeforeUnmount(() => window.removeEventListener("keydown", onSlash));

defineExpose({ close });
</script>

<template>
  <div
    ref="root"
    class="reader-search"
    :class="{ 'is-expanded': expanded, 'is-open': showPanel }"
    data-testid="reader-search"
    @focusout="onFocusOut"
  >
    <!-- Phones: the field is behind this button. -->
    <button
      ref="toggle"
      type="button"
      class="search-toggle"
      aria-label="Search this chapter"
      :aria-expanded="expanded"
      data-testid="reader-search-toggle"
      @click="expand"
    >
      <svg
        width="18"
        height="18"
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
  position: relative;
  flex: 1 1 14rem;
  min-width: 0;
  max-width: 26rem;
  /* The page hyphenates (index.css); a results list should not. */
  hyphens: manual;
  -webkit-hyphens: manual;
}

.search-toggle {
  display: none;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
}
/* Not on touch, where a hover sticks after the tap. */
@media (hover: hover) {
  .search-toggle:hover {
    background: rgb(var(--color-ink) / 0.05);
  }
}

.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 4px 0 10px;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  transition: border-color 0.12s ease;
}
.search-field:hover {
  border-color: rgb(var(--color-mute));
}
.search-field:focus-within {
  border-color: rgb(var(--color-ink));
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.search-glass {
  flex-shrink: 0;
  color: rgb(var(--color-mute));
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
  color: rgb(var(--color-mute));
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
  border: 1px solid rgb(var(--color-line));
  border-radius: 3px;
  color: rgb(var(--color-mute));
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
  color: rgb(var(--color-mute));
  cursor: pointer;
}
.search-close:hover {
  color: rgb(var(--color-ink));
  background: rgb(var(--color-ink) / 0.05);
}
.search-toggle:focus-visible,
.search-close:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

/* The results: under the field, as wide as a line of reading. An overlay,
   so dvh is right here (never in the flow). */
.search-panel {
  position: absolute;
  top: calc(100% + 16px);
  left: 0;
  z-index: 50;
  width: max(100%, 30rem);
  max-width: calc(100vw - 36px);
  max-height: calc(100dvh - 5.5rem - var(--reader-timeline-h, 0px));
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

@media (max-width: 640px) {
  .reader-search {
    position: static;
    flex: 0 0 auto;
    max-width: none;
  }
  .search-toggle {
    display: grid;
  }
  .search-field {
    display: none;
  }
  /* Open: the field across the whole bar, over the other controls. */
  .reader-search.is-expanded .search-field {
    display: flex;
    position: absolute;
    z-index: 2;
    top: 5px;
    left: 8px;
    right: 8px;
    height: 44px;
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
