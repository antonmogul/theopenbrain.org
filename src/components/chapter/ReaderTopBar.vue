<script setup>
import { ref, computed } from "vue";
import { useGeneral } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import { useHomeRoute } from "@/composables/useHomeRoute";

const props = defineProps({
  chapterTitle: {
    type: String,
    default: "",
  },
  chapterNumber: {
    type: String,
    default: "",
  },
  sections: {
    type: Array,
    default: () => [],
  },
});

const store = useGeneral();
const {
  toggle: toggleSidebar,
  isOpen: sidebarOpen,
  activeTab,
} = useReaderSidebar();

// Wordmark routes to the library when signed-in, marketing home otherwise
// (also wires the long-parked Track 4 D4 gap).
const homeRoute = useHomeRoute();

// Panel tool buttons (Info / Notebook / Chat) — share the floating-panel toggle.
const panelTabs = [
  { key: "info", label: "Info" },
  { key: "notebook", label: "Notebook" },
  { key: "chat", label: "Chat" },
];

// A tool button is "active" only when the panel is open AND showing that tab.
function isPanelTabActive(key) {
  return sidebarOpen.value && activeTab.value === key;
}

const showDropdown = ref(false);

const progressPercent = computed(() => store.progress * 100);

// Find the current active section title
const currentSectionTitle = computed(() => {
  if (!store.currentSubChapter || !props.sections.length) return null;
  const match = props.sections.find((s) => s.slug === store.currentSubChapter);
  return match?.title || null;
});

function scrollToSection(slug) {
  const el = document.querySelector("#" + slug);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  showDropdown.value = false;
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

// Close dropdown on outside click
function onBackdropClick() {
  showDropdown.value = false;
}
</script>

<template>
  <div class="reader-top-bar" data-testid="reader-top-bar">
    <!-- Progress bar (kept along the top edge) -->
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: progressPercent + '%' }"
      ></div>
    </div>

    <!-- Single app-bar row (prototype AppBar) -->
    <div class="bar-row">
      <!-- Menu -->
      <button class="icon-btn" title="Menu" @click="store.activeMenu = true">
        <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" fill="none">
          <path d="M2 4h10M2 7h10M2 10h10" />
        </svg>
      </button>

      <!-- Wordmark -->
      <router-link :to="homeRoute" class="wordmark" title="The Open Brain">
        <svg class="wordmark-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3 C7 7 7 17 12 21 M12 3 C17 7 17 17 12 21 M3 12 H21" />
        </svg>
        <span class="wordmark-text">the open brain</span>
      </router-link>

      <div class="divider"></div>

      <!-- Chapter + section (section is click-to-jump) -->
      <span class="chapter-eyebrow">Ch {{ chapterNumber }}</span>
      <button
        v-if="currentSectionTitle"
        class="section-jump"
        :class="{ open: showDropdown }"
        @click="toggleDropdown"
      >
        <span class="section-name">{{ currentSectionTitle }}</span>
        <svg
          class="chevron"
          :class="{ rotated: showDropdown }"
          xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="spacer"></div>

      <!-- Panel tool buttons -->
      <div class="tool-buttons">
        <button
          v-for="t in panelTabs"
          :key="t.key"
          class="tool-btn"
          :class="{ active: isPanelTabActive(t.key) }"
          @click="toggleSidebar(t.key)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Section dropdown -->
    <Transition name="dropdown">
      <div v-if="showDropdown" class="section-dropdown">
        <button
          v-for="(section, idx) in sections"
          :key="section.slug"
          class="dropdown-item"
          :class="{ active: store.currentSubChapter === section.slug }"
          @click="scrollToSection(section.slug)"
        >
          <span class="dropdown-num">{{ idx + 1 }}</span>
          <span class="dropdown-title">{{ section.title }}</span>
        </button>
      </div>
    </Transition>

    <!-- Backdrop for dropdown -->
    <div v-if="showDropdown" class="dropdown-backdrop" @click="onBackdropClick"></div>
  </div>
</template>

<style scoped>
/* Reader app bar — prototype AppBar: single row, paper, bottom hairline,
   wordmark + chapter/section + tool buttons. Progress track kept on top edge. */
.reader-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  /* The bar sizes to its content; the token (brand.css) is tuned to match this
     rendered height so the figure pane / prose offsets stay aligned. Use a
     box that exactly fits: progress track (2px) + bar-row content. */
  z-index: 45;
  background: rgb(var(--color-paper));
  border-bottom: 1px solid rgb(var(--color-line));
  color: rgb(var(--color-ink));
}

/* Progress bar — thin strip along the very top edge */
.progress-track {
  height: 2px;
  background: rgb(var(--color-ink) / 0.06);
}

.progress-fill {
  height: 100%;
  background: rgb(var(--color-accent));
  transition: width 0.15s ease;
}

/* Single bar row */
.bar-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 18px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: border-color 0.12s ease;
}

.icon-btn:hover {
  border-color: rgb(var(--color-ink));
}

/* Wordmark */
.wordmark {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: rgb(var(--color-ink));
  flex-shrink: 0;
}

.wordmark-logo {
  flex-shrink: 0;
}

.wordmark-text {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  line-height: 1.4;
  text-transform: lowercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.divider {
  width: 1px;
  height: 18px;
  background: rgb(var(--color-line));
  flex-shrink: 0;
}

.chapter-eyebrow {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
  flex-shrink: 0;
}

/* Section jump (keeps the click-to-jump dropdown affordance) */
.section-jump {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-ink));
  transition: background 0.12s ease;
  min-width: 0;
}

.section-jump:hover,
.section-jump.open {
  background: rgb(var(--color-ink) / 0.05);
}

.section-name {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: rgb(var(--color-mute));
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.spacer {
  flex: 1;
}

/* Tool buttons (Info / Notebook / Chat) */
.tool-buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.tool-btn {
  padding: 5px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.tool-btn:hover {
  background: rgb(var(--color-ink) / 0.05);
}

.tool-btn.active {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

/* Section dropdown */
.section-dropdown {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 100%;
  max-width: 420px;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14);
  max-height: 60vh;
  overflow-y: auto;
  z-index: 50;
  padding: 6px;
}

.dropdown-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.dropdown-item:hover {
  background: rgb(var(--color-ink) / 0.05);
}

.dropdown-item.active {
  background: rgb(var(--color-accent) / 0.08);
}

.dropdown-item.active .dropdown-num {
  color: rgb(var(--color-accent));
}

.dropdown-item.active .dropdown-title {
  color: rgb(var(--color-ink));
  font-weight: 500;
}

.dropdown-num {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  flex-shrink: 0;
  width: 20px;
}

.dropdown-title {
  font-size: 1.4rem;
  color: rgb(var(--color-ink));
  line-height: 1.35;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 44;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
