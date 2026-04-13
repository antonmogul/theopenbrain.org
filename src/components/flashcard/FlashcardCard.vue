<script setup>
defineProps({
  card: {
    type: Object,
    required: true,
  },
  isFlipped: {
    type: Boolean,
    default: false,
  },
  cardNumber: {
    type: Number,
    default: 1,
  },
  totalCards: {
    type: Number,
    default: 1,
  },
});

defineEmits(["flip"]);
</script>

<template>
  <div
    class="flashcard-wrapper"
    @click="$emit('flip')"
    data-testid="flashcard-card"
  >
    <div class="card-counter">
      {{ cardNumber }} / {{ totalCards }}
    </div>

    <div class="flashcard" :class="{ flipped: isFlipped }">
      <!-- Front -->
      <div class="card-face front">
        <div class="card-label">Question</div>
        <div class="card-content">
          <p>{{ card.front_text || card.front_content || card.front }}</p>
        </div>
        <div class="flip-hint">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          Click to flip
        </div>
      </div>

      <!-- Back -->
      <div class="card-face back">
        <div class="card-label">Answer</div>
        <div class="card-content">
          <p>{{ card.back_text || card.back_content || card.back }}</p>
        </div>
        <div class="flip-hint">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          Click to flip back
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flashcard-wrapper {
  perspective: 1000px;
  cursor: pointer;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

.card-counter {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.flashcard {
  position: relative;
  width: 100%;
  height: 320px;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.front {
  background: white;
  border: 2px solid #e5e7eb;
}

.back {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: white;
  transform: rotateY(180deg);
}

.card-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  margin-bottom: 0.75rem;
}

.front .card-label {
  color: #6b7280;
}

.back .card-label {
  color: rgba(255, 255, 255, 0.8);
}

.card-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.card-content p {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.375rem;
  line-height: 1.5;
  margin: 0;
}

.front .card-content p {
  color: #1f2937;
}

.back .card-content p {
  color: white;
}

.flip-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.flashcard-wrapper:hover .flip-hint {
  opacity: 0.8;
}

.front .flip-hint {
  color: #6b7280;
}

.back .flip-hint {
  color: rgba(255, 255, 255, 0.8);
}

/* Responsive */
@media (max-width: 640px) {
  .flashcard {
    height: 280px;
  }

  .card-content p {
    font-size: 1.125rem;
  }
}
</style>
