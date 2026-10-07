import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import ChatTab from "@/components/chapter/sidebar/ChatTab.vue";
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

describe.each([
  ["chapter chat tab", ChatTab],
  ["AI tutor sidebar", AITutorSidebar],
])("%s unavailable integration", (_label, component) => {
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
    expect(wrapper.find('[title="Delete conversation"]').exists()).toBe(false);
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
});

it("opens providerless previews without new history requests and stops them on return to history", async () => {
  chapterStore.text = {
    sections: [
      { title: "Loaded section", paragraphs: [{ text: "Exact source text." }] },
    ],
  };
  const synthesis = {
    getVoices: vi.fn(() => [
      { name: "Device voice", lang: "en", localService: true },
    ]),
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
  vi.stubGlobal("speechSynthesis", synthesis);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(text) {
        this.text = text;
      }
    }
  );
  const wrapper = mount(ChatTab, {
    props: { moduleId: "test-chapter" },
    global: { stubs: { Transition: false } },
  });
  await flushPromises();
  await wrapper.get(".preview-toggle").trigger("click");
  expect(wrapper.text()).toContain("Exact source text.");
  await wrapper
    .findAll("button")
    .find((node) => node.text() === "Read aloud")
    .trigger("click");
  await wrapper
    .findAll("button")
    .find((node) => node.text() === "Play")
    .trigger("click");
  expect(synthesis.speak).toHaveBeenCalledTimes(1);
  await wrapper.get('[title="Conversation history"]').trigger("click");
  expect(synthesis.cancel).toHaveBeenCalledTimes(1);
  expect(wrapper.find(".offline-preview").exists()).toBe(false);
  expect(wrapper.get(".history-panel").text()).toContain(
    "Saved chapter questions"
  );
  expect(database).toHaveBeenCalledTimes(3);
  expect(fetch).not.toHaveBeenCalled();
  wrapper.unmount();
});
