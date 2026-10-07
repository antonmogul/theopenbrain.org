<script setup>
import { computed } from "vue";

const props = defineProps({
  content: { type: Object, required: true },
});

// Authored per-chapter data is authoritative. In particular, a History
// chapter must never inherit the old hardcoded retinal/Webvision paragraph.
const paragraphs = computed(() => props.content?.paragraphs || []);
function safeLink(url) {
  return typeof url === "string" && /^(https?:\/\/|#)/i.test(url) ? url : null;
}
</script>

<template>
  <section
    v-if="paragraphs.length"
    id="further-reading"
    class="further-reading"
    aria-labelledby="further-reading-title"
  >
    <h4 id="further-reading-title" class="font-semibold pb-6">
      {{ content.title || "Further reading" }}
    </h4>
    <div v-for="(paragraph, index) in paragraphs" :key="paragraph.id || index">
      <p v-if="paragraph.title">{{ paragraph.title }}</p>
      <ul v-if="paragraph.links?.length" class="reading-links">
        <li v-for="(link, linkIndex) in paragraph.links" :key="linkIndex">
          <a
            v-if="safeLink(link.url)"
            :href="safeLink(link.url)"
            :target="link.url.startsWith('#') ? undefined : '_blank'"
            :rel="link.url.startsWith('#') ? undefined : 'noopener noreferrer'"
            >{{ link.text || link.url }}</a
          >
          <span v-else>{{ link.text }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.further-reading {
  width: 100%;
  padding: 3rem var(--reader-gutter, 1.5rem);
  border-top: 1px solid rgb(var(--color-ink));
}
.reading-links {
  margin: 0.75rem 0 1.5rem;
  padding-left: 1.25rem;
  list-style: disc;
}
a {
  color: rgb(var(--color-accent));
  text-decoration: underline;
  overflow-wrap: anywhere;
}
</style>
