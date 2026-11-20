<script setup>
import { computed } from "vue";
import VideoEmbed from "./VideoEmbed.vue";
import { breakVideoOf } from "@/helper/breakVideo";

const props = defineProps({
  slug: String,
  title: String,
  text: String,
  video: Object,
});
const videoData = computed(() =>
  breakVideoOf(
    props.video || { videoSlug: props.slug },
    props.title,
    props.text
  )
);
</script>

<template>
  <VideoEmbed v-if="videoData.src || videoData.youtubeId" :video="videoData" />
  <p v-else class="font-mono text-small my-8">
    {{ title || "Video" }}<span v-if="text"> — {{ text }}</span>
    <span> · Video unavailable.</span>
  </p>
</template>
