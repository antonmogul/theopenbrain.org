<script setup>
import { useAuth } from "@/composables/useAuth";

const { devRoleOverride, userRole, isAuthenticated, user } = useAuth();

const roles = ["creator", "professor", "student"];

function setRole(role) {
    devRoleOverride.value = role || null;
}
</script>

<template>
    <div
        class="fixed bottom-4 left-4 z-[200] flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-white font-mono shadow-lg backdrop-blur-sm"
        style="font-size: 1.2rem; line-height: 1.6rem"
    >
        <span class="opacity-60 text-xs uppercase tracking-wider">DEV</span>
        <select
            class="bg-transparent border border-white/30 rounded px-2 py-1 text-white cursor-pointer"
            style="font-size: 1.1rem"
            :value="devRoleOverride || ''"
            @change="setRole($event.target.value)"
        >
            <option value="" class="text-black">No override</option>
            <option
                v-for="role in roles"
                :key="role"
                :value="role"
                class="text-black"
            >
                {{ role }}
            </option>
        </select>
        <span
            v-if="devRoleOverride"
            class="rounded px-2 py-0.5 text-xs uppercase"
            style="background: rgb(151, 71, 255)"
        >
            {{ devRoleOverride }}
        </span>
        <span v-if="isAuthenticated" class="opacity-40 text-xs truncate max-w-[120px]">
            {{ user?.email }}
        </span>
    </div>
</template>
