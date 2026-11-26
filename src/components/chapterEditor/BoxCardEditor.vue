<script setup>
import { computed, ref, watch } from "vue";
import { Button } from "@/components/dashboard/shared";
import MediaPicker from "./MediaPicker.vue";
import { normalizeBoxCard, layerTransform } from "@/helper/boxCard.mjs";
import { imageUrl } from "@/editor/media.mjs";

const props = defineProps({
  value: { type: Object, default: null },
  title: { type: String, default: "" },
  slug: { type: String, default: "" },
  media: { type: Array, default: () => [] },
  disabled: Boolean,
});
const emit = defineEmits(["change", "uploaded"]);
const draft = ref({});
watch(
  () => props.value,
  (v) => {
    draft.value = {
      enabled: true,
      ...structuredClone(normalizeBoxCard(v) || {}),
    };
  },
  { immediate: true }
);
const picking = ref(null);
const preview = ref(0);
const layers = computed(() => draft.value.layers || []);
function save() {
  emit("change", normalizeBoxCard(draft.value));
}
function pick(media, alt = media.title || "") {
  const image = { src: imageUrl(media.image_file_url), alt };
  if (picking.value === "image") draft.value.image = image;
  else
    draft.value.layers = [
      ...layers.value,
      { ...image, depth: Math.min(1, layers.value.length * 0.25) },
    ];
  picking.value = null;
  save();
}
function uploaded(event) {
  emit("uploaded", event.media);
  pick(event.media, event.alt);
}
function remove(i) {
  draft.value.layers = layers.value.filter((_, index) => index !== i);
  save();
}
</script>

<template>
  <details class="bce">
    <summary>Title card</summary>
    <p v-if="disabled" role="status">
      Title cards need a database update before changes can be saved.
    </p>
    <fieldset :disabled="disabled">
      <legend class="sr-only">Title card for {{ title }}</legend>
      <label class="bce-enable"
        ><input
          v-model="draft.enabled"
          type="checkbox"
          :true-value="true"
          :false-value="false"
          @change="save"
        />
        Show title card</label
      >
      <p>
        Layers share one canvas, ordered back to front. Depth 0 stays at the
        back; 1 moves furthest. Phones and reduced motion use the flat image, or
        the layers together without movement.
      </p>
      <div class="bce-actions">
        <Button size="sm" @click="picking = 'image'">Choose flat image</Button>
        <Button
          size="sm"
          :disabled="layers.length >= 8"
          @click="picking = 'layer'"
          >Add layer</Button
        >
      </div>
      <template v-if="draft.image">
        <Button
          size="sm"
          @click="
            delete draft.image;
            save();
          "
          >Remove flat image</Button
        >
        <label
          >Image description<input
            v-model="draft.image.alt"
            type="text"
            @change="save"
        /></label>
        <label
          >Image position<input
            v-model="draft.image.position"
            type="text"
            placeholder="50% 30%"
            pattern="[0-9.]+% [0-9.]+%"
            @change="save"
        /></label>
      </template>
      <ol>
        <li v-for="(layer, i) in layers" :key="layer.src + i">
          <img :src="layer.src" alt="" />
          <label
            >Layer {{ i + 1 }} depth<input
              v-model.number="layer.depth"
              type="number"
              min="0"
              max="1"
              step="0.01"
              @change="save"
          /></label>
          <label
            >Description<input v-model="layer.alt" type="text" @change="save"
          /></label>
          <Button
            size="sm"
            :aria-label="`Remove layer ${i + 1}`"
            @click="remove(i)"
            >Remove</Button
          >
        </li>
      </ol>
      <label
        >Quotation<textarea
          v-model="draft.quote"
          placeholder="Uses the opening text when not set"
          maxlength="1000"
          @change="save"
        />
      </label>
      <div
        v-if="draft.image || layers.length"
        class="bce-preview"
        role="img"
        :aria-label="`Title card preview: ${draft.image?.alt || title}`"
      >
        <template v-if="layers.length"
          ><img
            v-for="(layer, i) in layers"
            :key="i"
            :src="layer.src"
            alt=""
            :style="{
              transform: layerTransform(layer.depth, preview),
              objectPosition: draft.image?.position,
            }"
        /></template>
        <img
          v-else
          :src="draft.image.src"
          alt=""
          :style="{ objectPosition: draft.image.position }"
        />
        <span>{{ title }}</span>
      </div>
      <label v-if="layers.length"
        >Preview motion<input
          v-model.number="preview"
          type="range"
          min="0"
          max="1"
          step="0.01"
      /></label>
      <Button
        v-if="draft.quote !== undefined"
        size="sm"
        @click="
          delete draft.quote;
          save();
        "
        >Use opening text</Button
      >
    </fieldset>
    <MediaPicker
      :open="picking !== null"
      :media="media"
      :types="['image']"
      :upload-slug="slug"
      title="Title card image"
      @close="picking = null"
      @pick="pick"
      @uploaded="uploaded"
    />
  </details>
</template>

<style scoped>
.bce {
  flex-basis: 100%;
  max-width: 48rem;
}
summary {
  font-size: var(--ui-size-14);
  cursor: pointer;
  padding: 0.75rem 0;
}
fieldset {
  border: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
  min-width: 0;
}
p {
  font-size: var(--ui-size-12);
  color: rgb(var(--color-mute));
}
label {
  display: grid;
  gap: 0.35rem;
  font-size: var(--ui-size-12);
}
.bce-enable {
  display: flex;
  align-items: center;
}
input,
textarea {
  border: 1px solid rgb(var(--color-line));
  padding: 0.5rem;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
}
input:focus-visible,
textarea:focus-visible,
summary:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 3px;
}
.bce :deep(button) {
  justify-self: start;
}
.bce-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
ol {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1rem;
}
li {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.5rem;
}
li img {
  width: 4rem;
  height: 4rem;
  object-fit: contain;
  background: rgb(var(--color-line));
}
li input[type="number"] {
  width: 5rem;
}
.bce-preview {
  position: relative;
  aspect-ratio: 16/10;
  overflow: hidden;
  background: rgb(var(--color-dark-surface));
}
.bce-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 30%;
}
.bce-preview span {
  font: 500 var(--ui-size-24) / 1.2 var(--font-body);
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: rgb(0 0 0 / 0.4);
  color: white;
  text-align: center;
}
</style>
