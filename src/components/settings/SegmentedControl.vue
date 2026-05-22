<script setup>
defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="segmented">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="segment"
      :class="{ selected: modelValue === opt.value }"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-line));
  border-radius: 0.8rem;
  padding: 0.3rem;
  gap: 0.2rem;
}

.segment {
  padding: 0.6rem 1.4rem;
  font-size: 1.3rem;
  background: transparent;
  border: none;
  border-radius: 0.6rem;
  color: rgb(var(--color-mute));
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.segment:hover {
  color: rgb(var(--color-ink));
}

.segment.selected {
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
}
</style>
