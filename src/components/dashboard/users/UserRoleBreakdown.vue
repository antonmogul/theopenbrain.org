<script setup>
/**
 * UserRoleBreakdown Component
 *
 * Displays a breakdown of users by role.
 */

import { computed } from 'vue';
import { USER_ROLES } from '@/constants/dashboard';

const props = defineProps({
  counts: {
    type: Object,
    required: true,
  },
});

const total = computed(() =>
  props.counts[USER_ROLES.CREATOR] +
  props.counts[USER_ROLES.PROFESSOR] +
  props.counts[USER_ROLES.STUDENT]
);

const creatorPercent = computed(() =>
  total.value > 0 ? Math.round((props.counts[USER_ROLES.CREATOR] / total.value) * 100) : 0
);

const professorPercent = computed(() =>
  total.value > 0 ? Math.round((props.counts[USER_ROLES.PROFESSOR] / total.value) * 100) : 0
);

const studentPercent = computed(() =>
  total.value > 0 ? Math.round((props.counts[USER_ROLES.STUDENT] / total.value) * 100) : 0
);
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-medium text-gray-700 mb-4">User Breakdown</h3>

    <!-- Progress bar -->
    <div class="h-3 rounded-full bg-gray-100 overflow-hidden flex mb-4">
      <div
        class="bg-purple-500 transition-all"
        :style="{ width: `${creatorPercent}%` }"
      />
      <div
        class="bg-blue-500 transition-all"
        :style="{ width: `${professorPercent}%` }"
      />
      <div
        class="bg-green-500 transition-all"
        :style="{ width: `${studentPercent}%` }"
      />
    </div>

    <!-- Legend -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-purple-500" />
          <span class="text-sm text-gray-600">Creators</span>
        </div>
        <span class="text-sm font-medium text-gray-900">
          {{ counts[USER_ROLES.CREATOR] }} ({{ creatorPercent }}%)
        </span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-500" />
          <span class="text-sm text-gray-600">Professors</span>
        </div>
        <span class="text-sm font-medium text-gray-900">
          {{ counts[USER_ROLES.PROFESSOR] }} ({{ professorPercent }}%)
        </span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-green-500" />
          <span class="text-sm text-gray-600">Students</span>
        </div>
        <span class="text-sm font-medium text-gray-900">
          {{ counts[USER_ROLES.STUDENT] }} ({{ studentPercent }}%)
        </span>
      </div>
    </div>

    <!-- Total -->
    <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">Total Users</span>
      <span class="text-lg font-semibold text-gray-900">{{ total }}</span>
    </div>
  </div>
</template>
