<script setup>
/*
 * WidgetStudio — build a widget in Claude, upload it here (OPENBRAIN-105).
 *
 * Anton, 26 Sep: Stuart and Arjun already build widgets in Claude, so the
 * book should not grow its own editor: give them the Open Brain widget
 * skill and design.md (public/widget-kit/), and a place to upload what
 * Claude makes. Here a creator drops the .html, sees it running at phone,
 * tablet and desktop widths, gets the kit's checks, and saves or publishes
 * it. A published widget is placed in a chapter from the chapter editor
 * (Add widget → Uploaded), as widgetId "upload:<slug>".
 */
import { computed, onMounted, ref } from "vue";
import {
  BaseCard,
  Button,
  EmptyState,
  FormField,
  LoadingState,
  SectionHeader,
  StatusBadge,
} from "@/components/dashboard/shared";
import ScaledFrame from "./ScaledFrame.vue";
import { staticChecks, widgetSlug, MAX_WIDGET_BYTES } from "./widgetHost";
import {
  UPLOAD_PREFIX,
  fetchUploadedWidget,
  useUploadedWidgets,
} from "./useUploadedWidgets";
import { RAMPS, RAMP_NAMES } from "@/helper/chapterTheme";
import { relativeShort as formatRelativeDate } from "@/utils/format";

const KIT = "/widget-kit";
const DEVICES = [
  { key: "phone", label: "Phone", width: 390 },
  { key: "tablet", label: "Tablet", width: 768 },
  { key: "desktop", label: "Desktop", width: 1280 },
];

const {
  widgets,
  loading,
  error,
  fetchWidgets,
  saveWidget,
  setStatus,
  deleteWidget,
} = useUploadedWidgets();
onMounted(fetchWidgets);

// The widget being checked: its file and details
const draft = ref(null); // { html, bytes, fileName, title, slug, description, author, ramp, status }
const reports = ref({}); // device key → WidgetFrame report
const dropping = ref(false);
const fileError = ref("");
const saving = ref(false);
const saveError = ref("");
const saved = ref(null);
const fileInput = ref(null);
// A fresh id per opened file, so the previews restart only for a new file.
const draftId = ref(0);

function titleOf(html) {
  return /<title>\s*([^<]+?)\s*<\/title>/i.exec(html)?.[1] || "";
}

function open(html, { fileName = "", row = null } = {}) {
  fileError.value = "";
  saveError.value = "";
  saved.value = null;
  reports.value = {};
  draftId.value += 1;
  const bytes = new Blob([html]).size;
  if (bytes > MAX_WIDGET_BYTES) {
    fileError.value = `That file is ${(bytes / 1024 / 1024).toFixed(1)} MB; the book takes up to 2 MB.`;
    return;
  }
  const title =
    row?.title || titleOf(html) || fileName.replace(/\.html?$/i, "");
  draft.value = {
    html,
    bytes,
    fileName,
    title,
    slug: row?.slug || widgetSlug(title),
    description: row?.description || "",
    author: row?.author || "",
    ramp: row?.ramp || "perc",
    status: row?.status || "draft",
    existing: !!row,
  };
}

async function readFile(file) {
  if (!file) return;
  if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
    fileError.value = "Upload the widget's .html file.";
    return;
  }
  open(await file.text(), { fileName: file.name });
}
function onPick(e) {
  readFile(e.target.files?.[0]);
  e.target.value = "";
}
function onDrop(e) {
  dropping.value = false;
  readFile(e.dataTransfer?.files?.[0]);
}
async function tryTemplate() {
  try {
    const res = await fetch(`${KIT}/open-brain-widget/template.html`);
    open(await res.text(), { fileName: "template.html" });
  } catch {
    fileError.value = "The template didn't load. Try again.";
  }
}
async function openSaved(row) {
  try {
    const full = await fetchUploadedWidget(row.slug);
    if (full?.html) open(full.html, { row: full });
  } catch {
    fileError.value = "That widget didn't load. Try again.";
  }
}
function close() {
  draft.value = null;
  reports.value = {};
}

