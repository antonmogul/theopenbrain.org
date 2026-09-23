<script setup>
/*
 * ImageUpload — drop or choose an image, describe it, upload it to the
 * chapter-media bucket (OPENBRAIN-63). Used by the chapter block page's
 * image picker and by Dashboard → Media. Emits `uploaded` with
 * { media, alt, caption } once the file is stored and in the media library.
 */
import { computed, onBeforeUnmount, ref } from "vue";
import { Button, FormField } from "@/components/dashboard/shared";
import { uploadChapterImage, uploadProblem } from "@/services/api/storage";

const props = defineProps({
  /** The chapter's slug, for the storage path. */
  slug: { type: String, default: "" },
  /** Ask for a caption as well as alt text (off in the media library). */
  withCaption: { type: Boolean, default: true },
  /** Button label, e.g. "Upload and add". */
  actionLabel: { type: String, default: "Upload" },
});
const emit = defineEmits(["uploaded"]);

const file = ref(null);
const preview = ref("");
const alt = ref("");
const caption = ref("");
const dragging = ref(false);
const uploading = ref(false);
const error = ref("");
const input = ref(null);

const problem = computed(() => (file.value ? uploadProblem(file.value) : null));

function setFile(f) {
  error.value = "";
  if (preview.value) URL.revokeObjectURL(preview.value);
  file.value = f || null;
  preview.value = f && !uploadProblem(f) ? URL.createObjectURL(f) : "";
  if (f && !alt.value)
    alt.value = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}
function onDrop(e) {
  dragging.value = false;
  setFile(e.dataTransfer?.files?.[0]);
}
function onPick(e) {
  setFile(e.target.files?.[0]);
}

async function upload() {
  if (!file.value || problem.value || !alt.value.trim()) return;
  uploading.value = true;
  error.value = "";
  try {
    const media = await uploadChapterImage(file.value, {
      slug: props.slug,
      title: alt.value.trim(),
    });
    emit("uploaded", {
      media,
      alt: alt.value.trim(),
      caption: caption.value.trim(),
    });
    setFile(null);
    alt.value = "";
    caption.value = "";
    if (input.value) input.value.value = "";
  } catch (err) {
    console.error("ImageUpload:", err);
    error.value = err.message || "The upload failed. Try again.";
  } finally {
    uploading.value = false;
  }
}

onBeforeUnmount(() => preview.value && URL.revokeObjectURL(preview.value));
</script>

<template>
  <div class="iu">
    <label
      class="iu-drop"
      :class="{ 'is-dragging': dragging, 'has-file': !!preview }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        id="iu-file"
        ref="input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="iu-input"
        @change="onPick"
      />
      <img v-if="preview" :src="preview" alt="" class="iu-preview" />
      <span v-else class="iu-prompt">
        <b>Drop an image here</b> or click to choose one
        <small>JPG, PNG, WebP or GIF · up to 10 MB</small>
      </span>
    </label>
    <p v-if="problem" class="iu-error" role="alert">{{ problem }}</p>

    <template v-if="file && !problem">
      <FormField
        label="Alt text"
        hint="What the image shows, for people who can't see it. Required."
      >
        <input id="iu-alt" v-model="alt" type="text" required />
      </FormField>
      <FormField
        v-if="withCaption"
        label="Caption"
        hint="Shown under the image in the reader. Optional."
      >
        <textarea id="iu-caption" v-model="caption" rows="2" />
      </FormField>
      <div class="iu-actions">
        <p v-if="error" class="iu-error" role="alert">{{ error }}</p>
        <span class="iu-spacer" />
        <Button variant="ghost" size="sm" @click="setFile(null)">Clear</Button>
        <Button
          variant="solid"
          size="sm"
          :loading="uploading"
          :disabled="!alt.trim()"
          @click="upload"
          >{{ uploading ? "Uploading…" : actionLabel }}</Button
        >
      </div>
    </template>
  </div>
</template>

<style scoped>
.iu {
  display: grid;
  gap: 12px;
}
.iu-drop {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 140px;
  padding: 16px;
  border: 1.5px dashed rgb(var(--color-line));
  border-radius: 10px;
  background: rgb(var(--color-bg));
  cursor: pointer;
  text-align: center;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  color: rgb(var(--color-mute));
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}
.iu-drop:hover,
.iu-drop.is-dragging,
.iu-drop:focus-within {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.05);
}
.iu-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.iu-prompt {
  display: grid;
  gap: 4px;
}
.iu-prompt b {
  color: rgb(var(--color-ink));
}
.iu-prompt small {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}
.iu-preview {
  max-width: 100%;
  max-height: 220px;
  border-radius: 6px;
  object-fit: contain;
}
.iu-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.iu-spacer {
  flex: 1;
}
.iu-error {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  color: rgb(var(--color-accent));
}
</style>
