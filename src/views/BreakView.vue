<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BreakImages from "@/components/chapter/text/BreakImages.vue";
import infos from "@/assets/json_backend/breakVideos.json";
const route = useRoute();
const router = useRouter();
const info = computed(() => infos.videos?.[route.params.video]);
</script>

<template>
  <main class="break-video-page">
    <button class="break-video-back" type="button" @click="router.go(-1)">
      ← Back to reading
    </button>
    <BreakImages
      v-if="info"
      :slug="route.params.video"
      :title="info.title"
      :text="info.text"
    />
    <div v-else data-testid="break-not-found">
      <h1>Break video not found</h1>
      <p>There is no break video called “{{ route.params.video }}”.</p>
      <RouterLink to="/chapters" class="underline underline-offset-4"
        >Back to the chapters</RouterLink
      >
    </div>
  </main>
</template>

<style scoped>
.break-video-page {
  max-width: 64rem;
  padding: 2rem 1rem;
  margin: 0 auto;
}
.break-video-back {
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: 0;
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  background: rgb(var(--color-paper));
}
.break-video-back:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
</style>
