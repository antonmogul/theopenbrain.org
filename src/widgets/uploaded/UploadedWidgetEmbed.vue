<script setup>
/*
 * UploadedWidgetEmbed — an uploaded widget in a chapter (OPENBRAIN-105):
 * what embeds.js renders for widgetId "upload:<slug>", in a breakout, an
 * inline stage or the figure panel. It loads the widget by slug and runs it
 * in a WidgetFrame, in the chapter's colour (the ramp on <html>, set by the
 * router), else the colour it was uploaded with.
 */
import { computed, onMounted, ref } from "vue";
import WidgetFrame from "./WidgetFrame.vue";
import { fetchUploadedWidget } from "./useUploadedWidgets";

const props = defineProps({
  slug: { type: String, required: true },
});

const widget = ref(null);
const state = ref("loading"); // loading | ready | missing

onMounted(async () => {
  try {
    widget.value = await fetchUploadedWidget(props.slug);
    state.value = widget.value?.html ? "ready" : "missing";
  } catch (err) {
    console.warn(`[uploaded widget] ${props.slug} didn't load`, err);
    state.value = "missing";
  }
});

const ramp = computed(
  () =>
    (typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-chapter")) ||
    widget.value?.ramp ||
    "fund"
);
</script>

<template>
  <div class="uw">
    <WidgetFrame
      v-if="state === 'ready'"
      :html="widget.html"
      :ramp="ramp"
      :title="widget.title"
    />
    <p v-else-if="state === 'missing'" class="uw-note">
      This interactive isn't available yet.
    </p>
    <div v-else class="uw-wait" aria-hidden="true" />
  </div>
</template>

<style scoped>
.uw {
  width: 100%;
}
.uw-note {
  margin: 0;
  padding: 1.5rem;
  font-size: 0.95rem;
  color: rgb(var(--color-mute));
}
.uw-wait {
  min-height: 12rem;
  background: #1c1c1c;
}
</style>
