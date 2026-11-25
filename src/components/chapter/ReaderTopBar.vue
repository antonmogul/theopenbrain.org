<script setup>
/*
 * The reader's top bar (OPENBRAIN-78; Maura's sketch of 23 Nov, idea 3).
 *
 * A slim dark bar. Left: the book's mark, which opens the contents drawer
 * (NavDrawer) and is a ✕ while it is open, then the chapter search behind
 * its icon. Right: one word, TOOLS. Pointing at it, or reaching it with the
 * keyboard, opens a row to its left: Listen, then Info / Notebook / Chat
 * for a signed-in reader, then "?" (ReaderHelp). On touch TOOLS is a tap
 * toggle. The account moved into the drawer's foot.
 *
 * On the chapter's cover the bar is not shown (`hideOnCover`): it appears
 * once the reader has scrolled past COVER_REVEAL_Y, and at once when focus
 * enters it, so the keyboard reaches it from the cover too. It is hidden
 * with opacity alone: its box stays where it is, so nothing that measures
 * the bar moves.
 */
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useGeneral } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import { useMotionPreference } from "@/composables/useMotionPreference";
import BookLogo from "@/components/brand/BookLogo.vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";
import ReaderHelp from "./ReaderHelp.vue";
import ReaderSearch from "./ReaderSearch.vue";
import ReaderListen from "./ReaderListen.vue";

const props = defineProps({
  isAuthenticated: {
    type: Boolean,
    default: false,
  },
  /** An unpublished chapter: only creators can open it (OPENBRAIN-51). */
  isDraft: {
    type: Boolean,
    default: false,
  },
  /** The reader: no bar while the chapter's cover is at the top. */
  hideOnCover: {
    type: Boolean,
    default: false,
  },
});

// How far the page scrolls before the bar shows on a cover: one bar.
const COVER_REVEAL_Y = 48;
// The row stays this long after the pointer leaves, so a diagonal move
// from TOOLS to an item does not drop it.
const HOVER_LINGER_MS = 220;

const store = useGeneral();
const {
  open: openSidebar,
  isOpen: sidebarOpen,
  activeTab,
} = useReaderSidebar();

/* ── The cover ── */
// Known at setup, so a chapter opened at its cover never paints the bar.
const atCover = () =>
  props.hideOnCover &&
  (window.scrollY || window.pageYOffset || 0) < COVER_REVEAL_Y;
const onCover = ref(atCover());
let coverFrame = 0;
function measureCover() {
  coverFrame = 0;
  onCover.value = atCover();
}
function onScroll() {
  if (!coverFrame) coverFrame = requestAnimationFrame(measureCover);
}

/* ── Tools ── */
const TOOLS = [
  { key: "info", label: "Info" },
  { key: "notebook", label: "Notebook" },
  { key: "chat", label: "Chat" },
];
const toolsRef = ref(null);
const toolsButtonRef = ref(null);
const hovered = ref(false);
const focusInside = ref(false);
const pinned = ref(false);
// Escape, or a second press: closed until the pointer or focus leaves.
const dismissed = ref(false);
const listenOpen = ref(false);
let lastPointer = "mouse";
let lingerTimer = 0;

// The tab the floating panel is showing.
const activeTool = computed(() => (sidebarOpen.value ? activeTab.value : null));

/* ── Help: the "?" at the row's end (OPENBRAIN-189) ── */
const { noticePending } = useMotionPreference();
const showHelp = ref(false);
const helpButtonRef = ref(null);
const helpRef = ref(null);
const helpLabel = computed(() =>
  noticePending.value
    ? "Help and animations. Animations are off on this device."
    : "Help and animations"
);

const toolsOpen = computed(
  () =>
    showHelp.value ||
    listenOpen.value ||
    (!dismissed.value && (hovered.value || focusInside.value || pinned.value))
);
// The bar is shown on the cover while something of its own is open.
const held = computed(() => toolsOpen.value || store.activeMenu);

