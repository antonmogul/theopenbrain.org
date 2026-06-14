import { ref, computed } from "vue";
import { useAuth } from "./useAuth";
import { authedRequest as supabaseRest } from "@/services/api/client";

export function useStudentCourses() {
  const courses = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const { user } = useAuth();

  // Fetch enrolled courses with modules and progress
  async function fetchEnrolledCourses() {
    if (!user.value) return;

    loading.value = true;
    error.value = null;

    try {
      // Fetch enrollments with course details and modules
      const enrollments = await supabaseRest(
        `course_enrollments?student_id=eq.${user.value.id}&select=id,enrolled_at,last_accessed_at,course:courses(id,title,description,course_code,semester,is_published,professor:profiles(full_name),modules:course_modules(order_index,module:modules(id,title,slug,order_index,status)))`
      );

      // Fetch reading progress for all modules
      const progressData = await supabaseRest(
        `reading_progress?user_id=eq.${user.value.id}&select=module_id,scroll_position,time_spent_seconds,is_completed,last_accessed_at`
      );

      // Create progress lookup map
      const progressMap = {};
      for (const p of progressData) {
        progressMap[p.module_id] = p;
      }

      // Merge progress data with courses
      const enrichedCourses = enrollments.map((enrollment) => {
        const course = enrollment.course;
        if (!course) return enrollment;

        // Sort modules by order_index
        const modules = (course.modules || [])
          .map((cm) => ({
            ...cm.module,
            courseModuleOrder: cm.order_index,
            progress: progressMap[cm.module?.id] || null,
            is_completed: progressMap[cm.module?.id]?.is_completed || false,
          }))
          .sort((a, b) => a.courseModuleOrder - b.courseModuleOrder);

        // Calculate overall course progress
        const completedModules = modules.filter((m) => m.is_completed).length;
        const progressPercent =
          modules.length > 0
            ? Math.round((completedModules / modules.length) * 100)
            : 0;

        return {
          ...enrollment,
          course: {
            ...course,
            modules,
            progressPercent,
            completedModules,
            totalModules: modules.length,
          },
        };
      });

      courses.value = enrichedCourses;
    } catch (e) {
      console.error("useStudentCourses: Error fetching courses:", e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  // Get the most recently accessed course/module for "Continue Reading"
  const continueReading = computed(() => {
    if (!courses.value.length) return null;

    let mostRecent = null;
    let mostRecentDate = null;

    for (const enrollment of courses.value) {
      const course = enrollment.course;
      if (!course?.modules) continue;

      for (const module of course.modules) {
        if (module.progress?.last_accessed_at) {
          const accessDate = new Date(module.progress.last_accessed_at);
          if (!mostRecentDate || accessDate > mostRecentDate) {
            mostRecentDate = accessDate;
            mostRecent = {
              course,
              module,
              lastAccessedAt: accessDate,
              scrollPosition: module.progress.scroll_position || 0,
            };
          }
        }
      }
    }

    // If no progress found, return first incomplete module
    if (!mostRecent && courses.value.length > 0) {
      const firstCourse = courses.value[0].course;
      if (firstCourse?.modules?.length > 0) {
        const firstIncomplete = firstCourse.modules.find((m) => !m.is_completed);
        mostRecent = {
          course: firstCourse,
          module: firstIncomplete || firstCourse.modules[0],
          lastAccessedAt: null,
          scrollPosition: 0,
        };
      }
    }

    return mostRecent;
  });

  // Update last accessed timestamp for enrollment
  async function updateLastAccessed(enrollmentId) {
    if (!enrollmentId) return;

    try {
      await supabaseRest(`course_enrollments?id=eq.${enrollmentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_accessed_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("useStudentCourses: Error updating last accessed:", e);
    }
  }

  return {
    courses,
    loading,
    error,
    fetchEnrolledCourses,
    continueReading,
    updateLastAccessed,
  };
}
