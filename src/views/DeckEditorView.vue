<script setup>
/*
 * Deck editor — /dashboard/decks/:slug (OPENBRAIN-129).
 *
 * A full page outside the dashboard shell, like the chapter block page:
 * the slide rail on the left, a live preview of the selected slide in the
 * middle, and the slide's form on the right (from 1024 to 1279px the rail
 * becomes a strip of thumbnails above the other two). Below 1024px there is
 * no editor, only Present draft, Share and the way back.
 *
 * useDeckEditor owns the deck: every edit goes into its undo history and
 * autosaves to the private working copy a second later. Publish copies the
 * working copy into the snapshot funders see. This view wires the parts
 * together and adds what is page-level: the header and its save state, the
 * dialogs, a local toast, the keyboard shortcuts (bound on the editor root,
 * never window) and saving before the route is left.
 */
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  toRef,
  watch,
} from "vue";
import { matchedRouteKey, onBeforeRouteLeave } from "vue-router";
import {
  BaseModal,
  Button,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/dashboard/shared";
import SlidePreview from "@/components/deck/SlidePreview.vue";
import DeckSlideRail from "@/components/deck/editor/DeckSlideRail.vue";
import DeckSlideForm from "@/components/deck/editor/DeckSlideForm.vue";
import AddSlideDialog from "@/components/deck/editor/AddSlideDialog.vue";
import DeckShareDialog from "@/components/deck/editor/DeckShareDialog.vue";
import DeckProblems from "@/components/deck/editor/DeckProblems.vue";
import { useDialogFocus } from "@/components/deck/editor/editorA11y.js";
import { DECK_UPDATE_ENTRY } from "@/components/deck/editor/fieldPaths.js";
import { IconError, IconWarn } from "@/components/deck/editor/editorIcons.js";
import { useDeckEditor } from "@/composables/useDeckEditor";
import { deckHomeLabel, useDecks } from "@/composables/useDecks";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { cloneEntry, fieldId } from "@/data/decks/validate.js";
import { smartPunctuation } from "@/data/decks/text.js";

const props = defineProps({
  slug: { type: String, required: true },
});

const ed = useDeckEditor(toRef(props, "slug"));
const {
  status,
  loadError,
  deck,
  title,
  entries,
  selectedId,
  selected,
  selectedIndex,
  problems,
  problemsById,
  errorCount,
  warningCount,
  saveState,
  lastSavedAt,
  saveError,
  conflict,
  dirtySincePublish,
  canUndo,
  canRedo,
} = ed;
const decksApi = useDecks();
// Where the pinned deck shows: this site's /deck.
const deckHome = deckHomeLabel();
// An upload that finishes after its slide's form is gone (another slide is
// selected) still lands on the slide it was for.
provide(DECK_UPDATE_ENTRY, {
  updateEntry: ed.updateEntry,
  selectedId: () => ed.selectedId.value,
  entryOf: (id) => ed.entries.value.find((e) => e?.id === id) ?? null,
});

onMounted(() => ed.load());

// ── layout ───────────────────────────────────────────────────────────────
// The editor needs a laptop's width: below it, only presenting and sharing.
const EDITOR_MIN_PX = 1024;
const wideQuery =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(`(min-width: ${EDITOR_MIN_PX}px)`)
    : null;
const wide = ref(wideQuery ? wideQuery.matches : true);
const onWideChange = (e) => (wide.value = e.matches);
wideQuery?.addEventListener?.("change", onWideChange);
onBeforeUnmount(() => wideQuery?.removeEventListener?.("change", onWideChange));

// ── header ───────────────────────────────────────────────────────────────
const ready = computed(() => status.value === "ready");
const isPublished = computed(() => deck.value?.status === "published");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const clock = (date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const saveLabel = computed(() => {
  switch (saveState.value) {
    case "pending":
    case "saving":
      return "Saving…";
    case "error":
    case "refused":
      return "Not saved";
    case "conflict":
      return "Not saved · changed elsewhere";
    default:
      return lastSavedAt.value ? `Saved ${clock(lastSavedAt.value)}` : "Saved";
  }
});
const canRetry = computed(
  () => saveState.value === "error" || saveState.value === "refused"
);

function onTitleInput(e) {
  ed.setTitle(e.target.value);
}
function onTitleBlur(e) {
  const next = smartPunctuation(e.target.value);
  if (next !== e.target.value) ed.setTitle(next);
}

const problemsLabel = computed(() => {
  if (!errorCount.value && !warningCount.value) return "No problems";
  return [
    errorCount.value && plural(errorCount.value, "error"),
    warningCount.value && plural(warningCount.value, "warning"),
  ]
    .filter(Boolean)
    .join(", ");
});

const publishLabel = computed(() =>
  isPublished.value ? "Publish changes" : "Publish"
);
// Why Publish is off, also read out with the button.
const publishBlocked = computed(() => {
  if (!ready.value) return "The deck is still loading.";
  if (errorCount.value)
    return `Fix ${plural(errorCount.value, "problem")} to publish.`;
  if (isPublished.value && !dirtySincePublish.value)
    return "No changes since the deck was published.";
  return "";
});

// ── toast ────────────────────────────────────────────────────────────────
// One message at a time, with an optional action (Undo, Copy link). A
// shallowRef: an Undo action compares the deck's arrays by identity, which a
// deep reactive proxy would break.
const toast = shallowRef(null);
let toastTimer;
function showToast(message, { action = null, error = false } = {}) {
  clearTimeout(toastTimer);
  toast.value = { message, action, error };
  toastTimer = setTimeout(() => (toast.value = null), action ? 10000 : 6000);
}
// An Undo in a toast undoes the change the toast is about, and nothing
// else. Every edit replaces `entries` or `title` with a new value, so the
// action records the ones its change produced; once anything else changes
// the deck (an edit, an undo, a redo) the toast closes, because the undo
// stack's top is no longer its step. Call it right after the change.
function undoAction() {
  const at = { entries: entries.value, title: title.value };
  return { label: "Undo", at, run: () => ed.undo() };
}
const stillAt = (at) =>
  !at || (entries.value === at.entries && title.value === at.title);
watch([entries, title], () => {
  if (!stillAt(toast.value?.action?.at)) toast.value = null;
});
function runToastAction() {
  const action = toast.value?.action;
  toast.value = null;
  if (action && stillAt(action.at)) action.run();
}
onBeforeUnmount(() => clearTimeout(toastTimer));

async function copyText(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(done);
  } catch {
    showToast("The clipboard isn't available here. Copy it from the page.", {
      error: true,
    });
  }
}

// ── keyboard ─────────────────────────────────────────────────────────────
// On the editor root, so nothing reaches DeckStage-style window bindings.
// Undo and redo leave text fields alone: they keep their native undo.
const EDITABLE = "input, textarea, select, [contenteditable]";
function onKeydown(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || e.altKey || !ready.value) return;
  const key = String(e.key || "").toLowerCase();
  if (key === "s") {
    e.preventDefault();
    ed.flush();
    return;
  }
  const inField = e.target instanceof Element && e.target.closest(EDITABLE);
  if (inField) return;
  if (key === "z" && !e.shiftKey) {
    e.preventDefault();
    ed.undo();
  } else if ((key === "z" && e.shiftKey) || (key === "y" && e.ctrlKey)) {
    e.preventDefault();
    ed.redo();
  }
}

