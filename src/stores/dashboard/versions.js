/**
 * Versions Store
 *
 * Manages content version state for the dashboard.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import versionsApi from '@/services/api/versions';
import { STATUS } from '@/constants/dashboard';

export const useVersionsStore = defineStore('dashboardVersions', () => {
  // State
  const versions = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Modal state
  const showModal = ref(false);
  const editingVersion = ref(null);
  const form = ref({
    version_number: '',
    release_notes: '',
  });

  // Getters
  const publishedVersions = computed(() =>
    versions.value.filter(v => v.status === STATUS.PUBLISHED)
  );

  const draftVersions = computed(() =>
    versions.value.filter(v => v.status === STATUS.DRAFT)
  );

  const latestVersion = computed(() =>
    versions.value[0] || null
  );

  // Actions
  async function fetchVersions() {
    loading.value = true;
    error.value = null;

    try {
      versions.value = await versionsApi.fetchVersions();
    } catch (err) {
      console.error('Error fetching versions:', err);
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function createVersion(userId) {
    if (!form.value.version_number) return;

    try {
      await versionsApi.createVersion(form.value, userId);
      closeModal();
      await fetchVersions();
    } catch (err) {
      console.error('Error creating version:', err);
      throw err;
    }
  }

  async function updateVersionStatus(versionId, status) {
    try {
      await versionsApi.updateVersionStatus(versionId, status);
      await fetchVersions();
    } catch (err) {
      console.error('Error updating version status:', err);
      throw err;
    }
  }

  async function deleteVersion(versionId) {
    try {
      await versionsApi.deleteVersion(versionId);
      await fetchVersions();
    } catch (err) {
      console.error('Error deleting version:', err);
      throw err;
    }
  }

  function openModal(version = null) {
    editingVersion.value = version;
    if (version) {
      form.value = {
        version_number: version.version_number,
        release_notes: version.release_notes || '',
      };
    } else {
      form.value = {
        version_number: '',
        release_notes: '',
      };
    }
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
    editingVersion.value = null;
    form.value = {
      version_number: '',
      release_notes: '',
    };
  }

  function reset() {
    versions.value = [];
    loading.value = false;
    error.value = null;
    showModal.value = false;
    editingVersion.value = null;
    form.value = {
      version_number: '',
      release_notes: '',
    };
  }

  return {
    // State
    versions,
    loading,
    error,
    showModal,
    editingVersion,
    form,

    // Getters
    publishedVersions,
    draftVersions,
    latestVersion,

    // Actions
    fetchVersions,
    createVersion,
    updateVersionStatus,
    deleteVersion,
    openModal,
    closeModal,
    reset,
  };
});

export default useVersionsStore;
