/*
 * DashboardShell / DashboardRail behaviour settings relies on (OPENBRAIN-126):
 * the accent follows a prop that arrives after mount (settings reads the role
 * from the loaded profile), and a rail without a role shows the email as
 * typed instead of in caps.
 */
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DashboardShell from "../DashboardShell.vue";

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const NAV = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
];
const mountShell = (props = {}) =>
  mount(DashboardShell, {
    props: { navItems: NAV, activeSection: "profile", ...props },
    global: { stubs: { "router-link": { template: "<a><slot /></a>" } } },
  });

describe("DashboardShell", () => {
  it("sets no data-accent for magenta, the :root default", () => {
    const w = mountShell();
    expect(w.find(".shell").attributes("data-accent")).toBeUndefined();
  });

  it("updates data-accent when the accent prop changes after mount", async () => {
    const w = mountShell({ accent: "magenta" });
    await w.setProps({ accent: "teal" });
    expect(w.find(".shell").attributes("data-accent")).toBe("teal");
    await w.setProps({ accent: "amber" });
    expect(w.find(".shell").attributes("data-accent")).toBe("amber");
  });

  it("shows the role in caps, or the email as typed when there is no role", () => {
    const withRole = mountShell({ role: "Student", email: "a@b.test" });
    const meta = withRole.find(".rail-meta");
    expect(meta.text()).toBe("STUDENT");
    expect(meta.classes()).not.toContain("rail-meta--email");

    const noRole = mountShell({ email: "reader@openbrain.test" });
    const email = noRole.find(".rail-meta");
    expect(email.text()).toBe("reader@openbrain.test");
    expect(email.classes()).toContain("rail-meta--email");
  });

  it("hides the rail's Log out when showLogout is false", () => {
    expect(mountShell().text()).toContain("Log out");
    expect(mountShell({ showLogout: false }).text()).not.toContain("Log out");
  });
});
