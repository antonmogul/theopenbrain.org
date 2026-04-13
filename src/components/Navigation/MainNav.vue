<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGeneral, useText } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";
import { toSlug } from "@/helper/general.js";
import menu from "@/assets/json_backend/menu.json";

const route = useRoute();
const router = useRouter();
const store = useGeneral();
const textStore = useText();
const authStore = useAuthStore();
const {
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated,
    user,
    userRole,
    devRoleOverride,
} = useAuth();

// ── Dev mode ──
const isDev = import.meta.env.DEV;
const devRoles = ["creator", "professor", "student"];

function setDevRole(role) {
    devRoleOverride.value = role || null;

    // If on a dashboard route, navigate to the correct one for the new role
    const dashboardRoutes = ["dashboard", "student-dashboard", "professor-dashboard", "editor"];
    if (dashboardRoutes.includes(route.name)) {
        const effectiveRole = role || userRole.value;
        let target = "/dashboard";
        if (effectiveRole === "student") target = "/student";
        else if (effectiveRole === "professor") target = "/professor";
        router.push(target);
    }
}

// ── Last login ──
const lastLogin = computed(() => {
    const ts = user.value?.last_sign_in_at;
    if (!ts) return null;
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
});

// ── Nav state ──
const isOpen = computed(() => store.activeMenu);

function openNav() {
    store.activeMenu = true;
}

function closeNav() {
    store.activeMenu = false;
    store.isScrolling = true;
    setTimeout(() => {
        store.isScrolling = false;
    }, 700);
}

function toggleNav() {
    if (isOpen.value) {
        closeNav();
    } else {
        openNav();
    }
}

// ── Chapters from Supabase ──
const allModules = ref([]);
const loadingModules = ref(false);

onMounted(async () => {
    loadingModules.value = true;
    try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key =
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
            import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
            `${url}/rest/v1/modules?select=id,title,slug,order_index,status&order=order_index.asc`,
            {
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
            },
        );

        if (response.ok) {
            const data = await response.json();
            allModules.value = data || [];
        }
    } catch (err) {
        console.error("MainNav: Failed to fetch modules:", err);
    } finally {
        loadingModules.value = false;
    }
});

const allChapters = computed(() => {
    const ch1 = {
        id: "ch1",
        number: 1,
        title: "The Retina",
        slug: "the-retina",
    };
    const supaChapters = allModules.value.map((m) => ({
        id: m.id,
        number: m.order_index,
        title: m.title,
        slug: m.slug,
    }));
    return [ch1, ...supaChapters];
});

// ── Chapter sections (accordion on chapter view) ──
const expandedChapterId = ref(null);

function getSections(chapter) {
    if (chapter.number === 1) {
        return menu.Part2?.parts || [];
    }
    if (String(chapter.number) !== String(route.params.number)) {
        return null;
    }
    const sections = textStore.text?.sections || [];
    return sections.map((s) => ({ title: s.title, id: s.id }));
}

function toggleExpand(chapter) {
    expandedChapterId.value =
        expandedChapterId.value === chapter.id ? null : chapter.id;
}

function isExpanded(chapter) {
    return expandedChapterId.value === chapter.id;
}

function navigateToChapter(chapter) {
    router.push(`/chapter/${chapter.number}/${chapter.slug}`);
    closeNav();
}

function scrollToSection(sectionId) {
    const el = document.querySelector("#" + sectionId);
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    closeNav();
}

function isCurrentChapter(chapter) {
    return String(chapter.number) === String(route.params.number);
}

function isSectionActive(slug) {
    return slug === store.currentSubChapter;
}

// ── Secondary links ──
const showAbout = ref(false);

function goHome() {
    router.push("/");
    closeNav();
}

function goToDashboard() {
    const role = userRole.value;
    let target = "/dashboard";
    if (role === "student") target = "/student";
    else if (role === "professor") target = "/professor";
    router.push(target);
    closeNav();
}

// ── Auth forms ──
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

