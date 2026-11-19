<script setup>
/*
 * ReviewAllNotes — everyone's notes on the chapter (OPENBRAIN-204; Sonia
 * and Maura, 18 Nov: reviewers see each other's notes, so Stuart can agree
 * or disagree in one place). Grouped by section, each with its place, its
 * author, its status and the team's reply, then the reviewers' replies and
 * a box to add one. "Show me" goes to the place; the numbers match the
 * pins on the page.
 */
import { computed, ref } from "vue";
import {
  REVIEW_LIMITS,
  REVIEW_ROLES,
  REVIEW_STATUS_LABELS,
  REVIEW_TYPES,
} from "@/composables/useReviewFeedback";
import { reviewStatusIcon } from "@/helper/reviewNotes.mjs";
import ReviewAuthorActions from "./ReviewAuthorActions.vue";
import "./review.css";

const props = defineProps({
  /** threadReviewNotes' groups: [{ key, notes: [{ ...row, replies }] }]. */
  groups: { type: Array, default: () => [] },
  /** (section key) → its title on the page. */
  sectionTitle: { type: Function, default: (k) => k },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  /** Whether the pins are on the page. */
  pins: { type: Boolean, default: false },
  showChecked: { type: Boolean, default: false },
  ownIds: { type: Array, default: () => [] },
  authorAction: { type: Function, default: null },
  /** Note id → its pin number. */
  numbers: { type: Object, default: () => ({}) },
  /** The note to open (a pin was pressed). */
  focusId: { type: String, default: "" },
});
const emit = defineEmits([
  "refresh",
  "show",
  "reply",
  "update:pins",
  "update:showChecked",
]);

const open = ref({}); // note id → reply box open
const drafts = ref({});
const count = computed(() =>
  props.groups.reduce((n, g) => n + g.notes.length, 0)
);
const typeLabel = (v) =>
  REVIEW_TYPES.find((t) => t.value === v)?.label || "Note";
const roleLabel = (v) => REVIEW_ROLES.find((r) => r.value === v)?.label || "";
const statusLabel = (s) => REVIEW_STATUS_LABELS[s] || s || "";
const when = (iso) => {
  try {
    return iso
      ? new Date(iso).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        })
      : "";
  } catch {
    return "";
  }
};

function send(note) {
  const text = String(drafts.value[note.id] || "").trim();
  if (!text) return;
  emit("reply", { parent: note, text });
  drafts.value = { ...drafts.value, [note.id]: "" };
  open.value = { ...open.value, [note.id]: false };
}
</script>