function onToolsEnter(event) {
  lastPointer = event.pointerType || "mouse";
  if (lastPointer !== "mouse") return;
  clearTimeout(lingerTimer);
  dismissed.value = false;
  hovered.value = true;
}
function onToolsLeave(event) {
  if ((event.pointerType || "mouse") !== "mouse") return;
  clearTimeout(lingerTimer);
  lingerTimer = setTimeout(() => {
    hovered.value = false;
    // A dismissal lasts until both the pointer and focus have left.
    if (!focusInside.value) dismissed.value = false;
  }, HOVER_LINGER_MS);
}
// Only focus the keyboard brought: a mouse press on TOOLS focuses it too,
// and the row must not stay open on that alone once the pointer has left.
function onToolsFocusIn(event) {
  let visible = true;
  try {
    visible = event.target.matches(":focus-visible");
  } catch {
    // No :focus-visible in this engine: treat focus as the keyboard's.
  }
  if (visible) focusInside.value = true;
}
function onToolsFocusOut(event) {
  if (toolsRef.value?.contains(event.relatedTarget)) return;
  focusInside.value = false;
  if (!hovered.value) dismissed.value = false;
}
/*
 * A press on TOOLS. Touch and keyboard: a plain toggle. A mouse is already
 * holding the row open by pointing, so its first press pins the row (it
 * stays when the pointer leaves) and its second closes it.
 */
function onToolsClick() {
  if (pinned.value) {
    pinned.value = false;
    dismissed.value = true;
  } else if (toolsOpen.value && lastPointer !== "mouse") {
    dismissed.value = true;
  } else if (toolsOpen.value && !hovered.value) {
    // Keyboard, on a row its own focus opened.
    dismissed.value = true;
  } else {
    dismissed.value = false;
    pinned.value = true;
  }
}
function onPointerDownAnywhere(event) {
  lastPointer = event.pointerType || "mouse";
  if (!pinned.value) return;
  if (toolsRef.value?.contains(event.target)) return;
  if (helpRef.value?.$el?.contains?.(event.target)) return;
  pinned.value = false;
}
function closeTools() {
  pinned.value = false;
  dismissed.value = true;
}
function onToolsKeydown(event) {
  if (event.key !== "Escape" || !toolsOpen.value) return;
  event.stopPropagation();
  closeTools();
  toolsButtonRef.value?.focus();
}

// Focus a control of the row, or TOOLS when the row has closed under it.
function focusInRow(el) {
  el?.focus?.();
  if (document.activeElement !== el) toolsButtonRef.value?.focus();
}

async function closeHelp({ restoreFocus = true } = {}) {
  if (!showHelp.value) return;
  showHelp.value = false;
  await nextTick();
  if (restoreFocus) focusInRow(helpButtonRef.value);
}

async function toggleHelp() {
  if (showHelp.value) return closeHelp();
  showHelp.value = true;
  await nextTick();
  // The panel itself, so a screen reader starts at its name.
  helpRef.value?.$el?.focus?.();
}

// Info / Notebook / Chat. Focus goes to TOOLS first: ReaderSidebar gives
// focus back, on close, to whatever had it, and TOOLS is always there,
// where the row's own buttons are not.
async function openTool(key) {
  await closeHelp({ restoreFocus: false });
  toolsButtonRef.value?.focus();
  openSidebar(key);
  pinned.value = false;
}

function onHelpKeydown(event) {
  if (event.key !== "Escape") return;
  event.stopPropagation();
  closeHelp();
}

// Tabbing out of the panel closes it; focus goes where the reader sent it.
function onHelpFocusOut(event) {
  const next = event.relatedTarget;
  if (!next || event.currentTarget.contains(next)) return;
  if (next === helpButtonRef.value) return;
  closeHelp({ restoreFocus: false });
}

onMounted(() => {
  measureCover();
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("pointerdown", onPointerDownAnywhere, true);
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  document.removeEventListener("pointerdown", onPointerDownAnywhere, true);
  cancelAnimationFrame(coverFrame);
  clearTimeout(lingerTimer);
});
</script>

