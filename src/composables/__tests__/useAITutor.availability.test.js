import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useAITutor } from "../useAITutor";
import { AI_TUTOR_AVAILABILITY } from "@/helper/aiTutorAvailability";

const { database, auth } = vi.hoisted(() => ({
  database: vi.fn(),
  auth: { user: null },
}));
vi.mock("@/services/api/client", () => ({ authedRequest: database }));
vi.mock("@/composables/useAuth", () => ({ useAuth: () => auth }));

const savedConversation = {
  id: "saved-conversation",
  user_id: "test-user",
  module_id: "test-chapter",
  title: "Saved chapter questions",
};
const savedMessages = [
  { id: "system", role: "system", content: "Historical chapter context" },
  { id: "question", role: "user", content: "A saved question" },
  { id: "answer", role: "assistant", content: "A saved answer" },
];

beforeEach(() => {
  database.mockReset();
  auth.user = ref({ id: "test-user" });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network call in isolated test");
    })
  );
  // Dummy legacy config must never enable browser-side generation.
  vi.stubEnv("VITE_ANTHROPIC_API_KEY", "dummy-not-a-real-key");
  vi.stubEnv("VITE_AI_API_KEY", "dummy-not-a-real-key");
  vi.stubEnv("VITE_AI_API_URL", "https://example.invalid/ai");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AI Tutor config-disabled contract", () => {
  it("reports a fixed, honest unavailable state despite legacy browser config", () => {
    const tutor = useAITutor();
    expect(tutor.isAvailable.value).toBe(false);
    expect(tutor.availabilityMessage.value).toMatch(/secure server connection/);
    expect(Object.isFrozen(AI_TUTOR_AVAILABILITY)).toBe(true);
    expect(tutor.loading.value).toBe(false);
    expect(tutor.streaming.value).toBe(false);
    expect(database).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      "createConversation",
      { moduleId: "test-chapter", contentContext: "Chapter text" },
    ],
    ["addSystemMessage", "Chapter context"],
    ["sendMessage", "A new question"],
    ["deleteConversation", "saved-conversation"],
  ])(
    "rejects %s before writes or local history changes, including repeated attempts",
    async (method, argument) => {
      const tutor = useAITutor();
      tutor.currentConversation.value = { ...savedConversation };
      tutor.messages.value = savedMessages.map((message) => ({ ...message }));
      tutor.conversations.value = [{ ...savedConversation }];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        await expect(tutor[method](argument)).rejects.toMatchObject({
          code: "AI_TUTOR_UNAVAILABLE",
          message: AI_TUTOR_AVAILABILITY.message,
        });
      }

      expect(tutor.error.value).toBe(AI_TUTOR_AVAILABILITY.message);
      expect(tutor.messages.value).toEqual(savedMessages);
      expect(tutor.currentConversation.value).toEqual(savedConversation);
      expect(tutor.conversations.value).toEqual([savedConversation]);
      expect(tutor.loading.value).toBe(false);
      expect(tutor.streaming.value).toBe(false);
      expect(database).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it("rejects a send without creating a conversation or a mock assistant message", async () => {
    const tutor = useAITutor();
    await expect(tutor.sendMessage("A question")).rejects.toMatchObject({
      code: "AI_TUTOR_UNAVAILABLE",
    });
    expect(tutor.currentConversation.value).toBeNull();
    expect(tutor.messages.value).toEqual([]);
    expect(database).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves saved conversation viewing and local closing with read-only calls", async () => {
    database.mockImplementation((query, options) => {
      expect(options).toBeUndefined();
      return Promise.resolve(
        query.startsWith("ai_messages?") ? savedMessages : [savedConversation]
      );
    });
    const tutor = useAITutor();
    await tutor.fetchConversations("test-chapter");
    await tutor.loadConversation("saved-conversation");
    expect(tutor.conversations.value).toEqual([savedConversation]);
    expect(tutor.visibleMessages.value).toEqual(savedMessages.slice(1));
    expect(tutor.messageCount.value).toBe(2);
    expect(tutor.hasActiveConversation.value).toBe(true);
    tutor.closeConversation();
    expect(tutor.currentConversation.value).toBeNull();
    expect(tutor.messages.value).toEqual([]);
    expect(database).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fetch history for an anonymous reader", async () => {
    auth.user.value = null;
    const tutor = useAITutor();
    await tutor.fetchConversations("test-chapter");
    await expect(tutor.createConversation()).rejects.toMatchObject({
      code: "AI_TUTOR_UNAVAILABLE",
    });
    expect(database).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
