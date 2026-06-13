<script setup>
// The unified light rail: user card + accent-bar nav + back-link. SettingsView
// .rail aesthetic, click-to-switch (not scroll-spy). Accent inherited via
// [data-accent] on the parent shell — the rail never takes an accent value.
import { computed } from "vue";
import DashboardNavIcon from "./DashboardNavIcon.vue";
const props = defineProps({
  navItems: { type: Array, required: true }, // [{ id, label, icon?, count?, soon? }]
  activeSection: { type: String, required: true },
  displayName: { type: String, default: "Reader" },
  email: { type: String, default: "" },
  role: { type: String, default: "" },
  backLabel: { type: String, default: "Back to book" },
  backTo: { type: [String, Object], default: "/" },
  showBack: { type: Boolean, default: true },
});
defineEmits(["update:activeSection", "back"]);
const initials = computed(() => {
  const n = props.displayName || props.email || "?";
  return n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
});
const metaLine = computed(() => (props.role ? props.role.toUpperCase() : props.email));
</script>

<template>
  <aside class="rail">
    <slot name="user">
      <div class="rail-user">
        <div class="rail-avatar" aria-hidden="true">{{ initials }}</div>
        <div class="rail-name">{{ displayName }}</div>
        <div v-if="metaLine" class="rail-meta">{{ metaLine }}</div>
      </div>
    </slot>

    <nav class="rail-nav">
      <button
        v-for="item in navItems" :key="item.id" type="button"
        class="rail-link" :class="{ active: activeSection === item.id }"
        @click="$emit('update:activeSection', item.id)"
      >
        <span class="rail-bar" />
        <DashboardNavIcon v-if="item.icon" :name="item.icon" class="rail-icon" />
        <span class="rail-label">{{ item.label }}</span>
        <span v-if="item.soon" class="rail-soon">· soon</span>
        <span v-else-if="item.count != null" class="rail-count">{{ item.count }}</span>
      </button>
    </nav>

    <slot name="footer">
      <template v-if="showBack">
        <hr class="rail-rule" />
        <router-link v-if="backTo" :to="backTo" class="rail-back">← {{ backLabel }}</router-link>
        <button v-else type="button" class="rail-back" @click="$emit('back')">← {{ backLabel }}</button>
      </template>
    </slot>
  </aside>
</template>

<style scoped>
.rail { align-self: start; display: flex; flex-direction: column; gap: 4px; }
@media (min-width: 900px) { .rail { position: sticky; top: 4rem; } }
.rail-user { margin-bottom: 18px; }
.rail-avatar {
  width: 80px; height: 80px; border-radius: 999px; background: rgb(var(--color-accent));
  color: rgb(var(--color-paper)); display: grid; place-items: center;
  font-family: var(--font-mono); font-size: 2.6rem; font-weight: 600;
}
.rail-name { font-family: var(--font-body); font-size: 2.2rem; letter-spacing: -0.01em; margin-top: 14px; color: rgb(var(--color-ink)); }
.rail-meta { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-mute)); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
.rail-nav { display: flex; flex-direction: column; }
.rail-link {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 10px 0; border: 0; background: transparent; cursor: pointer; color: rgb(var(--color-mute));
}
.rail-bar { width: 4px; height: 16px; flex: none; background: transparent; transition: background 200ms ease; }
.rail-icon { flex: none; opacity: 0.7; }
.rail-label { font-family: var(--font-body); font-size: 1.5rem; font-weight: 400; flex: 1; }
.rail-soon { font-family: var(--font-mono); font-size: 1rem; color: rgb(var(--color-mute) / 0.7); }
.rail-count { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-mute)); }
.rail-link:hover { color: rgb(var(--color-ink)); }
.rail-link:hover .rail-icon { opacity: 1; }
.rail-link.active { color: rgb(var(--color-ink)); }
.rail-link.active .rail-bar { background: rgb(var(--color-accent)); }
.rail-link.active .rail-icon { opacity: 1; }
.rail-link.active .rail-label { font-weight: 500; }
.rail-rule { border: 0; border-top: 1px solid rgb(var(--color-line)); margin: 20px 0 12px; width: 100%; }
.rail-back { font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgb(var(--color-ink)); text-decoration: none; background: transparent; border: 0; cursor: pointer; text-align: left; padding: 0; }
.rail-back:hover { color: rgb(var(--color-accent)); }
</style>
