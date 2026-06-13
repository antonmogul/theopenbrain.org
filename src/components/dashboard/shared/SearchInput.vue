<script setup>
// Debounced search field. Debounce/clear logic preserved from original; token chrome.
import { ref, watch } from "vue";
const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Search…" },
  debounce: { type: Number, default: 300 },
});
const emit = defineEmits(["update:modelValue", "search"]);
const localValue = ref(props.modelValue);
let debounceTimer = null;
watch(() => props.modelValue, (v) => { localValue.value = v; });
function handleInput(e) {
  localValue.value = e.target.value;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit("update:modelValue", localValue.value);
    emit("search", localValue.value);
  }, props.debounce);
}
function clear() { localValue.value = ""; emit("update:modelValue", ""); emit("search", ""); }
</script>

<template>
  <div class="search">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
    <input type="text" :value="localValue" :placeholder="placeholder" class="search-input" @input="handleInput" />
    <button v-if="localValue" type="button" class="search-clear" aria-label="Clear" @click="clear">✕</button>
  </div>
</template>

<style scoped>
.search { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; color: rgb(var(--color-mute)); pointer-events: none; }
.search-input {
  width: 100%; border: 1px solid rgb(var(--color-line)); border-radius: 4px; background: transparent;
  padding: 9px 34px 9px 36px; font-family: var(--font-body); font-size: 1.4rem;
  color: rgb(var(--color-ink)); outline: none; transition: border-color 0.12s ease;
}
.search-input::placeholder { color: rgb(var(--color-mute)); }
.search-input:focus { border-color: rgb(var(--color-ink)); }
.search-clear { position: absolute; right: 10px; border: 0; background: transparent; color: rgb(var(--color-mute)); cursor: pointer; font-size: 1.3rem; line-height: 1; }
.search-clear:hover { color: rgb(var(--color-ink)); }
</style>
