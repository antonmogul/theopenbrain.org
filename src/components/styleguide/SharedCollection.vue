<script setup>
/*
 * Shared collection — the reusable design-system library (dashboard/shared/**).
 * Each component is rendered live in a Specimen cell with representative props.
 * Render-blockers caught by the catalog audit are handled here:
 *  - DashboardShell/Rail: backTo:'' so the <button> back-link renders (no router).
 *  - BaseModal/ConfirmDialog: teleport a full-screen scrim → button-triggered,
 *    not open-by-default, so they don't cover the page.
 *  - v-model components: bound to local refs below.
 */
import { ref } from "vue";
import Specimen from "./Specimen.vue";

import BaseCard from "@/components/dashboard/shared/BaseCard.vue";
import BaseModal from "@/components/dashboard/shared/BaseModal.vue";
import Button from "@/components/dashboard/shared/Button.vue";
import ConfirmDialog from "@/components/dashboard/shared/ConfirmDialog.vue";
import DashboardNavIcon from "@/components/dashboard/shared/DashboardNavIcon.vue";
import DashboardRail from "@/components/dashboard/shared/DashboardRail.vue";
import DataTable from "@/components/dashboard/shared/DataTable.vue";
import EmptyState from "@/components/dashboard/shared/EmptyState.vue";
import ErrorState from "@/components/dashboard/shared/ErrorState.vue";
import FilterChips from "@/components/dashboard/shared/FilterChips.vue";
import FormField from "@/components/dashboard/shared/FormField.vue";
import ListRow from "@/components/dashboard/shared/ListRow.vue";
import LoadingState from "@/components/dashboard/shared/LoadingState.vue";
import Pagination from "@/components/dashboard/shared/Pagination.vue";
import PreviewTag from "@/components/dashboard/shared/PreviewTag.vue";
import SearchInput from "@/components/dashboard/shared/SearchInput.vue";
import SectionHeader from "@/components/dashboard/shared/SectionHeader.vue";
import SegmentedControl from "@/components/dashboard/shared/SegmentedControl.vue";
import StatCard from "@/components/dashboard/shared/StatCard.vue";
import StatGrid from "@/components/dashboard/shared/StatGrid.vue";
import StatusBadge from "@/components/dashboard/shared/StatusBadge.vue";
import Switch from "@/components/dashboard/shared/Switch.vue";
import ToggleRow from "@/components/dashboard/shared/ToggleRow.vue";

// --- Local state for interactive demos ---
const search = ref("");
const filter = ref("all");
const segment = ref("grid");
const toggle = ref(false);
const switchOn = ref(true);
const modalOpen = ref(false);
const confirmOpen = ref(false);

const navItems = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "notes", label: "Notes", icon: "notes", count: 12 },
  { id: "soon", label: "Flashcards", icon: "flashcard", soon: true },
];
const railActive = ref("overview");

const tableColumns = [
  { key: "name", label: "Name", sortable: true },
  { key: "role", label: "Role" },
  { key: "score", label: "Score", align: "right", sortable: true },
];
const tableData = [
  { id: 1, name: "Ada Lovelace", role: "Student", score: 92 },
  { id: 2, name: "Alan Turing", role: "Student", score: 88 },
];

const filterOptions = [
  { value: "all", label: "All", count: 24 },
  { value: "published", label: "Published", count: 18 },
  { value: "draft", label: "Draft", count: 6 },
];
const segmentOptions = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
];
</script>