watch(
    () => authStore.authView,
    () => {
        email.value = "";
        password.value = "";
        confirmPassword.value = "";
        authStore.clearMessages();
    },
);

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
        authStore.setSuccess("Check your email for reset instructions");
    }
};

const handleLogout = async () => {
    authStore.setLoading(true);
    const { error } = await signOut();
    authStore.setLoading(false);
    if (error) {
        authStore.setError(error.message);
    } else {
        authStore.setSuccess("Logged out");
    }
};
</script>

<template>
    <!-- Hamburger / Close button -->
    <button class="nav-toggle" :class="{ open: isOpen }" @click="toggleNav()">
        <svg
            v-if="!isOpen"
            width="18"
            height="18"
            viewBox="0 0 18 14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
        >
            <line x1="1" y1="5" x2="17" y2="5" />
            <line x1="1" y1="11" x2="17" y2="11" />
        </svg>
        <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
        >
            <line x1="3" y1="3" x2="15" y2="15" />
            <line x1="15" y1="3" x2="3" y2="15" />
        </svg>
    </button>

    <!-- Overlay panel -->
    <Transition name="nav-overlay">
        <div v-if="isOpen" class="nav-overlay" @click.self="closeNav()">
            <div class="nav-panel" @click.stop>
                <div class="nav-panel__inner">
                    <!-- ═══ Chapters ═══ -->
                    <nav class="nav-chapters">
                        <div
                            v-for="chapter in allChapters"
                            :key="chapter.id"
                            class="nav-chapter"
                        >
                            <div class="nav-chapter__row">
                                <button
                                    class="nav-chapter__link"
                                    :class="{
                                        active: isCurrentChapter(chapter),
                                    }"
                                    @click="navigateToChapter(chapter)"
                                >
                                    <span class="nav-chapter__num"
                                        >{{
                                            String(chapter.number).padStart(
                                                2,
                                                "0",
                                            )
                                        }}
                                    </span>
                                    {{ chapter.title }}
                                </button>
                                <button
                                    v-if="
                                        route.name === 'chapter' &&
                                        isCurrentChapter(chapter)
                                    "
                                    class="nav-chapter__expand"
                                    @click="toggleExpand(chapter)"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        :class="{
                                            'rotate-180': isExpanded(chapter),
                                        }"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <!-- Sections accordion -->
                            <Transition name="accordion">
                                <div
                                    v-if="
                                        isExpanded(chapter) &&
                                        route.name === 'chapter'
                                    "
                                    class="nav-sections"
                                >
                                    <template
                                        v-if="getSections(chapter) === null"
                                    >
                                        <div class="nav-section nav-section--disabled">
                                            Navigate to chapter to see sections
                                        </div>
                                    </template>
                                    <template v-else>
                                        <template
                                            v-if="chapter.number === 1"
                                        >
                                            <button
                                                v-for="(
                                                    part, idx
                                                ) in getSections(chapter)"
                                                :key="part.title"
                                                class="nav-section"
                                                :class="{
                                                    active: isSectionActive(
                                                        toSlug(part.title),
                                                    ),
                                                }"
                                                @click="
                                                    scrollToSection(
                                                        toSlug(part.title),
                                                    )
                                                "
                                            >
                                                {{ part.title }}
                                            </button>
                                        </template>
                                        <template v-else>
                                            <button
                                                v-for="section in getSections(
                                                    chapter,
                                                )"
                                                :key="section.id"
                                                class="nav-section"
                                                :class="{
                                                    active: isSectionActive(
                                                        toSlug(section.title),
                                                    ),
                                                }"
                                                @click="
                                                    scrollToSection(
                                                        toSlug(section.title),
                                                    )
                                                "
                                            >
                                                {{ section.title }}
                                            </button>
                                        </template>
                                    </template>
                                </div>
                            </Transition>
                        </div>
                    </nav>

                    <!-- ═══ Secondary links ═══ -->
                    <div class="nav-links">
                        <button class="nav-link" @click="goHome()">
                            Home
                        </button>
                        <button
                            class="nav-link"
                            @click="showAbout = !showAbout"
                        >
                            About
                        </button>
                        <a
                            class="nav-link"
                            href="https://www.mcgill.ca/neuro/open-science/tanenbaum-open-science-institute-tosi"
                            target="_blank"
                            >Funding</a
                        >
                        <button class="nav-link" disabled>Contact</button>
                    </div>

                    <!-- About expandable -->
                    <Transition name="accordion">
                        <div v-if="showAbout" class="nav-about">
                            <p>
                                <em>The Open Brain</em> is an interactive, open
                                access neuroscience learning tool. Licensed
                                under
                                <a
                                    href="http://creativecommons.org/licenses/by/4.0/"
                                    target="_blank"
                                    >CC BY 4.0</a
                                >. Funded by the Tanenbaum Open Science
                                Institute at the Montreal Neurological
                                Institute, McGill University.
                            </p>
                            <p class="nav-about__credits">
                                Editor: Stuart Trenholm. Authors: Arjun
                                Krishnaswamy, Stuart Trenholm. Design: Studio
                                Malpeso. Development: Jonas von Arb. Animation:
                                Timo Rick.
                            </p>
                        </div>
                    </Transition>

                    <!-- Spacer -->
                    <div class="nav-spacer"></div>

                    <!-- ═══ Auth section ═══ -->
                    <div class="nav-auth">
                        <!-- Authenticated -->
                        <template v-if="isAuthenticated">
                            <div class="nav-auth__user">
                                <span class="nav-auth__email">{{
                                    user?.email
                                }}</span>
                                <span
                                    v-if="userRole"
                                    class="nav-auth__role"
                                    :class="`nav-auth__role--${userRole}`"
                                >
                                    {{ userRole }}
                                </span>
                            </div>
                            <p v-if="lastLogin" class="nav-auth__last-login">
                                Last login: {{ lastLogin }}
                            </p>

                            <!-- Dev role switcher -->
                            <div v-if="isDev" class="nav-auth__dev">
                                <span class="nav-auth__dev-label">DEV</span>
                                <select
                                    class="nav-auth__dev-select"
                                    :value="devRoleOverride || ''"
                                    @change="setDevRole($event.target.value)"
                                >
                                    <option value="">No override</option>
                                    <option
                                        v-for="role in devRoles"
                                        :key="role"
                                        :value="role"
                                    >
                                        {{ role }}
                                    </option>
                                </select>
                                <span
                                    v-if="devRoleOverride"
                                    class="nav-auth__dev-badge"
                                >
                                    {{ devRoleOverride }}
                                </span>
                            </div>

                            <div class="nav-auth__actions">
                                <button
                                    class="nav-auth__btn nav-auth__btn--primary"
                                    @click="goToDashboard()"
                                >
                                    Dashboard
                                </button>
                                <button
                                    class="nav-auth__btn"
                                    :disabled="authStore.authLoading"
                                    @click="handleLogout()"
                                >
                                    {{
                                        authStore.authLoading
                                            ? "..."
                                            : "Log Out"
                                    }}
                                </button>
                            </div>
                        </template>

                        <!-- Not authenticated -->
                        <template v-else>
                            <!-- Tabs -->
                            <div class="nav-auth__tabs">
                                <button
                                    class="nav-auth__tab"
                                    :class="{
                                        active:
                                            authStore.authView === 'login',
                                    }"
                                    @click="authStore.setView('login')"
                                >
                                    Login
                                </button>
                                <button
                                    class="nav-auth__tab"
                                    :class="{
                                        active:
                                            authStore.authView === 'register',
                                    }"
                                    @click="authStore.setView('register')"
                                >
                                    Sign Up
                                </button>
                            </div>

                            <!-- Login form -->
                            <form
                                v-if="authStore.authView === 'login'"
                                @submit.prevent="handleLogin"
                                class="nav-auth__form"
                            >
                                <input
                                    v-model="email"
                                    type="email"
                                    placeholder="Email"
                                    class="nav-auth__input"
                                    :disabled="authStore.authLoading"
                                />
                                <input
                                    v-model="password"
                                    type="password"
                                    placeholder="Password"
                                    class="nav-auth__input"
                                    :disabled="authStore.authLoading"
                                />
                                <button
                                    type="submit"
                                    class="nav-auth__submit"
                                    :disabled="authStore.authLoading"
                                >
                                    {{
                                        authStore.authLoading
                                            ? "..."
                                            : "Login"
                                    }}
                                </button>
                                <button
                                    type="button"
                                    class="nav-auth__forgot"
                                    @click="authStore.setView('forgot')"
                                >
                                    Forgot password?
                                </button>
                            </form>

                            <!-- Register form -->
                            <form
                                v-if="authStore.authView === 'register'"
                                @submit.prevent="handleRegister"
                                class="nav-auth__form"
                            >
                                <input
                                    v-model="email"
                                    type="email"
                                    placeholder="Email"
                                    class="nav-auth__input"
                                    :disabled="authStore.authLoading"
                                />
                                <input
                                    v-model="password"
                                    type="password"
                                    placeholder="Password (min 6 chars)"
                                    class="nav-auth__input"
                                    :disabled="authStore.authLoading"
                                />
                                <input
                                    v-model="confirmPassword"
                                    type="password"
                                    placeholder="Confirm password"
                                    class="nav-auth__input"
                                    :disabled="authStore.authLoading"
                                />
                                <button
                                    type="submit"
                                    class="nav-auth__submit"
                                    :disabled="authStore.authLoading"
                                >
                                    {{
                                        authStore.authLoading
                                            ? "..."
                                            : "Create Account"
                                    }}
                                </button>
                            </form>

                            <!-- Forgot password form -->
                            <form
                                v-if="authStore.authView === 'forgot'"
                                @submit.prevent="handleForgotPassword"
                                class="nav-auth__form"
                            >
                                <input
                                    v-model="email"
                                    type="email"
                                    placeholder="Email"
                                    class="nav-auth__input"
                                    :disabled="authStore.authLoading"
                                />
                                <button
                                    type="submit"
                                    class="nav-auth__submit"
                                    :disabled="authStore.authLoading"
                                >
                                    {{
                                        authStore.authLoading
                                            ? "..."
                                            : "Send Reset Link"
                                    }}
                                </button>
                                <button
                                    type="button"
                                    class="nav-auth__forgot"
                                    @click="authStore.setView('login')"
                                >
                                    Back to login
                                </button>
                            </form>

                            <!-- Messages -->
                            <p
                                v-if="authStore.authError"
                                class="nav-auth__msg nav-auth__msg--error"
                            >
                                {{ authStore.authError }}
                            </p>
                            <p
                                v-if="authStore.authSuccess"
                                class="nav-auth__msg nav-auth__msg--success"
                            >
                                {{ authStore.authSuccess }}
                            </p>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* ═══════════════════════════════
   MAIN NAV — full-screen overlay
   ═══════════════════════════════ */

