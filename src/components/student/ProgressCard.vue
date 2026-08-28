<script setup>
import { computed } from "vue";

const props = defineProps({
  continueReading: {
    type: Object,
    default: null,
  },
});

const hasContent = computed(() => {
  return props.continueReading?.module;
});

const module = computed(() => props.continueReading?.module || {});
const course = computed(() => props.continueReading?.course || {});
const scrollPosition = computed(
  () => props.continueReading?.scrollPosition || 0
);

const continueRoute = computed(() => {
  if (!module.value.slug) return null;
  const query = { resume: "1" };
  if (course.value.id) query.courseId = course.value.id;
  return {
    name: "chapter",
    params: {
      number: module.value.courseModuleOrder || module.value.order_index || 1,
      slug: module.value.slug,
    },
    query,
  };
});

function formatRelativeTime(date) {
  if (!date) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}
</script>

<template>
  <router-link
    v-if="hasContent"
    class="progress-card"
    :to="continueRoute"
    :aria-label="`Continue reading ${module.title} at ${Math.round(scrollPosition)} percent`"
  >
    <div class="card-content">
      <div class="card-header">
        <span class="card-label">Continue Reading</span>
        <span v-if="continueReading.lastAccessedAt" class="last-accessed">
          {{ formatRelativeTime(continueReading.lastAccessedAt) }}
        </span>
      </div>

      <h3 class="module-title">{{ module.title }}</h3>
      <p class="course-name">{{ course.title }}</p>

      <!-- Progress indicator -->
      <div class="progress-section">
        <div
          class="progress-bar"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(scrollPosition)"
        >
          <div
            class="progress-fill"
            :style="{ width: scrollPosition + '%' }"
          ></div>
        </div>
        <span class="progress-text"
          >{{ Math.round(scrollPosition) }}% complete</span
        >
      </div>
    </div>

    <div class="card-action">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  </router-link>

  <!-- Empty state -->
  <div class="progress-card empty" v-else>
    <div class="empty-content">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
      </svg>
      <h3>Start Reading</h3>
      <p>Enroll in a course to begin your learning journey</p>
    </div>
  </div>
</template>

<style scoped>
.progress-card {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 16px;
  padding: 0.9375rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1.25rem;
  color: inherit;
  text-decoration: none;
}

.progress-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.3);
}

.progress-card:focus-visible {
  outline: 3px solid rgb(var(--color-ink));
  outline-offset: 3px;
}

.progress-card.empty {
  background: white;
  border: 2px dashed #e5e7eb;
  cursor: default;
  justify-content: center;
  min-height: 180px;
}

.progress-card.empty:hover {
  transform: none;
  box-shadow: none;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.46875rem;
}

.card-label {
  font-family: "IBM Plex Mono", monospace;
  font-size: var(--type-label-size);
  color: rgba(255, 255, 255, 0.92);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.last-accessed {
  font-size: var(--type-label-size);
  color: rgba(255, 255, 255, 0.9);
}

.module-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  margin: 0 0 0.15625rem 0;
  line-height: 1.3;
}

.course-name {
  font-size: var(--type-caption-size);
  color: rgba(255, 255, 255, 0.92);
  margin: 0 0 0.625rem 0;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: white;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--type-label-size);
  color: white;
  white-space: nowrap;
}

.card-action {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-left: 0.625rem;
  transition: all 0.2s;
}

.progress-card:hover .card-action {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(4px);
}

.empty-content {
  text-align: center;
  color: #9ca3af;
}

.empty-content svg {
  margin-bottom: 0.625rem;
  color: #d1d5db;
}

.empty-content h3 {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: var(--type-body-sm-size);
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 0.3125rem 0;
}

.empty-content p {
  font-size: var(--type-caption-size);
  margin: 0;
}
</style>
