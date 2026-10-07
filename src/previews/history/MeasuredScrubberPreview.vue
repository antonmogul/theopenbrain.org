<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { measureChapterRange } from "./measuredChapterRange";
const props = defineProps({ targetId: { type: String, required: true } });
const enabled = ref(false);
const geometry = ref(null);
const value = ref(0);
let observer = null;
let mutation = null;
let queued = false;
let destroyed = false;
let generation = 0;
const percent = computed(() =>
  geometry.value
    ? Math.round(
        ((value.value - geometry.value.start) /
          (geometry.value.end - geometry.value.start)) *
          100
      )
    : 0
);
function measure() {
  if (!enabled.value || destroyed) return;
  const root = document.getElementById(props.targetId);
  geometry.value = measureChapterRange(root, {
    scrollY: window.scrollY,
    height: window.innerHeight,
    maxScroll: Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    ),
  });
  if (geometry.value)
    value.value = Math.max(
      geometry.value.start,
      Math.min(geometry.value.end, window.scrollY)
    );
}
function schedule() {
  if (queued) return;
  queued = true;
  Promise.resolve().then(() => {
    queued = false;
    measure();
  });
}
function stop() {
  generation++;
  enabled.value = false;
  geometry.value = null;
  for (const event of ["scroll", "resize"])
    window.removeEventListener(event, schedule);
  for (const event of ["popstate", "hashchange"])
    window.removeEventListener(event, stop);
  observer?.disconnect();
  mutation?.disconnect();
  observer = null;
  mutation = null;
}
async function toggle() {
  if (enabled.value) {
    stop();
    return;
  }
  enabled.value = true;
  const epoch = ++generation;
  await nextTick();
  if (destroyed || !enabled.value || epoch !== generation) return;
  measure();
  for (const event of ["scroll", "resize"])
    window.addEventListener(event, schedule, { passive: true });
  for (const event of ["popstate", "hashchange"])
    window.addEventListener(event, stop);
  const root = document.getElementById(props.targetId);
  if (root && typeof ResizeObserver === "function") {
    observer = new ResizeObserver(schedule);
    observer.observe(root);
  }
  if (root && typeof MutationObserver === "function") {
    mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true });
  }
}
function seek(event) {
  measure(); // Never act on cached geometry after a reflow or removed target.
  const number = Number(event.target.value);
  if (!geometry.value || !Number.isFinite(number)) return;
  value.value = Math.max(
    geometry.value.start,
    Math.min(geometry.value.end, number)
  );
  window.scrollTo({ top: value.value, behavior: "auto" });
}
function relative(position) {
  return `${((position - geometry.value.start) / (geometry.value.end - geometry.value.start)) * 100}%`;
}
watch(() => props.targetId, stop);
onBeforeUnmount(() => {
  destroyed = true;
  stop();
});
</script>
<template>
  <div class="scrubber-preview">
    <button type="button" :aria-pressed="enabled" @click="toggle">
      {{ enabled ? "Turn preview off" : "Try measured chapter scrubber" }}
    </button>
    <p>
      Optional design preview · approval pending · no changes to ordinary
      scrolling
    </p>
    <template v-if="enabled && geometry">
      <label
        >Chapter position: {{ percent }}%<input
          type="range"
          :min="geometry.start"
          :max="geometry.end"
          :value="value"
          step="1"
          :aria-valuetext="`${percent}% through the measured reading range`"
          @input="seek"
      /></label>
      <div class="figure-intervals" aria-hidden="true">
        <span
          v-for="(interval, i) in geometry.intervals"
          :key="i"
          :style="{
            left: relative(interval.entry),
            width: `${((interval.exit - interval.entry) / (geometry.end - geometry.start)) * 100}%`,
          }"
        />
      </div>
      <ul>
        <li v-for="(interval, i) in geometry.intervals" :key="i">
          {{ interval.label }}: enters
          {{
            Math.round(
              ((interval.entry - geometry.start) /
                (geometry.end - geometry.start)) *
                100
            )
          }}%, exits
          {{
            Math.round(
              ((interval.exit - geometry.start) /
                (geometry.end - geometry.start)) *
                100
            )
          }}%
        </li>
      </ul>
      <p>
        Markers show measured figure boundaries crossing the viewport midpoint.
        The slider supports native arrow keys, Home and End.
      </p>
    </template>
    <p v-else-if="enabled" role="status">
      No usable document measurements yet. Continue with normal vertical
      scrolling.
    </p>
  </div>
</template>
<style scoped>
.scrubber-preview {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 1rem;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-line));
  font: var(--ui-size-14)/1.4 var(--font-ui);
}
button {
  border: 1px solid currentColor;
  padding: 0.5rem;
  min-height: 44px;
}
input {
  display: block;
  width: 100%;
  min-height: 44px;
  accent-color: rgb(var(--color-accent));
}
.figure-intervals {
  position: relative;
  height: 0.6rem;
  margin: 0.25rem 0;
  background: rgb(var(--color-line));
}
.figure-intervals span {
  position: absolute;
  height: 100%;
  background: rgb(var(--color-chapter, var(--color-accent)));
  border-inline: 2px solid rgb(var(--color-ink));
}
ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  padding: 0 1rem;
}
button:focus-visible,
input:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 3px;
}
</style>
