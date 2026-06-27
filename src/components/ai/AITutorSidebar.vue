<script setup>
import { ref, onMounted } from "vue";
import { useAITutor } from "@/composables/useAITutor";
import AITutorChat from "./AITutorChat.vue";
import { chatTimestamp as formatDate } from "@/utils/format";
import CloseIcon from "@/icons/custom/CloseIcon.vue";

const props = defineProps({
  moduleId: {
    type: String,
    default: null,
  },
  sectionId: {
    type: String,
    default: null,
  },
  contentContext: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close"]);

const {
  conversations,
  currentConversation,
  messages,
  loading,
  streaming,
  error,
  visibleMessages,
  fetchConversations,
  createConversation,
  loadConversation,
  sendMessage,
  deleteConversation,
} = useAITutor();

const showHistory = ref(false);
const deleteConfirmId = ref(null);

// Load conversations on mount
onMounted(async () => {
  await fetchConversations(props.moduleId);

  // Find and load most recent active conversation for this module
  const activeConversation = conversations.value.find(
    (c) => c.is_active && (!props.moduleId || c.module_id === props.moduleId)
  );

  if (activeConversation) {
    await loadConversation(activeConversation.id);
  }
});

// Handle creating a new conversation
async function handleNewConversation() {
  try {
    await createConversation({
      moduleId: props.moduleId,
      sectionId: props.sectionId,
      title: "AI Tutor Session",
      contentContext: props.contentContext,
    });
    showHistory.value = false;
  } catch (e) {
    console.error("AITutorSidebar: Error creating conversation:", e);
  }
}

// Handle selecting a conversation from history
async function handleSelectConversation(conversationId) {
  try {
    await loadConversation(conversationId);
    showHistory.value = false;
  } catch (e) {
    console.error("AITutorSidebar: Error loading conversation:", e);
  }
}

// Handle sending a message
async function handleSendMessage(content) {
  try {
    // If no current conversation, create one first
    if (!currentConversation.value) {
      await createConversation({
        moduleId: props.moduleId,
        sectionId: props.sectionId,
        title: "AI Tutor Session",
        contentContext: props.contentContext,
      });
    }

    await sendMessage(content);
  } catch (e) {
    console.error("AITutorSidebar: Error sending message:", e);
  }
}

// Handle deleting a conversation
function confirmDelete(conversationId) {
  deleteConfirmId.value = conversationId;
}

function cancelDelete() {
  deleteConfirmId.value = null;
}

async function executeDelete() {
  if (!deleteConfirmId.value) return;

  try {
    await deleteConversation(deleteConfirmId.value);
    deleteConfirmId.value = null;
    await fetchConversations(props.moduleId);
  } catch (e) {
    console.error("AITutorSidebar: Error deleting conversation:", e);
  }
}

// Format date for history list
</script>

<template>
  <Teleport to="body">
    <Transition name="sidebar">
      <aside class="ai-sidebar" data-testid="ai-tutor-sidebar">
        <!-- Header -->
        <div class="sidebar-header">
          <div class="header-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="robot-icon"
            >
              <rect x="3" y="11" width="18" height="10" rx="2"></rect>
              <circle cx="12" cy="5" r="2"></circle>
              <path d="M12 7v4"></path>
              <line x1="8" y1="16" x2="8" y2="16"></line>
              <line x1="16" y1="16" x2="16" y2="16"></line>
            </svg>
            <h2>AI Tutor</h2>
          </div>

          <div class="header-actions">
            <!-- History toggle -->
            <button
              @click="showHistory = !showHistory"
              class="icon-btn"
              :class="{ active: showHistory }"
              title="Conversation history"
              data-testid="history-toggle"
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
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </button>

            <!-- New conversation -->
            <button
              @click="handleNewConversation"
              class="icon-btn"
              title="New conversation"
              data-testid="new-conversation"
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
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            <!-- Close -->
            <button
              @click="$emit('close')"
              class="icon-btn"
              title="Close"
              data-testid="close-sidebar"
            >
              <CloseIcon :width="20" :height="20" />
            </button>
          </div>
        </div>

        <!-- History panel -->
        <Transition name="dropdown">
          <div v-if="showHistory" class="history-panel">
            <div class="history-header">
              <span>Recent Conversations</span>
            </div>

            <div
              v-if="conversations.length === 0"
              class="history-empty"
            >
              No previous conversations
            </div>

            <div
              v-for="conv in conversations"
              :key="conv.id"
              class="history-item"
              :class="{ active: currentConversation?.id === conv.id }"
            >
              <!-- Delete confirmation -->
              <div v-if="deleteConfirmId === conv.id" class="delete-confirm">
                <p>Delete this conversation?</p>
                <div class="confirm-actions">
                  <button @click="cancelDelete" class="btn-secondary">
                    Cancel
                  </button>
                  <button @click="executeDelete" class="btn-danger">
                    Delete
                  </button>
                </div>
              </div>

              <!-- Normal item view -->
              <template v-else>
                <div
                  class="item-content"
                  @click="handleSelectConversation(conv.id)"
                >
                  <span class="item-title">{{ conv.title }}</span>
                  <span class="item-date">{{ formatDate(conv.updated_at) }}</span>
                </div>
                <button
                  @click.stop="confirmDelete(conv.id)"
                  class="delete-btn"
                  title="Delete conversation"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    ></path>
                  </svg>
                </button>
              </template>
            </div>
          </div>
        </Transition>

        <!-- Error display -->
        <div v-if="error" class="error-banner">
          <p>{{ error }}</p>
          <button @click="error = null" class="dismiss-btn">Dismiss</button>
        </div>

        <!-- Chat area -->
        <div class="chat-area">
          <AITutorChat
            :messages="messages"
            :loading="loading"
            :streaming="streaming"
            @send="handleSendMessage"
          />
        </div>
      </aside>
    </Transition>

    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="true"
        class="sidebar-backdrop"
        @click="$emit('close')"
      ></div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 400px;
  max-width: 100vw;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

/* Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.header-title h2 {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.robot-icon {
  opacity: 0.9;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.icon-btn.active {
  background: rgba(255, 255, 255, 0.25);
}

/* History panel */
.history-panel {
  border-bottom: 1px solid #e5e7eb;
  max-height: 300px;
  overflow-y: auto;
  background: #f9fafb;
}

.history-header {
  padding: 0.75rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;
}

.history-empty {
  padding: 1.5rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
}

.history-item:hover {
  background: #f3f4f6;
}

.history-item.active {
  background: #ede9fe;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.item-title {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  opacity: 0;
  transition: all 0.15s;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #fef2f2;
  color: #ef4444;
}

/* Delete confirmation */
.delete-confirm {
  width: 100%;
  text-align: center;
}

.delete-confirm p {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #374151;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.btn-secondary,
.btn-danger {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Error banner */
.error-banner {
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.error-banner p {
  margin: 0;
  font-size: 0.875rem;
  color: #dc2626;
}

.dismiss-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: #dc2626;
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
}

/* Chat area */
.chat-area {
  flex: 1;
  overflow: hidden;
}

/* Transitions */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
