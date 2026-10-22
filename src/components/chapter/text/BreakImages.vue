<script setup>
import { computed } from "vue";
import VideoEmbed from "./VideoEmbed.vue";
import jsonVideos from "@/assets/json_backend/breakVideos.json";

const props = defineProps({ slug: String, title: String, text: String });
const currentVideo = computed(() => jsonVideos.videos[props.slug]);
const authored = computed(() =>
  props.slug === "placeholder"
    ? { title: props.title, text: props.text }
    : currentVideo.value
);
const video = computed(() => ({
  src: `/publicAssets/video/breakSections/${props.slug}.mp4`,
  poster:
    props.slug === "placeholder"
      ? "/publicAssets/images/placeholders/monaLisa.webp"
      : `/publicAssets/images/breakVideos/${props.slug}.png`,
  title: authored.value?.title || props.title,
  caption: [
    authored.value?.title || props.title,
    authored.value?.text || props.text,
  ]
    .filter(Boolean)
    .join(" — "),
}));
</script>

<template>
  <VideoEmbed v-if="currentVideo" :video="video" />
  <p v-else class="font-mono text-small my-8">
    {{ title || "Video" }}<span v-if="text"> — {{ text }}</span>
    <span> · Video unavailable.</span>
  </p>
</template>
