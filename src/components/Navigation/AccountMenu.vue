<script setup>
/*
 * The account menu (OPENBRAIN-90): who is signed in, the way back to their
 * dashboard, settings, and log out, from anywhere it is placed (the reader's
 * top bar, the dashboards). Stuart, 24 Sep: "once I was reading chapters, I
 * couldn't figure out how to get back to the dashboard" and "nearly
 * impossible to log out". Signed out, it is a "Sign in" button that opens
 * the app's sign-in panel.
 */
import { computed, nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useAuthStore } from "@/stores/auth";
import { dashboardForRole } from "@/router/guards";

const props = defineProps({
  /** Open the menu to the left (a right-edge button) or the right. */
  align: { type: String, default: "right" },
  /** Hide "My dashboard" (on the dashboard itself). */
  hideDashboard: { type: Boolean, default: false },
});

const router = useRouter();
const authStore = useAuthStore();
const { isAuthenticated, user, profile, userRole, signOut } = useAuth();

const open = ref(false);
const button = ref(null);
const menu = ref(null);
const error = ref("");

const name = computed(
  () => profile.value?.full_name || user.value?.email || "Your account"
);
const initials = computed(() => {
  const n = profile.value?.full_name?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    return (
      parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : "")
    ).toUpperCase();
  }
  return (user.value?.email?.[0] || "?").toUpperCase();
});
const roleLabel = computed(() => {
  const r = userRole.value;
  return r ? r[0].toUpperCase() + r.slice(1) : "";
});
const dashboard = computed(() => dashboardForRole(userRole.value));

async function toggle() {
  open.value = !open.value;
  error.value = "";
  if (open.value) {
    await nextTick();
    menu.value?.querySelector("[role=menuitem]")?.focus();
  }
}
function close({ focus = true } = {}) {
  open.value = false;
  if (focus) button.value?.focus();
}
function onKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    close();
    return;
  }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();
  const items = [...(menu.value?.querySelectorAll("[role=menuitem]") || [])];
  const i = items.indexOf(document.activeElement);
  const next = e.key === "ArrowDown" ? i + 1 : i - 1;
  items[(next + items.length) % items.length]?.focus();
}

async function logOut() {
  const { error: err } = await signOut();
  if (err) {
    // Say so rather than leaving the reader signed in without knowing why.
    error.value = "Couldn't log out. Check your connection and try again.";
    console.error("[account menu] sign out failed", err);
    return;
  }
  close({ focus: false });
  router.push("/");
}
</script>

<template>
  <div class="account" @keydown="onKeydown">
    <button
      v-if="!isAuthenticated"
      type="button"
      class="account-signin"
      @click="authStore.openAuth('login')"
    >
      Sign in
    </button>

    <template v-else>
      <button
        ref="button"
        type="button"
        class="account-btn"
        :class="{ open }"
        aria-haspopup="menu"
        :aria-expanded="open"
        :aria-label="`Account: ${name}`"
        @click="toggle"
      >
        <span aria-hidden="true">{{ initials }}</span>
      </button>

      <div
        v-if="open"
        class="account-backdrop"
        aria-hidden="true"
        @click="close({ focus: false })"
      />
      <div
        v-if="open"
        ref="menu"
        class="account-menu"
        :class="`account-menu--${props.align}`"
        role="menu"
        :aria-label="name"
      >
        <div class="account-who">
          <span class="account-name">{{ name }}</span>
          <span v-if="roleLabel" class="account-role">{{ roleLabel }}</span>
        </div>
        <router-link
          v-if="!hideDashboard"
          :to="dashboard"
          class="account-item"
          role="menuitem"
          @click="close({ focus: false })"
        >
          My dashboard
        </router-link>
        <router-link
          to="/chapters"
          class="account-item"
          role="menuitem"
          @click="close({ focus: false })"
        >
          Chapters
        </router-link>
        <router-link
          to="/settings"
          class="account-item"
          role="menuitem"
          @click="close({ focus: false })"
        >
          Settings
        </router-link>
        <button
          type="button"
          class="account-item account-logout"
          role="menuitem"
          @click="logOut"
        >
          Log out
        </button>
        <p v-if="error" class="account-error" role="alert">{{ error }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.account {
  position: relative;
  flex-shrink: 0;
}
.account-btn,
.account-signin {
  display: inline-grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
}
.account-btn span {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 50%;
  font: 600 0.6875rem/1 var(--font-mono);
  letter-spacing: 0.04em;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.account-btn:hover span,
.account-btn.open span {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.account-signin {
  padding: 0 12px;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 999px;
  min-height: 32px;
  font: 0.625rem/1 var(--font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.account-signin:hover {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.account-btn:focus-visible,
.account-signin:focus-visible,
.account-item:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.account-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
}
.account-menu {
  position: absolute;
  top: calc(100% + 6px);
  z-index: 50;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  padding: 6px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: rgb(var(--color-paper));
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14);
}
.account-menu--right {
  right: 0;
}
.account-menu--left {
  left: 0;
}
.account-who {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px 10px;
  border-bottom: 1px solid rgb(var(--color-line));
  margin-bottom: 4px;
}
.account-name {
  overflow: hidden;
  font: 600 0.875rem/1.3 var(--font-ui);
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(var(--color-ink));
}
.account-role {
  font: 0.6875rem/1.3 var(--font-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.account-item {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: rgb(var(--color-ink));
  font: 0.875rem/1.3 var(--font-ui);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.account-item:hover {
  background: rgb(var(--color-ink) / 0.05);
}
.account-logout {
  margin-top: 4px;
  border-top: 1px solid rgb(var(--color-line));
  border-radius: 0 0 4px 4px;
}
.account-error {
  margin: 6px 12px 4px;
  color: rgb(var(--color-warn));
  font: 0.75rem/1.4 var(--font-ui);
}
</style>