/* ── Toggle button ── */
.nav-toggle {
    position: fixed;
    top: 2rem;
    left: 2rem;
    z-index: 200;
    width: 4.4rem;
    height: 4.4rem;
    border-radius: 12px;
    border: 1.5px solid rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #343434;
    transition: all 0.25s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.nav-toggle:hover {
    border-color: rgba(0, 0, 0, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-toggle.open {
    background: white;
    border-color: rgba(0, 0, 0, 0.2);
    z-index: 210;
}

/* ── Overlay ── */
.nav-overlay {
    position: fixed;
    inset: 0;
    z-index: 190;
    display: flex;
    align-items: stretch;
    justify-content: flex-start;
    padding: 1.2rem;
}

/* ── Panel ── */
.nav-panel {
    width: min(420px, 100%);
    height: 100%;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
    overflow-y: auto;
    overflow-x: hidden;
}

.nav-panel__inner {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 7rem 3.2rem 3.2rem;
}

/* ── Chapters ── */
.nav-chapters {
    margin-bottom: 2.4rem;
}

.nav-chapter__row {
    display: flex;
    align-items: center;
}

.nav-chapter__link {
    flex: 1;
    text-align: left;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.6rem;
    font-weight: 600;
    line-height: 1.2;
    color: #202020;
    padding: 1.2rem 0;
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.2s;
}

.nav-chapter__link:hover,
.nav-chapter__link.active {
    color: rgb(151, 71, 255);
}

.nav-chapter__num {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    font-weight: 400;
    color: #b5b5b5;
    margin-right: 1.2rem;
    vertical-align: middle;
}

.nav-chapter__expand {
    padding: 0.8rem;
    background: none;
    border: none;
    color: #b5b5b5;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-chapter__expand:hover {
    color: rgb(151, 71, 255);
}

.nav-chapter__expand svg {
    transition: transform 0.25s ease;
}

/* ── Sections (accordion) ── */
.nav-sections {
    padding: 0.4rem 0 1.2rem 3.6rem;
    border-left: 2px solid rgba(151, 71, 255, 0.2);
    margin-left: 0.8rem;
    overflow: hidden;
}

.nav-section {
    display: block;
    width: 100%;
    text-align: left;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.3rem;
    line-height: 1.4;
    color: #6a6a6a;
    padding: 0.6rem 0;
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s;
}

.nav-section:hover {
    color: rgb(151, 71, 255);
}

.nav-section.active {
    color: rgb(151, 71, 255);
    font-weight: 600;
}

.nav-section--disabled {
    color: #b5b5b5;
    font-style: italic;
    cursor: default;
    font-size: 1.2rem;
}

/* ── Secondary links ── */
.nav-links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.2rem 2rem;
    padding: 2rem 0;
    border-top: 1px solid #e8e8e8;
}

.nav-link {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #6a6a6a;
    padding: 0.8rem 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    text-decoration: none;
    transition: color 0.15s;
}

.nav-link:hover {
    color: rgb(151, 71, 255);
}

.nav-link:disabled {
    opacity: 0.4;
    cursor: default;
}

/* ── About expandable ── */
.nav-about {
    padding: 0 0 1.6rem;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    line-height: 1.6;
    color: #898989;
    overflow: hidden;
}

.nav-about a {
    color: #6a6a6a;
    text-decoration: underline;
    text-underline-offset: 2px;
}

.nav-about a:hover {
    color: rgb(151, 71, 255);
}

.nav-about__credits {
    margin-top: 1.2rem;
    font-size: 1.1rem;
    color: #b5b5b5;
}

/* ── Spacer ── */
.nav-spacer {
    flex: 1;
    min-height: 2rem;
}

/* ── Auth ── */
.nav-auth {
    border-top: 1px solid #e8e8e8;
    padding-top: 2rem;
}

.nav-auth__tabs {
    display: flex;
    gap: 0;
    margin-bottom: 1.6rem;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    overflow: hidden;
}

.nav-auth__tab {
    flex: 1;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.8rem 1.2rem;
    background: transparent;
    border: none;
    color: #898989;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-auth__tab.active {
    background: #202020;
    color: white;
}

.nav-auth__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.nav-auth__input {
    all: unset;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    padding: 1rem 0;
    border-bottom: 1px solid #dedede;
    color: #202020;
    transition: border-color 0.2s;
}

.nav-auth__input:focus {
    border-color: rgb(151, 71, 255);
}

.nav-auth__input::placeholder {
    color: #b5b5b5;
}

.nav-auth__input:disabled {
    opacity: 0.5;
}

.nav-auth__submit {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.15rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 1rem 2rem;
    border-radius: 999px;
    border: none;
    background: #202020;
    color: white;
    cursor: pointer;
    margin-top: 0.6rem;
    transition: background 0.2s;
}

.nav-auth__submit:hover {
    background: rgb(151, 71, 255);
}

.nav-auth__submit:disabled {
    opacity: 0.5;
    cursor: default;
}

.nav-auth__forgot {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.15rem;
    color: #898989;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 0.4rem 0;
    transition: color 0.15s;
}

.nav-auth__forgot:hover {
    color: rgb(151, 71, 255);
}

.nav-auth__msg {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    margin-top: 1rem;
    padding: 0.8rem 0;
}

.nav-auth__msg--error {
    color: #ef4444;
}

.nav-auth__msg--success {
    color: #22c55e;
}

/* Authenticated state */
.nav-auth__user {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 1.6rem;
    flex-wrap: wrap;
}

.nav-auth__email {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.15rem;
    color: #6a6a6a;
}

.nav-auth__role {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.25rem 0.8rem;
    border-radius: 999px;
}

.nav-auth__role--creator {
    background: rgba(151, 71, 255, 0.1);
    color: rgb(151, 71, 255);
}

.nav-auth__role--professor {
    background: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
}

.nav-auth__role--student {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
}

.nav-auth__actions {
    display: flex;
    gap: 1rem;
}

.nav-auth__btn {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.8rem 1.8rem;
    border-radius: 999px;
    border: 1px solid #dedede;
    background: transparent;
    color: #343434;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-auth__btn:hover {
    border-color: rgb(151, 71, 255);
    color: rgb(151, 71, 255);
}

.nav-auth__btn--primary {
    background: #202020;
    color: white;
    border-color: #202020;
}

.nav-auth__btn--primary:hover {
    background: rgb(151, 71, 255);
    border-color: rgb(151, 71, 255);
}

.nav-auth__btn:disabled {
    opacity: 0.5;
    cursor: default;
}

/* Last login */
.nav-auth__last-login {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.05rem;
    color: #b5b5b5;
    margin-bottom: 1.4rem;
}

/* Dev role switcher */
.nav-auth__dev {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 1.6rem;
    padding: 0.8rem 1.2rem;
    background: #f0f0f0;
    border-radius: 8px;
}

.nav-auth__dev-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    font-weight: 600;
    color: #898989;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.nav-auth__dev-select {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    padding: 0.4rem 0.8rem;
    border: 1px solid #dedede;
    border-radius: 6px;
    background: white;
    color: #343434;
    cursor: pointer;
}

.nav-auth__dev-badge {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    background: rgb(151, 71, 255);
    color: white;
}

/* ── Transitions ── */
.nav-overlay-enter-active {
    transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-overlay-leave-active {
    transition: opacity 0.25s ease;
}

.nav-overlay-enter-from,
.nav-overlay-leave-to {
    opacity: 0;
}

.nav-overlay-enter-active .nav-panel {
    animation: panel-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.nav-overlay-leave-active .nav-panel {
    animation: panel-out 0.25s ease forwards;
}

@keyframes panel-in {
    from {
        opacity: 0;
        transform: translateX(-16px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes panel-out {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(-16px);
    }
}

/* Accordion */
.accordion-enter-active,
.accordion-leave-active {
    transition: max-height 0.3s ease, opacity 0.3s ease;
    overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
    max-height: 0;
    opacity: 0;
}

.accordion-enter-to,
.accordion-leave-from {
    max-height: 2000px;
    opacity: 1;
}

/* ── Mobile ── */
@media (max-width: 479px) {
    .nav-toggle {
        top: 1.4rem;
        left: 1.4rem;
        width: 3.8rem;
        height: 3.8rem;
    }

    .nav-overlay {
        padding: 0.8rem;
    }

    .nav-panel__inner {
        padding: 6rem 2.4rem 2.4rem;
    }

    .nav-chapter__link {
        font-size: 2.2rem;
    }
}
</style>
