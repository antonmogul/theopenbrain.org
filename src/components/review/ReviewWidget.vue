<script setup>
/*
 * ReviewWidget — reviewers' notes on the chapter itself (OPENBRAIN-204).
 *
 * Anton, 18 Nov: while the book is in review, everyone sees it (no key);
 * notes and their status live in Supabase only; reviewers see the status
 * and the team's reply in "My notes"; and pointing is the most important
 * part: a note says exactly where it is.
 *
 * A round button above the timeline dock opens the panel (a bottom sheet
 * on a phone). A note's place comes, in this order of precision, from:
 *
 * - pointing (ReviewPointer): click or tap the thing itself, a figure in
 *   the pane, a plate on a box's track, a widget, a paragraph, a heading,
 *   the timeline;
 * - the reader's selection: the highlight toolbar's "Feedback" (ChapterView
 *   calls startFromSelection), or a selection made before opening;
 * - where the reader is: what is at the reading line when the panel opens.
 *
 * Each becomes an anchor record (helper/reviewAnchor.mjs) with its label.
 * Notes queue in this browser and go through the review RPC
 * (useReviewFeedback). Mounted by ChapterView only, so only on chapters.
 * Off with VITE_REVIEW_WIDGET=off, or per browser with ?review=off.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import animationJSON from "@/assets/json_backend/animations.json";
import { useAnimations } from "@/composables/useAnimations";
import {
  pageEnv,
  reviewWidgetEnabled,
  threadReviewNotes,
  useReviewFeedback,
} from "@/composables/useReviewFeedback";
import { goToAnchor } from "@/helper/reviewJump";
import ReviewAllNotes from "./ReviewAllNotes.vue";
import ReviewPins from "./ReviewPins.vue";
import { figureRecordFor } from "@/helper/historyFigureTiming";
import { jumpToId } from "@/helper/readerJump";
import {
  anchorFor,
  anchorHash,
  pageState,
  targetAt,
} from "@/helper/reviewAnchor.mjs";
import ReviewForm from "./ReviewForm.vue";
import ReviewIdentity from "./ReviewIdentity.vue";
import ReviewMyNotes from "./ReviewMyNotes.vue";
import ReviewPointer from "./ReviewPointer.vue";
import "./review.css";

const props = defineProps({
  /** The chapter's slug (the note's chapter_slug). */
  chapterSlug: { type: String, required: true },
  /** Show it whatever the kill switch says (stories). */
  force: { type: Boolean, default: false },
  /** Open on mount (stories). */
  startOpen: { type: Boolean, default: false },
  /** The figure records (stories, tests); the reader fetches its own. */
  figureRecords: { type: Array, default: null },
});

const enabled =
  props.force ||
  reviewWidgetEnabled({
    env: import.meta.env.VITE_REVIEW_WIDGET,
    search: globalThis.location?.search || "",
    storage: (() => {
      try {
        return globalThis.localStorage;
      } catch {
        return null;
      }
    })(),
  });

const review = useReviewFeedback();
const { identity, queue, pendingCount, awaitingCheckCount } = review;

const open = ref(false);
const tab = ref("new");
const pointing = ref(false);
const checking = ref(false);
const changingIdentity = ref(false);

const anchor = ref(null);
const type = ref("note");
const typeTouched = ref(false);
const note = ref("");
const quote = ref("");
const suggested = ref("");
const status = ref("");
const problems = ref([]);
const panel = ref(null);

/* Figure records, for numbers and titles (the pane's own source). */
const { animations, fetchAnimations } = useAnimations();
const records = computed(
  () =>
    props.figureRecords ||
    (animations.value?.length ? animations.value : animationJSON.animations)
);
const recordFor = (key) => figureRecordFor(key, records.value) || null;

/* ── The selection ──────────────────────────────────────────────────── */

/** The last selection inside one paragraph: { text, paragraph, at }. */
let lastSelection = null;
const SELECTION_FRESH_MS = 120000;

function paragraphOf(node) {
  const el = node?.nodeType === 1 ? node : node?.parentElement;
  return el?.closest?.("[data-paragraph-id]") || null;
}

function readSelection() {
  const sel = globalThis.getSelection?.();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const range = sel.getRangeAt(0);
  const paragraph = paragraphOf(range.startContainer);
  if (!paragraph || paragraph !== paragraphOf(range.endContainer)) return null;
  if (paragraph.closest("[data-review-ui]")) return null;
  return { text, paragraph, at: Date.now() };
}

function onSelectionChange() {
  const s = readSelection();
  if (s) lastSelection = s;
}

