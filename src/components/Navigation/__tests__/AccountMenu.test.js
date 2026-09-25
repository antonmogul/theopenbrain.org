import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const auth = vi.hoisted(() => ({ state: null }));
const push = vi.hoisted(() => vi.fn());
const openAuth = vi.hoisted(() => vi.fn());

vi.mock("@/composables/useAuth", async () => {
  const { ref } = await import("vue");
  auth.state = {
    isAuthenticated: ref(false),
    user: ref(null),
    profile: ref(null),
    userRole: ref(null),
    signOut: vi.fn(async () => ({ error: null })),
  };
  return { useAuth: () => auth.state };
});
vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ openAuth }) }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

import AccountMenu from "../AccountMenu.vue";

const RouterLink = {
  props: ["to"],
  template: `<a :href="typeof to === 'string' ? to : to.path" v-bind="$attrs"><slot /></a>`,
};
const mountMenu = () =>
  mount(AccountMenu, {
    global: { stubs: { RouterLink } },
    attachTo: document.body,
  });

function signIn(role, name = "Maya Chen") {
  auth.state.isAuthenticated.value = true;
  auth.state.user.value = { email: "maya@example.com" };
  auth.state.profile.value = { full_name: name };
  auth.state.userRole.value = role;
}

beforeEach(() => {
  vi.clearAllMocks();
  if (auth.state) {
    auth.state.isAuthenticated.value = false;
    auth.state.user.value = null;
    auth.state.profile.value = null;
    auth.state.userRole.value = null;
    auth.state.signOut.mockResolvedValue({ error: null });
  }
});

describe("AccountMenu (OPENBRAIN-90)", () => {
  it("offers Sign in when signed out", async () => {
    const w = mountMenu();
    await w.find("button").trigger("click");
    expect(openAuth).toHaveBeenCalledWith("login");
    w.unmount();
  });

  it("shows initials, and a menu back to the user's own dashboard", async () => {
    signIn("student");
    const w = mountMenu();
    const btn = w.find(".account-btn");
    expect(btn.text()).toBe("MC");
    expect(btn.attributes("aria-expanded")).toBe("false");
    await btn.trigger("click");
    expect(btn.attributes("aria-expanded")).toBe("true");
    const items = w.findAll("[role=menuitem]").map((i) => i.text());
    expect(items).toEqual(["My dashboard", "Chapters", "Settings", "Log out"]);
    expect(w.find("a[href='/student']").exists()).toBe(true);
    w.unmount();
  });

  it("sends a creator to the creator dashboard", async () => {
    signIn("creator", "Stuart Trenholm");
    const w = mountMenu();
    await w.find(".account-btn").trigger("click");
    expect(w.find("a[href='/dashboard']").exists()).toBe(true);
    w.unmount();
  });

  it("logs out and goes home", async () => {
    signIn("student");
    const w = mountMenu();
    await w.find(".account-btn").trigger("click");
    await w.find(".account-logout").trigger("click");
    await flushPromises();
    expect(auth.state.signOut).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
    w.unmount();
  });

  it("says so when logging out fails, and stays signed in", async () => {
    signIn("student");
    auth.state.signOut.mockResolvedValue({ error: new Error("offline") });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = mountMenu();
    await w.find(".account-btn").trigger("click");
    await w.find(".account-logout").trigger("click");
    await flushPromises();
    expect(w.find("[role=alert]").text()).toMatch(/Couldn't log out/);
    expect(push).not.toHaveBeenCalled();
    errSpy.mockRestore();
    w.unmount();
  });

  it("closes on Escape and gives focus back to its button", async () => {
    signIn("student");
    const w = mountMenu();
    await w.find(".account-btn").trigger("click");
    await w.find(".account").trigger("keydown", { key: "Escape" });
    expect(w.find("[role=menu]").exists()).toBe(false);
    expect(document.activeElement).toBe(w.find(".account-btn").element);
    w.unmount();
  });
});
