<script setup>
// Student settings (standalone route). Sticky left rail + scroll-spy wrapper
// around the shared SettingsPanels content (Profile, Email preferences,
// Data & privacy, Account). Reading & display + Theme & accents are hidden.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useProfile } from "@/composables/useProfile";
import { useHomeRoute } from "@/composables/useHomeRoute";
import SettingsPanels from "@/components/settings/SettingsPanels.vue";

const { user, profile } = useAuth();
const { profile: liveProfile } = useProfile();
const homeRoute = useHomeRoute();

// --- Left-rail nav + scroll-spy ---
const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Email preferences" },
  { id: "data", label: "Data & privacy" },
  { id: "account", label: "Account" },
];
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
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
const railInitials = computed(() => {
  const n = displayName.value || user.value?.email || "?";
  return n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
});
</script>

<template>
  <main class="settings">
    <div class="layout">
      <!-- Left rail -->
      <aside class="rail">
        <div class="rail-user">
          <div class="rail-avatar" aria-hidden="true">{{ railInitials }}</div>
          <div class="rail-name">{{ displayName }}</div>
          <div class="rail-email">{{ user?.email }}</div>
        </div>
        <nav class="rail-nav">
          <button
            v-for="s in SECTIONS"
            :key="s.id"
            class="rail-link"
            :class="{ active: activeId === s.id }"
            @click="goTo(s.id)"
          >
            <span class="rail-bar" />
            <span class="rail-label">{{ s.label }}</span>
          </button>
        </nav>
        <hr class="rail-rule" />
        <router-link :to="homeRoute" class="rail-back">← Back to book</router-link>
      </aside>

      <!-- Content -->
      <SettingsPanels class="content" />
    </div>
  </main>
</template>

<style scoped>
/* Settings — prototype profile.jsx layout. Rail + scroll-spy + sections. */
.settings {
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  min-height: 100vh;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  max-width: 124rem;
  margin: 0 auto;
  padding: 4rem 4.8rem 9.6rem;
  gap: 4.8rem;
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: 28rem 1fr;
  }
}

/* Left rail */
.rail {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
@media (min-width: 900px) {
  .rail {
    position: sticky;
    top: 4rem;
  }
}
.rail-user {
  margin-bottom: 18px;
}
.rail-avatar {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: rgb(var(--color-complete));
  color: #0a3d33;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 2.6rem;
  font-weight: 600;
  border: 1px solid rgb(var(--color-line));
}
.rail-name {
  font-family: var(--font-body);
  font-size: 2.2rem;
  letter-spacing: -0.01em;
  margin-top: 14px;
}
.rail-email {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  margin-top: 2px;
}

.rail-nav {
  display: flex;
  flex-direction: column;
}
.rail-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: 10px 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: rgb(var(--color-mute));
}
.rail-bar {
  width: 4px;
  height: 16px;
  background: transparent;
  transition: background 200ms ease;
}
.rail-label {
  font-family: var(--font-body);
  font-size: 1.5rem;
  font-weight: 400;
}
.rail-link.active {
  color: rgb(var(--color-ink));
}
.rail-link.active .rail-bar {
  background: rgb(var(--color-accent));
}
.rail-link.active .rail-label {
  font-weight: 500;
}
.rail-rule {
  border: 0;
  border-top: 1px solid rgb(var(--color-line));
  margin: 20px 0 12px;
}
.rail-back {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-ink));
  text-decoration: none;
}
.rail-back:hover {
  color: rgb(var(--color-accent));
}

@media (max-width: 767px) {
  .layout {
    padding: 2.4rem 1.8rem 8rem;
  }
}
</style>
