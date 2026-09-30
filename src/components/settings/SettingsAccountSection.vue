<script setup>
// Account section (prototype profile.jsx §06). Change-password is functional via
// useAuth.updatePassword(); 2FA / connected accounts / subscription and the
// danger-zone delete are presentational for this reskin (clearly marked). Sign
// out is functional.
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { isBetaHidden } from "@/constants/beta";
import FormField from "@/components/dashboard/shared/FormField.vue";
import Button from "@/components/dashboard/shared/Button.vue";

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

// Presentational rows (no backend in this reskin). Hidden for the beta along
// with the danger zone, so every control on the page does what it says.
const showExtras = !isBetaHidden("settings.account-extras");
// Section numbers follow what's shown: Profile, [Email, Data,] Account.
const eyebrowNumber = isBetaHidden("settings.notifications") ? "02" : "04";

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
      <p class="eyebrow">{{ eyebrowNumber }} · Account</p>
      <h2>{{ showExtras ? "Sign-in & subscription" : "Sign-in" }}</h2>
    </header>

    <div class="rows-card">
      <!-- Change password (functional) -->
      <div class="row">
        <div class="row-text">
          <div class="row-label">Change password</div>
          <div class="row-hint">Use at least 8 characters.</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="showPasswordForm = !showPasswordForm"
        >
          {{ showPasswordForm ? "Close" : "Update" }}
        </Button>
      </div>
      <div v-if="showPasswordForm" class="pw-form">
        <FormField label="New password">
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
          />
        </FormField>
        <FormField label="Confirm new password">
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
          />
        </FormField>
        <div class="pw-actions">
          <Button
            variant="solid"
            :loading="pwStatus === 'saving'"
            @click="changePassword"
          >
            {{ pwStatus === "saving" ? "Saving…" : "Save password" }}
          </Button>
          <span v-if="pwStatus === 'done'" class="pw-status ok"
            >✓ Password updated</span
          >
          <span v-else-if="pwStatus === 'mismatch'" class="pw-status warn"
            >Passwords don't match</span
          >
          <span v-else-if="pwStatus === 'error'" class="pw-status warn"
            >Couldn't update — try again</span
          >
        </div>
      </div>

      <!-- Presentational rows -->
      <template v-if="showExtras">
        <div v-for="r in presentationalRows" :key="r.label" class="row">
          <div class="row-text">
            <div class="row-label">{{ r.label }}</div>
            <div class="row-hint">{{ r.hint }}</div>
          </div>
          <Button variant="outline" size="sm" disabled>{{ r.action }}</Button>
        </div>
      </template>
    </div>

    <!-- Danger zone (presentational delete) -->
    <div v-if="showExtras" class="danger-zone">
      <p class="danger-eyebrow">● Danger zone</p>
      <div class="danger-row">
        <div>
          <div class="row-label">Delete account</div>
          <div class="row-hint">
            Permanently removes your highlights, notes, and progress. This can't
            be undone.
          </div>
        </div>
        <Button variant="danger" size="sm" disabled>Delete</Button>
      </div>
    </div>

    <Button variant="outline" class="signout" @click="handleSignOut">
      Sign out
    </Button>
  </section>
</template>

<style scoped>
.section-header {
  margin-bottom: 28px;
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  margin: 0 0 10px;
}
.section-header h2 {
  font-family: var(--font-body);
  font-size: var(--ui-size-32);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.012em;
  margin: 0;
}

.rows-card {
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
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
  font-size: var(--ui-size-15);
  color: rgb(var(--color-ink));
}
.row-hint {
  font-family: var(--font-body);
  font-size: var(--ui-size-13);
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
.pw-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pw-status {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
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
  border-radius: var(--radius-control);
}
.danger-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
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
</style>
