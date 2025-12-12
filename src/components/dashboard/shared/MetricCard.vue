<script setup>
/**
 * MetricCard Component
 *
 * Displays a single metric with label, value, and optional trend.
 */

import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  suffix: {
    type: String,
    default: '',
  },
  prefix: {
    type: String,
    default: '',
  },
  trend: {
    type: Number,
    default: null, // Percentage change
  },
  trendLabel: {
    type: String,
    default: 'vs last period',
  },
  icon: {
    type: String,
    default: null,
  },
  color: {
    type: String,
    default: 'indigo', // indigo, green, yellow, red, blue
  },
});

const colorClasses = {
  indigo: {
    icon: 'bg-indigo-100 text-indigo-600',
    trend: 'text-indigo-600',
  },
  green: {
    icon: 'bg-green-100 text-green-600',
    trend: 'text-green-600',
  },
  yellow: {
    icon: 'bg-yellow-100 text-yellow-600',
    trend: 'text-yellow-600',
  },
  red: {
    icon: 'bg-red-100 text-red-600',
    trend: 'text-red-600',
  },
  blue: {
    icon: 'bg-blue-100 text-blue-600',
    trend: 'text-blue-600',
  },
};

const trendColor = computed(() => {
  if (props.trend === null) return '';
  return props.trend >= 0 ? 'text-green-600' : 'text-red-600';
});

const trendIcon = computed(() => {
  if (props.trend === null) return '';
  return props.trend >= 0 ? 'up' : 'down';
});

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString();
  }
  return props.value;
});

const icons = {
  users: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />`,
  eye: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`,
  clock: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`,
  check: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`,
  chart: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />`,
};
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-500">{{ label }}</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">
          {{ prefix }}{{ formattedValue }}{{ suffix }}
        </p>

        <!-- Trend -->
        <div v-if="trend !== null" class="mt-2 flex items-center text-sm">
          <svg
            :class="['w-4 h-4 mr-1', trendColor]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="trendIcon === 'up'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          <span :class="trendColor">{{ Math.abs(trend) }}%</span>
          <span class="ml-1 text-gray-500">{{ trendLabel }}</span>
        </div>
      </div>

      <!-- Icon -->
      <div
        v-if="icon"
        :class="['p-3 rounded-lg', colorClasses[color].icon]"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          v-html="icons[icon] || icons.chart"
        />
      </div>
    </div>
  </div>
</template>
