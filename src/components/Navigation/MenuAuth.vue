<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGeneral } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";
import UserIcon from "@/icons/custom/UserIcon.vue";
import OpenArrowIcon from "@/icons/custom/OpenArrowIcon.vue";

const route = useRoute();
const router = useRouter();
const store = useGeneral();
const authStore = useAuthStore();
const {
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated,
    user,
    profile,
    userRole,
} = useAuth();

// Form state
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

// Reset form when view changes
watch(
    () => authStore.authView,
    () => {
        email.value = "";
        password.value = "";
        confirmPassword.value = "";
        authStore.clearMessages();
    },
);

const openAuth = () => {
    store.activeMenu = false;
    store.activeAbout = false;
    authStore.openAuth();
};

const closeAuth = () => {
    authStore.closeAuth();
};

const goToDashboard = () => {
    console.log("goToDashboard clicked");
    authStore.closeAuth();
    console.log("Auth closed, navigating to /dashboard");
    router
        .push("/dashboard")
        .then(() => {
            console.log("Navigation complete");
        })
        .catch((err) => {
            console.error("Navigation error:", err);
        });
};

const handleRegister = async () => {
    if (!email.value || !password.value) {
        authStore.setError("Please fill in all fields");
        return;
    }
    if (password.value !== confirmPassword.value) {
        authStore.setError("Passwords do not match");
        return;
    }
    if (password.value.length < 6) {
        authStore.setError("Password must be at least 6 characters");
        return;
    }

    authStore.setLoading(true);
    const { data, error } = await signUp(email.value, password.value);
    authStore.setLoading(false);

    if (error) {
        authStore.setError(error.message);
    } else {
        authStore.setSuccess("Check your email to confirm your account");
        email.value = "";
        password.value = "";
        confirmPassword.value = "";
    }
};

const handleLogin = async () => {
    if (!email.value || !password.value) {
        authStore.setError("Please fill in all fields");
        return;
    }

    authStore.setLoading(true);
    const { data, error } = await signIn(email.value, password.value);
    authStore.setLoading(false);

    if (error) {
        authStore.setError(error.message);
    } else {
        authStore.setSuccess("Logged in successfully");
        setTimeout(() => {
            authStore.closeAuth();
        }, 1500);
    }
};

