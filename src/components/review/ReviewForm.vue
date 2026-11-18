<script setup>
/*
 * ReviewForm — one note (OPENBRAIN-204): what kind, where, and what to
 * change. The place is the anchor the widget built (pointing, a selection,
 * or where the reader is), named by its label with "Point again"; a
 * text note can carry the current and the suggested wording.
 */
import { computed, useId } from "vue";
import {
  REVIEW_LIMITS,
  REVIEW_TYPES,
  reviewProblems,
} from "@/composables/useReviewFeedback";
import "./review.css";

const props = defineProps({
  /** The anchor record (helper/reviewAnchor.mjs), or null. */
  anchor: { type: Object, default: null },
  /** Who is writing: { name, role }. */
  identity: { type: Object, default: null },
  /** A message after a send ("Sent", "Saved here, will send…"). */
  status: { type: String, default: "" },
  /** Problems to show (from the last send). */
  problems: { type: Array, default: () => [] },
});
const type = defineModel("type", { type: String, default: "note" });
const note = defineModel("note", { type: String, default: "" });
const quote = defineModel("quote", { type: String, default: "" });
const suggested = defineModel("suggested", { type: String, default: "" });

const emit = defineEmits(["point", "clear-place", "submit", "change-identity"]);

const id = useId();
const wording = computed(() => type.value === "content" || !!quote.value);
const ready = computed(
  () =>
    !reviewProblems({
      note: note.value,
      quote: quote.value,
      suggestedText: suggested.value,
    }).length
);
const where = computed(() => {
  const a = props.anchor;
  if (!a) return "";
  if (a.via === "selection") return "Selected text";
  if (a.via === "reading") return "Where you are reading";
  return "Pointed at";
});
</script>

<template>
  <form class="rv-form" data-review-ui @submit.prevent="emit('submit')">
    <fieldset class="rv-types">
      <legend class="rv-label">What about</legend>
      <label
        v-for="t in REVIEW_TYPES"
        :key="t.value"
        class="rv-type"
        :class="{ 'is-on': type === t.value }"
        :title="t.hint"
      >
        <input
          v-model="type"
          class="rv-type-input"
          type="radio"
          :name="`${id}-type`"
          :value="t.value"
          :data-testid="`review-type-${t.value}`"
        />
        <span>{{ t.label }}</span>
      </label>
    </fieldset>

    <div class="rv-place" data-testid="review-place">
      <p class="rv-label">Where</p>
      <p v-if="anchor" class="rv-place-label">
        <span class="rv-place-via">{{ where }}:</span>
        <span data-testid="review-place-label">{{ anchor.label }}</span>
      </p>
      <p v-else class="rv-hint">Nothing chosen yet.</p>
      <div class="rv-place-actions">
        <button
          type="button"
          class="rv-btn"
          data-testid="review-point"
          @click="emit('point')"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="5" />
            <path d="M8 0v4M8 12v4M0 8h4M12 8h4" />
          </svg>
          {{ anchor && anchor.via === "point" ? "Point again" : "Point at it" }}
        </button>
        <button
          v-if="anchor"
          type="button"
          class="rv-btn rv-btn--link"
          @click="emit('clear-place')"
        >
          Clear
        </button>
      </div>
    </div>

    <template v-if="wording">
      <label class="rv-label" :for="`${id}-quote`">It says</label>
      <textarea
        :id="`${id}-quote`"
        v-model="quote"
        class="rv-textarea rv-textarea--short"
        :maxlength="REVIEW_LIMITS.quote"
        data-testid="review-quote"
      ></textarea>
      <label class="rv-label" :for="`${id}-suggested`">It should say</label>
      <textarea
        :id="`${id}-suggested`"
        v-model="suggested"
        class="rv-textarea rv-textarea--short"
        :maxlength="REVIEW_LIMITS.suggested"
        data-testid="review-suggested"
      ></textarea>
    </template>

    <label class="rv-label" :for="`${id}-note`">
      {{ wording ? "Note (optional)" : "Your note" }}
    </label>
    <textarea
      :id="`${id}-note`"
      v-model="note"
      class="rv-textarea"
      :maxlength="REVIEW_LIMITS.note"
      data-testid="review-note"
    ></textarea>

    <ul v-if="problems.length" class="rv-problems" role="alert">
      <li v-for="p in problems" :key="p" class="rv-error">{{ p }}</li>
    </ul>
    <p
      v-if="status"
      class="rv-status"
      role="status"
      data-testid="review-status"
    >
      {{ status }}
    </p>

    <div class="rv-form-foot">
      <p v-if="identity" class="rv-hint">
        As {{ identity.name }} ·
        <button
          type="button"
          class="rv-btn rv-btn--link rv-inline"
          @click="emit('change-identity')"
        >
          not you?
        </button>
      </p>
      <button
        type="submit"
        class="rv-btn rv-btn--go"
        :disabled="!ready"
        data-testid="review-send"
      >
        Send note
      </button>
    </div>
  </form>
</template>

<style scoped>
.rv-form {
  display: grid;
  gap: 8px;
}

.rv-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}

.rv-types legend {
  margin-bottom: 6px;
}

.rv-type {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  cursor: pointer;
}

.rv-type.is-on {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.1);
}

.rv-type-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.rv-type:has(.rv-type-input:focus-visible) {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 1px;
}

.rv-place {
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px dashed rgb(var(--color-line));
  border-radius: 8px;
}

.rv-place-label {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.rv-place-via {
  margin-right: 4px;
  color: rgb(var(--color-mute));
}

.rv-place-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rv-textarea--short {
  min-height: 56px;
}

.rv-problems {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rv-status {
  margin: 0;
  color: rgb(var(--color-mute));
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
}

.rv-form-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.rv-inline {
  min-height: 0;
  padding: 0;
  font-size: inherit;
}
</style>
