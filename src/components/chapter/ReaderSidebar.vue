<script setup>
import { ref, onMounted } from "vue";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import { useDraggablePanel } from "@/composables/useDraggablePanel";
import { useAuth } from "@/composables/useAuth";
import InfoTab from "./sidebar/InfoTab.vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";
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

// Floating-panel drag: the handle scopes dragging to the grip only, so tabs
// and content stay clickable. Position persists + clamps (brief §6.7).
const panelRef = ref(null);
const handleRef = ref(null);
const { x: panelX, y: panelY } = useDraggablePanel(panelRef, handleRef, {
  storageKey: "ob.toolkitPos",
  width: 380,
  height: 620,
  margin: 16,
});

const tabs = [
  { key: "info", label: "Info" },
  { key: "notebook", label: "Notebook" },
  { key: "chat", label: "Chat" },
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
    <Transition name="panel">
      <aside
        v-if="isOpen"
        ref="panelRef"
        class="toolkit-panel"
        data-testid="reader-sidebar"
        :style="{ left: `${panelX}px`, top: `${panelY}px` }"
      >
        <!-- Drag handle + tab bar -->
        <div class="tab-bar">
          <div ref="handleRef" class="drag-handle" title="Drag to move">
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
              <circle cx="2" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
              <circle cx="2" cy="7" r="1" /><circle cx="8" cy="7" r="1" />
              <circle cx="2" cy="11" r="1" /><circle cx="8" cy="11" r="1" />
            </svg>
          </div>
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="setTab(tab.key)"
          >
            {{ tab.label }}
          </button>

          <button class="close-btn" @click="close" title="Close toolkit">
            <CloseIcon :width="16" :height="16" />
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
/* Floating draggable panel — matches prototype FloatingPanel (tools.jsx):
   380×620, paper, radius 10, soft shadow, no backdrop. Positioned via inline
   left/top from useDraggablePanel. */
.toolkit-panel {
  position: fixed;
  z-index: 190;
  width: 380px;
  height: 620px;
  max-height: calc(100vh - 3.2rem);
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-ink) / 0.85);
  border-radius: 10px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: rgb(var(--color-ink));
}

/* Tab bar (also the drag region via the grip handle) */
.tab-bar {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper));
  flex-shrink: 0;
}

.drag-handle {
  display: flex;
  align-items: center;
  padding: 0 10px;
  cursor: grab;
  color: rgb(var(--color-mute) / 0.6);
  border-right: 1px solid rgb(var(--color-line));
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.tab-btn {
  flex: 1;
  padding: 12px 8px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.tab-btn:hover {
  color: rgb(var(--color-ink));
}

.tab-btn.active {
  color: rgb(var(--color-ink));
  border-bottom-color: rgb(var(--color-ink));
}

.close-btn {
  width: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-mute));
  transition: color 0.12s ease, background 0.12s ease;
  flex-shrink: 0;
  border-left: 1px solid rgb(var(--color-line));
}

.close-btn:hover {
  color: rgb(var(--color-ink));
  background: rgb(var(--color-ink) / 0.05);
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
  padding: 1.2rem 1.6rem 1.6rem;
}

.demos-divider {
  height: 1px;
  background: rgb(var(--color-line));
  margin-bottom: 0.75rem;
}

.demos-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
  margin-bottom: 1rem;
}

.demos-loading {
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
  text-align: center;
  padding: 0.8rem 0;
}

.demos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.demo-btn {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  background: transparent;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.demo-btn:hover {
  border-color: rgb(var(--color-ink));
}

.demo-btn svg {
  flex-shrink: 0;
  color: rgb(var(--color-mute));
}

.demo-btn:hover svg {
  color: rgb(var(--color-ink));
}

/* Panel entrance — scale-up fade, no backdrop (brief §6.5 modal feel) */
.panel-enter-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .panel-enter-active,
  .panel-leave-active {
    transition: opacity 0.12s ease;
  }
  .panel-enter-from,
  .panel-leave-to {
    transform: none;
  }
}
</style>
