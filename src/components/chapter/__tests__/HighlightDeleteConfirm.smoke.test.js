import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HighlightDeleteConfirm from "@/components/chapter/highlight-toolbar/HighlightDeleteConfirm.vue";

describe("HighlightDeleteConfirm (render smoke)", () => {
    it("renders the confirmation prompt and both buttons", () => {
        const w = mount(HighlightDeleteConfirm);
        expect(w.text()).toContain("Delete this highlight?");
        expect(w.find('[data-testid="confirm-delete-btn"]').exists()).toBe(true);
    });

    it("emits confirm when Delete is clicked", async () => {
        const w = mount(HighlightDeleteConfirm);
        await w.find('[data-testid="confirm-delete-btn"]').trigger("click");
        expect(w.emitted("confirm")).toBeTruthy();
    });

    it("emits cancel when Cancel is clicked", async () => {
        const w = mount(HighlightDeleteConfirm);
        const cancel = w.findAll("button").find((b) => b.text() === "Cancel");
        await cancel.trigger("click");
        expect(w.emitted("cancel")).toBeTruthy();
    });
});
