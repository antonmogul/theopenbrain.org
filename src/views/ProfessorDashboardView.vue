<script setup>
// Professor dashboard — reskinned to the unified token design (sub-project C).
// Adopts DashboardShell (accent=amber), shared SectionHeader/StatGrid/BaseCard/
// ListRow/StatusBadge/FormField/Button/BaseModal/EmptyState/LoadingState/ErrorState.
// All CRUD + fetch logic preserved; mocked surfaces (email invite, access code,
// collaboration sharing) are marked with PreviewTag. Uses shared API client.
import { ref, computed, watch, onMounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useRouter } from "vue-router";
import { relativeLong as formatDate } from "@/utils/format";
import { authedRequest as supabaseRest } from "@/services/api/client";

// Shared library
import {
    DashboardShell,
    SectionHeader,
    BaseCard,
    StatCard,
    StatGrid,
    StatusBadge,
    EmptyState,
    LoadingState,
    ErrorState,
    BaseModal,
    Button,
    SearchInput,
    SegmentedControl,
    FormField,
    PreviewTag,
} from "@/components/dashboard/shared";

const router = useRouter();
const {
    user,
    profile,
    loading,
    profileLoading,
    isAuthenticated,
    isProfessor,
    signOut,
} = useAuth();

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
    { id: "collaboration", label: "Collaboration", icon: "share", soon: true },
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

            // QW-2: average completion across all of the professor's courses.
            // One query over reading_progress, guarded so a failure here doesn't
            // wipe out the other stats.
            try {
                const progress = await supabaseRest(
                    `reading_progress?course_id=in.(${courseIds})&select=is_completed`
                );
                const total = progress.length;
                const completed = progress.filter(p => p.is_completed).length;
                dashboardStats.value.avgCompletion = total
                    ? Math.round((completed / total) * 100)
                    : 0;
            } catch (progressErr) {
                console.error("Error fetching avg completion:", progressErr);
            }
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

        // QW-1: honour the selected date range by filtering reading_progress on
        // last_accessed_at. Same window switch the Creator dashboard uses.
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        let startDate;
        switch (analyticsDateRange.value) {
            case "30days":
                startDate = new Date(now - 30 * dayMs);
                break;
            case "90days":
                startDate = new Date(now - 90 * dayMs);
                break;
            case "7days":
            default:
                startDate = new Date(now - 7 * dayMs);
                break;
        }
        const sinceFilter = `&last_accessed_at=gte.${startDate.toISOString()}`;

        // Get progress data for each course
        const analyticsData = await Promise.all(
            coursesData.map(async (course) => {
                const enrollments = await supabaseRest(
                    `course_enrollments?course_id=eq.${course.id}&select=student_id`
                );

                const progress = await supabaseRest(
                    `reading_progress?course_id=eq.${course.id}&select=is_completed,time_spent_seconds${sinceFilter}`
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


// QW-3: render "—" instead of NaN/NaN% for non-finite percentages
// (e.g. avgScore when total_points is 0, or completionRate with no data).
function displayPct(v) {
    return Number.isFinite(v) ? `${v}%` : "—";
}

const displayName = computed(() => {
    return profile.value?.full_name || user.value?.email?.split("@")[0] || "Professor";
});

const dateRangeOptions = [
    { value: "7days", label: "7 days" },
    { value: "30days", label: "30 days" },
    { value: "90days", label: "90 days" },
];

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

// SegmentedControl emits update:modelValue, not @change — refetch on range change.
watch(analyticsDateRange, () => {
    if (activeSection.value === "analytics") fetchAnalytics();
});

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
    <!-- Loading -->
    <div v-if="loading || profileLoading" class="screen">
        <LoadingState message="Loading…" size="lg" />
    </div>

    <!-- Not authenticated -->
    <div v-else-if="!isAuthenticated" class="screen">
        <ErrorState
            title="Access denied"
            message="Please log in to access your dashboard."
            retry-label="Go home"
            @retry="router.push('/')"
        />
    </div>

    <!-- Authenticated dashboard -->
    <DashboardShell
        v-else
        :nav-items="professorNavItems"
        :active-section="activeSection"
        :display-name="displayName"
        :email="user?.email"
        role="Professor"
        accent="amber"
        :back-to="'/chapter/1/the-retina'"
        back-label="Back to book"
        @update:active-section="(id) => (activeSection = id)"
    >
        <template #footer>
            <hr class="rail-rule" />
            <router-link to="/chapter/1/the-retina" class="rail-back">← Back to book</router-link>
            <button type="button" class="rail-back" @click="handleLogout">Sign out</button>
        </template>

        <!-- DASHBOARD -->
        <section v-if="activeSection === 'dashboard'" class="section">
            <SectionHeader eyebrow="01 · Overview" title="Your teaching at a glance" />

            <StatGrid :columns="4">
                <StatCard :value="dashboardStats.totalCourses" label="Active courses" />
                <StatCard :value="dashboardStats.activeStudents" label="Enrolled students" />
                <StatCard :value="assessments.length" label="Assessments" />
                <StatCard :value="dashboardStats.avgCompletion" suffix="%" label="Avg completion" />
            </StatGrid>

            <div>
                <h3 class="card-title">Quick actions</h3>
                <div class="card-grid mt-3">
                    <BaseCard interactive padding="md" @click="activeSection = 'courses'; openCourseEditor()">
                        <span class="qa-label">Create course</span>
                    </BaseCard>
                    <BaseCard interactive padding="md" @click="activeSection = 'students'; openInviteModal()">
                        <span class="qa-label">Invite students</span>
                    </BaseCard>
                    <BaseCard interactive padding="md" @click="activeSection = 'library'">
                        <span class="qa-label">Browse content</span>
                    </BaseCard>
                    <BaseCard interactive padding="md" @click="activeSection = 'analytics'">
                        <span class="qa-label">View analytics</span>
                    </BaseCard>
                </div>
            </div>

            <div>
                <div class="card-head">
                    <h3 class="card-title">Recent courses</h3>
                    <Button variant="ghost" size="sm" @click="activeSection = 'courses'">View all</Button>
                </div>
                <EmptyState
                    v-if="courses.length === 0"
                    title="No courses yet"
                    message="Create your first course to get started."
                />
                <BaseCard v-else>
                    <ListRow
                        v-for="course in courses.slice(0, 3)"
                        :key="course.id"
                        :label="course.title"
                        :hint="`${course.studentCount} students · ${course.moduleCount} modules`"
                    >
                        <StatusBadge :status="course.is_published ? 'published' : 'draft'" />
                    </ListRow>
                </BaseCard>
            </div>
        </section>

        <!-- COURSES -->
        <section v-else-if="activeSection === 'courses'" class="section">
            <SectionHeader eyebrow="02 · Courses" title="Courses you teach">
                <template #actions>
                    <Button v-if="!showCourseEditor" variant="solid" size="sm" @click="openCourseEditor()">New course</Button>
                </template>
            </SectionHeader>

            <LoadingState v-if="coursesLoading" message="Loading courses…" />
            <ErrorState v-else-if="coursesError" :message="coursesError" @retry="fetchCourses" />

            <!-- Course Editor (inline panel) -->
            <BaseCard v-else-if="showCourseEditor" padding="lg">
                <div class="card-head">
                    <h3 class="card-title">{{ editingCourse ? 'Edit course' : 'New course' }}</h3>
                    <Button variant="ghost" size="sm" @click="closeCourseEditor">← Back</Button>
                </div>
                <div class="form-stack">
                    <div class="grid-2">
                        <FormField label="Course title">
                            <input v-model="courseForm.title" type="text" placeholder="e.g., Introduction to Neuroscience" />
                        </FormField>
                        <FormField label="Course type">
                            <select v-model="courseForm.course_type">
                                <option v-for="opt in courseTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                            </select>
                        </FormField>
                    </div>
                    <div class="grid-2">
                        <FormField label="Course code">
                            <input v-model="courseForm.course_code" type="text" placeholder="e.g., NEURO101" />
                        </FormField>
                        <FormField label="Semester">
                            <input v-model="courseForm.semester" type="text" placeholder="e.g., Spring 2025" />
                        </FormField>
                    </div>
                    <FormField label="Description">
                        <textarea v-model="courseForm.description" placeholder="Course description…" rows="3"></textarea>
                    </FormField>
                    <FormField label="Welcome message (shown to students)">
                        <textarea v-model="courseForm.welcome_message" placeholder="Welcome to this course…" rows="2"></textarea>
                    </FormField>
                    <label class="check-row">
                        <input type="checkbox" v-model="courseForm.is_published" />
                        <span>Publish course (make visible to students)</span>
                    </label>
                    <div class="form-actions">
                        <Button variant="ghost" size="sm" @click="closeCourseEditor">Cancel</Button>
                        <Button variant="solid" size="sm" @click="saveCourse">{{ editingCourse ? 'Save changes' : 'Create course' }}</Button>
                    </div>
                </div>
            </BaseCard>

            <EmptyState
                v-else-if="courses.length === 0"
                title="No courses yet"
                message="Create your first course to start curating content for your students."
                action-label="Create course"
                @action="openCourseEditor()"
            />

            <div v-else class="card-grid">
                <BaseCard v-for="course in courses" :key="course.id" padding="md">
                    <div class="card-head">
                        <div>
                            <h3 class="card-title sm">{{ course.title }}</h3>
                            <span class="muted-mono">{{ course.course_code }} · {{ course.semester }}</span>
                        </div>
                        <StatusBadge :status="course.is_published ? 'published' : 'draft'" />
                    </div>
                    <p v-if="course.description" class="muted">{{ course.description }}</p>
                    <div class="meta-row">
                        <span>{{ course.studentCount }} students</span>
                        <span>{{ course.moduleCount }} modules</span>
                    </div>
                    <div class="btn-row">
                        <Button variant="outline" size="sm" @click="openCourseEditor(course)">Edit</Button>
                        <Button variant="outline" size="sm" @click="duplicateCourse(course)">Duplicate</Button>
                        <Button variant="outline" size="sm" @click="openInviteModal(course.id)">Invite</Button>
                        <Button variant="danger" size="sm" @click="deleteCourse(course.id)">Delete</Button>
                    </div>
                </BaseCard>
            </div>
        </section>

        <!-- CONTENT LIBRARY -->
        <section v-else-if="activeSection === 'library'" class="section">
            <SectionHeader eyebrow="03 · Content library" title="Reusable teaching content">
                <template #actions>
                    <span class="muted-mono">{{ modules.length }} modules</span>
                </template>
            </SectionHeader>

            <!-- Module selection bar -->
            <BaseCard v-if="courses.length > 0" padding="md">
                <div class="add-bar">
                    <span class="muted-mono">{{ selectedModules.length }} selected</span>
                    <select id="target-course" class="bare-select">
                        <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.title }}</option>
                    </select>
                    <Button
                        variant="solid"
                        size="sm"
                        :disabled="selectedModules.length === 0"
                        @click="addModulesToCourse(document.getElementById('target-course').value)"
                    >
                        Add to course
                    </Button>
                </div>
            </BaseCard>

            <LoadingState v-if="modulesLoading" message="Loading content library…" />
            <ErrorState v-else-if="modulesError" :message="modulesError" @retry="fetchModules" />
            <EmptyState v-else-if="modules.length === 0" title="No modules available" />

            <div v-else class="stack">
                <BaseCard
                    v-for="mod in modules"
                    :key="mod.id"
                    padding="none"
                    :class="{ 'mod-expanded': expandedModuleId === mod.id }"
                >
                    <div class="module-head" @click="toggleModuleExpand(mod.id)">
                        <label class="mod-check" @click.stop>
                            <input
                                type="checkbox"
                                :checked="selectedModules.includes(mod.id)"
                                @change="toggleModuleSelection(mod.id)"
                            />
                        </label>
                        <div class="module-info">
                            <span class="eyebrow-mono">MODULE {{ mod.order_index }}</span>
                            <h3 class="card-title sm">{{ mod.title }}</h3>
                            <p v-if="mod.description" class="muted">{{ mod.description }}</p>
                        </div>
                        <svg class="chevron" :class="{ open: expandedModuleId === mod.id }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                    <div v-if="expandedModuleId === mod.id" class="module-sections">
                        <ListRow
                            v-for="section in moduleSections"
                            :key="section.id"
                            :label="section.title"
                            :divider="false"
                        />
                    </div>
                </BaseCard>
            </div>
        </section>

        <!-- STUDENTS -->
        <section v-else-if="activeSection === 'students'" class="section">
            <SectionHeader eyebrow="04 · Students" title="Enrolled students">
                <template #actions>
                    <Button variant="solid" size="sm" @click="openInviteModal()">Invite students</Button>
                </template>
            </SectionHeader>

            <div class="filters-bar">
                <SearchInput v-model="studentSearch" placeholder="Search students…" class="search-grow" />
                <select v-model="selectedCourseFilter" class="bare-select" @change="fetchStudents">
                    <option value="all">All courses</option>
                    <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.title }}</option>
                </select>
            </div>

            <LoadingState v-if="studentsLoading" message="Loading students…" />
            <ErrorState v-else-if="studentsError" :message="studentsError" @retry="fetchStudents" />
            <EmptyState
                v-else-if="filteredStudents.length === 0"
                title="No students yet"
                message="Invite students to enroll in your courses."
                action-label="Invite students"
                @action="openInviteModal()"
            />

            <div v-else class="stack">
                <BaseCard v-for="student in filteredStudents" :key="student.id" padding="md">
                    <div class="student-row">
                        <div class="student-avatar" aria-hidden="true">
                            {{ (student.full_name || student.email || '?')[0].toUpperCase() }}
                        </div>
                        <div class="student-info">
                            <h4 class="card-title sm">{{ student.full_name || 'Unnamed student' }}</h4>
                            <span class="muted-mono">{{ student.email }}</span>
                            <div class="badge-wrap">
                                <StatusBadge
                                    v-for="enrollment in student.enrollments"
                                    :key="enrollment.course_id"
                                    variant="accent"
                                >
                                    {{ enrollment.course_title }}
                                </StatusBadge>
                            </div>
                        </div>
                        <div class="student-meta">
                            <span v-if="student.student_year">Year {{ student.student_year }}</span>
                            <span v-if="student.student_major">{{ student.student_major }}</span>
                        </div>
                    </div>
                </BaseCard>
            </div>

            <!-- Invite Modal -->
            <BaseModal v-model="showInviteModal" title="Invite students" size="lg">
                <div class="form-stack">
                    <FormField label="Select course">
                        <select v-model="inviteForm.course_id">
                            <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.title }}</option>
                        </select>
                    </FormField>

                    <FormField label="Invitation method">
                        <div class="radio-row">
                            <label class="radio-label"><input type="radio" value="url" v-model="inviteForm.method" /> Shareable URL</label>
                            <label class="radio-label"><input type="radio" value="code" v-model="inviteForm.method" /> Access code</label>
                            <label class="radio-label"><input type="radio" value="email" v-model="inviteForm.method" /> Email invitation</label>
                        </div>
                    </FormField>

                    <!-- URL method (functional) -->
                    <div v-if="inviteForm.method === 'url'" class="method-block">
                        <Button variant="outline" size="sm" @click="generateInviteUrl">Generate URL</Button>
                        <div v-if="generatedInviteUrl" class="generated-row">
                            <input type="text" :value="generatedInviteUrl" readonly class="boxed-input" />
                            <Button variant="ghost" size="sm" @click="copyToClipboard(generatedInviteUrl)">Copy</Button>
                        </div>
                    </div>

                    <!-- Code method (preview) -->
                    <div v-if="inviteForm.method === 'code'" class="method-block">
                        <p class="method-help">Access codes are a preview <PreviewTag /> — use the invite URL to enroll students.</p>
                        <Button variant="outline" size="sm" @click="generateAccessCode">Generate code</Button>
                        <div v-if="generatedAccessCode" class="generated-row">
                            <span class="access-code">{{ generatedAccessCode }}</span>
                            <Button variant="ghost" size="sm" @click="copyToClipboard(generatedAccessCode)">Copy</Button>
                        </div>
                    </div>

                    <!-- Email method (preview, not wired) -->
                    <div v-if="inviteForm.method === 'email'" class="method-block">
                        <FormField label="Email addresses (one per line)">
                            <textarea v-model="inviteForm.emails" placeholder="student1@example.com&#10;student2@example.com" rows="4"></textarea>
                        </FormField>
                        <p class="method-help">Email invitations aren't available yet <PreviewTag variant="soon" /> — use the invite URL for now.</p>
                        <Button variant="solid" size="sm" disabled>Send invitations</Button>
                    </div>
                </div>
                <template #footer>
                    <Button variant="ghost" size="sm" @click="closeInviteModal">Close</Button>
                </template>
            </BaseModal>
        </section>

        <!-- ASSESSMENTS -->
        <section v-else-if="activeSection === 'assessments'" class="section">
            <SectionHeader eyebrow="05 · Assessments" title="Quizzes & assignments">
                <template #actions>
                    <Button v-if="!showAssessmentEditor" variant="solid" size="sm" @click="openAssessmentEditor()">New assessment</Button>
                </template>
            </SectionHeader>

            <LoadingState v-if="assessmentsLoading" message="Loading assessments…" />
            <ErrorState v-else-if="assessmentsError" :message="assessmentsError" @retry="fetchAssessments" />

            <!-- Assessment editor (inline panel) -->
            <BaseCard v-else-if="showAssessmentEditor" padding="lg">
                <div class="card-head">
                    <h3 class="card-title">{{ editingAssessment ? 'Edit assessment' : 'New assessment' }}</h3>
                    <Button variant="ghost" size="sm" @click="closeAssessmentEditor">← Back</Button>
                </div>
                <div class="form-stack">
                    <div class="grid-2">
                        <FormField label="Assessment title">
                            <input v-model="assessmentForm.title" type="text" placeholder="e.g., Chapter 1 Quiz" />
                        </FormField>
                        <FormField label="Course">
                            <select v-model="assessmentForm.course_id">
                                <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.title }}</option>
                            </select>
                        </FormField>
                    </div>
                    <FormField label="Description">
                        <textarea v-model="assessmentForm.description" placeholder="Assessment description…" rows="2"></textarea>
                    </FormField>
                    <div class="grid-3">
                        <FormField label="Time limit (min)">
                            <input v-model.number="assessmentForm.time_limit_minutes" type="number" min="1" />
                        </FormField>
                        <FormField label="Passing score (%)">
                            <input v-model.number="assessmentForm.passing_score" type="number" min="0" max="100" />
                        </FormField>
                        <FormField label="Max attempts">
                            <input v-model.number="assessmentForm.max_attempts" type="number" min="1" />
                        </FormField>
                    </div>
                    <div class="form-actions">
                        <Button variant="ghost" size="sm" @click="closeAssessmentEditor">Cancel</Button>
                        <Button variant="solid" size="sm" @click="saveAssessment">{{ editingAssessment ? 'Save changes' : 'Create assessment' }}</Button>
                    </div>
                </div>
            </BaseCard>

            <EmptyState
                v-else-if="assessments.length === 0"
                title="No assessments yet"
                message="Create assessments to evaluate your students."
                action-label="Create assessment"
                @action="openAssessmentEditor()"
            />

            <div v-else class="card-grid">
                <BaseCard v-for="assessment in assessments" :key="assessment.id" padding="md">
                    <div class="card-head">
                        <div>
                            <h3 class="card-title sm">{{ assessment.title }}</h3>
                            <span class="muted-mono">{{ assessment.courses?.title }}</span>
                        </div>
                        <div class="btn-row">
                            <Button variant="outline" size="sm" @click="openAssessmentEditor(assessment)">Edit</Button>
                            <Button variant="danger" size="sm" @click="deleteAssessment(assessment.id)">Delete</Button>
                        </div>
                    </div>
                    <div class="meta-row">
                        <span>{{ assessment.questionCount }} questions</span>
                        <span>{{ assessment.time_limit_minutes }} min</span>
                        <span>Pass: {{ displayPct(assessment.passing_score) }}</span>
                    </div>
                    <div class="mini-stats">
                        <div class="mini-stat">
                            <span class="mini-value">{{ assessment.attemptCount }}</span>
                            <span class="mini-label">Attempts</span>
                        </div>
                        <div class="mini-stat">
                            <span class="mini-value">{{ displayPct(assessment.avgScore) }}</span>
                            <span class="mini-label">Avg score</span>
                        </div>
                    </div>
                </BaseCard>
            </div>
        </section>

        <!-- ANALYTICS -->
        <section v-else-if="activeSection === 'analytics'" class="section">
            <SectionHeader eyebrow="06 · Analytics" title="Course performance">
                <template #actions>
                    <SegmentedControl
                        v-model="analyticsDateRange"
                        :options="dateRangeOptions"
                        aria-label="Analytics date range"
                    />
                </template>
            </SectionHeader>

            <LoadingState v-if="analyticsLoading" message="Loading analytics…" />
            <ErrorState v-else-if="analyticsError" :message="analyticsError" @retry="fetchAnalytics" />
            <EmptyState
                v-else-if="courseAnalytics.length === 0"
                title="No analytics data yet"
                message="Students need to start engaging with your courses."
            />

            <div v-else class="card-grid">
                <BaseCard v-for="analytics in courseAnalytics" :key="analytics.course_id" padding="md">
                    <h4 class="card-title sm">{{ analytics.title }}</h4>
                    <div class="mini-stats">
                        <div class="mini-stat">
                            <span class="mini-value">{{ analytics.studentCount }}</span>
                            <span class="mini-label">Students</span>
                        </div>
                        <div class="mini-stat">
                            <span class="mini-value">{{ displayPct(analytics.completionRate) }}</span>
                            <span class="mini-label">Completion</span>
                        </div>
                        <div class="mini-stat">
                            <span class="mini-value">{{ analytics.avgTimeSpent }}m</span>
                            <span class="mini-label">Avg time</span>
                        </div>
                    </div>
                </BaseCard>
            </div>
        </section>

        <!-- COLLABORATION -->
        <section v-else-if="activeSection === 'collaboration'" class="section">
            <SectionHeader eyebrow="07 · Collaboration" title="Shared courses" :preview="true" />

            <div>
                <h3 class="card-title">My shared courses</h3>
                <EmptyState
                    v-if="mySharedCourses.length === 0"
                    title="Nothing shared yet"
                    message="Publish a course to make it visible to other professors."
                />
                <BaseCard v-else class="mt-3">
                    <ListRow v-for="course in mySharedCourses" :key="course.id" :label="course.title">
                        <StatusBadge status="published">Shared</StatusBadge>
                    </ListRow>
                </BaseCard>
            </div>

            <div>
                <h3 class="card-title">Available from other professors</h3>
                <LoadingState v-if="sharedCoursesLoading" message="Loading…" size="sm" />
                <EmptyState
                    v-else-if="sharedCourses.length === 0"
                    title="No shared courses yet"
                    message="No shared courses available from other professors yet."
                />
                <BaseCard v-else class="mt-3">
                    <ListRow
                        v-for="course in sharedCourses"
                        :key="course.id"
                        :label="course.title"
                        :hint="`by ${course.profiles?.full_name || 'Unknown'}${course.profiles?.institution ? ' · ' + course.profiles.institution : ''}`"
                    >
                        <Button variant="outline" size="sm" @click="duplicateCourse(course)">Clone</Button>
                    </ListRow>
                </BaseCard>
            </div>
        </section>
    </DashboardShell>
