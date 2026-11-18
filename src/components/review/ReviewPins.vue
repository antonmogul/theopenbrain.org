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
import { findAnchorElement } from "@/helper/reviewAnchor.mjs";

const props = defineProps({
  /** [{ id, n, anchor, label }] */
  items: { type: Array, default: () => [] },
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
    out.push({ id: item.id, n: item.n, label: item.label, x, y });
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

watch(() => props.items, refresh);

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
        class="rv-pin"
        :style="{ left: `${p.x}px`, top: `${p.y}px` }"
        :aria-label="`Note ${p.n}: ${p.label}`"
        :title="p.label"
        data-testid="review-pin"
        @click="emit('open', p.id)"
      >
        {{ p.n }}
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
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  padding: 0 6px;
  border: 2px solid #fff;
  border-radius: 999px 999px 999px 0;
  background: rgb(var(--color-accent));
  color: #fff;
  font: 700 var(--ui-size-11) / 1 var(--font-ui);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);
  cursor: pointer;
  pointer-events: auto;
}

.rv-pin:focus-visible {
  outline: 3px solid rgb(var(--color-ink));
  outline-offset: 2px;
}
</style>
