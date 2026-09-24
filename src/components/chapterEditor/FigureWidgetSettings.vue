<script setup>
/*
 * FigureWidgetSettings (OPENBRAIN-80): edit an interactive figure that has
 * been rebuilt as a figure widget. The form comes from the widget's schema
 * (src/widgets/figures/<id>/schema.js), so each figure lists exactly what it
 * can change: text, labels, its picture, its video.
 *
 * Only fields that differ from what the figure would show anyway are saved,
 * as config.content, so a better default later still reaches every figure
 * nobody has edited. Emits `save` with { title, content }.
 */
import { computed, ref, watch } from "vue";
import { BaseModal, Button, FormField } from "@/components/dashboard/shared";
import { imageUrl } from "@/editor/media.mjs";
import { figureWidgetFor } from "@/widgets/figures/registry";
import { figureContent } from "@/widgets/figures/content";
import MediaPicker from "./MediaPicker.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  /** The figure's media row (animations): title, animation_key, config. */
  figure: { type: Object, default: null },
  /** Its state labels from animation_states, when it has any. */
  states: { type: Array, default: () => [] },
  /** The library, for choosing a picture. */
  media: { type: Array, default: () => [] },
  uploadSlug: { type: String, default: "" },
  saving: { type: Boolean, default: false },
});
const emit = defineEmits(["save", "close", "uploaded"]);

const schema = computed(
  () => figureWidgetFor(props.figure?.animation_key)?.schema || null
);
// What the figure shows with nothing saved: its row, then the defaults.
const record = computed(() => ({
  title: props.figure?.title,
  ...(props.figure?.config || {}),
  states: props.states,
}));
const inherited = computed(() =>
  schema.value
    ? figureContent(schema.value, { ...record.value, content: {} })
    : {}
);

const form = ref({});
watch(
  () => [props.open, props.figure, props.states],
  () => {
    if (!props.open || !schema.value) return;
    form.value = structuredClone(figureContent(schema.value, record.value));
  },
  { immediate: true }
);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const canSave = computed(() => !!form.value.title?.trim());

function save() {
  if (!canSave.value) return;
  const content = {};
  for (const f of schema.value.fields) {
    if (f.key === "title") continue;
    if (!same(form.value[f.key], inherited.value[f.key]))
      content[f.key] = form.value[f.key];
  }
  emit("save", { title: form.value.title.trim(), content });
}

// ---- the picture ----
const picking = ref(null); // the image field being chosen
const originalImage = (f) => `/publicAssets/animations/images/${f.asset}`;
function pick(m) {
  form.value[picking.value] = m.image_file_url;
  picking.value = null;
}
function onUploaded(e) {
  emit("uploaded", e);
  pick(e.media);
}

const fieldId = (...parts) => ["fws", ...parts].join("-");
</script>

<template>
  <BaseModal
    :model-value="open"
    :title="schema ? `${schema.name}: figure settings` : 'Figure settings'"
    size="xl"
    @update:model-value="(v) => !v && emit('close')"
    @close="emit('close')"
  >
    <form v-if="schema" class="fws" @submit.prevent="save">
      <template v-for="f in schema.fields" :key="f.key">
        <FormField v-if="f.type === 'text'" :label="f.label" :hint="f.hint">
          <input
            :id="fieldId(f.key)"
            v-model="form[f.key]"
            type="text"
            :required="f.key === 'title'"
          />
        </FormField>

        <FormField
          v-else-if="f.type === 'textarea'"
          :label="f.label"
          :hint="f.hint"
        >
          <textarea :id="fieldId(f.key)" v-model="form[f.key]" rows="7" />
        </FormField>

        <fieldset v-else-if="f.type === 'list'" class="fws-set">
          <legend>{{ f.label }}</legend>
          <p v-if="f.hint" class="fws-hint">{{ f.hint }}</p>
          <div class="fws-grid">
            <FormField
              v-for="(item, i) in form[f.key]"
              :key="i"
              :label="f.itemLabels?.[i] || `Item ${i + 1}`"
            >
              <input
                :id="fieldId(f.key, i)"
                v-model="form[f.key][i]"
                type="text"
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset v-else-if="f.type === 'group'" class="fws-set">
          <legend>{{ f.label }}</legend>
          <div class="fws-grid">
            <FormField
              v-for="sub in f.fields"
              :key="sub.key"
              :label="sub.label"
              :hint="sub.hint"
            >
              <input
                :id="fieldId(f.key, sub.key)"
                v-model="form[f.key][sub.key]"
                type="text"
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset v-else-if="f.type === 'image'" class="fws-set">
          <legend>{{ f.label }}</legend>
          <div class="fws-image">
            <img
              :src="form[f.key] ? imageUrl(form[f.key]) : originalImage(f)"
              alt=""
            />
            <div class="fws-image-tools">
              <p class="fws-hint">
                {{ form[f.key] ? "Replaced." : "The original." }}
                {{ f.hint }}
              </p>
              <Button variant="outline" size="sm" @click="picking = f.key"
                >Choose image</Button
              >
              <Button
                v-if="form[f.key]"
                variant="ghost"
                size="sm"
                @click="form[f.key] = ''"
                >Use the original</Button
              >
            </div>
          </div>
        </fieldset>
      </template>
    </form>
    <p v-else class="fws-hint">This figure has no settings of its own yet.</p>

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
    :open="!!picking"
    :media="media"
    :types="['image']"
    title="Choose the picture"
    :upload-slug="uploadSlug"
    @pick="pick"
    @uploaded="onUploaded"
    @close="picking = null"
  />
</template>

<style scoped>
.fws {
  display: grid;
  gap: 14px;
  font-family: var(--font-ui);
}
.fws-set {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}
.fws-set legend {
  margin-bottom: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}
.fws-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: rgb(var(--color-mute));
}
.fws-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 10px 14px;
}
.fws-image {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 12px;
  align-items: start;
}
.fws-image img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
}
.fws-image-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.fws-image-tools .fws-hint {
  flex-basis: 100%;
}
</style>
