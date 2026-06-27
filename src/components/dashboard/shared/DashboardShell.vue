<script setup>
// Unified 2-column dashboard frame: sticky light rail + scrollable content.
// Owns per-role accent via [data-accent] on its root, and the responsive grid
// (mirrors SettingsView .layout). Forwards rail props + re-emits its events.
import DashboardRail from "./DashboardRail.vue";
const props = defineProps({
  navItems: { type: Array, required: true },
  activeSection: { type: String, required: true },
  displayName: { type: String, default: "Reader" },
  email: { type: String, default: "" },
  role: { type: String, default: "" },
  accent: { type: String, default: "magenta" }, // magenta | teal | amber | mono
  backLabel: { type: String, default: "Back to book" },
  backTo: { type: [String, Object], default: "/" },
  showBack: { type: Boolean, default: true },
});
defineEmits(["update:activeSection", "back"]);
// magenta is the :root default — emit no attribute for it.
const accentAttr = props.accent === "magenta" ? null : props.accent;
</script>

<template>
  <div class="shell" :data-accent="accentAttr">
    <div class="shell-layout">
      <DashboardRail
        :nav-items="navItems" :active-section="activeSection" :display-name="displayName"
        :email="email" :role="role" :back-label="backLabel" :back-to="backTo" :show-back="showBack"
        @update:active-section="$emit('update:activeSection', $event)" @back="$emit('back')"
      >
        <template v-if="$slots.user" #user><slot name="user" /></template>
        <template v-if="$slots.footer" #footer><slot name="footer" /></template>
      </DashboardRail>
      <div class="shell-content"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.shell { background: rgb(var(--color-bg)); color: rgb(var(--color-ink)); font-family: var(--font-body); min-height: 100vh; }
.shell-layout {
  display: grid; grid-template-columns: 1fr; max-width: 124rem; margin: 0 auto;
  padding: 4rem 4.8rem 9.6rem; gap: 4.8rem;
}
@media (min-width: 900px) { .shell-layout { grid-template-columns: 28rem 1fr; } }
@media (max-width: 767px) { .shell-layout { padding: 2.4rem 1.8rem 8rem; } }
.shell-content { display: flex; flex-direction: column; gap: 6.4rem; min-width: 0; }
</style>
