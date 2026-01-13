<script setup>
import { computed } from "vue";

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({
      timeSpentThisWeek: 0,
      modulesCompleted: 0,
      highlightsMade: 0,
      notesTaken: 0,
    }),
  },
});

// Format time as human-readable
function formatTime(seconds) {
  if (!seconds || seconds < 60) return "0 min";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const statItems = computed(() => [
  {
    id: "time",
    label: "Time This Week",
    value: formatTime(props.stats.timeSpentThisWeek),
    icon: "clock",
    color: "#3b82f6",
    bgColor: "#eff6ff",
  },
  {
    id: "modules",
    label: "Modules Completed",
    value: props.stats.modulesCompleted,
    icon: "check",
    color: "#22c55e",
    bgColor: "#f0fdf4",
  },
  {
    id: "highlights",
    label: "Highlights Made",
    value: props.stats.highlightsMade,
    icon: "highlight",
    color: "#eab308",
    bgColor: "#fefce8",
  },
  {
    id: "notes",
    label: "Notes Taken",
    value: props.stats.notesTaken,
    icon: "notes",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
]);
</script>

<template>
  <div class="study-stats">
    <h3 class="stats-title">Study Stats This Week</h3>
    <div class="stats-grid">
      <div
        v-for="stat in statItems"
        :key="stat.id"
        class="stat-card"
        :style="{ '--stat-color': stat.color, '--stat-bg': stat.bgColor }"
      >
        <div class="stat-icon">
          <!-- Clock Icon -->
          <svg
            v-if="stat.icon === 'clock'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>

          <!-- Check Icon -->
          <svg
            v-else-if="stat.icon === 'check'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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

          <!-- Highlight Icon -->
          <svg
            v-else-if="stat.icon === 'highlight'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m9 11-6 6v3h9l3-3"></path>
            <path
              d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"
            ></path>
          </svg>

          <!-- Notes Icon -->
          <svg
            v-else-if="stat.icon === 'notes'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
            ></path>
            <path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            ></path>
          </svg>
        </div>
        <div class="stat-content">
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-label">{{ stat.label }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.study-stats {
  margin-bottom: 2rem;
}

.stats-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--stat-bg);
  color: var(--stat-color);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}
</style>
