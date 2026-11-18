// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChapterReaderFeedback from "../ChapterReaderFeedback.vue";
import { useFeedback } from "@/composables/useFeedback";
import { useAuthStore } from "@/stores/auth";
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/services/api/client", () => ({ authedRequest: api.request }));
const wrappers = [];
function form(props = {}) {
  const wrapper = mount(ChapterReaderFeedback, {
    props: { moduleId: "m1", isAuthenticated: true, ...props },
  });
  wrappers.push(wrapper);
  return wrapper;
}
async function submit(wrapper, message = "Please clarify this diagram") {
  await wrapper.get("textarea").setValue(message);
  await wrapper.get("form").trigger("submit");
  await flushPromises();
}
beforeEach(() => {
  setActivePinia(createPinia());
  api.request.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe("end-of-chapter reader feedback", () => {
  it.each(["content", "usability", "design", "bug", "idea", "other"])(
    "sends %s with explicit chapter context and page",
    async (kind) => {
      useFeedback().openFeedback({
        moduleId: "another-chapter",
        sectionId: "s2",
      });
      const wrapper = form();
      expect(wrapper.findAll("option").map((option) => option.text())).toEqual([
        "Content",
        "Usability",
        "Design",
        "Bug",
        "Idea",
        "Other",
      ]);
      await wrapper.get("select").setValue(kind);
      await submit(wrapper, "  A useful chapter  ");
      expect(api.request).toHaveBeenCalledTimes(1);
      expect(api.request.mock.calls[0][0]).toBe("feedback");
      expect(JSON.parse(api.request.mock.calls[0][1].body)).toEqual({
        kind,
        message: "A useful chapter",
        module_id: "m1",
        section_id: null,
        page: window.location.pathname,
      });
      expect(wrapper.get('[role="status"]').text()).toContain("has been sent");
      expect(wrapper.find("form").exists()).toBe(false);
      useFeedback().closeFeedback();
    }
  );
  it("rejects empty messages and locks submission while a request is pending", async () => {
    let resolve;
    api.request.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const wrapper = form();
    await wrapper.get("textarea").setValue("  ");
    await wrapper.get("form").trigger("submit");
    expect(api.request).not.toHaveBeenCalled();
    await wrapper.get("textarea").setValue("Hello");
    await wrapper.get("form").trigger("submit");
    await wrapper.get("form").trigger("submit");
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(wrapper.get("textarea").attributes("disabled")).toBeDefined();
    resolve([]);
    await flushPromises();
  });
  it("preserves the draft and category after a failed send, then retries", async () => {
    api.request.mockRejectedValueOnce(new Error("fetch failed"));
    const wrapper = form();
    await wrapper.get("select").setValue("design");
    await submit(wrapper);
    expect(wrapper.get('[role="alert"]').text()).toContain("Please try again");
    expect(wrapper.get("textarea").element.value).toBe(
      "Please clarify this diagram"
    );
    expect(wrapper.get("select").element.value).toBe("design");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("has been sent");
  });
  it("opens sign-in and carries on with the same message once authenticated", async () => {
    const wrapper = form({ isAuthenticated: false });
    await wrapper.get("select").setValue("usability");
    await submit(wrapper);
    expect(useAuthStore().activeAuth).toBe(true);
    expect(useAuthStore().authView).toBe("login");
    expect(api.request).not.toHaveBeenCalled();
    await wrapper.setProps({ isAuthenticated: true });
    useAuthStore().closeAuth();
    await flushPromises();
    expect(JSON.parse(api.request.mock.calls[0][1].body)).toMatchObject({
      kind: "usability",
      message: "Please clarify this diagram",
    });
  });
  it("retains a cancelled sign-in draft without sending it on a later login", async () => {
    const wrapper = form({ isAuthenticated: false });
    await submit(wrapper);
    useAuthStore().closeAuth();
    await flushPromises();
    await wrapper.setProps({ isAuthenticated: true });
    expect(api.request).not.toHaveBeenCalled();
    expect(wrapper.get("textarea").element.value).toContain("clarify");
  });
  it("clears a pending sign-in when changing chapters and ignores an old request result", async () => {
    const wrapper = form({ isAuthenticated: false });
    await submit(wrapper);
    await wrapper.setProps({ moduleId: "m2", isAuthenticated: true });
    expect(api.request).not.toHaveBeenCalled();
    let resolve;
    api.request.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    await wrapper.get("textarea").setValue("Chapter two");
    await wrapper.get("form").trigger("submit");
    await wrapper.setProps({ moduleId: "m3" });
    resolve([]);
    await flushPromises();
    expect(wrapper.get("textarea").element.value).toBe("");
    expect(wrapper.text()).not.toContain("has been sent");
  });
});