// Checks: the file's, and what the three running copies report
const runtimeChecks = computed(() => {
  const all = DEVICES.map((d) => reports.value[d.key]);
  const ready = all.every((r) => r?.ready);
  const errors = [...new Set(all.flatMap((r) => r?.errors || []))];
  const blocked = [...new Set(all.flatMap((r) => r?.blocked || []))];
  const phone = reports.value.phone;
  const overflow = phone ? Math.max(0, phone.scrollWidth - phone.viewport) : 0;
  return [
    {
      id: "runs",
      label: "Runs without errors",
      ok: ready ? errors.length === 0 : null,
      detail: ready ? errors[0] || "No errors at any width" : "Running…",
    },
    {
      id: "fits",
      label: "Fits a phone (390 px)",
      ok: phone?.ready ? overflow <= 1 : null,
      detail: phone?.ready
        ? overflow > 1
          ? `${overflow} px wider than the screen`
          : "No sideways scrolling"
        : "Measuring…",
    },
    {
      id: "blocked",
      label: "Nothing blocked by the book",
      ok: ready ? blocked.length === 0 : null,
      detail: blocked.length
        ? `Blocked: ${blocked.slice(0, 2).join(", ")}`
        : ready
          ? "All resources allowed"
          : "Running…",
    },
  ];
});
const checks = computed(() =>
  draft.value
    ? [
        ...runtimeChecks.value,
        ...staticChecks(draft.value.html, draft.value.bytes),
      ]
    : []
);
const passed = computed(() => checks.value.filter((c) => c.ok === true).length);
const pending = computed(() => checks.value.some((c) => c.ok === null));

const slugTaken = computed(
  () =>
    draft.value &&
    !draft.value.existing &&
    widgets.value.some((w) => w.slug === draft.value.slug)
);
const canSave = computed(
  () =>
    !!draft.value?.title?.trim() &&
    /^[a-z0-9][a-z0-9-]*$/.test(draft.value?.slug || "") &&
    !saving.value
);

async function save(status) {
  if (!canSave.value) return;
  saving.value = true;
  saveError.value = "";
  try {
    const row = await saveWidget({
      ...draft.value,
      title: draft.value.title.trim(),
      status,
      checks: checks.value.map(({ id, ok, detail }) => ({ id, ok, detail })),
    });
    draft.value = { ...draft.value, status, existing: true };
    saved.value = row || { slug: draft.value.slug, status };
  } catch (err) {
    console.error("WidgetStudio: save failed", err);
    saveError.value =
      "It didn't save. Check you're signed in as a creator and try again.";
  } finally {
    saving.value = false;
  }
}

async function toggle(row) {
  await setStatus(row.slug, row.status === "published" ? "draft" : "published");
}
async function remove(row) {
  if (
    !window.confirm(
      `Delete "${row.title}"? Chapters that use it will show it as unavailable.`
    )
  )
    return;
  await deleteWidget(row.slug);
  if (draft.value?.slug === row.slug) close();
}
function passCount(row) {
  const c = Array.isArray(row.checks) ? row.checks : [];
  return c.length ? `${c.filter((x) => x.ok).length}/${c.length} checks` : "";
}
</script>

