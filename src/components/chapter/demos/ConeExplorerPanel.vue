<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
);

const emit = defineEmits(["close"]);

// --- Cone parameters ---
const cones = ref([
  { name: "S Cone", peak: 420, height: 1.0, width: 25, color: "#3b82f6" },
  { name: "M Cone", peak: 534, height: 1.0, width: 40, color: "#22c55e" },
  { name: "L Cone", peak: 564, height: 1.0, width: 45, color: "#ef4444" },
  { name: "Rod", peak: 498, height: 0.5, width: 35, color: "#9ca3af" },
]);

const activePreset = ref("normal");

const presets = {
  normal: [
    { peak: 420, height: 1.0 },
    { peak: 534, height: 1.0 },
    { peak: 564, height: 1.0 },
    { peak: 498, height: 0.5 },
  ],
  protanopia: [
    { peak: 420, height: 1.0 },
    { peak: 534, height: 1.0 },
    { peak: 564, height: 0 },
    { peak: 498, height: 0.5 },
  ],
  deuteranopia: [
    { peak: 420, height: 1.0 },
    { peak: 534, height: 0 },
    { peak: 564, height: 1.0 },
    { peak: 498, height: 0.5 },
  ],
  tritanopia: [
    { peak: 420, height: 0 },
    { peak: 534, height: 1.0 },
    { peak: 564, height: 1.0 },
    { peak: 498, height: 0.5 },
  ],
  rodMono: [
    { peak: 420, height: 0 },
    { peak: 534, height: 0 },
    { peak: 564, height: 0 },
    { peak: 498, height: 1.0 },
  ],
};

const presetLabels = {
  normal: "Normal",
  protanopia: "Protanopia",
  deuteranopia: "Deuteranopia",
  tritanopia: "Tritanopia",
  rodMono: "Rod Mono",
};

const presetInfo = {
  normal:
    "Normal trichromatic vision uses three cone types (S, M, L) to distinguish millions of colors across the visible spectrum.",
  protanopia:
    "Protanopia: absence of L (long-wavelength) cones. Affects ~1% of males. Reds appear dark, and red-green distinction is lost.",
  deuteranopia:
    "Deuteranopia: absence of M (medium-wavelength) cones. Affects ~1% of males. Similar red-green confusion as protanopia, but with different luminance perception.",
  tritanopia:
    "Tritanopia: absence of S (short-wavelength) cones. Very rare (<0.01%). Blue-yellow distinction is impaired; blues and greens become confusable.",
  rodMono:
    "Rod monochromacy (achromatopsia): no functional cones. Vision relies solely on rods — no color perception, low acuity, and extreme light sensitivity.",
};

function applyPreset(key) {
  activePreset.value = key;
  const values = presets[key];
  cones.value.forEach((cone, i) => {
    cone.peak = values[i].peak;
    cone.height = values[i].height;
  });
}

// Detect when user manually adjusts sliders away from preset
function onSliderInput() {
  // Check if current values still match any preset
  const match = Object.entries(presets).find(([, values]) =>
    values.every(
      (v, i) =>
        cones.value[i].peak === v.peak && cones.value[i].height === v.height
    )
  );
  activePreset.value = match ? match[0] : null;
}

// --- Gaussian curve math ---
const wavelengths = [];
for (let w = 380; w <= 780; w += 4) {
  wavelengths.push(w);
}

function gaussian(wavelength, peak, height, width) {
  const diff = wavelength - peak;
  return height * Math.exp(-0.5 * (diff / width) ** 2);
}

