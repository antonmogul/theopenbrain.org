<script setup>
/*
 * IllustrationWidget — an interactive widget as a paragraph's figure in the
 * left panel (OPENBRAIN-70 B5), e.g. History's phrenology skull. The row is
 * media_type "widget" with config.widgetId; the view comes from the same
 * lazy loaders the prose uses (src/widgets/embeds.js), so it is fetched only
 * when the figure is active.
 *
 * The stage is the pane's height, so an uploaded widget (which sizes its
 * frame to its own document) is told how tall it may be: the stage's height
 * is measured and provided as WIDGET_FIT, which UploadedWidgetEmbed passes
 * to its frame (OPENBRAIN-148). Vue widget views size themselves.
 */
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
} from "vue";
import { embedLoader, hasEmbed } from "@/widgets/embeds";
import { WIDGET_FIT } from "@/widgets/uploaded/widgetHost";

const props = defineProps({
  /** The figure: { id, title?, widgetId } from useAnimations. */
  animation: { type: Object, required: true },
  preload: { type: Boolean, default: false },
});
const emit = defineEmits(["ready"]);

const stage = ref(null);
const stageHeight = ref(0);
provide(WIDGET_FIT, stageHeight);

let observer = null;
function measure() {
  stageHeight.value = Math.floor(stage.value?.clientHeight || 0);
}
onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && stage.value) {
    observer = new ResizeObserver(measure);
    observer.observe(stage.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());

const available = computed(() => hasEmbed(props.animation.widgetId));
const view = computed(() =>
  available.value
    ? defineAsyncComponent(embedLoader(props.animation.widgetId))
    : null
);
</script>

<template>
  <figure
    class="iw pointer-events-auto"
    :aria-label="animation.title || 'Interactive'"
  >
    <div ref="stage" class="iw-stage">
      <component
        :is="view"
        v-if="view"
        :eager="preload"
        @ready="emit('ready')"
      />
      <p v-else class="iw-missing">
        This interactive ({{ animation.widgetId || "unknown" }}) isn't available
        in the reader yet.
      </p>
    </div>
    <figcaption v-if="animation.title" class="iw-caption">
      {{ animation.title }}
    </figcaption>
  </figure>
</template>

<style scoped>
.iw {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0;
}
.iw-stage {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
.iw-missing {
  padding: 2rem;
  font-family: var(--font-ui);
  color: rgb(var(--color-mute));
}
.iw-caption {
  padding: 8px 16px 12px;
  border-top: 1px solid rgb(var(--color-line));
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  color: rgb(var(--color-mute));
}
/* On the dark pane (.figure-pane--dark, OPENBRAIN-152): the embed keeps its
   own plate; its caption and the hairline take the pane's ink. */
.figure-pane--dark .iw-missing,
.figure-pane--dark .iw-caption {
  color: rgb(var(--figure-pane-ink) / 0.62);
}
.figure-pane--dark .iw-caption {
  border-top-color: rgb(var(--figure-pane-ink) / 0.12);
}
</style>
