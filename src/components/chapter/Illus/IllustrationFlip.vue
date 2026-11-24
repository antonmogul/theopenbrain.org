<template>
  <div
    class="w-full h-full flex justify-center items-start"
    :class="{ 'flip-figure--inline': inline }"
  >
    <!-- Inline (in the text, below the two-column reader) the card is as
         wide as the column, not a third of the window, which is the pane's
         size: on a phone that left a 125px circle (OPENBRAIN-70). -->
    <div
      class="flip-card max-h-[835px] max-w-[835px]"
      :class="isFlip && 'flip'"
    >
      <div class="flip-card-inner">
        <video
          autoplay
          muted
          loop
          :width="widthVideo"
          :height="heightVideo"
          class="rounded-full flip-card-front"
        >
          <source
            :src="'/publicAssets/video/9-1-diseases/9-1-' + video + '.mp4'"
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
        <div class="flip-card-back rounded-full overflow-hidden">
          <img
            :width="widthVideo"
            :height="heightVideo"
            class="h-[100%] w-[100%]"
            :src="'/publicAssets/images/9-1-' + video + '.jpg'"
          />
        </div>
      </div>
    </div>
    <FlipIcon
      class="cursor-pointer duration-200 -translate-x-24 translate-y-20 fill-black stroke-black hover:stroke-chapter hover:fill-chapter hoverState"
      @click="flip"
    />
    <SourceElement :scource="animation.source" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { toSlug } from "@/helper/general";

import FlipIcon from "@/icons/custom/FlipIcon.vue";
import SourceElement from "../../UI/SourceElement.vue";

const isFlip = ref(false);

const flip = () => {
  isFlip.value = !isFlip.value;
};

const props = defineProps({
  animation: Object,
  inline: { type: Boolean, default: false },
});
const video = toSlug(props.animation.video);
const widthVideo = ref(
  window.innerWidth / 3 <= 835 ? window.innerWidth / 3 : 835
);
const heightVideo = widthVideo;
</script>

<style scoped>
.flip-card {
  background-color: transparent;
  width: calc(100vw / 3);
  height: calc(100vw / 3);
  perspective: 2000px;
}

/* In the text: the column's width (a circle, so never taller than a phone
   screen), the flip arrow at the card's lower right corner. */
.flip-figure--inline {
  position: relative;
  width: min(100%, 26rem);
  margin-inline: auto;
}
.flip-figure--inline .flip-card {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
}
.flip-figure--inline .hoverState {
  position: absolute;
  right: 0;
  bottom: 0;
  transform: none;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  box-shadow: 12px 12px 30px 0 rgba(0, 0, 0, 0.3);
  border-radius: 999%;
}

.flip-card.flip .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.flip-card-front {
  background-color: #bbb;
  color: black;
}

.flip-card-back {
  color: white;
  transform: rotateY(180deg);
}
</style>