<template>
  <div class="collection">
    <header class="col-head">
      <p class="t-label col-eyebrow">Components · Shared</p>
      <h2 class="t-h2">Shared library</h2>
      <p class="t-body-sm col-note">
        The reusable, token-based components in
        <code>dashboard/shared/**</code> — the design-system backbone used across
        admin and reader surfaces. Each cell is a live instance.
      </p>
    </header>

    <!-- Actions -->
    <p class="t-label cat-eyebrow">Actions</p>
    <div class="grid">
      <Specimen name="Button" import-path="dashboard/shared/Button.vue" note="solid / md">
        <Button variant="solid" size="md">Save changes</Button>
      </Specimen>
    </div>

    <!-- Containers -->
    <p class="t-label cat-eyebrow">Containers</p>
    <div class="grid">
      <Specimen name="BaseCard" import-path="dashboard/shared/BaseCard.vue">
        <BaseCard padding="md"><p class="t-body-sm">Card body content</p></BaseCard>
      </Specimen>
      <Specimen name="StatGrid" import-path="dashboard/shared/StatGrid.vue" note="3 columns">
        <StatGrid :columns="3" bordered>
          <StatCard label="Modules" :value="8" />
          <StatCard label="Students" :value="1284" />
          <StatCard label="Avg score" value="82%" />
        </StatGrid>
      </Specimen>
      <Specimen name="BaseModal" import-path="dashboard/shared/BaseModal.vue" note="teleported — click to open">
        <Button variant="solid" size="sm" @click="modalOpen = true">Open modal</Button>
        <BaseModal v-model="modalOpen" title="Edit module" size="md">
          <p class="t-body-sm">Modal body content.</p>
        </BaseModal>
      </Specimen>
      <Specimen name="DashboardShell" import-path="dashboard/shared/DashboardShell.vue" note="full app shell" surface="muted">
        <DashboardRail
          :nav-items="navItems"
          v-model:active-section="railActive"
          display-name="Ada Lovelace"
          email="ada@example.com"
          role="creator"
          :back-to="''"
        />
      </Specimen>
    </div>

    <!-- Data display -->
    <p class="t-label cat-eyebrow">Data display</p>
    <div class="grid">
      <Specimen name="SectionHeader" import-path="dashboard/shared/SectionHeader.vue">
        <SectionHeader eyebrow="01" title="Your modules" subtitle="Everything you are building" />
      </Specimen>
      <Specimen name="StatCard" import-path="dashboard/shared/StatCard.vue" note="with delta">
        <StatCard label="Active students" :value="1284" :delta="12" delta-label="vs last week" />
      </Specimen>
      <Specimen name="ListRow" import-path="dashboard/shared/ListRow.vue">
        <ListRow label="Email notifications" hint="Weekly digest of activity">
          <Button variant="ghost" size="sm">Manage</Button>
        </ListRow>
      </Specimen>
      <Specimen name="DataTable" import-path="dashboard/shared/DataTable.vue">
        <DataTable :columns="tableColumns" :data="tableData" row-key="id" />
      </Specimen>
      <Specimen name="StatusBadge" import-path="dashboard/shared/StatusBadge.vue">
        <div class="badge-row">
          <StatusBadge status="published" />
          <StatusBadge status="draft" />
          <StatusBadge status="archived" />
        </div>
      </Specimen>
    </div>

    <!-- Inputs -->
    <p class="t-label cat-eyebrow">Inputs</p>
    <div class="grid">
      <Specimen name="SearchInput" import-path="dashboard/shared/SearchInput.vue">
        <SearchInput v-model="search" placeholder="Search modules…" />
      </Specimen>
      <Specimen name="FilterChips" import-path="dashboard/shared/FilterChips.vue">
        <FilterChips :options="filterOptions" v-model="filter" show-counts />
      </Specimen>
      <Specimen name="SegmentedControl" import-path="dashboard/shared/SegmentedControl.vue">
        <SegmentedControl v-model="segment" :options="segmentOptions" aria-label="View mode" />
      </Specimen>
      <Specimen name="ToggleRow" import-path="dashboard/shared/ToggleRow.vue">
        <ToggleRow label="Email notifications" hint="Send me a weekly digest" v-model:checked="toggle" />
      </Specimen>
      <Specimen name="Switch" import-path="dashboard/shared/Switch.vue">
        <Switch v-model:checked="switchOn" />
      </Specimen>
      <Specimen name="FormField" import-path="dashboard/shared/FormField.vue">
        <FormField label="Module title" hint="Shown to students" required>
          <input type="text" placeholder="Introduction to the retina" />
        </FormField>
      </Specimen>
    </div>

    <!-- Feedback -->
    <p class="t-label cat-eyebrow">Feedback</p>
    <div class="grid">
      <Specimen name="EmptyState" import-path="dashboard/shared/EmptyState.vue">
        <EmptyState title="No modules yet" message="Create your first module to get started." action-label="New module" />
      </Specimen>
      <Specimen name="LoadingState" import-path="dashboard/shared/LoadingState.vue">
        <LoadingState message="Loading modules…" size="md" />
      </Specimen>
      <Specimen name="ErrorState" import-path="dashboard/shared/ErrorState.vue">
        <ErrorState title="Could not load data" message="Check your connection and retry." retry-label="Try again" show-retry />
      </Specimen>
      <Specimen name="ConfirmDialog" import-path="dashboard/shared/ConfirmDialog.vue" note="teleported — click to open">
        <Button variant="ghost" size="sm" @click="confirmOpen = true">Open dialog</Button>
        <ConfirmDialog
          v-model="confirmOpen"
          title="Delete module?"
          message="This action cannot be undone."
          confirm-label="Delete"
          cancel-label="Cancel"
          variant="danger"
        />
      </Specimen>
    </div>

    <!-- Navigation -->
    <p class="t-label cat-eyebrow">Navigation</p>
    <div class="grid">
      <Specimen name="Pagination" import-path="dashboard/shared/Pagination.vue">
        <Pagination :current-page="2" :total-pages="10" :total-items="195" :page-size="20" show-info />
      </Specimen>
    </div>

    <!-- Misc -->
    <p class="t-label cat-eyebrow">Misc</p>
    <div class="grid">
      <Specimen name="DashboardNavIcon" import-path="dashboard/shared/DashboardNavIcon.vue">
        <div class="icon-row">
          <DashboardNavIcon name="grid" />
          <DashboardNavIcon name="notes" />
          <DashboardNavIcon name="flashcard" />
        </div>
      </Specimen>
      <Specimen name="PreviewTag" import-path="dashboard/shared/PreviewTag.vue">
        <PreviewTag variant="preview" />
      </Specimen>
    </div>
  </div>
</template>

<style scoped>
.col-head {
  margin-bottom: 3rem;
}
.col-eyebrow {
  color: rgb(var(--color-accent));
  margin-bottom: 0.75rem;
}
.col-note {
  color: rgb(var(--color-mute));
  max-width: 62ch;
  margin-top: 0.75rem;
}
.cat-eyebrow {
  color: rgb(var(--color-accent));
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgb(var(--color-line));
  margin: 3rem 0 1.5rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}
.badge-row,
.icon-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
</style>
