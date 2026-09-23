<script setup>
// Creator-dashboard "Users" section (#11 split). Presentational: parent owns
// the useDashboardUsers instance.
import { ref } from "vue";
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
  ConfirmDialog,
} from "@/components/dashboard/shared";

const props = defineProps({
  users: { type: Array, default: () => [] },
  usersLoading: { type: Boolean, default: false },
  usersError: { type: [String, null], default: null },
  usersFilter: { type: String, default: "all" },
  usersFilterOptions: { type: Array, default: () => [] },
  usersSearch: { type: String, default: "" },
  usersPage: { type: Number, default: 1 },
  usersTotalPages: { type: Number, default: 1 },
  usersTotalCount: { type: Number, default: 0 },
  userRoleBreakdown: {
    type: Object,
    default: () => ({ creators: 0, professors: 0, students: 0 }),
  },
  roleSelectOptions: { type: Array, default: () => [] },
  // The signed-in creator: they can't change their own role here, so a
  // creator can't lock themselves out of the console.
  currentUserId: { type: [String, null], default: null },
});

const selectedUser = defineModel("selectedUser", {
  type: [Object, null],
  default: null,
});

const emit = defineEmits([
  "fetch",
  "filter",
  "search",
  "select",
  "page",
  "update-role",
]);

// A role change widens or narrows what someone can do, so it asks first.
const pendingRole = ref(null); // { user, role }

function requestRole(user, event) {
  const role = event.target.value;
  event.target.value = user.role; // stays as-is until confirmed
  if (role !== user.role) pendingRole.value = { user, role };
}

function roleLabel(value) {
  return props.roleSelectOptions.find((o) => o.value === value)?.label || value;
}

function displayName(u) {
  return u.full_name || u.email?.split("@")[0] || "Unnamed user";
}

function confirmRole() {
  const { user, role } = pendingRole.value;
  pendingRole.value = null;
  emit("update-role", user.id, role);
}
</script>

<template>
  <section class="section">
    <!-- The "All users" tile below already shows the total (OPENBRAIN-56). -->
    <SectionHeader eyebrow="06 · Users" title="Accounts & roles" />

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
        :value="
          userRoleBreakdown.creators +
          userRoleBreakdown.professors +
          userRoleBreakdown.students
        "
        label="All users"
        :tone="usersFilter === 'all' ? 'accent' : 'auto'"
        @click="$emit('filter', 'all')"
      />
    </StatGrid>

    <div class="filters-bar">
      <FilterChips
        :options="usersFilterOptions"
        :model-value="usersFilter"
        @update:model-value="$emit('filter', $event)"
      />
      <SearchInput
        :model-value="usersSearch"
        placeholder="Search by name or email…"
        class="search-grow"
        @update:model-value="$emit('search', $event)"
      />
    </div>

    <LoadingState v-if="usersLoading" message="Loading users…" />
    <ErrorState
      v-else-if="usersError"
      :message="usersError"
      @retry="$emit('fetch')"
    />
    <EmptyState v-else-if="users.length === 0" title="No users found" />

    <div v-else class="stack">
      <BaseCard
        v-for="u in users"
        :key="u.id"
        padding="md"
        interactive
        @click="$emit('select', u)"
      >
        <div class="user-row">
          <div class="user-avatar" aria-hidden="true">
            {{ (u.full_name || u.email || "?")[0].toUpperCase() }}
          </div>
          <div class="user-info-col">
            <span class="card-title sm">{{ displayName(u) }}</span>
            <span class="muted-mono">{{ u.email }}</span>
          </div>
          <div class="user-meta-col">
            <StatusBadge variant="accent">{{ u.role }}</StatusBadge>
            <span class="muted-mono">{{ u.institution || "—" }}</span>
            <span class="muted-mono"
              >Joined {{ formatDate(u.created_at) }}</span
            >
          </div>
        </div>
      </BaseCard>

      <!-- Pagination -->
      <div v-if="usersTotalPages > 1" class="pager">
        <Button
          variant="outline"
          size="sm"
          :disabled="usersPage === 1"
          @click="$emit('page', usersPage - 1)"
          >‹ Prev</Button
        >
        <span class="muted-mono"
          >Page {{ usersPage }} of {{ usersTotalPages }}</span
        >
        <Button
          variant="outline"
          size="sm"
          :disabled="usersPage === usersTotalPages"
          @click="$emit('page', usersPage + 1)"
          >Next ›</Button
        >
      </div>
    </div>

    <!-- User detail modal -->
    <BaseModal
      :model-value="!!selectedUser"
      size="lg"
      :title="selectedUser ? selectedUser.full_name || 'Unnamed user' : ''"
      @update:model-value="selectedUser = null"
    >
      <template v-if="selectedUser">
        <div class="user-detail-head">
          <div class="user-avatar lg" aria-hidden="true">
            {{
              (selectedUser.full_name ||
                selectedUser.email ||
                "?")[0].toUpperCase()
            }}
          </div>
          <div>
            <span class="muted-mono">{{ selectedUser.email }}</span>
            <div class="mt-2">
              <StatusBadge variant="accent">{{
                selectedUser.role
              }}</StatusBadge>
            </div>
          </div>
        </div>
        <div class="kv-list mt-3">
          <div class="kv-row">
            <span class="kv-key">Institution</span
            ><span class="kv-val">{{ selectedUser.institution || "—" }}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">Joined</span
            ><span class="kv-val">{{
              formatDate(selectedUser.created_at)
            }}</span>
          </div>
          <div v-if="selectedUser.role === 'professor'" class="kv-row">
            <span class="kv-key">Department</span
            ><span class="kv-val">{{
              selectedUser.professor_department || "—"
            }}</span>
          </div>
          <div v-if="selectedUser.role === 'student'" class="kv-row">
            <span class="kv-key">Year</span
            ><span class="kv-val">{{ selectedUser.student_year || "—" }}</span>
          </div>
          <div v-if="selectedUser.role === 'student'" class="kv-row">
            <span class="kv-key">Major</span
            ><span class="kv-val">{{ selectedUser.student_major || "—" }}</span>
          </div>
          <div v-if="selectedUser.role === 'creator'" class="kv-row">
            <span class="kv-key">Bio</span
            ><span class="kv-val">{{ selectedUser.creator_bio || "—" }}</span>
          </div>
        </div>
        <FormField
          label="Change role"
          class="mt-3"
          :hint="
            selectedUser.id === currentUserId
              ? 'You can\'t change your own role here.'
              : ''
          "
        >
          <select
            :value="selectedUser.role"
            :disabled="selectedUser.id === currentUserId"
            @change="requestRole(selectedUser, $event)"
          >
            <option
              v-for="opt in roleSelectOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </FormField>
      </template>
      <template #footer>
        <Button variant="ghost" size="sm" @click="selectedUser = null"
          >Close</Button
        >
      </template>
    </BaseModal>
    <ConfirmDialog
      :model-value="!!pendingRole"
      title="Change this person's role?"
      confirm-label="Change role"
      variant="warn"
      @update:model-value="(open) => !open && (pendingRole = null)"
      @confirm="confirmRole"
    >
      Make <strong>{{ pendingRole && displayName(pendingRole.user) }}</strong> a
      <strong>{{ pendingRole && roleLabel(pendingRole.role) }}</strong
      >?
      <template v-if="pendingRole?.role === 'creator'">
        Creators can edit and publish every chapter and change anyone's role.
      </template>
      <template v-else>
        They'll use the {{ pendingRole && roleLabel(pendingRole.role) }}
        dashboard the next time they sign in.
      </template>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
@import "@/styles/dashboard-sections.css";
</style>
