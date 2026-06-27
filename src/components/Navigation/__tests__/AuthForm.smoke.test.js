import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

// Mock the auth boundary so the form's submit handlers don't hit the network.
const signIn = vi.fn(() => Promise.resolve({ error: null }));
const signUp = vi.fn(() => Promise.resolve({ error: null }));
const resetPassword = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/composables/useAuth", () => ({
    useAuth: () => ({ signIn, signUp, resetPassword }),
}));

import AuthForm from "@/components/Navigation/AuthForm.vue";

function mountForm(props = {}) {
    return mount(AuthForm, { props });
}

describe("AuthForm (render smoke)", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        signIn.mockClear();
        signUp.mockClear();
        resetPassword.mockClear();
    });

    it("renders the login view (drawer variant)", () => {
        const w = mountForm({ view: "login", variant: "drawer" });
        expect(w.find('input[type="email"]').exists()).toBe(true);
        expect(w.find('input[type="password"]').exists()).toBe(true);
        // login has one password field, no confirm
        expect(w.findAll('input[type="password"]')).toHaveLength(1);
        expect(w.text()).toContain("Login");
    });

    it("renders the register view with a confirm field (panel variant)", () => {
        const w = mountForm({ view: "register", variant: "panel" });
        expect(w.findAll('input[type="password"]')).toHaveLength(2);
        expect(w.text()).toContain("Create Account");
    });

    it("renders the forgot view", () => {
        const w = mountForm({ view: "forgot", variant: "drawer" });
        expect(w.find('input[type="email"]').exists()).toBe(true);
        expect(w.findAll('input[type="password"]')).toHaveLength(0);
    });

    it("calls signIn and emits login-success on a valid login submit", async () => {
        const w = mountForm({ view: "login", variant: "drawer" });
        await w.find('input[type="email"]').setValue("a@b.com");
        await w.find('input[type="password"]').setValue("secret123");
        await w.find("form").trigger("submit.prevent");
        await Promise.resolve();
        await Promise.resolve();
        expect(signIn).toHaveBeenCalledWith("a@b.com", "secret123");
        expect(w.emitted("login-success")).toBeTruthy();
    });

    it("blocks register and shows mismatch error when passwords differ", async () => {
        const w = mountForm({ view: "register", variant: "drawer" });
        const pw = w.findAll('input[type="password"]');
        await w.find('input[type="email"]').setValue("a@b.com");
        await pw[0].setValue("secret123");
        await pw[1].setValue("different");
        await w.find("form").trigger("submit.prevent");
        await Promise.resolve();
        expect(signUp).not.toHaveBeenCalled();
        expect(w.text()).toContain("Passwords do not match");
    });

    it("emits set-view when a switch link is clicked (drawer login -> forgot)", async () => {
        const w = mountForm({ view: "login", variant: "drawer" });
        const link = w
            .findAll("button")
            .find((b) => b.text().includes("Forgot password"));
        await link.trigger("click");
        expect(w.emitted("set-view")?.[0]).toEqual(["forgot"]);
    });
});
