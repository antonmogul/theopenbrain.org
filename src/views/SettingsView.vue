<script setup>
import { usePreferences } from "@/composables/usePreferences";
import ThemeCards from "@/components/settings/ThemeCards.vue";
import AccentSwatches from "@/components/settings/AccentSwatches.vue";
import SegmentedControl from "@/components/settings/SegmentedControl.vue";
import FontPairPicker from "@/components/settings/FontPairPicker.vue";

const { readingSize, lineLength, reduceMotion } = usePreferences();

const readingSizeOptions = [
  { value: "compact", label: "Compact" },
  { value: "regular", label: "Regular" },
  { value: "comfortable", label: "Comfortable" },
];

const lineLengthOptions = [
  { value: "tight", label: "Tight" },
  { value: "standard", label: "Standard" },
  { value: "wide", label: "Wide" },
];

const motionOptions = [
  { value: "auto", label: "Auto" },
  { value: "on", label: "Reduce" },
  { value: "off", label: "Allow" },
];
</script>

<template>
  <main class="settings">
    <header class="header">
      <h1>Settings</h1>
      <p class="lede">
        Reading and display preferences. Synced across devices when signed in.
      </p>
    </header>

    <section class="card">
      <header class="section-header">
        <h2>Appearance</h2>
        <p>Theme follows your OS by default.</p>
      </header>
      <ThemeCards />
    </section>

    <section class="card">
      <header class="section-header">
        <h2>Accent</h2>
        <p>Used for highlights, links, and primary controls.</p>
      </header>
      <AccentSwatches />
    </section>

    <section class="card">
      <header class="section-header">
        <h2>Reading size</h2>
        <p>Scales body text everywhere.</p>
      </header>
      <SegmentedControl
        v-model="readingSize"
        :options="readingSizeOptions"
        aria-label="Reading size"
      />
    </section>

    <section class="card">
      <header class="section-header">
        <h2>Line length</h2>
        <p>How wide the prose column runs.</p>
      </header>
      <SegmentedControl
        v-model="lineLength"
        :options="lineLengthOptions"
        aria-label="Line length"
      />
    </section>

    <section class="card">
      <header class="section-header">
        <h2>Motion</h2>
        <p>Reduce or allow scroll-driven animations.</p>
      </header>
      <SegmentedControl
        v-model="reduceMotion"
        :options="motionOptions"
        aria-label="Motion"
      />
    </section>

    <section class="card">
      <header class="section-header">
        <h2>Font</h2>
        <p>Type system pairings.</p>
      </header>
      <FontPairPicker />
    </section>
  </main>
</template>

<style scoped>
.settings {
  max-width: 72rem;
  margin: 0 auto;
  padding: 6rem 2.4rem 12rem;
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  color: rgb(var(--color-ink));
}

.header {
  margin-bottom: 1.2rem;
}

h1 {
  font-size: 4rem;
  line-height: 1.1;
  padding: 0;
  margin: 0;
}

.lede {
  margin-top: 0.8rem;
  font-size: 1.5rem;
  color: rgb(var(--color-mute));
}

.card {
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 1.2rem;
  padding: 2rem 2.4rem 2.4rem;
}

.section-header {
  margin-bottom: 1.6rem;
}

h2 {
  font-size: 1.8rem;
  font-weight: 500;
  padding: 0;
  margin: 0;
  line-height: 1.2;
}

.section-header p {
  margin-top: 0.4rem;
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
}

@media (max-width: 767px) {
  .settings {
    padding: 4rem 1.6rem 8rem;
  }
  h1 {
    font-size: 3rem;
  }
}
</style>
