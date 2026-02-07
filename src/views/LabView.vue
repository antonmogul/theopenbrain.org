<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCodeLabs } from "@/composables/useCodeLabs";
import { useAuth } from "@/composables/useAuth";
import CodeEditor from "@/components/lab/CodeEditor.vue";
import CodeOutput from "@/components/lab/CodeOutput.vue";
import TestResults from "@/components/lab/TestResults.vue";

const route = useRoute();
const router = useRouter();

const { isAuthenticated } = useAuth();

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

// UI State
const showingSolution = ref(false);
const activeTab = ref("output"); // 'output' or 'tests'

// Load lab on mount
onMounted(async () => {
  const labId = route.params.labId;
  if (labId) {
    await loadLab(labId);
  }
});

// Handler functions
async function handleRun() {
  await executeCode();
  // Switch to tests tab if there are test results
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

function goBack() {
  router.back();
}

// Computed for test badge count
const failedTestCount = computed(() => {
  if (!executionResult.value?.testResults) return 0;
  return executionResult.value.testResults.filter((t) => !t.passed).length;
});
</script>

<template>
  <div class="lab-view min-h-screen bg-gray-950 text-gray-100">
    <!-- Header -->
    <header class="lab-header bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <!-- Back button -->
          <button
            @click="goBack"
            class="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            data-testid="lab-back-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>

          <!-- Title -->
          <div>
            <h1 class="text-lg font-semibold text-white">
              {{ currentLab?.title || "Loading..." }}
            </h1>
            <p v-if="currentLab?.difficulty" class="text-sm text-gray-400">
              {{ currentLab.difficulty }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Best score badge -->
          <div
            v-if="bestScore !== null"
            class="px-3 py-1 rounded-full text-sm font-medium"
            :class="
              bestScore >= 100
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            "
            data-testid="best-score"
          >
            Best: {{ bestScore }}%
          </div>

          <!-- Reset button -->
          <button
            @click="handleReset"
            :disabled="executing"
            class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
            data-testid="reset-btn"
          >
            Reset
          </button>

          <!-- Solution button -->
          <button
            v-if="currentLab?.show_solution"
            @click="handleShowSolution"
            :disabled="executing || showingSolution"
            class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
            data-testid="solution-btn"
          >
            Solution
          </button>

          <!-- Run button -->
          <button
            @click="handleRun"
            :disabled="executing || !userCode.trim()"
            class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            data-testid="run-btn"
          >
            <svg
              v-if="!executing"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg
              v-else
              class="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
            {{ executing ? "Running..." : "Run" }}
          </button>
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center h-[calc(100vh-64px)]">
      <div class="text-center">
        <svg
          class="animate-spin h-8 w-8 mx-auto mb-4 text-violet-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        <p class="text-gray-400">Loading lab...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-[calc(100vh-64px)]">
      <div class="text-center max-w-md p-8">
        <p class="text-xl font-bold mb-4 text-red-400">Error loading lab</p>
        <p class="text-gray-400 mb-4">{{ error }}</p>
        <button
          @click="goBack"
          class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
        >
          Go Back
        </button>
      </div>
    </div>

    <!-- Main content -->
    <main v-else class="max-w-7xl mx-auto p-6">
      <!-- Instructions -->
      <div
        v-if="currentLab?.instructions"
        class="instructions bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800"
      >
        <h2 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-violet-400"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Instructions
        </h2>
        <p class="text-gray-300 whitespace-pre-line">{{ currentLab.instructions }}</p>
      </div>

      <!-- Solution warning banner -->
      <div
        v-if="showingSolution"
        class="solution-warning bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex items-center gap-3"
        data-testid="solution-warning"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-yellow-400 flex-shrink-0"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <p class="text-yellow-300 text-sm">
          Viewing solution code. Click "Reset" to return to your code.
        </p>
      </div>

      <!-- Two column layout -->
      <div class="grid lg:grid-cols-2 gap-6">
        <!-- Left: Code Editor -->
        <div class="editor-column">
          <CodeEditor
            v-model="userCode"
            language="python"
            min-height="400px"
            :readonly="executing"
          />
        </div>

        <!-- Right: Output/Tests -->
        <div class="output-column">
          <!-- Tab bar (only if has test cases) -->
          <div v-if="hasTestCases" class="tab-bar flex gap-2 mb-4">
            <button
              @click="activeTab = 'output'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="
                activeTab === 'output'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              "
              data-testid="tab-output"
            >
              Output
            </button>
            <button
              @click="activeTab = 'tests'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              :class="
                activeTab === 'tests'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              "
              data-testid="tab-tests"
            >
              Tests
              <span
                v-if="executionResult?.testResults && failedTestCount > 0"
                class="px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white"
              >
                {{ failedTestCount }}
              </span>
              <span
                v-else-if="executionResult?.testResults && passedAllTests"
                class="px-1.5 py-0.5 rounded-full text-xs bg-green-500 text-white"
              >
                ✓
              </span>
            </button>
          </div>

          <!-- Output view -->
          <CodeOutput
            v-if="activeTab === 'output' || !hasTestCases"
            :result="executionResult"
            :loading="executing"
          />

          <!-- Tests view -->
          <TestResults
            v-else-if="activeTab === 'tests' && executionResult?.testResults"
            :results="executionResult.testResults"
            :passed="passedAllTests"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.lab-view {
  font-family: "IBM Plex Sans", sans-serif;
}
</style>
