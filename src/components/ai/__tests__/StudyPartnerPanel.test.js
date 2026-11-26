import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createPinia } from "pinia";
import ChatTab from "@/components/chapter/sidebar/ChatTab.vue";
import StudyPartnerPanel from "../StudyPartnerPanel.vue";
const state = vi.hoisted(() => ({ api: null }));
vi.mock("@/composables/useStudyPartner", () => ({
  useStudyPartner: () => state.api,
}));
beforeEach(() => {
  state.api = {
    user: ref({ id: "reader" }),
    messages: ref([]),
    conversations: ref([]),
    busy: ref(false),
    error: ref(""),
    opening: vi.fn(),
    send: vi.fn(),
    load: vi.fn(),
    cancel: vi.fn(),
    startNew: vi.fn(),
  };
});
const options = { global: { plugins: [createPinia()] } };
describe("Study partner reader integration", () => {
  it("opens for signed-in readers and routes chips through the authenticated composable", async () => {
    state.api.messages.value = [
      {
        role: "assistant",
        text: "Hello",
        tools: [{ name: "suggest_actions", input: { actions: ["Test me"] } }],
      },
    ];
    const wrapper = mount(ChatTab, options);
    await flushPromises();
    expect(state.api.opening).toHaveBeenCalledOnce();
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Test me"))
      .trigger("click");
    expect(state.api.send).toHaveBeenCalledWith("Test me");
    wrapper.unmount();
  });
  it("shows a sign-in prompt without opening a conversation anonymously", () => {
    state.api.user.value = null;
    const wrapper = mount(ChatTab, options);
    expect(wrapper.text()).toContain("Sign in");
    expect(state.api.opening).not.toHaveBeenCalled();
    expect(wrapper.find("textarea").exists()).toBe(false);
    wrapper.unmount();
  });
  it("does not reveal quiz explanations before a choice and keeps failed drafts", async () => {
    const wrapper = mount(StudyPartnerPanel, {
      ...options,
      props: {
        signedIn: true,
        messages: [
          {
            role: "assistant",
            tools: [
              {
                name: "show_quiz",
                input: {
                  questions: [
                    {
                      question: "Which?",
                      options: ["A", "B", "C", "D"],
                      correctIndex: 0,
                      explanation: "A is supported.",
                      sourceParagraphId: "p",
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    });
    expect(wrapper.find(".sp-reveal").exists()).toBe(false);
    await wrapper.find("fieldset button").trigger("click");
    expect(wrapper.find(".sp-reveal").text()).toContain("A is supported.");
    await wrapper.get("textarea").setValue("Keep my question");
    await wrapper.setProps({ busy: true });
    await wrapper.setProps({ busy: false, error: "Connection failed" });
    expect(wrapper.get("textarea").element.value).toBe("Keep my question");
    wrapper.unmount();
  });
});

it("constructs cross-chapter citations from supplied book metadata", () => {
  const wrapper = mount(StudyPartnerPanel, {
    ...options,
    props: {
      signedIn: true,
      messages: [
        {
          role: "assistant",
          text: "A cited answer.",
          citations: [
            {
              id: "paragraph-id",
              chapter: "foundations-of-neuroscience",
              number: 1,
              title: "History",
            },
          ],
        },
      ],
    },
  });
  expect(wrapper.get(".sp-sources a").attributes("href")).toBe(
    "/chapter/1/foundations-of-neuroscience#paragraph-id"
  );
  wrapper.unmount();
});