function selectionAnchor({ paragraph }) {
  const a = anchorFor(
    { el: paragraph, kind: "paragraph" },
    {},
    { recordFor, page: pageState() }
  );
  return a ? { ...a, via: "selection", point: undefined } : null;
}

/* ── Where the reader is ────────────────────────────────────────────── */

function readingAnchor() {
  const text = document.querySelector("main#text, #text");
  const r = text?.getBoundingClientRect();
  const x = r && r.width ? r.left + r.width / 2 : innerWidth / 2;
  const y = Math.round(innerHeight * 0.4);
  const t = targetAt(x, y);
  if (!t || t.kind === "chrome") return null;
  const a = anchorFor(
    t,
    { clientX: x, clientY: y },
    { recordFor, page: pageState() }
  );
  return a ? { ...a, via: "reading" } : null;
}

const KIND_TYPE = {
  "figure-pane": "figure",
  "rail-figure": "figure",
  widget: "widget",
  chrome: "design",
};

function setAnchor(a) {
  anchor.value = a;
  if (!a || typeTouched.value) return;
  if (a.via === "selection") type.value = "content";
  else if (KIND_TYPE[a.kind]) type.value = KIND_TYPE[a.kind];
  else if (a.kind === "element" && a.figureKey) type.value = "figure";
}

/* ── Open, point, send ─────────────────────────────────────────────── */

function openPanel() {
  open.value = true;
  void review.refreshStatuses();
  status.value = "";
  problems.value = [];
  if (!anchor.value) {
    const now = readSelection();
    const recent =
      lastSelection && Date.now() - lastSelection.at < SELECTION_FRESH_MS
        ? lastSelection
        : null;
    const s = now || recent;
    if (s?.paragraph?.isConnected) {
      setAnchor(selectionAnchor(s));
      if (!quote.value) quote.value = s.text.slice(0, 2000);
    } else {
      setAnchor(readingAnchor());
    }
  }
  if (pendingCount.value) void review.sync();
  nextTick(() => panel.value?.querySelector("textarea, input")?.focus?.());
}

function close() {
  open.value = false;
}

function toggle() {
  if (open.value) close();
  else openPanel();
}

/** The highlight toolbar's "Feedback": the selected words, in place. */
function startFromSelection({ text, paragraphId, paragraphElement } = {}) {
  const paragraph =
    paragraphElement ||
    (paragraphId &&
      document.querySelector(
        `[data-paragraph-id="${CSS.escape(paragraphId)}"]`
      ));
  if (!paragraph) return;
  setAnchor(selectionAnchor({ text, paragraph }));
  quote.value = String(text || "").slice(0, 2000);
  if (!typeTouched.value) type.value = "content";
  tab.value = "new";
  openPanel();
}

function startPointing() {
  pointing.value = true;
}

function onPick(a) {
  pointing.value = false;
  setAnchor(a);
  tab.value = "new";
  open.value = true;
}

function onPointCancel() {
  pointing.value = false;
  open.value = true;
}

function onType(v) {
  type.value = v;
  typeTouched.value = true;
}

function send() {
  problems.value = [];
  const rec = review.submit(
    {
      type: type.value,
      note: note.value,
      quote: quote.value,
      suggestedText: suggested.value,
      anchor: anchor.value,
      chapterSlug: props.chapterSlug,
      hash: anchorHash(anchor.value) || "",
    },
    pageEnv()
  );
  if (rec.problems) {
    problems.value = rec.problems;
    return;
  }
  status.value = "Saved. Sending…";
  note.value = "";
  quote.value = "";
  suggested.value = "";
  anchor.value = null;
  typeTouched.value = false;
  type.value = "note";
  review.sync().then(() => {
    const now = queue.value.find((r) => r.clientId === rec.clientId);
    status.value =
      now?.state === "sent"
        ? "Sent. Thank you."
        : now?.state === "rejected"
          ? now.error
          : "Saved in this browser. It will send when it can.";
  });
}

async function showMyNotes() {
  tab.value = "mine";
  checking.value = true;
  try {
    await review.sync();
    await review.refreshStatuses();
  } finally {
    checking.value = false;
  }
}

/* ── Everyone's notes ──────────────────────────────────────────────── */

const pins = ref(false);
const showChecked = ref(false);
const ownIds = computed(() =>
  queue.value.filter((n) => n.state === "sent" && n.clientId).map((n) => n.id)
);
const focusId = ref("");
const groups = computed(() => {
  const order = sectionOrder();
  return threadReviewNotes(review.chapterNotes.value, (k) => order.get(k));
});
/** Note id → its number, in the list's order (the pins use them). */
const numbers = computed(() => {
  const out = {};
  let n = 0;
  for (const g of groups.value) for (const note of g.notes) out[note.id] = ++n;
  return out;
});
const pinItems = computed(() =>
  groups.value.flatMap((g) =>
    g.notes.map((note) => ({
      id: note.id,
      n: numbers.value[note.id],
      anchor: note.anchor,
      label: note.anchor?.label || "",
      status: note.status,
    }))
  )
);

