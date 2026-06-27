import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import { authedRequest as supabaseRest } from "@/services/api/client";

export const useStudentStore = defineStore("student", () => {
  // State
  const enrolledCourses = ref([]);
  const currentCourse = ref(null);
  const highlights = ref([]);
  const notes = ref([]);
  const readingProgress = ref({});
  const recentHighlights = ref([]);
  const studyStats = ref({
    timeSpentThisWeek: 0,
    modulesCompleted: 0,
    highlightsMade: 0,
    notesTaken: 0,
  });
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const totalHighlights = computed(() => highlights.value.length);
  const totalNotes = computed(() => notes.value.length);

  const overallProgress = computed(() => {
    const progressValues = Object.values(readingProgress.value);
    if (progressValues.length === 0) return 0;

    const total = progressValues.reduce(
      (sum, p) => sum + (p.scroll_position || 0),
      0
    );
    return Math.round(total / progressValues.length);
  });

  const completedModulesCount = computed(() => {
    return Object.values(readingProgress.value).filter(
      (p) => p.is_completed
    ).length;
  });

  // Actions
  async function loadStudentData() {
    const { user } = useAuth();
    if (!user.value) return;

    loading.value = true;
    error.value = null;

    try {
      await Promise.all([
        fetchEnrolledCourses(),
        fetchReadingProgress(),
        fetchRecentHighlights(),
        fetchStudyStats(),
      ]);
    } catch (e) {
      console.error("useStudentStore: Error loading data:", e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEnrolledCourses() {
    const { user } = useAuth();
    if (!user.value) return;

    try {
      const data = await supabaseRest(
        `course_enrollments?student_id=eq.${user.value.id}&select=id,enrolled_at,last_accessed_at,course:courses(id,title,description,course_code,semester,is_published)`
      );
      enrolledCourses.value = data || [];
    } catch (e) {
      console.error("useStudentStore: Error fetching courses:", e);
    }
  }

  async function fetchReadingProgress() {
    const { user } = useAuth();
    if (!user.value) return;

    try {
      const data = await supabaseRest(
        `reading_progress?user_id=eq.${user.value.id}&select=*`
      );

      // Convert to map by module_id
      const progressMap = {};
      for (const p of data || []) {
        progressMap[p.module_id] = p;
      }
      readingProgress.value = progressMap;
    } catch (e) {
      console.error("useStudentStore: Error fetching progress:", e);
    }
  }

  async function fetchRecentHighlights() {
    const { user } = useAuth();
    if (!user.value) return;

    try {
      const data = await supabaseRest(
        `highlights?user_id=eq.${user.value.id}&select=*&order=created_at.desc&limit=5`
      );
      recentHighlights.value = data || [];
      highlights.value = data || [];
    } catch (e) {
      console.error("useStudentStore: Error fetching highlights:", e);
    }
  }

  async function fetchStudyStats() {
    const { user } = useAuth();
    if (!user.value) return;

    try {
      // Calculate time spent this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString();

      // Fetch progress data for time calculation
      const progressData = await supabaseRest(
        `reading_progress?user_id=eq.${user.value.id}&last_accessed_at=gte.${oneWeekAgoStr}&select=time_spent_seconds,is_completed`
      );

      // Fetch highlights count this week
      const highlightsData = await supabaseRest(
        `highlights?user_id=eq.${user.value.id}&created_at=gte.${oneWeekAgoStr}&select=id`
      );

      // Fetch notes count this week
      const notesData = await supabaseRest(
        `notes?user_id=eq.${user.value.id}&created_at=gte.${oneWeekAgoStr}&select=id`
      );

      // Calculate stats
      const timeSpent = progressData.reduce(
        (sum, p) => sum + (p.time_spent_seconds || 0),
        0
      );
      const modulesCompleted = progressData.filter(
        (p) => p.is_completed
      ).length;

      studyStats.value = {
        timeSpentThisWeek: timeSpent,
        modulesCompleted,
        highlightsMade: highlightsData.length,
        notesTaken: notesData.length,
      };
    } catch (e) {
      console.error("useStudentStore: Error fetching stats:", e);
    }
  }

  function setCurrentCourse(course) {
    currentCourse.value = course;
  }

  function updateProgressForModule(moduleId, progressData) {
    readingProgress.value = {
      ...readingProgress.value,
      [moduleId]: progressData,
    };
  }

  function addHighlight(highlight) {
    highlights.value = [highlight, ...highlights.value];
    recentHighlights.value = [highlight, ...recentHighlights.value].slice(0, 5);
    studyStats.value.highlightsMade += 1;
  }

  function removeHighlight(highlightId) {
    highlights.value = highlights.value.filter((h) => h.id !== highlightId);
    recentHighlights.value = recentHighlights.value.filter(
      (h) => h.id !== highlightId
    );
  }

  function addNote(note) {
    notes.value = [note, ...notes.value];
    studyStats.value.notesTaken += 1;
  }

  function removeNote(noteId) {
    notes.value = notes.value.filter((n) => n.id !== noteId);
  }

  // Format time spent as human readable
  function formatTimeSpent(seconds) {
    if (seconds < 60) return "< 1 min";
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return {
    // State
    enrolledCourses,
    currentCourse,
    highlights,
    notes,
    readingProgress,
    recentHighlights,
    studyStats,
    loading,
    error,

    // Getters
    totalHighlights,
    totalNotes,
    overallProgress,
    completedModulesCount,

    // Actions
    loadStudentData,
    fetchEnrolledCourses,
    fetchReadingProgress,
    fetchRecentHighlights,
    fetchStudyStats,
    setCurrentCourse,
    updateProgressForModule,
    addHighlight,
    removeHighlight,
    addNote,
    removeNote,
    formatTimeSpent,
  };
});
