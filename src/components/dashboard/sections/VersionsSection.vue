<script setup>
// Creator-dashboard "Versions" section (#11 split). Presentational: the parent
// view owns the useVersions composable instance and passes its refs in. Read
// state via props; two-way modal/form state via defineModel; actions via emits.
import { relativeLong as formatDate } from "@/utils/format";
import {
    SectionHeader,
    BaseCard,
    StatusBadge,
    EmptyState,
    LoadingState,
    ErrorState,
    BaseModal,
    Button,
    FormField,
} from "@/components/dashboard/shared";

defineProps({
    versions: { type: Array, default: () => [] },
    versionsLoading: { type: Boolean, default: false },
    versionsError: { type: [String, null], default: null },
});

// Two-way bindings the parent shares with the composable.
const showNewVersionModal = defineModel("showNewVersionModal", {
    type: Boolean,
    default: false,
});
const newVersionForm = defineModel("newVersionForm", {
    type: Object,
    default: () => ({ version_number: "", release_notes: "" }),
});

defineEmits(["fetch", "create", "update-status", "delete"]);
</script>

<style scoped>
@import "@/styles/dashboard-sections.css";
</style>

<template>
    <section class="section">
        <SectionHeader eyebrow="03 · Versions" title="Content versions">
            <template #actions>
                <Button variant="solid" size="sm" @click="showNewVersionModal = true">New version</Button>
            </template>
        </SectionHeader>

        <LoadingState v-if="versionsLoading" message="Loading versions…" />
        <ErrorState v-else-if="versionsError" :message="versionsError" @retry="$emit('fetch')" />
        <EmptyState
            v-else-if="versions.length === 0"
            title="No versions yet"
            message="Create your first content version to get started."
            action-label="Create version"
            @action="showNewVersionModal = true"
        />

        <div v-else class="stack">
            <BaseCard v-for="version in versions" :key="version.id" padding="md">
                <div class="card-head">
                    <div class="vh-info">
                        <h3 class="card-title sm">v{{ version.version_number }}</h3>
                        <StatusBadge :status="version.status" />
                    </div>
                    <div class="btn-row">
                        <Button
                            v-if="version.status === 'draft'"
                            variant="outline"
                            size="sm"
                            @click="$emit('update-status', version.id, 'published')"
                        >
                            Publish
                        </Button>
                        <Button
                            v-if="version.status === 'published'"
                            variant="outline"
                            size="sm"
                            @click="$emit('update-status', version.id, 'archived')"
                        >
                            Archive
                        </Button>
                        <Button variant="danger" size="sm" @click="$emit('delete', version.id)">Delete</Button>
                    </div>
                </div>
                <div class="meta-row">
                    <span>{{ version.moduleCount }} modules</span>
                    <span>Created {{ formatDate(version.created_at) }}</span>
                    <span v-if="version.published_at">Published {{ formatDate(version.published_at) }}</span>
                </div>
                <p v-if="version.release_notes" class="muted">{{ version.release_notes }}</p>
            </BaseCard>
        </div>

        <!-- New version modal -->
        <BaseModal v-model="showNewVersionModal" title="Create new version" size="lg">
            <div class="form-stack">
                <FormField label="Version number">
                    <input v-model="newVersionForm.version_number" type="text" placeholder="e.g., 2.0" />
                </FormField>
                <FormField label="Release notes">
                    <textarea v-model="newVersionForm.release_notes" placeholder="What's new in this version…" rows="4"></textarea>
                </FormField>
            </div>
            <template #footer>
                <Button variant="ghost" size="sm" @click="showNewVersionModal = false">Cancel</Button>
                <Button variant="solid" size="sm" @click="$emit('create')">Create version</Button>
            </template>
        </BaseModal>
    </section>
</template>
