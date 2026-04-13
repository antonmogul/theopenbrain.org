<script setup>
import { ref, computed, onMounted } from "vue";
import { useCodeLabs } from "@/composables/useCodeLabs";
import CodeEditor from "@/components/lab/CodeEditor.vue";
import CodeOutput from "@/components/lab/CodeOutput.vue";
import TestResults from "@/components/lab/TestResults.vue";

const props = defineProps({
  labId: { type: String, required: true },
});

const emit = defineEmits(["close"]);

const {
  currentLab,
  userCode,
  executionResult,
  loading,
  executing,
  error,
  hasTestCases,
  passedAllTests,
  bestScore,
  loadLab,
  executeCode,
  resetCode,
  showSolution,
} = useCodeLabs();

const showingSolution = ref(false);
const activeTab = ref("output");

onMounted(async () => {
  if (props.labId) {
    await loadLab(props.labId);
  }
});

async function handleRun() {
  await executeCode();
  if (hasTestCases.value && executionResult.value?.testResults?.length > 0) {
    activeTab.value = "tests";
  }
}

function handleReset() {
  if (confirm("Reset code to starter code? Your changes will be lost.")) {
    resetCode();
    showingSolution.value = false;
  }
}

function handleShowSolution() {
  const solution = showSolution();
  if (solution) {
    showingSolution.value = true;
    userCode.value = solution;
  }
}

const failedTestCount = computed(() => {
  if (!executionResult.value?.testResults) return 0;
  return executionResult.value.testResults.filter((t) => !t.passed).length;
});
</script>

<template>
  <div class="lab-panel">
    <!-- Loading -->
    <div v-if="loading" class="state-center">
      <div class="spinner"></div>
      <p>Loading lab...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="state-center">
      <p class="error-text">{{ error }}</p>
      <button @click="emit('close')" class="action-btn">Close</button>
    </div>

    <!-- Lab content -->
    <div v-else class="lab-content">
      <!-- Toolbar -->
      <div class="lab-toolbar">
        <div class="toolbar-left">
          <h3 class="lab-title">{{ currentLab?.title || "Lab" }}</h3>
          <span v-if="currentLab?.difficulty" class="difficulty-badge">{{ currentLab.difficulty }}</span>
        </div>
        <div class="toolbar-right">
          <span
            v-if="bestScore !== null"
            class="best-score"
            :class="bestScore >= 100 ? 'perfect' : ''"
          >
            Best: {{ bestScore }}%
          </span>
          <button @click="handleReset" :disabled="executing" class="action-btn secondary">Reset</button>
          <button
            v-if="currentLab?.show_solution"
            @click="handleShowSolution"
            :disabled="executing || showingSolution"
            class="action-btn secondary"
          >
            Solution
          </button>
          <button
            @click="handleRun"
            :disabled="executing || !userCode.trim()"
            class="action-btn run"
          >
            {{ executing ? "Running..." : "Run" }}
          </button>
        </div>
      </div>

      <!-- Instructions -->
      <div v-if="currentLab?.instructions" class="instructions">
        <p>{{ currentLab.instructions }}</p>
      </div>

      <!-- Solution warning -->
      <div v-if="showingSolution" class="solution-warning">
        Viewing solution code. Click "Reset" to return to your code.
      </div>

      <!-- Editor + Output -->
      <div class="lab-grid">
        <div class="editor-col">
          <CodeEditor
            v-model="userCode"
            language="python"
            min-height="320px"
            :readonly="executing"
          />
        </div>

        <div class="output-col">
          <div v-if="hasTestCases" class="output-tabs">
            <button
              @click="activeTab = 'output'"
              class="tab-btn"
              :class="{ active: activeTab === 'output' }"
            >
              Output
            </button>
            <button
              @click="activeTab = 'tests'"
              class="tab-btn"
              :class="{ active: activeTab === 'tests' }"
            >
              Tests
              <span v-if="executionResult?.testResults && failedTestCount > 0" class="badge fail">{{ failedTestCount }}</span>
              <span v-else-if="executionResult?.testResults && passedAllTests" class="badge pass">&#10003;</span>
            </button>
          </div>

          <CodeOutput
            v-if="activeTab === 'output' || !hasTestCases"
            :result="executionResult"
            :loading="executing"
          />

          <TestResults
            v-else-if="activeTab === 'tests' && executionResult?.testResults"
            :results="executionResult.testResults"
            :passed="passedAllTests"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lab-panel {
  min-height: 400px;
  background: #111827;
  border-radius: 8px;
  color: #e5e7eb;
  margin: -32px;
  padding: 24px;
  font-size: 16px;
}

.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 1rem;
  color: #9ca3af;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #374151;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-text {
  color: #f87171;
  font-weight: 500;
}

/* Toolbar */
.lab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lab-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.difficulty-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: #374151;
  color: #9ca3af;
  border-radius: 4px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.best-score {
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: rgba(234, 179, 8, 0.15);
  color: #fbbf24;
}

.best-score.perfect {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

/* Buttons */
.action-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.action-btn.secondary {
  background: #1f2937;
  color: #d1d5db;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #374151;
}

.action-btn.run {
  background: #16a34a;
  color: white;
}

.action-btn.run:hover:not(:disabled) {
  background: #15803d;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Instructions */
.instructions {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.instructions p {
  margin: 0;
  font-size: 0.9375rem;
  color: #d1d5db;
  white-space: pre-line;
  line-height: 1.5;
}

.solution-warning {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #fbbf24;
}

/* Grid */
.lab-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .lab-grid {
    grid-template-columns: 1fr;
  }
}

/* Output tabs */
.output-tabs {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
}

.tab-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: white;
  background: #1f2937;
}

.badge {
  font-size: 0.6875rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  font-weight: 600;
}

.badge.fail {
  background: #dc2626;
  color: white;
}

.badge.pass {
  background: #16a34a;
  color: white;
}
</style>
