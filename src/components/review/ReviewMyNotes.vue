<script setup>
/*
 * ReviewMyNotes — the notes sent from this browser, newest first, with the
 * team's status and reply (OPENBRAIN-204). A note still in the queue says
 * so and can be taken back; "Show me" goes back to its place.
 */
import { computed } from "vue";
import {
  REVIEW_STATUS_LABELS,
  REVIEW_TYPES,
} from "@/composables/useReviewFeedback";
import "./review.css";

const props = defineProps({
  /** The queue's records (useReviewFeedback().queue). */
  notes: { type: Array, default: () => [] },
  /** Only this chapter's notes, when set. */
  chapterSlug: { type: String, default: "" },
  checking: { type: Boolean, default: false },
});
const emit = defineEmits(["refresh", "discard", "show", "retry"]);

const list = computed(() =>
  props.notes
    .filter((n) => !props.chapterSlug || n.chapterSlug === props.chapterSlug)
    .slice()
    .reverse()
);
const typeLabel = (v) =>
  REVIEW_TYPES.find((t) => t.value === v)?.label || "Note";

function stateOf(n) {
  if (n.state === "queued") return { text: "Waiting to send", tone: "wait" };
  if (n.state === "rejected") return { text: "Not accepted", tone: "bad" };
  const s = n.status || "new";
  return {
    text: REVIEW_STATUS_LABELS[s] || s,
    tone:
      s === "done"
        ? "good"
        : s === "question"
          ? "ask"
          : s === "wont_do"
            ? "bad"
            : "info",
  };
}

const when = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};
</script>

<template>
  <div class="rv-notes" data-review-ui>
    <div class="rv-notes-head">
      <p class="rv-hint">
        {{ list.length }} {{ list.length === 1 ? "note" : "notes" }} from this
        browser
      </p>
      <button
        type="button"
        class="rv-btn rv-btn--link"
        :disabled="checking"
        data-testid="review-refresh"
        @click="emit('refresh')"
      >
        {{ checking ? "Checking…" : "Check for replies" }}
      </button>
    </div>
    <p v-if="!list.length" class="rv-hint rv-empty">
      Nothing yet. Your notes and the team's replies show here.
    </p>
    <ol v-else class="rv-note-list">
      <li
        v-for="n in list"
        :key="n.clientId"
        class="rv-note"
        data-testid="review-note-row"
      >
        <div class="rv-note-top">
          <span class="rv-chip" :class="`rv-chip--${stateOf(n).tone}`">
            {{ stateOf(n).text }}
          </span>
          <span class="rv-hint"
            >{{ typeLabel(n.type) }} · {{ when(n.createdAt) }}</span
          >
        </div>
        <p v-if="n.label" class="rv-note-where">{{ n.label }}</p>
        <p v-if="n.quote" class="rv-note-text">
          “{{ n.quote }}”<template v-if="n.suggestedText">
            → “{{ n.suggestedText }}”</template
          >
        </p>
        <p v-if="n.note" class="rv-note-text">{{ n.note }}</p>
        <p v-if="n.reply" class="rv-note-reply" data-testid="review-reply">
          <span class="rv-label">Reply</span>{{ n.reply }}
        </p>
        <p v-if="n.error && n.state !== 'sent'" class="rv-hint">
          {{ n.error }}
        </p>
        <div class="rv-note-actions">
          <button
            v-if="n.hash || n.label"
            type="button"
            class="rv-btn rv-btn--link"
            @click="emit('show', n)"
          >
            Show me
          </button>
          <button
            v-if="n.state === 'queued'"
            type="button"
            class="rv-btn rv-btn--link"
            @click="emit('retry', n)"
          >
            Send now
          </button>
          <button
            v-if="n.state !== 'sent'"
            type="button"
            class="rv-btn rv-btn--link"
            @click="emit('discard', n)"
          >
            Delete
          </button>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.rv-notes {
  display: grid;
  gap: 8px;
}

.rv-notes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rv-empty {
  padding: 12px 0;
}

.rv-note-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rv-note {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 8px;
  font-family: var(--font-ui);
}

.rv-note-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rv-note-where,
.rv-note-text {
  margin: 0;
  font-size: var(--ui-size-13);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.rv-note-where {
  font-weight: 600;
}

.rv-note-reply {
  margin: 4px 0 0;
  padding: 8px;
  border-radius: 6px;
  background: rgb(var(--color-complete) / 0.14);
  font-size: var(--ui-size-13);
  line-height: 1.4;
}

.rv-note-reply .rv-label {
  margin-bottom: 2px;
}

.rv-note-actions {
  display: flex;
  gap: 8px;
}

.rv-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: var(--ui-size-11);
  font-weight: 600;
  letter-spacing: 0.02em;
  background: rgb(var(--color-line));
  color: rgb(var(--color-ink));
}

.rv-chip--good {
  background: rgb(var(--color-complete) / 0.3);
}

.rv-chip--ask {
  background: rgb(var(--color-warn) / 0.35);
}

.rv-chip--wait {
  background: rgb(var(--color-warn) / 0.2);
}

.rv-chip--bad {
  background: rgb(var(--color-mute) / 0.25);
}
</style>
