import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useProfessorAssessments } from "@/composables/useProfessorAssessments";

describe("useProfessorAssessments", () => {
    let profile;
    let courses;

    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "prof-1" });
        courses = ref([{ id: "course-1", title: "Default course" }]);
    });

    it("fetchAssessments scopes quizzes to the professor's courses and attaches stats", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "courses?professor_id=eq.prof-1&select=id") {
                return Promise.resolve([{ id: "c1" }]);
            }
            if (endpoint.startsWith("quizzes?course_id=in.(c1)")) {
                return Promise.resolve([{ id: "q1", title: "Quiz" }]);
            }
            if (endpoint === "quiz_attempts?quiz_id=eq.q1&select=status,score,total_points") {
                return Promise.resolve([
                    { status: "completed", score: 8, total_points: 10 },
                    { status: "completed", score: 6, total_points: 10 },
                    { status: "in_progress", score: 0, total_points: 10 },
                ]);
            }
            if (endpoint === "quiz_questions?quiz_id=eq.q1&select=id") {
                return Promise.resolve([{ id: "qq1" }, { id: "qq2" }]);
            }
            return Promise.resolve([]);
        });

        const { assessments, fetchAssessments } = useProfessorAssessments(
            profile,
            courses
        );

        await fetchAssessments();

        expect(assessments.value).toHaveLength(1);
        expect(assessments.value[0].attemptCount).toBe(3);
        // avg of 80% and 60% completed = 70
        expect(assessments.value[0].avgScore).toBe(70);
        expect(assessments.value[0].questionCount).toBe(2);
    });

    it("fetchAssessments short-circuits to empty when professor has no courses", async () => {
        authedRequest.mockResolvedValueOnce([]);
        const { assessments, fetchAssessments } = useProfessorAssessments(
            profile,
            courses
        );

        await fetchAssessments();

        expect(assessments.value).toEqual([]);
        expect(authedRequest).toHaveBeenCalledTimes(1);
    });

    it("fetchAssessments sets error on failure and resets loading", async () => {
        authedRequest.mockRejectedValueOnce(new Error("boom"));
        const { assessmentsError, assessmentsLoading, fetchAssessments } =
            useProfessorAssessments(profile, courses);

        await fetchAssessments();

        expect(assessmentsError.value).toBe("boom");
        expect(assessmentsLoading.value).toBe(false);
    });

    it("openAssessmentEditor defaults a new assessment's course to the first course", () => {
        const { assessmentForm, editingAssessment, openAssessmentEditor } =
            useProfessorAssessments(profile, courses);

        openAssessmentEditor();

        expect(editingAssessment.value).toBe(null);
        expect(assessmentForm.value.course_id).toBe("course-1");
        expect(assessmentForm.value.time_limit_minutes).toBe(30);
    });

    it("openAssessmentEditor populates the form when editing", () => {
        const { assessmentForm, editingAssessment, openAssessmentEditor } =
            useProfessorAssessments(profile, courses);

        openAssessmentEditor({
            id: "q9",
            title: "Existing",
            course_id: "c-other",
            passing_score: 80,
        });

        expect(editingAssessment.value.id).toBe("q9");
        expect(assessmentForm.value.title).toBe("Existing");
        expect(assessmentForm.value.course_id).toBe("c-other");
        expect(assessmentForm.value.passing_score).toBe(80);
    });

    it("saveAssessment POSTs created_by and derives allow_multiple_attempts from max_attempts", async () => {
        authedRequest.mockResolvedValue([]);
        const { assessmentForm, openAssessmentEditor, saveAssessment } =
            useProfessorAssessments(profile, courses);
        openAssessmentEditor();
        assessmentForm.value.title = "Quiz 1";
        assessmentForm.value.max_attempts = 3;

        await saveAssessment();

        const postCall = authedRequest.mock.calls.find((c) => c[0] === "quizzes");
        expect(postCall[1].method).toBe("POST");
        const body = JSON.parse(postCall[1].body);
        expect(body.created_by).toBe("prof-1");
        expect(body.allow_multiple_attempts).toBe(true);
    });

    it("saveAssessment PATCHes when editing (no created_by)", async () => {
        authedRequest.mockResolvedValue([]);
        const { openAssessmentEditor, assessmentForm, saveAssessment } =
            useProfessorAssessments(profile, courses);
        openAssessmentEditor({ id: "q9", title: "X", max_attempts: 1 });
        assessmentForm.value.title = "Renamed";

        await saveAssessment();

        const patchCall = authedRequest.mock.calls.find(
            (c) => c[0] === "quizzes?id=eq.q9"
        );
        expect(patchCall[1].method).toBe("PATCH");
        const body = JSON.parse(patchCall[1].body);
        expect(body.title).toBe("Renamed");
        expect(body.created_by).toBeUndefined();
        // max_attempts 1 → not multiple
        expect(body.allow_multiple_attempts).toBe(false);
    });

    it("deleteAssessment aborts when confirm is declined", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(false);
        const { deleteAssessment } = useProfessorAssessments(profile, courses);

        await deleteAssessment("q1");

        expect(authedRequest).not.toHaveBeenCalled();
    });

    it("deleteAssessment removes questions, attempts, and quiz in order", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        authedRequest.mockResolvedValue([]);
        const { deleteAssessment } = useProfessorAssessments(profile, courses);

        await deleteAssessment("q1");

        const deletes = authedRequest.mock.calls.filter(
            (c) => c[1]?.method === "DELETE"
        );
        expect(deletes.map((c) => c[0])).toEqual([
            "quiz_questions?quiz_id=eq.q1",
            "quiz_attempts?quiz_id=eq.q1",
            "quizzes?id=eq.q1",
        ]);
    });
});
