<template>
  <!-- Scroll-trigger start/end dots per animated paragraph. Dev chrome: only
       rendered with ?markers=1 (OPENBRAIN-31), or when a story forces `show`. -->
  <template v-if="show && paragraph?.animation">
    <template v-if="art === 'start'">
      <div
        v-if="!paragraph.animation.end && !paragraph.animation.middel"
        :class="`marker-${art}`"
      />
    </template>
    <template v-else>
      <div
        v-if="!paragraph.animation.start && !paragraph.animation.middel"
        :class="`marker-${art}`"
      />
    </template>
  </template>
</template>

<script setup>
import { markersEnabled } from "@/helper/debugFlags";

defineProps({
  paragraph: Object,
  art: String,
  // Defaults to the ?markers URL flag; Storybook passes true explicitly.
  show: { type: Boolean, default: () => markersEnabled() },
});
</script>

<style scoped></style>