// --- Chart data ---
const chartData = computed(() => {
  const datasets = cones.value.map((cone, idx) => {
    const data = wavelengths.map((w) =>
      gaussian(w, cone.peak, cone.height, cone.width)
    );
    const isRod = idx === 3;
    return {
      label: cone.name,
      data,
      borderColor: cone.color,
      backgroundColor: isRod ? "transparent" : cone.color + "20",
      fill: !isRod,
      borderDash: isRod ? [6, 4] : [],
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
    };
  });

  return {
    labels: wavelengths,
    datasets,
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  scales: {
    x: {
      title: {
        display: true,
        text: "Wavelength (nm)",
        font: { family: "IBM Plex Sans", size: 13, weight: "500" },
        color: "#6b7280",
      },
      ticks: {
        callback: (val, idx) => {
          const w = wavelengths[idx];
          return w % 40 === 0 ? w : "";
        },
        maxRotation: 0,
        font: { family: "IBM Plex Mono", size: 11 },
        color: "#9ca3af",
      },
      grid: { color: "#f3f4f6" },
    },
    y: {
      min: 0,
      max: 1.05,
      title: {
        display: true,
        text: "Relative Sensitivity",
        font: { family: "IBM Plex Sans", size: 13, weight: "500" },
        color: "#6b7280",
      },
      ticks: {
        stepSize: 0.2,
        font: { family: "IBM Plex Mono", size: 11 },
        color: "#9ca3af",
      },
      grid: { color: "#f3f4f6" },
    },
  },
  plugins: {
    legend: {
      position: "top",
      labels: {
        usePointStyle: true,
        pointStyle: "line",
        font: { family: "IBM Plex Sans", size: 12 },
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: "rgba(31,41,55,0.9)",
      titleFont: { family: "IBM Plex Sans", size: 13 },
      bodyFont: { family: "IBM Plex Mono", size: 12 },
      callbacks: {
        title: (items) => `${items[0].label} nm`,
        label: (item) =>
          `${item.dataset.label}: ${item.parsed.y.toFixed(3)}`,
      },
    },
  },
};

// --- Color perception bar ---
const colorBarCanvas = ref(null);

function wavelengthToRGB(wavelength) {
  // CIE approximation of wavelength to visible RGB
  let r = 0,
    g = 0,
    b = 0;
  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }

  // Intensity falloff at edges of visible spectrum
  let factor = 0;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + (0.7 * (wavelength - 380)) / (420 - 380);
  } else if (wavelength >= 420 && wavelength <= 700) {
    factor = 1;
  } else if (wavelength > 700 && wavelength <= 780) {
    factor = 0.3 + (0.7 * (780 - wavelength)) / (780 - 700);
  }

  return [r * factor, g * factor, b * factor];
}

function drawColorBar() {
  const canvas = colorBarCanvas.value;
  if (!canvas) return;

  // Match canvas pixel buffer to its CSS-rendered size
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  const c = cones.value;
  const hasAnyCone = c[0].height > 0 || c[1].height > 0 || c[2].height > 0;

  for (let x = 0; x < w; x++) {
    const wavelength = 380 + (x / w) * 400;
    const [trueR, trueG, trueB] = wavelengthToRGB(wavelength);

    if (!hasAnyCone) {
      // Rod monochromacy — grayscale
      const rodResp = gaussian(wavelength, c[3].peak, c[3].height, c[3].width);
      const gray = rodResp * 0.8;
      ctx.fillStyle = `rgb(${Math.round(gray * 255)},${Math.round(gray * 255)},${Math.round(gray * 255)})`;
    } else {
      // Get cone responses at this wavelength
      const sResp = gaussian(wavelength, c[0].peak, c[0].height, c[0].width);
      const mResp = gaussian(wavelength, c[1].peak, c[1].height, c[1].width);
      const lResp = gaussian(wavelength, c[2].peak, c[2].height, c[2].width);

      // Approximate perceived color by weighting true color by cone sensitivity
      const totalResp = sResp + mResp + lResp;
      if (totalResp < 0.01) {
        ctx.fillStyle = "rgb(10,10,10)";
      } else {
        // Map cone responses to approximate RGB perception
        const percR = Math.min(1, lResp * 1.2);
        const percG = Math.min(1, mResp * 1.1);
        const percB = Math.min(1, sResp * 1.3);
        ctx.fillStyle = `rgb(${Math.round(percR * 255)},${Math.round(percG * 255)},${Math.round(percB * 255)})`;
      }
    }

    ctx.fillRect(x, 0, 1, h);
  }
}

// Watch cones and redraw color bar
watch(
  cones,
  () => {
    nextTick(drawColorBar);
  },
  { deep: true }
);

onMounted(() => {
  nextTick(drawColorBar);
});

// --- Info text ---
const infoText = computed(() => {
  if (activePreset.value && presetInfo[activePreset.value]) {
    return presetInfo[activePreset.value];
  }
  // Custom configuration description
  const active = cones.value
    .filter((c, i) => i < 3 && c.height > 0)
    .map((c) => c.name);
  const rodActive = cones.value[3].height > 0;
  if (active.length === 0 && !rodActive) {
    return "All photoreceptors are disabled — no light detection is possible.";
  }
  if (active.length === 0) {
    return "Only rods are active — vision would be monochromatic (grayscale), limited to scotopic (dim light) conditions.";
  }
  return `Custom configuration with ${active.join(", ")} active${rodActive ? " plus rods" : ""}. Adjust sliders to explore how shifting peaks or changing sensitivity affects color perception.`;
});
</script>

<template>
  <div class="cone-explorer">
    <!-- Presets -->
    <div class="presets-row">
      <span class="presets-label">Presets</span>
      <div class="presets-btns">
        <button
          v-for="(label, key) in presetLabels"
          :key="key"
          class="preset-btn"
          :class="{ active: activePreset === key }"
          @click="applyPreset(key)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <!-- Chart -->
    <div class="chart-wrap">
      <Line :data="chartData" :options="chartOptions" />
    </div>

    <!-- Color perception bar -->
    <div class="color-bar-section">
      <span class="color-bar-label">Perceived Color Spectrum</span>
      <canvas
        ref="colorBarCanvas"
        class="color-bar"
      ></canvas>
      <div class="color-bar-axis">
        <span>380 nm</span>
        <span>480</span>
        <span>580</span>
        <span>680</span>
        <span>780 nm</span>
      </div>
    </div>

    <!-- Sliders -->
    <div class="sliders-section">
      <div
        v-for="(cone, idx) in cones"
        :key="idx"
        class="slider-row"
      >
        <span class="cone-dot" :style="{ background: cone.color }"></span>
        <span class="cone-name">{{ cone.name }}</span>

        <label class="slider-group">
          <span class="slider-label">Peak</span>
          <input
            type="range"
            :min="380"
            :max="700"
            :step="1"
            v-model.number="cone.peak"
            :style="{ accentColor: cone.color }"
            @input="onSliderInput"
          />
          <span class="slider-value">{{ cone.peak }} nm</span>
        </label>

        <label class="slider-group">
          <span class="slider-label">Height</span>
          <input
            type="range"
            :min="0"
            :max="1"
            :step="0.05"
            v-model.number="cone.height"
            :style="{ accentColor: cone.color }"
            @input="onSliderInput"
          />
          <span class="slider-value">{{ cone.height.toFixed(2) }}</span>
        </label>
      </div>
    </div>

    <!-- Info panel -->
    <div class="info-panel">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <p class="info-text">{{ infoText }}</p>
    </div>
  </div>
</template>

<style scoped>
.cone-explorer {
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-family: "IBM Plex Sans", sans-serif;
  min-width: 0;
  overflow: hidden;
}

/* Presets */
.presets-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.presets-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.presets-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 6px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: #f9fafb;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  border-color: #7c3aed;
  color: #7c3aed;
}

.preset-btn.active {
  background: #7c3aed;
  border-color: #7c3aed;
  color: white;
}

/* Chart */
.chart-wrap {
  position: relative;
  height: 320px;
}

/* Color bar */
.color-bar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-bar-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.color-bar {
  width: 100%;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  display: block;
  box-sizing: border-box;
}

.color-bar-axis {
  display: flex;
  justify-content: space-between;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  color: #9ca3af;
}

/* Sliders */
.sliders-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #f3f4f6;
}

.cone-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cone-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  width: 56px;
  flex-shrink: 0;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.slider-label {
  font-size: 12px;
  color: #9ca3af;
  width: 38px;
  flex-shrink: 0;
}

.slider-group input[type="range"] {
  flex: 1;
  min-width: 60px;
  height: 6px;
  cursor: pointer;
}

.slider-value {
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  color: #6b7280;
  width: 52px;
  text-align: right;
  flex-shrink: 0;
}

/* Info panel */
.info-panel {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: #f5f3ff;
  border: 1px solid #ede9fe;
  border-radius: 10px;
}

.info-icon {
  color: #7c3aed;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #4b5563;
}
</style>
