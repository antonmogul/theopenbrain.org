<script setup>
import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  inject,
  nextTick,
} from "vue";
import { referenceDisplay } from "@/helper/chapterReferences";

const refsCtx = inject("references", null);

const visible = ref(false);
const tooltipRef = ref(null);
const currentRef = ref(null);
// A click pins the tooltip: hovering shows it, and a click used to toggle
// it, so clicking a reference you were hovering closed it (OPENBRAIN-90).
// Pinned, it stays until a click elsewhere or Escape, so its links work.
const pinned = ref(false);
const display = computed(() => referenceDisplay(currentRef.value));
const position = ref({ top: 0, left: 0 });

function show(refData, rect) {
  currentRef.value = refData;
  visible.value = true;

  nextTick(() => {
    if (!tooltipRef.value) return;
    const tooltip = tooltipRef.value;
    const tooltipRect = tooltip.getBoundingClientRect();

    // Position above the superscript by default
    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

    // Flip below if not enough space above
    if (top < 8) {
      top = rect.bottom + 8;
    }

    // Clamp horizontally
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }

    position.value = { top, left };
  });
}

function hide() {
  visible.value = false;
  currentRef.value = null;
  pinned.value = false;
}

function handleMouseEnter(e) {
  const target = e.target.closest(".citation-ref");
  if (!target || !refsCtx || pinned.value) return;

  const num = parseInt(target.dataset.ref, 10);
  const refData = refsCtx.getReference(num);
  if (!refData) return;

  show(refData, target.getBoundingClientRect());
}

function handleMouseLeave(e) {
  const target = e.target.closest(".citation-ref");
  if (!target || pinned.value) return;

  // Check if we're moving to the tooltip itself
  const related = e.relatedTarget;
  if (related && tooltipRef.value && tooltipRef.value.contains(related)) return;

  hide();
}

function handleTooltipLeave(e) {
  if (pinned.value) return;
  // Check if we're moving back to a citation-ref
  const related = e.relatedTarget;
  if (related && related.closest && related.closest(".citation-ref")) return;
  hide();
}

function handleClick(e) {
  const target = e.target.closest(".citation-ref");
  if (!target || !refsCtx) return;

  const num = parseInt(target.dataset.ref, 10);
  const refData = refsCtx.getReference(num);
  if (!refData) return;

  pinned.value = true;
  if (!(visible.value && currentRef.value?.number === num))
    show(refData, target.getBoundingClientRect());
}

function handleKeydown(e) {
  if (e.key === "Escape" && visible.value) hide();
}

function handleDocumentClick(e) {
  if (!visible.value) return;
  if (e.target.closest(".citation-ref")) return;
  if (tooltipRef.value && tooltipRef.value.contains(e.target)) return;
  hide();
}

onMounted(() => {
  document.addEventListener("mouseover", handleMouseEnter);
  document.addEventListener("mouseout", handleMouseLeave);
  document.addEventListener("click", handleClick);
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("mouseover", handleMouseEnter);
  document.removeEventListener("mouseout", handleMouseLeave);
  document.removeEventListener("click", handleClick);
  document.removeEventListener("click", handleDocumentClick, true);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && currentRef"
      ref="tooltipRef"
      class="citation-tooltip"
      :style="{ top: position.top + 'px', left: position.left + 'px' }"
      @mouseleave="handleTooltipLeave"
    >
      <!-- The authors' own reference text, with a link to its source
           (OPENBRAIN-92). -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="ct-text" v-html="display.html" />
      <a
        v-if="display.href"
        :href="display.href"
        target="_blank"
        rel="noopener noreferrer"
        class="ct-doi"
      >
        {{ display.hrefLabel }}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="ct-doi-icon"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  </Teleport>
</template>

<style scoped>
.ct-text {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #111827;
  overflow-wrap: anywhere;
}
.ct-text :deep(a) {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}
.citation-tooltip {
  position: fixed;
  z-index: 9999;
  max-width: 360px;
  padding: 14px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  font-family: "IBM Plex Sans", sans-serif;
  line-height: 1.5;
  pointer-events: auto;
}

.ct-authors {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.ct-title {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 4px;
}

.ct-journal {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.ct-doi {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #7c3aed;
  text-decoration: none;
}

.ct-doi:hover {
  text-decoration: underline;
}

.ct-doi-icon {
  flex-shrink: 0;
}
</style>
