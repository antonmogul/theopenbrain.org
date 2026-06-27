<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";
import AuthForm from "@/components/Navigation/AuthForm.vue";
const router = useRouter();
const authStore = useAuthStore();
const { signOut, isAuthenticated, user, userRole } = useAuth();

// The login/register/forgot forms + validation + auth calls live in the shared
// AuthForm (audit #19). This panel owns the surrounding chrome, the
// authenticated/account view, logout, and the post-login behavior (show a
// success note then auto-close).

const closeAuth = () => {
    authStore.closeAuth();
};

// Preserve MenuAuth's original post-login behavior: success note then close.
const onAuthLogin = () => {
    authStore.setSuccess("Logged in successfully");
    setTimeout(() => {
        authStore.closeAuth();
    }, 1500);
};

const goToDashboard = () => {
    authStore.closeAuth();

    // Route to the correct dashboard based on role
    const role = userRole.value;
    let target = "/dashboard";
    if (role === "student") target = "/student";
    else if (role === "professor") target = "/professor";

    router.push(target).catch((err) => {
        console.error("Navigation error:", err);
    });
};

const handleLogout = async () => {
    authStore.setLoading(true);
    const { error } = await signOut();
    authStore.setLoading(false);

    if (error) {
        authStore.setError(error.message);
    } else {
        authStore.setSuccess("Logged out successfully");
    }
};

const viewTitle = computed(() => {
    if (isAuthenticated.value) return "Account";
    switch (authStore.authView) {
        case "login":
            return "Login";
        case "forgot":
            return "Reset Password";
        default:
            return "Register";
    }
});
</script>

<template>
    <div>
        <!-- Backdrop overlay - click to close -->
        <div
            v-if="authStore.activeAuth"
            class="fixed inset-0 z-[55] cursor-pointer"
            @click="closeAuth()"
        />

        <!-- Auth Panel -->
        <div
            class="fixed h-screen bg-dark text-white overflow-y-scroll overflow-x-hidden scrollbar top-0 left-0 z-[56] text-medium duration-300 border-r border-violet/90"
            :class="[authStore.activeAuth ? 'w-full md:max-w-[480px] xl:w-[50vw] xl:max-w-none ml-0' : 'w-[0]']"
        >
            <div class="px-8 xl:px-24 pt-12 pb-56 w-full max-w-[800px]">
                <div class="font-sans">
                    <h2 class="text-white">{{ viewTitle }}</h2>

                    <!-- Authenticated View -->
                    <section v-if="isAuthenticated" class="pb-8">
                        <p class="text-base pb-4">
                            Logged in as:
                            <span class="text-violet">{{ user?.email }}</span>
                        </p>
                        <p v-if="userRole" class="text-base pb-6">
                            Role:
                            <span
                                class="inline-block px-3 py-1 rounded-full text-sm font-mono uppercase ml-2"
                                :class="{
                                    'bg-violet/20 text-violet':
                                        userRole === 'creator',
                                    'bg-blue-500/20 text-blue-400':
                                        userRole === 'professor',
                                    'bg-green-500/20 text-green-400':
                                        userRole === 'student',
                                }"
                            >
                                {{ userRole }}
                            </span>
                        </p>
                        <div class="flex gap-4">
                            <button
                                @click="goToDashboard"
                                class="uppercase bg-violet text-white border border-violet font-mono px-6 py-2 rounded-full hover:bg-white hover:text-black hover:border-white"
                            >
                                Dashboard
                            </button>
                            <button
                                @click="handleLogout"
                                :disabled="authStore.authLoading"
                                class="uppercase bg-transparent text-white border border-light font-mono px-6 py-2 rounded-full hover:bg-white hover:text-black hover:border-white disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {{ authStore.authLoading ? "..." : "Log Out" }}
                            </button>
                        </div>
                    </section>

                    <!-- Login / Register / Forgot forms (shared AuthForm) -->
                    <AuthForm
                        v-else
                        variant="panel"
                        :view="authStore.authView"
                        @set-view="authStore.setView"
                        @login-success="onAuthLogin"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
section {
    display: block;
    padding-bottom: 4rem;
    min-height: unset;
}

h2 {
    padding-bottom: 3rem;
}
</style>
