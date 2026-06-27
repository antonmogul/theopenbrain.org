import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useProfessorLibrary } from "@/composables/useProfessorLibrary";

describe("useProfessorLibrary", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("fetchModules loads the published module catalog", async () => {
        authedRequest.mockResolvedValueOnce([
            { id: "m1", title: "Module A" },
        ]);
        const { modules, modulesLoading, fetchModules } = useProfessorLibrary();
        expect(modulesLoading.value).toBe(false);

        await fetchModules();

        expect(modules.value).toHaveLength(1);
        expect(modules.value[0].title).toBe("Module A");
        expect(modulesLoading.value).toBe(false);
        expect(authedRequest.mock.calls[0][0]).toContain("status=eq.published");
    });

    it("fetchModules sets modulesError on failure and resets loading", async () => {
        authedRequest.mockRejectedValueOnce(new Error("boom"));
        const { modulesError, modulesLoading, fetchModules } =
            useProfessorLibrary();

        await fetchModules();

        expect(modulesError.value).toBe("boom");
        expect(modulesLoading.value).toBe(false);
    });

    it("fetchModuleSections loads sections for a module", async () => {
        authedRequest.mockResolvedValueOnce([{ id: "s1", title: "Sec" }]);
        const { moduleSections, fetchModuleSections } = useProfessorLibrary();

        await fetchModuleSections("m1");

        expect(moduleSections.value).toHaveLength(1);
        expect(authedRequest.mock.calls[0][0]).toBe(
            "sections?module_id=eq.m1&select=id,title,slug,order_index&order=order_index.asc"
        );
    });

    it("toggleModuleExpand expands+fetches, then collapses+clears", async () => {
        authedRequest.mockResolvedValue([{ id: "s1" }]);
        const { expandedModuleId, moduleSections, toggleModuleExpand } =
            useProfessorLibrary();

        toggleModuleExpand("m1");
        expect(expandedModuleId.value).toBe("m1");
        // wait for the fetch kicked off inside toggle
        await Promise.resolve();
        await Promise.resolve();

        toggleModuleExpand("m1");
        expect(expandedModuleId.value).toBe(null);
        expect(moduleSections.value).toEqual([]);
    });

    it("toggleModuleSelection adds then removes a module id", () => {
        const { selectedModules, toggleModuleSelection } = useProfessorLibrary();

        toggleModuleSelection("m1");
        expect(selectedModules.value).toEqual(["m1"]);

        toggleModuleSelection("m1");
        expect(selectedModules.value).toEqual([]);
    });

    it("addModulesToCourse warns and no-ops when nothing is selected", async () => {
        vi.spyOn(window, "alert").mockImplementation(() => {});
        const { addModulesToCourse } = useProfessorLibrary();

        await addModulesToCourse("c1");

        expect(authedRequest).not.toHaveBeenCalled();
    });

    it("addModulesToCourse POSTs each selected module with incrementing order, then refetches courses", async () => {
        vi.spyOn(window, "alert").mockImplementation(() => {});
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint.startsWith("course_modules?course_id=eq.c1")) {
                // existing modules: highest order_index is 2 → next starts at 3
                return Promise.resolve([{ order_index: 2 }]);
            }
            return Promise.resolve([]);
        });
        const refetchCourses = vi.fn().mockResolvedValue();

        const { selectedModules, addModulesToCourse } =
            useProfessorLibrary(refetchCourses);
        selectedModules.value = ["mA", "mB"];

        await addModulesToCourse("c1");

        const posts = authedRequest.mock.calls.filter(
            (c) => c[0] === "course_modules" && c[1]?.method === "POST"
        );
        expect(posts).toHaveLength(2);
        expect(JSON.parse(posts[0][1].body).order_index).toBe(3);
        expect(JSON.parse(posts[1][1].body).order_index).toBe(4);
        expect(JSON.parse(posts[0][1].body).module_id).toBe("mA");
        // selection cleared and courses refreshed
        expect(selectedModules.value).toEqual([]);
        expect(refetchCourses).toHaveBeenCalledOnce();
    });
});
