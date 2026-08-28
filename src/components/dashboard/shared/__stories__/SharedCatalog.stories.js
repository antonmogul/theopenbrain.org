import BaseCard from "../BaseCard.vue";
import BaseModal from "../BaseModal.vue";
import ConfirmDialog from "../ConfirmDialog.vue";
import DashboardNavIcon from "../DashboardNavIcon.vue";
import DashboardRail from "../DashboardRail.vue";
import DashboardShell from "../DashboardShell.vue";
import DataTable from "../DataTable.vue";
import EmptyState from "../EmptyState.vue";
import ErrorState from "../ErrorState.vue";
import FilterChips from "../FilterChips.vue";
import ListRow from "../ListRow.vue";
import LoadingState from "../LoadingState.vue";
import Pagination from "../Pagination.vue";
import PreviewTag from "../PreviewTag.vue";
import SearchInput from "../SearchInput.vue";
import SectionHeader from "../SectionHeader.vue";
import SegmentedControl from "../SegmentedControl.vue";
import StatCard from "../StatCard.vue";
import StatGrid from "../StatGrid.vue";
import Switch from "../Switch.vue";
import ToggleRow from "../ToggleRow.vue";

export default {
  title: "Foundations/Dashboard Primitives",
  parameters: { layout: "padded" },
};

const navItems = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "chapters", label: "Chapters", icon: "book", count: 12 },
  { id: "media", label: "Media", icon: "image" },
  { id: "analytics", label: "Analytics", icon: "chart", soon: true },
];

export const BaseCardStates = {
  render: () => ({
    components: { BaseCard },
    template: `<div style="display:grid;gap:16px;max-width:680px">
      <BaseCard><template #header>Course workspace</template><p>The Retina · 8 sections</p><template #footer>Last edited 2 hours ago</template></BaseCard>
      <BaseCard interactive as="button" padding="lg">Open Foundations of Neuroscience</BaseCard>
    </div>`,
  }),
};

export const BaseModalOpen = {
  render: () => ({
    components: { BaseModal },
    template: `<BaseModal :model-value="true" title="Publish chapter" size="md"><p>Publish “The Retina” to enrolled readers?</p><template #footer><button>Cancel</button><button>Publish</button></template></BaseModal>`,
  }),
};

export const ConfirmDialogDestructive = {
  render: () => ({
    components: { ConfirmDialog },
    template: `<ConfirmDialog :model-value="true" title="Delete draft?" message="This removes 14 paragraphs and cannot be undone." confirm-label="Delete draft" />`,
  }),
};

export const DashboardNavIconSet = {
  render: () => ({
    components: { DashboardNavIcon },
    data: () => ({ names: navItems.map((item) => item.icon) }),
    template: `<div style="display:flex;gap:24px"><div v-for="name in names" :key="name" style="display:grid;gap:8px;justify-items:center"><DashboardNavIcon :name="name"/><small>{{ name }}</small></div></div>`,
  }),
};

export const DashboardRailAdmin = {
  render: () => ({
    components: { DashboardRail },
    data: () => ({ navItems, active: "chapters" }),
    template: `<div style="max-width:260px"><DashboardRail :nav-items="navItems" :active-section="active" display-name="Dr Stuart Trenholm" email="stuart@example.org" role="Creator" @update:active-section="active = $event" /></div>`,
  }),
};

export const DashboardShellResponsive = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => ({
    components: { DashboardShell, SectionHeader, BaseCard },
    data: () => ({ navItems, active: "overview" }),
    template: `<DashboardShell :nav-items="navItems" :active-section="active" display-name="Dr Stuart Trenholm" role="Creator" accent="teal" @update:active-section="active = $event"><SectionHeader eyebrow="01 · Overview" title="Open Brain administration" subtitle="Review chapters, collaborators, and publishing status."/><BaseCard><p>12 chapters · 4 collaborators · 2 drafts</p></BaseCard></DashboardShell>`,
  }),
};

const columns = [
  { key: "title", label: "Chapter", sortable: true },
  { key: "owner", label: "Owner" },
  { key: "status", label: "Status" },
];
const rows = [
  {
    id: "retina",
    title: "The Retina",
    owner: "Stuart Trenholm",
    status: "Published",
  },
  {
    id: "foundations",
    title: "Foundations of Neuroscience",
    owner: "Editorial team",
    status: "Draft",
  },
];

