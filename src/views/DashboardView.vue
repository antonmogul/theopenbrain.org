<script setup>
import { computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useRouter } from "vue-router";

const router = useRouter();
const {
    user,
    profile,
    loading,
    profileLoading,
    isAuthenticated,
    userRole,
    isCreator,
    isProfessor,
    isStudent,
    signOut,
} = useAuth();

const handleLogout = async () => {
    await signOut();
    router.push("/");
};

const roleDisplayName = computed(() => {
    switch (userRole.value) {
        case "creator":
            return "Creator";
        case "professor":
            return "Professor";
        case "student":
            return "Student";
        default:
            return "User";
    }
});

const roleDescription = computed(() => {
    switch (userRole.value) {
        case "creator":
            return "As a Creator, you can create and edit content, manage chapters, and publish educational materials.";
        case "professor":
            return "As a Professor, you can customize content for your students, track their progress, and create assignments.";
        case "student":
            return "As a Student, you can access educational content, track your progress, and complete assignments.";
        default:
            return "Welcome to The Open Brain.";
    }
});
</script>

<template>
    <main class="min-h-screen bg-darker text-white pt-24 px-12">
        <!-- Loading State -->
        <div
            v-if="loading || profileLoading"
            class="flex items-center justify-center h-[60vh]"
        >
            <div class="text-xl text-light">Loading...</div>
        </div>

        <!-- Not Authenticated -->
        <div
            v-else-if="!isAuthenticated"
            class="flex flex-col items-center justify-center h-[60vh] gap-6"
        >
            <h1 class="text-4xl font-semibold">Access Denied</h1>
            <p class="text-light text-lg">
                Please log in to access your dashboard.
            </p>
            <button
                @click="router.push('/')"
                class="uppercase bg-violet text-white font-mono px-8 py-3 rounded-full hover:bg-white hover:text-black transition-colors"
            >
                Go Home
            </button>
        </div>

        <!-- Authenticated Dashboard -->
        <div v-else class="max-w-6xl mx-auto">
            <!-- Header -->
            <header class="flex justify-between items-start mb-12">
                <div>
                    <h1 class="text-4xl font-semibold mb-2">
                        {{ roleDisplayName }} Dashboard
                    </h1>
                    <p class="text-light text-lg">
                        {{ profile?.email || user?.email }}
                    </p>
                </div>
                <button
                    @click="handleLogout"
                    class="uppercase bg-transparent border border-light text-light font-mono px-6 py-2 rounded-full hover:bg-white hover:text-black hover:border-white transition-colors"
                >
                    Log Out
                </button>
            </header>

            <!-- Role Badge -->
            <div class="mb-8">
                <span
                    class="inline-block px-4 py-2 rounded-full text-sm font-mono uppercase"
                    :class="{
                        'bg-violet/20 text-violet border border-violet':
                            isCreator,
                        'bg-blue-500/20 text-blue-400 border border-blue-400':
                            isProfessor,
                        'bg-green-500/20 text-green-400 border border-green-400':
                            isStudent,
                        'bg-gray-500/20 text-gray-400 border border-gray-400':
                            !userRole,
                    }"
                >
                    {{ userRole || "No role assigned" }}
                </span>
            </div>

            <!-- Role Description -->
            <p class="text-light text-lg mb-12 max-w-2xl">
                {{ roleDescription }}
            </p>

            <!-- Creator Dashboard -->
            <section
                v-if="isCreator"
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Content Editor</h3>
                    <p class="text-light mb-4">
                        Create and edit chapter content using the rich text
                        editor.
                    </p>
                    <button
                        @click="router.push('/editor')"
                        class="dashboard-btn-active"
                    >
                        Open Editor
                    </button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Manage Chapters</h3>
                    <p class="text-light mb-4">
                        Organize chapters, sections, and modules.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Media Library</h3>
                    <p class="text-light mb-4">
                        Upload and manage images, videos, and animations.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Preview Content</h3>
                    <p class="text-light mb-4">
                        Preview content as different user roles.
                    </p>
                    <button
                        @click="router.push('/chapter/1/the-retina')"
                        class="dashboard-btn-active"
                    >
                        View Chapter 1
                    </button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Analytics</h3>
                    <p class="text-light mb-4">
                        View content engagement and user statistics.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
            </section>

            <!-- Professor Dashboard -->
            <section
                v-else-if="isProfessor"
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">My Courses</h3>
                    <p class="text-light mb-4">
                        Manage your courses and enrolled students.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Student Progress</h3>
                    <p class="text-light mb-4">
                        Track student progress and performance.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Assignments</h3>
                    <p class="text-light mb-4">
                        Create and manage assignments for your students.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Content Library</h3>
                    <p class="text-light mb-4">
                        Browse available educational content.
                    </p>
                    <button
                        @click="router.push('/chapter/1/the-retina')"
                        class="dashboard-btn-active"
                    >
                        View Chapter 1
                    </button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Announcements</h3>
                    <p class="text-light mb-4">
                        Send announcements to your students.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
            </section>

            <!-- Student Dashboard -->
            <section
                v-else-if="isStudent"
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">My Learning</h3>
                    <p class="text-light mb-4">
                        Continue where you left off in your courses.
                    </p>
                    <button
                        @click="router.push('/chapter/1/the-retina')"
                        class="dashboard-btn-active"
                    >
                        Continue Learning
                    </button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">My Progress</h3>
                    <p class="text-light mb-4">
                        View your learning progress and achievements.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Assignments</h3>
                    <p class="text-light mb-4">
                        View and complete your assignments.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">My Notes</h3>
                    <p class="text-light mb-4">
                        Access your highlights and annotations.
                    </p>
                    <button class="dashboard-btn" disabled>Coming Soon</button>
                </div>
                <div class="dashboard-card">
                    <h3 class="text-xl font-semibold mb-3">Quizzes</h3>
                    <p class="text-light mb-4">
                        Test your knowledge with quizzes.
                    </p>
                    <button
                        @click="router.push('/quiz')"
                        class="dashboard-btn-active"
                    >
                        Take Quiz
                    </button>
                </div>
            </section>

            <!-- No Role Assigned -->
            <section v-else class="text-center py-12">
                <p class="text-light text-lg mb-6">
                    Your account doesn't have a role assigned yet. Please
                    contact an administrator.
                </p>
                <button
                    @click="router.push('/chapter/1/the-retina')"
                    class="dashboard-btn-active"
                >
                    Browse Content
                </button>
            </section>

            <!-- Profile Section -->
            <section class="mt-16 pt-12 border-t border-light/20">
                <h2 class="text-2xl font-semibold mb-6">Profile Information</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                    <div>
                        <label
                            class="text-sm uppercase font-mono text-light block mb-2"
                            >Email</label
                        >
                        <p class="text-lg">
                            {{ profile?.email || user?.email }}
                        </p>
                    </div>
                    <div>
                        <label
                            class="text-sm uppercase font-mono text-light block mb-2"
                            >Full Name</label
                        >
                        <p class="text-lg">
                            {{ profile?.full_name || "Not set" }}
                        </p>
                    </div>
                    <div>
                        <label
                            class="text-sm uppercase font-mono text-light block mb-2"
                            >Institution</label
                        >
                        <p class="text-lg">
                            {{ profile?.institution || "Not set" }}
                        </p>
                    </div>
                    <div>
                        <label
                            class="text-sm uppercase font-mono text-light block mb-2"
                            >Role</label
                        >
                        <p class="text-lg capitalize">
                            {{ userRole || "Not assigned" }}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    </main>
</template>

<style scoped>
.dashboard-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s;
}

.dashboard-card:hover {
    border-color: rgba(151, 71, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
}

.dashboard-btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.875rem;
    text-transform: uppercase;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.5);
    background: transparent;
    cursor: not-allowed;
}

.dashboard-btn-active {
    display: inline-block;
    padding: 0.5rem 1rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.875rem;
    text-transform: uppercase;
    border-radius: 9999px;
    border: 1px solid rgb(151, 71, 255);
    color: white;
    background: rgb(151, 71, 255);
    cursor: pointer;
    transition: all 0.3s;
}

.dashboard-btn-active:hover {
    background: white;
    color: black;
    border-color: white;
}
</style>
