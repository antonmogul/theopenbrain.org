<script setup>
/*
 * Specimen — frames one live component demo in the catalog: a labelled stage
 * with the rendered instance in the default slot. Used by the Components
 * collections on the styleguide page.
 */
defineProps({
  name: { type: String, required: true },
  importPath: { type: String, default: "" },
  // Optional one-liner describing the variant being shown.
  note: { type: String, default: "" },
  // Light = stage on paper (default); "muted" = stage on bg for contrast.
  surface: { type: String, default: "paper" },
});
</script>

<template>
  <figure class="specimen">
    <div class="stage" :class="`stage--${surface}`">
      <div class="stage-inner">
        <slot />
      </div>
    </div>
    <figcaption class="caption">
      <span class="t-body-sm name">{{ name }}</span>
      <span v-if="note" class="note">{{ note }}</span>
      <code v-if="importPath" class="t-label path">{{ importPath }}</code>
    </figcaption>
  </figure>
</template>

<style scoped>
.specimen {
  display: flex;
  flex-direction: column;
  border: 1px solid rgb(var(--color-line));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--color-paper));
}
.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 2.5rem 2rem;
}
.stage--paper {
  background: rgb(var(--color-paper));
}
.stage--muted {
  background: rgb(var(--color-bg));
}
.stage-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.caption {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-bg) / 0.5);
}
.name {
  font-weight: 600;
}
.note {
  font-size: 1.2rem;
  color: rgb(var(--color-mute));
}
.path {
  color: rgb(var(--color-accent));
  margin-top: 0.15rem;
}
</style>
