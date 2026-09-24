<script setup>
/*
 * Hosts a figure widget (OPENBRAIN-80). The reader places it (full width,
 * pinned); this gives it the chapter's accent and its content, and nothing
 * else of the page. Widgets style themselves off the --widget-* variables.
 */
import { computed, defineAsyncComponent, h } from "vue";
import { figureWidgetFor } from "./registry.js";
import { figureContent, versionedUrl } from "./content.js";
import { lottiePath } from "@/helper/animationResolve";

const props = defineProps({
  /** The resolved animation record (useAnimations / animations.json shape). */
  record: { type: Object, required: true },
});

const entry = computed(() => figureWidgetFor(props.record?.id));

// Shown when the widget's code doesn't load, e.g. a tab left open across a
// deploy whose old chunk is gone: say so, and offer the reload that fixes it.
const LoadFailed = {
  render: () =>
    h("div", { class: "figure-widget-failed", role: "alert" }, [
      h("p", "This figure didn't load."),
      h(
        "button",
        { type: "button", onClick: () => window.location.reload() },
        "Reload the page"
      ),
    ]),
};

const Widget = computed(() => {
  if (!entry.value) return null;
  const key = props.record?.id;
  return defineAsyncComponent({
    loader: entry.value.load,
    errorComponent: LoadFailed,
    timeout: 30000,
    onError(err, retry, fail, attempts) {
      if (attempts <= 1) retry();
      else {
        console.error(`[figure widget] ${key} didn't load`, err);
        fail();
      }
    },
  });
});
const content = computed(() =>
  entry.value ? figureContent(entry.value.schema, props.record) : null
);
const lottieUrl = computed(() =>
  versionedUrl(lottiePath(props.record), entry.value?.schema.lottieVersion)
);
</script>

<template>
  <div v-if="Widget" class="widget-root figure-widget">
    <component
      :is="Widget"
      :content="content"
      :schema="entry.schema"
      :lottie-url="lottieUrl"
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
  /* Widgets lay themselves out by the space they get (@container figure). */
  container: figure / size;
  width: 100%;
  height: 100%;
}
.figure-widget-failed {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  height: 100%;
  background: #333;
  color: #fff;
  font:
    1rem/1.5 "IBM Plex Sans",
    system-ui,
    sans-serif;
}
.figure-widget-failed p {
  margin: 0;
}
.figure-widget-failed button {
  padding: 6px 14px;
  border: 1px solid #fff;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
</style>
