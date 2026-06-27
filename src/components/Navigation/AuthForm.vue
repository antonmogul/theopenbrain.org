<script setup>
// Shared auth form (login / register / forgot) extracted from NavDrawer.vue and
// MenuAuth.vue (audit #19). Both parents previously duplicated the same three
// forms + validation, which had drifted (different copy, same logic). This is
// the single source of truth for the form markup, validation, and the
// signIn / signUp / resetPassword calls. Parents control which view shows
// (via authStore.authView) and own their surrounding chrome + post-success
// behavior, reacting to the success events this component emits.
//
// `variant` swaps the visual skin so each parent keeps its identity:
//   - "drawer"  -> token-driven styling used inside NavDrawer
//   - "panel"   -> Tailwind dark/violet styling used inside MenuAuth
//
// Validation reconciliation (drift unified to the stricter / clearer copy):
//   - empty fields:     "Please fill in all fields"   (was NavDrawer:
//                       "Please enter your email and password")
//   - password mismatch:"Passwords do not match"       (was NavDrawer:
//                       "Passwords don't match")
//   - min length:       ">= 6 chars" — identical in both, preserved.
//   - forgot empty:     "Please enter your email" — identical in both.
import { ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";

const props = defineProps({
  // Which form to render. Mirrors authStore.authView so parents stay in control.
  view: {
    type: String,
    default: "login",
    validator: (v) => ["login", "register", "forgot"].includes(v),
  },
  // Visual skin: "drawer" (NavDrawer tokens) or "panel" (MenuAuth Tailwind).
  variant: {
    type: String,
    default: "drawer",
    validator: (v) => ["drawer", "panel"].includes(v),
  },
});

const emit = defineEmits([
  "login-success",
  "register-success",
  "forgot-success",
  "set-view",
]);

const authStore = useAuthStore();
const { signIn, signUp, resetPassword } = useAuth();

const email = ref("");
const password = ref("");
const confirmPassword = ref("");

// Reset fields + clear messages whenever the active view changes (mirrors the
// watch that previously lived in MenuAuth; NavDrawer reset on submit/close).
watch(
  () => props.view,
  () => {
    email.value = "";
    password.value = "";
    confirmPassword.value = "";
    authStore.clearMessages();
  },
);

function resetFields() {
  email.value = "";
  password.value = "";
  confirmPassword.value = "";
}

async function handleLogin() {
  if (!email.value || !password.value) {
    authStore.setError("Please fill in all fields");
    return;
  }
  authStore.setLoading(true);
  const { error } = await signIn(email.value, password.value);
  authStore.setLoading(false);
  if (error) {
    authStore.setError(error.message || "Login failed");
    return;
  }
  emit("login-success");
}

async function handleRegister() {
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
  const { error } = await signUp(email.value, password.value);
  authStore.setLoading(false);
  if (error) {
    authStore.setError(error.message || "Sign up failed");
    return;
  }
  authStore.setSuccess("Check your email to confirm your account");
  resetFields();
  emit("register-success");
}

async function handleForgot() {
  if (!email.value) {
    authStore.setError("Please enter your email");
    return;
  }
  authStore.setLoading(true);
  const { error } = await resetPassword(email.value);
  authStore.setLoading(false);
  if (error) {
    authStore.setError(error.message || "Couldn't send reset link");
    return;
  }
  authStore.setSuccess("Check your email for password reset instructions");
  emit("forgot-success");
}
</script>

<template>
  <!-- DRAWER VARIANT (token-driven, used by NavDrawer) -->
  <div v-if="variant === 'drawer'" class="af-drawer">
    <!-- Login -->
    <form
      v-if="view === 'login'"
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
      <button class="auth-link" type="button" @click="emit('set-view', 'forgot')">
        Forgot password?
      </button>
    </form>

    <!-- Register -->
    <form
      v-else-if="view === 'register'"
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
      v-else-if="view === 'forgot'"
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
      <button class="auth-link" type="button" @click="emit('set-view', 'login')">
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

  <!-- PANEL VARIANT (Tailwind dark/violet, used by MenuAuth) -->
  <div v-else class="af-panel">
    <!-- Register -->
    <section v-if="view === 'register'" class="pb-8">
      <form @submit.prevent="handleRegister" class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <label class="text-small uppercase font-mono text-light">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="auth-input"
            :disabled="authStore.authLoading"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-small uppercase font-mono text-light">Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Min 6 characters"
            class="auth-input"
            :disabled="authStore.authLoading"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-small uppercase font-mono text-light"
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

        <p v-if="authStore.authError" class="text-small text-red-400">
          {{ authStore.authError }}
        </p>
        <p v-if="authStore.authSuccess" class="text-small text-green-400">
          {{ authStore.authSuccess }}
        </p>

        <button
          type="submit"
          :disabled="authStore.authLoading"
          class="uppercase bg-white text-black border border-white font-mono px-6 py-2 rounded-full hover:bg-violet hover:text-white hover:border-violet disabled:opacity-50 disabled:pointer-events-none"
        >
          {{ authStore.authLoading ? "Creating account..." : "Create Account" }}
        </button>
      </form>

      <div class="pt-8 text-base">
        <p class="text-light">
          Already have an account?
          <button
            @click="emit('set-view', 'login')"
            class="text-violet hover:underline"
          >
            Login
          </button>
        </p>
      </div>
    </section>

    <!-- Login -->
    <section v-else-if="view === 'login'" class="pb-8">
      <form @submit.prevent="handleLogin" class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <label class="text-small uppercase font-mono text-light">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="auth-input"
            :disabled="authStore.authLoading"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-small uppercase font-mono text-light">Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Your password"
            class="auth-input"
            :disabled="authStore.authLoading"
          />
        </div>

        <p v-if="authStore.authError" class="text-small text-red-400">
          {{ authStore.authError }}
        </p>
        <p v-if="authStore.authSuccess" class="text-small text-green-400">
          {{ authStore.authSuccess }}
        </p>

        <button
          type="submit"
          :disabled="authStore.authLoading"
          class="uppercase bg-white text-black border border-white font-mono px-6 py-2 rounded-full hover:bg-violet hover:text-white hover:border-violet disabled:opacity-50 disabled:pointer-events-none"
        >
          {{ authStore.authLoading ? "Logging in..." : "Login" }}
        </button>
      </form>

      <div class="pt-8 text-base flex flex-col gap-2">
        <p class="text-light">
          Don't have an account?
          <button
            @click="emit('set-view', 'register')"
            class="text-violet hover:underline"
          >
            Register
          </button>
        </p>
        <p class="text-light">
          <button
            @click="emit('set-view', 'forgot')"
            class="text-violet hover:underline"
          >
            Forgot password?
          </button>
        </p>
      </div>
    </section>

    <!-- Forgot Password -->
    <section v-else-if="view === 'forgot'" class="pb-8">
      <form @submit.prevent="handleForgot" class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <label class="text-small uppercase font-mono text-light">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="auth-input"
            :disabled="authStore.authLoading"
          />
        </div>

        <p v-if="authStore.authError" class="text-small text-red-400">
          {{ authStore.authError }}
        </p>
        <p v-if="authStore.authSuccess" class="text-small text-green-400">
          {{ authStore.authSuccess }}
        </p>

        <button
          type="submit"
          :disabled="authStore.authLoading"
          class="uppercase bg-white text-black border border-white font-mono px-6 py-2 rounded-full hover:bg-violet hover:text-white hover:border-violet disabled:opacity-50 disabled:pointer-events-none"
        >
          {{ authStore.authLoading ? "Sending..." : "Send Reset Link" }}
        </button>
      </form>

      <div class="pt-8 text-base">
        <p class="text-light">
          Back to
          <button
            @click="emit('set-view', 'login')"
            class="text-violet hover:underline"
          >
            Login
          </button>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---- Drawer variant (token-driven, copied from NavDrawer) ---- */
.af-drawer {
  display: contents;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.af-drawer .auth-input {
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
.af-drawer .auth-input:focus {
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

/* ---- Panel variant (Tailwind dark/violet, copied from MenuAuth) ---- */
/* Scoped to .af-panel so the base `all: unset` can't bleed onto the drawer
   variant's inputs (which carry their own .af-drawer .auth-input rules). */
.af-panel .auth-input {
  all: unset;
  background: transparent;
  border-bottom: 1px solid rgb(181, 181, 181);
  padding: 0.75rem 0;
  font-size: 1.6rem;
  line-height: 2rem;
  color: white;
  transition: border-color 0.3s;
}
.af-panel .auth-input:focus {
  border-color: rgb(151, 71, 255);
}
.af-panel .auth-input::placeholder {
  color: rgb(137, 137, 137);
}
.af-panel .auth-input:disabled {
  opacity: 0.5;
}
section {
  display: block;
  padding-bottom: 4rem;
  min-height: unset;
}
</style>
