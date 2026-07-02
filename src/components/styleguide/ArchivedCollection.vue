<script setup>
/*
 * Archived collection — controls for features that have been retired (dark mode
 * + font choice + accent choice). These components still exist on disk and
 * render, but nothing in the live app mounts them. Kept here as a record of what
 * existed and to make revival easy. Clearly labelled "not in use".
 */
import Specimen from "./Specimen.vue";

import ThemeCards from "@/components/settings/ThemeCards.vue";
import FontPairPicker from "@/components/settings/FontPairPicker.vue";
import AccentSwatches from "@/components/settings/AccentSwatches.vue";
</script>

<template>
  <div class="collection">
    <header class="col-head">
      <p class="t-label col-eyebrow">Components · Archived</p>
      <h2 class="t-h2">Retired controls</h2>
      <p class="t-body-sm col-note">
        Controls for features that were removed — dark-mode theming, font-pair
        choice, and accent selection. The components remain on disk so the
        features can be revived, but they are <strong>not mounted anywhere</strong>
        in the live app. Shown here for the record only.
      </p>
    </header>

    <div class="archived-banner t-label">Not in use — for reference</div>

    <div class="grid">
      <Specimen name="ThemeCards" import-path="settings/ThemeCards.vue" note="dark mode — retired">
        <ThemeCards />
      </Specimen>
      <Specimen name="FontPairPicker" import-path="settings/FontPairPicker.vue" note="font choice — retired">
        <FontPairPicker />
      </Specimen>
      <Specimen name="AccentSwatches" import-path="settings/AccentSwatches.vue" note="accent choice — retired">
        <AccentSwatches />
      </Specimen>
    </div>
  </div>
</template>

<style scoped>
.col-head {
  margin-bottom: 2rem;
}
.col-eyebrow {
  color: rgb(var(--color-mute));
  margin-bottom: 0.75rem;
}
.col-note {
  color: rgb(var(--color-mute));
  max-width: 62ch;
  margin-top: 0.75rem;
}
.archived-banner {
  display: inline-block;
  color: rgb(var(--color-warn));
  background: rgb(var(--color-warn) / 0.1);
  border: 1px solid rgb(var(--color-warn) / 0.4);
  border-radius: 999px;
  padding: 0.4rem 1rem;
  margin-bottom: 2rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  /* dim the retired controls so they don't read as live UI */
  opacity: 0.75;
}
</style>
