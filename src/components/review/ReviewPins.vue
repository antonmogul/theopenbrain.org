<script setup>
/*
 * ReviewPins — numbered pins on the page for the chapter's notes in view
 * (OPENBRAIN-204), switched on from "All notes" (off by default, so reading
 * stays clean). Each pin sits at its note's point on the thing it names,
 * measured from the live element every frame the page moves, so a pin on a
 * plate rides a side-scrolling box's track and a pin on the figure pane
 * shows only while the pane shows that figure. Pressing one opens its note.
 * The layer takes no pointer events; only the pins do.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { reviewStatusIcon, reviewStatusLabel } from "@/helper/reviewNotes.mjs";
import "./review.css";
import { findAnchorElement } from "@/helper/reviewAnchor.mjs";

const props = defineProps({
  /** [{ id, n, anchor, label }] */
  items: { type: Array, default: () => [] },
  showChecked: { type: Boolean, default: false },
});
const emit = defineEmits(["open"]);

const placed = ref([]);
let elements = new Map();
let frame = 0;
let refresher = 0;

function findAll() {
  elements = new Map();
  for (const item of props.items) {
    if (!item.anchor || item.anchor.kind === "chrome") continue;
    const el = findAnchorElement(item.anchor, document);
    if (el) elements.set(item.id, el);
  }
}

function measure() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = 64;
  const paneKey = (
    document.querySelector(".figure-pane")?.getAttribute("data-figure-key") ||
    ""
  ).toLowerCase();
  const out = [];
  for (const item of props.items) {
    if (item.status === "verified" && !props.showChecked) continue;
    const el = elements.get(item.id);
    if (!el?.isConnected) continue;
    const a = item.anchor;
    if (
      a.kind === "figure-pane" &&
      paneKey.replace(/^animation/, "") !==
        String(a.figureKey || "")
          .toLowerCase()
          .replace(/^animation/, "")
    )
      continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const x = r.left + (a.point?.x ?? 0.04) * r.width;
    const y = r.top + (a.point?.y ?? 0.04) * r.height;
    if (x < 0 || x > vw || y < top || y > vh - 24) continue;
    out.push({ ...item, x, y });
  }
  placed.value = out;
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(measure);
}

function refresh() {
  findAll();
  schedule();
}

watch([() => props.items, () => props.showChecked], refresh);

onMounted(() => {
  refresh();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  // A track scrolls on its own; figures and widgets mount late.
  document.addEventListener("scroll", schedule, {
    passive: true,
    capture: true,
  });
  refresher = setInterval(refresh, 2000);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  document.removeEventListener("scroll", schedule, { capture: true });
  clearInterval(refresher);
  cancelAnimationFrame(frame);
});
</script>

<template>
  <Teleport to="body">
    <div class="rv-pins-layer" data-review-ui data-testid="review-pins-layer">
      <button
        v-for="p in placed"
        :key="p.id"
        type="button"
        class="rv-pin rv-status"
        :data-status="p.status || 'new'"
        :style="{ left: `${p.x}px`, top: `${p.y}px` }"
        :aria-label="`Note ${p.n}: ${reviewStatusLabel(p.status || 'new')}. ${p.label}`"
        :title="`${reviewStatusLabel(p.status || 'new')}: ${p.label}`"
        data-testid="review-pin"
        @click="emit('open', p.id)"
      >
        <span aria-hidden="true"
          >{{ reviewStatusIcon(p.status) }} {{ p.n }}</span
        >
        <span class="rv-pin-status">{{
          reviewStatusLabel(p.status || "new")
        }}</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.rv-pins-layer {
  position: fixed;
  inset: 0;
  z-index: 8990;
  pointer-events: none;
}

.rv-pin {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  padding: 0 6px;
  border: 2px solid #fff;
  border-radius: 999px 999px 999px 0;
  background: rgb(var(--rv-status-color));
  color: #111;
  font: 700 var(--ui-size-11) / 1 var(--font-ui);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);
  cursor: pointer;
  pointer-events: auto;
}

.rv-pin[data-status="wont_do"] {
  background: rgb(var(--color-line));
  color: rgb(var(--color-ink));
}
:global(:root[data-accent="mono"]) .rv-pin[data-status="new"],
.rv-pin[data-status="question"] {
  color: #fff;
}
.rv-pin[data-status="verified"] {
  background: color-mix(
    in srgb,
    rgb(var(--color-complete)) 35%,
    rgb(var(--color-paper))
  );
  color: rgb(var(--color-ink));
  border-style: dashed;
}
.rv-pin-status {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 639px) {
  .rv-pin-status {
    position: absolute;
    width: 1px;
    height: 1px;
    clip-path: inset(50%);
  }
}
.rv-pin:focus-visible {
  outline: 3px solid rgb(var(--color-ink));
  outline-offset: 2px;
}
</style>
