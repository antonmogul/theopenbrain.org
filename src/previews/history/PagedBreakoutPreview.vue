<script setup>
import { computed, nextTick, ref } from "vue";
const props = defineProps({
  title: { type: String, required: true },
  pages: { type: Array, required: true },
});
const paging = ref(false);
const page = ref(0);
const track = ref(null);
const count = computed(() => props.pages.length);
async function toggle() {
  paging.value = !paging.value;
  page.value = 0;
  await nextTick();
  track.value?.scrollTo?.({ left: 0, behavior: "auto" });
}
function go(index) {
  const width = track.value?.clientWidth;
  if (!paging.value || !width) return;
  page.value = Math.max(0, Math.min(count.value - 1, index));
  track.value.scrollTo({ left: page.value * width, behavior: "auto" });
}
function onScroll() {
  const width = track.value?.clientWidth;
  if (paging.value && width)
    page.value = Math.max(
      0,
      Math.min(count.value - 1, Math.round(track.value.scrollLeft / width))
    );
}
</script>
<template>
  <aside class="paging-preview" :aria-label="title">
    <p class="preview-note">Optional design preview · approval pending</p>
    <h2>{{ title }}</h2>
    <button type="button" :aria-pressed="paging" @click="toggle">
      {{ paging ? "Return to vertical reading" : "Try horizontal pages" }}
    </button>
    <div v-if="paging" class="page-controls" aria-label="Page controls">
      <button type="button" :disabled="page === 0" @click="go(page - 1)">
        Previous page
      </button>
      <span role="status">Page {{ page + 1 }} of {{ count }}</span>
      <button type="button" :disabled="page >= count - 1" @click="go(page + 1)">
        Next page
      </button>
    </div>
    <div
      ref="track"
      class="page-track"
      :class="{ 'page-track--paged': paging }"
      tabindex="0"
      aria-label="Breakout text; all pages remain available by scrolling"
      @scroll="onScroll"
    >
      <article
        v-for="(content, index) in pages"
        :key="index"
        class="preview-page"
        :aria-label="`Page ${index + 1}`"
      >
        <div v-html="content" />
      </article>
    </div>
  </aside>
</template>
<style scoped>
.paging-preview {
  padding: 1.5rem;
  color: rgb(var(--color-ink));
  background: rgb(var(--color-chapter-pale, var(--color-paper)));
  font-family: var(--font-body);
}
.preview-note {
  font: var(--ui-size-12)/1.5 var(--font-mono);
}
.page-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
}
button {
  border: 1px solid currentColor;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  border-radius: var(--radius-control);
}
button:disabled {
  opacity: 0.45;
}
.preview-page {
  padding: 1rem 0;
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.page-track--paged {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}
.page-track--paged .preview-page {
  padding: 1rem;
  scroll-snap-align: start;
}
button:focus-visible,
.page-track:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 3px;
}
</style>