<template>
  <section class="ws" aria-labelledby="ws-title">
    <SectionHeader
      id="ws-title"
      eyebrow="Upload"
      title="Build a widget in Claude, upload it here"
      subtitle="Authors make interactive figures in Claude with the Open Brain widget skill. Drop the file here to see it at phone, tablet and desktop sizes, check it, and publish it for the chapters."
    />

    <div class="ws-grid">
      <!-- How: the kit -->
      <BaseCard class="ws-kit">
        <h3 class="ws-h">1 · Get the kit</h3>
        <ol class="ws-steps">
          <li>
            <strong>Download the skill</strong> and add it in Claude (Settings →
            Capabilities → Skills → Upload), or add its three files to a Claude
            project.
          </li>
          <li>
            <strong>Ask for a widget.</strong> Describe it, or attach a sketch,
            a photo of a drawing, a Figma frame or a figure from a paper. Claude
            builds it in the book's style.
          </li>
          <li>
            <strong>Download the .html</strong> Claude makes and upload it here.
          </li>
        </ol>
        <div class="ws-links">
          <a class="ws-download" :href="`${KIT}/open-brain-widget.zip`" download
            >Download the skill (.zip)</a
          >
          <a
            :href="`${KIT}/open-brain-widget/SKILL.md`"
            target="_blank"
            rel="noopener"
            >SKILL.md</a
          >
          <a
            :href="`${KIT}/open-brain-widget/design.md`"
            target="_blank"
            rel="noopener"
            >design.md</a
          >
          <a
            :href="`${KIT}/open-brain-widget/template.html`"
            target="_blank"
            rel="noopener"
            >template.html</a
          >
        </div>
      </BaseCard>

      <!-- Upload -->
      <BaseCard class="ws-upload">
        <h3 class="ws-h">2 · Upload the .html</h3>
        <label
          class="ws-drop"
          :class="{ 'ws-drop--on': dropping }"
          @dragover.prevent="dropping = true"
          @dragleave="dropping = false"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".html,.htm,text/html"
            class="ws-file"
            @change="onPick"
          />
          <span class="ws-drop-main">Drop the widget's .html here</span>
          <span class="ws-drop-sub"
            >or click to choose a file · up to 2 MB</span
          >
        </label>
        <p v-if="fileError" class="ws-error" role="alert">{{ fileError }}</p>
        <Button variant="ghost" size="sm" @click="tryTemplate"
          >Try it with the kit's template</Button
        >
      </BaseCard>
    </div>

    <!-- Check: the widget running at three widths -->
    <BaseCard v-if="draft" class="ws-check">
      <div class="ws-check-head">
        <h3 class="ws-h">3 · Check it</h3>
        <Button variant="ghost" size="sm" @click="close">Close</Button>
      </div>

      <div class="ws-devices">
        <ScaledFrame
          v-for="d in DEVICES"
          :key="`${d.key}-${draftId}-${draft.ramp}`"
          :class="`ws-device ws-device--${d.key}`"
          :html="draft.html"
          :ramp="draft.ramp"
          :width="d.width"
          :label="d.label"
          @report="(r) => (reports = { ...reports, [d.key]: r })"
        />
      </div>

      <div class="ws-below">
        <div>
          <h4 class="ws-sub">
            Checks
            <span class="ws-score">{{ passed }}/{{ checks.length }}</span>
          </h4>
          <ul class="ws-checks">
            <li
              v-for="c in checks"
              :key="c.id"
              class="ws-checkrow"
              :class="c.ok === null ? 'is-wait' : c.ok ? 'is-ok' : 'is-bad'"
            >
              <span class="ws-mark" aria-hidden="true">{{
                c.ok === null ? "…" : c.ok ? "✓" : "!"
              }}</span>
              <span class="ws-check-label">{{ c.label }}</span>
              <span class="ws-check-detail">{{ c.detail }}</span>
            </li>
          </ul>
        </div>

        <div class="ws-form">
          <h4 class="ws-sub">Details</h4>
          <FormField label="Title" required>
            <input v-model="draft.title" type="text" />
          </FormField>
          <FormField
            label="Name in the book"
            :hint="`Chapters place it as ${UPLOAD_PREFIX}${draft.slug || '…'}`"
            :error="
              slugTaken
                ? 'Another widget has this name; saving will replace it.'
                : ''
            "
          >
            <input
              v-model="draft.slug"
              type="text"
              :disabled="draft.existing"
            />
          </FormField>
          <FormField
            label="Subject colour"
            hint="The chapter's colour; the book sets it when placed."
          >
            <select v-model="draft.ramp">
              <option v-for="r in RAMPS" :key="r" :value="r">
                {{ RAMP_NAMES[r] }}
              </option>
            </select>
          </FormField>
          <FormField label="Author">
            <input
              v-model="draft.author"
              type="text"
              placeholder="Stuart Trenholm"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              v-model="draft.description"
              rows="2"
              placeholder="One line for the widget list"
            />
          </FormField>

          <p v-if="pending" class="ws-note">
            Running the widget at three widths…
          </p>
          <p v-if="saveError" class="ws-error" role="alert">{{ saveError }}</p>
          <p v-if="saved" class="ws-ok" role="status">
            Saved as
            {{ saved.status === "published" ? "published" : "a draft" }}.
            <template v-if="saved.status === 'published'">
              Place it in a chapter from the chapter editor: Add widget →
              Uploaded.</template
            >
          </p>
          <div class="ws-actions">
            <Button
              variant="outline"
              :disabled="!canSave"
              :loading="saving"
              @click="save('draft')"
              >Save draft</Button
            >
            <Button
              :disabled="!canSave"
              :loading="saving"
              @click="save('published')"
              >Publish</Button
            >
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- The uploads -->
    <div class="ws-list">
      <h3 class="ws-h">Uploaded widgets</h3>
      <LoadingState v-if="loading" message="Loading uploads…" size="sm" />
      <p v-else-if="error" class="ws-error" role="alert">{{ error }}</p>
      <EmptyState
        v-else-if="!widgets.length"
        title="No uploads yet"
        message="Widgets you upload appear here, as drafts until you publish them."
      />
      <BaseCard v-else padding="none">
        <div v-for="w in widgets" :key="w.id" class="ws-row">
          <div class="ws-row-main">
            <span class="ws-row-title">{{ w.title }}</span>
            <span class="ws-row-meta"
              >{{ UPLOAD_PREFIX }}{{ w.slug
              }}<template v-if="w.author"> · {{ w.author }}</template> ·
              {{ formatRelativeDate(w.updated_at)
              }}<template v-if="passCount(w)">
                · {{ passCount(w) }}</template
              ></span
            >
          </div>
          <StatusBadge
            :variant="w.status === 'published' ? 'complete' : 'neutral'"
            >{{ w.status === "published" ? "Published" : "Draft" }}</StatusBadge
          >
          <div class="ws-row-actions">
            <Button variant="ghost" size="sm" @click="openSaved(w)"
              >Open</Button
            >
            <Button variant="ghost" size="sm" @click="toggle(w)">{{
              w.status === "published" ? "Unpublish" : "Publish"
            }}</Button>
            <Button variant="ghost" size="sm" @click="remove(w)">Delete</Button>
          </div>
        </div>
      </BaseCard>
    </div>
  </section>
