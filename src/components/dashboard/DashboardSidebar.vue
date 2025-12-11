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
        default: "User",
    },
    currentDate: {
        type: String,
        default: "",
    },
    accentColor: {
        type: String,
        default: "rgb(151, 71, 255)", // violet for creator
    },
    logoText: {
        type: String,
        default: "INSIDE THE BRAIN",
    },
    footerButtonText: {
        type: String,
        default: "Read Book",
    },
    showFooterButton: {
        type: Boolean,
        default: true,
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
            <span class="logo-icon" :style="{ background: accentColor }">OB</span>
            <span class="logo-text">{{ logoText }}</span>
        </div>

        <!-- User Profile Card -->
        <div class="user-profile-card">
            <div class="user-avatar" :style="{ background: `linear-gradient(135deg, ${accentColor} 0%, #6b21a8 100%)` }">
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
                    <!-- Grid Icon -->
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
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <!-- Layers Icon -->
                    <svg
                        v-else-if="item.icon === 'layers'"
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
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    <!-- Image Icon -->
                    <svg
                        v-else-if="item.icon === 'image'"
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
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <!-- Quiz Icon -->
                    <svg
                        v-else-if="item.icon === 'quiz'"
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
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <!-- Users Icon -->
                    <svg
                        v-else-if="item.icon === 'users'"
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
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <!-- Chart Icon -->
                    <svg
                        v-else-if="item.icon === 'chart'"
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
                    <!-- Folder/Library Icon -->
                    <svg
                        v-else-if="item.icon === 'folder'"
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
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <!-- Clipboard/Assessment Icon -->
                    <svg
                        v-else-if="item.icon === 'clipboard'"
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
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        <path d="M9 14l2 2 4-4"></path>
                    </svg>
                    <!-- Graduation Cap Icon (for courses) -->
                    <svg
                        v-else-if="item.icon === 'graduation'"
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
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                    </svg>
                    <!-- Share/Collaboration Icon -->
                    <svg
                        v-else-if="item.icon === 'share'"
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
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    <!-- Default fallback -->
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
        <div v-if="showFooterButton" class="sidebar-footer">
            <button @click="handleFooterClick" class="footer-btn" :style="{ background: `linear-gradient(135deg, ${accentColor} 0%, #6b21a8 100%)` }">
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
                {{ footerButtonText }}
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
    background: transparent;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    overflow-y: auto;
    gap: 1.6rem;
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
}

.logo-text {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    font-weight: 500;
    color: white;
    letter-spacing: 0.05em;
}

.user-profile-card {
    background: #1a1a1a;
    border-radius: 16px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.user-avatar {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
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
    color: #666;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.user-greeting {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #888;
    margin-top: 0.4rem;
}

.user-name {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.4rem;
    font-weight: 600;
    color: white;
    line-height: 1.2;
}

.sidebar-nav-card {
    background: #1a1a1a;
    border-radius: 16px;
    padding: 1.2rem;
    flex: 1;
    display: flex;
    flex-direction: column;
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
    color: #898989;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
}

.nav-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
}

.nav-item.active {
    background: rgba(255, 255, 255, 0.08);
    color: white;
}

.nav-item.active .nav-icon {
    color: white;
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
}

.footer-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(151, 71, 255, 0.3);
}
</style>