// ── slides ───────────────────────────────────────────────────────────────
const selectedProblems = computed(() =>
  problems.value.filter((p) => p.slideId && p.slideId === selectedId.value)
);
const previewLabel = computed(() =>
  selected.value
    ? `Preview of slide ${selectedIndex.value + 1}: ${selected.value.label || "Untitled"}`
    : ""
);
const previewPane = ref(null);
// The other slides' ids, by position (a deck saved with a duplicate still
// lists the copy), so the form can refuse an id that is taken.
const takenIds = computed(() =>
  entries.value
    .filter((_, i) => i !== selectedIndex.value)
    .map((e) => e?.id)
    .filter(Boolean)
);

function onOverflow(overflowing) {
  if (selectedId.value) ed.setOverflow(selectedId.value, overflowing);
}

function onRemove(id) {
  if (ed.remove(id)) showToast("Slide deleted.", { action: undoAction() });
}

// Focus a field of the selected slide once its form has rendered. A field
// can be out of sight: inside the closed Advanced section, or a list item
// card that was collapsed. Those open first (the `deck-reveal` event asks
// each list card around the field to expand). Returns whether something
// took focus.
async function focusField(slideId, path) {
  await nextTick();
  const id = fieldId(slideId, path);
  let el = document.getElementById(id);
  if (!el) return false;
  for (
    let d = el.closest("details");
    d;
    d = d.parentElement?.closest("details")
  )
    d.setAttribute("open", "");
  el.dispatchEvent(new CustomEvent("deck-reveal", { bubbles: true }));
  await nextTick();
  el = document.getElementById(id) ?? el;
  el.focus();
  el.scrollIntoView?.({ block: "nearest" });
  return document.activeElement === el || el.contains(document.activeElement);
}

