<script setup>
/*
 * The chapter's references, full width (OPENBRAIN-179): the last part of
 * the chapter, after its close, on paper again. It used to be a hundred and
 * twenty entries down the text column, nine thousand pixels of them between
 * the last paragraph and the key takeaways.
 *
 * - The heading is the section's own (its number from the chapter's
 *   numbering, its title), so the contents, the top bar's menu and the
 *   chapter's #references link still land on it: the block carries the
 *   section's id and slug.
 * - A filter narrows a long list as the reader types (authors, title,
 *   source, year); it is dropped whenever something asks for an entry by
 *   number (a citation, a Further reading link, a #ref-N address), so the
 *   entry is always there to land on.
 * - A reader who came from the text (a citation's tooltip, a Further
 *   reading link) gets a way back, pinned to the foot of the screen while
 *   they are in the list. It is out of the page's flow on purpose: a button
 *   added to the entry changed the page's height as the jump began, and the
 *   re-measure that follows a height change (ScrollTrigger.refresh) stopped
 *   the scroll before it started.
 * - The list itself is ReferenceList.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ReferenceList from "./ReferenceList.vue";
import { referenceSearchText } from "@/helper/chapterReferences";
import { useReferenceJump } from "@/composables/useReferenceJump";

const props = defineProps({
  /** The entries, in order (ReferenceList's `references`). */
  references: { type: Array, required: true },
  title: { type: String, default: "References" },
  /** The section's number in the chapter ("6"), when it is a section. */
  label: { type: String, default: "" },
  /** The section's id and slug, for jumps that name it. */
  sectionId: { type: String, default: null },
  sectionSlug: { type: String, default: null },
});

// A short list needs no filter.
const FILTER_FROM = 12;
const filterable = computed(() => props.references.length >= FILTER_FROM);

const query = ref("");
const terms = computed(() =>
  query.value.toLowerCase().split(/\s+/).filter(Boolean)
);
const searchable = computed(() =>
  props.references.map((r) => ({ ref: r, text: referenceSearchText(r) }))
);
const shown = computed(() =>
  terms.value.length
    ? searchable.value
        .filter(({ text }) => terms.value.every((t) => text.includes(t)))
        .map(({ ref: r }) => r)
    : props.references
);
const total = computed(() => props.references.length);
const countLine = computed(() => {
  const n = total.value;
  const sources = `${n} ${n === 1 ? "source" : "sources"}`;
  return terms.value.length ? `${shown.value.length} of ${sources}` : sources;
});

// Something asked for an entry by number: show the whole list again.
const { requested, returnTo, returnFromReference, forgetReferenceJump } =
  useReferenceJump();
