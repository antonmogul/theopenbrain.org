import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import AITutorChat from "../AITutorChat.vue";

const question = "Explain this chapter";

describe("AI chat availability", () => {
  it("defaults to unavailable with disabled input and an honest status", async () => {
    const wrapper = mount(AITutorChat);
    expect(wrapper.get('[role="status"]').text()).toContain(
      "AI chat unavailable"
    );
    expect(wrapper.text()).toContain("secure server connection");
    expect(wrapper.text()).not.toContain("Ask me anything");
    expect(wrapper.get("textarea").element.disabled).toBe(true);
    expect(wrapper.get('[aria-label="Send message"]').element.disabled).toBe(
      true
    );
    await wrapper.get("textarea").setValue(question);
    await wrapper.get("textarea").trigger("keydown", { key: "Enter" });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("send")).toBeUndefined();
    wrapper.unmount();
  });

  it("shows saved messages while unavailable and never shows a typing indicator", () => {
    const wrapper = mount(AITutorChat, {
      props: {
        loading: true,
        streaming: true,
        messages: [
          { id: "1", role: "system", content: "Hidden system context" },
          { id: "2", role: "assistant", content: "A saved response" },
        ],
      },
    });
    expect(wrapper.text()).toContain("A saved response");
    expect(wrapper.text()).not.toContain("Hidden system context");
    expect(wrapper.find(".typing-indicator").exists()).toBe(false);
    expect(wrapper.get("textarea").element.disabled).toBe(true);
    wrapper.unmount();
  });

  it("preserves an unsent draft if availability is withdrawn", async () => {
    const wrapper = mount(AITutorChat, { props: { available: true } });
    await wrapper.get("textarea").setValue(question);
    await wrapper.setProps({ available: false });
    await wrapper.get("textarea").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("send")).toBeUndefined();
    expect(wrapper.get("textarea").element.value).toBe(question);
    wrapper.unmount();
  });

  it("emits only with explicit availability, trims content and clears the sent draft", async () => {
    // Presentational fixture only; this does not enable a backend.
    const wrapper = mount(AITutorChat, { props: { available: true } });
    expect(wrapper.text()).toContain("Ask about this chapter");
    await wrapper.get("textarea").setValue(`  ${question}  `);
    await wrapper.get("textarea").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("send")).toEqual([[question]]);
    expect(wrapper.get("textarea").element.value).toBe("");
    wrapper.unmount();
  });

  it.each(["loading", "streaming"])(
    "blocks repeated sending while %s",
    async (state) => {
      const wrapper = mount(AITutorChat, { props: { available: true } });
      await wrapper.get("textarea").setValue(question);
      await wrapper.setProps({ [state]: true });
      await wrapper.get("textarea").trigger("keydown", { key: "Enter" });
      expect(wrapper.get("button").element.disabled).toBe(true);
      expect(wrapper.emitted("send")).toBeUndefined();
      wrapper.unmount();
    }
  );
});