// ── add slide ────────────────────────────────────────────────────────────
const addOpen = ref(false);
const addAfter = ref(null);
function openAdd(afterId) {
  addAfter.value = afterId ?? selectedId.value ?? null;
  addOpen.value = true;
}
// The new slide's title field, or (the role layout has no title) its first
// text field.
function firstTextPath(layout) {
  const fields = LAYOUT_SCHEMAS[layout]?.fields || {};
  if (fields.title) return "props.title";
  const key = Object.keys(fields).find((k) =>
    ["text", "longtext"].includes(fields[k].type)
  );
  return key ? `props.${key}` : "label";
}
async function onPick(entry) {
  const ids = entries.value.map((e) => e.id);
  const id = ed.insert(cloneEntry(entry, ids), { after: addAfter.value });
  addOpen.value = false;
  const layout = entries.value.find((e) => e.id === id)?.layout;
  if (!(await focusField(id, firstTextPath(layout))))
    await focusField(id, "label");
}

// ── problems ─────────────────────────────────────────────────────────────
const problemsOpen = ref(false);
async function onJump({ slideId, path }) {
  if (slideId) ed.select(slideId);
  if (slideId && path && (await focusField(slideId, path))) return;
  // A problem about the whole slide (text running off it) or the deck: the
  // preview, where it shows.
  await nextTick();
  previewPane.value?.focus();
}
function onRenumber() {
  if (ed.renumber())
    showToast("Eyebrows renumbered.", { action: undoAction() });
  else showToast("Eyebrows already match their slides.");
}

