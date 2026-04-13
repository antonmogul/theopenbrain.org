<script setup>
import { ref, onMounted } from "vue";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import { useAuth } from "@/composables/useAuth";
import InfoTab from "./sidebar/InfoTab.vue";
import NotebookTab from "./sidebar/NotebookTab.vue";
import ChatTab from "./sidebar/ChatTab.vue";

import DemoModal from "./demos/DemoModal.vue";
import QuizPanel from "./demos/QuizPanel.vue";
import FlashcardPanel from "./demos/FlashcardPanel.vue";
import LabPanel from "./demos/LabPanel.vue";
import ConeExplorerPanel from "./demos/ConeExplorerPanel.vue";

const props = defineProps({
  moduleId: {
    type: String,
    default: null,
  },
  isAuthenticated: {
    type: Boolean,
    default: false,
  },
});

const { isOpen, activeTab, close, setTab } = useReaderSidebar();
const { session } = useAuth();

const tabs = [
  { key: "info", label: "Info", icon: "ℹ" },
  { key: "notebook", label: "Notebook", icon: "📓" },
  { key: "chat", label: "Chat", icon: "💬" },
];

// --- Demos state ---
const activeDemo = ref(null); // null | { type: 'quiz'|'flashcards'|'lab', id?, title? }
const demoItems = ref({ quizzes: [], labs: [] });
const demosLoading = ref(false);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchDemoItems() {
  if (!props.moduleId || !supabaseUrl) return;
  demosLoading.value = true;

  const accessToken = session.value?.access_token || supabaseKey;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const [quizRes, labRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/quizzes?module_id=eq.${props.moduleId}&select=id,title&limit=3`,
        { headers }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/code_labs?module_id=eq.${props.moduleId}&select=id,title&order=order_index`,
        { headers }
      ),
    ]);

    if (quizRes.ok) {
      demoItems.value.quizzes = await quizRes.json();
    }
    if (labRes.ok) {
      demoItems.value.labs = await labRes.json();
    }
  } catch (e) {
    console.error("ReaderSidebar: Error fetching demo items:", e);
  } finally {
    demosLoading.value = false;
  }
}

onMounted(() => {
  if (props.isAuthenticated && props.moduleId) {
    fetchDemoItems();
  }
});

function openDemo(type, id, title) {
  activeDemo.value = { type, id, title };
}

function closeDemo() {
  activeDemo.value = null;
}

// Computed-like helpers for template
function demoModalTitle() {
  if (!activeDemo.value) return "";
  switch (activeDemo.value.type) {
    case "quiz": return activeDemo.value.title || "Quiz";
    case "flashcards": return "Flashcards";
    case "lab": return activeDemo.value.title || "Code Lab";
    case "explorer": return "Cone Spectral Sensitivity Explorer";
    default: return "Demo";
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <aside
        v-if="isOpen"
        class="reader-sidebar"
        data-testid="reader-sidebar"
      >
        <!-- Tab bar -->
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="setTab(tab.key)"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>

          <button class="close-btn" @click="close" title="Close sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Tab content with KeepAlive for ChatTab -->
        <div class="tab-content">
          <KeepAlive include="ChatTab">
            <InfoTab v-if="activeTab === 'info'" />
            <NotebookTab
              v-else-if="activeTab === 'notebook'"
              :module-id="moduleId"
            />
            <ChatTab
              v-else-if="activeTab === 'chat'"
              :module-id="moduleId"
            />
          </KeepAlive>
        </div>

        <!-- Demos section (only for authenticated users with a module) -->
        <div
          v-if="isAuthenticated && moduleId"
          class="demos-section"
          data-testid="demos-section"
        >
          <div class="demos-divider"></div>
          <span class="demos-label">DEMOS</span>

          <div v-if="demosLoading" class="demos-loading">Loading...</div>

          <div v-else class="demos-grid">
            <!-- Quiz button -->
            <button
              v-if="demoItems.quizzes.length > 0"
              class="demo-btn"
              @click="openDemo('quiz', demoItems.quizzes[0].id, demoItems.quizzes[0].title)"
              title="Take a quiz"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Quiz</span>
            </button>

            <!-- Flashcards button -->
            <button
              class="demo-btn"
              @click="openDemo('flashcards', moduleId, 'Flashcards')"
              title="Study flashcards"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="M7 8h10"></path>
                <path d="M7 12h4"></path>
              </svg>
              <span>Flashcards</span>
            </button>

            <!-- Lab buttons -->
            <button
              v-for="lab in demoItems.labs"
              :key="lab.id"
              class="demo-btn"
              @click="openDemo('lab', lab.id, lab.title)"
              :title="lab.title"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>{{ lab.title || 'Code Lab' }}</span>
            </button>

            <!-- Cone Explorer button (always visible) -->
            <button
              class="demo-btn"
              @click="openDemo('explorer', null, 'Cone Spectral Sensitivity')"
              title="Explore cone spectral sensitivity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Explorer</span>
            </button>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>

  <!-- Demo Modal -->
  <DemoModal
    :show="!!activeDemo"
    :title="demoModalTitle()"
    @close="closeDemo"
  >
    <QuizPanel
      v-if="activeDemo?.type === 'quiz'"
      :quiz-id="activeDemo.id"
      @close="closeDemo"
    />
    <FlashcardPanel
      v-if="activeDemo?.type === 'flashcards'"
      :module-id="activeDemo.id"
      @close="closeDemo"
    />
    <LabPanel
      v-if="activeDemo?.type === 'lab'"
      :lab-id="activeDemo.id"
      @close="closeDemo"
    />
    <ConeExplorerPanel
      v-if="activeDemo?.type === 'explorer'"
      @close="closeDemo"
    />
  </DemoModal>
</template>

<script>
export default {
  name: "ReaderSidebar",
};
</script>

<style scoped>
.reader-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 400px;
  max-width: 100vw;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

/* Tab bar */
.tab-bar {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 8px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #374151;
  background: #f9fafb;
}

.tab-btn.active {
  color: #7c3aed;
  border-bottom-color: #7c3aed;
}

.tab-icon {
  font-size: 15px;
}

.tab-label {
  font-family: "IBM Plex Sans", sans-serif;
}

.close-btn {
  width: 40px;
  height: 100%;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: all 0.15s;
  flex-shrink: 0;
  border-left: 1px solid #f3f4f6;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

/* Tab content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Demos section */
.demos-section {
  flex-shrink: 0;
  padding: 0.75rem 1rem 1rem;
}

.demos-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 0.75rem;
}

.demos-label {
  display: block;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #9ca3af;
  margin-bottom: 0.625rem;
}

.demos-loading {
  font-size: 0.8125rem;
  color: #9ca3af;
  text-align: center;
  padding: 0.5rem 0;
}

.demos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.demo-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.demo-btn:hover {
  background: #f3f4f6;
  border-color: #7c3aed;
  color: #7c3aed;
}

.demo-btn svg {
  flex-shrink: 0;
  color: #6b7280;
}

.demo-btn:hover svg {
  color: #7c3aed;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
