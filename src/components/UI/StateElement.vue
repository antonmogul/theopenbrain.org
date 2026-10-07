<template>
  <!-- Inline (in the text, below the two-column reader) the states are a
       wrapping row under the figure, not a column pinned beside it. -->
  <div
    :class="
      inline
        ? 'relative flex flex-wrap gap-x-5 gap-y-2'
        : 'absolute top-40 left-[3.625rem] z-50'
    "
  >
    <p
      v-for="(state, index) in states"
      :key="state"
      class="hover:text-chapter-deep text-small cursor-pointer"
      :class="[
        inline ? 'py-1' : 'pb-6',
        activeState == index
          ? 'underline pointer-events-none text-chapter-deep'
          : '',
      ]"
      @click="$emit('onClick', { index, activeState })"
    >
      <template v-if="iconsIndex?.[index]">
        <img
          class="inline h-12 pr-2 -ml-1"
          :src="`/publicAssets/icons/${praefix}/${toSlug(state)}.svg`"
        />
      </template>
      {{ state }}
    </p>
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
});

defineEmits(["onClick"]);
</script>

<style scoped></style>
