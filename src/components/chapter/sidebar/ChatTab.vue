<script>
export default { name: "ChatTab" };
</script>

<script setup>
import { ref, onMounted } from "vue";
import { useAITutor } from "@/composables/useAITutor";
import { useText } from "@/stores";
import AITutorChat from "@/components/ai/AITutorChat.vue";

const props = defineProps({
  moduleId: {
    type: String,
    default: null,
  },
});

const {
  conversations,
  currentConversation,
  messages,
  loading,
  streaming,
  error,
  fetchConversations,
  createConversation,
  loadConversation,
  sendMessage,
  deleteConversation,
} = useAITutor();

const storeText = useText();
const showHistory = ref(false);
const deleteConfirmId = ref(null);

// Build a content context summary from the chapter text for the AI tutor
function buildContentContext() {
  const text = storeText.text;
  if (!text) return "";

  const parts = [];

  // Chapter title from intro
  if (text.intro && text.intro[0]?.title) {
    parts.push(`Chapter: ${text.intro[0].title}`);
  }

  // Extract section titles and key paragraph text
  const sectionKeys = Object.keys(text).filter((k) => k !== "intro");
  for (const key of sectionKeys) {
    const section = text[key];
    if (!Array.isArray(section)) continue;
    for (const item of section) {
      if (item.title) {
        let entry = `\n## ${item.title}`;
        // Get first paragraph text as summary
        if (item.paragraphs && item.paragraphs[0]?.text) {
          const firstPara = item.paragraphs[0].text;
          entry += `\n${firstPara.substring(0, 300)}`;
        }
        parts.push(entry);
      }
    }
  }

  return parts.join("\n");
}

onMounted(async () => {
  await fetchConversations(props.moduleId);

  const activeConversation = conversations.value.find(
    (c) => c.is_active && (!props.moduleId || c.module_id === props.moduleId)
  );

  if (activeConversation) {
    await loadConversation(activeConversation.id);
  }
});

async function handleNewConversation() {
  try {
    await createConversation({
      moduleId: props.moduleId,
      title: "AI Tutor Session",
      chapterTitle: storeText.text?.intro?.[0]?.title || "The Open Brain",
      contentContext: buildContentContext(),
    });
    showHistory.value = false;
  } catch (e) {
    console.error("ChatTab: Error creating conversation:", e);
  }
}

async function handleSelectConversation(conversationId) {
  try {
    await loadConversation(conversationId);
    showHistory.value = false;
  } catch (e) {
    console.error("ChatTab: Error loading conversation:", e);
  }
}

async function handleSendMessage(content) {
  try {
    if (!currentConversation.value) {
      await createConversation({
        moduleId: props.moduleId,
        title: "AI Tutor Session",
        chapterTitle: storeText.text?.intro?.[0]?.title || "The Open Brain",
        contentContext: buildContentContext(),
      });
    }
    await sendMessage(content);
  } catch (e) {
    console.error("ChatTab: Error sending message:", e);
  }
}

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
    console.error("ChatTab: Error deleting conversation:", e);
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 86400000) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (diff < 604800000) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
</script>

<template>
  <div class="chat-tab">
    <!-- In-tab header with History + New -->
    <div class="chat-header">
      <button
        @click="showHistory = !showHistory"
        class="header-btn"
        :class="{ active: showHistory }"
        title="Conversation history"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        History
      </button>
      <button
        @click="handleNewConversation"
        class="header-btn new-btn"
        title="New conversation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        New
      </button>
    </div>

    <!-- History panel -->
    <Transition name="dropdown">
      <div v-if="showHistory" class="history-panel">
        <div class="history-label">Recent Conversations</div>

        <div v-if="conversations.length === 0" class="history-empty">
          No previous conversations
        </div>

        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="history-item"
          :class="{ active: currentConversation?.id === conv.id }"
        >
          <div v-if="deleteConfirmId === conv.id" class="delete-confirm">
            <p>Delete this conversation?</p>
            <div class="confirm-actions">
              <button @click="cancelDelete" class="btn-sm secondary">Cancel</button>
              <button @click="executeDelete" class="btn-sm danger">Delete</button>
            </div>
          </div>

          <template v-else>
            <div class="item-content" @click="handleSelectConversation(conv.id)">
              <span class="item-title">{{ conv.title }}</span>
              <span class="item-date">{{ formatDate(conv.updated_at) }}</span>
            </div>
            <button
              @click.stop="confirmDelete(conv.id)"
              class="delete-btn"
              title="Delete conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
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
  </div>
</template>

<style scoped>
/* Chat tab chrome — matches prototype FloatingPanel chat header (tools.jsx):
   bracketed History/New buttons, hairline history list. Bubbles live in
   AITutorChat.vue. Token-driven. */
.chat-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--font-body);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border-bottom: 1px solid rgb(var(--color-line));
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.header-btn:hover {
  border-color: rgb(var(--color-ink));
}

.header-btn.active {
  background: rgb(var(--color-ink));
  border-color: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.new-btn {
  margin-left: auto;
}

/* History panel */
.history-panel {
  border-bottom: 1px solid rgb(var(--color-line));
  max-height: 250px;
  overflow-y: auto;
}

.history-label {
  padding: 10px 18px;
  font-family: var(--font-mono);
  font-size: 1rem;
  color: rgb(var(--color-mute));
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid rgb(var(--color-line));
}

.history-empty {
  padding: 16px;
  text-align: center;
  color: rgb(var(--color-mute));
  font-size: 1.3rem;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-bottom: 1px solid rgb(var(--color-line));
  cursor: pointer;
  transition: background 0.12s ease;
}

.history-item:hover { background: rgb(var(--color-ink) / 0.04); }
.history-item.active { background: rgb(var(--color-accent) / 0.08); }

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-title {
  font-size: 1.3rem;
  color: rgb(var(--color-ink));
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-date {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
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
  color: rgb(var(--color-mute));
  opacity: 0;
  transition: opacity 0.12s ease, color 0.12s ease;
}

.history-item:hover .delete-btn { opacity: 1; }
.delete-btn:hover { color: rgb(var(--color-accent)); }

.delete-confirm {
  width: 100%;
  text-align: center;
}

.delete-confirm p {
  margin: 0 0 6px 0;
  font-size: 1.3rem;
  color: rgb(var(--color-ink));
}

.confirm-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.btn-sm {
  padding: 4px 12px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 0.12s ease;
}

.btn-sm.secondary {
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-line));
}

.btn-sm.secondary:hover { background: rgb(var(--color-ink) / 0.05); }

.btn-sm.danger {
  background: rgb(var(--color-accent));
  color: #fff;
  border: none;
}

.btn-sm.danger:hover { background: rgb(var(--color-accent) / 0.85); }

/* Error banner */
.error-banner {
  padding: 8px 18px;
  background: rgb(var(--color-accent) / 0.08);
  border-bottom: 1px solid rgb(var(--color-accent) / 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.error-banner p {
  margin: 0;
  font-size: 1.3rem;
  color: rgb(var(--color-accent));
}

.dismiss-btn {
  padding: 3px 6px;
  background: none;
  border: none;
  color: rgb(var(--color-accent));
  font-size: 1.1rem;
  cursor: pointer;
  text-decoration: underline;
}

/* Chat area */
.chat-area {
  flex: 1;
  overflow: hidden;
}

/* Transitions */
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
