<script setup>
/*
 * StyleGuideView — the design-system reference ("our own Storybook").
 *
 * A sidebar shell: brand logo, then nav grouped into Foundations (Colours, Type)
 * and Components (Shared library, Reader & learning, Archived). The selected
 * section renders in the content pane. Everything is live and styled by the real
 * app cascade, so the guide can never drift from what ships.
 *
 * Single source of truth: colours + type sizes live in brand.css (--color-* /
 * --type-* tokens); the .t-* role classes in index.css. This page only exercises
 * them.
 */
import { ref, computed } from "vue";

import ColoursSection from "@/components/styleguide/ColoursSection.vue";
import TypeSection from "@/components/styleguide/TypeSection.vue";
import SharedCollection from "@/components/styleguide/SharedCollection.vue";
import BookCollection from "@/components/styleguide/BookCollection.vue";
import ArchivedCollection from "@/components/styleguide/ArchivedCollection.vue";

// Nav model — groups → items. `id` selects the rendered section.
const NAV = [
  {
    group: "Foundations",
    items: [
      { id: "colours", label: "Colours" },
      { id: "type", label: "Typography" },
    ],
  },
  {
    group: "Components",
    items: [
      { id: "shared", label: "Shared library", count: 23 },
      { id: "book", label: "Reader & learning", count: 17 },
      { id: "archived", label: "Archived", muted: true },
    ],
  },
];

const SECTIONS = {
  colours: ColoursSection,
  type: TypeSection,
  shared: SharedCollection,
  book: BookCollection,
  archived: ArchivedCollection,
};

const active = ref("colours");
const activeComponent = computed(() => SECTIONS[active.value]);

function select(id) {
  active.value = id;
  // Reset scroll to the top of the content pane on section change.
  document.querySelector(".sg-content")?.scrollTo?.({ top: 0 });
}
</script>

<template>
  <div class="sg">
    <!-- Sidebar -->
    <aside class="sg-sidebar">
      <div class="sg-brand">
        <img
          src="/publicAssets/images/logo.svg"
          alt="The Open Brain"
          class="sg-logo"
        />
        <p class="t-label sg-brand-tag">Design system</p>
      </div>

      <nav class="sg-nav">
        <div v-for="g in NAV" :key="g.group" class="sg-nav-group">
          <p class="t-label sg-nav-heading">{{ g.group }}</p>
          <button
            v-for="item in g.items"
            :key="item.id"
            class="sg-nav-item"
            :class="{ 'is-active': active === item.id, 'is-muted': item.muted }"
            @click="select(item.id)"
          >
            <span class="sg-nav-label">{{ item.label }}</span>
            <span v-if="item.count" class="sg-nav-count">{{ item.count }}</span>
          </button>
        </div>
      </nav>

      <div class="sg-foot">
        <router-link to="/" class="t-label sg-foot-link">← Back to app</router-link>
      </div>
    </aside>

    <!-- Content -->
    <main class="sg-content">
      <component :is="activeComponent" />
    </main>
  </div>
</template>

<style scoped>
.sg {
  display: grid;
  grid-template-columns: 264px 1fr;
  min-height: 100vh;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
}

/* Sidebar */
.sg-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-paper));
  border-right: 1px solid rgb(var(--color-line));
  padding: 2.5rem 1.5rem;
}
.sg-brand {
  margin-bottom: 2.5rem;
}
.sg-logo {
  width: 140px;
  height: auto;
  display: block;
}
.sg-brand-tag {
  color: rgb(var(--color-mute));
  margin-top: 1rem;
}

.sg-nav {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  flex: 1;
  overflow-y: auto;
}
.sg-nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.sg-nav-heading {
  color: rgb(var(--color-mute));
  margin-bottom: 0.5rem;
}
.sg-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 0.875rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  font-size: 1.5rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.sg-nav-item:hover {
  background: rgb(var(--color-bg));
}
.sg-nav-item.is-active {
  background: rgb(var(--color-accent) / 0.12);
  color: rgb(var(--color-accent));
  font-weight: 600;
}
.sg-nav-item.is-muted .sg-nav-label {
  color: rgb(var(--color-mute));
}
.sg-nav-count {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  background: rgb(var(--color-bg));
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
}
.sg-nav-item.is-active .sg-nav-count {
  color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.14);
}

.sg-foot {
  padding-top: 1.5rem;
  border-top: 1px solid rgb(var(--color-line));
  margin-top: 1.5rem;
}
.sg-foot-link {
  color: rgb(var(--color-mute));
  text-decoration: none;
}
.sg-foot-link:hover {
  color: rgb(var(--color-accent));
}

/* Content */
.sg-content {
  padding: 4rem 4rem 8rem;
  max-width: 1200px;
  overflow-x: hidden;
}
</style>
