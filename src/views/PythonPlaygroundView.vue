<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import CodeEditor from "@/components/lab/CodeEditor.vue";
import CodeOutput from "@/components/lab/CodeOutput.vue";
import { demoCategories } from "@/data/playgroundDemos";

const router = useRouter();
const categories = demoCategories;

// Selection state
const activeCategoryId = ref(categories[0].id);
const activeDemoId = ref(categories[0].demos[0].id);
const userCode = ref(categories[0].demos[0].code);

// Execution state
const executionResult = ref(null);
const executing = ref(false);
const booting = ref(false);
const pyodideReady = ref(false);

// Upload state
const uploadedData = ref(null);
const uploadedFileName = ref("");

const activeDemo = computed(() => {
  for (const cat of categories) {
    const found = cat.demos.find((d) => d.id === activeDemoId.value);
    if (found) return found;
  }
  return null;
});

const isDirty = computed(() => activeDemo.value && userCode.value !== activeDemo.value.code);

function selectDemo(categoryId, demoId) {
  activeCategoryId.value = categoryId;
  activeDemoId.value = demoId;
  const demo = categories
    .find((c) => c.id === categoryId)
    ?.demos.find((d) => d.id === demoId);
  if (demo) {
    userCode.value = demo.code;
    executionResult.value = null;
  }
}

function resetCode() {
  if (activeDemo.value) {
    userCode.value = activeDemo.value.code;
    executionResult.value = null;
  }
}

async function runCode() {
  if (!userCode.value.trim() || executing.value) return;
  executing.value = true;
  executionResult.value = null;
  try {
    const svc = await import("@/services/pythonRunner");
    if (!pyodideReady.value) {
      booting.value = true;
      await svc.initPyodide();
      pyodideReady.value = true;
      booting.value = false;
    }
    const options = {};
    if (uploadedData.value) {
      options.globals = { uploaded_data: uploadedData.value };
    }
    executionResult.value = await svc.runPython(userCode.value, [], options);
  } catch (err) {
    executionResult.value = {
      output: "",
      error: err?.message || String(err),
      plots: [],
      testResults: [],
      passed: false,
    };
  } finally {
    executing.value = false;
    booting.value = false;
  }
}

function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedData.value = e.target.result;
    uploadedFileName.value = file.name;
  };
  reader.readAsText(file);
}

function clearUpload() {
  uploadedData.value = null;
  uploadedFileName.value = "";
}

function goHome() {
  router.push("/");
}
</script>

<template>
  <div class="playground min-h-screen bg-gray-950 text-gray-100">
    <!-- Header -->
    <header class="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-20">
      <div class="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <button
            @click="goHome"
            class="p-2 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
            title="Home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          <div class="min-w-0">
            <h1 class="text-lg font-semibold text-white flex items-center gap-2">
              Python Playground
              <span class="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                Pyodide · runs in your browser
              </span>
            </h1>
            <p class="text-sm text-gray-400 truncate">
              Real CPython (NumPy + Matplotlib) compiled to WebAssembly — no server, no install.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 flex-shrink-0">
          <span v-if="pyodideReady" class="hidden s:flex items-center gap-1.5 text-xs text-green-400">
            <span class="w-2 h-2 rounded-full bg-green-400"></span> runtime ready
          </span>
          <button
            @click="resetCode"
            :disabled="executing || !isDirty"
            class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors disabled:opacity-40"
          >
            Reset
          </button>
          <button
            @click="runCode"
            :disabled="executing || !userCode.trim()"
            class="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg v-if="!executing" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg v-else class="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ executing ? "Running…" : "Run" }}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-[1400px] mx-auto p-4 grid grid-cols-1 m:grid-cols-[260px_1fr] l:grid-cols-[260px_1fr_1fr] gap-4">
      <!-- Sidebar: demo gallery -->
      <aside class="space-y-5">
        <div v-for="cat in categories" :key="cat.id">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
            {{ cat.title }}
          </h2>
          <div class="space-y-1">
            <button
              v-for="demo in cat.demos"
              :key="demo.id"
              @click="selectDemo(cat.id, demo.id)"
              class="w-full text-left px-3 py-2 rounded-lg transition-colors border"
              :class="
                demo.id === activeDemoId
                  ? 'bg-violet-500/15 border-violet-500/40 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800/60'
              "
            >
              <span class="block text-sm font-medium">{{ demo.title }}</span>
              <span class="block text-xs text-gray-500">{{ demo.difficulty }}</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Editor column -->
      <section class="min-w-0 space-y-4">
        <!-- Demo description -->
        <div v-if="activeDemo" class="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <div class="flex items-start justify-between gap-3 mb-2">
            <h3 class="text-base font-semibold text-white">{{ activeDemo.title }}</h3>
            <div class="flex flex-wrap gap-1.5 justify-end">
              <span v-for="tag in activeDemo.tags" :key="tag"
                class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                {{ tag }}
              </span>
            </div>
          </div>
          <p class="text-sm text-gray-400 leading-relaxed">{{ activeDemo.description }}</p>
        </div>

        <!-- Upload panel (only for upload demos) -->
        <div
          v-if="activeDemo?.requiresUpload"
          class="bg-gray-900 rounded-lg p-4 border border-dashed border-violet-500/40"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-white mb-0.5">Upload a CSV file</p>
              <p class="text-xs text-gray-500 truncate">
                <template v-if="uploadedFileName">
                  Loaded <span class="text-violet-300">{{ uploadedFileName }}</span> — hit Run.
                </template>
                <template v-else>
                  No file yet — Run uses a bundled sample signal.
                </template>
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <label class="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer transition-colors">
                Choose file
                <input type="file" accept=".csv,text/csv,text/plain" class="hidden" @change="handleFile" />
              </label>
              <button
                v-if="uploadedFileName"
                @click="clearUpload"
                class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <CodeEditor v-model="userCode" language="python" min-height="440px" :readonly="executing" />
      </section>

      <!-- Output column -->
      <section class="min-w-0 space-y-3">
        <!-- First-run boot notice -->
        <div
          v-if="booting"
          class="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 flex items-center gap-3"
        >
          <svg class="animate-spin h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p class="text-sm text-violet-200">
            Downloading the Python runtime (~10&nbsp;MB, first run only). This is cached afterwards.
          </p>
        </div>

        <CodeOutput :result="executionResult" :loading="executing && !booting" />

        <p class="text-xs text-gray-600 px-1">
          Everything runs locally in a sandboxed WebAssembly interpreter — your code and any
          uploaded data never leave the browser.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.playground {
  font-family: "IBM Plex Sans", sans-serif;
}
</style>
