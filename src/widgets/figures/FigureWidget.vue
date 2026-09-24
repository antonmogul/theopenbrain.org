<script setup>
/*
 * Hosts a figure widget (OPENBRAIN-80). The reader places it (full width,
 * pinned); this gives it the chapter's accent and its content, and nothing
 * else of the page. Widgets style themselves off the --widget-* variables.
 */
import { computed, defineAsyncComponent } from "vue";
import { figureWidgetFor } from "./registry.js";
import { figureContent } from "./content.js";
import { lottiePath } from "@/helper/animationResolve";

const props = defineProps({
  /** The resolved animation record (useAnimations / animations.json shape). */
  record: { type: Object, required: true },
});

const entry = computed(() => figureWidgetFor(props.record?.id));
const Widget = computed(() =>
  entry.value ? defineAsyncComponent(entry.value.load) : null
);
const content = computed(() =>
  entry.value ? figureContent(entry.value.schema, props.record) : null
);
</script>

<template>
  <div v-if="Widget" class="widget-root figure-widget">
    <component
      :is="Widget"
      :content="content"
      :schema="entry.schema"
      :lottie-url="lottiePath(record)"
    />
  </div>
</template>

<style>
/* The accent is the chapter's ramp ([data-chapter] on <html>), so a widget
   used in two chapters matches each one. */
.figure-widget {
  --widget-accent: rgb(var(--color-chapter));
  --widget-accent-deep: rgb(var(--color-chapter-deep));
  --widget-accent-pale: rgb(var(--color-chapter-pale));
  width: 100%;
  height: 100%;
}
</style>
