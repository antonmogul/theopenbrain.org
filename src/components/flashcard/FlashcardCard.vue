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
        <div class="card-label">Term</div>
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
        <div class="card-label">Definition</div>
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
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  margin-bottom: 1rem;
}

.flashcard {
  position: relative;
  width: 100%;
  height: 320px;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 8px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

/* Front: paper, hairline border, serif term */
.front {
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-ink) / 0.85);
}

/* Back: flat ink, paper text, teal eyebrow (prototype) */
.back {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-ink));
  transform: rotateY(180deg);
}

.card-label {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.75rem;
}

.front .card-label {
  color: rgb(var(--color-mute));
}

.back .card-label {
  color: rgb(var(--color-complete));
}

.card-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.card-content p {
  font-family: var(--font-body);
  font-size: 2.4rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  margin: 0;
}

/* Definition (back) reads as body prose, not a big display term */
.back .card-content p {
  font-size: 1.7rem;
  font-weight: 400;
  line-height: 1.5;
}

.front .card-content p {
  color: rgb(var(--color-ink));
}

.back .card-content p {
  color: rgb(var(--color-paper));
}

.flip-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.55;
  transition: opacity 0.2s;
}

.flashcard-wrapper:hover .flip-hint {
  opacity: 0.85;
}

.front .flip-hint {
  color: rgb(var(--color-mute));
}

.back .flip-hint {
  color: rgb(var(--color-paper) / 0.7);
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
