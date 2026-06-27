import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HighlightActionBar from "@/components/chapter/highlight-toolbar/HighlightActionBar.vue";

describe("HighlightActionBar (render smoke)", () => {
    it("renders the note, tag, delete and overflow buttons", () => {
        const w = mount(HighlightActionBar);
        expect(w.find('[data-testid="edit-note-btn"]').exists()).toBe(true);
        expect(w.find('[data-testid="edit-tag-btn"]').exists()).toBe(true);
        expect(w.find('[data-testid="edit-delete-btn"]').exists()).toBe(true);
    });

    it("emits toggle events when buttons are clicked", async () => {
        const w = mount(HighlightActionBar);
        await w.find('[data-testid="edit-note-btn"]').trigger("click");
        await w.find('[data-testid="edit-tag-btn"]').trigger("click");
        await w.find('[data-testid="edit-delete-btn"]').trigger("click");
        expect(w.emitted("toggle-note")).toBeTruthy();
        expect(w.emitted("toggle-tag")).toBeTruthy();
        expect(w.emitted("toggle-delete")).toBeTruthy();
    });

    it("hides the overflow dropdown until opened", async () => {
        const closed = mount(HighlightActionBar, { props: { overflowOpen: false } });
        expect(closed.find(".hl-dropdown").exists()).toBe(false);

        const open = mount(HighlightActionBar, { props: { overflowOpen: true } });
        expect(open.find(".hl-dropdown").exists()).toBe(true);
        await open.find(".hl-dropdown-item").trigger("click");
        expect(open.emitted("copy-text")).toBeTruthy();
    });

    it("reflects active panel flags on the matching buttons", () => {
        const w = mount(HighlightActionBar, { props: { notePanelActive: true } });
        expect(
            w.find('[data-testid="edit-note-btn"]').classes(),
        ).toContain("hl-action-active");
    });
});
