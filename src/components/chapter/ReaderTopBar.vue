<script setup>
import { ref, computed, nextTick } from "vue";
import { useGeneral } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import { useHomeRoute } from "@/composables/useHomeRoute";
import { useMotionPreference } from "@/composables/useMotionPreference";
import AccountMenu from "@/components/Navigation/AccountMenu.vue";
import BookLogo from "@/components/brand/BookLogo.vue";
import MenuEye from "@/components/brand/MenuEye.vue";
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
});

const store = useGeneral();
// Where the logo goes: /chapters when signed in, the home page otherwise.
const homeRoute = useHomeRoute();
const {
  open: openSidebar,
  isOpen: sidebarOpen,
  activeTab,
} = useReaderSidebar();

// The bar since 11 Nov (Stuart, OPENBRAIN-197): an eye for the menu, the
// book's logo, a search field where "Ch 1 · Where is my mind?" was, and one
// "?" for help and the reader's tools. The section menu that stood there is
// not lost: the eye opens the drawer, which lists every section of this
// chapter and marks the one being read, and the timeline along the bottom
// names it too.
const searchRef = ref(null);

// Help (OPENBRAIN-189): the "?" at the bar's right end, on every screen.
// It was a button on the chapter cover, which scrolled away with it
// (Stuart, 12 Nov: "it scrolls up and disappears"). It opens ReaderHelp
// under the bar. While the device asks for less motion and the reader has
// not been asked about it, the button carries a dot: the notice itself is
// on the cover, which a reader who lands mid-chapter never sees.
//
// For a signed-in reader it is also the way to Info, Notebook and Chat
// (OPENBRAIN-197; Stuart: "replace 'info', 'notebook', and 'chat' on the
// top right with a question mark, which all accomplishes the same thing").
const { noticePending } = useMotionPreference();
const showHelp = ref(false);
const helpButtonRef = ref(null);
const helpRef = ref(null);
const helpLabel = computed(() => {
  const what = props.isAuthenticated
    ? "Help, Info, Notebook and Chat"
    : "Help and animations";
  return noticePending.value
    ? `${what}. Animations are off on this device.`
    : what;
});
// The tool the floating panel is showing, for the help panel's list.
const activeTool = computed(() => (sidebarOpen.value ? activeTab.value : null));

async function closeHelp({ restoreFocus = true } = {}) {
  if (!showHelp.value) return;
  showHelp.value = false;
  await nextTick();
  if (restoreFocus) helpButtonRef.value?.focus();
}

async function toggleHelp() {
  if (showHelp.value) return closeHelp();
  showHelp.value = true;
  await nextTick();
  // The panel itself, so a screen reader starts at its name.
  helpRef.value?.$el?.focus?.();
}

// Info / Notebook / Chat: the help closes and focus goes back to the "?"
// first, so the panel that opens remembers the "?" as what to return to
// (ReaderSidebar gives focus back to whatever had it), not a button that
// is gone.
async function openTool(key) {
  await closeHelp();
  openSidebar(key);
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
</script>

<template>
  <div class="reader-top-bar" data-testid="reader-top-bar">
    <!-- Single app-bar row (prototype AppBar). Reading progress lives in the
         chapter timeline docked at the bottom (OPENBRAIN-128). -->
    <div class="bar-row">
      <!-- Menu: the eye opens the drawer (chapter list + this chapter's
           outline). It is the 2023 Retina chapter's open eye, and it
           closes while the drawer is open; the drawer's own close button
           is the closed eye in the same place (OPENBRAIN-197). -->
      <button
        type="button"
        class="reader-menu-btn"
        aria-label="Open chapter menu"
        aria-haspopup="dialog"
        :aria-expanded="store.activeMenu"
        title="Chapters and sections"
        @click="store.activeMenu = true"
      >
        <MenuEye :closed="store.activeMenu" />
      </button>
      <!-- The book's logo, a link home: /chapters when signed in
           (OPENBRAIN-145). Below 640px it is the book alone. -->
      <router-link
        :to="homeRoute"
        class="wordmark"
        aria-label="The Open Brain, home"
        title="The Open Brain"
      >
        <BookLogo class="wordmark-logo" />
      </router-link>

      <!-- Only creators can open a draft (useChapter gate + RLS), so this
           reminds them readers can't see it yet (OPENBRAIN-51). In the bar,
           where it collides with nothing: as a ribbon under the bar it hid
           TextComp's Edit chapter toggle and edit bar. Below 400px it is an
           amber dot, its word kept for screen readers, so the bar fits. -->
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

      <!-- Search this chapter (OPENBRAIN-197), where the chapter number
           and the section menu were. -->
      <ReaderSearch
        ref="searchRef"
        @open="closeHelp({ restoreFocus: false })"
      />

      <div class="spacer"></div>

      <ReaderListen @open="closeHelp({ restoreFocus: false })" />

      <!-- Help: how the book reads, the animations setting (OPENBRAIN-189)
           and, signed in, Info / Notebook / Chat (OPENBRAIN-197). Here, not
           on the cover, so it is always in reach; a 44px target around a
           32px key. -->
      <button
        ref="helpButtonRef"
        type="button"
        class="help-btn"
        :class="{ open: showHelp }"
        :aria-label="helpLabel"
        aria-haspopup="dialog"
        :aria-expanded="showHelp"
        aria-controls="reader-help"
        title="Help"
        data-testid="reader-help-button"
        @click="toggleHelp"
      >
        <span class="help-btn-key" aria-hidden="true">?</span>
        <span
          v-if="noticePending"
          class="help-btn-dot"
          aria-hidden="true"
          data-testid="reader-help-dot"
        ></span>
      </button>

      <!-- Account: back to the dashboard, settings, log out (OPENBRAIN-90) -->
      <AccountMenu />
    </div>

    <!-- Help panel -->
    <Transition name="dropdown">
      <ReaderHelp
        v-if="showHelp"
        ref="helpRef"
        class="help-panel"
        :tools="isAuthenticated"
        :active-tool="activeTool"
        @close="closeHelp()"
        @tool="openTool"
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
/* Reader app bar — prototype AppBar: single row, paper, bottom hairline:
   the menu eye, the logo, search, help, account (OPENBRAIN-197). The
   progress line that ran along its top edge is now the chapter timeline
   (OPENBRAIN-128). */
.reader-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  /* The bar sizes to its content; the token (brand.css) is tuned to match this
     rendered height so the figure pane / prose offsets stay aligned. Use a
     box that exactly fits: bar-row content + the 1px hairline. */
  z-index: 45;
  background: rgb(var(--color-paper));
  border-bottom: 1px solid rgb(var(--color-line));
  color: rgb(var(--color-ink));
}

