<template>
  <!-- `wide` images span the whole reader at desktop sizes (OPENBRAIN-72). -->
  <FullBleed
    v-if="paragraph?.img"
    :key="paragraph.id + 'img'"
    :enabled="!!paragraph.imgWide"
    :viewport="!!paragraph.imgWide"
  >
    <!-- Below the two-column reader an image in the text is a figure like
         any other (OPENBRAIN-70): the figure shell, as wide as the page,
         its caption folded behind "Legend" under the picture. The desktop
         block below is as wide as the two-column text column (w-text),
         which a phone's column is not: it was cut off on the right. -->
    <figure v-if="asShell" class="ii-figure my-12" data-inline-image>
      <IllustrationPlaceholder :animation="shellRecord" inline bare />
    </figure>
    <div
      v-else
      class="no-select z-[60] mb-20 right-0 duration-100 border-y border-black flex flex-col justify-center items-center bg-white"
      :class="paragraph.imgWide ? 'w-full ii-wide' : 'w-text -ml-20'"
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
import { computed } from "vue";
import { imageUrl } from "@/editor/media.mjs";
import FullBleed from "@/components/chapter/FullBleed.vue";
import IllustrationPlaceholder from "@/components/chapter/Illus/IllustrationPlaceholder.vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";

const props = defineProps({
  paragraph: Object,
});

const narrow = useMediaQuery(READER_NARROW_QUERY);
// A wide image keeps its own full-width block at every size.
const asShell = computed(() => narrow.value && !props.paragraph?.imgWide);
// The image as a figure record. It has no number or title of its own (the
// chapter's numbered figures are database rows), so the shell is `bare`.
const shellRecord = computed(() => ({
  id: `inline-image-${props.paragraph.id}`,
  title: "",
  caption: props.paragraph.imgCap || "",
  images: [{ src: imageUrl(props.paragraph.img) }],
}));
</script>

<style scoped>
.ii-figure {
  width: 100%;
}
.ii-wide {
  margin-bottom: 0;
}
/* A full-width image keeps a readable height and centres in the reader. */
.ii-wide :deep(.imageH) {
  min-height: 0;
  flex: 1;
  height: 0;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
}
.ii-wide :deep(.imgDesription) {
  max-width: 1100px;
  margin: 0 auto;
}
</style>
