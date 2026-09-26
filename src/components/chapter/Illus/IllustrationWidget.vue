<script setup>
/*
 * IllustrationWidget — an interactive widget as a paragraph's figure in the
 * left panel (OPENBRAIN-70 B5), e.g. History's phrenology skull. The row is
 * media_type "widget" with config.widgetId; the view comes from the same
 * lazy loaders the prose uses (src/widgets/embeds.js), so it is fetched only
 * when the figure is active.
 */
import { computed, defineAsyncComponent } from "vue";
import { embedLoader, hasEmbed } from "@/widgets/embeds";

const props = defineProps({
  /** The figure: { id, title?, widgetId } from useAnimations. */
  animation: { type: Object, required: true },
});

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
    <div class="iw-stage">
      <component :is="view" v-if="view" />
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
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}
</style>
