<script setup>
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  streaming: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["send"]);

const inputMessage = ref("");
const chatContainer = ref(null);

// Auto-scroll to bottom when messages change
watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  }
);

// Handle sending message
function handleSend() {
  const content = inputMessage.value.trim();
  if (!content || props.loading) return;

  emit("send", content);
  inputMessage.value = "";
}

// Handle keydown for Enter to send
function handleKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

// Format timestamp
function formatTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Filter out system messages for display
function getVisibleMessages() {
  return props.messages.filter((m) => m.role !== "system");
}
</script>

<template>
  <div class="ai-chat" data-testid="ai-tutor-chat">
    <!-- Messages area -->
    <div ref="chatContainer" class="messages-container">
      <!-- Empty state -->
      <div
        v-if="getVisibleMessages().length === 0 && !streaming"
        class="empty-state"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          ></path>
        </svg>
        <p class="empty-title">Ask me anything!</p>
        <p class="empty-text">
          I'm here to help you understand the neuroscience content.
        </p>
      </div>

      <!-- Messages list -->
      <div
        v-for="message in getVisibleMessages()"
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <div class="message-bubble">
          <p class="message-content">{{ message.content }}</p>
          <span class="message-time">{{ formatTime(message.created_at) }}</span>
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="streaming" class="message assistant">
        <div class="message-bubble typing">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="input-container">
      <textarea
        v-model="inputMessage"
        class="message-input"
        placeholder="Type your question..."
        rows="2"
        :disabled="loading"
        @keydown="handleKeydown"
        data-testid="ai-chat-input"
      ></textarea>
      <button
        class="send-btn"
        :disabled="loading || !inputMessage.trim()"
        @click="handleSend"
        data-testid="ai-send-btn"
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
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: rgb(var(--color-mute));
  padding: 32px;
}

.empty-state svg {
  color: rgb(var(--color-mute) / 0.6);
  margin-bottom: 16px;
}

.empty-title {
  font-family: var(--font-body);
  font-size: 1.6rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
  margin: 0 0 4px 0;
}

.empty-text {
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
  margin: 0;
}

.message {
  display: flex;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 14px;
  position: relative;
}

/* User: ink bubble, tail bottom-right (prototype). */
.message.user .message-bubble {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border-bottom-right-radius: 4px;
}

/* Assistant: paper bubble, serif body, tail bottom-left. */
.message.assistant .message-bubble {
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  border-bottom-left-radius: 4px;
}

.message-content {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message.assistant .message-content {
  font-family: var(--font-body);
}

.message-time {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  margin-top: 6px;
  opacity: 0.6;
}

.message.user .message-time {
  text-align: right;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: rgb(var(--color-mute));
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Input area */
.input-container {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper));
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 1.35rem;
  resize: none;
  transition: border-color 0.12s ease;
}

.message-input:focus {
  outline: none;
  border-color: rgb(var(--color-ink));
}

.message-input:disabled {
  background: rgb(var(--color-bg));
  cursor: not-allowed;
}

/* Send: magenta accent circle (prototype). */
.send-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgb(var(--color-accent));
  color: #fff;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease;
  flex-shrink: 0;
}

.send-btn:hover {
  background: rgb(var(--color-accent) / 0.85);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-btn:hover:not(:disabled) {
  background: #7c3aed;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
