<script setup>
const options = [
  { value: "newsreader", label: "Newsreader + Inter Tight", sample: "Aa" },
  { value: "literata", label: "Literata + Inter", sample: "Aa" },
  { value: "georgia", label: "Georgia + System UI", sample: "Aa" },
  { value: "ibm-plex-legacy", label: "IBM Plex (current)", sample: "Aa" },
];
</script>

<template>
  <div class="picker">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="card"
      :class="{ active: opt.value === 'ibm-plex-legacy' }"
      disabled
      title="Coming in Track 2"
    >
      <div class="sample">{{ opt.sample }}</div>
      <div class="label">{{ opt.label }}</div>
    </button>
    <p class="hint">Font picker arrives in the next update.</p>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  position: relative;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.2rem 1rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 0.8rem;
  cursor: not-allowed;
  opacity: 0.55;
  text-align: left;
}

.card.active {
  opacity: 1;
  border-color: rgb(var(--color-accent));
}

.sample {
  font-size: 2.8rem;
  line-height: 1;
  color: rgb(var(--color-ink));
}

.label {
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
}

.hint {
  grid-column: 1 / -1;
  margin-top: 0.4rem;
  font-size: 1.2rem;
  color: rgb(var(--color-mute));
  font-style: italic;
}
</style>
