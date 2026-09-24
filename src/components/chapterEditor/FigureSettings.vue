<script setup>
/*
 * FigureSettings — edit an image figure in the media library (OPENBRAIN-70
 * B3): its title, the caption shown under it, and its frames. A figure with
 * several frames cycles through them in the reader's figure panel (History's
 * Figure 2 has five). Frames come from the library or a new upload. Emits
 * `save` with { title, caption, images: [{ src, alt, caption }] }.
 */
import { computed, ref, watch } from "vue";
import { BaseModal, Button, FormField } from "@/components/dashboard/shared";
import { imageUrl } from "@/editor/media.mjs";
import MediaPicker from "./MediaPicker.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  /** The figure's media row (animations): title, image_file_url, config. */
  figure: { type: Object, default: null },
  /** The library, for adding frames. */
  media: { type: Array, default: () => [] },
  uploadSlug: { type: String, default: "" },
  saving: { type: Boolean, default: false },
});
const emit = defineEmits(["save", "close", "uploaded"]);

const title = ref("");
const caption = ref("");
const frames = ref([]);
const picking = ref(false);

function framesOf(f) {
  const list = Array.isArray(f?.config?.images) ? f.config.images : [];
  const raw = list.length
    ? list
    : f?.image_file_url
      ? [{ src: f.image_file_url }]
      : [];
  return raw.map((x) =>
    typeof x === "string"
      ? { src: x, alt: "", caption: "" }
      : { src: x.src, alt: x.alt || "", caption: x.caption || "" }
  );
}
watch(
  () => [props.open, props.figure],
  () => {
    if (!props.open || !props.figure) return;
    title.value = props.figure.title || "";
    caption.value = props.figure.config?.caption || "";
    frames.value = framesOf(props.figure);
  },
  { immediate: true }
);

const missingAlt = computed(() => frames.value.some((f) => !f.alt.trim()));
const canSave = computed(
  () => frames.value.length > 0 && title.value.trim().length > 0
);

function move(i, dir) {
  const list = frames.value.slice();
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  frames.value = list;
}
function remove(i) {
  frames.value = frames.value.filter((_, j) => j !== i);
}
function addFrame(m, alt = "", frameCaption = "") {
  frames.value = [
    ...frames.value,
    { src: m.image_file_url, alt: alt || m.title || "", caption: frameCaption },
  ];
  picking.value = false;
}
function onUploaded(e) {
  emit("uploaded", e);
  addFrame(e.media, e.alt, e.caption);
}
function save() {
  if (!canSave.value) return;
  emit("save", {
    title: title.value.trim(),
    caption: caption.value.trim(),
    images: frames.value.map((f) => ({
      src: f.src,
      alt: f.alt.trim(),
      caption: f.caption.trim(),
    })),
  });
}
</script>

<template>
  <BaseModal
    :model-value="open"
    title="Figure settings"
    size="xl"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <form v-if="figure" class="fs" @submit.prevent="save">
      <FormField label="Title" hint="Shown in the library and figure lists.">
        <input id="fs-title" v-model="title" type="text" required />
      </FormField>
      <FormField
        label="Caption"
        hint="Under the figure in the reader, when a frame has no caption of its own."
      >
        <textarea id="fs-caption" v-model="caption" rows="2" />
      </FormField>

      <fieldset class="fs-frames">
        <legend>
          Images
          <small v-if="frames.length > 1"
            >· {{ frames.length }} frames, cycled in order</small
          >
        </legend>
        <ol class="fs-list">
          <li v-for="(f, i) in frames" :key="`${f.src}-${i}`" class="fs-frame">
            <img :src="imageUrl(f.src)" alt="" class="fs-thumb" />
            <div class="fs-fields">
              <input
                v-model="f.alt"
                type="text"
                placeholder="Alt text: what the image shows (required)"
                :aria-label="`Frame ${i + 1} alt text`"
                :class="{ 'is-missing': !f.alt.trim() }"
              />
              <input
                v-model="f.caption"
                type="text"
                placeholder="Frame caption (optional)"
                :aria-label="`Frame ${i + 1} caption`"
              />
            </div>
            <div class="fs-tools">
              <button
                type="button"
                :disabled="i === 0"
                :aria-label="`Move frame ${i + 1} up`"
                @click="move(i, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="i === frames.length - 1"
                :aria-label="`Move frame ${i + 1} down`"
                @click="move(i, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="is-danger"
                :disabled="frames.length === 1"
                :aria-label="`Remove frame ${i + 1}`"
                @click="remove(i)"
              >
                ×
              </button>
            </div>
          </li>
        </ol>
        <Button variant="ghost" size="sm" @click="picking = true"
          >+ Add image</Button
        >
        <p v-if="missingAlt" class="fs-warn">
          Some images have no alt text. Readers who can't see them get nothing.
        </p>
      </fieldset>
    </form>
    <template #footer>
      <Button variant="ghost" size="sm" @click="emit('close')">Cancel</Button>
      <Button
        variant="solid"
        size="sm"
        :disabled="!canSave"
        :loading="saving"
        @click="save"
        >Save figure</Button
      >
    </template>
  </BaseModal>

  <MediaPicker
    :open="picking"
    :media="media"
    :types="['image']"
    title="Add an image to this figure"
    :upload-slug="uploadSlug"
    @pick="(m) => addFrame(m)"
    @uploaded="onUploaded"
    @close="picking = false"
  />
</template>

<style scoped>
.fs {
  display: grid;
  gap: 12px;
  font-family: var(--font-ui);
}
.fs-frames {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}
.fs-frames legend {
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}
.fs-frames legend small {
  font-weight: 400;
  color: rgb(var(--color-mute));
}
.fs-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 50vh;
  overflow-y: auto;
}
.fs-frame {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 6px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 8px;
  background: rgb(var(--color-paper));
}
.fs-thumb {
  width: 96px;
  height: 72px;
  object-fit: contain;
  border-radius: 4px;
  background: rgb(var(--color-bg));
}
.fs-fields {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.fs-fields input {
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  font: inherit;
  font-size: 0.8125rem;
  background: rgb(var(--color-bg));
}
.fs-fields input.is-missing {
  border-color: rgb(var(--color-warn));
}
.fs-tools {
  display: flex;
  gap: 4px;
}
.fs-tools button {
  width: 28px;
  height: 28px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
.fs-tools button:disabled {
  opacity: 0.35;
  cursor: default;
}
.fs-tools button.is-danger:hover:not(:disabled) {
  color: rgb(var(--color-accent));
  border-color: rgb(var(--color-accent));
}
.fs-warn {
  margin: 0;
  font-size: 0.8125rem;
  color: rgb(var(--color-mute));
}
</style>
