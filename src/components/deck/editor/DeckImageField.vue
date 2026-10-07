<script>
// Every image field on screen, as (slide id, address path) getters: an
// upload whose field went can tell a slide that is on screen again (a field
// for its address is back) from one whose field went for good.
const liveFields = new Set();
</script>

<script setup>
// An image on a slide (OPENBRAIN-129): a preview and three ways to set it,
// upload, the media library or an address, plus alt text and the
// placeholder funders see until there is an image.
//
// Two shapes, from the descriptor's type:
//   image     { src, alt, placeholder?, figure? } at `path`
//   imageSrc  a URL string at `path`; alt text and placeholder live in
//             sibling keys (altKey, placeholderKey) of the same object,
//             as on the phones slide's screens
// Uploads go to the chapter-media bucket under decks/<deckId>/ and add no
// media library row (uploadDeckImage). The library is read-only here: a
// picked image records its animation_key as `figure`. Only addresses the
// site's CSP allows will load on the deck; others get a warning.
//
// An upload takes seconds. If the creator selects another slide meanwhile
// (and perhaps comes back), this field is gone when it finishes: the URL is
// then written through the editor (provided as DECK_UPDATE_ENTRY) to the
// slide and path the upload was for. In a list, the field follows its item
// (the list keys items stably), so a move or removal meanwhile doesn't
// misplace it. The upload is dropped rather than written over whatever took
// its place when the slide changed layout, another item now sits at its
// path, another image was set there meanwhile, or the slide is on screen
// with no field for that address (it went with its item or its group).
import { computed, inject, onBeforeUnmount, ref } from "vue";
import { Button, FormField } from "@/components/dashboard/shared";
import MediaPicker from "@/components/chapterEditor/MediaPicker.vue";
import { imageUrl } from "@/editor/media.mjs";
import { uploadDeckImage, uploadProblem } from "@/services/api/storage";
import { useDecks } from "@/composables/useDecks.js";
import { cspAllowed, fieldId } from "@/data/decks/validate.js";
import { DECK_UPDATE_ENTRY, problemsAt, siblingPath } from "./fieldPaths.js";
import { focusFirst } from "./editorA11y.js";
import { IconError, IconWarn } from "./editorIcons.js";
import "./deckEditor.css";

const props = defineProps({
  // An `image` or `imageSrc` descriptor.
  descriptor: { type: Object, required: true },
  value: { type: null, default: undefined },
  // The object holding this field (for imageSrc's sibling keys).
  context: { type: Object, default: () => ({}) },
  path: { type: String, required: true },
  slideId: { type: String, required: true },
  problems: { type: Array, default: () => [] },
  // The deck's id (its uuid): uploads go under decks/<deckId>/, so an
  // image address never names the deck.
  deckId: { type: String, required: true },
});
const emit = defineEmits(["update"]);

const d = computed(() => props.descriptor);
const isObject = computed(() => d.value.type === "image");
const image = computed(() =>
  isObject.value && props.value && typeof props.value === "object"
    ? props.value
    : {}
);

// Where each part lives, as a path into the entry.
const paths = computed(() =>
  isObject.value
    ? {
        src: `${props.path}.src`,
        alt: `${props.path}.alt`,
        placeholder: `${props.path}.placeholder`,
      }
    : {
        src: props.path,
        alt: d.value.altKey ? siblingPath(props.path, d.value.altKey) : null,
        placeholder: d.value.placeholderKey
          ? siblingPath(props.path, d.value.placeholderKey)
          : null,
      }
);
const src = computed(() =>
  isObject.value
    ? image.value.src || ""
    : typeof props.value === "string"
      ? props.value
      : ""
);
const alt = computed(() =>
  isObject.value
    ? image.value.alt || ""
    : d.value.altKey
      ? props.context?.[d.value.altKey] || ""
      : ""
);
const placeholder = computed(() =>
  isObject.value
    ? image.value.placeholder || ""
    : d.value.placeholderKey
      ? props.context?.[d.value.placeholderKey] || ""
      : ""
);
const hasAlt = computed(() => isObject.value || !!d.value.altKey);
const hasPlaceholder = computed(() =>
  isObject.value ? d.value.placeholderField !== false : !!d.value.placeholderKey
);

