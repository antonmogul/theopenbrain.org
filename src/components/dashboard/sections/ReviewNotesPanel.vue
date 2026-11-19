<script setup>
/**
 * Review notes (OPENBRAIN-203): what authors and designers left on the
 * chapters with the reader's review widget, chapter → section, each with the
 * place it points at, an "Open in chapter" link, and a status + reply form
 * (one save per press). Presentational: DashboardView owns useReviewNotes.
 */
import { reactive } from "vue";
import "@/components/review/review.css";
import {
  BaseCard,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  Button,
} from "@/components/dashboard/shared";
import {
  REVIEW_STATUSES,
  REVIEW_TYPES,
  reviewAnchorLabel,
  reviewNoteHref,
  reviewStatusLabel,
  reviewStatusIcon,
  reviewTypeLabel,
  reviewViewLabel,
} from "@/helper/reviewNotes.mjs";

const props = defineProps({
  groups: { type: Array, default: () => [] },
  chapters: { type: Array, default: () => [] },
  filters: {
    type: Object,
    default: () => ({ chapter: "all", type: "all", status: "open" }),
  },
  loading: { type: Boolean, default: false },
  error: { type: [String, null], default: null },
  missingTable: { type: Boolean, default: false },
  accessDenied: { type: Boolean, default: false },
  filteredCount: { type: Number, default: 0 },
  openCount: { type: Number, default: 0 },
  savingIds: { type: Array, default: () => [] },
  saveErrors: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["fetch", "filter-change", "save"]);

const drafts = reactive({});
const draftOf = (note) =>
  drafts[note.id] || { status: note.status, reply: note.reply || "" };
function editDraft(note, key, value) {
  drafts[note.id] = { ...draftOf(note), [key]: value };
}
const isDirty = (note) => {
  const draft = draftOf(note);
  return (
    draft.status !== note.status ||
    draft.reply.trim() !== (note.reply || "").trim()
  );
};
function save(note) {
  const draft = draftOf(note);
  emit("save", { id: note.id, status: draft.status, reply: draft.reply });
}
function setFilter(key, value) {
  emit("filter-change", { ...props.filters, [key]: value });
}

const ROLE_LABELS = {
  author: "Author",
  designer: "Designer",
  reviewer: "Reviewer",
  other: "Other",
};
function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}
</script>

