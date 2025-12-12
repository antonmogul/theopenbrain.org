<script setup>
/**
 * VersionsSection Component
 *
 * Main versions management section for the dashboard.
 */

import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useVersionsStore } from '@/stores/dashboard/versions';
import { useAuth } from '@/composables/useAuth';
import { STATUS } from '@/constants/dashboard';
import LoadingState from '../shared/LoadingState.vue';
import ErrorState from '../shared/ErrorState.vue';
import EmptyState from '../shared/EmptyState.vue';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import VersionCard from './VersionCard.vue';
import VersionModal from './VersionModal.vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});

const { profile } = useAuth();
const versionsStore = useVersionsStore();
const {
  versions,
  loading,
  error,
  showModal,
  editingVersion,
  form,
} = storeToRefs(versionsStore);

// Confirm dialog state
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  variant: 'danger',
  action: null,
});

const formLoading = ref(false);

// Fetch versions when section becomes active
watch(() => props.active, (isActive) => {
  if (isActive && versions.value.length === 0) {
    versionsStore.fetchVersions();
  }
}, { immediate: true });

function handleCreateVersion() {
  versionsStore.openModal();
}

function handleEditVersion(version) {
  versionsStore.openModal(version);
}

async function handleSubmit() {
  formLoading.value = true;
  try {
    if (editingVersion.value) {
      // Update existing version (not implemented in store yet)
      console.log('Update version:', form.value);
    } else {
      await versionsStore.createVersion(profile.value?.id);
    }
  } catch (err) {
    console.error('Error saving version:', err);
    alert('Failed to save version: ' + err.message);
  } finally {
    formLoading.value = false;
  }
}

function handlePublish(version) {
  confirmDialog.value = {
    show: true,
    title: 'Publish Version',
    message: `Are you sure you want to publish v${version.version_number}? This will make it available to all users.`,
    variant: 'info',
    action: async () => {
      try {
        await versionsStore.updateVersionStatus(version.id, STATUS.PUBLISHED);
      } catch (err) {
        console.error('Error publishing version:', err);
        alert('Failed to publish version: ' + err.message);
      }
    },
  };
}

function handleArchive(version) {
  confirmDialog.value = {
    show: true,
    title: 'Archive Version',
    message: `Are you sure you want to archive v${version.version_number}? Users will no longer be able to access this version.`,
    variant: 'warning',
    action: async () => {
      try {
        await versionsStore.updateVersionStatus(version.id, STATUS.ARCHIVED);
      } catch (err) {
        console.error('Error archiving version:', err);
        alert('Failed to archive version: ' + err.message);
      }
    },
  };
}

function handleDelete(version) {
  confirmDialog.value = {
    show: true,
    title: 'Delete Version',
    message: `Are you sure you want to delete v${version.version_number}? This action cannot be undone.`,
    variant: 'danger',
    action: async () => {
      try {
        await versionsStore.deleteVersion(version.id);
      } catch (err) {
        console.error('Error deleting version:', err);
        alert('Failed to delete version: ' + err.message);
      }
    },
  };
}

async function handleConfirmAction() {
  if (confirmDialog.value.action) {
    await confirmDialog.value.action();
  }
  confirmDialog.value.show = false;
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Content Versions</h2>
        <p class="text-sm text-gray-500 mt-1">
          Manage content versions and releases
        </p>
      </div>
      <button
        @click="handleCreateVersion"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Version
      </button>
    </div>

    <!-- Loading state -->
    <LoadingState v-if="loading" message="Loading versions..." />

    <!-- Error state -->
    <ErrorState
      v-else-if="error"
      :message="error"
      @retry="versionsStore.fetchVersions()"
    />

    <!-- Empty state -->
    <EmptyState
      v-else-if="versions.length === 0"
      title="No versions yet"
      message="Create your first content version to start managing releases."
      icon="folder"
      action-label="Create Version"
      @action="handleCreateVersion"
    />

    <!-- Versions grid -->
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <VersionCard
        v-for="version in versions"
        :key="version.id"
        :version="version"
        @publish="handlePublish"
        @archive="handleArchive"
        @edit="handleEditVersion"
        @delete="handleDelete"
      />
    </div>

    <!-- Create/Edit modal -->
    <VersionModal
      :show="showModal"
      :editing="!!editingVersion"
      :form="form"
      :loading="formLoading"
      @close="versionsStore.closeModal()"
      @submit="handleSubmit"
      @update:form="form = $event"
    />

    <!-- Confirm dialog -->
    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :variant="confirmDialog.variant"
      @confirm="handleConfirmAction"
      @cancel="confirmDialog.show = false"
    />
  </div>
</template>
