<script setup>
// Navigation drawer — rebuilt to the New Design Ideas prototype (NavDrawer in
// prototype.jsx): focused reading-navigator. Continue card → JUMP TO chapter
// list with progress → user footer. Auth lives in MenuAuth (opened from the
// footer's Sign in), the section accordion is dropped (covered by the reader's
// Info tab + section dots). Open state is the existing useGeneral.activeMenu so
// all current triggers (ReaderTopBar menu button, BottomNav, router) work
// unchanged. Token-driven; replaces the legacy violet MainNav.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useGeneral } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { useHomeRoute } from "@/composables/useHomeRoute";

const router = useRouter();
const store = useGeneral();
const authStore = useAuthStore();
const { user, profile, isAuthenticated, signIn, signUp, resetPassword } =
  useAuth();
const { modules, fetchCatalog } = useChapterCatalog();
const homeRoute = useHomeRoute();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// Chapter 1 is the legacy local chapter; the catalog returns Supabase chapters.
const chapters = computed(() => {
  const ch1 = { id: "ch1", order_index: 1, title: "The Retina", slug: "the-retina" };
  const supa = modules.value.filter((m) => m.order_index !== 1);
  return [ch1, ...supa].sort((a, b) => a.order_index - b.order_index);
});

// All-chapter reading progress keyed by module_id (mirrors ChaptersView).
const progressByModule = ref({});

