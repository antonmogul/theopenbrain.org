<script setup>
/**
 * UsersSection Component
 *
 * Main users management section for the dashboard.
 */

import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUsersStore } from '@/stores/dashboard/users';
import { USER_ROLES } from '@/constants/dashboard';
import LoadingState from '../shared/LoadingState.vue';
import ErrorState from '../shared/ErrorState.vue';
import EmptyState from '../shared/EmptyState.vue';
import SearchInput from '../shared/SearchInput.vue';
import FilterChips from '../shared/FilterChips.vue';
import Pagination from '../shared/Pagination.vue';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import UserCard from './UserCard.vue';
import UserRoleBreakdown from './UserRoleBreakdown.vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});

const usersStore = useUsersStore();
const {
  users,
  loading,
  error,
  roleFilter,
  search,
  selectedUser,
  roleCounts,
  page,
  totalPages,
  totalCount,
  pageSize,
} = storeToRefs(usersStore);

// Confirm dialog state
const confirmDialog = ref({
  show: false,
  user: null,
  newRole: null,
});

// Filter options
const filterOptions = computed(() => [
  { value: 'all', label: 'All Users' },
  { value: USER_ROLES.CREATOR, label: 'Creators' },
  { value: USER_ROLES.PROFESSOR, label: 'Professors' },
  { value: USER_ROLES.STUDENT, label: 'Students' },
]);

// Fetch users when section becomes active
watch(() => props.active, (isActive) => {
  if (isActive) {
    usersStore.fetchUsers();
    usersStore.fetchRoleCounts();
  }
}, { immediate: true });

// Refetch when filters change
watch([roleFilter, search, page], () => {
  if (props.active) {
    usersStore.fetchUsers();
  }
});

function handleSearch(query) {
  usersStore.setSearch(query);
}

function handleFilterChange(role) {
  usersStore.setRoleFilter(role);
}

function handleSelectUser(user) {
  usersStore.selectUser(user);
}

function handleChangeRole({ user, role }) {
  if (user.role === role) return;

  confirmDialog.value = {
    show: true,
    user,
    newRole: role,
  };
}

async function handleConfirmRoleChange() {
  if (confirmDialog.value.user && confirmDialog.value.newRole) {
    try {
      await usersStore.updateUserRole(
        confirmDialog.value.user.id,
        confirmDialog.value.newRole
      );
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role: ' + err.message);
    }
  }
  confirmDialog.value.show = false;
}

function handlePageChange(newPage) {
  usersStore.goToPage(newPage);
}

const roleLabels = {
  [USER_ROLES.CREATOR]: 'Creator',
  [USER_ROLES.PROFESSOR]: 'Professor',
  [USER_ROLES.STUDENT]: 'Student',
};
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Users</h2>
        <p class="text-sm text-gray-500 mt-1">
          Manage user accounts and roles
        </p>
      </div>
    </div>

    <!-- Main content grid -->
    <div class="grid gap-6 lg:grid-cols-4">
      <!-- Users list -->
      <div class="lg:col-span-3">
        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-4 mb-6">
          <div class="flex-1">
            <SearchInput
              v-model="search"
              placeholder="Search users by name or email..."
              @search="handleSearch"
            />
          </div>
          <FilterChips
            :options="filterOptions"
            :model-value="roleFilter"
            @update:model-value="handleFilterChange"
          />
        </div>

        <!-- Loading state -->
        <LoadingState v-if="loading" message="Loading users..." />

        <!-- Error state -->
        <ErrorState
          v-else-if="error"
          :message="error"
          @retry="usersStore.fetchUsers()"
        />

        <!-- Empty state -->
        <EmptyState
          v-else-if="users.length === 0 && !search && roleFilter === 'all'"
          title="No users yet"
          message="Users will appear here once they sign up."
          icon="users"
        />

        <!-- No results -->
        <EmptyState
          v-else-if="users.length === 0"
          title="No users found"
          message="Try adjusting your search or filter criteria."
          icon="search"
        />

        <!-- Users list -->
        <template v-else>
          <div class="grid gap-4 sm:grid-cols-2">
            <UserCard
              v-for="user in users"
              :key="user.id"
              :user="user"
              :selected="selectedUser?.id === user.id"
              @select="handleSelectUser"
              @change-role="handleChangeRole"
            />
          </div>

          <!-- Pagination -->
          <div class="mt-6">
            <Pagination
              :current-page="page"
              :total-pages="totalPages"
              :total-items="totalCount"
              :page-size="pageSize"
              @page-change="handlePageChange"
            />
          </div>
        </template>
      </div>

      <!-- Sidebar -->
      <div class="lg:col-span-1">
        <div class="sticky top-4 space-y-4">
          <UserRoleBreakdown :counts="roleCounts" />
        </div>
      </div>
    </div>

    <!-- Confirm role change dialog -->
    <ConfirmDialog
      :show="confirmDialog.show"
      title="Change User Role"
      :message="`Are you sure you want to change ${confirmDialog.user?.full_name || 'this user'}'s role to ${roleLabels[confirmDialog.newRole] || confirmDialog.newRole}?`"
      variant="warning"
      confirm-label="Change Role"
      @confirm="handleConfirmRoleChange"
      @cancel="confirmDialog.show = false"
    />
  </div>
</template>