<template>
  <div class="rv-all" data-review-ui>
    <div class="rv-all-head">
      <p class="rv-hint">
        {{ count }} {{ count === 1 ? "note" : "notes" }} on this chapter
      </p>
      <label class="rv-pins">
        <input
          type="checkbox"
          :checked="pins"
          data-testid="review-pins"
          @change="emit('update:pins', $event.target.checked)"
        />
        Pins on the page
      </label>
      <label class="rv-pins">
        <input
          type="checkbox"
          :checked="showChecked"
          @change="emit('update:showChecked', $event.target.checked)"
        />
        Show checked
      </label>
      <button
        type="button"
        class="rv-btn rv-btn--link"
        :disabled="loading"
        @click="emit('refresh')"
      >
        {{ loading ? "Loading…" : "Refresh" }}
      </button>
    </div>
    <p v-if="error" class="rv-error" role="alert">{{ error }}</p>
    <p v-if="!count && !loading && !error" class="rv-hint rv-empty">
      No notes on this chapter yet.
    </p>
    <div
      v-for="group in groups"
      :key="group.key || 'elsewhere'"
      class="rv-group"
    >
      <h3 class="rv-group-title">
        {{ group.key ? sectionTitle(group.key) : "Elsewhere in the chapter" }}
      </h3>
      <ol class="rv-thread-list">
        <li
          v-for="note in group.notes"
          :key="note.id"
          class="rv-thread rv-status rv-status-card"
          :data-status="note.status"
          :class="{ 'is-focus': note.id === focusId }"
          :data-note-id="note.id"
          data-testid="review-all-note"
        >
          <div class="rv-thread-top">
            <span v-if="numbers[note.id]" class="rv-num" aria-hidden="true">{{
              numbers[note.id]
            }}</span>
            <span class="rv-who"
              >{{ note.reviewer_name
              }}<span v-if="roleLabel(note.reviewer_role)" class="rv-hint">
                · {{ roleLabel(note.reviewer_role) }}</span
              ></span
            >
            <span class="rv-status rv-status-chip" :data-status="note.status"
              ><span aria-hidden="true">{{
                reviewStatusIcon(note.status)
              }}</span
              >{{ statusLabel(note.status) }}</span
            >
          </div>
          <button
            type="button"
            class="rv-place-link"
            data-testid="review-all-show"
            @click="emit('show', note)"
          >
            {{ note.anchor?.label || "Show me" }}
          </button>
          <p class="rv-hint">
            {{ typeLabel(note.type) }} · {{ when(note.created_at) }}
          </p>
          <p v-if="note.quote" class="rv-thread-text">
            “{{ note.quote }}”<template v-if="note.suggested_text">
              → “{{ note.suggested_text }}”</template
            >
          </p>
          <p v-if="note.note" class="rv-thread-text">{{ note.note }}</p>
          <p v-if="note.reply" class="rv-thread-team">
            <span class="rv-label">The team</span>{{ note.reply }}
          </p>
          <ReviewAuthorActions
            v-if="ownIds.includes(note.id)"
            :note="note"
            :action="authorAction"
          />
          <ol v-if="note.replies.length" class="rv-replies">
            <li v-for="r in note.replies" :key="r.id" class="rv-reply">
              <span class="rv-who">{{ r.reviewer_name }}</span>
              <span class="rv-hint"> · {{ when(r.created_at) }}</span>
              <p class="rv-thread-text">{{ r.note }}</p>
            </li>
          </ol>
          <div v-if="open[note.id]" class="rv-reply-box">
            <textarea
              v-model="drafts[note.id]"
              class="rv-textarea rv-textarea--reply"
              :maxlength="REVIEW_LIMITS.note"
              :aria-label="`Reply to ${note.reviewer_name}`"
              data-testid="review-reply-text"
            ></textarea>
            <div class="rv-reply-actions">
              <button
                type="button"
                class="rv-btn rv-btn--link"
                @click="open = { ...open, [note.id]: false }"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rv-btn rv-btn--go"
                :disabled="!String(drafts[note.id] || '').trim()"
                data-testid="review-reply-send"
                @click="send(note)"
              >
                Reply
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="rv-btn rv-btn--link rv-reply-open"
            data-testid="review-reply-open"
            @click="open = { ...open, [note.id]: true }"
          >
            Reply
          </button>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.rv-all {
  display: grid;
  gap: 10px;
  font-family: var(--font-ui);
}

.rv-all-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.rv-all-head .rv-hint {
  flex: 1;
}

.rv-pins {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--ui-size-12);
}

.rv-empty {
  padding: 12px 0;
}

.rv-group {
  display: grid;
  gap: 6px;
}

.rv-group-title {
  margin: 4px 0 0;
  font-size: var(--ui-size-13);
  font-weight: 600;
}

.rv-thread-list,
.rv-replies {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rv-thread {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 8px;
}

.rv-thread.is-focus {
  border-color: rgb(var(--color-accent));
  box-shadow: 0 0 0 2px rgb(var(--color-accent) / 0.25);
}

.rv-thread-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.rv-who {
  flex: 1;
  font-size: var(--ui-size-13);
  font-weight: 600;
}

.rv-num {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgb(var(--rv-status-color));
  color: #111;
  font-size: var(--ui-size-11);
  font-weight: 700;
}

.rv-place-link {
  padding: 0;
  border: 0;
  background: none;
  color: rgb(var(--color-accent));
  font: inherit;
  font-size: var(--ui-size-13);
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  overflow-wrap: anywhere;
}

.rv-place-link:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.rv-thread-text {
  margin: 0;
  font-size: var(--ui-size-13);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.rv-thread-team {
  margin: 2px 0 0;
  padding: 8px;
  border-radius: 6px;
  background: rgb(var(--color-complete) / 0.14);
  font-size: var(--ui-size-13);
}

.rv-replies {
  margin-top: 4px;
  padding-left: 10px;
  border-left: 2px solid rgb(var(--color-line));
}

.rv-reply .rv-who {
  flex: none;
}

.rv-reply-box {
  display: grid;
  gap: 6px;
}

.rv-textarea--reply {
  min-height: 56px;
}

.rv-reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.rv-reply-open {
  justify-self: start;
}
</style>
