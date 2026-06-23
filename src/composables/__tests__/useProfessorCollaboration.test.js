import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useProfessorCollaboration } from "@/composables/useProfessorCollaboration";

describe("useProfessorCollaboration", () => {
    let profile;

    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "prof-1" });
    });

    it("fetchSharedCourses loads others' shared courses and my shared courses", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint.includes("professor_id=neq.prof-1")) {
                return Promise.resolve([{ id: "other-1", title: "Theirs" }]);
            }
            if (endpoint.includes("professor_id=eq.prof-1")) {
                return Promise.resolve([{ id: "mine-1", title: "Mine" }]);
            }
            return Promise.resolve([]);
        });

        const {
            sharedCourses,
            mySharedCourses,
            sharedCoursesLoading,
            fetchSharedCourses,
        } = useProfessorCollaboration(profile);

        await fetchSharedCourses();

        expect(sharedCourses.value).toHaveLength(1);
        expect(sharedCourses.value[0].id).toBe("other-1");
        expect(mySharedCourses.value).toHaveLength(1);
        expect(mySharedCourses.value[0].id).toBe("mine-1");
        expect(sharedCoursesLoading.value).toBe(false);

        // Both queries scope on is_published=eq.true.
        expect(authedRequest.mock.calls[0][0]).toContain("is_published=eq.true");
        expect(authedRequest.mock.calls[1][0]).toContain("is_published=eq.true");
    });

    it("fetchSharedCourses swallows errors and always resets loading", async () => {
        authedRequest.mockRejectedValueOnce(new Error("boom"));
        const { sharedCoursesLoading, fetchSharedCourses } =
            useProfessorCollaboration(profile);

        await expect(fetchSharedCourses()).resolves.toBeUndefined();
        expect(sharedCoursesLoading.value).toBe(false);
    });
});
