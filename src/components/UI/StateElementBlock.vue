<template>
  <div
    class="z-50"
    :class="
      inline
        ? 'grid w-full grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2'
        : ''
    "
  >
    <p
      v-for="(state, index) in states"
      :key="state"
      class="hover:border-chapter hover:text-chapter-deep select-none text-small cursor-pointer border-black border flex flex-col justify-center items-center"
      :class="[
        inline ? 'p-2' : 'mb-6 p-6 py-3',
        activeState == index
          ? 'font-semibold bg-chapter text-black pointer-events-none'
          : '',
      ]"
      @click="$emit('onClick', { index, activeState })"
    >
      <template v-if="praefix">
        <img
          class="w-full h-10 my-1"
          :class="activeState == index ? 'invert' : ''"
          :src="'/publicAssets/icons/' + praefix + '/' + toSlug(state) + '.svg'"
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