// ── present draft ────────────────────────────────────────────────────────
// Saved first, so the new tab shows what is here. The tab opens at once
// (a popup blocker allows it during the click) and navigates when the save
// is done.
const visiblePosition = computed(() => {
  const i = Math.max(selectedIndex.value, 0);
  const before = entries.value
    .slice(0, i)
    .filter((e) => e.hidden !== true).length;
  return before + 1;
});
const presentUrl = computed(
  () =>
    `/dashboard/decks/${encodeURIComponent(props.slug)}/present${
      visiblePosition.value > 1 ? `#${visiblePosition.value}` : ""
    }`
);
async function presentDraft() {
  const tab = window.open("about:blank", "_blank");
  const saved = await ed.flush();
  if (!saved)
    showToast(
      "The latest changes aren't saved: the draft shows the last save.",
      {
        error: true,
      }
    );
  if (tab) {
    tab.opener = null;
    tab.location.href = presentUrl.value;
  } else window.open(presentUrl.value, "_blank", "noopener");
}

// ── publish ──────────────────────────────────────────────────────────────
const publishAsk = ref(false);
const publishing = ref(false);
const visibleCount = computed(
  () => entries.value.filter((e) => e.hidden !== true).length
);
async function askPublish() {
  if (publishBlocked.value) return;
  if (!(await ed.flush())) {
    if (saveState.value !== "conflict")
      showToast(saveError.value || "Save the deck before publishing.", {
        error: true,
      });
    return;
  }
  publishAsk.value = true;
}
async function confirmPublish() {
  const first = !deck.value?.published_at;
  publishing.value = true;
  try {
    const meta = await ed.publish();
    publishAsk.value = false;
    // null: another save got there first; the conflict dialog takes over.
    if (!meta) return;
    showToast("Published.", {
      action: {
        label: "Copy link",
        run: () => copyText(decksApi.shareUrl(deck.value), "Link copied."),
      },
    });
    if (first) shareOpen.value = true;
  } catch (err) {
    publishAsk.value = false;
    showToast(err?.message || "The deck couldn't be published.", {
      error: true,
    });
  } finally {
    publishing.value = false;
  }
}

// ── share ────────────────────────────────────────────────────────────────
const shareOpen = ref(false);
const shareBusy = ref(false);
const shareError = ref("");
async function shareWrite(run, done) {
  shareBusy.value = true;
  shareError.value = "";
  try {
    await run();
    if (done) showToast(done);
  } catch (err) {
    shareError.value = err?.message || "That didn't work.";
  } finally {
    shareBusy.value = false;
  }
}
// Each share write merges only the columns it changes. The row it gets back
// also carries `version`, read whenever the write ran: merging that could
// put the editor's version behind its own save that landed meanwhile (a
// false conflict), or ahead past another tab's save (an overwrite with no
// conflict). The version only ever comes from this editor's own saves.
const onRotate = () =>
  shareWrite(async () => {
    const row = await decksApi.rotateLink(deck.value);
    if (row?.share_token) ed.applyMeta({ share_token: row.share_token });
  }, "New link made. The old one no longer works.");
const onUnpublish = () =>
  shareWrite(async () => {
    const row = await decksApi.unpublishDeck(deck.value);
    // No row back: the database refused, so nothing changed.
    if (row) ed.applyMeta({ status: row.status, pinned: row.pinned });
  }, "Unpublished. The link stops working until you publish again.");
// Off unpins this deck's own row: never whichever deck /deck shows now.
const onPin = (on) =>
  shareWrite(
    async () => {
      const row = await decksApi.setPinned(deck.value, on);
      ed.applyMeta({ pinned: on ? true : Boolean(row?.pinned) });
    },
    on
      ? `Shown at ${deckHome}.`
      : "No longer shown at /deck: it shows the bundled October copy."
  );
function openShare() {
  shareError.value = "";
  shareOpen.value = true;
}

// ── more menu ────────────────────────────────────────────────────────────
const moreOpen = ref(false);
const moreButton = ref(null);
const moreMenu = ref(null);
function toggleMore() {
  moreOpen.value = !moreOpen.value;
  if (moreOpen.value)
    nextTick(() => moreMenu.value?.querySelector("button")?.focus());
}
const moreButtonEl = () => moreButton.value?.$el ?? moreButton.value;
function closeMore({ refocus = false } = {}) {
  moreOpen.value = false;
  if (refocus) nextTick(() => moreButtonEl()?.focus());
}
function moreAction(fn) {
  closeMore({ refocus: true });
  fn();
}
function onMoreKeydown(e) {
  if (e.key !== "Escape") return;
  e.stopPropagation();
  closeMore({ refocus: true });
}
function onDocumentPointer(e) {
  if (!e.target.closest?.(".de-more")) closeMore();
}
watch(moreOpen, (open) => {
  if (open) document.addEventListener("pointerdown", onDocumentPointer);
  else document.removeEventListener("pointerdown", onDocumentPointer);
});
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", onDocumentPointer)
);

const canDiscard = computed(() => isPublished.value && dirtySincePublish.value);
const discardAsk = ref(false);
const discarding = ref(false);
async function confirmDiscard() {
  discarding.value = true;
  try {
    const done = await ed.discardUnpublished();
    discardAsk.value = false;
    if (done)
      showToast("Unpublished changes discarded.", { action: undoAction() });
  } catch (err) {
    discardAsk.value = false;
    showToast(err?.message || "The changes couldn't be discarded.", {
      error: true,
    });
  } finally {
    discarding.value = false;
  }
}

const copyJson = () =>
  copyText(JSON.stringify(entries.value, null, 2), "Deck JSON copied.");

// ── conflict ─────────────────────────────────────────────────────────────
// Its own dialog rather than a ConfirmDialog: Escape or the close button
// must not pick an answer. Closing it leaves the deck unsaved, with
// "Resolve" in the header to come back.
const conflictOpen = ref(false);
const conflictText = ref(null);
const resolving = ref(false);
watch(saveState, (s) => {
  if (s === "conflict") conflictOpen.value = true;
});
const conflictTime = computed(() => {
  const at = conflict.value?.updatedAt;
  if (!at) return "a moment ago";
  const date = new Date(at);
  return date.toDateString() === new Date().toDateString()
    ? clock(date)
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
});
async function resolve(choice) {
  resolving.value = true;
  try {
    const ok = await ed.resolveConflict(choice);
    conflictOpen.value = false;
    // Undo after "Load theirs" brings this tab's version back (and saves it
    // over theirs).
    if (ok && choice === "theirs")
      showToast(
        "Loaded the latest version.",
        ed.canUndo.value ? { action: undoAction() } : {}
      );
    else if (ok) showToast("Saved your version over theirs.");
  } finally {
    resolving.value = false;
  }
}
// The dialog opens by itself, from an autosave, while the creator may still
// be typing, and both answers drop someone's work: focus goes to its text,
// so a stray Space or Enter answers nothing. Tab reaches both buttons.
useDialogFocus(
  () => conflictOpen.value,
  () => conflictText.value
);

// ── leaving ──────────────────────────────────────────────────────────────
// Save on the way out; if that fails, ask. useDeckEditor already saves when
// the tab is hidden and asks before the page unloads. The guard needs the
// page to be a route (a story renders it without a router view).
if (inject(matchedRouteKey, null)?.value)
  onBeforeRouteLeave(
    async () =>
      (await ed.flush()) ||
      window.confirm(
        "Your latest changes aren't saved. Leave without saving them?"
      )
  );
</script>

<template>
  <div class="de" @keydown="onKeydown">
    <header class="de-top">
      <router-link to="/dashboard?section=decks" class="de-back"
        >← Decks</router-link
      >

      <template v-if="ready">
        <template v-if="wide">
          <h1 class="sr-only">Edit deck: {{ title }}</h1>
          <input
            class="de-title"
            type="text"
            :value="title"
            maxlength="200"
            aria-label="Deck title"
            @input="onTitleInput"
            @blur="onTitleBlur"
          />
        </template>
        <h1 v-else class="de-title-text">{{ title }}</h1>
        <StatusBadge :status="deck?.status || 'draft'" />

        <span class="de-save">
          <span class="de-save-state" role="status" aria-live="polite">{{
            saveLabel
          }}</span>
          <button
            v-if="canRetry"
            type="button"
            class="de-link"
            @click="ed.retry()"
          >
            Retry
          </button>
          <button
            v-else-if="saveState === 'conflict' && !conflictOpen"
            type="button"
            class="de-link"
            @click="conflictOpen = true"
          >
            Resolve
          </button>
        </span>

        <span class="de-spacer" />

        <template v-if="wide">
          <Button
            variant="ghost"
            size="sm"
            :disabled="!canUndo"
            title="Undo (Ctrl/⌘ Z)"
            @click="ed.undo()"
            >Undo</Button
          >
          <Button
            variant="ghost"
            size="sm"
            :disabled="!canRedo"
            title="Redo (Shift Ctrl/⌘ Z)"
            @click="ed.redo()"
            >Redo</Button
          >
          <Button
            variant="outline"
            size="sm"
            class="de-problems"
            @click="problemsOpen = true"
          >
            Problems<span class="sr-only">: {{ problemsLabel }}</span>
            <span v-if="errorCount" class="de-count is-error" aria-hidden="true"
              ><IconError />{{ errorCount }}</span
            >
            <span
              v-if="warningCount"
              class="de-count is-warn"
              aria-hidden="true"
              ><IconWarn />{{ warningCount }}</span
            >
            <span
              v-if="!errorCount && !warningCount"
              class="de-count"
              aria-hidden="true"
              >0</span
            >
          </Button>
        </template>

        <template v-if="wide">
          <Button variant="outline" size="sm" @click="presentDraft"
            >Present draft</Button
          >
          <Button variant="outline" size="sm" @click="openShare">Share</Button>
          <!-- The title is on a wrapper: a disabled Button takes no pointer
               events, so a title on it would never show. -->
          <span class="de-publish" :title="publishBlocked || undefined">
            <Button
              variant="solid"
              size="sm"
              :disabled="!!publishBlocked"
              aria-describedby="de-publish-why"
              @click="askPublish"
              >{{ publishLabel }}</Button
            >
          </span>
          <span id="de-publish-why" class="sr-only">{{ publishBlocked }}</span>

          <div class="de-more">
            <Button
              ref="moreButton"
              variant="outline"
              size="sm"
              class="de-morebtn"
              aria-label="More deck actions"
              :aria-expanded="moreOpen ? 'true' : 'false'"
              aria-controls="de-more-menu"
              @click="toggleMore"
              >More</Button
            >
            <ul
              v-if="moreOpen"
              id="de-more-menu"
              ref="moreMenu"
              class="de-menu"
              @keydown="onMoreKeydown"
            >
              <li v-if="canDiscard">
                <button
                  type="button"
                  @click="moreAction(() => (discardAsk = true))"
                >
                  Discard unpublished changes
                </button>
              </li>
              <li>
                <button type="button" @click="moreAction(onRenumber)">
                  Renumber eyebrows
                </button>
              </li>
              <li>
                <button type="button" @click="moreAction(copyJson)">
                  Copy deck JSON
                </button>
              </li>
            </ul>
          </div>
        </template>
      </template>
    </header>

    <p
      v-if="ready && saveState === 'refused'"
      class="de-banner is-error"
      role="alert"
    >
      {{ saveError }}
      <button type="button" class="de-link" @click="ed.retry()">
        Try again
      </button>
    </p>
    <p
      v-else-if="ready && saveState === 'error' && saveError"
      class="de-banner"
      role="alert"
    >
      {{ saveError }} Your changes are kept on this page.
      <button type="button" class="de-link" @click="ed.retry()">Retry</button>
    </p>

    <main class="de-main">
      <!-- States before there is a deck to edit. -->
      <LoadingState v-if="status === 'loading'" message="Loading deck…" />
      <ErrorState
        v-else-if="status === 'not-found'"
        :title="`No deck called “${slug}”`"
        message="It may have been deleted, or the link has a typo."
      >
        <template #action>
          <router-link to="/dashboard?section=decks" class="de-back"
            >← Back to Decks</router-link
          >
        </template>
      </ErrorState>
      <ErrorState
        v-else-if="status === 'missing-table'"
        title="Decks need a database update"
        :show-retry="false"
      >
        <template #action>
          <p class="de-hint">
            Run <code>supabase db push</code> for
            <code>20261007010000_decks.sql</code>.
          </p>
        </template>
      </ErrorState>
      <ErrorState
        v-else-if="status === 'error'"
        title="The deck couldn't load"
        :message="loadError || 'Check your connection and try again.'"
        @retry="ed.load()"
      />

      <!-- Narrow screens: no editor. -->
      <div v-else-if="!wide" class="de-narrow">
        <h2>Open this on a laptop to edit decks</h2>
        <p>
          The editor needs a window at least {{ EDITOR_MIN_PX }} pixels wide.
          From here you can present the draft or share the published deck.
        </p>
        <div class="de-narrow-actions">
          <Button variant="solid" size="sm" @click="presentDraft"
            >Present draft</Button
          >
          <Button variant="outline" size="sm" @click="openShare">Share</Button>
          <router-link to="/dashboard?section=decks" class="de-back"
            >← Decks</router-link
          >
        </div>
      </div>

      <!-- The editor. -->
      <div v-else class="de-body">
        <div class="de-rail">
          <DeckSlideRail
            :entries="entries"
            :selected-id="selectedId"
            :problems-by-id="problemsById"
            @select="ed.select"
            @move="ed.move"
            @move-to="ed.moveTo"
            @duplicate="ed.duplicate"
            @remove="onRemove"
            @toggle-hidden="ed.toggleHidden"
            @add="openAdd"
          />
        </div>

        <section
          ref="previewPane"
          class="de-preview"
          aria-label="Slide preview"
          tabindex="-1"
        >
          <SlidePreview
            v-if="selected"
            :entry="selected"
            :debounce="100"
            :label="previewLabel"
            @overflow="onOverflow"
          />
          <div v-else class="de-empty">
            <p>No slides yet.</p>
            <Button variant="solid" size="sm" @click="openAdd(null)"
              >Add a slide</Button
            >
          </div>
        </section>

        <section class="de-form" aria-label="Slide settings and content">
          <DeckSlideForm
            v-if="selected"
            :entry="selected"
            :problems="selectedProblems"
            :position="selectedIndex + 1"
            :total="entries.length"
            :deck-id="deck?.id || ''"
            :taken-ids="takenIds"
            @update="ed.update"
            @change-layout="(layout) => ed.changeLayout(selectedId, layout)"
          />
        </section>
      </div>
    </main>

    <!-- Dialogs -->
    <AddSlideDialog :open="addOpen" @pick="onPick" @close="addOpen = false" />

    <DeckProblems
      :open="problemsOpen"
      :problems="problems"
      :entries="entries"
      @jump="onJump"
      @renumber="onRenumber"
      @close="problemsOpen = false"
    />

    <DeckShareDialog
      v-if="deck"
      :open="shareOpen"
      :deck="deck"
      :busy="shareBusy"
      :error="shareError"
      @close="shareOpen = false"
      @copy="showToast('Link copied.')"
      @copy-failed="
        showToast(
          'The clipboard isn\'t available here. The link is selected: copy it by hand.',
          { error: true }
        )
      "
      @rotate="onRotate"
      @unpublish="onUnpublish"
      @pin="onPin"
    />

    <ConfirmDialog
      v-model="publishAsk"
      :title="isPublished ? 'Publish these changes?' : 'Publish this deck?'"
      :confirm-label="publishLabel"
      variant="info"
      :loading="publishing"
      @confirm="confirmPublish"
    >
      Publish {{ plural(visibleCount, "slide") }}? Anyone with the share
      link<template v-if="deck?.pinned"> and {{ deckHome }}</template> will see
      this version. Later edits stay private until you publish again. Speaker
      notes are only shown to signed-in creators.
    </ConfirmDialog>

    <ConfirmDialog
      v-model="discardAsk"
      title="Discard unpublished changes?"
      confirm-label="Discard changes"
      variant="warn"
      :loading="discarding"
      @confirm="confirmDiscard"
    >
      The working copy goes back to the version funders see now. You can undo
      this from the message that follows.
    </ConfirmDialog>

    <BaseModal
      :model-value="conflictOpen"
      title="This deck changed elsewhere"
      size="sm"
      :close-on-backdrop="false"
      @close="conflictOpen = false"
    >
      <p ref="conflictText" class="de-dialog-text" tabindex="-1">
        This deck changed in another tab or by another creator at
        {{ conflictTime }}. Load theirs to drop your unsaved edits (Undo brings
        them back), or keep yours to save them over it.
      </p>
      <template #footer>
        <Button
          variant="outline"
          size="sm"
          :loading="resolving"
          @click="resolve('theirs')"
          >Load theirs</Button
        >
        <Button
          variant="solid"
          size="sm"
          :loading="resolving"
          @click="resolve('mine')"
          >Keep mine</Button
        >
      </template>
    </BaseModal>

    <!-- The toast: read out through a live region that is always there;
         its buttons stay reachable in the visible toast. -->
    <p class="sr-only" role="status" aria-live="polite">
      {{ toast?.message || "" }}
    </p>
    <div v-if="toast" class="de-toast" :class="{ 'is-error': toast.error }">
      <IconError v-if="toast.error" class="de-toast-icon" />
      <span aria-hidden="true">{{ toast.message }}</span>
      <button
        v-if="toast.action"
        type="button"
        class="de-toast-action"
        @click="runToastAction"
      >
        {{ toast.action.label }}
      </button>
      <button
        type="button"
        class="de-toast-close"
        aria-label="Dismiss"
        @click="toast = null"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<style scoped>
.de {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
}

/* ── header ─────────────────────────────────────────────────────────────── */
.de-top {
  position: relative;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px clamp(16px, 2vw, 24px);
  background: rgb(var(--color-paper));
  border-bottom: 1px solid rgb(var(--color-line));
}
.de-back {
  padding: 6px 10px;
  border-radius: var(--radius-control);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
  text-decoration: none;
  white-space: nowrap;
}
.de-back:hover,
.de-back:focus-visible {
  background: rgb(var(--color-line));
}
.de-title {
  flex: 0 1 22rem;
  min-width: 10rem;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  font-size: var(--ui-size-16);
  font-weight: 600;
}
.de-title:hover {
  border-color: rgb(var(--color-line));
}
.de-title:focus {
  outline: none;
  border-color: rgb(var(--color-ink));
  background: rgb(var(--color-bg));
}
.de-title-text {
  margin: 0;
  /* The global h1 rule adds 16px below, which knocks it off the header line. */
  padding: 0;
  min-width: 0;
  font-size: var(--ui-size-16);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.de-save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.de-save-state {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
  white-space: nowrap;
}
.de-spacer {
  flex: 1;
}
/* Small text: ink, not the accent, which is under 4.5:1 on paper for every
   accent in one theme or the other. The underline marks it as an action. */
.de-link {
  padding: 0;
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
  text-decoration: underline;
  text-decoration-color: rgb(var(--color-accent));
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
  cursor: pointer;
}
.de-publish {
  display: inline-flex;
}
.de-publish[title] {
  cursor: not-allowed;
}
.de-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 5px;
  border: 1px solid currentColor;
  border-radius: var(--radius-control);
  font-size: var(--ui-size-10);
  color: rgb(var(--color-mute));
}
.de-count :deep(svg) {
  width: 11px;
  height: 11px;
}
.de-count.is-error {
  color: rgb(var(--color-ink));
  border-color: rgb(var(--color-accent));
}
.de-count.is-error :deep(svg) {
  color: rgb(var(--color-accent));
}
.de-count.is-warn {
  color: rgb(var(--color-ink));
  border-color: rgb(var(--color-warn));
  background: rgb(var(--color-warn) / 0.16);
}
/* An outline Button fills with ink on hover: the counts take its paper
   colour rather than going ink on ink. */
.de-problems:hover .de-count,
.de-problems:hover .de-count :deep(svg) {
  color: inherit;
  border-color: currentColor;
  background: transparent;
}
.de-more {
  position: relative;
}
.de-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  display: grid;
  min-width: 240px;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper));
  box-shadow: 0 8px 24px rgb(var(--color-ink) / 0.12);
}
.de-menu button {
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: none;
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  text-align: left;
  cursor: pointer;
}
.de-menu button:hover {
  background: rgb(var(--color-ink) / 0.06);
}
.de-back:focus-visible,
.de-link:focus-visible,
.de-problems:focus-visible,
.de-morebtn:focus-visible,
.de-publish :deep(.btn:focus-visible),
.de-menu button:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
/* The toast is always ink: its ring is the toast's own text colour, which
   shows whatever the theme and accent. */
.de-toast button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.de-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 0;
  padding: 10px clamp(16px, 2vw, 24px);
  border-bottom: 1px solid rgb(var(--color-warn));
  background: rgb(var(--color-warn) / 0.16);
  font-size: var(--ui-size-14);
}
.de-banner.is-error {
  border-bottom-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.08);
}
.de-hint {
  margin: 0;
  font-size: var(--ui-size-14);
  color: rgb(var(--color-mute));
}
.de-hint code {
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}

/* ── body: rail · preview · form ───────────────────────────────────────── */
/* Every scrolling pane is also a containing block. The forms are full of
   .sr-only text and a .sr-only file input (position: absolute); with no
   positioned ancestor inside the pane they sit at their unscrolled place,
   stretch the page far below the editor, and a wheel past the end of the
   form, or focus on such an input, scrolled the whole editor off screen. */
.de-main,
.de-rail,
.de-preview,
.de-form {
  position: relative;
}
.de-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.de-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 420px;
  grid-template-areas: "rail preview form";
}
.de-rail {
  grid-area: rail;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 12px 24px;
  border-right: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper));
}
.de-preview {
  grid-area: preview;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 24px clamp(16px, 2vw, 32px);
}
.de-preview:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: -2px;
}
.de-form {
  grid-area: form;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 48px;
  border-left: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper));
}
.de-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 64px 16px;
  color: rgb(var(--color-mute));
  font-size: var(--ui-size-14);
}
.de-empty p {
  margin: 0;
}

/* 1024–1279px: the rail becomes a strip of thumbnails across the top. */
@media (max-width: 1279px) {
  .de-body {
    grid-template-columns: minmax(0, 1fr) 380px;
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      "rail rail"
      "preview form";
  }
  .de-rail {
    overflow: visible;
    padding: 12px 16px;
    border-right: 0;
    border-bottom: 1px solid rgb(var(--color-line));
  }
}

/* ── narrow screens ─────────────────────────────────────────────────────── */
.de-narrow {
  display: grid;
  gap: 12px;
  max-width: 32rem;
  margin: 0 auto;
  padding: 48px 16px;
}
.de-narrow h2 {
  margin: 0;
  font-size: var(--ui-size-20);
  line-height: 1.3;
}
.de-narrow p {
  margin: 0;
  font-size: var(--ui-size-15);
  line-height: 1.5;
  color: rgb(var(--color-mute));
}
.de-narrow-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.de-dialog-text {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--ui-size-15);
  line-height: 1.5;
}
/* Focused by the dialog, never by the creator: no ring, like
   [data-jump-target]:focus in index.css. */
.de-dialog-text:focus {
  outline: none;
}

/* ── toast ──────────────────────────────────────────────────────────────── */
.de-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(560px, calc(100vw - 32px));
  padding: 10px 12px 10px 16px;
  transform: translateX(-50%);
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  font-size: var(--ui-size-14);
  box-shadow: 0 8px 24px rgb(var(--color-ink) / 0.2);
}
/* An error keeps the ink toast (paper on ink reads at any accent) and is
   marked by an accent edge and an icon, not by colour alone. */
.de-toast.is-error {
  border-left: 4px solid rgb(var(--color-accent));
}
.de-toast-icon {
  flex: none;
  width: 16px;
  height: 16px;
  color: rgb(var(--color-accent));
}
.de-toast button {
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}
.de-toast-action {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.de-toast-close {
  font-size: var(--ui-size-18);
  line-height: 1;
}
</style>
