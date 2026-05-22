<script setup>
import { useRoute, useRouter } from "vue-router";
import { useGeneral } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import IIcon from "@/icons/custom/IIcon.vue";
import UserIcon from "@/icons/custom/UserIcon.vue";
import OpenArrowIcon from "@/icons/custom/OpenArrowIcon.vue";
import Brain from "@/icons/custom/Brain.vue";

const route = useRoute();
const router = useRouter();
const store = useGeneral();
const authStore = useAuthStore();

const toggleAbout = () => {
    if (store.activeAbout) {
        store.activeAbout = false;
    } else {
        store.activeMenu = false;
        authStore.closeAuth();
        store.activeAbout = true;
    }
};

const toggleAuth = () => {
    if (authStore.activeAuth) {
        authStore.closeAuth();
    } else {
        store.activeMenu = false;
        store.activeAbout = false;
        authStore.openAuth();
    }
};

const toggleChapterMenu = () => {
    if (store.activeMenu) {
        store.activeMenu = false;
    } else {
        store.activeAbout = false;
        authStore.closeAuth();
        store.activeMenu = true;
    }
};
</script>

<template>
    <div class="fixed bottom-6 left-6 z-[60] flex items-center gap-3">
        <!-- About / Info -->
        <button
            v-if="route.name === 'chapter'"
            @click="toggleAbout()"
            class="nav-icon"
            :class="{ active: store.activeAbout }"
            title="About"
        >
            <OpenArrowIcon v-if="store.activeAbout" class="nav-icon-svg" />
            <IIcon v-else class="nav-icon-svg" />
        </button>

        <!-- User / Auth -->
        <button
            v-if="
                route.name === 'home' ||
                route.name === 'chapter' ||
                route.name === 'dashboard' ||
                route.name === 'editor'
            "
            @click="toggleAuth()"
            class="nav-icon"
            :class="{ active: authStore.activeAuth }"
            title="Account"
        >
            <OpenArrowIcon v-if="authStore.activeAuth" class="nav-icon-svg" />
            <UserIcon v-else class="nav-icon-svg" />
        </button>

        <!-- Chapter menu (dot) -->
        <button
            v-if="route.name === 'chapter'"
            @click="toggleChapterMenu()"
            class="nav-icon"
            :class="{ active: store.activeMenu }"
            title="Chapter menu"
        >
            <OpenArrowIcon v-if="store.activeMenu" class="nav-icon-svg" />
            <Brain v-else class="nav-icon-svg" />
        </button>

        <!-- Settings -->
        <button
            v-if="route.name !== 'settings'"
            @click="router.push('/settings')"
            class="nav-icon"
            title="Settings"
        >
            <svg
                class="nav-icon-svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        </button>
    </div>
</template>

<style scoped>
.nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 9999px;
    background-color: rgb(var(--color-ink));
    border: 1px solid rgb(var(--color-ink));
    cursor: pointer;
    transition: all 0.2s ease;
}

.nav-icon:hover,
.nav-icon.active {
    background-color: rgb(var(--color-accent));
    border-color: rgb(var(--color-accent));
}

.nav-icon-svg {
    width: 1.5rem;
    height: 1.5rem;
    fill: rgb(var(--color-paper));
    color: rgb(var(--color-paper));
}
</style>
