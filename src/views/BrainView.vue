<script setup>
/*
 * BrainView — /brain, the 3D brain atlas prototype (OPENBRAIN-127).
 *
 * Unlisted route: open the URL directly. The same atlas is the home page's
 * cover since OPENBRAIN-158 (Tyler's opening-book brain, rebuilt in the app
 * with the open-brain-explorer surface); this page keeps it on its own, with
 * the atlas's own title and, under reduced motion, the stage still loaded
 * and draggable. See src/components/brain/BrainAtlas.vue.
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
