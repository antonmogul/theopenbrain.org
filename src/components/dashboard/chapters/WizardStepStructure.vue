<script setup>
/**
 * WizardStepStructure — Step 3: Preview & Adjust Structure
 *
 * Shows detected sections as a tree, allows renaming, reordering,
 * deleting sections, moving paragraphs, and previewing references.
 */
import { computed } from 'vue';

const props = defineProps({
  sections: { type: Array, default: () => [] },
  references: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:sections', 'update:references']);

// Stats
const sectionCount = computed(() => props.sections.length);

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

const readingTime = computed(() => Math.ceil(wordCount.value / 200));

// Section operations
function renameSection(index, newTitle) {
  const updated = [...props.sections];
  updated[index] = { ...updated[index], title: newTitle };
  emit('update:sections', updated);
}

function moveSection(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= props.sections.length) return;
  const updated = [...props.sections];
  const temp = updated[index];
  updated[index] = updated[newIndex];
  updated[newIndex] = temp;
  // Recalculate order_index
  updated.forEach((s, i) => { s.order_index = i; });
  emit('update:sections', updated);
}

function deleteSection(index) {
  const updated = props.sections.filter((_, i) => i !== index);
  updated.forEach((s, i) => { s.order_index = i; });
  emit('update:sections', updated);
}

function getBlockPreview(paragraph) {
  if (!paragraph.content || !paragraph.content.blocks) return '';
  return paragraph.content.blocks
    .map(block => {
      if (block.type === 'heading') return `[H${block.level}] ${block.content}`;
      if (block.type === 'text') return block.content;
      if (block.type === 'list') return `[List: ${block.items?.length || 0} items]`;
      if (block.type === 'blockquote') return `[Quote] ${block.content?.substring(0, 60)}...`;
      if (block.type === 'code') return `[Code block]`;
      if (block.type === 'image') return `[Image: ${block.alt || 'no alt'}]`;
      if (block.type === 'citation_ref') return `[${block.number}]`;
      return block.content || '';
    })
    .join(' ')
    .substring(0, 120);
}
</script>

<template>
  <div class="wizard-step-structure">
    <div class="step-header">
      <h2 class="step-title">Preview Structure</h2>
      <p class="step-description">Review and adjust your chapter's sections and content.</p>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ sectionCount }}</span>
        <span class="stat-label">Sections</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ paragraphCount }}</span>
        <span class="stat-label">Paragraphs</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ wordCount.toLocaleString() }}</span>
        <span class="stat-label">Words</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ readingTime }} min</span>
        <span class="stat-label">Read Time</span>
      </div>
      <div v-if="references.length > 0" class="stat">
        <span class="stat-value">{{ references.length }}</span>
        <span class="stat-label">References</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="sections.length === 0" class="empty-state">
      <p>No content imported yet. Go back to Step 2 to import content.</p>
    </div>

    <!-- Section Tree -->
    <div v-else class="section-tree">
      <div
        v-for="(section, sIndex) in sections"
        :key="sIndex"
        class="section-node"
      >
        <div class="section-header">
          <div class="section-title-group">
            <span class="section-number">{{ sIndex + 1 }}</span>
            <input
              class="section-title-input"
              :value="section.title"
              @change="renameSection(sIndex, $event.target.value)"
            />
          </div>
          <div class="section-actions">
            <span class="paragraph-count">{{ section.paragraphs.length }} paragraphs</span>
            <button
              class="icon-btn"
              :disabled="sIndex === 0"
              title="Move up"
              @click="moveSection(sIndex, -1)"
            >
              &#8593;
            </button>
            <button
              class="icon-btn"
              :disabled="sIndex === sections.length - 1"
              title="Move down"
              @click="moveSection(sIndex, 1)"
            >
              &#8595;
            </button>
            <button
              class="icon-btn delete"
              title="Delete section"
              @click="deleteSection(sIndex)"
            >
              &#10005;
            </button>
          </div>
        </div>

        <!-- Paragraph previews -->
        <div class="paragraph-list">
          <div
            v-for="(para, pIndex) in section.paragraphs"
            :key="pIndex"
            class="paragraph-preview"
            :class="{ subsection: para.is_subsection_header }"
          >
            <span class="para-index">{{ pIndex + 1 }}</span>
            <span class="para-text">{{ getBlockPreview(para) || '(empty)' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- References Preview -->
    <div v-if="references.length > 0" class="references-section">
      <h3 class="references-title">References</h3>
      <ol class="references-list">
        <li v-for="ref in references" :key="ref.number" class="reference-item">
          <span class="ref-authors">{{ ref.authors }}</span>
          <span v-if="ref.year" class="ref-year">({{ ref.year }})</span>
          <span class="ref-title">{{ ref.title }}</span>
          <span v-if="ref.journal" class="ref-journal">{{ ref.journal }}</span>
          <span v-if="ref.doi" class="ref-doi">
            DOI: {{ ref.doi }}
          </span>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.wizard-step-structure {
  max-width: 800px;
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

/* Stats */
.stats-bar {
  display: flex;
  gap: 2.4rem;
  padding: 1.6rem 2rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 2.4rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-value {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.8rem;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Empty State */
.empty-state {
  padding: 4rem;
  text-align: center;
  color: #9ca3af;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.4rem;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
}

/* Section Tree */
.section-tree {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
}

.section-node {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.6rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex: 1;
}

.section-number {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.2rem;
  color: rgb(151, 71, 255);
  background: rgba(151, 71, 255, 0.08);
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
}

.section-title-input {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: #1a1a1a;
  flex: 1;
  transition: border-color 0.2s;
}

.section-title-input:hover,
.section-title-input:focus {
  border-color: #d1d5db;
  outline: none;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.paragraph-count {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
  color: #9ca3af;
  margin-right: 0.8rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  color: #6b7280;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  border-color: #9ca3af;
  color: #1a1a1a;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-btn.delete:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

/* Paragraph List */
.paragraph-list {
  max-height: 240px;
  overflow-y: auto;
}

.paragraph-preview {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.8rem 1.6rem;
  border-bottom: 1px solid #f3f4f6;
}

.paragraph-preview.subsection {
  padding-left: 3.2rem;
}

.paragraph-preview:last-child {
  border-bottom: none;
}

.para-index {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
  color: #9ca3af;
  min-width: 24px;
}

.para-text {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.3rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* References */
.references-section {
  margin-top: 3.2rem;
  padding-top: 2.4rem;
  border-top: 1px solid #e5e7eb;
}

.references-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 1.6rem;
}

.references-list {
  list-style: decimal;
  padding-left: 2.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reference-item {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.3rem;
  color: #4b5563;
  line-height: 1.6;
}

.ref-authors {
  font-weight: 500;
  color: #1a1a1a;
}

.ref-year {
  color: #6b7280;
  margin: 0 0.4rem;
}

.ref-title {
  font-style: italic;
}

.ref-journal {
  color: #6b7280;
}

.ref-journal::before {
  content: ". ";
}

.ref-doi {
  color: #9ca3af;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
}

.ref-doi::before {
  content: " — ";
}
</style>
