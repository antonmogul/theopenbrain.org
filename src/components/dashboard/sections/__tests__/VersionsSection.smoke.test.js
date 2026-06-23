import { describe, it, expect } from "vitest";
import { mountSection } from "@/test/mountSection";
import VersionsSection from "@/components/dashboard/sections/VersionsSection.vue";

describe("VersionsSection (render smoke)", () => {
    const base = {
        versions: [],
        versionsLoading: false,
        versionsError: null,
        showNewVersionModal: false,
        newVersionForm: { version_number: "", release_notes: "" },
    };

    it("renders the empty state with no versions", () => {
        const w = mountSection(VersionsSection, base);
        expect(w.exists()).toBe(true);
        expect(w.text()).toContain("No versions yet");
    });

    it("renders a card per version", () => {
        const w = mountSection(VersionsSection, {
            ...base,
            versions: [
                {
                    id: "v1",
                    version_number: "1.0",
                    status: "draft",
                    moduleCount: 2,
                    created_at: "2026-06-01T00:00:00Z",
                },
            ],
        });
        expect(w.text()).toContain("v1.0");
        expect(w.text()).toContain("2 modules");
    });

    it("emits delete with the version id", async () => {
        const w = mountSection(VersionsSection, {
            ...base,
            versions: [{ id: "v1", version_number: "1.0", status: "draft", moduleCount: 0 }],
        });
        const deleteBtn = w.findAll("button").find((b) => b.text() === "Delete");
        await deleteBtn.trigger("click");
        expect(w.emitted("delete")[0]).toEqual(["v1"]);
    });
});
