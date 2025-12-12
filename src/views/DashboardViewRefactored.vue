<script setup>
/**
 * DashboardView (Refactored)
 *
 * Creator dashboard using modular components and stores.
 * This is a refactored version of the original 6,850 line DashboardView.vue
 */

import { ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { setSession } from '@/services/api/client';
import { SECTIONS, CREATOR_NAV_ITEMS } from '@/constants/dashboard';

// Layout components
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue';

// Feature sections
import { ChaptersSection } from '@/components/dashboard/chapters';
import { VersionsSection } from '@/components/dashboard/versions';
import { MediaSection } from '@/components/dashboard/media';
import { UsersSection } from '@/components/dashboard/users';
import { QuizzesSection } from '@/components/dashboard/quizzes';
import { AnalyticsSection } from '@/components/dashboard/analytics';

// Stores
import {
  useChaptersStore,
  useVersionsStore,
  useMediaStore,
  useUsersStore,
  useQuizzesStore,
  useAnalyticsStore,
} from '@/stores/dashboard';

const router = useRouter();
const {
  user,
  profile,
  loading,
  profileLoading,
  isAuthenticated,
  userRole,
  isCreator,
  signOut,
  session,
} = useAuth();

// Set API session when it changes
watch(session, (newSession) => {
  if (newSession) {
    setSession(newSession);
  }
}, { immediate: true });

// Current active section in sidebar
const activeSection = ref(SECTIONS.DASHBOARD);

// Initialize stores
const chaptersStore = useChaptersStore();
const versionsStore = useVersionsStore();
const mediaStore = useMediaStore();
const usersStore = useUsersStore();
const quizzesStore = useQuizzesStore();
const analyticsStore = useAnalyticsStore();

// Dashboard overview stats
const overviewStats = computed(() => ({
  chapters: chaptersStore.chapters.length,
  versions: versionsStore.versions.length,
  media: mediaStore.items.length,
  users: usersStore.roleCounts.total || 0,
  quizzes: quizzesStore.quizzes.length,
}));

// Handle logout
async function handleLogout() {
  await signOut();
  router.push('/login');
}

// Handle sidebar navigation
function handleSectionChange(sectionId) {
  activeSection.value = sectionId;
}

// Reset all stores when component unmounts
onMounted(() => {
  // Initial data fetch for overview
  if (isCreator.value) {
    chaptersStore.fetchChapters();
    versionsStore.fetchVersions();
  }
});

// Watch for auth changes
watch([isAuthenticated, profileLoading], ([authenticated, loadingProfile]) => {
  if (!loadingProfile && !authenticated) {
    router.push('/login');
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading state -->
    <div v-if="loading || profileLoading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <svg class="animate-spin h-10 w-10 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p class="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    </div>

    <!-- Access denied -->
    <div v-else-if="!isCreator" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p class="text-gray-600 mb-4">You don't have permission to access the Creator Dashboard.</p>
        <button
          @click="router.push('/')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Go to Homepage
        </button>
      </div>
    </div>

    <!-- Dashboard layout -->
    <div v-else class="flex min-h-screen">
      <!-- Sidebar -->
      <DashboardSidebar
        :nav-items="CREATOR_NAV_ITEMS"
        :active-section="activeSection"
        :user-name="profile?.full_name || user?.email"
        :user-role="userRole"
        accent-color="indigo"
        logo-text="Open Brain"
        @navigate="handleSectionChange"
        @logout="handleLogout"
      />

      <!-- Main content -->
      <div class="flex-1 flex flex-col">
        <!-- Header -->
        <DashboardHeader
          :title="activeSection.charAt(0).toUpperCase() + activeSection.slice(1)"
          @logout="handleLogout"
        />

        <!-- Content area -->
        <main class="flex-1 p-6 overflow-y-auto">
          <!-- Dashboard Overview -->
          <div v-if="activeSection === SECTIONS.DASHBOARD">
            <div class="mb-6">
              <h2 class="text-2xl font-bold text-gray-900">Welcome back, {{ profile?.full_name || 'Creator' }}!</h2>
              <p class="text-sm text-gray-500 mt-1">Here's what's happening with your content.</p>
            </div>

            <!-- Quick stats -->
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
              <button
                v-for="stat in [
                  { section: SECTIONS.CHAPTERS, label: 'Chapters', value: overviewStats.chapters, icon: 'book' },
                  { section: SECTIONS.VERSIONS, label: 'Versions', value: overviewStats.versions, icon: 'layers' },
                  { section: SECTIONS.MEDIA, label: 'Media', value: overviewStats.media, icon: 'image' },
                  { section: SECTIONS.USERS, label: 'Users', value: overviewStats.users, icon: 'users' },
                  { section: SECTIONS.QUIZZES, label: 'Quizzes', value: overviewStats.quizzes, icon: 'quiz' },
                ]"
                :key="stat.section"
                @click="activeSection = stat.section"
                class="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all text-left"
              >
                <div class="text-sm font-medium text-gray-500">{{ stat.label }}</div>
                <div class="mt-1 text-3xl font-bold text-gray-900">{{ stat.value }}</div>
              </button>
            </div>

            <!-- Quick actions -->
            <div class="bg-white rounded-lg border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  @click="activeSection = SECTIONS.CHAPTERS"
                  class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-900">Edit Content</div>
                    <div class="text-sm text-gray-500">Manage chapters</div>
                  </div>
                </button>

                <button
                  @click="activeSection = SECTIONS.QUIZZES"
                  class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-900">Create Quiz</div>
                    <div class="text-sm text-gray-500">Add assessments</div>
                  </div>
                </button>

                <button
                  @click="activeSection = SECTIONS.MEDIA"
                  class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-900">Upload Media</div>
                    <div class="text-sm text-gray-500">Add assets</div>
                  </div>
                </button>

                <button
                  @click="activeSection = SECTIONS.ANALYTICS"
                  class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div class="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-900">View Analytics</div>
                    <div class="text-sm text-gray-500">Track performance</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Feature Sections -->
          <ChaptersSection
            v-else-if="activeSection === SECTIONS.CHAPTERS"
            :active="activeSection === SECTIONS.CHAPTERS"
          />

          <VersionsSection
            v-else-if="activeSection === SECTIONS.VERSIONS"
            :active="activeSection === SECTIONS.VERSIONS"
          />

          <MediaSection
            v-else-if="activeSection === SECTIONS.MEDIA"
            :active="activeSection === SECTIONS.MEDIA"
          />

          <UsersSection
            v-else-if="activeSection === SECTIONS.USERS"
            :active="activeSection === SECTIONS.USERS"
          />

          <QuizzesSection
            v-else-if="activeSection === SECTIONS.QUIZZES"
            :active="activeSection === SECTIONS.QUIZZES"
          />

          <AnalyticsSection
            v-else-if="activeSection === SECTIONS.ANALYTICS"
            :active="activeSection === SECTIONS.ANALYTICS"
          />
        </main>
      </div>
    </div>
  </div>
</template>
