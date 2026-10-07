import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

describe("useAuthStore.openAuth", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("opens on the login form, since every caller is a Sign in button", () => {
    const store = useAuthStore();
    store.openAuth();
    expect(store.activeAuth).toBe(true);
    expect(store.authView).toBe("login");
  });

  it("can still open straight on Register", () => {
    const store = useAuthStore();
    store.openAuth("register");
    expect(store.authView).toBe("register");
  });
});