// For imageSrc the address input is the field (its path is the field's), so
// the fieldset gets no id of its own: two elements with one id would send a
// Problems jump to the fieldset, and on to the hidden file input.
const ids = computed(() => ({
  group: isObject.value ? fieldId(props.slideId, props.path) : undefined,
  src: fieldId(props.slideId, paths.value.src),
  alt: paths.value.alt && fieldId(props.slideId, paths.value.alt),
  placeholder:
    paths.value.placeholder && fieldId(props.slideId, paths.value.placeholder),
}));

// ── writes ───────────────────────────────────────────────────────────────
// An image object is written whole; imageSrc writes the URL and its
// siblings separately.
function setImage(next) {
  const out = { ...image.value, ...next };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  emit("update", props.path, out);
}
function setSrc(url, { figure, altText } = {}) {
  if (isObject.value) {
    setImage({
      src: url,
      figure,
      ...(altText !== undefined ? { alt: altText } : {}),
    });
  } else {
    emit("update", props.path, url);
    if (altText !== undefined && paths.value.alt)
      emit("update", paths.value.alt, altText);
  }
}
function setAlt(text) {
  if (isObject.value) setImage({ alt: text });
  else if (paths.value.alt) emit("update", paths.value.alt, text);
}
function setPlaceholder(text) {
  if (isObject.value) setImage({ placeholder: text || undefined });
  else if (paths.value.placeholder)
    emit("update", paths.value.placeholder, text);
}
function removeImage() {
  if (isObject.value) setImage({ src: "", alt: "", figure: undefined });
  else {
    emit("update", props.path, "");
    if (paths.value.alt) emit("update", paths.value.alt, "");
  }
}

// ── preview ──────────────────────────────────────────────────────────────
// An address the CSP blocks isn't fetched here either: the deck couldn't
// show it, and the editor runs under the same policy. A failed load is
// remembered by address, so a new address (the next keystroke, a pasted
// fix, another list item's photo) is tried again.
const failedSrc = ref(null);
const previewFailed = computed(
  () => !!src.value && failedSrc.value === src.value
);
const blocked = computed(() => !!src.value && !cspAllowed(src.value, "img"));

// ── upload ───────────────────────────────────────────────────────────────
const uploading = ref(false);
const uploadError = ref("");
const dragging = ref(false);
const fileInput = ref(null);
const editor = inject(DECK_UPDATE_ENTRY, null);
let gone = false;
const live = { slideId: () => props.slideId, src: () => paths.value.src };
liveFields.add(live);
onBeforeUnmount(() => {
  gone = true;
  liveFields.delete(live);
});

// The object at a dotted path of an entry, as JSON (for comparing).
const jsonAt = (entry, path) =>
  JSON.stringify(
    path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), entry) ??
      null
  );
// A list item's path ("props.people.2") for a field inside one.
const itemPathOf = (path) => path.match(/^(.*\.\d+)\.[^.]+$/)?.[1] ?? null;

// The upload's result, for a field that is no longer on screen: written by
// slide id to the paths it had when the upload started, part by part (never
// the whole image object, which this field only knows as it was then). Only
// when that is still the same place: the slide has the same layout, it is
// either not on screen (its form went, not this field) or on screen with a
// field for this address again, a list item at that path is the item the
// upload was for, and the address there is still what it was.
function writeLater(target, url, altText) {
  if (!editor) return;
  const entry = editor.entryOf(target.slideId);
  if (!entry || entry.layout !== target.layout) return;
  if (
    editor.selectedId() === target.slideId &&
    ![...liveFields].some(
      (f) => f.slideId() === target.slideId && f.src() === target.src
    )
  )
    return;
  if (target.item && jsonAt(entry, target.item) !== target.itemWas) return;
  if (jsonAt(entry, target.src) !== target.srcWas) return;
  editor.updateEntry(target.slideId, target.src, url);
  if (target.figure)
    editor.updateEntry(target.slideId, target.figure, undefined);
  if (altText !== undefined && target.alt)
    editor.updateEntry(target.slideId, target.alt, altText);
}

