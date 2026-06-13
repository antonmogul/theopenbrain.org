<script setup>
// Page controls + "showing X–Y of N". Window logic preserved from original; token chrome.
import { computed } from "vue";
const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalItems: { type: Number, default: 0 },
  pageSize: { type: Number, default: 20 },
  showInfo: { type: Boolean, default: true },
});
const emit = defineEmits(["page-change"]);
const fromItem = computed(() => (props.currentPage - 1) * props.pageSize + 1);
const toItem = computed(() => Math.min(props.currentPage * props.pageSize, props.totalItems));
const hasPrevious = computed(() => props.currentPage > 1);
const hasNext = computed(() => props.currentPage < props.totalPages);
const visiblePages = computed(() => {
  const pages = [];
  const total = props.totalPages;
  const current = props.currentPage;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("…");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push("…");
    pages.push(total);
  }
  return pages;
});
function goToPage(page) { if (page !== "…" && page !== props.currentPage) emit("page-change", page); }
</script>

<template>
  <div class="pagination">
    <div v-if="showInfo && totalItems > 0" class="page-info">Showing {{ fromItem }}–{{ toItem }} of {{ totalItems }}</div>
    <div v-else-if="showInfo" class="page-info">No results</div>
    <nav v-if="totalPages > 1" class="page-nav">
      <button type="button" class="page-btn" :disabled="!hasPrevious" @click="goToPage(currentPage - 1)">‹</button>
      <template v-for="(page, i) in visiblePages" :key="i">
        <span v-if="page === '…'" class="page-ellipsis">…</span>
        <button v-else type="button" class="page-btn" :class="{ current: page === currentPage }" @click="goToPage(page)">{{ page }}</button>
      </template>
      <button type="button" class="page-btn" :disabled="!hasNext" @click="goToPage(currentPage + 1)">›</button>
    </nav>
  </div>
</template>

<style scoped>
.pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.page-info { font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.06em; color: rgb(var(--color-mute)); }
.page-nav { display: flex; align-items: center; gap: 4px; }
.page-btn {
  min-width: 32px; padding: 6px 10px; border: 1px solid transparent; border-radius: 999px;
  background: transparent; font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-ink)); cursor: pointer;
}
.page-btn:hover:not(:disabled):not(.current) { background: rgb(var(--color-ink) / 0.06); }
.page-btn.current { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-ellipsis { padding: 0 6px; color: rgb(var(--color-mute)); }
</style>