<template>
  <div
    class="reader-top-bar"
    :class="{ 'is-cover': onCover, 'is-held': held }"
    :data-cover="onCover ? 'hidden' : undefined"
    data-testid="reader-top-bar"
  >
    <div class="bar-row">
      <!-- The book's mark opens the drawer: every chapter, this chapter's
           sections, the account. It is a ✕ while the drawer is open; the
           drawer's own close button sits exactly over it. -->
      <button
        type="button"
        class="reader-menu-btn"
        aria-label="Open chapter menu"
        aria-haspopup="dialog"
        :aria-expanded="store.activeMenu"
        title="Chapters and sections"
        data-testid="reader-menu-button"
        @click="store.activeMenu = true"
      >
        <CloseIcon v-if="store.activeMenu" :width="20" :height="20" />
        <BookLogo v-else mark class="menu-logo" />
      </button>

      <!-- Only creators can open a draft (useChapter gate + RLS), so this
           reminds them readers can't see it yet (OPENBRAIN-51). Below 400px
           it is an amber dot, its word kept for screen readers. -->
      <span
        v-if="isDraft"
        class="draft-badge"
        role="status"
        title="Draft · only creators can see this chapter"
        data-testid="draft-badge"
      >
        <span class="draft-badge-label">Draft</span
        ><span class="sr-only">, only creators can see this chapter</span>
      </span>

      <!-- Search this chapter (OPENBRAIN-197), behind its icon. -->
      <ReaderSearch @open="closeHelp({ restoreFocus: false })" />

      <div class="spacer"></div>

      <!-- TOOLS first in the document, so Tab reaches it and then walks the
           row it opened; on screen the row is to its left. -->
      <div
        ref="toolsRef"
        class="tools"
        :class="{ 'is-open': toolsOpen }"
        @pointerenter="onToolsEnter"
        @pointerleave="onToolsLeave"
        @focusin="onToolsFocusIn"
        @focusout="onToolsFocusOut"
        @keydown="onToolsKeydown"
      >
        <button
          ref="toolsButtonRef"
          type="button"
          class="tools-btn"
          :aria-expanded="toolsOpen"
          aria-controls="reader-tools"
          data-testid="reader-tools-button"
          @click="onToolsClick"
        >
          Tools
          <span
            v-if="noticePending"
            class="notice-dot"
            aria-hidden="true"
            data-testid="reader-tools-dot"
          ></span>
        </button>

        <div
          id="reader-tools"
          class="tools-row"
          role="group"
          aria-label="Reader tools"
          data-testid="reader-tools"
        >
          <ReaderListen
            class="tools-listen"
            @open="closeHelp({ restoreFocus: false })"
            @toggle="listenOpen = $event"
          />
          <template v-if="isAuthenticated">
            <button
              v-for="tool in TOOLS"
              :key="tool.key"
              type="button"
              class="tool-btn"
              :class="{ 'is-active': activeTool === tool.key }"
              aria-controls="reader-sidebar"
              :aria-current="activeTool === tool.key ? 'true' : undefined"
              :data-tool="tool.key"
              @click="openTool(tool.key)"
            >
              {{ tool.label }}
            </button>
          </template>
          <!-- Help: how the book reads and the animations setting. -->
          <button
            ref="helpButtonRef"
            type="button"
            class="tool-btn help-btn"
            :class="{ 'is-active': showHelp }"
            :aria-label="helpLabel"
            aria-haspopup="dialog"
            :aria-expanded="showHelp"
            aria-controls="reader-help"
            title="Help"
            data-testid="reader-help-button"
            @click="toggleHelp"
          >
            <span aria-hidden="true">?</span>
            <span
              v-if="noticePending"
              class="notice-dot"
              aria-hidden="true"
              data-testid="reader-help-dot"
            ></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Help panel -->
    <Transition name="dropdown">
      <ReaderHelp
        v-if="showHelp"
        ref="helpRef"
        class="help-panel"
        @close="closeHelp()"
        @keydown="onHelpKeydown"
        @focusout="onHelpFocusOut"
      />
    </Transition>

    <div
      v-if="showHelp"
      class="dropdown-backdrop"
      data-testid="reader-help-backdrop"
      @click="closeHelp()"
    ></div>
  </div>
</template>

<style scoped>
/* A slim dark bar: the chapter's dark surface (the opener's, the figure
   pane's), white ink. Its height is the token's, so --reader-topbar-h
   (brand.css) is true by construction and every jump and sticky offset
   that reads it lands under the bar. The --bar-* values are read by the
   search field inside it. */
.reader-top-bar {
  --bar-ink: 255 255 255;
  --bar-bg: var(--color-dark-surface);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 45;
  box-sizing: border-box;
  height: var(--reader-topbar-h, 3rem);
  background: rgb(var(--bar-bg));
  border-bottom: 1px solid rgb(var(--bar-ink) / 0.1);
  color: rgb(var(--bar-ink));
  transition: opacity 0.2s ease;
}

/* On the cover: not shown, and not in the pointer's way. Opacity only, so
   the bar keeps its box. Focus inside it (Tab from the top of the page)
   shows it, as does anything of its own that is open. */
.reader-top-bar.is-cover:not(.is-held):not(:focus-within) {
  opacity: 0;
  pointer-events: none;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 10px;
}

.reader-menu-btn {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.12s ease;
}

.menu-logo {
  --logo-h: 30px;
}

@media (hover: hover) {
  .reader-menu-btn:hover {
    background: rgb(var(--bar-ink) / 0.1);
  }
}

