<script setup>
// Sortable, optionally-selectable table. Sort/select/emit logic preserved from
// the original; chrome rebuilt to tokens. `compact` renamed to `dense`. Empty
// slot defaults to EmptyState. Added header-<key> slot.
import { ref, computed } from "vue";
import EmptyState from "./EmptyState.vue";

const props = defineProps({
  columns: { type: Array, required: true }, // [{ key, label, sortable?, width?, align? }]
  data: { type: Array, required: true },
  rowKey: { type: String, default: "id" },
  selectable: { type: Boolean, default: false },
  hoverable: { type: Boolean, default: true },
  striped: { type: Boolean, default: false },
  dense: { type: Boolean, default: false },
});

const emit = defineEmits(["row-click", "sort", "select"]);

const sortKey = ref("");
const sortDirection = ref("asc");
const selectedRows = ref(new Set());

const sortedData = computed(() => {
  if (!sortKey.value) return props.data;
  return [...props.data].sort((a, b) => {
    const aVal = a[sortKey.value];
    const bVal = b[sortKey.value];
    if (aVal === bVal) return 0;
    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection.value === "asc" ? comparison : -comparison;
  });
});

function handleSort(column) {
  if (!column.sortable) return;
  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = column.key;
    sortDirection.value = "asc";
  }
  emit("sort", { key: sortKey.value, direction: sortDirection.value });
}

function handleRowClick(row) { emit("row-click", row); }

function toggleRowSelection(row) {
  const key = row[props.rowKey];
  if (selectedRows.value.has(key)) selectedRows.value.delete(key);
  else selectedRows.value.add(key);
  emit("select", Array.from(selectedRows.value));
}

function toggleAllSelection() {
  if (selectedRows.value.size === props.data.length) selectedRows.value.clear();
  else props.data.forEach((row) => selectedRows.value.add(row[props.rowKey]));
  emit("select", Array.from(selectedRows.value));
}

const allSelected = computed(() => props.data.length > 0 && selectedRows.value.size === props.data.length);
const someSelected = computed(() => selectedRows.value.size > 0 && selectedRows.value.size < props.data.length);
</script>

<template>
  <div class="table-wrap">
    <table class="data-table" :class="{ dense }">
      <thead>
        <tr>
          <th v-if="selectable" class="check-col">
            <input type="checkbox" :checked="allSelected" :indeterminate="someSelected" @change="toggleAllSelection" />
          </th>
          <th
            v-for="column in columns" :key="column.key"
            :style="[column.width ? { width: column.width } : {}, column.align ? { textAlign: column.align } : {}]"
            :class="{ sortable: column.sortable }"
            @click="handleSort(column)"
          >
            <span class="th-inner">
              <slot :name="`header-${column.key}`" :column="column">{{ column.label }}</slot>
              <span v-if="column.sortable && sortKey === column.key" class="sort-caret">{{ sortDirection === "asc" ? "▲" : "▼" }}</span>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in sortedData" :key="row[rowKey]"
          :class="{ hoverable, striped: striped && index % 2 === 1 }"
          @click="handleRowClick(row)"
        >
          <td v-if="selectable" class="check-col" @click.stop>
            <input type="checkbox" :checked="selectedRows.has(row[rowKey])" @change="toggleRowSelection(row)" />
          </td>
          <td v-for="column in columns" :key="column.key" :style="column.align ? { textAlign: column.align } : {}">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">{{ row[column.key] }}</slot>
          </td>
        </tr>
        <tr v-if="data.length === 0">
          <td :colspan="columns.length + (selectable ? 1 : 0)" class="empty-cell">
            <slot name="empty"><EmptyState title="No data" /></slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
thead th {
  text-align: left; font-family: var(--font-mono); font-size: 1rem;
  text-transform: uppercase; letter-spacing: 0.1em; color: rgb(var(--color-mute));
  padding: 12px 16px; border-bottom: 1px solid rgb(var(--color-line)); white-space: nowrap;
}
.data-table.dense thead th { padding: 8px 12px; }
thead th.sortable { cursor: pointer; }
thead th.sortable:hover { color: rgb(var(--color-ink)); }
.th-inner { display: inline-flex; align-items: center; gap: 6px; }
.sort-caret { font-size: 0.8rem; }
tbody td {
  font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink));
  padding: 14px 16px; border-bottom: 1px solid rgb(var(--color-line)); vertical-align: middle;
}
.data-table.dense tbody td { padding: 9px 12px; }
tbody tr.hoverable { cursor: pointer; }
tbody tr.hoverable:hover { background: rgb(var(--color-ink) / 0.03); }
tbody tr.striped { background: rgb(var(--color-ink) / 0.02); }
.check-col { width: 44px; }
.empty-cell { padding: 0; border-bottom: 0; }
input[type="checkbox"] { accent-color: rgb(var(--color-accent)); width: 15px; height: 15px; }
</style>
