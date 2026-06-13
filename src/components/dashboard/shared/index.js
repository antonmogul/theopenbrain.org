/**
 * Unified dashboard component library — token-based.
 * Single source for all three dashboards (Student/Professor/Creator) + reader Settings.
 */

// Layout
export { default as DashboardShell } from "./DashboardShell.vue";
export { default as DashboardRail } from "./DashboardRail.vue";
export { default as DashboardNavIcon } from "./DashboardNavIcon.vue";
export { default as SectionHeader } from "./SectionHeader.vue";

// Cards & stats
export { default as BaseCard } from "./BaseCard.vue";
export { default as StatCard } from "./StatCard.vue";
export { default as StatGrid } from "./StatGrid.vue";
export { default as ListRow } from "./ListRow.vue";

// Data display
export { default as DataTable } from "./DataTable.vue";
export { default as StatusBadge } from "./StatusBadge.vue";

// States
export { default as EmptyState } from "./EmptyState.vue";
export { default as LoadingState } from "./LoadingState.vue";
export { default as ErrorState } from "./ErrorState.vue";

// Overlays
export { default as BaseModal } from "./BaseModal.vue";
export { default as ConfirmDialog } from "./ConfirmDialog.vue";

// Inputs & controls
export { default as Button } from "./Button.vue";
export { default as SearchInput } from "./SearchInput.vue";
export { default as FilterChips } from "./FilterChips.vue";
export { default as SegmentedControl } from "./SegmentedControl.vue";
export { default as ToggleRow } from "./ToggleRow.vue";
export { default as Switch } from "./Switch.vue";
export { default as FormField } from "./FormField.vue";

// Markers
export { default as PreviewTag } from "./PreviewTag.vue";

// Pagination
export { default as Pagination } from "./Pagination.vue";

// Temporary alias for any dead code still importing MetricCard.
export { default as MetricCard } from "./StatCard.vue";
