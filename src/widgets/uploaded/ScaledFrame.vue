<script setup>
/*
 * ScaledFrame — a WidgetFrame at a device width (390, 768, 1280 px), shrunk
 * to fit its column so the Studio can show all three side by side. The
 * widget lays itself out at the real width; only the picture is scaled.
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import WidgetFrame from "./WidgetFrame.vue";

const props = defineProps({
  html: { type: String, required: true },
  ramp: { type: String, default: "fund" },
  width: { type: Number, required: true },
  label: { type: String, default: "" },
});
const emit = defineEmits(["report"]);

const box = ref(null);
const scale = ref(1);
const frameHeight = ref(240);
let ro = null;

function measure() {
  const w = box.value?.clientWidth || props.width;
  scale.value = Math.min(1, w / props.width);
}
function onReport(r) {
  if (r.height) frameHeight.value = r.height;
  emit("report", r);
}
onMounted(() => {
  measure();
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(measure);
    ro.observe(box.value);
  }
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<template>
  <figure class="sf">
    <figcaption class="sf-label">
      {{ label }} <span class="sf-px">{{ width }} px</span>
    </figcaption>
    <div
      ref="box"
      class="sf-box"
      :style="{ height: `${Math.ceil(frameHeight * scale)}px` }"
    >
      <div
        class="sf-inner"
        :style="{ width: `${width}px`, transform: `scale(${scale})` }"
      >
        <WidgetFrame
          :html="html"
          :ramp="ramp"
          :width="width"
          :title="`${label} preview`"
          @report="onReport"
        />
      </div>
    </div>
  </figure>
</template>

<style scoped>
.sf {
  margin: 0;
  min-width: 0;
}
.sf-label {
  margin-bottom: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.sf-px {
  margin-left: 0.25rem;
  color: rgb(var(--color-ink) / 0.5);
}
.sf-box {
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(var(--color-line));
  background: #1c1c1c;
}
.sf-inner {
  transform-origin: 0 0;
}
</style>