/* Draft: the warn amber, near-black text (the amber does not change with
   the theme). */
.draft-badge {
  flex-shrink: 0;
  margin: 0 6px;
  padding: 3px 7px;
  border-radius: var(--radius-control);
  background: rgb(var(--color-warn));
  color: rgb(10 10 10);
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

/* TOOLS, and the row it opens to its left (row-reverse: TOOLS is first in
   the document and last on screen). */
.tools {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  flex-shrink: 0;
}

.tools-btn,
.tool-btn,
.tools-row :deep(.listen-toggle) {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  padding: 0 0.875rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--bar-ink));
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  font-weight: 600;
  letter-spacing: 0.1em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.12s ease,
    background 0.12s ease;
}

.help-btn {
  justify-content: center;
  padding: 0;
}

/* Open: TOOLS in the interaction accent. */
.tools.is-open .tools-btn {
  color: rgb(var(--color-accent));
}

.tool-btn.is-active,
.tools-row :deep(.listen-toggle.is-playing),
.tools-row :deep(.listen-toggle[aria-expanded="true"]) {
  color: rgb(var(--color-accent));
}

@media (hover: hover) {
  .tool-btn:hover,
  .tools-row :deep(.listen-toggle:hover) {
    background: rgb(var(--bar-ink) / 0.1);
  }
}

/* The row. Closed, it keeps its place and is hidden with `visibility`, so
   its controls leave the tab order; ReaderListen's "Back to reading"
   button lives inside it and must outlast it. Nothing here is transformed
   or faded as a whole: either would capture that fixed button and the
   panels that hang from the bar. */
.tools-row {
  display: flex;
  align-items: center;
  visibility: hidden;
}

.tools.is-open .tools-row {
  visibility: visible;
}

.tools-row :deep(.listen-return) {
  visibility: visible;
}

.tools-row > .tool-btn,
.tools-row :deep(.listen-toggle) {
  opacity: 0;
  transition:
    opacity 0.15s ease,
    color 0.12s ease,
    background 0.12s ease;
}

.tools.is-open .tools-row > .tool-btn,
.tools.is-open .tools-row :deep(.listen-toggle) {
  opacity: 1;
}

/* ReaderListen hides its word below 640px for the old bar; here it is one
   of the row's words at every width. */
.tools-row :deep(.listen-word) {
  display: inline;
}

/* Something wants a look: animations are off on this device and the reader
   has not been asked (useMotionPreference). On TOOLS, and on the "?" it
   leads to. */
.notice-dot {
  position: absolute;
  top: 9px;
  right: 3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgb(var(--color-warn));
}

/* Help panel: under the bar's right end; ReaderHelp draws the panel. It
   scrolls inside itself on a short screen and stops above the timeline. */
.help-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 10px;
  z-index: 50;
  width: 23rem;
  max-width: calc(100vw - 20px);
  max-height: calc(100dvh - 100% - var(--reader-timeline-h, 0px) - 18px);
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 44;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.reader-menu-btn:focus-visible,
.tools-btn:focus-visible,
.tool-btn:focus-visible,
.tools-row :deep(.listen-toggle:focus-visible) {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: -3px;
}

/* A phone: the mark, the search icon and TOOLS on the bar; the row opens
   as a sheet under it, wrapping if it must. */
@media (max-width: 640px) {
  .bar-row {
    padding: 0 4px;
  }

  .tools-row {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
    padding: 2px 4px 6px;
    background: rgb(var(--bar-bg));
    border-bottom: 1px solid rgb(var(--bar-ink) / 0.1);
    box-shadow: 0 12px 24px rgb(0 0 0 / 0.25);
  }

  .tool-btn,
  .tools-row :deep(.listen-toggle) {
    padding: 0 0.625rem;
  }

  .help-panel {
    left: 8px;
    right: 8px;
    width: auto;
    max-width: none;
  }
}

/* Below 400px the Draft badge is an amber dot, its word hidden the
   .sr-only way so screen readers still hear "Draft" (OPENBRAIN-128). */
@media (max-width: 399px) {
  .draft-badge {
    width: 8px;
    height: 8px;
    padding: 0;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgb(10 10 10 / 0.5);
  }

  .draft-badge-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .reader-top-bar,
  :root:not([data-reduce-motion="0"]) .tools-row > .tool-btn,
  :root:not([data-reduce-motion="0"]) .tools-row :deep(.listen-toggle) {
    transition: none;
  }
}
</style>
