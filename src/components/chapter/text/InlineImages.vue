<template>
  <!-- `wide` images span the whole reader at desktop sizes (OPENBRAIN-72). -->
  <FullBleed
    v-if="paragraph?.img"
    :key="paragraph.id + 'img'"
    v-slot="{ floating }"
    :enabled="!!paragraph.imgWide"
  >
    <div
      class="no-select z-[60] mb-20 right-0 duration-100 border-y border-black flex flex-col justify-center items-center bg-white"
      :class="floating ? 'w-full ii-wide' : 'w-text -ml-20'"
    >
      <figure class="overflow-hidden flex flex-col h-full w-full">
        <img class="imageH object-contain" :src="imageUrl(paragraph.img)" />
        <div
          v-if="paragraph?.imgCap"
          class="imgDesription text-justify break-before-all border-t border-black px-20 pr-28 py-4 pb-6 font-mono text-small w-full overflow-scroll"
        >
          {{ paragraph?.imgCap }}
        </div>
      </figure>
    </div>
  </FullBleed>
</template>

<script setup>
import { imageUrl } from "@/editor/media.mjs";
import FullBleed from "@/components/chapter/FullBleed.vue";
const props = defineProps({
  paragraph: Object,
});
</script>

<style scoped>
/* A full-width image keeps a readable height and centres in the reader. */
.ii-wide :deep(.imageH) {
  max-height: 85vh;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
}
.ii-wide :deep(.imgDesription) {
  max-width: 1100px;
  margin: 0 auto;
}
</style>
