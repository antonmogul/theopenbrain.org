<script setup>
import { inject, nextTick, ref, watch } from "vue";
import { routeLocationKey } from "vue-router";
import { useChapterListen } from "@/composables/useChapterListen";

const props = defineProps({
  /** Story/test override; the reader uses main#text. */
  rootId: { type: String, default: "text" },
});
const emit = defineEmits(["open", "toggle"]);
const route = inject(routeLocationKey, null);
const {
  supported,
  rate,
  voiceURI,
  includeBoxes,
  voices,
  index,
  entries,
  state,
  message,
  following,
  current,
  play,
  pause,
  stop,
  step,
  setRate,
  setVoice,
  setBoxes,
  backToReading,
} = useChapterListen({ getRoot: () => document.getElementById(props.rootId) });
const open = ref(false);
const toggle = ref(null);
const panel = ref(null);
async function close() {
  open.value = false;
  await nextTick();
  toggle.value?.focus();
}
function leavePanel(event) {
  const target = event.relatedTarget;
  if (target && !event.currentTarget.parentElement.contains(target))
    open.value = false;
}
async function show() {
  if (open.value) return close();
  open.value = true;
  emit("open");
  await nextTick();
  panel.value?.focus();
}
// The bar keeps its Tools row open while these controls are (OPENBRAIN-78).
watch(open, (value) => emit("toggle", value));
watch(
  () => route?.fullPath,
  () => {
    stop();
    open.value = false;
  }
);
</script>

<template>
  <div v-if="supported" class="reader-listen">
    <button
      ref="toggle"
      type="button"
      class="listen-toggle"
      :class="{ 'is-playing': state === 'playing' }"
      aria-label="Listen to this chapter"
      aria-haspopup="dialog"
      :aria-expanded="open"
      aria-controls="reader-listen-panel"
      title="Listen to this chapter"
      @click="show"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </svg>
      <span class="listen-word">Listen</span>
    </button>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {{ message }}
    </p>
    <div
      v-show="open"
      id="reader-listen-panel"
      ref="panel"
      class="listen-panel"
      role="dialog"
      aria-labelledby="reader-listen-title"
      tabindex="-1"
      @keydown.esc.stop="close"
      @focusout="leavePanel"
    >
      <div class="listen-heading">
        <h2 id="reader-listen-title">Listen to this chapter</h2>
        <button
          type="button"
          aria-label="Close listening controls"
          @click="close"
        >
          ×
        </button>
      </div>
      <p class="listen-hint">
        Start at your place. Pause resumes the current sentence.
      </p>
      <div class="listen-transport">
        <button
          type="button"
          aria-label="Previous paragraph"
          :disabled="!current || index === 0"
          @click="step(-1)"
        >
          ←
        </button>
        <button
          type="button"
          class="listen-play"
          @click="state === 'playing' ? pause() : play()"
        >
          {{
            state === "playing"
              ? "Pause"
              : state === "paused"
                ? "Resume"
                : "Play"
          }}
        </button>
        <button
          type="button"
          aria-label="Next paragraph"
          :disabled="!current || index >= entries.length - 1"
          @click="step(1)"
        >
          →
        </button>
        <button type="button" :disabled="!current" @click="stop">Stop</button>
      </div>
      <label class="listen-setting">
        <span
          >Speed <output>{{ rate.toFixed(1) }}×</output></span
        >
        <input
          aria-label="Reading speed"
          type="range"
          min="0.8"
          max="1.5"
          step="0.1"
          :value="rate"
          @input="setRate($event.target.value)"
        />
      </label>
      <label class="listen-setting">
        <span>English voice</span>
        <select :value="voiceURI" @change="setVoice($event.target.value)">
          <option value="">Browser default (English)</option>
          <option
            v-for="voice in voices"
            :key="voice.voiceURI"
            :value="voice.voiceURI"
          >
            {{ voice.name }} · {{ voice.lang }}
          </option>
        </select>
      </label>
      <label class="listen-boxes">
        <input
          type="checkbox"
          :checked="includeBoxes"
          @change="setBoxes($event.target.checked)"
        />
        Read breakout boxes
      </label>
      <p v-if="!voices.length" class="listen-hint">
        English voices may need enabling in your device’s speech settings.
      </p>
      <p class="listen-status" aria-hidden="true">{{ message }}</p>
    </div>
    <button
      v-if="current && !following"
      type="button"
      class="listen-return"
      @click="backToReading"
    >
      Back to reading
    </button>
  </div>
</template>

<style scoped>
.reader-listen {
  flex-shrink: 0;
}
button,
select,
input {
  font: inherit;
}
button {
  min-height: 44px;
  min-width: 44px;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  cursor: pointer;
  padding: 0 0.75rem;
}
button:hover {
  border-color: rgb(var(--color-ink));
}
button:disabled {
  opacity: 0.4;
  cursor: default;
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.listen-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  border-color: transparent;
  padding: 0 0.5rem;
}
.listen-toggle.is-playing {
  color: rgb(var(--color-accent));
}
.listen-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 8px;
  width: min(23rem, calc(100vw - 16px));
  box-sizing: border-box;
  max-height: calc(100svh - var(--reader-topbar-h, 4rem) - 40px);
  overflow: auto;
  padding: 1rem;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  box-shadow: 0 12px 40px rgb(var(--color-ink) / 0.14);
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
}
.listen-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.listen-heading h2 {
  flex: 1;
  margin: 0;
  font: inherit;
  font-weight: 600;
}
.listen-heading button {
  border: 0;
  font-size: var(--ui-size-24);
}
.listen-hint {
  font-size: var(--ui-size-12);
  line-height: 1.5;
  color: rgb(var(--color-mute));
  margin: 0.5rem 0 0.75rem;
}
.listen-transport {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}
.listen-play {
  flex: 1;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.listen-setting {
  display: grid;
  gap: 0.5rem;
  margin-top: 1rem;
}
.listen-setting > span {
  display: flex;
  justify-content: space-between;
}
.listen-setting input {
  width: 100%;
  height: 44px;
  accent-color: rgb(var(--color-accent));
}
.listen-setting select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  padding: 0.5rem;
}
.listen-boxes {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  margin-top: 0.75rem;
}
.listen-boxes input {
  width: 20px;
  height: 20px;
  accent-color: rgb(var(--color-accent));
}
.listen-status {
  margin: 0.75rem 0 0;
  font-size: var(--ui-size-12);
  line-height: 1.5;
}
.listen-return {
  position: fixed;
  right: 1rem;
  bottom: calc(var(--reader-timeline-h, 20px) + 1rem);
  box-shadow: 0 12px 40px rgb(var(--color-ink) / 0.14);
  font-size: var(--ui-size-13);
}
@media (max-width: 639px) {
  .listen-word {
    display: none;
  }
}
</style>

<style>
/* A static tint, so listening adds no flashing or motion. */
.ob-listening {
  background-color: rgb(var(--color-chapter-soft) / 0.35);
  outline: 2px solid rgb(var(--color-chapter) / 0.4);
  outline-offset: 4px;
  border-radius: 2px;
}
</style>