</template>

<style scoped>
/* Full-screen states (loading / access denied) */
.screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(var(--color-bg));
}

/* Section layout helpers (mirror StudentDashboardView vocabulary) */
.section { display: flex; flex-direction: column; gap: 24px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.stack { display: flex; flex-direction: column; gap: 12px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 1100px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }
.mt-3 { margin-top: 12px; }

.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.card-title { font-family: var(--font-body); font-size: 1.8rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.card-title.sm { font-size: 1.6rem; margin: 0 0 4px; }

.muted { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-mute)); margin: 0 0 12px; line-height: 1.5; }
.muted-mono { font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-mute)); }
.eyebrow-mono {
    font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
    letter-spacing: 0.1em; color: rgb(var(--color-accent));
}

.meta-row {
    display: flex; flex-wrap: wrap; gap: 16px; font-family: var(--font-mono);
    font-size: 1.3rem; color: rgb(var(--color-mute)); margin-bottom: 16px;
}
.btn-row { display: flex; flex-wrap: wrap; gap: 8px; }

/* Rail footer (overrides default back-link to add Sign out) */
.rail-rule { border: 0; border-top: 1px solid rgb(var(--color-line)); margin: 20px 0 12px; width: 100%; }
.rail-back {
    display: block; font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
    letter-spacing: 0.08em; color: rgb(var(--color-ink)); text-decoration: none;
    background: transparent; border: 0; cursor: pointer; text-align: left; padding: 4px 0;
}
.rail-back:hover { color: rgb(var(--color-accent)); }

