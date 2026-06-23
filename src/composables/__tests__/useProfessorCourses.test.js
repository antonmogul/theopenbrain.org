import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useProfessorCourses } from "@/composables/useProfessorCourses";

describe("useProfessorCourses", () => {
    let profile;

    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "prof-1" });
    });

    it("fetchCourses loads courses and attaches student/module counts", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (
                endpoint ===
                "courses?professor_id=eq.prof-1&select=*&order=created_at.desc"
            ) {
                return Promise.resolve([{ id: "c1", title: "Neuro" }]);
            }
            if (endpoint === "course_enrollments?course_id=eq.c1&select=id") {
                return Promise.resolve([{ id: "e1" }, { id: "e2" }]);
            }
            if (endpoint === "course_modules?course_id=eq.c1&select=id") {
                return Promise.resolve([{ id: "m1" }]);
            }
            return Promise.resolve([]);
        });

        const { courses, coursesLoading, fetchCourses } =
            useProfessorCourses(profile);
        expect(coursesLoading.value).toBe(false);

        await fetchCourses();

        expect(courses.value).toHaveLength(1);
        expect(courses.value[0].studentCount).toBe(2);
        expect(courses.value[0].moduleCount).toBe(1);
        expect(coursesLoading.value).toBe(false);
    });

    it("fetchCourses sets coursesError on failure and resets loading", async () => {
        authedRequest.mockRejectedValueOnce(new Error("boom"));
        const { coursesError, coursesLoading, fetchCourses } =
            useProfessorCourses(profile);

        await fetchCourses();

        expect(coursesError.value).toBe("boom");
        expect(coursesLoading.value).toBe(false);
    });

    it("openCourseEditor populates the form when editing and resets when new", () => {
        const { courseForm, editingCourse, showCourseEditor, openCourseEditor } =
            useProfessorCourses(profile);

        openCourseEditor({ id: "c1", title: "Neuro", course_code: "N101" });
        expect(editingCourse.value.id).toBe("c1");
        expect(courseForm.value.title).toBe("Neuro");
        expect(courseForm.value.course_code).toBe("N101");
        expect(showCourseEditor.value).toBe(true);

        openCourseEditor();
        expect(editingCourse.value).toBe(null);
        expect(courseForm.value.title).toBe("");
        expect(courseForm.value.course_type).toBe("course");
    });

    it("saveCourse POSTs a new course with professor_id, closes editor, refetches", async () => {
        authedRequest.mockResolvedValue([]);
        const { courseForm, showCourseEditor, saveCourse } =
            useProfessorCourses(profile);
        courseForm.value.title = "New course";

        await saveCourse();

        const postCall = authedRequest.mock.calls.find((c) => c[0] === "courses");
        expect(postCall, "POST to courses").toBeTruthy();
        expect(postCall[1].method).toBe("POST");
        const body = JSON.parse(postCall[1].body);
        expect(body.professor_id).toBe("prof-1");
        expect(body.title).toBe("New course");
        expect(showCourseEditor.value).toBe(false);
    });

    it("saveCourse PATCHes when editing an existing course", async () => {
        authedRequest.mockResolvedValue([]);
        const { openCourseEditor, courseForm, saveCourse } =
            useProfessorCourses(profile);
        openCourseEditor({ id: "c9", title: "Existing" });
        courseForm.value.title = "Renamed";

        await saveCourse();

        const patchCall = authedRequest.mock.calls.find(
            (c) => c[0] === "courses?id=eq.c9"
        );
        expect(patchCall[1].method).toBe("PATCH");
        const body = JSON.parse(patchCall[1].body);
        expect(body.title).toBe("Renamed");
        // PATCH path must not carry professor_id.
        expect(body.professor_id).toBeUndefined();
    });

    it("deleteCourse aborts when confirm is declined", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(false);
        const { deleteCourse } = useProfessorCourses(profile);

        await deleteCourse("c1");

        expect(authedRequest).not.toHaveBeenCalled();
    });

    it("deleteCourse removes enrollments, course_modules, and the course in order", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        authedRequest.mockResolvedValue([]);
        const { deleteCourse } = useProfessorCourses(profile);

        await deleteCourse("c1");

        const deletes = authedRequest.mock.calls.filter(
            (c) => c[1]?.method === "DELETE"
        );
        expect(deletes.map((c) => c[0])).toEqual([
            "course_enrollments?course_id=eq.c1",
            "course_modules?course_id=eq.c1",
            "courses?id=eq.c1",
        ]);
    });

    it("duplicateCourse clones the course and copies its modules", async () => {
        authedRequest.mockImplementation((endpoint, opts) => {
            if (endpoint === "courses" && opts?.method === "POST") {
                return Promise.resolve([{ id: "c-copy" }]);
            }
            if (endpoint === "course_modules?course_id=eq.c1&select=*") {
                return Promise.resolve([
                    { module_id: "m1", order_index: 0, is_required: true },
                ]);
            }
            return Promise.resolve([]);
        });

        const { duplicateCourse } = useProfessorCourses(profile);

        await duplicateCourse({ id: "c1", title: "Neuro", description: "desc" });

        const newCourseCall = authedRequest.mock.calls.find(
            (c) => c[0] === "courses" && c[1]?.method === "POST"
        );
        const newBody = JSON.parse(newCourseCall[1].body);
        expect(newBody.title).toBe("Neuro (Copy)");
        expect(newBody.professor_id).toBe("prof-1");
        expect(newBody.is_published).toBe(false);

        // A module from the source course is copied onto the new course id.
        const modCopyCall = authedRequest.mock.calls.find(
            (c) => c[0] === "course_modules" && c[1]?.method === "POST"
        );
        const modBody = JSON.parse(modCopyCall[1].body);
        expect(modBody.course_id).toBe("c-copy");
        expect(modBody.module_id).toBe("m1");
    });
});
