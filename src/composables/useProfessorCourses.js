import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Professor-dashboard "Courses" section: the professor's courses (with per-course
 * student/module counts), the inline course editor, and course CRUD (save,
 * delete, duplicate).
 *
 * Extracted verbatim from ProfessorDashboardView.vue (#12 — professor dashboard
 * section composables). Behavior unchanged; only relocated. Self-contained apart
 * from `profile` (passed in) for professor_id on new/duplicated courses.
 *
 * `duplicateCourse` is also reused by the Collaboration section's "Clone" action,
 * so it lives here with the rest of course CRUD.
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 */
export function useProfessorCourses(profile) {
    // ---- state ----
    const courses = ref([]);
    const coursesLoading = ref(false);
    const coursesError = ref(null);
    const showCourseEditor = ref(false);
    const editingCourse = ref(null);
    const courseForm = ref({
        title: "",
        description: "",
        course_code: "",
        semester: "",
        course_type: "course",
        welcome_message: "",
        is_published: false,
    });

    // ---- fetch ----
    async function fetchCourses() {
        coursesLoading.value = true;
        coursesError.value = null;

        try {
            const data = await supabaseRest(
                `courses?professor_id=eq.${profile.value?.id}&select=*&order=created_at.desc`
            );

            // Get enrollment counts for each course
            const coursesWithStats = await Promise.all(
                data.map(async (course) => {
                    const enrollments = await supabaseRest(
                        `course_enrollments?course_id=eq.${course.id}&select=id`
                    );
                    const moduleCount = await supabaseRest(
                        `course_modules?course_id=eq.${course.id}&select=id`
                    );
                    return {
                        ...course,
                        studentCount: enrollments.length,
                        moduleCount: moduleCount.length,
                    };
                })
            );

            courses.value = coursesWithStats;
        } catch (err) {
            console.error("Error fetching courses:", err);
            coursesError.value = err.message;
        } finally {
            coursesLoading.value = false;
        }
    }

    // ---- CRUD ----
    function openCourseEditor(course = null) {
        if (course) {
            editingCourse.value = course;
            courseForm.value = {
                title: course.title,
                description: course.description || "",
                course_code: course.course_code || "",
                semester: course.semester || "",
                course_type: course.course_type || "course",
                welcome_message: course.welcome_message || "",
                is_published: course.is_published || false,
            };
        } else {
            editingCourse.value = null;
            courseForm.value = {
                title: "",
                description: "",
                course_code: "",
                semester: "",
                course_type: "course",
                welcome_message: "",
                is_published: false,
            };
        }
        showCourseEditor.value = true;
    }

    function closeCourseEditor() {
        showCourseEditor.value = false;
        editingCourse.value = null;
    }

    async function saveCourse() {
        try {
            const courseData = {
                title: courseForm.value.title,
                description: courseForm.value.description,
                course_code: courseForm.value.course_code,
                semester: courseForm.value.semester,
                is_published: courseForm.value.is_published,
            };

            if (editingCourse.value) {
                await supabaseRest(`courses?id=eq.${editingCourse.value.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(courseData),
                });
            } else {
                courseData.professor_id = profile.value?.id;
                await supabaseRest("courses", {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify(courseData),
                });
            }

            closeCourseEditor();
            await fetchCourses();
        } catch (err) {
            console.error("Error saving course:", err);
            alert("Failed to save course: " + err.message);
        }
    }

    async function deleteCourse(courseId) {
        if (!confirm("Are you sure you want to delete this course? All enrollments will be removed.")) return;

        try {
            // Delete enrollments first
            await supabaseRest(`course_enrollments?course_id=eq.${courseId}`, {
                method: "DELETE",
            });
            // Delete course modules
            await supabaseRest(`course_modules?course_id=eq.${courseId}`, {
                method: "DELETE",
            });
            // Delete course
            await supabaseRest(`courses?id=eq.${courseId}`, {
                method: "DELETE",
            });
            await fetchCourses();
        } catch (err) {
            console.error("Error deleting course:", err);
            alert("Failed to delete course: " + err.message);
        }
    }

    async function duplicateCourse(course) {
        try {
            const newCourse = {
                professor_id: profile.value?.id,
                title: `${course.title} (Copy)`,
                description: course.description,
                course_code: "",
                semester: "",
                is_published: false,
            };

            const result = await supabaseRest("courses", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(newCourse),
            });

            // Copy course modules
            const courseModules = await supabaseRest(
                `course_modules?course_id=eq.${course.id}&select=*`
            );

            for (const mod of courseModules) {
                await supabaseRest("course_modules", {
                    method: "POST",
                    body: JSON.stringify({
                        course_id: result[0].id,
                        module_id: mod.module_id,
                        order_index: mod.order_index,
                        custom_title: mod.custom_title,
                        is_required: mod.is_required,
                    }),
                });
            }

            await fetchCourses();
        } catch (err) {
            console.error("Error duplicating course:", err);
            alert("Failed to duplicate course: " + err.message);
        }
    }

    return {
        // state
        courses,
        coursesLoading,
        coursesError,
        showCourseEditor,
        editingCourse,
        courseForm,
        // fetch
        fetchCourses,
        // CRUD
        openCourseEditor,
        closeCourseEditor,
        saveCourse,
        deleteCourse,
        duplicateCourse,
    };
}
