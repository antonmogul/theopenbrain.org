<script setup>
import {
  SectionHeader,
  BaseCard,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  Button,
} from "@/components/dashboard/shared";

defineProps({
  feedbackLoading: { type: Boolean, default: false },
  feedbackError: { type: [String, null], default: null },
  feedbackAccessDenied: { type: Boolean, default: false },
  feedbackChapters: { type: Array, default: () => [] },
  feedbackChapter: { type: String, default: "all" },
  feedbackKind: { type: String, default: "all" },
  filteredFeedback: { type: Array, default: () => [] },
});
defineEmits(["fetch", "chapter-change", "kind-change"]);

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}
</script>

<template>
  <section class="section">
    <SectionHeader eyebrow="09 · Feedback" title="Reader feedback">
      <template #actions>
        <Button
          variant="outline"
          size="sm"
          :disabled="feedbackLoading || feedbackAccessDenied"
          @click="$emit('fetch')"
          >Refresh</Button
        >
      </template>
    </SectionHeader>

    <p class="feedback-note">
      Read feedback in its chapter context. AI summaries are unavailable; no
      feedback is sent to an AI service.
    </p>
    <ErrorState
      v-if="feedbackAccessDenied"
      title="Access denied"
      message="A signed-in creator account with feedback read access is required."
      :show-retry="false"
    />
    <template v-else>
      <div class="feedback-filters">
        <label>
          Chapter
          <select
            :value="feedbackChapter"
            @change="$emit('chapter-change', $event.target.value)"
          >
            <option value="all">All chapters</option>
            <option value="unassigned">No chapter assigned</option>
            <option
              v-for="chapter in feedbackChapters"
              :key="chapter.id"
              :value="chapter.id"
            >
              {{ chapter.title }}
            </option>
          </select>
        </label>
        <label>
          Feedback type
          <select
            :value="feedbackKind"
            @change="$emit('kind-change', $event.target.value)"
          >
            <option value="all">All types</option>
            <option value="general">General</option>
            <option value="content">Content</option>
            <option value="bug">Bug</option>
            <option value="idea">Idea</option>
          </select>
        </label>
      </div>
      <LoadingState v-if="feedbackLoading" message="Loading feedback…" />
      <ErrorState
        v-else-if="feedbackError"
        :message="feedbackError"
        @retry="$emit('fetch')"
      />
      <EmptyState
        v-else-if="filteredFeedback.length === 0"
        title="No feedback matches these filters"
        message="Reader submissions will appear here with their chapter and date."
      />
      <template v-else>
        <p class="feedback-note" role="status">
          {{ filteredFeedback.length }}
          {{ filteredFeedback.length === 1 ? "message" : "messages" }} · Newest
          first
        </p>
        <ul class="feedback-list">
          <li v-for="item in filteredFeedback" :key="item.id">
            <BaseCard padding="md">
              <article>
                <div class="feedback-heading">
                  <h3 class="card-title sm">{{ item.chapterTitle }}</h3>
                  <StatusBadge>{{ item.kind }}</StatusBadge>
                </div>
                <p v-if="item.sectionTitle" class="feedback-context">
                  Section: {{ item.sectionTitle }}
                </p>
                <p v-if="item.page" class="feedback-context">
                  Page: {{ item.page }}
                </p>
                <time
                  class="feedback-context"
                  :datetime="item.created_at || undefined"
                  >{{ formatDate(item.created_at) }}</time
                >
                <p class="feedback-message">{{ item.message }}</p>
              </article>
            </BaseCard>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style scoped>
@import "@/styles/dashboard-sections.css";
.feedback-note,
.feedback-context {
  font-size: var(--ui-size-13);
  color: rgb(var(--color-mute));
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.feedback-filters {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.feedback-filters label {
  display: grid;
  gap: 6px;
  font-size: var(--ui-size-13);
  max-width: 100%;
}
.feedback-filters select {
  min-width: 0;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font: inherit;
}
.feedback-filters select:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.feedback-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.feedback-heading {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}
.feedback-heading h3 {
  overflow-wrap: anywhere;
  min-width: 0;
}
.feedback-message {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: var(--ui-size-14);
  line-height: 1.6;
  margin-bottom: 0;
}
</style>