</template>

<style scoped>
.ws {
  display: grid;
  gap: 1.5rem;
}
.ws-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}
.ws-h {
  margin: 0 0 1rem;
  padding: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}
.ws-steps {
  margin: 0 0 1.25rem;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.625rem;
  font-size: 0.9375rem;
  line-height: 1.5;
}
.ws-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}
.ws-links a {
  color: rgb(var(--color-ink));
}
.ws-download {
  padding: 0.625rem 1rem;
  border: 1px solid rgb(var(--color-ink));
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper)) !important;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ws-drop {
  display: grid;
  place-items: center;
  gap: 0.375rem;
  min-height: 9rem;
  margin-bottom: 0.75rem;
  border: 1px dashed rgb(var(--color-ink) / 0.4);
  background: rgb(var(--color-bg));
  text-align: center;
  cursor: pointer;
}
.ws-drop--on {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.06);
}
.ws-file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.ws-drop:focus-within {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.ws-drop-main {
  font-size: 1rem;
  font-weight: 500;
}
.ws-drop-sub {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}
.ws-check-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.ws-devices {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr 2fr;
  gap: 1rem;
  align-items: start;
}
.ws-below {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 2rem;
  margin-top: 1.5rem;
}
.ws-sub {
  margin: 0 0 0.75rem;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.ws-score {
  margin-left: 0.5rem;
  color: rgb(var(--color-ink));
}
.ws-checks {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ws-checkrow {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.625rem 0;
  border-top: 1px solid rgb(var(--color-line));
  font-size: 0.875rem;
}
.ws-mark {
  font-family: var(--font-mono);
  font-weight: 600;
}
.is-ok .ws-mark {
  color: rgb(var(--color-complete));
}
.is-bad .ws-mark {
  color: rgb(var(--color-warn));
}
.is-wait .ws-mark {
  color: rgb(var(--color-mute));
}
.ws-check-detail {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
  overflow-wrap: anywhere;
}
.ws-form {
  display: grid;
  gap: 0.75rem;
  align-content: start;
}
.ws-actions {
  display: flex;
  gap: 0.75rem;
}
.ws-note,
.ws-ok,
.ws-error {
  margin: 0;
  font-size: 0.875rem;
}
.ws-note {
  color: rgb(var(--color-mute));
}
.ws-ok {
  color: rgb(var(--color-ink));
}
.ws-error {
  color: rgb(var(--color-warn));
}
.ws-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid rgb(var(--color-line));
}
.ws-row:first-child {
  border-top: 0;
}
.ws-row-main {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}
.ws-row-title {
  font-size: 0.9375rem;
  font-weight: 500;
}
.ws-row-meta {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ws-row-actions {
  display: flex;
  gap: 0.25rem;
}

@media (max-width: 1100px) {
  .ws-grid,
  .ws-below {
    grid-template-columns: 1fr;
  }
  .ws-devices {
    grid-template-columns: 1fr 1fr;
  }
  .ws-device--desktop {
    grid-column: 1 / -1;
  }
}
</style>
