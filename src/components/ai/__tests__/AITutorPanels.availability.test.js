import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import AITutorSidebar from "../AITutorSidebar.vue";
import AITutorChat from "../AITutorChat.vue";

const { database, auth, chapterStore } = vi.hoisted(() => ({
  database: vi.fn(),
  chapterStore: { text: null },
  auth: { user: null },
}));
vi.mock("@/services/api/client", () => ({ authedRequest: database }));
vi.mock("@/composables/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/stores", () => ({ useText: () => chapterStore }));

const savedConversation = {
  id: "saved-conversation",
  module_id: "test-chapter",
  title: "Saved chapter questions",
  is_active: true,
};
const savedMessages = [
  { id: "answer", role: "assistant", content: "A saved answer" },
];

beforeEach(() => {
  chapterStore.text = null;
  auth.user = ref({ id: "test-user" });
  database.mockReset();
  database.mockImplementation((query, options) => {
    if (options?.method)
      throw new Error("Unexpected database mutation in isolated test");
    return Promise.resolve(
      query.startsWith("ai_messages?") ? savedMessages : [savedConversation]
    );
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network call");
    })
  );
});

afterEach(() => vi.unstubAllGlobals());

describe.each([["AI tutor sidebar", AITutorSidebar]])(
  "%s unavailable integration",
  (_label, component) => {
    it("disables New/Send, suppresses generation events and retains history viewing", async () => {
      const wrapper = mount(component, {
        props: { moduleId: "test-chapter" },
        global: { stubs: { Teleport: true, Transition: false } },
      });
      await flushPromises();
      expect(wrapper.get('[role="status"]').text()).toContain(
        "AI chat unavailable"
      );
      expect(wrapper.text()).toContain("A saved answer");
      const newButton = wrapper.get('[aria-label="New conversation"]');
      expect(newButton.element.disabled).toBe(true);
      expect(wrapper.get('[aria-label="Send message"]').element.disabled).toBe(
        true
      );
      await newButton.trigger("click");
      wrapper.getComponent(AITutorChat).vm.$emit("send", "Must not be saved");
      await flushPromises();
      // Mount read the conversation list, the current conversation and messages.
      expect(database).toHaveBeenCalledTimes(3);
      expect(wrapper.find(".typing-indicator").exists()).toBe(false);
      await wrapper.get('[title="Conversation history"]').trigger("click");
      expect(wrapper.get(".history-panel").text()).toContain(
        "Saved chapter questions"
      );
      expect(wrapper.find('[title="Delete conversation"]').exists()).toBe(
        false
      );
      await wrapper.get(".item-content").trigger("click");
      await flushPromises();
      expect(database).toHaveBeenCalledTimes(5);
      expect(wrapper.text()).toContain("A saved answer");
      expect(
        database.mock.calls.every(([, options]) => options === undefined)
      ).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
      wrapper.unmount();
    });
  }
);
