<script setup>
/**
 * DataTable Component
 *
 * A reusable table component with sorting and row selection.
 */

import { ref, computed } from 'vue';

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    // Expected format: [{ key: string, label: string, sortable?: boolean, width?: string }]
  },
  data: {
    type: Array,
    required: true,
  },
  rowKey: {
    type: String,
    default: 'id',
  },
  selectable: {
    type: Boolean,
    default: false,
  },
  hoverable: {
    type: Boolean,
    default: true,
  },
  striped: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['row-click', 'sort', 'select']);

const sortKey = ref('');
const sortDirection = ref('asc');
const selectedRows = ref(new Set());

const sortedData = computed(() => {
  if (!sortKey.value) return props.data;

  return [...props.data].sort((a, b) => {
    const aVal = a[sortKey.value];
    const bVal = b[sortKey.value];

    if (aVal === bVal) return 0;

    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

function handleSort(column) {
  if (!column.sortable) return;

  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = column.key;
    sortDirection.value = 'asc';
  }

  emit('sort', { key: sortKey.value, direction: sortDirection.value });
}

function handleRowClick(row) {
  emit('row-click', row);
}

function toggleRowSelection(row) {
  const key = row[props.rowKey];
  if (selectedRows.value.has(key)) {
    selectedRows.value.delete(key);
  } else {
    selectedRows.value.add(key);
  }
  emit('select', Array.from(selectedRows.value));
}

function toggleAllSelection() {
  if (selectedRows.value.size === props.data.length) {
    selectedRows.value.clear();
  } else {
    props.data.forEach(row => {
      selectedRows.value.add(row[props.rowKey]);
    });
  }
  emit('select', Array.from(selectedRows.value));
}

const allSelected = computed(() =>
  props.data.length > 0 && selectedRows.value.size === props.data.length
);

const someSelected = computed(() =>
  selectedRows.value.size > 0 && selectedRows.value.size < props.data.length
);
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <!-- Checkbox column -->
          <th v-if="selectable" class="w-12 px-4 py-3">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected"
              @change="toggleAllSelection"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </th>

          <!-- Data columns -->
          <th
            v-for="column in columns"
            :key="column.key"
            :style="column.width ? { width: column.width } : {}"
            :class="[
              'text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
              compact ? 'px-4 py-2' : 'px-6 py-3',
              column.sortable && 'cursor-pointer hover:bg-gray-100',
            ]"
            @click="handleSort(column)"
          >
            <div class="flex items-center gap-1">
              {{ column.label }}
              <svg
                v-if="column.sortable && sortKey === column.key"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-if="sortDirection === 'asc'"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 15l7-7 7 7"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </th>
        </tr>
      </thead>

      <tbody class="bg-white divide-y divide-gray-200">
        <tr
          v-for="(row, index) in sortedData"
          :key="row[rowKey]"
          :class="[
            hoverable && 'hover:bg-gray-50 cursor-pointer',
            striped && index % 2 === 1 && 'bg-gray-50',
          ]"
          @click="handleRowClick(row)"
        >
          <!-- Checkbox cell -->
          <td v-if="selectable" class="w-12 px-4" @click.stop>
            <input
              type="checkbox"
              :checked="selectedRows.has(row[rowKey])"
              @change="toggleRowSelection(row)"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </td>

          <!-- Data cells -->
          <td
            v-for="column in columns"
            :key="column.key"
            :class="[
              'text-sm text-gray-900',
              compact ? 'px-4 py-2' : 'px-6 py-4',
            ]"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>

        <!-- Empty state -->
        <tr v-if="data.length === 0">
          <td
            :colspan="columns.length + (selectable ? 1 : 0)"
            class="px-6 py-12 text-center text-sm text-gray-500"
          >
            <slot name="empty">
              No data available
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
