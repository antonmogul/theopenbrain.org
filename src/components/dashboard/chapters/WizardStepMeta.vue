<script setup>
/**
 * WizardStepMeta — Step 1: Title & Metadata
 *
 * Collects chapter title, description, slug, and order_index.
 * Slug auto-generates from title but is editable.
 */
import { computed, watch } from 'vue';
import { toSlug } from '@/helper/general';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  existingChapterCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['update:modelValue']);

const meta = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

function updateField(field, value) {
  emit('update:modelValue', { ...props.modelValue, [field]: value });
}

// Auto-generate slug when title changes (unless manually edited)
let slugManuallyEdited = false;

function onTitleInput(e) {
  const title = e.target.value;
  updateField('title', title);
  if (!slugManuallyEdited) {
    updateField('slug', toSlug(title));
  }
}

function onSlugInput(e) {
  slugManuallyEdited = true;
  updateField('slug', toSlug(e.target.value));
}

const isValid = computed(() => {
  return meta.value.title && meta.value.title.trim().length > 0;
});

defineExpose({ isValid });
</script>

<template>
  <div class="wizard-step-meta">
    <div class="step-header">
      <h2 class="step-title">Chapter Details</h2>
      <p class="step-description">Set the title and basic information for your new chapter.</p>
    </div>

    <div class="form-fields">
      <div class="form-group">
        <label class="form-label" for="chapter-title">
          Title
          <span class="required">*</span>
        </label>
        <input
          id="chapter-title"
          type="text"
          class="form-input"
          placeholder="e.g. Visual Perception and UX"
          :value="meta.title"
          @input="onTitleInput"
          autofocus
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="chapter-description">
          Description
          <span class="optional">(optional)</span>
        </label>
        <textarea
          id="chapter-description"
          class="form-textarea"
          placeholder="Brief description of this chapter's content..."
          :value="meta.description"
          @input="updateField('description', $event.target.value)"
          rows="3"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="chapter-slug">
            URL Slug
          </label>
          <div class="slug-preview">
            <span class="slug-prefix">/chapter/{{ meta.order_index }}/</span>
            <input
              id="chapter-slug"
              type="text"
              class="form-input slug-input"
              :value="meta.slug"
              @input="onSlugInput"
            />
          </div>
        </div>

        <div class="form-group form-group-narrow">
          <label class="form-label" for="chapter-order">
            Order
          </label>
          <input
            id="chapter-order"
            type="number"
            class="form-input"
            :value="meta.order_index"
            @input="updateField('order_index', parseInt($event.target.value) || 0)"
            min="0"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-step-meta {
  max-width: 640px;
}

.step-header {
  margin-bottom: 3.2rem;
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

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
}

.form-group-narrow {
  max-width: 120px;
}

.form-row {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.form-label {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.2rem;
  font-weight: 500;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.required {
  color: rgb(151, 71, 255);
}

.optional {
  color: #9ca3af;
  font-weight: 400;
  text-transform: none;
}

.form-input {
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 1.2rem 1.6rem;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  color: #1a1a1a;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: rgb(151, 71, 255);
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-textarea {
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 1.2rem 1.6rem;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  color: #1a1a1a;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: rgb(151, 71, 255);
}

.form-textarea::placeholder {
  color: #9ca3af;
}

.slug-preview {
  display: flex;
  align-items: center;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.slug-prefix {
  padding: 1.2rem 0 1.2rem 1.6rem;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.3rem;
  color: #9ca3af;
  white-space: nowrap;
}

.slug-input {
  border: none;
  border-radius: 0;
  background: transparent;
  padding-left: 0;
}

.slug-input:focus {
  border-color: transparent;
}

.slug-preview:focus-within {
  border-color: rgb(151, 71, 255);
}
</style>