/* Quick-action cards */
.qa-label { font-family: var(--font-body); font-size: 1.5rem; font-weight: 500; color: rgb(var(--color-ink)); }

/* Forms */
.form-stack { display: flex; flex-direction: column; gap: 18px; }
.form-actions {
    display: flex; justify-content: flex-end; gap: 8px;
    padding-top: 16px; border-top: 1px solid rgb(var(--color-line));
}
.check-row, .radio-label {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); cursor: pointer;
}
.radio-row { display: flex; flex-wrap: wrap; gap: 20px; }
.check-row input[type="checkbox"], .radio-label input { accent-color: rgb(var(--color-accent)); }

/* Bare select (used outside FormField, e.g. filter/target-course bars) */
.bare-select {
    border: 1px solid rgb(var(--color-line)); border-radius: 4px; background: transparent;
    padding: 9px 12px; font-family: var(--font-body); font-size: 1.4rem;
    color: rgb(var(--color-ink)); outline: none; transition: border-color 0.12s ease;
}
.bare-select:focus { border-color: rgb(var(--color-ink)); }

/* Boxed input (readonly invite URL) */
.boxed-input {
    flex: 1; border: 1px solid rgb(var(--color-line)); border-radius: 4px; background: transparent;
    padding: 9px 12px; font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); outline: none;
}

