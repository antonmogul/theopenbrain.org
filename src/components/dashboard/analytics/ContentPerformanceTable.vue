<script setup>
/**
 * ContentPerformanceTable Component
 *
 * Table showing content views by module.
 */

import DataTable from '../shared/DataTable.vue';

defineProps({
  data: {
    type: Array,
    required: true,
  },
});

const columns = [
  { key: 'title', label: 'Module', sortable: true },
  { key: 'views', label: 'Views', sortable: true, width: '100px' },
];
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-200">
      <h3 class="text-sm font-medium text-gray-700">Content Performance</h3>
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
      <template #cell-views="{ value }">
        <span class="text-gray-600">{{ value.toLocaleString() }}</span>
      </template>
      <template #empty>
        <div class="text-gray-500">No content data available</div>
      </template>
    </DataTable>
  </div>
</template>
