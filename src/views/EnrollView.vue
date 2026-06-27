<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { authedRequest as supabaseRest } from "@/services/api/client";

const route = useRoute();
const router = useRouter();
const { user, profile, isAuthenticated } = useAuth();

const courseId = route.params.courseId;
const course = ref(null);
const loading = ref(true);
const enrolling = ref(false);
const error = ref(null);
const enrolled = ref(false);

async function fetchCourse() {
    loading.value = true;
    error.value = null;

    try {
        const data = await supabaseRest(
            `courses?id=eq.${courseId}&is_published=eq.true&select=*,profiles(full_name,institution)`
        );

        if (data.length === 0) {
            error.value = "Course not found or not available for enrollment.";
            return;
        }

        course.value = data[0];

        // Check if already enrolled
        if (profile.value?.id) {
            const enrollment = await supabaseRest(
                `course_enrollments?course_id=eq.${courseId}&student_id=eq.${profile.value.id}&select=id`
            );
            if (enrollment.length > 0) {
                enrolled.value = true;
            }
        }
    } catch (err) {
        console.error("Error fetching course:", err);
        error.value = "Failed to load course information.";
    } finally {
        loading.value = false;
    }
}

async function enroll() {
    if (!profile.value?.id) {
        error.value = "Please log in to enroll.";
        return;
    }

    enrolling.value = true;
    error.value = null;

    try {
        await supabaseRest("course_enrollments", {
            method: "POST",
            body: JSON.stringify({
                course_id: courseId,
                student_id: profile.value.id,
            }),
        });

        enrolled.value = true;
    } catch (err) {
        console.error("Error enrolling:", err);
        error.value = "Failed to enroll. Please try again.";
    } finally {
        enrolling.value = false;
    }
}

function goToCourse() {
    // In the future, this would go to the student's course view
    router.push("/");
}

onMounted(() => {
    fetchCourse();
});
</script>

<template>
    <div class="enroll-page">
        <div class="enroll-container">
            <!-- Loading -->
            <div v-if="loading" class="loading-state">
                <div class="spinner"></div>
                <p>Loading course information...</p>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <h2>Oops!</h2>
                <p>{{ error }}</p>
                <button @click="router.push('/')" class="secondary-btn">Go Home</button>
            </div>

            <!-- Course Info -->
            <template v-else-if="course">
                <!-- Already Enrolled -->
                <div v-if="enrolled" class="success-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <h2>You're Enrolled!</h2>
                    <p>You have successfully enrolled in <strong>{{ course.title }}</strong>.</p>
                    <button @click="goToCourse" class="primary-btn">Start Learning</button>
                </div>

                <!-- Enrollment Card -->
                <div v-else class="enrollment-card">
                    <div class="course-header">
                        <span class="course-badge">{{ course.course_code || 'Course' }}</span>
                        <h1>{{ course.title }}</h1>
                        <p class="course-instructor">
                            by {{ course.profiles?.full_name || 'Professor' }}
                            <span v-if="course.profiles?.institution">· {{ course.profiles.institution }}</span>
                        </p>
                    </div>

                    <div v-if="course.description" class="course-description">
                        <p>{{ course.description }}</p>
                    </div>

                    <div class="course-details">
                        <div v-if="course.semester" class="detail-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>{{ course.semester }}</span>
                        </div>
                    </div>

                    <div class="enrollment-actions">
                        <button @click="enroll" :disabled="enrolling" class="enroll-btn">
                            {{ enrolling ? 'Enrolling...' : 'Enroll Now' }}
                        </button>
                        <button @click="router.push('/')" class="secondary-btn">Cancel</button>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.enroll-page {
    min-height: 100vh;
    background: #0d0d0d;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}

.enroll-container {
    width: 100%;
    max-width: 560px;
}

.loading-state,
.error-state,
.success-state {
    text-align: center;
    padding: 4rem 2rem;
}

.loading-state .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: rgb(59, 130, 246);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 2rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-state p,
.error-state p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    color: #898989;
}

.error-state svg {
    color: #ef4444;
    margin-bottom: 1.6rem;
}

.error-state h2,
.success-state h2 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.4rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1rem;
}

.success-state svg {
    color: #22c55e;
    margin-bottom: 1.6rem;
}

.success-state p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    color: #898989;
    margin-bottom: 2.4rem;
}

.success-state strong {
    color: white;
}

.enrollment-card {
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 3.2rem;
}

.course-header {
    text-align: center;
    margin-bottom: 2.4rem;
}

.course-badge {
    display: inline-block;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: rgba(59, 130, 246, 0.15);
    color: rgb(59, 130, 246);
    padding: 0.4rem 1.2rem;
    border-radius: 4px;
    margin-bottom: 1.6rem;
}

.course-header h1 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.8rem;
    font-weight: 600;
    color: white;
    margin: 0 0 1rem;
}

.course-instructor {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    color: #898989;
}

.course-description {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    padding: 1.6rem;
    margin-bottom: 2.4rem;
}

.course-description p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    line-height: 1.6;
    color: #a0a0a0;
    margin: 0;
}

.course-details {
    display: flex;
    justify-content: center;
    gap: 2.4rem;
    margin-bottom: 3.2rem;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #898989;
}

.detail-item svg {
    color: #666;
}

.enrollment-actions {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.enroll-btn {
    width: 100%;
    padding: 1.6rem;
    background: rgb(59, 130, 246);
    border: none;
    border-radius: 10px;
    color: white;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.enroll-btn:hover:not(:disabled) {
    background: rgb(37, 99, 235);
}

.enroll-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.primary-btn {
    display: inline-block;
    padding: 1.4rem 3.2rem;
    background: rgb(59, 130, 246);
    border: none;
    border-radius: 10px;
    color: white;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.primary-btn:hover {
    background: rgb(37, 99, 235);
}

.secondary-btn {
    width: 100%;
    padding: 1.4rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    color: #898989;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
}

.secondary-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
    color: white;
}
</style>
