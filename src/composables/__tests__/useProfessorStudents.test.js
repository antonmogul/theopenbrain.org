import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useProfessorStudents } from "@/composables/useProfessorStudents";

describe("useProfessorStudents", () => {
    let profile;

    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "prof-1" });
    });

    it("fetchStudents collapses enrollments into a student-centric view", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "courses?professor_id=eq.prof-1&select=id,title") {
                return Promise.resolve([
                    { id: "c1", title: "A" },
                    { id: "c2", title: "B" },
                ]);
            }
            if (endpoint.startsWith("course_enrollments?course_id=in.(c1,c2)")) {
                // s1 enrolled in two courses → one student with 2 enrollments
                return Promise.resolve([
                    {
                        course_id: "c1",
                        courses: { id: "c1", title: "A" },
                        profiles: { id: "s1", full_name: "Sam", email: "s@x.com" },
                    },
                    {
                        course_id: "c2",
                        courses: { id: "c2", title: "B" },
                        profiles: { id: "s1", full_name: "Sam", email: "s@x.com" },
                    },
                ]);
            }
            return Promise.resolve([]);
        });

        const { students, fetchStudents } = useProfessorStudents(profile);

        await fetchStudents();

        expect(students.value).toHaveLength(1);
        expect(students.value[0].id).toBe("s1");
        expect(students.value[0].enrollments).toHaveLength(2);
    });

    it("fetchStudents short-circuits to empty when professor has no courses", async () => {
        authedRequest.mockResolvedValueOnce([]);
        const { students, studentsLoading, fetchStudents } =
            useProfessorStudents(profile);

        await fetchStudents();

        expect(students.value).toEqual([]);
        expect(studentsLoading.value).toBe(false);
        // Only the courses query ran; no enrollments query.
        expect(authedRequest).toHaveBeenCalledTimes(1);
    });

    it("fetchStudents narrows the enrollments query when a course filter is set", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "courses?professor_id=eq.prof-1&select=id,title") {
                return Promise.resolve([{ id: "c1", title: "A" }]);
            }
            return Promise.resolve([]);
        });

        const { selectedCourseFilter, fetchStudents } =
            useProfessorStudents(profile);
        selectedCourseFilter.value = "c1";

        await fetchStudents();

        const enrollCall = authedRequest.mock.calls.find((c) =>
            c[0].startsWith("course_enrollments?course_id=eq.c1")
        );
        expect(enrollCall, "scoped enrollments query for c1").toBeTruthy();
    });

    it("fetchStudents sets studentsError on failure and resets loading", async () => {
        authedRequest.mockRejectedValueOnce(new Error("boom"));
        const { studentsError, studentsLoading, fetchStudents } =
            useProfessorStudents(profile);

        await fetchStudents();

        expect(studentsError.value).toBe("boom");
        expect(studentsLoading.value).toBe(false);
    });

    it("filteredStudents filters by name/email and passes through when search is empty", () => {
        const { students, studentSearch, filteredStudents } =
            useProfessorStudents(profile);
        students.value = [
            { id: "s1", full_name: "Alice", email: "alice@x.com" },
            { id: "s2", full_name: "Bob", email: "bob@y.com" },
        ];

        expect(filteredStudents.value).toHaveLength(2);

        studentSearch.value = "ali";
        expect(filteredStudents.value).toHaveLength(1);
        expect(filteredStudents.value[0].id).toBe("s1");

        studentSearch.value = "y.com";
        expect(filteredStudents.value[0].id).toBe("s2");
    });
});