/* Single bar row. 9px of padding took over the 2px progress track's share,
   so the bar still renders 63px tall (9 + 44 + 9 + the hairline) and
   --reader-topbar-h (4rem) still clears it. */
.bar-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 18px;
}

.reader-menu-btn {
  min-width: 44px;
  min-height: 44px;
  padding: 0 0.5rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.12s ease;
}

.reader-menu-btn:hover {
  border-color: rgb(var(--color-ink));
}

/* The logo, a link home (OPENBRAIN-145, 197). Its own 44px target, no
   frame, so it reads as a logo rather than a second menu button. The
   artwork is 40px tall in the 44px row: the book, then "the open brain
   .org" in the designers' own lettering. */
.wordmark {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.375rem;
  margin-left: -0.375rem;
  border-radius: var(--radius-control);
  text-decoration: none;
  color: rgb(var(--color-ink));
  flex-shrink: 0;
  transition: background 0.12s ease;
}

.wordmark:hover {
  background: rgb(var(--color-ink) / 0.05);
}

.wordmark-logo {
  --logo-h: 40px;
}

/* Draft: the warn amber the old bottom-left ribbon used, with near-black
   text in both themes (the amber does not change with the theme). */
.draft-badge {
  flex-shrink: 0;
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

/* Help: the "?" (OPENBRAIN-189). A 32px key in a 44px target, framed in
   the hairline like the menu button at the other end, so the account
   button beside it stays the one ink-framed control. */
.help-btn {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
}

.help-btn-key {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  line-height: 1;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

.help-btn:hover .help-btn-key {
  border-color: rgb(var(--color-ink));
}

.help-btn.open .help-btn-key {
  background: rgb(var(--color-ink));
  border-color: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

/* Something here wants a look: animations are off on this device and the
   reader has not been asked (useMotionPreference). Amber with a dark rim,
   as the draft dot: amber alone is ~2:1 on paper. */
.help-btn-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--color-warn));
  box-shadow:
    inset 0 0 0 1px rgb(10 10 10 / 0.5),
    0 0 0 2px rgb(var(--color-paper));
}

/* Help panel: under the bar's right end; ReaderHelp draws the panel. It
   scrolls inside itself on a short screen and stops above the timeline. */
.help-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 18px;
  z-index: 50;
  width: 23rem;
  max-width: calc(100vw - 36px);
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
.help-btn:focus-visible,
.wordmark:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .bar-row {
    gap: 8px;
    padding: 5px 8px;
  }
}

/* A phone: the book without the words, the search behind its button
   (ReaderSearch), and the row's free space before the search button so the
   three controls on the right sit together. */
@media (max-width: 640px) {
  .wordmark {
    padding: 0 0.125rem;
    margin-left: 0;
  }

  .wordmark-logo {
    --logo-crop: 1;
  }

  .spacer {
    order: -1;
  }

  .reader-menu-btn,
  .wordmark,
  .draft-badge {
    order: -2;
  }

  .help-panel {
    left: 8px;
    right: 8px;
    width: auto;
    max-width: none;
  }
}

/* At 320px the 47px Draft badge pushed the account menu off the bar
   (OPENBRAIN-128). Below 400px it is an amber dot, its word hidden the
   .sr-only way so screen readers still hear "Draft". */
@media (max-width: 399px) {
  .bar-row {
    gap: 6px;
  }

  .draft-badge {
    width: 8px;
    height: 8px;
    padding: 0;
    border-radius: 50%;
    /* A dark rim: amber alone is ~2:1 on light paper (3:1 for a graphic). */
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
</style>
