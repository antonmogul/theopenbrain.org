<script setup>
import { useRoute } from "vue-router";
import { useGeneral } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import IIcon from "@/icons/custom/IIcon.vue";
import UserIcon from "@/icons/custom/UserIcon.vue";
import OpenArrowIcon from "@/icons/custom/OpenArrowIcon.vue";
import Brain from "@/icons/custom/Brain.vue";

const route = useRoute();
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
    background-color: #222;
    border: 1px solid #222;
    cursor: pointer;
    transition: all 0.2s ease;
}

.nav-icon:hover,
.nav-icon.active {
    background-color: rgb(151, 71, 255);
    border-color: rgb(151, 71, 255);
}

.nav-icon-svg {
    width: 1.5rem;
    height: 1.5rem;
    fill: white;
}
</style>