async function loadProgress() {
  if (!user.value?.id) return;
  // Read the session token the same way the rest of the app does.
  const sessionRaw = (() => {
    try {
      const ref = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1];
      return JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || "null");
    } catch {
      return null;
    }
  })();
  const token = sessionRaw?.access_token;
  if (!token) return;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/reading_progress?user_id=eq.${user.value.id}&select=module_id,scroll_position,is_completed,last_accessed_at`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const map = {};
    for (const r of rows) map[r.module_id] = r;
    progressByModule.value = map;
  } catch (err) {
    console.warn("NavDrawer: progress fetch failed", err);
  }
}

function progressFor(mod) {
  return progressByModule.value[mod.id];
}
function percentFor(mod) {
  return Math.round(progressFor(mod)?.scroll_position || 0);
}
function statusFor(mod) {
  const p = progressFor(mod);
  if (!p) return null;
  if (p.is_completed) return "done";
  if ((p.scroll_position || 0) > 0) return "reading";
  return null;
}

// Continue = most-recently-accessed incomplete chapter.
const continueChapter = computed(() => {
  const rows = Object.values(progressByModule.value).filter(
    (r) => !r.is_completed && (r.scroll_position || 0) > 0
  );
  if (!rows.length) return null;
  rows.sort((a, b) =>
    (b.last_accessed_at || "").localeCompare(a.last_accessed_at || "")
  );
  const mod = chapters.value.find((c) => c.id === rows[0].module_id);
  if (!mod) return null;
  return { mod, percent: Math.round(rows[0].scroll_position || 0) };
});

const displayName = computed(() => profile.value?.full_name || "Reader");
const initials = computed(() => {
  const n = displayName.value || user.value?.email || "?";
  return n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
});

function close() {
  store.activeMenu = false;
}
function go(path) {
  router.push(path);
  close();
}
// In-drawer auth (restored from the old MainNav so login lives in the hamburger
// nav, not a separate screen). authStore drives which form shows + loading/error.
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const showAuth = ref(false);

function openSignIn() {
  showAuth.value = true;
  authStore.setView("login");
  authStore.setError(null);
}

async function handleLogin() {
  if (!email.value || !password.value) {
    authStore.setError("Please enter your email and password");
    return;
  }
  authStore.authLoading = true;
  const { error } = await signIn(email.value, password.value);
  authStore.authLoading = false;
  if (error) {
    authStore.setError(error.message || "Login failed");
    return;
  }
  resetAuthForm();
  close();
}

async function handleRegister() {
  if (!email.value || !password.value) {
    authStore.setError("Please enter your email and password");
    return;
  }
  if (password.value !== confirmPassword.value) {
    authStore.setError("Passwords don't match");
    return;
  }
  if (password.value.length < 6) {
    authStore.setError("Password must be at least 6 characters");
    return;
  }
  authStore.authLoading = true;
  const { error } = await signUp(email.value, password.value);
  authStore.authLoading = false;
  if (error) {
    authStore.setError(error.message || "Sign up failed");
    return;
  }
  authStore.setSuccess("Check your email to confirm your account");
  password.value = "";
  confirmPassword.value = "";
}

async function handleForgot() {
  if (!email.value) {
    authStore.setError("Please enter your email");
    return;
  }
  authStore.authLoading = true;
  const { error } = await resetPassword(email.value);
  authStore.authLoading = false;
  if (error) {
    authStore.setError(error.message || "Couldn't send reset link");
    return;
  }
  authStore.setSuccess("Check your email for reset instructions");
}

function resetAuthForm() {
  email.value = "";
  password.value = "";
  confirmPassword.value = "";
  authStore.setError(null);
}

function onKey(e) {
  if (e.key === "Escape" && store.activeMenu) close();
}

onMounted(() => {
  fetchCatalog();
  loadProgress();
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="store.activeMenu" class="nav-backdrop" @click.self="close">
        <aside class="drawer" role="dialog" aria-label="Navigation">
          <!-- Header -->
          <div class="drawer-head">
            <router-link :to="homeRoute" class="wordmark" @click="close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3 C7 7 7 17 12 21 M12 3 C17 7 17 17 12 21 M3 12 H21" />
              </svg>
              <span class="wordmark-text">the<br />open brain</span>
            </router-link>
            <button class="close-btn" type="button" title="Close" @click="close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Continue -->
          <template v-if="continueChapter">
            <p class="eyebrow">Continue</p>
            <button
              class="continue-card"
              type="button"
              @click="go(`/chapter/${continueChapter.mod.order_index}/${continueChapter.mod.slug}`)"
            >
              <span class="cover-mini" />
              <span class="continue-meta">
                <span class="continue-ch">
                  CH {{ String(continueChapter.mod.order_index).padStart(2, "0") }} ·
                  {{ continueChapter.percent }}%
                </span>
                <span class="continue-title">Resume reading</span>
              </span>
            </button>
          </template>

          <hr class="rule" />

          <!-- Jump to -->
          <p class="eyebrow">Jump to</p>
          <div class="chapter-list">
            <button
              v-for="ch in chapters"
              :key="ch.id"
              class="chapter-row"
              type="button"
              @click="go(`/chapter/${ch.order_index}/${ch.slug}`)"
            >
              <span class="ch-num">{{ String(ch.order_index).padStart(2, "0") }}</span>
              <span class="ch-title">{{ ch.title }}</span>
              <span
                v-if="statusFor(ch) === 'done'"
                class="ch-done"
                aria-label="Completed"
              >✓</span>
              <span
                v-else-if="statusFor(ch) === 'reading'"
                class="ch-pct"
              >{{ percentFor(ch) }}%</span>
            </button>
          </div>

          <hr class="rule" />

          <!-- Footer -->
          <div v-if="isAuthenticated" class="user-footer">
            <span class="avatar" aria-hidden="true">{{ initials }}</span>
            <div class="user-meta">
              <div class="user-name">{{ displayName }}</div>
              <router-link to="/settings" class="user-sub" @click="close">
                {{ user?.email }} · settings
              </router-link>
            </div>
          </div>
          <!-- Anonymous: in-drawer auth (login / register / forgot) -->
          <template v-else>
            <button
              v-if="!showAuth"
              class="signin-btn"
              type="button"
              @click="openSignIn"
            >
              Sign in
            </button>

            <div v-else class="auth">
              <div class="auth-tabs">
                <button
                  class="auth-tab"
                  :class="{ active: authStore.authView === 'login' }"
                  type="button"
                  @click="authStore.setView('login')"
                >
                  Login
                </button>
                <button
                  class="auth-tab"
                  :class="{ active: authStore.authView === 'register' }"
                  type="button"
                  @click="authStore.setView('register')"
                >
                  Sign Up
                </button>
              </div>

              <!-- Login -->
              <form
                v-if="authStore.authView === 'login'"
                class="auth-form"
                @submit.prevent="handleLogin"
              >
                <input
                  v-model="email"
                  class="auth-input"
                  type="email"
                  placeholder="Email"
                  autocomplete="email"
                  :disabled="authStore.authLoading"
                />
                <input
                  v-model="password"
                  class="auth-input"
                  type="password"
                  placeholder="Password"
                  autocomplete="current-password"
                  :disabled="authStore.authLoading"
                />
                <button
                  class="auth-submit"
                  type="submit"
                  :disabled="authStore.authLoading"
                >
                  {{ authStore.authLoading ? "…" : "Login" }}
                </button>
                <button
                  class="auth-link"
                  type="button"
                  @click="authStore.setView('forgot')"
                >
                  Forgot password?
                </button>
              </form>

              <!-- Register -->
              <form
                v-else-if="authStore.authView === 'register'"
                class="auth-form"
                @submit.prevent="handleRegister"
              >
                <input
                  v-model="email"
                  class="auth-input"
                  type="email"
                  placeholder="Email"
                  autocomplete="email"
                  :disabled="authStore.authLoading"
                />
                <input
                  v-model="password"
                  class="auth-input"
                  type="password"
                  placeholder="Password (min 6 chars)"
                  autocomplete="new-password"
                  :disabled="authStore.authLoading"
                />
                <input
                  v-model="confirmPassword"
                  class="auth-input"
                  type="password"
                  placeholder="Confirm password"
                  autocomplete="new-password"
                  :disabled="authStore.authLoading"
                />
                <button
                  class="auth-submit"
                  type="submit"
                  :disabled="authStore.authLoading"
                >
                  {{ authStore.authLoading ? "…" : "Create account" }}
                </button>
              </form>

              <!-- Forgot -->
              <form
                v-else-if="authStore.authView === 'forgot'"
                class="auth-form"
                @submit.prevent="handleForgot"
              >
                <input
                  v-model="email"
                  class="auth-input"
                  type="email"
                  placeholder="Email"
                  autocomplete="email"
                  :disabled="authStore.authLoading"
                />
                <button
                  class="auth-submit"
                  type="submit"
                  :disabled="authStore.authLoading"
                >
                  {{ authStore.authLoading ? "…" : "Send reset link" }}
                </button>
                <button
                  class="auth-link"
                  type="button"
                  @click="authStore.setView('login')"
                >
                  Back to login
                </button>
              </form>

              <p v-if="authStore.authError" class="auth-msg auth-msg--error">
                {{ authStore.authError }}
              </p>
              <p v-if="authStore.authSuccess" class="auth-msg auth-msg--ok">
                {{ authStore.authSuccess }}
              </p>
            </div>
          </template>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.4);
}

.drawer {
  width: 380px;
  max-width: 100%;
  height: 100vh;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-right: 1px solid rgb(var(--color-line));
  overflow: hidden;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wordmark {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: rgb(var(--color-ink));
}
.wordmark-text {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  line-height: 1.1;
  text-transform: lowercase;
  letter-spacing: 0.02em;
}
.close-btn {
  width: 30px;
  height: 30px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: border-color 0.12s ease;
}
.close-btn:hover {
  border-color: rgb(var(--color-ink));
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  margin: 0;
}

.rule {
  border: 0;
  border-top: 1px solid rgb(var(--color-line));
  margin: 0;
}

/* Continue card */
.continue-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s ease;
}
.continue-card:hover {
  border-color: rgb(var(--color-ink));
}
.cover-mini {
  width: 50px;
  aspect-ratio: 3 / 4;
  flex-shrink: 0;
  border-radius: 2px;
  background: linear-gradient(
    135deg,
    rgb(var(--color-accent) / 0.25),
    rgb(var(--color-complete) / 0.25)
  );
}
.continue-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.continue-ch {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: rgb(var(--color-mute));
}
.continue-title {
  font-family: var(--font-body);
  font-size: 1.6rem;
  font-weight: 500;
}

/* Jump-to chapter list */
.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: auto;
  flex: 1;
}
.chapter-row {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 12px;
  align-items: baseline;
  padding: 8px 4px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: padding-left 0.12s ease;
}
.chapter-row:hover {
  padding-left: 8px;
}
.ch-num {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
}
.ch-title {
  font-family: var(--font-body);
  font-size: 1.5rem;
}
.ch-done {
  color: rgb(var(--color-complete));
}
.ch-pct {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: rgb(var(--color-accent));
}

/* Footer */
.user-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgb(var(--color-complete));
  color: #0a3d33;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 600;
  flex-shrink: 0;
}
.user-name {
  font-family: var(--font-body);
  font-size: 1.4rem;
}
.user-sub {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: rgb(var(--color-mute));
  text-decoration: none;
}
.user-sub:hover {
  color: rgb(var(--color-accent));
}

.signin-btn {
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-ink));
  cursor: pointer;
}
.signin-btn:hover {
  background: rgb(var(--color-ink) / 0.85);
}

/* In-drawer auth (login / register / forgot) */
.auth {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.auth-tabs {
  display: flex;
  gap: 4px;
}
.auth-tab {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 8px 0;
  background: transparent;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  color: rgb(var(--color-mute));
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.auth-tab.active {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border-color: rgb(var(--color-ink));
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.auth-input {
  width: 100%;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  background: transparent;
  padding: 10px 12px;
  font-family: var(--font-body);
  font-size: 1.4rem;
  color: rgb(var(--color-ink));
  outline: none;
}
.auth-input:focus {
  border-color: rgb(var(--color-ink));
}
.auth-submit {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 11px 18px;
  border-radius: 999px;
  background: rgb(var(--color-accent));
  color: #fff;
  border: 1px solid rgb(var(--color-accent));
  cursor: pointer;
  transition: opacity 0.12s ease;
}
.auth-submit:hover:not(:disabled) {
  opacity: 0.9;
}
.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.auth-link {
  align-self: flex-start;
  background: transparent;
  border: 0;
  font-family: var(--font-mono);
  font-size: 1rem;
  color: rgb(var(--color-mute));
  cursor: pointer;
  padding: 2px 0;
}
.auth-link:hover {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}
.auth-msg {
  font-family: var(--font-mono);
  font-size: 1.05rem;
  margin: 0;
}
.auth-msg--error {
  color: rgb(var(--color-accent));
}
.auth-msg--ok {
  color: rgb(var(--color-complete));
}

/* Slide-in 320ms */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.32s ease;
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active .drawer,
  .drawer-leave-active .drawer {
    transition: none;
  }
}
</style>
