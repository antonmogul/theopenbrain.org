<script setup>
defineProps({
    title: {
        type: String,
        required: true,
    },
    showLogout: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["logout"]);

function handleLogout() {
    emit("logout");
}
</script>

<template>
    <header class="content-header">
        <div class="header-left">
            <h1 class="page-title">{{ title }}</h1>
        </div>
        <div class="header-right">
            <slot name="actions"></slot>
            <button v-if="showLogout" @click="handleLogout" class="logout-btn">
                Log Out
            </button>
        </div>
    </header>
</template>

<style scoped>
.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3.2rem;
}

.page-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.8rem;
    font-weight: 600;
    color: white;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 1.6rem;
}

.logout-btn {
    padding: 1rem 2rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
    color: #898989;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
}

.logout-btn:hover {
    border-color: rgba(255, 255, 255, 0.5);
    color: white;
}
</style>
