<template>
  <!-- Inline (in the text, below the two-column reader) the states are a
       wrapping row under the figure, not a column pinned beside it. -->
  <div
    :class="
      inline
        ? 'state-chips relative flex flex-wrap gap-2'
        : 'absolute top-40 left-[3.625rem] z-50'
    "
  >
    <!-- On a phone nothing hovers, so the row says what it is for
         (OPENBRAIN-71). -->
    <p v-if="inline && hint" class="state-chips__hint">{{ hint }}</p>
    <button
      type="button"
      :aria-pressed="activeState === index"
      v-for="(state, index) in states"
      :key="state"
      class="block text-left text-small cursor-pointer"
      :class="
        inline
          ? ['state-chip', { 'state-chip--on': activeState == index }]
          : [
              'hover:text-chapter-deep pb-6',
              activeState == index ? 'underline text-chapter-deep' : '',
            ]
      "
      @click="$emit('onClick', { index, activeState })"
    >
      <template v-if="iconsIndex?.[index]">
        <img
          class="inline h-12 pr-2 -ml-1"
          :src="`/publicAssets/icons/${praefix}/${toSlug(state)}.svg`"
        />
      </template>
      {{ state }}
    </button>
  </div>
</template>

<script setup>
import { toSlug } from "@/helper/general";

defineProps({
  states: Object,
  activeState: Number,
  praefix: String,
  iconsIndex: Object,
  inline: { type: Boolean, default: false },
  // Inline only: a line above the row saying what a tap does.
  hint: { type: String, default: "" },
});

defineEmits(["onClick"]);
</script>

<style scoped>
/* Inline (below the two-column reader) each state is a chip: a bordered
   button that fills in the chapter's colour while it is the one shown, so
   a phone reader can see the names are controls (OPENBRAIN-71). */
.state-chips__hint {
  flex: 1 1 100%;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1.45;
  color: rgb(var(--color-mute));
}
.state-chip {
  display: inline-flex;
  align-items: center;
  min-height: 2.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid rgb(var(--color-ink));
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  transition:
    background-color 0.15s,
    border-color 0.15s;
}
.state-chip:active {
  background: rgb(var(--color-ink) / 0.12);
}
.state-chip--on {
  background: rgb(var(--color-chapter-soft));
  font-weight: 600;
}
</style>
