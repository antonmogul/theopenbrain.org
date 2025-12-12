<script setup>
/**
 * UserCard Component
 *
 * Displays a single user with role and actions.
 */

import { computed } from 'vue';
import { USER_ROLES } from '@/constants/dashboard';

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['select', 'change-role']);

const roleColors = {
  [USER_ROLES.CREATOR]: 'bg-purple-100 text-purple-700',
  [USER_ROLES.PROFESSOR]: 'bg-blue-100 text-blue-700',
  [USER_ROLES.STUDENT]: 'bg-green-100 text-green-700',
};

const roleLabel = computed(() => {
  const labels = {
    [USER_ROLES.CREATOR]: 'Creator',
    [USER_ROLES.PROFESSOR]: 'Professor',
    [USER_ROLES.STUDENT]: 'Student',
  };
  return labels[props.user.role] || 'Unknown';
});

const initials = computed(() => {
  const name = props.user.full_name || props.user.email || '';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const formattedDate = computed(() => {
  if (!props.user.created_at) return 'Unknown';
  return new Date(props.user.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});
</script>

<template>
  <div
    :class="[
      'bg-white border rounded-lg p-4 cursor-pointer transition-all',
      selected
        ? 'border-indigo-500 ring-2 ring-indigo-200'
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
    ]"
    @click="emit('select', user)"
  >
    <div class="flex items-center gap-4">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        <div
          v-if="user.avatar_url"
          class="w-12 h-12 rounded-full overflow-hidden"
        >
          <img
            :src="user.avatar_url"
            :alt="user.full_name"
            class="w-full h-full object-cover"
          />
        </div>
        <div
          v-else
          class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium"
        >
          {{ initials }}
        </div>
      </div>

      <!-- User info -->
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-gray-900 truncate">
          {{ user.full_name || 'Unnamed User' }}
        </h3>
        <p class="text-sm text-gray-500 truncate">
          {{ user.email }}
        </p>
      </div>

      <!-- Role badge -->
      <span
        :class="[
          'px-2.5 py-1 text-xs font-medium rounded-full',
          roleColors[user.role] || 'bg-gray-100 text-gray-700',
        ]"
      >
        {{ roleLabel }}
      </span>
    </div>

    <!-- Footer -->
    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
      <span class="text-gray-500">Joined {{ formattedDate }}</span>

      <!-- Role selector -->
      <select
        :value="user.role"
        @click.stop
        @change="emit('change-role', { user, role: $event.target.value })"
        class="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option :value="USER_ROLES.STUDENT">Student</option>
        <option :value="USER_ROLES.PROFESSOR">Professor</option>
        <option :value="USER_ROLES.CREATOR">Creator</option>
      </select>
    </div>
  </div>
</template>
