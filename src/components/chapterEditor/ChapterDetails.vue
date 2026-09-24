<script setup>
/*
 * ChapterDetails — the chapter's title, subtitle and authors on the chapter
 * block page (OPENBRAIN-70 C1, C2). The subtitle is modules.description, the
 * white line under the title in the reader's opener; authors print at the
 * top of the introduction. Emits `save` with only the fields that changed.
 */
import { computed, ref, watch } from "vue";
import { Button, FormField } from "@/components/dashboard/shared";

const props = defineProps({
  module: { type: Object, required: true },
  saving: { type: Boolean, default: false },
});
const emit = defineEmits(["save"]);

const cleanAuthors = (list) =>
  (Array.isArray(list) ? list : [])
    .map((a) => ({
      name: (a?.name || "").trim(),
      affiliation: (a?.affiliation || "").trim(),
    }))
    .filter((a) => a.name);

const title = ref("");
const description = ref("");
const authors = ref([]);
function reset() {
  title.value = props.module.title || "";
  description.value = props.module.description || "";
  authors.value = cleanAuthors(props.module.authors).map((a) => ({ ...a }));
}
watch(() => props.module, reset, { immediate: true });

const changes = computed(() => {
  const out = {};
  if (title.value.trim() !== (props.module.title || ""))
    out.title = title.value.trim();
  if (description.value.trim() !== (props.module.description || ""))
    out.description = description.value.trim();
  const next = cleanAuthors(authors.value);
  if (
    JSON.stringify(next) !== JSON.stringify(cleanAuthors(props.module.authors))
  )
    out.authors = next.length ? next : null;
  return out;
});
const dirty = computed(() => Object.keys(changes.value).length > 0);
const canSave = computed(() => dirty.value && title.value.trim().length > 0);

function save() {
  if (canSave.value) emit("save", changes.value);
}

function addAuthor() {
  authors.value = [...authors.value, { name: "", affiliation: "" }];
}
function removeAuthor(i) {
  authors.value = authors.value.filter((_, j) => j !== i);
}
function moveAuthor(i, dir) {
  const list = authors.value.slice();
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  authors.value = list;
}
</script>

<template>
  <section class="cd" aria-labelledby="cd-h">
    <h2 id="cd-h" class="cd-h">Chapter details</h2>
    <form class="cd-form" @submit.prevent="save">
      <FormField label="Title">
        <input id="cd-title" v-model="title" type="text" required />
      </FormField>
      <FormField
        label="Subtitle"
        hint="The line under the title on the chapter's opening page. Keep it short."
      >
        <textarea id="cd-subtitle" v-model="description" rows="2" />
      </FormField>

      <fieldset class="cd-authors">
        <legend>Authors</legend>
        <p v-if="!authors.length" class="cd-empty">
          No authors yet. They print at the top of the introduction.
        </p>
        <div v-for="(a, i) in authors" :key="i" class="cd-author">
          <input
            v-model="a.name"
            type="text"
            placeholder="Name"
            :aria-label="`Author ${i + 1} name`"
          />
          <input
            v-model="a.affiliation"
            type="text"
            placeholder="Affiliation"
            :aria-label="`Author ${i + 1} affiliation`"
          />
          <button
            type="button"
            :disabled="i === 0"
            :aria-label="`Move author ${i + 1} up`"
            @click="moveAuthor(i, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            :disabled="i === authors.length - 1"
            :aria-label="`Move author ${i + 1} down`"
            @click="moveAuthor(i, 1)"
          >
            ↓
          </button>
          <button
            type="button"
            class="is-danger"
            :aria-label="`Remove author ${i + 1}`"
            @click="removeAuthor(i)"
          >
            ×
          </button>
        </div>
        <Button variant="ghost" size="sm" @click="addAuthor"
          >+ Add author</Button
        >
      </fieldset>

      <div class="cd-actions">
        <Button v-if="dirty" variant="ghost" size="sm" @click="reset"
          >Discard</Button
        >
        <Button
          variant="solid"
          size="sm"
          :disabled="!canSave"
          :loading="saving"
          @click="save"
          >Save details</Button
        >
      </div>
    </form>
  </section>
</template>

<style scoped>
.cd {
  padding: 16px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 10px;
  background: rgb(var(--color-paper));
  font-family: var(--font-ui);
}
.cd-h {
  margin: 0 0 12px;
  font-size: 1rem;
}
.cd-form {
  display: grid;
  gap: 12px;
}
.cd-authors {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}
.cd-authors legend {
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}
.cd-empty {
  margin: 0;
  font-size: 0.875rem;
  color: rgb(var(--color-mute));
}
.cd-author {
  display: grid;
  grid-template-columns: 1fr 1.6fr auto auto auto;
  gap: 6px;
  align-items: center;
}
.cd-author input {
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  font: inherit;
  font-size: 0.875rem;
  background: rgb(var(--color-bg));
}
.cd-author button {
  width: 28px;
  height: 28px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
.cd-author button:disabled {
  opacity: 0.35;
  cursor: default;
}
.cd-author button.is-danger:hover {
  color: rgb(var(--color-accent));
  border-color: rgb(var(--color-accent));
}
.cd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
@media (max-width: 640px) {
  .cd-author {
    grid-template-columns: 1fr auto auto auto;
  }
  .cd-author input:nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