/* Filters bar */
.filters-bar { display: flex; gap: 12px; align-items: center; }
.search-grow { flex: 1; min-width: 240px; }

/* Library: module add bar + cards */
.add-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.module-head { display: flex; align-items: center; gap: 16px; padding: 20px; cursor: pointer; }
.mod-check { display: flex; align-items: center; }
.mod-check input[type="checkbox"] { accent-color: rgb(var(--color-accent)); width: 16px; height: 16px; }
.module-info { flex: 1; min-width: 0; }
.module-info .muted { margin: 4px 0 0; }
.chevron { color: rgb(var(--color-mute)); flex: none; transition: transform 0.2s ease; }
.chevron.open { transform: rotate(180deg); }
.mod-expanded { border-color: rgb(var(--color-accent) / 0.4); }
.module-sections { border-top: 1px solid rgb(var(--color-line)); padding: 8px 20px; }

/* Students */
.student-row { display: flex; align-items: center; gap: 16px; }
.student-avatar {
    width: 48px; height: 48px; border-radius: 999px; flex: none;
    background: rgb(var(--color-accent)); color: rgb(var(--color-paper));
    display: grid; place-items: center; font-family: var(--font-mono);
    font-size: 1.8rem; font-weight: 600;
}
.student-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.badge-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.student-meta {
    display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
    font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-mute));
}

/* Invite modal method blocks */
.method-block { display: flex; flex-direction: column; gap: 12px; }
.method-help { font-family: var(--font-body); font-size: 1.3rem; color: rgb(var(--color-mute)); margin: 0; line-height: 1.5; }
.generated-row { display: flex; align-items: center; gap: 10px; }
.access-code {
    font-family: var(--font-mono); font-size: 2.4rem; font-weight: 600;
    color: rgb(var(--color-accent)); letter-spacing: 0.2em;
    background: rgb(var(--color-accent) / 0.1); padding: 10px 20px; border-radius: 6px;
}

/* Mini stat rows (assessment / analytics cards) */
.mini-stats { display: flex; gap: 28px; margin-top: 8px; }
.mini-stat { display: flex; flex-direction: column; }
.mini-value { font-family: var(--font-body); font-size: 2rem; font-weight: 500; color: rgb(var(--color-ink)); line-height: 1; }
.mini-label { font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgb(var(--color-mute)); margin-top: 6px; }
</style>
