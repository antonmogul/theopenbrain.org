<script setup>
/*
 * MediaPicker — pick an item from the media library (OPENBRAIN-61): an image
 * to insert as an image block, or a Lottie / video / YouTube item to use as a
 * paragraph's figure. `types` limits what's offered. Emits `pick` with the
 * media row, or `remove` when editing an existing figure.
 */
import { computed, ref, watch } from "vue";
import { BaseModal, Button, SearchInput } from "@/components/dashboard/shared";
import { imageUrl } from "@/editor/media.mjs";

const props = defineProps({
  open: { type: Boolean, default: false },
  media: { type: Array, default: () => [] },
  types: { type: Array, default: () => ["image"] },
  title: { type: String, default: "Choose media" },
  /** Id of the current choice (a paragraph's figure), to mark and remove. */
  currentId: { type: String, default: null },
});
const emit = defineEmits(["pick", "remove", "close"]);

const search = ref("");
watch(
  () => props.open,
  (open) => open && (search.value = "")
);

const items = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.media.filter(
    (m) =>
      props.types.includes(m.media_type) &&
      (!q ||
        (m.title || "").toLowerCase().includes(q) ||
        (m.animation_key || "").toLowerCase().includes(q))
  );
});

function thumb(m) {
  if (m.media_type === "image") return imageUrl(m.image_file_url);
  if (m.media_type === "youtube" && m.youtube_id)
    return `https://i.ytimg.com/vi/${m.youtube_id}/mqdefault.jpg`;
  return "";
}
</script>

<template>
  <BaseModal
    :model-value="open"
    :title="title"
    size="xl"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <SearchInput v-model="search" placeholder="Search by title…" />
    <ul class="mp-grid">
      <li v-for="m in items" :key="m.id">
        <button
          type="button"
          class="mp-item"
          :class="{ 'is-current': m.id === currentId }"
          @click="emit('pick', m)"
        >
          <span class="mp-thumb">
            <img v-if="thumb(m)" :src="thumb(m)" alt="" loading="lazy" />
            <span v-else class="mp-type">{{ m.media_type }}</span>
          </span>
          <span class="mp-title">{{ m.title || m.animation_key }}</span>
          <span class="mp-meta"
            >{{ m.media_type
            }}<template v-if="m.id === currentId"> · current</template></span
          >
        </button>
      </li>
    </ul>
    <p v-if="!items.length" class="mp-empty">Nothing matches.</p>
    <template #footer>
      <Button
        v-if="currentId"
        variant="danger"
        size="sm"
        @click="emit('remove')"
        >Remove figure</Button
      >
      <Button variant="ghost" size="sm" @click="emit('close')">Close</Button>
    </template>
  </BaseModal>
</template>

<style scoped>
.mp-grid {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
}
.mp-item {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 6px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 8px;
  background: rgb(var(--color-paper));
  text-align: left;
  cursor: pointer;
  font-family: var(--font-ui);
}
.mp-item:hover,
.mp-item:focus-visible {
  border-color: rgb(var(--color-accent) / 0.6);
  outline: none;
}
.mp-item.is-current {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.06);
}
.mp-thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  max-width: 100%;
  border-radius: 5px;
  overflow: hidden;
  background: rgb(var(--color-bg));
}
.mp-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mp-type,
.mp-meta {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.mp-title {
  font-size: 0.8125rem;
  line-height: 1.3;
}
.mp-empty {
  margin: 12px 0 0;
  font-family: var(--font-ui);
  color: rgb(var(--color-mute));
}
</style>