export const DataTableCourses = {
  render: () => ({
    components: { DataTable },
    data: () => ({ columns, rows }),
    template: `<DataTable :columns="columns" :data="rows" selectable row-key="id" />`,
  }),
};

export const EmptyStateCourse = {
  render: () => ({
    components: { EmptyState },
    template: `<EmptyState title="No draft chapters" message="Start a chapter or import an existing manuscript." action-label="Create chapter" />`,
  }),
};

export const ErrorStateNetwork = {
  render: () => ({
    components: { ErrorState },
    template: `<ErrorState title="Couldn’t load collaborators" message="Check your connection and try again." retry-label="Retry" />`,
  }),
};

export const FilterChipsRoles = {
  render: () => ({
    components: { FilterChips },
    data: () => ({
      value: "all",
      options: [
        { value: "all", label: "All", count: 48 },
        { value: "professor", label: "Professors", count: 12 },
        { value: "student", label: "Students", count: 35 },
      ],
    }),
    template: `<FilterChips v-model="value" :options="options" show-counts />`,
  }),
};

export const ListRowLongContent = {
  render: () => ({
    components: { ListRow, PreviewTag },
    template: `<div style="max-width:520px"><ListRow label="A deliberately long chapter title about retinal direction selectivity and motion encoding" hint="Last edited by Dr Trenholm · yesterday" interactive><PreviewTag variant="beta"/></ListRow></div>`,
  }),
};

export const LoadingStateAdmin = {
  render: () => ({
    components: { LoadingState },
    template: `<LoadingState size="lg" message="Loading course analytics…"/>`,
  }),
};

export const PaginationLongResultSet = {
  render: () => ({
    components: { Pagination },
    data: () => ({ page: 6 }),
    template: `<Pagination :current-page="page" :total-pages="14" :total-items="274" :page-size="20" @page-change="page = $event"/>`,
  }),
};

export const PreviewTagVariants = {
  render: () => ({
    components: { PreviewTag },
    template: `<div style="display:flex;gap:18px"><PreviewTag/><PreviewTag variant="soon"/><PreviewTag variant="beta" bare/></div>`,
  }),
};

export const SearchInputPopulated = {
  render: () => ({
    components: { SearchInput },
    data: () => ({ query: "retinal circuits" }),
    template: `<div style="max-width:420px"><SearchInput v-model="query" :debounce="0" placeholder="Search chapters…"/></div>`,
  }),
};

export const SectionHeaderWithAction = {
  render: () => ({
    components: { SectionHeader },
    template: `<SectionHeader eyebrow="03 · Chapters" title="Curriculum" subtitle="Manage the chapters currently available to readers." preview><template #actions><button>New chapter</button></template></SectionHeader>`,
  }),
};

export const SegmentedControlRange = {
  render: () => ({
    components: { SegmentedControl },
    data: () => ({
      value: "30d",
      options: [
        { value: "7d", label: "7 days" },
        { value: "30d", label: "30 days" },
        { value: "90d", label: "90 days" },
      ],
    }),
    template: `<SegmentedControl v-model="value" :options="options" aria-label="Analytics range"/>`,
  }),
};

export const StatGridAnalytics = {
  render: () => ({
    components: { StatGrid, StatCard },
    template: `<StatGrid :columns="4"><StatCard label="Active readers" :value="1248" :delta="12" delta-label="this month"/><StatCard label="Chapters" :value="12"/><StatCard label="Completion" :value="68" suffix="%"/><StatCard label="Projected" preview/></StatGrid>`,
  }),
};

export const SwitchStates = {
  render: () => ({
    components: { Switch },
    data: () => ({ enabled: true }),
    template: `<div style="display:flex;gap:24px;align-items:center"><Switch v-model:checked="enabled"/><Switch :checked="false"/><Switch checked disabled/></div>`,
  }),
};

export const ToggleRowPreference = {
  render: () => ({
    components: { ToggleRow },
    data: () => ({ enabled: true }),
    template: `<div style="max-width:560px"><ToggleRow v-model:checked="enabled" label="Weekly reader digest" hint="Email a concise summary of course activity every Friday."/></div>`,
  }),
};
