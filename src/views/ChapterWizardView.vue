<script setup>
/**
 * ChapterWizardView — 4-Step Chapter Creation Wizard
 *
 * Route: /dashboard/chapter/new
 * Steps: 1) Title & Metadata → 2) Import Content → 3) Preview Structure → 4) Review & Create
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { createChapter, createSection, createParagraph, createReference } from '@/services/api/chapters';
import { fetchChapters } from '@/services/api/chapters';
import { fetchVersions, createVersion } from '@/services/api/versions';
import WizardStepMeta from '@/components/dashboard/chapters/WizardStepMeta.vue';
import WizardStepImport from '@/components/dashboard/chapters/WizardStepImport.vue';
import WizardStepStructure from '@/components/dashboard/chapters/WizardStepStructure.vue';
import WizardStepReview from '@/components/dashboard/chapters/WizardStepReview.vue';
import '@/assets/styles/admin-theme.css';

const router = useRouter();
const { user, session } = useAuth();

// Wizard navigation
const currentStep = ref(1);
const steps = [
  { number: 1, label: 'Details' },
  { number: 2, label: 'Import' },
  { number: 3, label: 'Structure' },
  { number: 4, label: 'Review' },
];

// Step 1: Metadata
const meta = ref({
  title: '',
  description: '',
  slug: '',
  order_index: 0,
});

// Step 2-3: Parsed content
const sections = ref([]);
const references = ref([]);

// Step 4: Creation state
const creating = ref(false);
const createError = ref(null);
const createdChapter = ref(null);

// Refs for child component validation
const stepMetaRef = ref(null);

// Initialize order_index from existing chapter count
async function initOrderIndex() {
  try {
    const chapters = await fetchChapters();
    // Chapter 1 is local (not in DB), so DB chapters start at order 2
    const maxOrder = chapters.reduce((max, ch) => Math.max(max, ch.order_index), 1);
    meta.value.order_index = maxOrder + 1;
  } catch {
    meta.value.order_index = 3; // safe fallback
  }
}

initOrderIndex();

// Navigation
const canGoNext = computed(() => {
  switch (currentStep.value) {
    case 1: return meta.value.title.trim().length > 0;
    case 2: return sections.value.length > 0;
    case 3: return sections.value.length > 0;
    case 4: return !creating.value;
    default: return false;
  }
});

function nextStep() {
  if (currentStep.value < 4 && canGoNext.value) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function goToStep(step) {
  // Only allow going to steps that have been completed or current
  if (step <= currentStep.value) {
    currentStep.value = step;
  }
  // Allow going forward if requirements met
  if (step === 2 && meta.value.title.trim()) currentStep.value = 2;
  if (step === 3 && sections.value.length > 0) currentStep.value = 3;
  if (step === 4 && sections.value.length > 0) currentStep.value = 4;
}

// Handle parsed content from import step
function onContentParsed(result) {
  if (result.sections) {
    sections.value = result.sections;
  }
}

// Create chapter and all content
async function handleCreate() {
  creating.value = true;
  createError.value = null;

  try {
    // 1. Get or create a content version
    const versions = await fetchVersions();
    let contentVersionId;

    const draftVersion = versions.find(v => v.status === 'draft');
    if (draftVersion) {
      contentVersionId = draftVersion.id;
    } else {
      const newVersion = await createVersion({
        version_number: `v${versions.length + 1}.0`,
        release_notes: `Created for chapter: ${meta.value.title}`,
      }, user.value?.id);
      contentVersionId = newVersion.id;
    }

    // 2. Create the module (chapter)
    const chapter = await createChapter({
      title: meta.value.title,
      slug: meta.value.slug,
      order_index: meta.value.order_index,
      status: 'draft',
      content_version_id: contentVersionId,
      created_by: user.value?.id,
    });

    // 3. Create sections and paragraphs
    for (const section of sections.value) {
      const createdSection = await createSection({
        module_id: chapter.id,
        title: section.title,
        slug: section.slug,
        order_index: section.order_index,
      });

      // Create paragraphs in parallel for each section
      await Promise.all(
        section.paragraphs.map(para =>
          createParagraph({
            section_id: createdSection.id,
            content: para.content,
            content_text: para.content_text,
            order_index: para.order_index,
            is_subsection_header: para.is_subsection_header,
            subsection_level: para.subsection_level,
          })
        )
      );
    }

    // 4. Create references if any
    if (references.value.length > 0) {
      await Promise.all(
        references.value.map(ref =>
          createReference({
            module_id: chapter.id,
            number: ref.number,
            authors: ref.authors,
            title: ref.title,
            journal: ref.journal,
            year: ref.year,
            volume: ref.volume,
            pages: ref.pages,
            doi: ref.doi,
            url: ref.url,
            pub_type: ref.pub_type,
            raw_text: ref.raw_text,
          })
        )
      );
    }

    createdChapter.value = chapter;
  } catch (err) {
    createError.value = err.message || 'Failed to create chapter. Please try again.';
    console.error('Chapter creation error:', err);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="wizard-page admin-light">
    <!-- Top Bar -->
    <div class="wizard-topbar">
      <button class="back-btn" @click="router.push('/dashboard')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Dashboard
      </button>
      <h1 class="wizard-title">New Chapter</h1>
    </div>

    <!-- Step Indicator -->
    <div class="step-indicator">
      <div
        v-for="step in steps"
        :key="step.number"
        class="step-dot"
        :class="{
          active: currentStep === step.number,
          completed: currentStep > step.number,
          clickable: step.number <= currentStep
        }"
        @click="goToStep(step.number)"
      >
        <span class="dot-number" v-if="currentStep <= step.number">{{ step.number }}</span>
        <span class="dot-check" v-else>&#10003;</span>
        <span class="dot-label">{{ step.label }}</span>
      </div>
      <div class="step-line" />
    </div>

    <!-- Step Content -->
    <div class="wizard-content">
      <WizardStepMeta
        v-if="currentStep === 1"
        ref="stepMetaRef"
        v-model="meta"
        :existing-chapter-count="meta.order_index"
      />

      <WizardStepImport
        v-if="currentStep === 2"
        :sections="sections"
        :references="references"
        @update:sections="sections = $event"
        @update:references="references = $event"
        @parsed="onContentParsed"
      />

      <WizardStepStructure
        v-if="currentStep === 3"
        :sections="sections"
        :references="references"
        @update:sections="sections = $event"
        @update:references="references = $event"
      />

      <WizardStepReview
        v-if="currentStep === 4"
        :meta="meta"
        :sections="sections"
        :references="references"
        :creating="creating"
        :create-error="createError"
        :created-chapter="createdChapter"
        @create="handleCreate"
      />
    </div>

    <!-- Navigation Footer -->
    <div v-if="!createdChapter" class="wizard-footer">
      <button
        v-if="currentStep > 1"
        class="nav-btn secondary"
        @click="prevStep"
      >
        Back
      </button>
      <div class="footer-spacer" />
      <button
        v-if="currentStep < 4"
        class="nav-btn primary"
        :disabled="!canGoNext"
        @click="nextStep"
      >
        Continue
      </button>
    </div>
  </div>
</template>

<style scoped>
.wizard-page {
  min-height: 100vh;
  background: #f5f3f0;
  padding: 0 4rem 8rem;
  font-size: 10px;
}

/* Top Bar */
.wizard-topbar {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 2.4rem 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 3.2rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1.2rem;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: #9ca3af;
  color: #1a1a1a;
}

