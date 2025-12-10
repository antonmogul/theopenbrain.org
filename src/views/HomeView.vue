<template>
    <main
        class="fixed top-0 left-0 w-screen h-screen bg-darker overflow-hidden"
    >
        <div
            class="h-full w-full flex flex-col justify-center items-center px-8"
        >
            <!-- Logo/Title -->
            <div class="text-center mb-12">
                <h1
                    class="text-6xl font-semibold text-violet uppercase tracking-wider mb-4"
                >
                    The<br />Open<br />Brain
                </h1>
                <p class="text-light text-xl max-w-md mx-auto">
                    An interactive journey through the visual system
                </p>
            </div>

            <!-- Chapter Selection -->
            <div class="flex flex-col gap-4 w-full max-w-md">
                <h2
                    class="text-white text-lg font-mono uppercase tracking-wide mb-2"
                >
                    Chapters
                </h2>

                <!-- Chapter 1 -->
                <router-link to="/chapter/1/the-retina" class="chapter-card">
                    <span class="chapter-number">01</span>
                    <div>
                        <h3 class="text-xl font-semibold">The Retina</h3>
                        <p class="text-light text-sm">
                            Introduction to retinal structure and function
                        </p>
                    </div>
                </router-link>

                <!-- Chapter 2 -->
                <router-link
                    to="/chapter/2/visual-perception-ux"
                    class="chapter-card"
                >
                    <span class="chapter-number">02</span>
                    <div>
                        <h3 class="text-xl font-semibold">
                            Visual Perception & UX
                        </h3>
                        <p class="text-light text-sm">
                            How we process visual information
                        </p>
                    </div>
                </router-link>
            </div>

            <!-- Quick Links -->
            <div class="mt-12 flex gap-6">
                <router-link
                    v-if="isAuthenticated"
                    to="/dashboard"
                    class="quick-link"
                >
                    Dashboard
                </router-link>
                <button v-else @click="openAuth" class="quick-link">
                    Sign In
                </button>
                <router-link to="/quiz" class="quick-link"> Quiz </router-link>
            </div>

            <!-- User Status -->
            <div v-if="isAuthenticated" class="mt-8 text-center">
                <p class="text-light text-sm">
                    Signed in as
                    <span class="text-violet">{{ user?.email }}</span>
                    <span
                        v-if="userRole"
                        class="ml-2 px-2 py-1 rounded-full text-xs font-mono uppercase"
                        :class="{
                            'bg-violet/20 text-violet': userRole === 'creator',
                            'bg-blue-500/20 text-blue-400':
                                userRole === 'professor',
                            'bg-green-500/20 text-green-400':
                                userRole === 'student',
                        }"
                    >
                        {{ userRole }}
                    </span>
                </p>
            </div>
        </div>
    </main>
</template>

<script setup>
import { useGeneral } from "@/stores/index";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";

const store = useGeneral();
const authStore = useAuthStore();
const { isAuthenticated, user, userRole } = useAuth();

const openAuth = () => {
    store.activeMenu = false;
    store.activeAbout = false;
    authStore.openAuth();
};
</script>

<style scoped>
.chapter-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    text-decoration: none;
    transition: all 0.3s;
}

.chapter-card:hover {
    background: rgba(151, 71, 255, 0.1);
    border-color: rgba(151, 71, 255, 0.5);
    transform: translateX(4px);
}

.chapter-number {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.5rem;
    font-weight: 600;
    color: rgb(151, 71, 255);
    min-width: 3rem;
}

.quick-link {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.875rem;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
    transition: all 0.3s;
    background: transparent;
    cursor: pointer;
}

.quick-link:hover {
    color: white;
    border-color: rgb(151, 71, 255);
    background: rgba(151, 71, 255, 0.1);
}
</style>
