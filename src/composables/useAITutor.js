import { ref, computed } from "vue";
import { useAuth } from "./useAuth";

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// AI API config — Anthropic Claude
const AI_API_URL = "https://api.anthropic.com/v1/messages";
const AI_API_KEY =
  import.meta.env.VITE_ANTHROPIC_API_KEY ||
  import.meta.env.VITE_AI_API_KEY;

// Base system prompt template — chapter context gets appended at conversation creation
const BASE_SYSTEM_PROMPT = `You are the AI Tutor for The Open Brain.

RULES:
- You ONLY answer questions about the current chapter's content
- If asked about topics outside this chapter, say: "That's outside the scope of this chapter. I'm here to help you master the topics covered here — ask me anything about them!"
- Reference specific sections and concepts from the chapter
- Keep answers concise (2-3 paragraphs max)
- Use analogies related to everyday visual experiences
- Be encouraging and educational`;

export function useAITutor() {
  const conversations = ref([]);
  const currentConversation = ref(null);
  const messages = ref([]);
  const loading = ref(false);
  const streaming = ref(false);
  const error = ref(null);

  const { user, session } = useAuth();

  // Helper for Supabase REST API calls
  async function supabaseRest(endpoint, options = {}) {
    const accessToken = session.value?.access_token;
    if (!accessToken && options.method !== "GET") {
      throw new Error("No access token available");
    }

    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...restOptions,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken || supabaseKey}`,
        "Content-Type": "application/json",
        ...optionHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) return options.method === "POST" ? [] : { success: true };
    return JSON.parse(text);
  }

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

  // Create a new conversation
  async function createConversation(context = {}) {
    if (!user.value) {
      throw new Error("User not authenticated");
    }

    try {
      const conversationData = await supabaseRest("ai_conversations", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: user.value.id,
          module_id: context.moduleId || null,
          section_id: context.sectionId || null,
          paragraph_id: context.paragraphId || null,
          title: context.title || "AI Tutor Session",
          is_active: true,
        }),
      });

      const newConversation = Array.isArray(conversationData)
        ? conversationData[0]
        : conversationData;

      currentConversation.value = newConversation;
      messages.value = [];

      // Build system prompt with chapter context
      let systemPrompt = BASE_SYSTEM_PROMPT;
      if (context.chapterTitle) {
        systemPrompt += `\n\nCHAPTER: "${context.chapterTitle}"`;
      }
      if (context.contentContext) {
        systemPrompt += `\n\nCHAPTER CONTENT:\n${context.contentContext}`;
      }
      await addSystemMessage(systemPrompt);

      // Refresh conversations list
      await fetchConversations(context.moduleId);

      return newConversation;
    } catch (e) {
      console.error("useAITutor: Error creating conversation:", e);
      error.value = e.message;
      throw e;
    }
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

  // Add a system message
  async function addSystemMessage(content) {
    if (!currentConversation.value) {
      throw new Error("No active conversation");
    }

    try {
      const messageData = await supabaseRest("ai_messages", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          conversation_id: currentConversation.value.id,
          role: "system",
          content: content,
        }),
      });

      const newMessage = Array.isArray(messageData)
        ? messageData[0]
        : messageData;
      messages.value.push(newMessage);

      return newMessage;
    } catch (e) {
      console.error("useAITutor: Error adding system message:", e);
      throw e;
    }
  }

  // Send a user message and get AI response
  async function sendMessage(content) {
    if (!currentConversation.value) {
      throw new Error("No active conversation");
    }

    if (!user.value) {
      throw new Error("User not authenticated");
    }

    loading.value = true;
    error.value = null;

    try {
      // Save user message to database
      const userMessageData = await supabaseRest("ai_messages", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          conversation_id: currentConversation.value.id,
          role: "user",
          content: content,
        }),
      });

      const userMessage = Array.isArray(userMessageData)
        ? userMessageData[0]
        : userMessageData;
      messages.value.push(userMessage);

      // Call AI API
      streaming.value = true;
      const aiResponse = await callAIAPI(messages.value);
      streaming.value = false;

      // Save assistant message to database
      const assistantMessageData = await supabaseRest("ai_messages", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          conversation_id: currentConversation.value.id,
          role: "assistant",
          content: aiResponse.content,
          tokens_used: aiResponse.tokensUsed,
          model_used: aiResponse.model,
        }),
      });

      const assistantMessage = Array.isArray(assistantMessageData)
        ? assistantMessageData[0]
        : assistantMessageData;
      messages.value.push(assistantMessage);

      // Update conversation's updated_at timestamp
      await supabaseRest(
        `ai_conversations?id=eq.${currentConversation.value.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            updated_at: new Date().toISOString(),
          }),
        }
      );

      return assistantMessage;
    } catch (e) {
      console.error("useAITutor: Error sending message:", e);
      error.value = e.message;
      streaming.value = false;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Call the Anthropic Claude API
  async function callAIAPI(messageHistory) {
    if (!AI_API_KEY) {
      console.warn("useAITutor: No AI API key configured, using mock response");
      return {
        content:
          "I'm the AI Tutor for The Open Brain. To enable full AI responses, please configure the VITE_ANTHROPIC_API_KEY environment variable.",
        tokensUsed: 0,
        model: "mock",
      };
    }

    // Anthropic format: system prompt is separate, messages only contain user/assistant
    const systemMessages = messageHistory.filter((m) => m.role === "system");
    const systemPrompt = systemMessages.map((m) => m.content).join("\n\n");

    const apiMessages = messageHistory
      .filter((m) => m.role !== "system")
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    try {
      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": AI_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      return {
        content: data.content?.[0]?.text || "No response generated",
        tokensUsed:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        model: data.model || "claude-sonnet-4-20250514",
      };
    } catch (e) {
      console.error("useAITutor: AI API call failed:", e);
      throw e;
    }
  }

  // Delete a conversation
  async function deleteConversation(conversationId) {
    try {
      // Delete messages first (cascade might handle this, but be safe)
      await supabaseRest(`ai_messages?conversation_id=eq.${conversationId}`, {
        method: "DELETE",
      });

      // Delete conversation
      await supabaseRest(`ai_conversations?id=eq.${conversationId}`, {
        method: "DELETE",
      });

      // Remove from local state
      conversations.value = conversations.value.filter(
        (c) => c.id !== conversationId
      );

      // Clear current if it was the deleted one
      if (currentConversation.value?.id === conversationId) {
        currentConversation.value = null;
        messages.value = [];
      }
    } catch (e) {
      console.error("useAITutor: Error deleting conversation:", e);
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
    hasActiveConversation,
    messageCount,
    visibleMessages,

    // Methods
    fetchConversations,
    createConversation,
    loadConversation,
    addSystemMessage,
    sendMessage,
    deleteConversation,
    closeConversation,
  };
}
