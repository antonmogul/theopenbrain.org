<script setup>
// Creator-dashboard "Users" section (#11 split). Presentational: parent owns
// the useDashboardUsers instance.
import { relativeLong as formatDate } from "@/utils/format";
import {
    SectionHeader,
    BaseCard,
    StatCard,
    StatGrid,
    StatusBadge,
    EmptyState,
    LoadingState,
    ErrorState,
    BaseModal,
    Button,
    SearchInput,
    FilterChips,
    FormField,
} from "@/components/dashboard/shared";

defineProps({
    users: { type: Array, default: () => [] },
    usersLoading: { type: Boolean, default: false },
    usersError: { type: [String, null], default: null },
    usersFilter: { type: String, default: "all" },
    usersFilterOptions: { type: Array, default: () => [] },
    usersSearch: { type: String, default: "" },
    usersPage: { type: Number, default: 1 },
    usersTotalPages: { type: Number, default: 1 },
    usersTotalCount: { type: Number, default: 0 },
    userRoleBreakdown: { type: Object, default: () => ({ creators: 0, professors: 0, students: 0 }) },
    roleSelectOptions: { type: Array, default: () => [] },
});

const selectedUser = defineModel("selectedUser", {
    type: [Object, null],
    default: null,
});

defineEmits([
    "fetch",
    "filter",
    "search",
    "select",
    "page",
    "update-role",
]);
</script>

<template>
    <section class="section">
        <SectionHeader eyebrow="06 · Users" title="Accounts & roles">
            <template #actions>
                <span class="muted-mono">{{ usersTotalCount }} total</span>
            </template>
        </SectionHeader>

        <!-- Role breakdown stats (also act as filters) -->
        <StatGrid :columns="4">
            <StatCard
                class="stat-click"
                :value="userRoleBreakdown.creators"
                label="Creators"
                :tone="usersFilter === 'creator' ? 'accent' : 'auto'"
                @click="$emit('filter', 'creator')"
            />
            <StatCard
                class="stat-click"
                :value="userRoleBreakdown.professors"
                label="Professors"
                :tone="usersFilter === 'professor' ? 'accent' : 'auto'"
                @click="$emit('filter', 'professor')"
            />
            <StatCard
                class="stat-click"
                :value="userRoleBreakdown.students"
                label="Students"
                :tone="usersFilter === 'student' ? 'accent' : 'auto'"
                @click="$emit('filter', 'student')"
            />
            <StatCard
                class="stat-click"
                :value="userRoleBreakdown.creators + userRoleBreakdown.professors + userRoleBreakdown.students"
                label="All users"
                :tone="usersFilter === 'all' ? 'accent' : 'auto'"
                @click="$emit('filter', 'all')"
            />
        </StatGrid>

        <div class="filters-bar">
            <FilterChips :options="usersFilterOptions" :model-value="usersFilter" @update:model-value="$emit('filter', $event)" />
            <SearchInput :model-value="usersSearch" placeholder="Search by name or email…" class="search-grow" @update:model-value="$emit('search', $event)" />
        </div>

        <LoadingState v-if="usersLoading" message="Loading users…" />
        <ErrorState v-else-if="usersError" :message="usersError" @retry="$emit('fetch')" />
        <EmptyState v-else-if="users.length === 0" title="No users found" />

        <div v-else class="stack">
            <BaseCard v-for="u in users" :key="u.id" padding="md" interactive @click="$emit('select', u)">
                <div class="user-row">
                    <div class="user-avatar" aria-hidden="true">{{ (u.full_name || u.email || "?")[0].toUpperCase() }}</div>
                    <div class="user-info-col">
                        <span class="card-title sm">{{ u.full_name || "Unnamed user" }}</span>
                        <span class="muted-mono">{{ u.email }}</span>
                    </div>
                    <div class="user-meta-col">
                        <StatusBadge variant="accent">{{ u.role }}</StatusBadge>
                        <span class="muted-mono">{{ u.institution || "—" }}</span>
                        <span class="muted-mono">Joined {{ formatDate(u.created_at) }}</span>
                    </div>
                </div>
            </BaseCard>

            <!-- Pagination -->
            <div v-if="usersTotalPages > 1" class="pager">
                <Button variant="outline" size="sm" :disabled="usersPage === 1" @click="$emit('page', usersPage - 1)">‹ Prev</Button>
                <span class="muted-mono">Page {{ usersPage }} of {{ usersTotalPages }}</span>
                <Button variant="outline" size="sm" :disabled="usersPage === usersTotalPages" @click="$emit('page', usersPage + 1)">Next ›</Button>
            </div>
        </div>

        <!-- User detail modal -->
        <BaseModal
            :model-value="!!selectedUser"
            size="lg"
            :title="selectedUser ? (selectedUser.full_name || 'Unnamed user') : ''"
            @update:model-value="selectedUser = null"
        >
            <template v-if="selectedUser">
                <div class="user-detail-head">
                    <div class="user-avatar lg" aria-hidden="true">{{ (selectedUser.full_name || selectedUser.email || "?")[0].toUpperCase() }}</div>
                    <div>
                        <span class="muted-mono">{{ selectedUser.email }}</span>
                        <div class="mt-2"><StatusBadge variant="accent">{{ selectedUser.role }}</StatusBadge></div>
                    </div>
                </div>
                <div class="kv-list mt-3">
                    <div class="kv-row"><span class="kv-key">Institution</span><span class="kv-val">{{ selectedUser.institution || "—" }}</span></div>
                    <div class="kv-row"><span class="kv-key">Joined</span><span class="kv-val">{{ formatDate(selectedUser.created_at) }}</span></div>
                    <div v-if="selectedUser.role === 'professor'" class="kv-row"><span class="kv-key">Department</span><span class="kv-val">{{ selectedUser.professor_department || "—" }}</span></div>
                    <div v-if="selectedUser.role === 'student'" class="kv-row"><span class="kv-key">Year</span><span class="kv-val">{{ selectedUser.student_year || "—" }}</span></div>
                    <div v-if="selectedUser.role === 'student'" class="kv-row"><span class="kv-key">Major</span><span class="kv-val">{{ selectedUser.student_major || "—" }}</span></div>
                    <div v-if="selectedUser.role === 'creator'" class="kv-row"><span class="kv-key">Bio</span><span class="kv-val">{{ selectedUser.creator_bio || "—" }}</span></div>
                </div>
                <FormField label="Change role" class="mt-3">
                    <select :value="selectedUser.role" @change="$emit('update-role', selectedUser.id, $event.target.value)">
                        <option v-for="opt in roleSelectOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                </FormField>
            </template>
            <template #footer>
                <Button variant="ghost" size="sm" @click="selectedUser = null">Close</Button>
            </template>
        </BaseModal>
    </section>
</template>

<style scoped>
@import "@/styles/dashboard-sections.css";
</style>
