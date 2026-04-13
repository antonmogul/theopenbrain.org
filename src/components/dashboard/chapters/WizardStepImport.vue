<script setup>
/**
 * WizardStepImport — Step 2: Import Content
 *
 * Four import methods: paste text, upload markdown, upload DOCX, upload bibliography.
 * Also provides a "Download Template" link.
 */
import { ref, computed, watch } from 'vue';
import { useContentParser } from '@/composables/useContentParser';
import { useBibParser } from '@/composables/useBibParser';

const props = defineProps({
  sections: { type: Array, default: () => [] },
  references: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:sections', 'update:references', 'parsed']);

const activeTab = ref('paste');
const pasteContent = ref('');
const importStatus = ref(null); // null | 'parsing' | 'success' | 'error'
const importMessage = ref('');

const { parseMarkdown, parseText, parseDocx, autoParse, parseError: contentError } = useContentParser();
const { parseBibFile, parseError: bibError } = useBibParser();

// File input refs
const mdFileInput = ref(null);
const docxFileInput = ref(null);
const bibFileInput = ref(null);

const tabs = [
  { id: 'paste', label: 'Paste Text', icon: 'clipboard' },
  { id: 'markdown', label: 'Upload .md', icon: 'file-text' },
  { id: 'docx', label: 'Upload .docx', icon: 'file' },
  { id: 'bibliography', label: 'Bibliography', icon: 'book-open' },
];

async function handlePaste() {
  if (!pasteContent.value.trim()) return;
  importStatus.value = 'parsing';
  try {
    const result = await autoParse(pasteContent.value);
    emit('update:sections', result.sections);
    emit('parsed', { type: 'paste', ...result });
    importStatus.value = 'success';
    importMessage.value = `Detected ${result.sections.length} section(s)`;
  } catch (err) {
    importStatus.value = 'error';
    importMessage.value = err.message;
  }
}

async function handleMarkdownUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  importStatus.value = 'parsing';
  try {
    const content = await file.text();
    const result = await parseMarkdown(content);
    emit('update:sections', result.sections);
    emit('parsed', { type: 'markdown', filename: file.name, ...result });
    importStatus.value = 'success';
    importMessage.value = `Parsed "${file.name}" — ${result.sections.length} section(s)`;
  } catch (err) {
    importStatus.value = 'error';
    importMessage.value = err.message;
  }
}

async function handleDocxUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  importStatus.value = 'parsing';
  try {
    const result = await parseDocx(file);
    emit('update:sections', result.sections);
    emit('parsed', { type: 'docx', filename: file.name, ...result });
    importStatus.value = 'success';
    importMessage.value = `Converted "${file.name}" — ${result.sections.length} section(s)`;
  } catch (err) {
    importStatus.value = 'error';
    importMessage.value = err.message;
  }
}

async function handleBibUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  importStatus.value = 'parsing';
  try {
    const refs = await parseBibFile(file);
    emit('update:references', refs);
    emit('parsed', { type: 'bibliography', filename: file.name, references: refs });
    importStatus.value = 'success';
    importMessage.value = `Parsed ${refs.length} reference(s) from "${file.name}"`;
  } catch (err) {
    importStatus.value = 'error';
    importMessage.value = err.message;
  }
}

function downloadTemplate() {
  const link = document.createElement('a');
  link.href = '/templates/chapter-template.md';
  link.download = 'chapter-template.md';
  link.click();
}

const hasContent = computed(() => props.sections.length > 0);

defineExpose({ hasContent });
</script>

<template>
  <div class="wizard-step-import">
    <div class="step-header">
      <div class="step-header-row">
        <div>
          <h2 class="step-title">Import Content</h2>
          <p class="step-description">Paste text, upload a file, or import a bibliography.</p>
        </div>
        <button class="template-btn" @click="downloadTemplate">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Template
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="import-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="import-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Paste Text -->
      <div v-if="activeTab === 'paste'" class="paste-tab">
        <textarea
          v-model="pasteContent"
          class="paste-textarea"
          placeholder="Paste your chapter content here...

Use ## headings to define sections:

## Introduction
Your introduction text here...

## Main Content
More paragraphs here...

