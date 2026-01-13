<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  enrollment: {
    type: Object,
    required: true,
  },
});

const router = useRouter();

const course = computed(() => props.enrollment.course || {});

const progressPercent = computed(() => course.value.progressPercent || 0);

const modules = computed(() => course.value.modules || []);

function navigateToModule(module) {
  router.push({
    name: "chapter",
    params: {
      number: module.order_index || 1,
      slug: module.slug,
    },
  });
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
</script>

<template>
  <div class="course-card" data-testid="course-card">
    <div class="card-header">
      <div class="header-content">
        <h3 class="course-title">{{ course.title }}</h3>
        <p class="course-meta">
          {{ course.course_code }}
          <span v-if="course.semester"> &bull; {{ course.semester }}</span>
        </p>
        <p v-if="course.description" class="course-description">
          {{ course.description }}
        </p>
        <p v-if="course.professor?.full_name" class="course-professor">
          Prof. {{ course.professor.full_name }}
        </p>
      </div>
      <span class="progress-badge" data-testid="progress-bar">
        {{ progressPercent }}% complete
      </span>
    </div>

    <!-- Progress bar -->
    <div class="progress-bar-container">
      <div
        class="progress-bar-fill"
        :style="{ width: progressPercent + '%' }"
      ></div>
    </div>

    <!-- Modules list -->
    <div v-if="modules.length > 0" class="modules-list">
      <div
        v-for="module in modules"
        :key="module.id"
        class="module-item"
        @click="navigateToModule(module)"
      >
        <div class="module-info">
          <span class="module-status">
            <svg
              v-if="module.is_completed"
              class="check-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span v-else class="circle-icon"></span>
          </span>
          <span class="module-title">{{ module.title }}</span>
        </div>
        <button class="module-action" @click.stop="navigateToModule(module)">
          {{ module.is_completed ? "Review" : "Continue" }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="modules-empty">
      <p>No modules available yet</p>
    </div>

    <!-- Footer -->
    <div class="card-footer">
      <span class="enrolled-date">
        Enrolled {{ formatDate(enrollment.enrolled_at) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.course-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s;
}

.course-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.course-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
}

.course-meta {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.course-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  line-height: 1.5;
}

.course-professor {
  font-size: 0.875rem;
  color: #3b82f6;
  margin: 0;
}

.progress-badge {
  flex-shrink: 0;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.progress-bar-container {
  height: 4px;
  background: #e5e7eb;
  margin: 0 1.5rem;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.modules-list {
  padding: 0.75rem 1.5rem;
  border-top: 1px solid #f3f4f6;
  margin-top: 1rem;
}

.module-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s;
}

.module-item:last-child {
  border-bottom: none;
}

.module-item:hover {
  background: #f9fafb;
  margin: 0 -1.5rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.module-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.module-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.check-icon {
  color: #22c55e;
}

.circle-icon {
  width: 12px;
  height: 12px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
}

.module-title {
  font-size: 0.9375rem;
  color: #374151;
}

.module-action {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.module-action:hover {
  background: #eff6ff;
}

.modules-empty {
  padding: 1.5rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.card-footer {
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
}

.enrolled-date {
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>
