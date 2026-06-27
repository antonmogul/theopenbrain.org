import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HighlightColorPicker from "@/components/chapter/highlight-toolbar/HighlightColorPicker.vue";
import { HIGHLIGHT_COLORS } from "@/composables/useHighlights";

describe("HighlightColorPicker (render smoke)", () => {
    it("renders a swatch per highlight color", () => {
        const w = mount(HighlightColorPicker, { props: { mode: "create" } });
        const dots = w.findAll(".hl-color-dot");
        expect(dots).toHaveLength(HIGHLIGHT_COLORS.length);
    });

    it("emits pick with the color value on click", async () => {
        const w = mount(HighlightColorPicker, { props: { mode: "create" } });
        await w.find('[data-testid="highlight-yellow"]').trigger("click");
        expect(w.emitted("pick")[0]).toEqual(["yellow"]);
    });

    it("marks the active swatch and shows a check in edit mode", () => {
        const w = mount(HighlightColorPicker, {
            props: { mode: "edit", activeColor: "green" },
        });
        const active = w.find('[data-testid="highlight-green"]');
        expect(active.classes()).toContain("dot-active");
        expect(active.find(".dot-check").exists()).toBe(true);
    });

    it("does not mark any swatch active in create mode", () => {
        const w = mount(HighlightColorPicker, {
            props: { mode: "create", activeColor: "green" },
        });
        expect(w.find(".dot-active").exists()).toBe(false);
    });
});