async function upload(file) {
  uploadError.value = "";
  if (!file) return;
  const problem = uploadProblem(file);
  if (problem) {
    uploadError.value = problem;
    return;
  }
  uploading.value = true;
  const item = itemPathOf(props.path);
  const startEntry = editor?.entryOf(props.slideId) ?? null;
  const target = {
    slideId: props.slideId,
    layout: startEntry?.layout,
    src: paths.value.src,
    srcWas: jsonAt(startEntry, paths.value.src),
    alt: hasAlt.value ? paths.value.alt : null,
    figure: isObject.value ? `${props.path}.figure` : null,
    hadAlt: !!alt.value,
    item,
    itemWas: item ? JSON.stringify(props.context ?? null) : null,
  };
  try {
    const { src: url } = await uploadDeckImage(file, {
      deckId: props.deckId,
    });
    // Suggest alt text from the file name only when there is none yet.
    const named = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    if (gone) {
      writeLater(target, url, target.hadAlt ? undefined : named);
      return;
    }
    failedSrc.value = null;
    setSrc(url, {
      altText: hasAlt.value && !alt.value ? named : undefined,
    });
  } catch (err) {
    uploadError.value = err?.message || "The upload failed. Try again.";
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}
function onDrop(e) {
  dragging.value = false;
  upload(e.dataTransfer?.files?.[0]);
}

// ── library ──────────────────────────────────────────────────────────────
const { fetchImageLibrary } = useDecks();
const picking = ref(false);
const library = ref([]);
const libraryError = ref("");
async function openLibrary() {
  libraryError.value = "";
  picking.value = true;
  try {
    library.value = await fetchImageLibrary();
  } catch (err) {
    picking.value = false;
    libraryError.value = err?.message || "The media library couldn't load.";
  }
}
function pick(row) {
  picking.value = false;
  failedSrc.value = null;
  setSrc(imageUrl(row.image_file_url), {
    figure: row.animation_key || undefined,
    altText: hasAlt.value ? row.title || "" : undefined,
  });
}

// ── description ──────────────────────────────────────────────────────────
const srcProblems = computed(() => problemsAt(props.problems, paths.value.src));
const altProblems = computed(() =>
  paths.value.alt ? problemsAt(props.problems, paths.value.alt) : []
);
const fieldProblems = computed(() =>
  isObject.value ? problemsAt(props.problems, props.path) : []
);
// Validation names a blocked address too; say it here when it hasn't yet
// (and in stories, which pass no problems).
const cspWarning = computed(
  () =>
    blocked.value &&
    /^(\/|https?:\/\/)/i.test(src.value) &&
    !srcProblems.value.some((p) => p.code === "W_CSP")
);
const srcInvalid = computed(() =>
  srcProblems.value.some((p) => p.level === "error")
);
const level = (p) => (p.level === "error" ? "is-error" : "is-warn");
</script>

<template>
  <fieldset
    :id="ids.group"
    class="deck-ed-fieldset deck-image-field"
    :tabindex="ids.group ? -1 : undefined"
    @focus="ids.group && focusFirst($event)"
  >
    <legend class="deck-ed-legend">
      {{ descriptor.label
      }}<span v-if="descriptor.required" class="deck-ed-req" aria-hidden="true">
        *</span
      >
    </legend>

    <div class="deck-image-field__main">
      <div class="deck-image-field__preview">
        <img
          v-if="src && !blocked && !previewFailed"
          :src="src"
          :alt="alt ? `Current image: ${alt}` : 'Current image'"
          @error="failedSrc = $event.target.getAttribute('src')"
        />
        <span v-else-if="blocked" class="deck-image-field__empty"
          >Blocked on the deck</span
        >
        <span v-else-if="src" class="deck-image-field__empty"
          >This image doesn't load</span
        >
        <span v-else class="deck-image-field__empty">{{
          placeholder || "No image"
        }}</span>
      </div>

      <div class="deck-image-field__tools">
        <label
          class="deck-image-field__drop"
          :class="{ 'is-dragging': dragging, 'is-busy': uploading }"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInput"
            class="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            :disabled="uploading"
            @change="upload($event.target.files?.[0])"
          />
          <span v-if="uploading" aria-live="polite">Uploading…</span>
          <span v-else
            ><b>Upload</b> or drop an image<small
              >JPG, PNG, WebP or GIF · up to 10 MB</small
            ></span
          >
        </label>
        <div class="deck-image-field__buttons">
          <Button variant="outline" size="sm" @click="openLibrary"
            >From the library</Button
          >
          <Button v-if="src" variant="ghost" size="sm" @click="removeImage"
            ><span>Remove</span
            ><span class="sr-only"> {{ descriptor.label }}</span></Button
          >
        </div>
      </div>
    </div>
    <p v-if="uploadError" class="deck-image-field__error" role="alert">
      {{ uploadError }}
    </p>
    <p v-if="libraryError" class="deck-image-field__error" role="alert">
      {{ libraryError }}
    </p>

    <FormField label="Image address">
      <input
        :id="ids.src"
        type="url"
        inputmode="url"
        spellcheck="false"
        autocomplete="off"
        placeholder="/publicAssets/deck/… or https://…supabase.co/…"
        :value="src"
        :aria-invalid="srcInvalid ? 'true' : undefined"
        :aria-describedby="`${ids.src}--desc`"
        @input="setSrc($event.target.value.trim())"
      />
    </FormField>
    <div :id="`${ids.src}--desc`" class="deck-ed-desc">
      <span v-if="descriptor.hint">{{ descriptor.hint }}</span>
      <ul
        v-if="srcProblems.length || fieldProblems.length || cspWarning"
        class="deck-ed-problems"
      >
        <li
          v-for="(p, k) in [...fieldProblems, ...srcProblems]"
          :key="`${p.code}-${k}`"
          class="deck-ed-problem"
          :class="level(p)"
        >
          <component :is="p.level === 'error' ? IconError : IconWarn" />
          <span
            ><span class="sr-only">{{
              p.level === "error" ? "Error: " : "Warning: "
            }}</span
            >{{ p.message }}</span
          >
        </li>
        <li v-if="cspWarning" class="deck-ed-problem is-warn">
          <IconWarn />
          <span
            ><span class="sr-only">Warning: </span>The site blocks images from
            this address, so it won't show on the deck. Upload the file, pick it
            from the library, or use a /publicAssets/ path.</span
          >
        </li>
      </ul>
    </div>

    <template v-if="hasAlt">
      <FormField label="Alt text">
        <input
          :id="ids.alt"
          type="text"
          :value="alt"
          :aria-describedby="`${ids.alt}--desc`"
          @input="setAlt($event.target.value)"
        />
      </FormField>
      <div :id="`${ids.alt}--desc`" class="deck-ed-desc">
        <span>What the image shows, for people who can't see it.</span>
        <ul v-if="altProblems.length" class="deck-ed-problems">
          <li
            v-for="(p, k) in altProblems"
            :key="`${p.code}-${k}`"
            class="deck-ed-problem"
            :class="level(p)"
          >
            <component :is="p.level === 'error' ? IconError : IconWarn" />
            <span
              ><span class="sr-only">{{
                p.level === "error" ? "Error: " : "Warning: "
              }}</span
              >{{ p.message }}</span
            >
          </li>
        </ul>
      </div>
    </template>

    <template v-if="hasPlaceholder">
      <FormField label="Placeholder text">
        <input
          :id="ids.placeholder"
          type="text"
          :value="placeholder"
          :aria-describedby="`${ids.placeholder}--desc`"
          @input="setPlaceholder($event.target.value)"
        />
      </FormField>
      <p :id="`${ids.placeholder}--desc`" class="deck-ed-desc">
        Shown in the empty frame until there is an image.
      </p>
    </template>

    <MediaPicker
      v-if="picking"
      open
      :media="library"
      :types="['image']"
      title="Choose an image"
      @pick="pick"
      @close="picking = false"
    />
  </fieldset>
</template>

<style scoped>
.deck-image-field:focus {
  outline: none;
}
.deck-image-field__main {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.deck-image-field__preview {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-bg));
}
.deck-image-field__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.deck-image-field__empty {
  padding: 6px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.deck-image-field__tools {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.deck-image-field__drop {
  display: flex;
  align-items: center;
  min-height: 3.25rem;
  padding: 8px 10px;
  border: 1px dashed rgb(var(--color-mute) / 0.5);
  background: rgb(var(--color-paper));
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  line-height: 1.35;
  color: rgb(var(--color-ink));
  cursor: pointer;
}
.deck-image-field__drop small {
  display: block;
  font-size: var(--ui-size-11);
  color: rgb(var(--color-mute));
}
.deck-image-field__drop.is-dragging {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.05);
}
.deck-image-field__drop.is-busy {
  cursor: progress;
}
.deck-image-field__drop:focus-within {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.deck-image-field__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.deck-image-field__error {
  margin: 0;
  padding: 6px 8px;
  border-left: 3px solid rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.06);
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}
</style>
