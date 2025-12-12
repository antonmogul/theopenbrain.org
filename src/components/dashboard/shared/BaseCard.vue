<script setup>
/**
 * BaseCard Component
 *
 * A reusable card wrapper with consistent styling.
 */

defineProps({
  padding: {
    type: String,
    default: 'p-6',
  },
  hover: {
    type: Boolean,
    default: false,
  },
  clickable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click']);
</script>

<template>
  <div
    :class="[
      'bg-white rounded-lg border border-gray-200 shadow-sm',
      padding,
      hover && 'transition-shadow hover:shadow-md',
      clickable && 'cursor-pointer',
    ]"
    @click="clickable && emit('click')"
  >
    <slot />
  </div>
</template>