Citations use [^1] or [1] notation."
          rows="16"
        />
        <button
          class="parse-btn"
          :disabled="!pasteContent.trim() || importStatus === 'parsing'"
          @click="handlePaste"
        >
          {{ importStatus === 'parsing' ? 'Parsing...' : 'Parse Content' }}
        </button>
      </div>

      <!-- Upload Markdown -->
      <div v-if="activeTab === 'markdown'" class="upload-tab">
        <div class="upload-zone" @click="mdFileInput?.click()">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <p class="upload-text">Click to upload a Markdown file</p>
          <p class="upload-hint">.md files accepted</p>
        </div>
        <input
          ref="mdFileInput"
          type="file"
          accept=".md,.markdown,.txt"
          style="display: none"
          @change="handleMarkdownUpload"
        />
      </div>

      <!-- Upload DOCX -->
      <div v-if="activeTab === 'docx'" class="upload-tab">
        <div class="upload-zone" @click="docxFileInput?.click()">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <p class="upload-text">Click to upload a Word document</p>
          <p class="upload-hint">.docx files accepted</p>
        </div>
        <input
          ref="docxFileInput"
          type="file"
          accept=".docx"
          style="display: none"
          @change="handleDocxUpload"
        />
      </div>

      <!-- Upload Bibliography -->
      <div v-if="activeTab === 'bibliography'" class="upload-tab">
        <div class="upload-zone" @click="bibFileInput?.click()">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <p class="upload-text">Click to upload a bibliography file</p>
          <p class="upload-hint">.bib (BibTeX) or .ris (RIS) files — exported from Zotero, Mendeley, etc.</p>
        </div>
        <input
          ref="bibFileInput"
          type="file"
          accept=".bib,.ris"
          style="display: none"
          @change="handleBibUpload"
        />
      </div>
    </div>

    <!-- Import Status -->
    <div v-if="importStatus" class="import-status" :class="importStatus">
      <span v-if="importStatus === 'parsing'" class="status-icon spinning">&#8987;</span>
      <span v-else-if="importStatus === 'success'" class="status-icon">&#10003;</span>
      <span v-else class="status-icon">&#10007;</span>
      {{ importMessage }}
    </div>
  </div>
</template>

<style scoped>
.wizard-step-import {
  max-width: 760px;
}

.step-header {
  margin-bottom: 2.4rem;
}

.step-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
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

.template-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1.6rem;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #4b5563;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.template-btn:hover {
  border-color: rgb(151, 71, 255);
  color: #1a1a1a;
}

/* Tabs */
.import-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2.4rem;
}

.import-tab {
  padding: 1.2rem 2rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.2s;
}

.import-tab:hover {
  color: #1a1a1a;
}

.import-tab.active {
  color: rgb(151, 71, 255);
  border-bottom-color: rgb(151, 71, 255);
}

/* Paste Tab */
.paste-textarea {
  width: 100%;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 1.6rem;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.3rem;
  line-height: 1.8;
  color: #1a1a1a;
  resize: vertical;
  min-height: 300px;
}

.paste-textarea:focus {
  outline: none;
  border-color: rgb(151, 71, 255);
}

.paste-textarea::placeholder {
  color: #9ca3af;
}

.parse-btn {
  margin-top: 1.6rem;
  padding: 1.2rem 3.2rem;
  background: rgb(151, 71, 255);
  border: none;
  border-radius: 8px;
  color: white;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.4rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.parse-btn:hover:not(:disabled) {
  background: #1a1a1a;
  color: white;
}

.parse-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Upload Zone */
.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
  padding: 4.8rem 2.4rem;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #9ca3af;
}

.upload-zone:hover {
  border-color: rgb(151, 71, 255);
  background: rgba(151, 71, 255, 0.03);
  color: #4b5563;
}

.upload-text {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  color: #4b5563;
  margin: 0;
}

.upload-hint {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.2rem;
  color: #9ca3af;
  margin: 0;
}

/* Status */
.import-status {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 2rem;
  padding: 1.2rem 1.6rem;
  border-radius: 8px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.3rem;
}

.import-status.success {
  background: rgba(34, 197, 94, 0.08);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.import-status.error {
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.import-status.parsing {
  background: rgba(151, 71, 255, 0.08);
  color: rgb(151, 71, 255);
  border: 1px solid rgba(151, 71, 255, 0.2);
}

.status-icon {
  font-size: 1.4rem;
}

.status-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
