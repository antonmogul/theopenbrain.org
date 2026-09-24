<script setup>
/*
 * LottieUpload — add a Lottie animation (.json) to the media library
 * (OPENBRAIN-70 B4). It plays on repeat in the figure panel. Emits `uploaded`
 * with { media } once stored.
 */
import { ref } from "vue";
import { Button } from "@/components/dashboard/shared";
import { lottieProblem, uploadChapterLottie } from "@/services/api/storage";

const props = defineProps({
  slug: { type: String, default: "" },
  actionLabel: { type: String, default: "Upload animation" },
});
const emit = defineEmits(["uploaded"]);

const file = ref(null);
const title = ref("");
const problem = ref("");
const uploading = ref(false);
const input = ref(null);

async function onPick(e) {
  const f = e.target.files?.[0] || null;
  file.value = f;
  problem.value = f ? (await lottieProblem(f)) || "" : "";
  if (f && !title.value)
    title.value = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}
async function upload() {
  if (!file.value || problem.value) return;
  uploading.value = true;
  try {
    const media = await uploadChapterLottie(file.value, {
      slug: props.slug,
      title: title.value.trim(),
    });
    emit("uploaded", { media });
    file.value = null;
    title.value = "";
    if (input.value) input.value.value = "";
  } catch (err) {
    console.error("LottieUpload:", err);
    problem.value = err.message || "The upload failed. Try again.";
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="lu">
    <input
      ref="input"
      type="file"
      accept=".json,application/json"
      aria-label="Lottie animation file"
      @change="onPick"
    />
    <input
      v-if="file"
      v-model="title"
      type="text"
      placeholder="Title"
      aria-label="Animation title"
    />
    <Button
      v-if="file"
      variant="outline"
      size="sm"
      :disabled="!!problem || !title.trim()"
      :loading="uploading"
      @click="upload"
      >{{ uploading ? "Uploading…" : actionLabel }}</Button
    >
    <p v-if="problem" class="lu-error" role="alert">{{ problem }}</p>
  </div>
</template>

<style scoped>
.lu {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-family: var(--font-ui);
  font-size: 0.875rem;
}
.lu input[type="text"] {
  flex: 1 1 200px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  font: inherit;
}
.lu-error {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.8125rem;
  color: rgb(var(--color-accent));
}
</style>