const handleForgotPassword = async () => {
    if (!email.value) {
        authStore.setError("Please enter your email");
        return;
    }

    authStore.setLoading(true);
    const { data, error } = await resetPassword(email.value);
    authStore.setLoading(false);

    if (error) {
        authStore.setError(error.message);
    } else {
        authStore.setSuccess(
            "Check your email for password reset instructions",
        );
    }
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
    <div
        class="fixed flex bottom-4 z-[60] text-base duration-300"
        :class="
            route.name === 'about' || store.activeAbout
                ? 'left-14'
                : authStore.activeAuth
                  ? 'left-4'
                  : route.name === 'home'
                    ? store.activeMenu
                        ? 'left-16'
                        : 'left-16'
                    : store.activeMenu
                      ? '-left-24 ml-14'
                      : 'left-[8.5rem]'
        "
    >
        <UserIcon
            v-if="!authStore.activeAuth"
            @click="openAuth()"
            class="icon iconInvert"
        />
        <OpenArrowIcon
            class="icon iconInvert z-[60]"
            v-else
            @click="closeAuth()"
        />

        <!-- Auth Panel -->
        <div
            class="fixed h-screen bg-dark text-white overflow-y-scroll overflow-x-hidden scrollbar top-0 left-0 text-medium duration-300 border-r border-violet/90"
            :class="[authStore.activeAuth ? 'w-[50vw] ml-0' : 'w-[0]']"
        >
            <div class="px-24 pt-12 pb-56 w-[50vw] max-w-[800px]">
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

                    <!-- Register Form -->
                    <section
                        v-else-if="authStore.authView === 'register'"
                        class="pb-8"
                    >
                        <form
                            @submit.prevent="handleRegister"
                            class="flex flex-col gap-6"
                        >
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-small uppercase font-mono text-light"
                                    >Email</label
                                >
                                <input
                                    v-model="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    class="auth-input"
                                    :disabled="authStore.authLoading"
                                />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-small uppercase font-mono text-light"
                                    >Password</label
                                >
                                <input
                                    v-model="password"
                                    type="password"
                                    placeholder="Min 6 characters"
                                    class="auth-input"
                                    :disabled="authStore.authLoading"
                                />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-small uppercase font-mono text-light"
                                    >Confirm Password</label
                                >
                                <input
                                    v-model="confirmPassword"
                                    type="password"
                                    placeholder="Confirm password"
                                    class="auth-input"
                                    :disabled="authStore.authLoading"
                                />
                            </div>

                            <!-- Error/Success Messages -->
                            <p
                                v-if="authStore.authError"
                                class="text-small text-red-400"
                            >
                                {{ authStore.authError }}
                            </p>
                            <p
                                v-if="authStore.authSuccess"
                                class="text-small text-green-400"
                            >
                                {{ authStore.authSuccess }}
                            </p>

                            <button
                                type="submit"
                                :disabled="authStore.authLoading"
                                class="uppercase bg-white text-black border border-white font-mono px-6 py-2 rounded-full hover:bg-violet hover:text-white hover:border-violet disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {{
                                    authStore.authLoading
                                        ? "Creating account..."
                                        : "Create Account"
                                }}
                            </button>
                        </form>

                        <div class="pt-8 text-base">
                            <p class="text-light">
                                Already have an account?
                                <button
                                    @click="authStore.setView('login')"
                                    class="text-violet hover:underline"
                                >
                                    Login
                                </button>
                            </p>
                        </div>
                    </section>

                    <!-- Login Form -->
                    <section
                        v-else-if="authStore.authView === 'login'"
                        class="pb-8"
                    >
                        <form
                            @submit.prevent="handleLogin"
                            class="flex flex-col gap-6"
                        >
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-small uppercase font-mono text-light"
                                    >Email</label
                                >
                                <input
                                    v-model="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    class="auth-input"
                                    :disabled="authStore.authLoading"
                                />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-small uppercase font-mono text-light"
                                    >Password</label
                                >
                                <input
                                    v-model="password"
                                    type="password"
                                    placeholder="Your password"
                                    class="auth-input"
                                    :disabled="authStore.authLoading"
                                />
                            </div>

                            <!-- Error/Success Messages -->
                            <p
                                v-if="authStore.authError"
                                class="text-small text-red-400"
                            >
                                {{ authStore.authError }}
                            </p>
                            <p
                                v-if="authStore.authSuccess"
                                class="text-small text-green-400"
                            >
                                {{ authStore.authSuccess }}
                            </p>

                            <button
                                type="submit"
                                :disabled="authStore.authLoading"
                                class="uppercase bg-white text-black border border-white font-mono px-6 py-2 rounded-full hover:bg-violet hover:text-white hover:border-violet disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {{
                                    authStore.authLoading
                                        ? "Logging in..."
                                        : "Login"
                                }}
                            </button>
                        </form>

                        <div class="pt-8 text-base flex flex-col gap-2">
                            <p class="text-light">
                                Don't have an account?
                                <button
                                    @click="authStore.setView('register')"
                                    class="text-violet hover:underline"
                                >
                                    Register
                                </button>
                            </p>
                            <p class="text-light">
                                <button
                                    @click="authStore.setView('forgot')"
                                    class="text-violet hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </p>
                        </div>
                    </section>

                    <!-- Forgot Password Form -->
                    <section
                        v-else-if="authStore.authView === 'forgot'"
                        class="pb-8"
                    >
                        <form
                            @submit.prevent="handleForgotPassword"
                            class="flex flex-col gap-6"
                        >
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-small uppercase font-mono text-light"
                                    >Email</label
                                >
                                <input
                                    v-model="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    class="auth-input"
                                    :disabled="authStore.authLoading"
                                />
                            </div>

                            <!-- Error/Success Messages -->
                            <p
                                v-if="authStore.authError"
                                class="text-small text-red-400"
                            >
                                {{ authStore.authError }}
                            </p>
                            <p
                                v-if="authStore.authSuccess"
                                class="text-small text-green-400"
                            >
                                {{ authStore.authSuccess }}
                            </p>

                            <button
                                type="submit"
                                :disabled="authStore.authLoading"
                                class="uppercase bg-white text-black border border-white font-mono px-6 py-2 rounded-full hover:bg-violet hover:text-white hover:border-violet disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {{
                                    authStore.authLoading
                                        ? "Sending..."
                                        : "Send Reset Link"
                                }}
                            </button>
                        </form>

                        <div class="pt-8 text-base">
                            <p class="text-light">
                                Back to
                                <button
                                    @click="authStore.setView('login')"
                                    class="text-violet hover:underline"
                                >
                                    Login
                                </button>
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.auth-input {
    all: unset;
    background: transparent;
    border-bottom: 1px solid rgb(181, 181, 181);
    padding: 0.75rem 0;
    font-size: 1.6rem;
    line-height: 2rem;
    color: white;
    transition: border-color 0.3s;
}

.auth-input:focus {
    border-color: rgb(151, 71, 255);
}

.auth-input::placeholder {
    color: rgb(137, 137, 137);
}

.auth-input:disabled {
    opacity: 0.5;
}

section {
    display: block;
    padding-bottom: 4rem;
    min-height: unset;
}

h2 {
    padding-bottom: 3rem;
}
</style>
