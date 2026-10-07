<script setup>
/*
 * BrainView — /brain, the 3D brain atlas prototype (OPENBRAIN-127).
 *
 * Unlisted route: open the URL directly. It is the candidate for the home
 * page's cover (Tyler's opening-book brain, rebuilt in the app with the
 * open-brain-explorer surface), shown on its own page until the team decides
 * where it goes. See src/components/brain/BrainAtlas.vue.
 */
import BrainAtlas from "@/components/brain/BrainAtlas.vue";
</script>

<template>
  <main class="brain-view">
    <BrainAtlas />
  </main>
</template>

<style scoped>
.brain-view {
  min-height: 100svh;
  background: rgb(var(--color-dark-surface));
}
</style>
