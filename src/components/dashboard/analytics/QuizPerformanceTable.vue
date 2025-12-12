<script setup>
/**
 * QuizPerformanceTable Component
 *
 * Table showing quiz performance stats.
 */

import DataTable from '../shared/DataTable.vue';

defineProps({
  data: {
    type: Array,
    required: true,
  },
});

const columns = [
  { key: 'title', label: 'Quiz', sortable: true },
  { key: 'attempts', label: 'Attempts', sortable: true, width: '90px' },
  { key: 'avgScore', label: 'Avg Score', sortable: true, width: '90px' },
  { key: 'passRate', label: 'Pass Rate', sortable: true, width: '90px' },
];
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-200">
      <h3 class="text-sm font-medium text-gray-700">Quiz Performance</h3>
    </div>
    <DataTable
      :columns="columns"
      :data="data"
      :hoverable="false"
      compact
    >
      <template #cell-title="{ value }">
        <span class="font-medium text-gray-900">{{ value }}</span>
      </template>
      <template #cell-attempts="{ value }">
        <span class="text-gray-600">{{ value }}</span>
      </template>
      <template #cell-avgScore="{ value }">
        <span :class="[
          'font-medium',
          value >= 70 ? 'text-green-600' : value >= 50 ? 'text-yellow-600' : 'text-red-600'
        ]">
          {{ value }}%
        </span>
      </template>
      <template #cell-passRate="{ value }">
        <div class="flex items-center gap-2">
          <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              :class="[
                'h-full rounded-full',
                value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              ]"
              :style="{ width: `${value}%` }"
            />
          </div>
          <span class="text-sm text-gray-600 w-10 text-right">{{ value }}%</span>
        </div>
      </template>
      <template #empty>
        <div class="text-gray-500">No quiz data available</div>
      </template>
    </DataTable>
  </div>
</template>
