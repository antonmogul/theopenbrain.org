import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import FeedbackDialog from "../FeedbackDialog.vue";
import { useFeedback } from "@/composables/useFeedback";

const api = vi.hoisted(() => ({ request: vi.fn(), openAuth: vi.fn() }));
const user = ref(null);
vi.mock("@/services/api/client", () => ({ authedRequest: api.request }));
vi.mock("@/composables/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ openAuth: api.openAuth }),
}));
const modal = {
  props: ["modelValue"],
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
};
const wrappers = [];
const button = (wrapper, text) =>
  wrapper.findAll("button").find((el) => el.text() === text);
async function open() {
  const wrapper = mount(FeedbackDialog, {
    global: { stubs: { BaseModal: modal } },
  });
  wrappers.push(wrapper);
  useFeedback().openFeedback({ moduleId: "chapter-1", label: "The Retina" });
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue([]);
  user.value = { id: "student-1" };
  useFeedback().closeFeedback();
  useFeedback().setFeedbackContext(null);
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  useFeedback().closeFeedback();
});

describe("Reader feedback dialog (SEP24-31)", () => {
  it("sends a student's feedback with chapter context", async () => {
    const wrapper = await open();
    expect(wrapper.text()).toContain("About: The Retina");
    expect(button(wrapper, "Send").attributes("disabled")).toBeDefined();
    await wrapper.get("textarea").setValue("  This diagram helped  ");
    await button(wrapper, "Send").trigger("click");
    await flushPromises();
    expect(api.request).toHaveBeenCalledTimes(1);
    const [path, options] = api.request.mock.calls[0];
    expect(path).toBe("feedback");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({
      message: "This diagram helped",
      module_id: "chapter-1",
      kind: "general",
    });
    expect(wrapper.text()).toContain("Thank you");
  });

  it("preserves a failed message for retry and does not report success", async () => {
    api.request.mockRejectedValue(new Error("fetch failed"));
    const wrapper = await open();
    await wrapper.get("textarea").setValue("Please clarify this figure");
    await button(wrapper, "Send").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Check your connection and try again");
    expect(wrapper.text()).not.toContain("Thank you");
    expect(wrapper.get("textarea").element.value).toBe(
      "Please clarify this figure"
    );
  });

  it("requires sign-in before feedback is sent", async () => {
    user.value = null;
    const wrapper = await open();
    expect(wrapper.find("textarea").exists()).toBe(false);
    await button(wrapper, "Sign in").trigger("click");
    expect(api.openAuth).toHaveBeenCalledWith("login");
    expect(api.request).not.toHaveBeenCalled();
  });
});
