<script setup>
// Account section (prototype profile.jsx §06). Change-password is functional via
// useAuth.updatePassword(); 2FA / connected accounts / subscription and the
// danger-zone delete are presentational for this reskin (clearly marked). Sign
// out is functional.
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const router = useRouter();
const { signOut, updatePassword } = useAuth();

const showPasswordForm = ref(false);
const newPassword = ref("");
const confirmPassword = ref("");
const pwStatus = ref(null); // null | 'saving' | 'done' | 'error' | 'mismatch'

async function changePassword() {
  if (newPassword.value.length < 8) {
    pwStatus.value = "error";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    pwStatus.value = "mismatch";
    return;
  }
  pwStatus.value = "saving";
  const result = await updatePassword(newPassword.value);
  if (result?.error) {
    pwStatus.value = "error";
    return;
  }
  pwStatus.value = "done";
  newPassword.value = "";
  confirmPassword.value = "";
  setTimeout(() => {
    showPasswordForm.value = false;
    pwStatus.value = null;
  }, 1800);
}

// Presentational rows (no backend in this reskin).
const presentationalRows = [
  {
    label: "Two-factor authentication",
    hint: "Off — recommended on for shared devices.",
    action: "Enable",
  },
  {
    label: "Connected accounts",
    hint: "Google, ORCID",
    action: "Manage",
  },
  {
    label: "Subscription",
    hint: "Free tier — Open Brain is free forever, no paywall.",
    action: "Sponsor",
  },
];

async function handleSignOut() {
  await signOut();
  router.push("/");
}
</script>

<template>
  <section id="account" class="section">
    <header class="section-header">
      <p class="eyebrow">06 · Account</p>
      <h2>Sign-in &amp; subscription</h2>
    </header>

    <div class="rows-card">
      <!-- Change password (functional) -->
      <div class="row">
        <div class="row-text">
          <div class="row-label">Change password</div>
          <div class="row-hint">Use at least 8 characters.</div>
        </div>
        <button
          class="btn"
          type="button"
          @click="showPasswordForm = !showPasswordForm"
        >
          {{ showPasswordForm ? "Close" : "Update" }}
        </button>
      </div>

      <div v-if="showPasswordForm" class="pw-form">
        <input
          v-model="newPassword"
          class="input"
          type="password"
          placeholder="New password"
          autocomplete="new-password"
        />
        <input
          v-model="confirmPassword"
          class="input"
          type="password"
          placeholder="Confirm new password"
          autocomplete="new-password"
        />
        <div class="pw-actions">
          <button class="btn-solid" type="button" @click="changePassword">
            {{ pwStatus === "saving" ? "Saving…" : "Save password" }}
          </button>
          <span
            v-if="pwStatus === 'done'"
            class="pw-status ok"
          >✓ Password updated</span>
          <span
            v-else-if="pwStatus === 'mismatch'"
            class="pw-status warn"
          >Passwords don't match</span>
          <span
            v-else-if="pwStatus === 'error'"
            class="pw-status warn"
          >Couldn't update — try again</span>
        </div>
      </div>

      <!-- Presentational rows -->
      <div v-for="r in presentationalRows" :key="r.label" class="row">
        <div class="row-text">
          <div class="row-label">{{ r.label }}</div>
          <div class="row-hint">{{ r.hint }}</div>
        </div>
        <button class="btn" type="button" disabled>{{ r.action }}</button>
      </div>
    </div>

    <!-- Danger zone (presentational delete) -->
    <div class="danger-zone">
      <p class="danger-eyebrow">● Danger zone</p>
      <div class="danger-row">
        <div>
          <div class="row-label">Delete account</div>
          <div class="row-hint">
            Permanently removes your highlights, notes, and progress. This can't
            be undone.
          </div>
        </div>
        <button class="btn-danger" type="button" disabled>Delete</button>
      </div>
    </div>

    <button class="btn-ghost signout" type="button" @click="handleSignOut">
      Sign out
    </button>
  </section>
</template>

<style scoped>
.section-header {
  margin-bottom: 28px;
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  margin: 0 0 10px;
}
.section-header h2 {
  font-family: var(--font-body);
  font-size: 3.2rem;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.012em;
  margin: 0;
}

.rows-card {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  overflow: hidden;
  background: rgb(var(--color-paper));
}
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.rows-card .row:last-child {
  border-bottom: 0;
}
.row-label {
  font-family: var(--font-body);
  font-size: 1.5rem;
  color: rgb(var(--color-ink));
}
.row-hint {
  font-family: var(--font-body);
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
  margin-top: 2px;
  line-height: 1.45;
}

.pw-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.input {
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
.input:focus {
  border-color: rgb(var(--color-ink));
}
.pw-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pw-status {
  font-family: var(--font-mono);
  font-size: 1.1rem;
}
.pw-status.ok {
  color: rgb(var(--color-complete));
}
.pw-status.warn {
  color: rgb(var(--color-accent));
}

.danger-zone {
  margin-top: 32px;
  padding: 20px 24px;
  border: 1px solid rgb(var(--color-accent) / 0.4);
  background: rgb(var(--color-accent) / 0.06);
  border-radius: 4px;
}
.danger-eyebrow {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-accent));
  margin: 0 0 8px;
}
.danger-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
}

.signout {
  margin-top: 28px;
}

.btn,
.btn-solid,
.btn-ghost,
.btn-danger {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  border-radius: 999px;
  padding: 6px 14px;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.btn {
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
}
.btn:hover:not(:disabled) {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.btn-solid {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-ink));
  padding: 8px 16px;
}
.btn-ghost {
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
}
.btn-ghost:hover {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.btn-danger {
  background: transparent;
  color: rgb(var(--color-accent));
  border: 1px solid rgb(var(--color-accent));
}
.btn:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
