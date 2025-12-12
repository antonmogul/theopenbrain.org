<script setup>
/**
 * AnalyticsChart Component
 *
 * Simple chart visualization using canvas.
 */

import { ref, watch, onMounted, computed } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    // Expected: { labels: [], datasets: [{ label, data, borderColor, backgroundColor }] }
  },
  title: {
    type: String,
    default: '',
  },
  height: {
    type: Number,
    default: 200,
  },
});

const canvasRef = ref(null);

const maxValue = computed(() => {
  if (!props.data.datasets?.[0]?.data) return 0;
  return Math.max(...props.data.datasets[0].data, 1);
});

function drawChart() {
  const canvas = canvasRef.value;
  if (!canvas || !props.data.labels?.length) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const dataset = props.data.datasets?.[0];
  if (!dataset?.data?.length) return;

  const data = dataset.data;
  const labels = props.data.labels;
  const max = maxValue.value;

  // Draw grid lines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Y-axis labels
    const value = Math.round(max - (max / 4) * i);
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(value.toString(), padding.left - 10, y + 4);
  }

  // Draw line
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  ctx.strokeStyle = dataset.borderColor || '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((value, index) => {
    const x = padding.left + index * pointSpacing;
    const y = padding.top + chartHeight - (value / max) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw fill
  if (dataset.fill !== false) {
    ctx.fillStyle = dataset.backgroundColor || 'rgba(79, 70, 229, 0.1)';
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding.left + index * pointSpacing;
      const y = padding.top + chartHeight - (value / max) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(padding.left + (data.length - 1) * pointSpacing, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();
  }

  // Draw points
  ctx.fillStyle = dataset.borderColor || '#4F46E5';
  data.forEach((value, index) => {
    const x = padding.left + index * pointSpacing;
    const y = padding.top + chartHeight - (value / max) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw X-axis labels (show every nth label to avoid crowding)
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';

  const labelStep = Math.ceil(labels.length / 7);
  labels.forEach((label, index) => {
    if (index % labelStep === 0 || index === labels.length - 1) {
      const x = padding.left + index * pointSpacing;
      // Format date label
      const formattedLabel = label.slice(5); // Remove year, show MM-DD
      ctx.fillText(formattedLabel, x, height - padding.bottom + 20);
    }
  });
}

watch(() => props.data, () => {
  drawChart();
}, { deep: true });

onMounted(() => {
  drawChart();
});
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 v-if="title" class="text-sm font-medium text-gray-700 mb-4">{{ title }}</h3>
    <div v-if="data.labels?.length > 0">
      <canvas
        ref="canvasRef"
        :width="600"
        :height="height"
        class="w-full"
      />
    </div>
    <div v-else class="flex items-center justify-center py-12 text-gray-400">
      <p>No data available</p>
    </div>
  </div>
</template>