/** The page's sections and boxes, in reading order: key → index. */
function sectionOrder() {
  const map = new Map();
  let i = 0;
  for (const el of document.querySelectorAll(
    "section.reader-section[data-section-slug], aside.bx[data-section-slug]"
  ))
    map.set(el.getAttribute("data-section-slug"), i++);
  return map;
}

function sectionTitle(key) {
  const el = document.querySelector(
    `section.reader-section[data-section-slug="${CSS.escape(key)}"] > h2.T, aside.bx[data-section-slug="${CSS.escape(key)}"] .bx-title`
  );
  return el?.textContent?.trim() || key;
}

async function showAllNotes() {
  tab.value = "all";
  // A GET, and only now: never on page load.
  await review.fetchChapterNotes(props.chapterSlug);
}

function replyTo({ parent, text }) {
  const rec = review.submit(
    {
      type: "note",
      note: text,
      // A reply is about its note's place.
      anchor: parent.anchor || {},
      chapterSlug: props.chapterSlug,
      hash: anchorHash(parent.anchor) || "",
      parentId: parent.id,
    },
    pageEnv()
  );
  if (rec.problems) return;
  review.sync().then(() => review.fetchChapterNotes(props.chapterSlug));
}

function showAnchor(a) {
  goToAnchor(a);
  if (matchMedia("(max-width: 639px)").matches) close();
}

