<script setup>
import { ref, computed } from "vue";
import { useGeneral } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";

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
const { toggle: toggleSidebar, isOpen: sidebarOpen } = useReaderSidebar();

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
    <!-- Progress bar -->
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: progressPercent + '%' }"
      ></div>
    </div>

    <!-- Breadcrumb row -->
    <div class="breadcrumb-row">
      <div class="breadcrumb" @click="toggleDropdown">
        <span class="chapter-ref">Ch {{ chapterNumber }}</span>
        <template v-if="currentSectionTitle">
          <span class="sep">/</span>
          <span class="section-name">{{ currentSectionTitle }}</span>
        </template>
        <svg
          class="chevron"
          :class="{ rotated: showDropdown }"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <button
        class="sidebar-toggle"
        :class="{ active: sidebarOpen }"
        @click="toggleSidebar()"
        title="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="15" y1="3" x2="15" y2="21"></line>
        </svg>
      </button>
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
.reader-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 45;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Progress bar */
.progress-track {
  height: 3px;
  background: #f3f4f6;
}

.progress-fill {
  height: 100%;
  background: #8b5cf6;
  transition: width 0.15s ease;
}

/* Breadcrumb row */
.breadcrumb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.breadcrumb:hover {
  background: #f3f4f6;
}

.chapter-ref {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  font-family: "IBM Plex Sans", sans-serif;
}

.sep {
  color: #d1d5db;
  font-size: 14px;
}

.section-name {
  font-size: 14px;
  color: #6b7280;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: #9ca3af;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.sidebar-toggle {
  width: 34px;
  height: 34px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.15s;
}

.sidebar-toggle:hover {
  background: #f3f4f6;
  color: #374151;
}

.sidebar-toggle.active {
  background: #ede9fe;
  border-color: #c4b5fd;
  color: #7c3aed;
}

/* Section dropdown */
.section-dropdown {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 100%;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  max-height: 60vh;
  overflow-y: auto;
  z-index: 50;
  padding: 6px;
}

.dropdown-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item.active {
  background: #ede9fe;
}

.dropdown-item.active .dropdown-num {
  color: #7c3aed;
}

.dropdown-item.active .dropdown-title {
  color: #5b21b6;
  font-weight: 500;
}

.dropdown-num {
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
  width: 20px;
}

.dropdown-title {
  font-size: 15px;
  color: #374151;
  line-height: 1.4;
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