.wizard-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: flex-start;
  gap: 4rem;
  margin-bottom: 4rem;
  position: relative;
  padding: 0 2rem;
}

.step-line {
  position: absolute;
  top: 18px;
  left: 54px;
  right: 54px;
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}

.step-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  z-index: 1;
  cursor: default;
}

.step-dot.clickable {
  cursor: pointer;
}

.dot-number,
.dot-check {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.4rem;
  font-weight: 600;
  border: 2px solid #d1d5db;
  background: #f5f3f0;
  color: #9ca3af;
  transition: all 0.3s;
}

.step-dot.active .dot-number {
  border-color: rgb(151, 71, 255);
  color: rgb(151, 71, 255);
  background: rgba(151, 71, 255, 0.08);
}

.step-dot.completed .dot-check {
  border-color: #22c55e;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.dot-label {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.step-dot.active .dot-label {
  color: rgb(151, 71, 255);
}

.step-dot.completed .dot-label {
  color: #22c55e;
}

/* Content Area */
.wizard-content {
  min-height: 400px;
  padding: 0 2rem;
}

/* Footer Navigation */
.wizard-footer {
  display: flex;
  align-items: center;
  padding: 2.4rem 2rem;
  margin-top: 4rem;
  border-top: 1px solid #e5e7eb;
}

.footer-spacer {
  flex: 1;
}

.nav-btn {
  padding: 1.2rem 3.2rem;
  border-radius: 8px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.4rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn.primary {
  background: rgb(151, 71, 255);
  border: none;
  color: white;
}

.nav-btn.primary:hover:not(:disabled) {
  background: #1a1a1a;
  color: white;
}

.nav-btn.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn.secondary {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #4b5563;
}

.nav-btn.secondary:hover {
  border-color: #9ca3af;
  color: #1a1a1a;
}
</style>
