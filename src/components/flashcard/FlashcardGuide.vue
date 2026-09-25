<script setup>
/*
 * FlashcardGuide — how flashcards work, and whether the deck is a draft
 * (OPENBRAIN-102). Stuart, 24 Sep: "How are flashcards supposed to work?"
 * Shown above the card in the study page and the reader's panel. The how-to
 * can be put away once read (remembered on this device); the draft notice
 * stays while the deck is in review.
 */
import { ref } from "vue";

defineProps({
  /** The deck's cards are drafts the authors have not checked yet. */
  draft: { type: Boolean, default: false },
});

const KEY = "ob.flashcardsGuideSeen";
function readSeen() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
const seen = ref(readSeen());
function dismiss() {
  seen.value = true;
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode: it just shows again next time */
  }
}
</script>

<template>
  <div class="fg">
    <div v-if="!seen" class="fg-howto" role="note">
      <p>
        <strong>How it works.</strong> Read the question and answer it in your
        head, then flip the card to check. Rate how well you knew it: cards you
        found hard come back sooner, cards you knew come back later.
      </p>
      <button type="button" class="fg-dismiss" @click="dismiss">Got it</button>
    </div>
    <p v-if="draft" class="fg-draft" role="note">
      Draft deck: written from the chapter's text and being checked by the
      authors.
    </p>
  </div>
</template>

<style scoped>
.fg {
  display: grid;
  gap: 0.5rem;
}
.fg:empty {
  display: none;
}
.fg-howto {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  font-family: var(--font-ui);
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(var(--color-ink));
}
.fg-howto p {
  margin: 0;
  flex: 1;
}
.fg-dismiss {
  flex: none;
  padding: 0.25rem 0.625rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  font: 0.75rem/1.4 var(--font-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.fg-dismiss:hover {
  background: rgb(var(--color-ink) / 0.06);
}
.fg-draft {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: rgb(var(--color-mute));
}
</style>