watch(requested, (r) => {
  if (r) query.value = "";
});
function onHash() {
  if (/^#ref-\d+$/.test(window.location.hash)) query.value = "";
}

// The way back stays while the reader is in the list, and goes once they
// have left it by themselves (it is offered again on the next jump).
const root = ref(null);
let observer = null;
let inView = false;
let arrived = false;
watch(returnTo, () => (arrived = inView));
function dismiss() {
  returnTo.value = null;
}

onMounted(() => {
  window.addEventListener("hashchange", onHash);
  if (typeof IntersectionObserver === "undefined") return;
  observer = new IntersectionObserver(([entry]) => {
    inView = !!entry?.isIntersecting;
    if (inView) arrived = true;
    else if (arrived && returnTo.value) dismiss();
  });
  observer.observe(root.value);
});
onBeforeUnmount(() => {
  window.removeEventListener("hashchange", onHash);
  observer?.disconnect();
  forgetReferenceJump();
});
</script>

<template>
  <div
    :id="sectionId || undefined"
    ref="root"
    class="cr"
    role="region"
    aria-labelledby="chapter-references-title"
    :data-section-slug="sectionSlug || undefined"
    data-chapter-references
  >
    <header class="cr-head">
      <h2 id="chapter-references-title" class="cr-title">
        <span v-if="label" class="cr-n">{{ label }}</span>
        <span>{{ title }}</span>
      </h2>
      <p class="cr-count" role="status">{{ countLine }}</p>
      <div v-if="filterable" class="cr-filter">
        <label for="chapter-references-filter" class="cr-filter-label">
          Filter
        </label>
        <input
          id="chapter-references-filter"
          v-model="query"
          class="cr-filter-input"
          type="search"
          placeholder="Author, title, journal, year"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </header>

    <ReferenceList v-if="shown.length" :references="shown" />
    <p v-else class="cr-none">
      Nothing in this list matches “{{ query.trim() }}”.
      <button type="button" class="cr-none-all" @click="query = ''">
        Show all {{ total }}
      </button>
    </p>

    <!-- On <body>: this block is a query container, which would otherwise
         be what "fixed" is fixed to. -->
    <Teleport to="body">
      <div v-if="returnTo" class="cr-return" data-reference-return>
        <button
          type="button"
          class="cr-return-back"
          @click="returnFromReference"
        >
          <span aria-hidden="true">↩</span> Back to the text
        </button>
        <button
          type="button"
          class="cr-return-close"
          aria-label="Stay here"
          @click="dismiss"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cr {
  container-type: inline-size;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  letter-spacing: 0.1px;
  scroll-margin-top: calc(var(--reader-topbar-h, 4rem) + 1rem);
}
.cr-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem 2rem;
  align-items: end;
  padding-bottom: clamp(1.5rem, 3cqw, 2.5rem);
}
.cr-title {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  margin: 0;
  padding: 0;
  font-size: clamp(2rem, 4.2cqw, 3.75rem);
  font-weight: 450;
  line-height: 1.1;
}
/* The section's number, in the chapter's colour, as the contents set it. */
.cr-n {
  color: rgb(var(--color-chapter-deep));
  font-variant-numeric: tabular-nums;
}
.cr-count,
.cr-filter-label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.cr-filter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid rgb(var(--color-ink));
}
.cr-filter:focus-within {
  border-bottom-color: rgb(var(--color-accent));
  box-shadow: 0 1px 0 rgb(var(--color-accent));
}
.cr-filter-label {
  color: rgb(var(--color-ink));
  font-weight: 600;
}
.cr-filter-input {
  flex: 1;
  min-width: 0;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 0;
  outline: none;
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  font-size: var(--ui-size-16);
}
.cr-filter-input::placeholder {
  color: rgb(var(--color-mute));
}
.cr-none {
  margin: 0;
  padding: 1.5rem 0 2.5rem;
  border-top: 1px solid rgb(var(--color-line));
  font-size: var(--ui-size-16);
  color: rgb(var(--color-mute));
}
.cr-none-all {
  margin-left: 0.5rem;
  padding: 0;
  border: 0;
  background: none;
  color: rgb(var(--color-accent));
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  cursor: pointer;
}
.cr-none-all:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

/* The way back to the text, above the timeline dock. */
.cr-return {
  position: fixed;
  /* Over the reader and its top bar, under the sign-in panel. */
  z-index: 48;
  left: 50%;
  bottom: calc(var(--reader-timeline-h, 0px) + 1.25rem);
  transform: translateX(-50%);
  display: flex;
  align-items: stretch;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.28);
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cr-return-back,
.cr-return-close {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.cr-return-back {
  padding: 0 0.5rem 0 1.125rem;
  font-weight: 600;
}
.cr-return-close {
  justify-content: center;
  width: 2.75rem;
  border-left: 1px solid rgb(255 255 255 / 0.2);
  font-size: var(--ui-size-18);
  line-height: 1;
}
.cr-return-back:hover,
.cr-return-close:hover {
  background: rgb(var(--color-chapter-ground));
  color: rgb(var(--color-chapter-on));
}
.cr-return-back:focus-visible,
.cr-return-close:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -4px;
}

@container (min-width: 46rem) {
  .cr-head {
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
  }
  .cr-title {
    grid-column: 1 / -1;
  }
  .cr-count {
    align-self: center;
  }
}
</style>
