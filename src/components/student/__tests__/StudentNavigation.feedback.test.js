import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import DashboardShell from "@/components/dashboard/shared/DashboardShell.vue";

const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
const push = vi.hoisted(() => vi.fn());
vi.mock("@/composables/useAuth", () => ({ useAuth: () => auth }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

const wrappers = [];
function openShell(role) {
  const wrapper = mount(DashboardShell, {
    props: {
      navItems: [],
      activeSection: "dashboard",
      role,
      backTo: "/chapters",
      backLabel: "Back to book",
    },
    global: {
      stubs: {
        RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.signOut.mockResolvedValue({ error: null });
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

describe("Dashboard escape routes (SEP24-30/32/35)", () => {
  it.each(["Student", "Creator"])(
    "%s can return to the book or log out from the visible rail",
    async (role) => {
      const wrapper = openShell(role);
      expect(wrapper.get('a[href="/chapters"]').text()).toContain(
        "Back to book"
      );
      await wrapper.get(".rail-logout").trigger("click");
      await flushPromises();
      expect(auth.signOut).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/");
    }
  );

  it("still leaves after a server sign-out error when the local sign-out completes", async () => {
    auth.signOut.mockResolvedValue({ error: { message: "offline" } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const wrapper = openShell("Student");
    await wrapper.get(".rail-logout").trigger("click");
    await flushPromises();
    expect(push).toHaveBeenCalledWith("/");
  });
});
