import { ref, computed } from "vue";
import { useAuth } from "./useAuth";
import { authedRequest as supabaseRest } from "@/services/api/client";

import { AI_TUTOR_AVAILABILITY } from "@/helper/aiTutorAvailability";

export function useAITutor() {
  const conversations = ref([]);
  const currentConversation = ref(null);
  const messages = ref([]);
  const loading = ref(false);
  const streaming = ref(false);
  const error = ref(null);

  const { user } = useAuth();

  // Fetch all conversations for a module
  async function fetchConversations(moduleId = null) {
    if (!user.value) {
      conversations.value = [];
      return;
    }

    try {
      let query = `ai_conversations?user_id=eq.${user.value.id}&select=*&order=updated_at.desc`;

      if (moduleId) {
        query += `&module_id=eq.${moduleId}`;
      }

      const data = await supabaseRest(query);
      conversations.value = data || [];
    } catch (e) {
      console.error("useAITutor: Error fetching conversations:", e);
      error.value = e.message;
      conversations.value = [];
    }
  }

  // Generation and all conversation mutations stay disabled until a secure
  // server-side integration is approved. Reject before network calls, local
  // history changes or loading indicators; never persist a mock AI response.
  async function rejectUnavailableMutation() {
    const unavailable = new Error(AI_TUTOR_AVAILABILITY.message);
    unavailable.code = AI_TUTOR_AVAILABILITY.code;
    error.value = unavailable.message;
    throw unavailable;
  }

  // Load an existing conversation with messages
  async function loadConversation(conversationId) {
    if (!user.value) {
      throw new Error("User not authenticated");
    }

    try {
      // Get conversation
      const conversationData = await supabaseRest(
        `ai_conversations?id=eq.${conversationId}&select=*`
      );

      if (!conversationData || conversationData.length === 0) {
        throw new Error("Conversation not found");
      }

      currentConversation.value = conversationData[0];

      // Get messages
      const messagesData = await supabaseRest(
        `ai_messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc`
      );

      messages.value = messagesData || [];
    } catch (e) {
      console.error("useAITutor: Error loading conversation:", e);
      error.value = e.message;
      throw e;
    }
  }

  // Close current conversation (without deleting)
  function closeConversation() {
    currentConversation.value = null;
    messages.value = [];
  }

  // Computed properties
  const isAvailable = computed(() => AI_TUTOR_AVAILABILITY.available);
  const availabilityMessage = computed(() => AI_TUTOR_AVAILABILITY.message);
  const hasActiveConversation = computed(
    () => currentConversation.value !== null
  );

  const messageCount = computed(
    () => messages.value.filter((m) => m.role !== "system").length
  );

  const visibleMessages = computed(() =>
    messages.value.filter((m) => m.role !== "system")
  );

  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading,
    streaming,
    error,

    // Computed
    isAvailable,
    availabilityMessage,
    hasActiveConversation,
    messageCount,
    visibleMessages,

    // Methods
    fetchConversations,
    createConversation: rejectUnavailableMutation,
    loadConversation,
    addSystemMessage: rejectUnavailableMutation,
    sendMessage: rejectUnavailableMutation,
    deleteConversation: rejectUnavailableMutation,
    closeConversation,
  };
}
