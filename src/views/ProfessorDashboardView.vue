<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useRouter } from "vue-router";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar.vue";
import DashboardHeader from "@/components/dashboard/DashboardHeader.vue";

const router = useRouter();
const {
    user,
    profile,
    loading,
    profileLoading,
    isAuthenticated,
    isProfessor,
    signOut,
    session,
} = useAuth();

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

async function supabaseRest(endpoint, options = {}) {
    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        ...restOptions,
        headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.value?.access_token || supabaseKey}`,
            "Content-Type": "application/json",
            ...optionHeaders,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    if (options.method === "PATCH" || options.method === "DELETE") {
        return { success: true };
    }

    return response.json();
}

// Current active section in sidebar
const activeSection = ref("dashboard");

// Navigation items for Professor role
const professorNavItems = [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "courses", label: "Courses", icon: "graduation" },
    { id: "library", label: "Content Library", icon: "folder" },
    { id: "students", label: "Students", icon: "users" },
    { id: "assessments", label: "Assessments", icon: "clipboard" },
    { id: "analytics", label: "Analytics", icon: "chart" },
    { id: "collaboration", label: "Collaboration", icon: "share" },
];

// Course type options
const courseTypeOptions = [
    { value: "course", label: "Course" },
    { value: "assignment", label: "Assignment" },
    { value: "lesson", label: "Lesson" },
    { value: "study_guide", label: "Study Guide" },
];

// ============ DASHBOARD SECTION STATE ============
const dashboardStats = ref({
    totalCourses: 0,
    activeStudents: 0,
    pendingAssessments: 0,
    avgCompletion: 0,
});

// ============ COURSES SECTION STATE ============
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

// ============ CONTENT LIBRARY STATE ============
const modules = ref([]);
const modulesLoading = ref(false);
const modulesError = ref(null);
const selectedModules = ref([]);
const expandedModuleId = ref(null);
const moduleSections = ref([]);

// ============ STUDENTS SECTION STATE ============
const students = ref([]);
const studentsLoading = ref(false);
const studentsError = ref(null);
const studentSearch = ref("");
const selectedCourseFilter = ref("all");
const showInviteModal = ref(false);
const inviteForm = ref({
    method: "url", // url, email, code
    emails: "",
    course_id: null,
});
const generatedInviteUrl = ref("");
const generatedAccessCode = ref("");

// ============ ASSESSMENTS SECTION STATE ============
const assessments = ref([]);
const assessmentsLoading = ref(false);
const assessmentsError = ref(null);
const showAssessmentEditor = ref(false);
const editingAssessment = ref(null);
const assessmentForm = ref({
    title: "",
    description: "",
    course_id: null,
    time_limit_minutes: 30,
    passing_score: 70,
    max_attempts: 1,
    available_from: "",
    available_until: "",
    questions: [],
});

// ============ ANALYTICS SECTION STATE ============
const analyticsLoading = ref(false);
const analyticsError = ref(null);
const analyticsDateRange = ref("7days");
const courseAnalytics = ref([]);
const studentProgress = ref([]);

// ============ COLLABORATION SECTION STATE ============
const sharedCourses = ref([]);
const sharedCoursesLoading = ref(false);
const mySharedCourses = ref([]);

// ============ FETCH FUNCTIONS ============

async function fetchDashboardStats() {
    try {
        // Fetch courses count
        const coursesData = await supabaseRest(
            `courses?professor_id=eq.${profile.value?.id}&select=id`
        );
        dashboardStats.value.totalCourses = coursesData.length;

        // Fetch active students (enrolled in professor's courses)
        if (coursesData.length > 0) {
            const courseIds = coursesData.map(c => c.id).join(",");
            const enrollments = await supabaseRest(
                `course_enrollments?course_id=in.(${courseIds})&select=student_id`
            );
            const uniqueStudents = new Set(enrollments.map(e => e.student_id));
            dashboardStats.value.activeStudents = uniqueStudents.size;
        }
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
    }
}

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

async function fetchModules() {
    modulesLoading.value = true;
    modulesError.value = null;

    try {
        const data = await supabaseRest(
            "modules?status=eq.published&select=id,title,slug,description,order_index&order=order_index.asc"
        );
        modules.value = data;
    } catch (err) {
        console.error("Error fetching modules:", err);
        modulesError.value = err.message;
    } finally {
        modulesLoading.value = false;
    }
}

async function fetchModuleSections(moduleId) {
    try {
        const sections = await supabaseRest(
            `sections?module_id=eq.${moduleId}&select=id,title,slug,order_index&order=order_index.asc`
        );
        moduleSections.value = sections;
    } catch (err) {
        console.error("Error fetching sections:", err);
    }
}

async function fetchStudents() {
    studentsLoading.value = true;
    studentsError.value = null;

    try {
        // Get all courses for this professor
        const coursesData = await supabaseRest(
            `courses?professor_id=eq.${profile.value?.id}&select=id,title`
        );

        if (coursesData.length === 0) {
            students.value = [];
            return;
        }

        const courseIds = coursesData.map(c => c.id).join(",");

        // Get enrollments with student profiles
        let endpoint = `course_enrollments?course_id=in.(${courseIds})&select=*,profiles(id,email,full_name,student_year,student_major),courses(id,title)`;

        if (selectedCourseFilter.value !== "all") {
            endpoint = `course_enrollments?course_id=eq.${selectedCourseFilter.value}&select=*,profiles(id,email,full_name,student_year,student_major),courses(id,title)`;
        }

        const enrollments = await supabaseRest(endpoint);

        // Map to student-centric view
        const studentMap = new Map();
        enrollments.forEach(enrollment => {
            const studentId = enrollment.profiles?.id;
            if (!studentId) return;

            if (!studentMap.has(studentId)) {
                studentMap.set(studentId, {
                    ...enrollment.profiles,
                    enrollments: [],
                });
            }
            studentMap.get(studentId).enrollments.push({
                course_id: enrollment.course_id,
                course_title: enrollment.courses?.title,
                enrolled_at: enrollment.enrolled_at,
                last_accessed_at: enrollment.last_accessed_at,
            });
        });

        students.value = Array.from(studentMap.values());
    } catch (err) {
        console.error("Error fetching students:", err);
        studentsError.value = err.message;
    } finally {
        studentsLoading.value = false;
    }
}

async function fetchAssessments() {
    assessmentsLoading.value = true;
    assessmentsError.value = null;

    try {
        // Fetch quizzes created by this professor or attached to their courses
        const coursesData = await supabaseRest(
            `courses?professor_id=eq.${profile.value?.id}&select=id`
        );

        if (coursesData.length === 0) {
            assessments.value = [];
            return;
        }

        const courseIds = coursesData.map(c => c.id).join(",");
        const data = await supabaseRest(
            `quizzes?course_id=in.(${courseIds})&select=*,courses(title)&order=created_at.desc`
        );

        // Get attempt stats for each quiz
        const assessmentsWithStats = await Promise.all(
            data.map(async (quiz) => {
                const attempts = await supabaseRest(
                    `quiz_attempts?quiz_id=eq.${quiz.id}&select=status,score,total_points`
                );
                const completedAttempts = attempts.filter(a => a.status === "completed");
                const avgScore = completedAttempts.length
                    ? Math.round(
                        completedAttempts.reduce((sum, a) => sum + (a.score / a.total_points) * 100, 0) /
                        completedAttempts.length
                    )
                    : 0;

                const questions = await supabaseRest(
                    `quiz_questions?quiz_id=eq.${quiz.id}&select=id`
                );

                return {
                    ...quiz,
                    attemptCount: attempts.length,
                    avgScore,
                    questionCount: questions.length,
                };
            })
        );

        assessments.value = assessmentsWithStats;
    } catch (err) {
        console.error("Error fetching assessments:", err);
        assessmentsError.value = err.message;
    } finally {
        assessmentsLoading.value = false;
    }
}

async function fetchAnalytics() {
    analyticsLoading.value = true;
    analyticsError.value = null;

    try {
        const coursesData = await supabaseRest(
            `courses?professor_id=eq.${profile.value?.id}&select=id,title`
        );

        if (coursesData.length === 0) {
            courseAnalytics.value = [];
            return;
        }

        // Get progress data for each course
        const analyticsData = await Promise.all(
            coursesData.map(async (course) => {
                const enrollments = await supabaseRest(
                    `course_enrollments?course_id=eq.${course.id}&select=student_id`
                );

                const progress = await supabaseRest(
                    `reading_progress?course_id=eq.${course.id}&select=is_completed,time_spent_seconds`
                );

                const completedCount = progress.filter(p => p.is_completed).length;
                const totalTime = progress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);

                return {
                    course_id: course.id,
                    title: course.title,
                    studentCount: enrollments.length,
                    completionRate: progress.length ? Math.round((completedCount / progress.length) * 100) : 0,
                    avgTimeSpent: progress.length ? Math.round(totalTime / progress.length / 60) : 0, // in minutes
                };
            })
        );

        courseAnalytics.value = analyticsData;
    } catch (err) {
        console.error("Error fetching analytics:", err);
        analyticsError.value = err.message;
    } finally {
        analyticsLoading.value = false;
    }
}

async function fetchSharedCourses() {
    sharedCoursesLoading.value = true;

    try {
        // Fetch courses marked as shared by other professors
        // For now, we'll simulate this with courses that have visibility set
        const data = await supabaseRest(
            `courses?is_published=eq.true&professor_id=neq.${profile.value?.id}&select=*,profiles(full_name,institution)`
        );
        sharedCourses.value = data;

        // Fetch my courses that I've shared
        const myCourses = await supabaseRest(
            `courses?professor_id=eq.${profile.value?.id}&is_published=eq.true&select=*`
        );
        mySharedCourses.value = myCourses;
    } catch (err) {
        console.error("Error fetching shared courses:", err);
    } finally {
        sharedCoursesLoading.value = false;
    }
}

// ============ COURSE CRUD ============

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

// ============ MODULE SELECTION ============

function toggleModuleExpand(moduleId) {
    if (expandedModuleId.value === moduleId) {
        expandedModuleId.value = null;
        moduleSections.value = [];
    } else {
        expandedModuleId.value = moduleId;
        fetchModuleSections(moduleId);
    }
}

function toggleModuleSelection(moduleId) {
    const index = selectedModules.value.indexOf(moduleId);
    if (index === -1) {
        selectedModules.value.push(moduleId);
    } else {
        selectedModules.value.splice(index, 1);
    }
}

async function addModulesToCourse(courseId) {
    if (selectedModules.value.length === 0) {
        alert("Please select at least one module");
        return;
    }

    try {
        // Get existing course modules to determine order
        const existing = await supabaseRest(
            `course_modules?course_id=eq.${courseId}&select=order_index&order=order_index.desc&limit=1`
        );
        let nextOrder = existing.length > 0 ? existing[0].order_index + 1 : 0;

        for (const moduleId of selectedModules.value) {
            await supabaseRest("course_modules", {
                method: "POST",
                body: JSON.stringify({
                    course_id: courseId,
                    module_id: moduleId,
                    order_index: nextOrder++,
                    is_required: true,
                }),
            });
        }

        selectedModules.value = [];
        await fetchCourses();
        alert("Modules added to course successfully!");
    } catch (err) {
        console.error("Error adding modules:", err);
        alert("Failed to add modules: " + err.message);
    }
}

// ============ STUDENT INVITATIONS ============

function openInviteModal(courseId = null) {
    inviteForm.value = {
        method: "url",
        emails: "",
        course_id: courseId || (courses.value[0]?.id || null),
    };
    generatedInviteUrl.value = "";
    generatedAccessCode.value = "";
    showInviteModal.value = true;
}

function closeInviteModal() {
    showInviteModal.value = false;
}

function generateInviteUrl() {
    if (!inviteForm.value.course_id) {
        alert("Please select a course");
        return;
    }
    const baseUrl = window.location.origin;
    generatedInviteUrl.value = `${baseUrl}/enroll/${inviteForm.value.course_id}`;
}

function generateAccessCode() {
    // Generate a 6-character alphanumeric code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generatedAccessCode.value = code;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
}

// ============ ASSESSMENT CRUD ============

function openAssessmentEditor(assessment = null) {
    if (assessment) {
        editingAssessment.value = assessment;
        assessmentForm.value = {
            title: assessment.title,
            description: assessment.description || "",
            course_id: assessment.course_id,
            time_limit_minutes: assessment.time_limit_minutes || 30,
            passing_score: assessment.passing_score || 70,
            max_attempts: assessment.max_attempts || 1,
            available_from: assessment.available_from || "",
            available_until: assessment.available_until || "",
            questions: [],
        };
    } else {
        editingAssessment.value = null;
        assessmentForm.value = {
            title: "",
            description: "",
            course_id: courses.value[0]?.id || null,
            time_limit_minutes: 30,
            passing_score: 70,
            max_attempts: 1,
            available_from: "",
            available_until: "",
            questions: [],
        };
    }
    showAssessmentEditor.value = true;
}

function closeAssessmentEditor() {
    showAssessmentEditor.value = false;
    editingAssessment.value = null;
}

async function saveAssessment() {
    try {
        const assessmentData = {
            title: assessmentForm.value.title,
            description: assessmentForm.value.description,
            course_id: assessmentForm.value.course_id,
            time_limit_minutes: assessmentForm.value.time_limit_minutes,
            passing_score: assessmentForm.value.passing_score,
            allow_multiple_attempts: assessmentForm.value.max_attempts > 1,
        };

        if (editingAssessment.value) {
            await supabaseRest(`quizzes?id=eq.${editingAssessment.value.id}`, {
                method: "PATCH",
                body: JSON.stringify(assessmentData),
            });
        } else {
            assessmentData.created_by = profile.value?.id;
            await supabaseRest("quizzes", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(assessmentData),
            });
        }

        closeAssessmentEditor();
        await fetchAssessments();
    } catch (err) {
        console.error("Error saving assessment:", err);
        alert("Failed to save assessment: " + err.message);
    }
}

async function deleteAssessment(assessmentId) {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
        await supabaseRest(`quiz_questions?quiz_id=eq.${assessmentId}`, {
            method: "DELETE",
        });
        await supabaseRest(`quiz_attempts?quiz_id=eq.${assessmentId}`, {
            method: "DELETE",
        });
        await supabaseRest(`quizzes?id=eq.${assessmentId}`, {
            method: "DELETE",
        });
        await fetchAssessments();
    } catch (err) {
        console.error("Error deleting assessment:", err);
        alert("Failed to delete assessment: " + err.message);
    }
}

// ============ UTILITIES ============

function formatDate(dateString) {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 172800000) return "Yesterday";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

const currentDate = computed(() => {
    const options = { weekday: "long", month: "short", day: "numeric" };
    return new Date().toLocaleDateString("en-US", options).toUpperCase();
});

const displayName = computed(() => {
    return profile.value?.full_name || user.value?.email?.split("@")[0] || "Professor";
});

const pageTitle = computed(() => {
    return professorNavItems.find(i => i.id === activeSection.value)?.label || "Dashboard";
});

const filteredStudents = computed(() => {
    if (!studentSearch.value) return students.value;
    const search = studentSearch.value.toLowerCase();
    return students.value.filter(s =>
        s.full_name?.toLowerCase().includes(search) ||
        s.email?.toLowerCase().includes(search)
    );
});

const handleLogout = async () => {
    await signOut();
    router.push("/");
};

const goToBook = () => {
    router.push("/chapter/1/the-retina");
};

// Watch for section changes to fetch data
watch(activeSection, (newSection) => {
    switch (newSection) {
        case "dashboard":
            fetchDashboardStats();
            break;
        case "courses":
            if (courses.value.length === 0) fetchCourses();
            break;
        case "library":
            if (modules.value.length === 0) fetchModules();
            break;
        case "students":
            fetchStudents();
            break;
        case "assessments":
            fetchAssessments();
            break;
        case "analytics":
            fetchAnalytics();
            break;
        case "collaboration":
            fetchSharedCourses();
            break;
    }
});

onMounted(() => {
    fetchDashboardStats();
    fetchCourses(); // Pre-fetch courses for quick access
});
</script>

<template>
    <div class="dashboard-layout">
        <!-- Loading State -->
        <div v-if="loading || profileLoading" class="loading-screen">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>

        <!-- Not Authenticated -->
        <div v-else-if="!isAuthenticated" class="access-denied">
            <h1>Access Denied</h1>
            <p>Please log in to access your dashboard.</p>
            <button @click="router.push('/')" class="primary-btn">Go Home</button>
        </div>

        <!-- Authenticated Dashboard -->
        <template v-else>
            <!-- Sidebar -->
            <DashboardSidebar
                :nav-items="professorNavItems"
                v-model:active-section="activeSection"
                :display-name="displayName"
                :current-date="currentDate"
                accent-color="#C86948"
                logo-text="PROFESSOR PORTAL"
                footer-button-text="Read Book"
                @footer-click="goToBook"
            />

            <!-- Main Content -->
            <main class="main-content">
                <!-- Header -->
                <DashboardHeader :title="pageTitle" @logout="handleLogout" />

                <!-- Dashboard Overview -->
                <section v-if="activeSection === 'dashboard'" class="dashboard-content">
                    <!-- Stats Cards -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon blue">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                                </svg>
                            </div>
                            <div class="stat-info">
                                <span class="stat-value">{{ dashboardStats.totalCourses }}</span>
                                <span class="stat-label">Active Courses</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon green">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <div class="stat-info">
                                <span class="stat-value">{{ dashboardStats.activeStudents }}</span>
                                <span class="stat-label">Enrolled Students</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon orange">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                </svg>
                            </div>
                            <div class="stat-info">
                                <span class="stat-value">{{ assessments.length }}</span>
                                <span class="stat-label">Assessments</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon purple">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="20" x2="18" y2="10"></line>
                                    <line x1="12" y1="20" x2="12" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                            </div>
                            <div class="stat-info">
                                <span class="stat-value">{{ dashboardStats.avgCompletion }}%</span>
                                <span class="stat-label">Avg Completion</span>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="quick-actions">
                        <h3 class="section-subtitle">Quick Actions</h3>
                        <div class="action-cards">
                            <button class="action-card" @click="activeSection = 'courses'; openCourseEditor()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Create Course</span>
                            </button>
                            <button class="action-card" @click="activeSection = 'students'; openInviteModal()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                <span>Invite Students</span>
                            </button>
                            <button class="action-card" @click="activeSection = 'library'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <span>Browse Content</span>
                            </button>
                            <button class="action-card" @click="activeSection = 'analytics'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="20" x2="18" y2="10"></line>
                                    <line x1="12" y1="20" x2="12" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                                <span>View Analytics</span>
                            </button>
                        </div>
                    </div>

                    <!-- Recent Courses -->
                    <div class="recent-section">
                        <h3 class="section-subtitle">Recent Courses</h3>
                        <div v-if="courses.length === 0" class="empty-state small">
                            <p>No courses yet. Create your first course to get started.</p>
                        </div>
                        <div v-else class="recent-list">
                            <div v-for="course in courses.slice(0, 3)" :key="course.id" class="recent-item">
                                <div class="recent-info">
                                    <h4>{{ course.title }}</h4>
                                    <span class="recent-meta">{{ course.studentCount }} students · {{ course.moduleCount }} modules</span>
                                </div>
                                <span class="status-badge" :class="course.is_published ? 'published' : 'draft'">
                                    {{ course.is_published ? 'Published' : 'Draft' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Courses Section -->
                <section v-else-if="activeSection === 'courses'" class="section-content">
                    <div class="section-header-row">
                        <h2 class="section-title">My Courses</h2>
                        <button class="primary-btn" @click="openCourseEditor()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Course
                        </button>
                    </div>

                    <!-- Loading -->
                    <div v-if="coursesLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading courses...</p>
                    </div>

                    <!-- Error -->
                    <div v-else-if="coursesError" class="error-state">
                        <p>{{ coursesError }}</p>
                        <button @click="fetchCourses" class="retry-btn">Retry</button>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="courses.length === 0 && !showCourseEditor" class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                        </svg>
                        <h3>No courses yet</h3>
                        <p>Create your first course to start curating content for your students.</p>
                        <button class="primary-btn" @click="openCourseEditor()">Create Course</button>
                    </div>

                    <!-- Course Editor -->
                    <div v-else-if="showCourseEditor" class="course-editor">
                        <div class="editor-header">
                            <button class="back-btn" @click="closeCourseEditor">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                Back to Courses
                            </button>
                            <h3>{{ editingCourse ? 'Edit Course' : 'New Course' }}</h3>
                        </div>

                        <div class="course-form">
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>Course Title</label>
                                    <input v-model="courseForm.title" type="text" placeholder="e.g., Introduction to Neuroscience" class="form-input" />
                                </div>
                                <div class="form-group">
                                    <label>Course Type</label>
                                    <select v-model="courseForm.course_type" class="form-select">
                                        <option v-for="opt in courseTypeOptions" :key="opt.value" :value="opt.value">
                                            {{ opt.label }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Course Code</label>
                                    <input v-model="courseForm.course_code" type="text" placeholder="e.g., NEURO101" class="form-input" />
                                </div>
                                <div class="form-group">
                                    <label>Semester</label>
                                    <input v-model="courseForm.semester" type="text" placeholder="e.g., Spring 2025" class="form-input" />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea v-model="courseForm.description" placeholder="Course description..." class="form-textarea" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Welcome Message (shown to students)</label>
                                <textarea v-model="courseForm.welcome_message" placeholder="Welcome to this course..." class="form-textarea" rows="2"></textarea>
                            </div>
                            <div class="form-row">
                                <label class="checkbox-label">
                                    <input type="checkbox" v-model="courseForm.is_published" />
                                    Publish course (make visible to students)
                                </label>
                            </div>
                            <div class="form-actions">
                                <button class="secondary-btn" @click="closeCourseEditor">Cancel</button>
                                <button class="primary-btn" @click="saveCourse">
                                    {{ editingCourse ? 'Save Changes' : 'Create Course' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Courses List -->
                    <div v-else class="courses-list">
                        <div v-for="course in courses" :key="course.id" class="course-card">
                            <div class="course-header">
                                <div class="course-info">
                                    <h3 class="course-title">{{ course.title }}</h3>
                                    <span class="course-meta">{{ course.course_code }} · {{ course.semester }}</span>
                                </div>
                                <span class="status-badge" :class="course.is_published ? 'published' : 'draft'">
                                    {{ course.is_published ? 'Published' : 'Draft' }}
                                </span>
                            </div>
                            <p v-if="course.description" class="course-description">{{ course.description }}</p>
                            <div class="course-stats">
                                <span>{{ course.studentCount }} students</span>
                                <span>{{ course.moduleCount }} modules</span>
                            </div>
                            <div class="course-actions">
                                <button class="action-btn" @click="openCourseEditor(course)">Edit</button>
                                <button class="action-btn" @click="duplicateCourse(course)">Duplicate</button>
                                <button class="action-btn" @click="openInviteModal(course.id)">Invite</button>
                                <button class="action-btn danger" @click="deleteCourse(course.id)">Delete</button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Content Library Section -->
                <section v-else-if="activeSection === 'library'" class="section-content">
                    <div class="section-header-row">
                        <h2 class="section-title">Content Library</h2>
                        <span class="total-count">{{ modules.length }} modules available</span>
                    </div>

                    <!-- Module Selection for Course -->
                    <div v-if="courses.length > 0" class="add-to-course-bar">
                        <span>{{ selectedModules.length }} selected</span>
                        <select class="form-select" id="target-course">
                            <option v-for="course in courses" :key="course.id" :value="course.id">
                                {{ course.title }}
                            </option>
                        </select>
                        <button
                            class="primary-btn"
                            :disabled="selectedModules.length === 0"
                            @click="addModulesToCourse(document.getElementById('target-course').value)"
                        >
                            Add to Course
                        </button>
                    </div>

                    <!-- Loading -->
                    <div v-if="modulesLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading content library...</p>
                    </div>

                    <!-- Modules List -->
                    <div v-else class="modules-list">
                        <div v-for="mod in modules" :key="mod.id" class="module-card" :class="{ expanded: expandedModuleId === mod.id }">
                            <div class="module-header" @click="toggleModuleExpand(mod.id)">
                                <label class="checkbox-label module-checkbox" @click.stop>
                                    <input
                                        type="checkbox"
                                        :checked="selectedModules.includes(mod.id)"
                                        @change="toggleModuleSelection(mod.id)"
                                    />
                                </label>
                                <div class="module-info">
                                    <span class="module-number">MODULE {{ mod.order_index }}</span>
                                    <h3 class="module-title">{{ mod.title }}</h3>
                                    <p v-if="mod.description" class="module-description">{{ mod.description }}</p>
                                </div>
                                <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                            <div v-if="expandedModuleId === mod.id" class="module-sections">
                                <div v-for="section in moduleSections" :key="section.id" class="section-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                    <span>{{ section.title }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Students Section -->
                <section v-else-if="activeSection === 'students'" class="section-content">
                    <div class="section-header-row">
                        <h2 class="section-title">Students</h2>
                        <button class="primary-btn" @click="openInviteModal()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Invite Students
                        </button>
                    </div>

                    <!-- Filters -->
                    <div class="filters-bar">
                        <input
                            v-model="studentSearch"
                            type="text"
                            placeholder="Search students..."
                            class="search-input"
                        />
                        <select v-model="selectedCourseFilter" @change="fetchStudents" class="form-select">
                            <option value="all">All Courses</option>
                            <option v-for="course in courses" :key="course.id" :value="course.id">
                                {{ course.title }}
                            </option>
                        </select>
                    </div>

                    <!-- Loading -->
                    <div v-if="studentsLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading students...</p>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="filteredStudents.length === 0" class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        <h3>No students yet</h3>
                        <p>Invite students to enroll in your courses.</p>
                        <button class="primary-btn" @click="openInviteModal()">Invite Students</button>
                    </div>

                    <!-- Students List -->
                    <div v-else class="students-list">
                        <div v-for="student in filteredStudents" :key="student.id" class="student-card">
                            <div class="student-avatar">
                                {{ (student.full_name || student.email || '?')[0].toUpperCase() }}
                            </div>
                            <div class="student-info">
                                <h4>{{ student.full_name || 'Unnamed Student' }}</h4>
                                <span class="student-email">{{ student.email }}</span>
                                <div class="student-enrollments">
                                    <span v-for="enrollment in student.enrollments" :key="enrollment.course_id" class="enrollment-badge">
                                        {{ enrollment.course_title }}
                                    </span>
                                </div>
                            </div>
                            <div class="student-meta">
                                <span v-if="student.student_year">Year {{ student.student_year }}</span>
                                <span v-if="student.student_major">{{ student.student_major }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Invite Modal -->
                    <div v-if="showInviteModal" class="modal-overlay" @click.self="closeInviteModal">
                        <div class="modal-content">
                            <h3>Invite Students</h3>

                            <div class="form-group">
                                <label>Select Course</label>
                                <select v-model="inviteForm.course_id" class="form-select">
                                    <option v-for="course in courses" :key="course.id" :value="course.id">
                                        {{ course.title }}
                                    </option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Invitation Method</label>
                                <div class="radio-group">
                                    <label class="radio-label">
                                        <input type="radio" value="url" v-model="inviteForm.method" />
                                        Shareable URL
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" value="code" v-model="inviteForm.method" />
                                        Access Code
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" value="email" v-model="inviteForm.method" />
                                        Email Invitation
                                    </label>
                                </div>
                            </div>

                            <!-- URL Method -->
                            <div v-if="inviteForm.method === 'url'" class="invite-method">
                                <button class="secondary-btn" @click="generateInviteUrl">Generate URL</button>
                                <div v-if="generatedInviteUrl" class="generated-value">
                                    <input type="text" :value="generatedInviteUrl" readonly class="form-input" />
                                    <button class="icon-btn" @click="copyToClipboard(generatedInviteUrl)">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Code Method -->
                            <div v-if="inviteForm.method === 'code'" class="invite-method">
                                <button class="secondary-btn" @click="generateAccessCode">Generate Code</button>
                                <div v-if="generatedAccessCode" class="generated-value">
                                    <span class="access-code">{{ generatedAccessCode }}</span>
                                    <button class="icon-btn" @click="copyToClipboard(generatedAccessCode)">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Email Method -->
                            <div v-if="inviteForm.method === 'email'" class="invite-method">
                                <div class="form-group">
                                    <label>Email Addresses (one per line)</label>
                                    <textarea v-model="inviteForm.emails" placeholder="student1@example.com&#10;student2@example.com" class="form-textarea" rows="4"></textarea>
                                </div>
                                <button class="primary-btn">Send Invitations</button>
                            </div>

                            <div class="modal-actions">
                                <button class="secondary-btn" @click="closeInviteModal">Close</button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Assessments Section -->
                <section v-else-if="activeSection === 'assessments'" class="section-content">
                    <div class="section-header-row">
                        <h2 class="section-title">Assessments</h2>
                        <button class="primary-btn" @click="openAssessmentEditor()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Assessment
                        </button>
                    </div>

                    <!-- Loading -->
                    <div v-if="assessmentsLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading assessments...</p>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="assessments.length === 0 && !showAssessmentEditor" class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            <path d="M9 14l2 2 4-4"></path>
                        </svg>
                        <h3>No assessments yet</h3>
                        <p>Create assessments to evaluate your students.</p>
                        <button class="primary-btn" @click="openAssessmentEditor()">Create Assessment</button>
                    </div>

                    <!-- Assessment Editor -->
                    <div v-else-if="showAssessmentEditor" class="assessment-editor">
                        <div class="editor-header">
                            <button class="back-btn" @click="closeAssessmentEditor">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                Back to Assessments
                            </button>
                            <h3>{{ editingAssessment ? 'Edit Assessment' : 'New Assessment' }}</h3>
                        </div>

                        <div class="assessment-form">
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>Assessment Title</label>
                                    <input v-model="assessmentForm.title" type="text" placeholder="e.g., Chapter 1 Quiz" class="form-input" />
                                </div>
                                <div class="form-group">
                                    <label>Course</label>
                                    <select v-model="assessmentForm.course_id" class="form-select">
                                        <option v-for="course in courses" :key="course.id" :value="course.id">
                                            {{ course.title }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea v-model="assessmentForm.description" placeholder="Assessment description..." class="form-textarea" rows="2"></textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Time Limit (minutes)</label>
                                    <input v-model.number="assessmentForm.time_limit_minutes" type="number" min="1" class="form-input small" />
                                </div>
                                <div class="form-group">
                                    <label>Passing Score (%)</label>
                                    <input v-model.number="assessmentForm.passing_score" type="number" min="0" max="100" class="form-input small" />
                                </div>
                                <div class="form-group">
                                    <label>Max Attempts</label>
                                    <input v-model.number="assessmentForm.max_attempts" type="number" min="1" class="form-input small" />
                                </div>
                            </div>
                            <div class="form-actions">
                                <button class="secondary-btn" @click="closeAssessmentEditor">Cancel</button>
                                <button class="primary-btn" @click="saveAssessment">
                                    {{ editingAssessment ? 'Save Changes' : 'Create Assessment' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Assessments List -->
                    <div v-else class="assessments-list">
                        <div v-for="assessment in assessments" :key="assessment.id" class="assessment-card">
                            <div class="assessment-header">
                                <div class="assessment-info">
                                    <h3 class="assessment-title">{{ assessment.title }}</h3>
                                    <span class="assessment-course">{{ assessment.courses?.title }}</span>
                                </div>
                                <div class="assessment-actions">
                                    <button class="action-btn" @click="openAssessmentEditor(assessment)">Edit</button>
                                    <button class="action-btn danger" @click="deleteAssessment(assessment.id)">Delete</button>
                                </div>
                            </div>
                            <div class="assessment-meta">
                                <span>{{ assessment.questionCount }} questions</span>
                                <span>{{ assessment.time_limit_minutes }} min</span>
                                <span>Pass: {{ assessment.passing_score }}%</span>
                            </div>
                            <div class="assessment-stats">
                                <div class="stat">
                                    <span class="stat-value">{{ assessment.attemptCount }}</span>
                                    <span class="stat-label">Attempts</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value">{{ assessment.avgScore }}%</span>
                                    <span class="stat-label">Avg Score</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Analytics Section -->
                <section v-else-if="activeSection === 'analytics'" class="section-content">
                    <div class="section-header-row">
                        <h2 class="section-title">Analytics</h2>
                        <select v-model="analyticsDateRange" @change="fetchAnalytics" class="form-select">
                            <option value="7days">Last 7 days</option>
                            <option value="30days">Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                        </select>
                    </div>

                    <!-- Loading -->
                    <div v-if="analyticsLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading analytics...</p>
                    </div>

                    <!-- Analytics Dashboard -->
                    <div v-else class="analytics-dashboard">
                        <h3 class="section-subtitle">Course Performance</h3>
                        <div v-if="courseAnalytics.length === 0" class="empty-state small">
                            <p>No analytics data yet. Students need to start engaging with your courses.</p>
                        </div>
                        <div v-else class="analytics-grid">
                            <div v-for="analytics in courseAnalytics" :key="analytics.course_id" class="analytics-card">
                                <h4>{{ analytics.title }}</h4>
                                <div class="analytics-metrics">
                                    <div class="metric">
                                        <span class="metric-value">{{ analytics.studentCount }}</span>
                                        <span class="metric-label">Students</span>
                                    </div>
                                    <div class="metric">
                                        <span class="metric-value">{{ analytics.completionRate }}%</span>
                                        <span class="metric-label">Completion</span>
                                    </div>
                                    <div class="metric">
                                        <span class="metric-value">{{ analytics.avgTimeSpent }}m</span>
                                        <span class="metric-label">Avg Time</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Collaboration Section -->
                <section v-else-if="activeSection === 'collaboration'" class="section-content">
                    <div class="section-header-row">
                        <h2 class="section-title">Collaboration</h2>
                    </div>

                    <!-- My Shared Courses -->
                    <div class="collab-section">
                        <h3 class="section-subtitle">My Shared Courses</h3>
                        <div v-if="mySharedCourses.length === 0" class="empty-state small">
                            <p>You haven't shared any courses yet. Publish a course to make it visible to other professors.</p>
                        </div>
                        <div v-else class="shared-courses-list">
                            <div v-for="course in mySharedCourses" :key="course.id" class="shared-course-card">
                                <h4>{{ course.title }}</h4>
                                <span class="shared-badge">Shared</span>
                            </div>
                        </div>
                    </div>

                    <!-- Courses from Other Professors -->
                    <div class="collab-section">
                        <h3 class="section-subtitle">Available from Other Professors</h3>
                        <div v-if="sharedCoursesLoading" class="loading-state small">
                            <div class="spinner"></div>
                        </div>
                        <div v-else-if="sharedCourses.length === 0" class="empty-state small">
                            <p>No shared courses available from other professors yet.</p>
                        </div>
                        <div v-else class="shared-courses-list">
                            <div v-for="course in sharedCourses" :key="course.id" class="shared-course-card">
                                <div class="shared-course-info">
                                    <h4>{{ course.title }}</h4>
                                    <span class="shared-author">by {{ course.profiles?.full_name || 'Unknown' }}</span>
                                    <span v-if="course.profiles?.institution" class="shared-institution">{{ course.profiles.institution }}</span>
                                </div>
                                <button class="secondary-btn" @click="duplicateCourse(course)">Clone</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </template>
    </div>
</template>

<style scoped>
/* Layout */
.dashboard-layout {
    display: flex;
    min-height: 100vh;
    background: #FFFAF9;
}

.loading-screen,
.access-denied {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100%;
    background: #FFFAF9;
    color: #1a1a1a;
}

.loading-screen .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(200, 105, 72, 0.2);
    border-top-color: #C86948;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.access-denied h1 {
    font-size: 3.2rem;
    margin-bottom: 1.6rem;
}

.access-denied p {
    color: #78716C;
    margin-bottom: 2.4rem;
}

/* Main Content */
.main-content {
    flex: 1;
    background: #FFFAF9;
    padding: 2.4rem 3.2rem;
    overflow-y: auto;
}

/* Dashboard Content */
.dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 3.2rem;
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.6rem;
}

.stat-card {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.6rem;
}

.stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.stat-icon.blue {
    background: rgba(200, 105, 72, 0.15);
    color: #C86948;
}

.stat-icon.green {
    background: rgba(34, 197, 94, 0.15);
    color: rgb(34, 197, 94);
}

.stat-icon.orange {
    background: rgba(249, 115, 22, 0.15);
    color: rgb(249, 115, 22);
}

.stat-icon.purple {
    background: rgba(151, 71, 255, 0.15);
    color: rgb(151, 71, 255);
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-value {
    font-family: "IBM Plex Mono", monospace;
    font-size: 2.8rem;
    font-weight: 600;
    color: #1a1a1a;
}

.stat-label {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.3rem;
    color: #78716C;
}

/* Quick Actions */
.section-subtitle {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 1.6rem;
}

.action-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.6rem;
}

.action-card {
    background: #FEF6F3;
    border: 1px solid rgba(0, 0, 0, 0.04);
    border-radius: 12px;
    padding: 2.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #78716C;
}

.action-card:hover {
    background: #FEF1EC;
    border-color: rgba(200, 105, 72, 0.3);
    color: #1a1a1a;
}

.action-card svg {
    color: #C86948;
}

.action-card span {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    font-weight: 500;
}

/* Recent Section */
.recent-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.recent-item {
    background: white;
    border-radius: 10px;
    padding: 1.6rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.recent-info h4 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 0.4rem;
}

.recent-meta {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #9ca3af;
}

/* Section Content */
.section-content {
    flex: 1;
}

.section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2.4rem;
}

.section-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.4rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
}

.total-count {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    color: #78716C;
}

/* Status Badges */
.status-badge {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    text-transform: uppercase;
    padding: 0.4rem 1rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
}

.status-badge.draft {
    background: rgba(255, 193, 7, 0.15);
    color: #ffc107;
}

.status-badge.published {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
}

/* Buttons */
.primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem 2rem;
    background: #C86948;
    border: none;
    border-radius: 8px;
    color: white;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    cursor: pointer;
    transition: all 0.2s;
}

.primary-btn:hover {
    background: #AC5A3E;
}

.primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.secondary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem 2rem;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    color: #6b7280;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    cursor: pointer;
    transition: all 0.2s;
}

.secondary-btn:hover {
    border-color: rgba(0, 0, 0, 0.2);
    color: #1a1a1a;
}

.action-btn {
    padding: 0.8rem 1.6rem;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    color: #6b7280;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    border-color: rgba(0, 0, 0, 0.15);
    color: #1a1a1a;
}

.action-btn.danger {
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
}

.action-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
}

.back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1.2rem;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    color: #78716C;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 1.6rem;
}

.back-btn:hover {
    border-color: rgba(0, 0, 0, 0.15);
    color: #1a1a1a;
}

.icon-btn {
    padding: 0.8rem;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    color: #78716C;
    cursor: pointer;
    transition: all 0.2s;
}

.icon-btn:hover {
    border-color: rgba(0, 0, 0, 0.15);
    color: #1a1a1a;
}

.retry-btn {
    margin-top: 1.6rem;
    padding: 1rem 2rem;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    color: #6b7280;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    cursor: pointer;
}

/* Loading/Error/Empty States */
.loading-state,
.error-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6rem 2rem;
    text-align: center;
}

.loading-state.small,
.empty-state.small {
    padding: 3rem 2rem;
}

.loading-state .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(200, 105, 72, 0.2);
    border-top-color: #C86948;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.loading-state p,
.error-state p,
.empty-state p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    color: #78716C;
    margin-top: 1.6rem;
}

.empty-state svg {
    color: #4a4a4a;
    margin-bottom: 1.6rem;
}

.empty-state h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 0.8rem;
}

/* Forms */
.form-group {
    margin-bottom: 1.6rem;
}

.form-group label {
    display: block;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #78716C;
    margin-bottom: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.form-input,
.form-textarea,
.form-select {
    width: 100%;
    padding: 1.2rem 1.6rem;
    background: #252525;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    color: #1a1a1a;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
    outline: none;
    border-color: #C86948;
}

.form-input.small {
    width: 120px;
}

.form-textarea {
    resize: vertical;
    min-height: 80px;
}

.form-row {
    display: flex;
    gap: 1.6rem;
    margin-bottom: 1.6rem;
}

.form-row .form-group {
    margin-bottom: 0;
}

.flex-1 {
    flex: 1;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1.2rem;
    padding-top: 1.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #6b7280;
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #C86948;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #6b7280;
    cursor: pointer;
}

.radio-group {
    display: flex;
    gap: 2rem;
}

.search-input {
    padding: 1rem 1.6rem;
    background: #252525;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    color: #1a1a1a;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    min-width: 250px;
}

.search-input::placeholder {
    color: #9ca3af;
}

/* Filters Bar */
.filters-bar {
    display: flex;
    gap: 1.6rem;
    margin-bottom: 2.4rem;
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: #1e1e1e;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    padding: 2.4rem;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 2rem;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1.2rem;
    margin-top: 2.4rem;
}

/* Courses List */
.courses-list {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.course-card {
    background: #FEF6F3;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.course-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.2rem;
}

.course-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 0.4rem;
}

.course-meta {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #9ca3af;
}

.course-description {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #78716C;
    margin-bottom: 1.2rem;
}

.course-stats {
    display: flex;
    gap: 1.6rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #9ca3af;
    margin-bottom: 1.6rem;
}

.course-actions {
    display: flex;
    gap: 0.8rem;
}

/* Course Editor */
.course-editor,
.assessment-editor {
    background: white;
    border-radius: 12px;
    padding: 2.4rem;
}

.editor-header {
    margin-bottom: 2.4rem;
}

.editor-header h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
}

/* Modules List */
.add-to-course-bar {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    background: white;
    padding: 1.6rem 2rem;
    border-radius: 10px;
    margin-bottom: 2.4rem;
}

.add-to-course-bar span {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #78716C;
}

.modules-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.module-card {
    background: #FEF6F3;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
}

.module-card.expanded {
    border-color: rgba(200, 105, 72, 0.3);
}

.module-header {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    padding: 2rem;
    cursor: pointer;
}

.module-checkbox {
    margin: 0;
}

.module-info {
    flex: 1;
}

.module-number {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: #C86948;
    letter-spacing: 0.1em;
}

.module-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0.4rem 0;
}

.module-description {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #78716C;
    margin: 0;
}

.chevron-icon {
    color: #78716C;
    transition: transform 0.3s ease;
}

.module-card.expanded .chevron-icon {
    transform: rotate(180deg);
}

.module-sections {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.6rem 2rem;
    background: white;
}

.section-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    color: #78716C;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
}

/* Students List */
.students-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.student-card {
    background: #FEF6F3;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1.6rem 2rem;
    display: flex;
    align-items: center;
    gap: 1.6rem;
}

.student-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #C86948 0%, #8C4A32 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "IBM Plex Sans", sans-serif;
    font-weight: 600;
    font-size: 1.8rem;
    color: #1a1a1a;
}

.student-info {
    flex: 1;
}

.student-info h4 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: #1a1a1a;
    margin: 0 0 0.4rem;
}

.student-email {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #9ca3af;
}

.student-enrollments {
    display: flex;
    gap: 0.8rem;
    margin-top: 0.8rem;
}

.enrollment-badge {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    background: rgba(200, 105, 72, 0.15);
    color: #C86948;
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
}

.student-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #9ca3af;
}

/* Invite Modal */
.invite-method {
    margin-top: 1.6rem;
    padding-top: 1.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.generated-value {
    display: flex;
    gap: 1rem;
    margin-top: 1.2rem;
}

.generated-value .form-input {
    flex: 1;
}

.access-code {
    font-family: "IBM Plex Mono", monospace;
    font-size: 2.4rem;
    font-weight: 600;
    color: #C86948;
    letter-spacing: 0.2em;
    background: rgba(200, 105, 72, 0.1);
    padding: 1.2rem 2.4rem;
    border-radius: 8px;
}

/* Assessments List */
.assessments-list {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.assessment-card {
    background: #FEF6F3;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.assessment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.2rem;
}

.assessment-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 0.4rem;
}

.assessment-course {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #9ca3af;
}

.assessment-meta {
    display: flex;
    gap: 1.6rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #9ca3af;
    margin-bottom: 1.6rem;
}

.assessment-stats {
    display: flex;
    gap: 3.2rem;
}

.assessment-stats .stat {
    display: flex;
    flex-direction: column;
}

.assessment-stats .stat-value {
    font-family: "IBM Plex Mono", monospace;
    font-size: 2rem;
    font-weight: 600;
    color: #1a1a1a;
}

.assessment-stats .stat-label {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    color: #78716C;
}

.assessment-actions {
    display: flex;
    gap: 0.8rem;
}

/* Analytics */
.analytics-dashboard {
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
}

.analytics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.6rem;
}

.analytics-card {
    background: #FEF6F3;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.analytics-card h4 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 1.6rem;
}

.analytics-metrics {
    display: flex;
    gap: 2.4rem;
}

.analytics-metrics .metric {
    display: flex;
    flex-direction: column;
}

.analytics-metrics .metric-value {
    font-family: "IBM Plex Mono", monospace;
    font-size: 2rem;
    font-weight: 600;
    color: #C86948;
}

.analytics-metrics .metric-label {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    color: #78716C;
}

/* Collaboration */
.collab-section {
    margin-bottom: 3.2rem;
}

.shared-courses-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.shared-course-card {
    background: #FEF6F3;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1.6rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.shared-course-card h4 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: #1a1a1a;
    margin: 0 0 0.4rem;
}

.shared-badge {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    padding: 0.4rem 1rem;
    border-radius: 4px;
}

.shared-course-info {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.shared-author {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #78716C;
}

.shared-institution {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    color: #9ca3af;
}
</style>
