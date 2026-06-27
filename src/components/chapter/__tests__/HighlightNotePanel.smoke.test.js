import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HighlightNotePanel from "@/components/chapter/highlight-toolbar/HighlightNotePanel.vue";

describe("HighlightNotePanel (render smoke)", () => {
    it("renders the textarea with the bound note value", () => {
        const w = mount(HighlightNotePanel, { props: { note: "hello" } });
        const ta = w.find('[data-testid="edit-note-textarea"]');
        expect(ta.exists()).toBe(true);
        expect(ta.element.value).toBe("hello");
    });

    it("emits update:note on input (v-model)", async () => {
        const w = mount(HighlightNotePanel, { props: { note: "" } });
        const ta = w.find('[data-testid="edit-note-textarea"]');
        await ta.setValue("typed");
        expect(w.emitted("update:note")[0]).toEqual(["typed"]);
    });

    it("emits save when Save is clicked", async () => {
        const w = mount(HighlightNotePanel, { props: { note: "x" } });
        await w.find('[data-testid="edit-note-save"]').trigger("click");
        expect(w.emitted("save")).toBeTruthy();
    });
});
