<script setup>
/** Review-only continuous reading rail. No reader route opts into this trial. */
import { nextTick, ref, useId } from "vue";

const props = defineProps({
  panels: { type: Array, required: true },
  label: { type: String, required: true },
});
const track = ref(null);
const active = ref(0);
const vertical = ref(false);
const id = `breakout-rail-${useId()}`;

function go(index) {
  const el = track.value;
  if (!el || vertical.value) return;
  const target = Math.max(0, Math.min(props.panels.length - 1, index));
  el.scrollTo({ left: target * el.clientWidth, behavior: "auto" });
}
function syncPosition() {
  if (!track.value || vertical.value) return;
  active.value = Math.max(
    0,
    Math.min(
      props.panels.length - 1,
      Math.round(track.value.scrollLeft / (track.value.clientWidth || 1))
    )
  );
}
function onKey(event) {
  // Embedded links/controls retain their own keys, and Tab always leaves normally.
  if (event.target !== track.value || vertical.value) return;
  const destinations = {
    ArrowLeft: active.value - 1,
    ArrowRight: active.value + 1,
    Home: 0,
    End: props.panels.length - 1,
  };
  if (!(event.key in destinations)) return;
  event.preventDefault();
  go(destinations[event.key]);
}
async function toggleLayout() {
  vertical.value = !vertical.value;
  await nextTick();
  if (!vertical.value) go(active.value);
}
</script>

<template>
  <div class="br" :class="{ 'br--vertical': vertical }">
    <div class="br-controls">
      <button type="button" :aria-pressed="vertical" @click="toggleLayout">
        Read vertically
      </button>
      <template v-if="!vertical">
        <button
          type="button"
          :aria-controls="id"
          :disabled="active === 0"
          @click="go(active - 1)"
        >
          Previous
        </button>
        <button
          type="button"
          :aria-controls="id"
          :disabled="active >= panels.length - 1"
          @click="go(active + 1)"
        >
          Next
        </button>
        <span role="status" aria-live="polite" aria-atomic="true">
          {{ active + 1 }} of {{ panels.length }}
        </span>
      </template>
    </div>
    <p :id="`${id}-help`" class="br-help">
      {{
        vertical
          ? "All parts are shown below in reading order."
          : "Scroll sideways or use Previous and Next. With the reading region focused, use Left/Right, Home or End."
      }}
    </p>
    <div
      :id="id"
      ref="track"
      class="br-track"
      role="region"
      :aria-label="label"
      :aria-describedby="`${id}-help`"
      :tabindex="vertical ? undefined : 0"
      @keydown="onKey"
      @scroll.passive="syncPosition"
    >
      <article
        v-for="(panel, index) in panels"
        :key="panel.id"
        class="br-panel"
        :aria-labelledby="`${id}-title-${index}`"
      >
        <h3 :id="`${id}-title-${index}`">{{ panel.title }}</h3>
        <slot :name="panel.id" />
      </article>
    </div>
  </div>
</template>

<style scoped>
.br {
  min-width: 0;
  color: rgb(var(--color-ink));
}
.br-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.br-controls button {
  min-height: 44px;
  padding: 0.6rem 1rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 0;
  background: rgb(var(--color-paper));
  color: inherit;
  font: 400 var(--ui-size-13) / 1.3 var(--font-ui);
  cursor: pointer;
}
.br-controls button:disabled {
  opacity: 0.45;
  cursor: default;
}
.br-controls button[aria-pressed="true"] {
  background: rgb(var(--color-chapter-pale));
}
.br-controls span,
.br-help {
  font: 400 var(--ui-size-13) / 1.5 var(--font-ui);
}
.br-help {
  margin: 1rem 0;
}
.br-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-behavior: smooth;
  border: 1px solid rgb(var(--color-line));
}
.br-panel {
  flex: 0 0 100%;
  min-width: 0;
  padding: 1.25rem;
  scroll-snap-align: start;
  overflow-wrap: anywhere;
}
.br-panel h3 {
  font: 500 var(--ui-size-20) / 1.3 var(--font-body);
  margin: 0 0 1rem;
}
.br-panel :deep(p) {
  line-height: 1.65;
  margin: 0 0 1rem;
}
.br-panel :deep(img) {
  max-width: 100%;
  height: auto;
}
.br-track:focus-visible,
.br-controls button:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 3px;
}
.br--vertical .br-track {
  display: block;
  overflow: visible;
}
:root[data-reduce-motion="1"] .br-track {
  scroll-behavior: auto;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .br-track {
    scroll-behavior: auto;
  }
}
@media print {
  .br-controls,
  .br-help {
    display: none;
  }
  .br-track {
    display: block;
    overflow: visible;
  }
}
</style>