function openPin(id) {
  focusId.value = id;
  open.value = true;
  tab.value = "all";
  nextTick(() =>
    panel.value
      ?.querySelector(`[data-note-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView?.({ block: "nearest" })
  );
}

function showNote(n) {
  const a = n.payload?.anchor;
  if (n.chapterSlug === props.chapterSlug && (a?.kind || n.hash)) {
    if (a?.kind) showAnchor(a);
    else jumpToId(n.hash, { flash: true });
    return;
  }
  try {
    const url = new URL(n.payload?.url || "", location.href);
    url.hash = n.hash || "";
    location.assign(url.toString());
  } catch {
    // no stored URL: nothing to show
  }
}

function saveIdentity(rec) {
  review.setIdentity(rec);
  changingIdentity.value = false;
}

function onKey(e) {
  if (e.key === "Escape" && open.value && !pointing.value) close();
}

onMounted(() => {
  if (!enabled) return;
  document.addEventListener("selectionchange", onSelectionChange);
  document.addEventListener("keydown", onKey);
  if (!props.figureRecords) void fetchAnimations();
  // Loading may read sent-note status once; no write is sent without a user action.
  if (props.startOpen) openPanel();
  else void review.refreshStatuses();
});

onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", onSelectionChange);
  document.removeEventListener("keydown", onKey);
});

defineExpose({ startFromSelection, open: openPanel, close });
</script>

<template>
  <template v-if="enabled">
    <button
      v-show="!pointing"
      type="button"
      class="rv-fab"
      :class="{ 'is-open': open }"
      data-review-ui
      data-testid="review-fab"
      :aria-expanded="open"
      aria-controls="review-panel"
      @click="toggle"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 4h14v9H8l-4 3.5V13H3z" />
        <path d="M7 8h6" stroke-linecap="round" />
      </svg>
      <span class="rv-fab-label">Feedback</span>
      <span
        v-if="awaitingCheckCount"
        class="rv-fab-badge rv-fab-badge--check"
        :aria-label="`${awaitingCheckCount} notes fixed, waiting for your check`"
        data-testid="review-check-badge"
        >◇ {{ awaitingCheckCount }}</span
      >
      <span
        v-if="pendingCount"
        class="rv-fab-badge"
        aria-label="notes waiting to send"
      >
        {{ pendingCount }}
      </span>
    </button>

    <div
      v-if="open && !pointing"
      id="review-panel"
      ref="panel"
      class="rv-panel"
      role="dialog"
      aria-label="Review notes"
      data-review-ui
      data-testid="review-panel"
    >
      <header class="rv-panel-head">
        <div class="rv-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="rv-tab"
            :aria-selected="tab === 'new'"
            @click="tab = 'new'"
          >
            New note
          </button>
          <button
            type="button"
            role="tab"
            class="rv-tab"
            :aria-selected="tab === 'mine'"
            data-testid="review-tab-mine"
            @click="showMyNotes"
          >
            My notes
          </button>
          <button
            type="button"
            role="tab"
            class="rv-tab"
            :aria-selected="tab === 'all'"
            data-testid="review-tab-all"
            @click="showAllNotes"
          >
            All notes
          </button>
        </div>
        <button
          type="button"
          class="rv-close"
          aria-label="Close"
          @click="close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              stroke-width="1.6"
            />
          </svg>
        </button>
      </header>
      <div class="rv-panel-body">
        <ReviewIdentity
          v-if="!identity || changingIdentity"
          :initial="identity"
          @save="saveIdentity"
        />
        <ReviewForm
          v-else-if="tab === 'new'"
          :anchor="anchor"
          :identity="identity"
          :status="status"
          :problems="problems"
          :type="type"
          v-model:note="note"
          v-model:quote="quote"
          v-model:suggested="suggested"
          @update:type="onType"
          @point="startPointing"
          @clear-place="anchor = null"
          @submit="send"
          @change-identity="changingIdentity = true"
        />
        <ReviewMyNotes
          v-else-if="tab === 'mine'"
          :notes="queue"
          :checking="checking"
          :author-action="review.authorAction"
          @refresh="showMyNotes"
          @discard="(n) => review.discard(n.clientId)"
          @retry="() => review.sync()"
          @show="showNote"
        />
        <ReviewAllNotes
          v-else
          v-model:pins="pins"
          v-model:show-checked="showChecked"
          :own-ids="ownIds"
          :author-action="review.authorAction"
          :groups="groups"
          :section-title="sectionTitle"
          :loading="review.listing.value"
          :error="review.listError.value"
          :numbers="numbers"
          :focus-id="focusId"
          @refresh="showAllNotes"
          @show="(n) => showAnchor(n.anchor)"
          @reply="replyTo"
        />
      </div>
    </div>

    <ReviewPins
      v-if="pins && !pointing"
      :items="pinItems"
      :show-checked="showChecked"
      @open="openPin"
    />

    <ReviewPointer
      v-if="pointing"
      :record-for="recordFor"
      @pick="onPick"
      @cancel="onPointCancel"
    />
  </template>
</template>

<style scoped>
.rv-fab {
  position: fixed;
  right: 16px;
  bottom: calc(var(--reader-timeline-h, 0px) + 16px);
  z-index: 9000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px 0 14px;
  border: 0;
  border-radius: 999px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  font-weight: 600;
  box-shadow: 0 4px 18px rgb(0 0 0 / 0.22);
  cursor: pointer;
}

.rv-fab.is-open,
.rv-fab:hover {
  background: rgb(var(--color-accent));
  color: #fff;
}

.rv-fab:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 3px;
}

.rv-fab-badge {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgb(var(--color-warn));
  color: #111;
  font-size: var(--ui-size-11);
  text-align: center;
}

.rv-fab-badge--check {
  background: rgb(var(--color-complete));
  color: #111;
}

.rv-panel {
  position: fixed;
  right: 16px;
  bottom: calc(var(--reader-timeline-h, 0px) + 72px);
  z-index: 9000;
  display: flex;
  flex-direction: column;
  width: 380px;
  max-height: calc(100dvh - var(--reader-topbar-h, 4rem) - 110px);
  border: 1px solid rgb(var(--color-line));
  border-radius: 12px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.25);
}

.rv-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 0 12px;
  border-bottom: 1px solid rgb(var(--color-line));
}

.rv-tabs {
  display: flex;
  gap: 4px;
}

.rv-tab {
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: rgb(var(--color-mute));
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  cursor: pointer;
}

.rv-tab[aria-selected="true"] {
  border-bottom-color: rgb(var(--color-accent));
  color: rgb(var(--color-ink));
  font-weight: 600;
}

.rv-close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: rgb(var(--color-ink));
  cursor: pointer;
}

.rv-tab:focus-visible,
.rv-close:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: -3px;
}

.rv-panel-body {
  overflow: auto;
  padding: 12px;
  overscroll-behavior: contain;
}

/* A phone: a bottom sheet over the dock; the button shrinks to its icon. */
@media (max-width: 639px) {
  .rv-fab {
    right: 12px;
    width: 44px;
    padding: 0;
    justify-content: center;
  }

  .rv-fab-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .rv-fab-badge {
    position: absolute;
    top: -4px;
    right: -4px;
  }

  .rv-fab-badge--check + .rv-fab-badge {
    right: auto;
    left: -4px;
  }

  .rv-panel {
    right: 0;
    bottom: 0;
    left: 0;
    width: auto;
    max-height: 85dvh;
    border-radius: 14px 14px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}
</style>
