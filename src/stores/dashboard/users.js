/**
 * Users Store
 *
 * Manages user state for the dashboard.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import usersApi from '@/services/api/users';
import { USER_ROLES, PAGINATION } from '@/constants/dashboard';

export const useUsersStore = defineStore('dashboardUsers', () => {
  // State
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Pagination
  const page = ref(1);
  const pageSize = ref(PAGINATION.DEFAULT_PAGE_SIZE);
  const totalCount = ref(0);

  // Filters
  const roleFilter = ref('all');
  const search = ref('');

  // Selected user
  const selectedUser = ref(null);

  // Role breakdown
  const roleCounts = ref({
    [USER_ROLES.CREATOR]: 0,
    [USER_ROLES.PROFESSOR]: 0,
    [USER_ROLES.STUDENT]: 0,
    total: 0,
  });

  // Getters
  const totalPages = computed(() =>
    Math.ceil(totalCount.value / pageSize.value)
  );

  const hasNextPage = computed(() =>
    page.value < totalPages.value
  );

  const hasPreviousPage = computed(() =>
    page.value > 1
  );

  const paginationInfo = computed(() => ({
    from: (page.value - 1) * pageSize.value + 1,
    to: Math.min(page.value * pageSize.value, totalCount.value),
    total: totalCount.value,
  }));

  // Actions
  async function fetchUsers() {
    loading.value = true;
    error.value = null;

    try {
      const result = await usersApi.fetchUsers({
        role: roleFilter.value,
        search: search.value,
        page: page.value,
        pageSize: pageSize.value,
      });

      users.value = result.users;
      totalCount.value = result.total;
    } catch (err) {
      console.error('Error fetching users:', err);
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRoleCounts() {
    try {
      roleCounts.value = await usersApi.getUserRoleCounts();
    } catch (err) {
      console.error('Error fetching role counts:', err);
    }
  }

  async function updateUserRole(userId, role) {
    try {
      await usersApi.updateUserRole(userId, role);

      // Update local state
      const user = users.value.find(u => u.id === userId);
      if (user) {
        user.role = role;
      }

      // Update selected user if it's the one being edited
      if (selectedUser.value?.id === userId) {
        selectedUser.value = { ...selectedUser.value, role };
      }

      // Refresh role counts
      await fetchRoleCounts();
    } catch (err) {
      console.error('Error updating user role:', err);
      throw err;
    }
  }

  function selectUser(user) {
    selectedUser.value = user;
  }

  function clearSelection() {
    selectedUser.value = null;
  }

  function setRoleFilter(role) {
    roleFilter.value = role;
    page.value = 1; // Reset to first page
  }

  function setSearch(query) {
    search.value = query;
    page.value = 1; // Reset to first page
  }

  function nextPage() {
    if (hasNextPage.value) {
      page.value++;
    }
  }

  function previousPage() {
    if (hasPreviousPage.value) {
      page.value--;
    }
  }

  function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages.value) {
      page.value = pageNum;
    }
  }

  function reset() {
    users.value = [];
    loading.value = false;
    error.value = null;
    page.value = 1;
    totalCount.value = 0;
    roleFilter.value = 'all';
    search.value = '';
    selectedUser.value = null;
    roleCounts.value = {
      [USER_ROLES.CREATOR]: 0,
      [USER_ROLES.PROFESSOR]: 0,
      [USER_ROLES.STUDENT]: 0,
      total: 0,
    };
  }

  return {
    // State
    users,
    loading,
    error,
    page,
    pageSize,
    totalCount,
    roleFilter,
    search,
    selectedUser,
    roleCounts,

    // Getters
    totalPages,
    hasNextPage,
    hasPreviousPage,
    paginationInfo,

    // Actions
    fetchUsers,
    fetchRoleCounts,
    updateUserRole,
    selectUser,
    clearSelection,
    setRoleFilter,
    setSearch,
    nextPage,
    previousPage,
    goToPage,
    reset,
  };
});

export default useUsersStore;
