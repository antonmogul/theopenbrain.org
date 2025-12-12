<script setup>
/**
 * StatusBadge Component
 *
 * Displays a status indicator with appropriate styling.
 */

import { computed } from 'vue';
import { STATUS, STATUS_COLORS } from '@/constants/dashboard';

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    default: 'sm', // sm, md, lg
  },
});

const colors = computed(() => {
  return STATUS_COLORS[props.status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  };
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'lg':
      return 'px-3 py-1.5 text-sm';
    case 'md':
      return 'px-2.5 py-1 text-sm';
    default:
      return 'px-2 py-0.5 text-xs';
  }
});

const label = computed(() => {
  return props.status.charAt(0).toUpperCase() + props.status.slice(1);
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-full border',
      colors.bg,
      colors.text,
      colors.border,
      sizeClasses,
    ]"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
