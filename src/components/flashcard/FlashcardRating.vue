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
.rating-container {
  text-align: center;
}

.rating-prompt {
  font-size: 0.9375rem;
  color: #6b7280;
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
  border-radius: 12px;
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.rating-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.rating-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rating-label {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
}

.rating-subtext {
  font-size: 0.6875rem;
  opacity: 0.8;
  margin-top: 0.125rem;
}

.key-hint {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 0.625rem;
  opacity: 0.5;
  font-weight: 500;
}

.skip-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.skip-btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

.skip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Color classes */
.bg-red-500 { background-color: #ef4444; }
.bg-orange-500 { background-color: #f97316; }
.bg-green-500 { background-color: #22c55e; }
.bg-blue-500 { background-color: #3b82f6; }
.hover\:bg-red-600:hover { background-color: #dc2626; }
.hover\:bg-orange-600:hover { background-color: #ea580c; }
.hover\:bg-green-600:hover { background-color: #16a34a; }
.hover\:bg-blue-600:hover { background-color: #2563eb; }

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
