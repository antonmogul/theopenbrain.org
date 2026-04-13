<script setup>
/**
 * WizardStepReview — Step 4: Review & Create
 *
 * Shows a summary and "Create Chapter" button.
 * Emits 'create' when the user confirms.
 */
import { computed } from 'vue';

const props = defineProps({
  meta: { type: Object, required: true },
  sections: { type: Array, default: () => [] },
  references: { type: Array, default: () => [] },
  creating: { type: Boolean, default: false },
  createError: { type: String, default: null },
  createdChapter: { type: Object, default: null },
});

const emit = defineEmits(['create']);

const paragraphCount = computed(() =>
  props.sections.reduce((sum, s) => sum + s.paragraphs.length, 0)
);

const wordCount = computed(() =>
  props.sections.reduce((sum, s) =>
    sum + s.paragraphs.reduce((pSum, p) => {
      const text = p.content_text || '';
      return pSum + text.split(/\s+/).filter(Boolean).length;
    }, 0),
  0)
);
</script>

<template>
  <div class="wizard-step-review">
    <!-- Success State -->
    <div v-if="createdChapter" class="success-state">
      <div class="success-icon">&#10003;</div>
      <h2 class="success-title">Chapter Created!</h2>
      <p class="success-message">
        "{{ createdChapter.title }}" has been created as a draft with
        {{ sections.length }} section(s).
      </p>
      <div class="success-actions">
        <router-link
          :to="`/chapter/${createdChapter.order_index}/${createdChapter.slug}`"
          class="action-btn primary"
        >
          View Chapter
        </router-link>
        <router-link to="/dashboard" class="action-btn secondary">
          Back to Dashboard
        </router-link>
      </div>
    </div>

    <!-- Review State -->
    <template v-else>
      <div class="step-header">
        <h2 class="step-title">Review & Create</h2>
        <p class="step-description">Confirm the details below, then create your chapter.</p>
      </div>

      <div class="review-card">
        <div class="review-row">
          <span class="review-label">Title</span>
          <span class="review-value">{{ meta.title }}</span>
        </div>
        <div v-if="meta.description" class="review-row">
          <span class="review-label">Description</span>
          <span class="review-value description">{{ meta.description }}</span>
        </div>
        <div class="review-row">
          <span class="review-label">Slug</span>
          <span class="review-value mono">/chapter/{{ meta.order_index }}/{{ meta.slug }}</span>
        </div>
        <div class="review-row">
          <span class="review-label">Order</span>
          <span class="review-value mono">{{ meta.order_index }}</span>
        </div>

        <div class="review-divider" />

        <div class="review-row">
          <span class="review-label">Sections</span>
          <span class="review-value mono">{{ sections.length }}</span>
        </div>
        <div class="review-row">
          <span class="review-label">Paragraphs</span>
          <span class="review-value mono">{{ paragraphCount }}</span>
        </div>
        <div class="review-row">
          <span class="review-label">Words</span>
          <span class="review-value mono">{{ wordCount.toLocaleString() }}</span>
        </div>
        <div v-if="references.length > 0" class="review-row">
          <span class="review-label">References</span>
          <span class="review-value mono">{{ references.length }}</span>
        </div>
        <div class="review-row">
          <span class="review-label">Status</span>
          <span class="review-value">
            <span class="status-badge">Draft</span>
          </span>
        </div>
      </div>

      <!-- Section Summary -->
      <div class="sections-summary">
        <h3 class="summary-title">Sections</h3>
        <ol class="section-list">
          <li v-for="section in sections" :key="section.order_index" class="section-item">
            <span class="section-name">{{ section.title }}</span>
            <span class="section-meta">{{ section.paragraphs.length }} paragraphs</span>
          </li>
        </ol>
      </div>

      <!-- Error -->
      <div v-if="createError" class="create-error">
        {{ createError }}
      </div>

      <!-- Create Button -->
      <div class="create-actions">
        <button
          class="create-btn"
          :disabled="creating || sections.length === 0"
          @click="emit('create')"
        >
          <span v-if="creating" class="spinner" />
          {{ creating ? 'Creating Chapter...' : 'Create Chapter' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.wizard-step-review {
  max-width: 640px;
}

.step-header {
  margin-bottom: 2.4rem;
}

.step-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.8rem;
}

.step-description {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.4rem;
  color: #6b7280;
  margin: 0;
}

/* Review Card */
.review-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.review-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.review-label {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.2rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 120px;
}

.review-value {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  color: #1a1a1a;
  text-align: right;
  flex: 1;
}

.review-value.mono {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.4rem;
}

.review-value.description {
  font-size: 1.3rem;
  color: #4b5563;
  max-width: 400px;
}

.review-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 0.4rem 0;
}

.status-badge {
  display: inline-block;
  padding: 0.3rem 1rem;
  background: rgba(234, 179, 8, 0.12);
  color: #ca8a04;
  border-radius: 4px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
  text-transform: uppercase;
}

/* Sections Summary */
.sections-summary {
  margin-top: 2.4rem;
}

.summary-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.4rem;
  font-weight: 600;
  color: #4b5563;
  margin: 0 0 1.2rem;
}

.section-list {
  list-style: decimal;
  padding-left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-name {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.4rem;
  color: #1a1a1a;
}

.section-meta {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
  color: #9ca3af;
}

/* Error */
.create-error {
  margin-top: 1.6rem;
  padding: 1.2rem 1.6rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #dc2626;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.3rem;
}

/* Create Button */
.create-actions {
  margin-top: 3.2rem;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1.6rem 4rem;
  background: rgb(151, 71, 255);
  border: none;
  border-radius: 10px;
  color: white;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover:not(:disabled) {
  background: #1a1a1a;
  color: white;
}

.create-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(151, 71, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Success State */
.success-state {
  text-align: center;
  padding: 4rem 2rem;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  font-size: 3.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
}

.success-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 2.4rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 1rem;
}

.success-message {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  color: #4b5563;
  margin: 0 0 3.2rem;
}

.success-actions {
  display: flex;
  gap: 1.6rem;
  justify-content: center;
}

.action-btn {
  padding: 1.2rem 2.8rem;
  border-radius: 8px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.4rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.action-btn.primary {
  background: rgb(151, 71, 255);
  color: white;
}

.action-btn.primary:hover {
  background: #1a1a1a;
  color: white;
}

.action-btn.secondary {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #4b5563;
}

.action-btn.secondary:hover {
  border-color: #9ca3af;
  color: #1a1a1a;
}
</style>
