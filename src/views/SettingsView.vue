<script setup>
// Settings (standalone route). The shared dashboard shell and rail
// (OPENBRAIN-126: it had its own copy) with scroll-spy over the
// SettingsPanels sections (Profile, Email preferences, Data & privacy,
// Account). The rail's accent follows the reader's role, as on their
// dashboard; its Log out is off because the Account section has Sign out.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useProfile } from "@/composables/useProfile";
import { useHomeRoute } from "@/composables/useHomeRoute";
import DashboardShell from "@/components/dashboard/shared/DashboardShell.vue";
import SettingsPanels from "@/components/settings/SettingsPanels.vue";
import { isBetaHidden } from "@/constants/beta";

const { user, profile } = useAuth();
const { profile: liveProfile } = useProfile();
const homeRoute = useHomeRoute();

// --- Rail nav + scroll-spy ---
const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Email preferences" },
  { id: "data", label: "Data & privacy" },
  { id: "account", label: "Account" },
].filter((s) => !isBetaHidden(`settings.${s.id}`));
const activeId = ref("profile");

function onScroll() {
  let current = SECTIONS[0].id;
  for (const s of SECTIONS) {
    const el = document.getElementById(s.id);
    if (el && el.getBoundingClientRect().top <= 140) current = s.id;
  }
  activeId.value = current;
}
function goTo(id) {
  activeId.value = id;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

// --- Rail user card ---
const displayName = computed(
  () => liveProfile.value?.full_name || profile.value?.full_name || "Reader"
);
// The same accent as the reader's own dashboard (DashboardShell `accent`).
const ROLE_ACCENT = { student: "teal", professor: "amber", creator: "magenta" };
const accent = computed(() => ROLE_ACCENT[profile.value?.role] || "magenta");
</script>

<template>
  <DashboardShell
    :nav-items="SECTIONS"
    :active-section="activeId"
    :display-name="displayName"
    :email="user?.email"
    :accent="accent"
    :back-to="homeRoute"
    back-label="Back to book"
    :show-logout="false"
    @update:active-section="goTo"
  >
    <SettingsPanels class="settings-content" />
  </DashboardShell>
</template>

<style scoped>
/* The settings column keeps its reading width inside the wider shell. */
.settings-content {
  max-width: 57rem;
}
</style>
