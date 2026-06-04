<script setup>
defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["rate", "skip"]);

const ratings = [
  {
    value: 1,
    label: "Again",
    color: "bg-red-500",
    hoverColor: "hover:bg-red-600",
    subtext: "Complete reset",
    keyHint: "1",
  },
  {
    value: 2,
    label: "Hard",
    color: "bg-orange-500",
    hoverColor: "hover:bg-orange-600",
    subtext: "Struggled",
    keyHint: "2",
  },
  {
    value: 3,
    label: "Good",
    color: "bg-green-500",
    hoverColor: "hover:bg-green-600",
    subtext: "Correct",
    keyHint: "3",
  },
  {
    value: 4,
    label: "Easy",
    color: "bg-blue-500",
    hoverColor: "hover:bg-blue-600",
    subtext: "Too easy",
    keyHint: "4",
  },
];
</script>

<template>
  <div class="rating-container" data-testid="flashcard-rating">
    <p class="rating-prompt">How well did you know this?</p>

    <div class="rating-buttons">
      <button
        v-for="rating in ratings"
        :key="rating.value"
        @click="$emit('rate', rating.value)"
        :class="['rating-btn', rating.color, rating.hoverColor]"
        :disabled="disabled"
        :data-testid="`rate-${rating.value}`"
      >
        <span class="rating-label">{{ rating.label }}</span>
        <span class="rating-subtext">{{ rating.subtext }}</span>
        <span class="key-hint">{{ rating.keyHint }}</span>
      </button>
    </div>

    <button
      @click="$emit('skip')"
      class="skip-btn"
      :disabled="disabled"
      data-testid="skip-card"
    >
      Skip for now
    </button>
  </div>
</template>

<style scoped>
/* Flashcard rating — SM-2 4-level scale kept; restyled to the token spectrum
   (Again=magenta, Hard=amber, Good=teal, Easy=ink). Class names from the
   ratings[] array are preserved; only what they paint is remapped. */
.rating-container {
  text-align: center;
}

.rating-prompt {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
  margin: 0 0 1rem 0;
}

.rating-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.rating-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.5rem;
  border-radius: 4px;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.12s ease;
  position: relative;
}

.rating-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.rating-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rating-label {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.rating-subtext {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  opacity: 0.85;
  margin-top: 0.2rem;
}

.key-hint {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  opacity: 0.5;
}

.skip-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.skip-btn:hover:not(:disabled) {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.skip-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* SM-2 scale → token spectrum. Easy uses ink so white label stays legible. */
.bg-red-500 { background-color: rgb(var(--color-accent)); }
.bg-orange-500 { background-color: rgb(var(--color-warn)); color: #4a2c00; }
.bg-green-500 { background-color: rgb(var(--color-complete)); color: #0a3d33; }
.bg-blue-500 { background-color: rgb(var(--color-ink)); }
.hover\:bg-red-600:hover,
.hover\:bg-orange-600:hover,
.hover\:bg-green-600:hover,
.hover\:bg-blue-600:hover { opacity: 0.88; }

/* Responsive */
@media (max-width: 480px) {
  .rating-buttons {
    grid-template-columns: repeat(2, 1fr);
  }

  .key-hint {
    display: none;
  }
}
</style>
