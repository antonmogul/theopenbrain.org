import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HighlightTagPanel from "@/components/chapter/highlight-toolbar/HighlightTagPanel.vue";

describe("HighlightTagPanel (render smoke)", () => {
    it("renders a chip per tag", () => {
        const w = mount(HighlightTagPanel, {
            props: { tags: ["alpha", "beta"], tagInput: "" },
        });
        expect(w.findAll(".hl-tag-chip")).toHaveLength(2);
        expect(w.text()).toContain("alpha");
        expect(w.text()).toContain("beta");
    });

    it("emits remove with the chip index", async () => {
        const w = mount(HighlightTagPanel, {
            props: { tags: ["alpha", "beta"], tagInput: "" },
        });
        await w.find('[data-testid="remove-tag-beta"]').trigger("click");
        expect(w.emitted("remove")[0]).toEqual([1]);
    });

    it("emits keydown from the input", async () => {
        const w = mount(HighlightTagPanel, { props: { tags: [], tagInput: "" } });
        await w.find('[data-testid="edit-tag-input"]').trigger("keydown", {
            key: "Enter",
        });
        expect(w.emitted("keydown")).toBeTruthy();
    });

    it("emits update:tagInput on typing (v-model)", async () => {
        const w = mount(HighlightTagPanel, { props: { tags: [], tagInput: "" } });
        await w.find('[data-testid="edit-tag-input"]').setValue("ne");
        expect(w.emitted("update:tagInput")[0]).toEqual(["ne"]);
    });
});
