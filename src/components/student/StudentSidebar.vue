<script setup>
import { computed } from "vue";

const props = defineProps({
  navItems: {
    type: Array,
    required: true,
  },
  activeSection: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    default: "Student",
  },
  currentDate: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:activeSection", "footer-click"]);

const avatarInitial = computed(() => {
  return props.displayName.charAt(0).toUpperCase();
});

function setActiveSection(sectionId) {
  emit("update:activeSection", sectionId);
}

function handleFooterClick() {
  emit("footer-click");
}
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo">
      <span class="logo-icon">OB</span>
      <span class="logo-text">THE OPEN BRAIN</span>
    </div>

    <!-- User Profile Card -->
    <div class="user-profile-card">
      <div class="user-avatar">
        <span class="avatar-icon">{{ avatarInitial }}</span>
      </div>
      <div class="user-info">
        <p class="user-date">{{ currentDate }}</p>
        <p class="user-greeting">Welcome back,</p>
        <p class="user-name">{{ displayName }}!</p>
      </div>
    </div>

    <!-- Navigation Card -->
    <div class="sidebar-nav-card">
      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          @click="setActiveSection(item.id)"
          class="nav-item"
          :class="{ active: activeSection === item.id }"
        >
          <!-- Dashboard/Grid Icon -->
          <svg
            v-if="item.icon === 'grid'"
            class="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>

          <!-- Book Icon -->
          <svg
            v-else-if="item.icon === 'book'"
            class="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
            ></path>
          </svg>

          <!-- Highlight/Marker Icon -->
          <svg
            v-else-if="item.icon === 'highlight'"
            class="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m9 11-6 6v3h9l3-3"></path>
            <path
              d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"
            ></path>
          </svg>

          <!-- Notes/Edit Icon -->
          <svg
            v-else-if="item.icon === 'notes'"
            class="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
            ></path>
            <path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            ></path>
          </svg>

          <!-- Progress/Chart Icon -->
          <svg
            v-else-if="item.icon === 'progress'"
            class="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>

          <!-- Settings/Cog Icon -->
          <svg
            v-else-if="item.icon === 'settings'"
            class="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </svg>

          <!-- Default Circle Icon -->
          <svg
            v-else
            class="nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
          </svg>

          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
    </div>

    <!-- Footer Button -->
    <div class="sidebar-footer">
      <button @click="handleFooterClick" class="footer-btn">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
        Continue Reading
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 300px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  overflow-y: auto;
  gap: 1.6rem;
  border-right: 1px solid #e5e7eb;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 0.8rem 0.4rem;
}

.logo-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "IBM Plex Mono", monospace;
  font-weight: 600;
  font-size: 1.4rem;
  color: white;
  background: #3b82f6;
}

.logo-text {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.2rem;
  font-weight: 500;
  color: #1f2937;
  letter-spacing: 0.05em;
}

.user-profile-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.user-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.avatar-icon {
  font-family: "IBM Plex Sans", sans-serif;
  font-weight: 600;
  font-size: 2rem;
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.user-date {
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.1rem;
  color: #9ca3af;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.user-greeting {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.4rem;
  color: #6b7280;
  margin-top: 0.4rem;
}

.user-name {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 2.4rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}

.sidebar-nav-card {
  background: white;
  border-radius: 16px;
  padding: 1.2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 1.4rem;
  padding: 1.4rem 1.6rem;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.nav-item.active {
  background: #eff6ff;
  color: #3b82f6;
}

.nav-item.active .nav-icon {
  color: #3b82f6;
}

.nav-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
  opacity: 1;
}

.nav-label {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
}

.sidebar-footer {
  margin-top: auto;
}

.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  padding: 1.6rem;
  border: none;
  border-radius: 12px;
  color: white;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.footer-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}
</style>