<template>
  <div class="review-notes">
    <div class="review-bar">
      <p class="review-hint">
        Notes left in the chapters with the review widget. Reviewers see the
        status and your reply under “My notes”.
      </p>
      <Button
        variant="outline"
        size="sm"
        :disabled="loading || accessDenied"
        @click="emit('fetch')"
        >Refresh</Button
      >
    </div>

    <ErrorState
      v-if="accessDenied"
      title="Access denied"
      message="A signed-in creator account is required to read review notes."
      :show-retry="false"
    />
    <template v-else>
      <div class="review-filters">
        <label>
          Chapter
          <select
            :value="filters.chapter"
            @change="setFilter('chapter', $event.target.value)"
          >
            <option value="all">All chapters</option>
            <option
              v-for="chapter in chapters"
              :key="chapter.slug"
              :value="chapter.slug"
            >
              {{ chapter.title }}
            </option>
          </select>
        </label>
        <label>
          Type
          <select
            :value="filters.type"
            @change="setFilter('type', $event.target.value)"
          >
            <option value="all">All types</option>
            <option v-for="t in REVIEW_TYPES" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
        </label>
        <label>
          Status
          <select
            :value="filters.status"
            @change="setFilter('status', $event.target.value)"
          >
            <option value="open">Open (new, doing, question)</option>
            <option value="all">All statuses</option>
            <option
              v-for="s in REVIEW_STATUSES"
              :key="s.value"
              :value="s.value"
            >
              {{ s.label }}
            </option>
          </select>
        </label>
      </div>

      <LoadingState v-if="loading" message="Loading review notes…" />
      <ErrorState
        v-else-if="error"
        :title="missingTable ? 'Database update needed' : undefined"
        :message="error"
        :show-retry="!missingTable"
        @retry="emit('fetch')"
      />
      <EmptyState
        v-else-if="groups.length === 0"
        title="No review notes match these filters"
        message="Notes reviewers leave in a chapter appear here, grouped by chapter and section."
      />
      <template v-else>
        <p class="review-hint" role="status">
          {{ filteredCount }} {{ filteredCount === 1 ? "note" : "notes" }} ·
          {{ openCount }} open in all · Newest first in each section
        </p>
        <section
          v-for="chapter in groups"
          :key="chapter.slug"
          class="review-chapter"
        >
          <h3 class="review-chapter-title">{{ chapter.title }}</h3>
          <div
            v-for="section in chapter.sections"
            :key="section.slug"
            class="review-section"
          >
            <h4 class="review-section-title">{{ section.title }}</h4>
            <ul class="review-list">
              <li v-for="note in section.notes" :key="note.id">
                <BaseCard padding="md">
                  <article
                    class="review-note rv-status rv-status-card"
                    :data-status="note.status"
                    :data-review-note="note.id"
                  >
                    <div class="review-heading">
                      <StatusBadge>{{
                        reviewTypeLabel(note.type)
                      }}</StatusBadge>
                      <span
                        class="rv-status rv-status-chip"
                        :data-status="note.status"
                        ><span aria-hidden="true">{{
                          reviewStatusIcon(note.status)
                        }}</span
                        >{{ reviewStatusLabel(note.status) }}</span
                      >
                      <span class="review-meta">
                        {{ note.reviewer_name
                        }}<template v-if="note.reviewer_role">
                          · {{ ROLE_LABELS[note.reviewer_role] }}</template
                        >
                        ·
                        <time :datetime="note.created_at || undefined">{{
                          formatDate(note.created_at)
                        }}</time>
                      </span>
                    </div>
                    <p class="review-place">
                      <span class="review-place-label">{{
                        reviewAnchorLabel(note)
                      }}</span>
                      <span v-if="reviewViewLabel(note)" class="review-meta">
                        {{ reviewViewLabel(note) }}</span
                      >
                      <a
                        v-if="reviewNoteHref(note, chapter.module)"
                        class="review-open"
                        :href="reviewNoteHref(note, chapter.module)"
                        target="_blank"
                        rel="noopener"
                        >Open in chapter</a
                      >
                    </p>
                    <div
                      v-if="note.quote || note.suggested_text"
                      class="review-change"
                    >
                      <p v-if="note.quote">
                        <span class="review-kicker">Text</span>
                        <q>{{ note.quote }}</q>
                      </p>
                      <p v-if="note.suggested_text">
                        <span class="review-kicker">Suggested</span>
                        <q>{{ note.suggested_text }}</q>
                      </p>
                    </div>
                    <p v-if="note.note" class="review-message">
                      {{ note.note }}
                    </p>
                    <ol
                      v-if="note.replies?.length"
                      class="review-replies"
                      :aria-label="`Replies to ${note.reviewer_name}`"
                    >
                      <li
                        v-for="reply in note.replies"
                        :key="reply.id"
                        :data-review-reply="reply.id"
                      >
                        <p class="review-meta">
                          {{ reply.reviewer_name
                          }}<template v-if="reply.reviewer_role">
                            · {{ ROLE_LABELS[reply.reviewer_role] }}</template
                          >
                          ·
                          <time :datetime="reply.created_at || undefined">{{
                            formatDate(reply.created_at)
                          }}</time>
                        </p>
                        <p class="review-message">
                          {{ reply.note || reply.quote }}
                        </p>
                      </li>
                    </ol>
                    <form class="review-answer" @submit.prevent="save(note)">
                      <label>
                        Status
                        <select
                          :value="draftOf(note).status"
                          @change="
                            editDraft(note, 'status', $event.target.value)
                          "
                        >
                          <option
                            v-for="s in REVIEW_STATUSES"
                            :key="s.value"
                            :value="s.value"
                          >
                            {{ s.label }}
                          </option>
                        </select>
                      </label>
                      <label class="review-reply">
                        Reply to the reviewer
                        <textarea
                          rows="2"
                          maxlength="4000"
                          :value="draftOf(note).reply"
                          @input="editDraft(note, 'reply', $event.target.value)"
                        ></textarea>
                      </label>
                      <Button
                        size="sm"
                        :disabled="
                          !isDirty(note) || savingIds.includes(note.id)
                        "
                        @click="save(note)"
                        >{{
                          savingIds.includes(note.id) ? "Saving…" : "Save"
                        }}</Button
                      >
                      <p
                        v-if="saveErrors[note.id]"
                        class="review-save-error"
                        role="alert"
                      >
                        {{ saveErrors[note.id] }}
                      </p>
                    </form>
                  </article>
                </BaseCard>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
@import "@/styles/dashboard-sections.css";
.review-notes {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.review-bar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
}
.review-hint,
.review-meta {
  font-size: var(--ui-size-13);
  color: rgb(var(--color-mute));
  line-height: 1.5;
  overflow-wrap: anywhere;
  margin: 0;
}
.review-filters,
.review-answer {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.review-filters label,
.review-answer label {
  display: grid;
  gap: 6px;
  font-size: var(--ui-size-13);
  max-width: 100%;
}
.review-filters select,
.review-answer select,
.review-answer textarea {
  min-width: 0;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font: inherit;
}
.review-reply {
  flex: 1 1 16rem;
}
.review-answer textarea {
  width: 100%;
  resize: vertical;
}
:is(select, textarea, .review-open):focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.review-chapter {
  display: grid;
  gap: 12px;
}
.review-chapter-title {
  font-size: var(--ui-size-18);
  margin: 8px 0 0;
}
.review-section {
  display: grid;
  gap: 8px;
}
.review-section-title {
  font-size: var(--ui-size-14);
  color: rgb(var(--color-mute));
  margin: 0;
}
.review-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.review-note {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.review-heading,
.review-place {
  display: flex;
  gap: 8px 12px;
  align-items: baseline;
  flex-wrap: wrap;
  margin: 0;
}
.review-place-label {
  font-size: var(--ui-size-14);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.review-open {
  font-size: var(--ui-size-13);
  color: rgb(var(--color-accent));
}
.review-change {
  display: grid;
  gap: 4px;
  padding-left: 12px;
  border-left: 2px solid rgb(var(--color-line));
}
.review-change p {
  margin: 0;
  font-size: var(--ui-size-14);
  overflow-wrap: anywhere;
}
.review-kicker {
  display: inline-block;
  min-width: 5.5rem;
  font-size: var(--ui-size-11);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}
.review-message {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: var(--ui-size-14);
  line-height: 1.6;
  margin: 0;
}
.review-replies {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0 0 0 12px;
  list-style: none;
  border-left: 2px solid rgb(var(--color-accent) / 0.4);
}
.review-replies li {
  display: grid;
  gap: 2px;
}
.review-save-error {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--ui-size-13);
  color: rgb(var(--color-warn));
}
</style>
