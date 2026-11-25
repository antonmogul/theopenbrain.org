<script setup>
/*
 * The contents drawer (OPENBRAIN-78; Maura's sketch of 23 Nov, idea 3).
 *
 * The book's mark in the reader's top bar opens it, from the left, on the
 * chapter's dark surface: "See full table of contents" and a home icon,
 * the book's numbered chapters with the one being read opened to its
 * sections (the section being read marked in the chapter's colour), and
 * the reader's account at the foot, or Sign in. Its close button is a ✕
 * exactly over the mark that opened it. The page dims behind it.
 *
 * The chapter being read has a chevron beside its row that folds its
 * sections away, leaving the list of chapters (OPENBRAIN-81). The drawer
 * always opens with them showing, and the row stays at the top of the list
 * while its sections scroll under it, so the chevron is always in reach.
 *
 * "See full table of contents" shows the chapter library (ChaptersLibrary,
 * what /chapters shows) in the space to the drawer's right, inside the
 * same overlay; below LIBRARY_MIN_W there is no such space and the link
 * goes to /chapters.
 *
 * Open state is useGeneral.activeMenu, as before. It must not move the
 * page under it: no filter on the page, lockReaderScroll (OPENBRAIN-145).
 */
import {
  ref,
  computed,
  defineAsyncComponent,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGeneral, useText } from "@/stores";
import { buildOutline } from "@/composables/useChapterOutline";
import { lockReaderScroll } from "@/helper/readerScrollLock";
import { findReaderAnchor, jumpToElement } from "@/helper/readerJump";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";
import { toSlug } from "@/helper/general";
import { dashboardForRole } from "@/router/guards";
import { authedRequest } from "@/services/api/client";
import AuthForm from "@/components/Navigation/AuthForm.vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { useHomeRoute } from "@/composables/useHomeRoute";

// Its own chunk: the library and the contents it draws load on first use.
const ChaptersLibrary = defineAsyncComponent(
  () => import("@/components/book/ChaptersLibrary.vue")
);

// The library needs room beside the 320px drawer.
const LIBRARY_MIN_W = 768;

const router = useRouter();
const route = useRoute();
const textStore = useText();
const store = useGeneral();
const authStore = useAuthStore();
const { user, profile, isAuthenticated, isCreator, userRole, signOut } =
  useAuth();
const { modules, fetchCatalog } = useChapterCatalog();
const homeRoute = useHomeRoute();

/*
 * The chapters: the published catalog, and for a creator the drafts too,
 * greyed and marked (RLS shows drafts to creators only). Nothing is listed
 * that the database does not hold.
 */
const drafts = ref([]);
let draftsAsked = false;
async function loadDrafts() {
  if (draftsAsked || !isCreator?.value) return;
  draftsAsked = true;
  try {
    const rows = await authedRequest(
      "modules?status=eq.draft&select=*&order=order_index.asc"
    );
    drafts.value = (rows || []).map((d) => ({ ...d, isDraft: true }));
  } catch (err) {
    draftsAsked = false;
    console.warn("NavDrawer: draft fetch failed", err);
  }
}
const chapters = computed(() =>
  [...modules.value, ...drafts.value].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  )
);

const displayName = computed(
  () => profile.value?.full_name || user.value?.email || "Reader"
);
const initials = computed(() => {
  const n = profile.value?.full_name?.trim() || user.value?.email || "?";
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
});
const dashboard = computed(() => dashboardForRole(userRole?.value));

const currentSlug = computed(() =>
  route.name === "chapter" ? route.params.slug : null
);
const outline = computed(() => {
  if (!currentSlug.value) return [];
  if (textStore.text?.slug && textStore.text.slug !== currentSlug.value)
    return [];
  return buildOutline(textStore.text);
});
// Where the reader is, marked in the outline. store.currentSubChapter is
// the slug of the section title TextComp's trigger last crossed.
const isReading = (section) =>
  !!store.currentSubChapter &&
  store.currentSubChapter === toSlug(section.title || "");

// The current chapter's sections fold away behind its chevron, so the
// reader can look across the chapters (OPENBRAIN-81). Open again every time
// the drawer opens, and for a new chapter.
const OUTLINE_ID = "drawer-chapter-outline";
const outlineOpen = ref(true);
watch(currentSlug, () => {
  outlineOpen.value = true;
});

const overlayRef = ref(null);
const closeButtonRef = ref(null);
const contentsLinkRef = ref(null);
const libraryCloseRef = ref(null);
const libraryOpen = ref(false);
let opener = null;
let releaseScroll = null;
let restoreOnClose = true;
let unmounted = false;
let focusEpoch = 0;

function close({ restoreFocus = true } = {}) {
  restoreOnClose = restoreFocus;
  store.activeMenu = false;
}
function go(path) {
  close({ restoreFocus: false });
  router.push(path);
}
// Through readerJump like every jump in the reader (OPENBRAIN-145): the
// section lands below the top bar, past a figure transition's spacer, no
// smooth scroll under reduced motion, focus moved to it (focusElement).
// The drawer closes first so its scroll lock is off when the jump scrolls.
async function jumpTo(anchor) {
  const target = findReaderAnchor(anchor.slice(1));
  if (!target) return;
  close({ restoreFocus: false });
  await nextTick();
  if (unmounted || !target.isConnected) return;
  jumpToElement(target, { align: "top", focus: true, focusVisible: false });
}
function goChapter(chapter) {
  if (chapter.slug === currentSlug.value) jumpTo("#chapter-toc");
  else go(`/chapter/${chapter.order_index}/${chapter.slug}`);
}

/* ── "See full table of contents" ── */
const roomForLibrary = () =>
  typeof window !== "undefined" && window.innerWidth >= LIBRARY_MIN_W;
async function onContentsLink() {
  if (!roomForLibrary()) return go("/chapters");
  if (libraryOpen.value) return closeLibrary();
  libraryOpen.value = true;
  await nextTick();
  libraryCloseRef.value?.focus({ preventScroll: true });
}
async function closeLibrary() {
  if (!libraryOpen.value) return;
  libraryOpen.value = false;
  await nextTick();
  contentsLinkRef.value?.focus({ preventScroll: true });
}
// A link inside the library: the route change closes the drawer, but a
// link to the page already open changes nothing, so close here.
function onLibraryClick(event) {
  if (event.target?.closest?.("a[href]")) close({ restoreFocus: false });
}
// The window narrowed under an open library: nowhere to show it.
function onResize() {
  if (libraryOpen.value && !roomForLibrary()) libraryOpen.value = false;
}

watch(
  () => store.activeMenu,
  async (open) => {
    if (unmounted) return;
    const epoch = ++focusEpoch;
    if (open) {
      outlineOpen.value = true;
      opener = document.activeElement;
      restoreOnClose = true;
      releaseScroll ||= lockReaderScroll();
      loadDrafts();
      await nextTick();
      if (!unmounted && store.activeMenu && epoch === focusEpoch)
        closeButtonRef.value?.focus({ preventScroll: true });
    } else {
      libraryOpen.value = false;
      releaseScroll?.();
      releaseScroll = null;
      const target = opener;
      opener = null;
      if (restoreOnClose && target?.isConnected)
        target.focus({ preventScroll: true });
    }
  },
  { immediate: true }
);
watch(
  () => route.fullPath,
  () => close({ restoreFocus: false })
);

// In-drawer auth: the form, its validation and the auth calls live in the
// shared AuthForm; the drawer owns the tabs and what happens after login.
const showAuth = ref(false);

function openSignIn() {
  showAuth.value = true;
  authStore.setView("login");
  authStore.setError(null);
}

function onAuthLogin() {
  authStore.setError(null);
  close();
}

async function logOut() {
  close({ restoreFocus: false });
  // signOut clears the local session even when the server call fails
  // (offline), so the reader is signed out either way: leave, and only log
  // the failure (as AccountMenu does).
  const { error: err } = (await signOut()) || {};
  if (err) console.warn("[nav drawer] server sign-out failed", err);
  router.push("/");
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select, [tabindex="0"]';
function onKey(e) {
  if (!store.activeMenu || e.defaultPrevented) return;
  if (e.key === "Escape") {
    e.preventDefault();
    // The library first, then the drawer.
    if (libraryOpen.value) closeLibrary();
    else close();
    return;
  }
  // Tab stays inside the overlay: the drawer, and the library beside it.
  if (e.key !== "Tab" || !overlayRef.value) return;
  const stops = [...overlayRef.value.querySelectorAll(FOCUSABLE)];
  const first = stops[0];
  const last = stops[stops.length - 1];
  const inside = overlayRef.value.contains(document.activeElement);
  if (e.shiftKey && (!inside || document.activeElement === first)) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
    e.preventDefault();
    first?.focus();
  }
}

onMounted(() => {
  fetchCatalog();
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
});
onBeforeUnmount(() => {
  unmounted = true;
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", onResize);
  releaseScroll?.();
  releaseScroll = null;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="store.activeMenu"
        ref="overlayRef"
        class="nav-backdrop"
        :class="{ 'has-library': libraryOpen }"
        @click.self="close()"
      >
        <aside
          class="drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <!-- The ✕ sits exactly over the top bar's mark, so the button the
               reader pressed is the one that closes the drawer. -->
          <div class="drawer-head">
            <button
              ref="closeButtonRef"
              class="close-btn"
              type="button"
              aria-label="Close chapter menu"
              title="Close"
              @click="close()"
            >
              <CloseIcon :width="20" :height="20" />
            </button>
          </div>

          <div class="drawer-top">
            <a
              ref="contentsLinkRef"
              href="/chapters"
              class="contents-link"
              :class="{ 'is-open': libraryOpen }"
              data-testid="drawer-contents-link"
              @click.prevent="onContentsLink"
            >
              See full table of contents
            </a>
            <router-link
              :to="homeRoute"
              class="home-link"
              aria-label="Home"
              title="Home"
              @click="close({ restoreFocus: false })"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3.5 11 12 4l8.5 7" />
                <path d="M5.5 9.5V20h4.75v-5.5h3.5V20h4.75V9.5" />
              </svg>
            </router-link>
          </div>

          <nav class="chapter-list" aria-label="Chapters">
            <div
              v-for="ch in chapters"
              :key="ch.id"
              class="chapter"
              :class="{
                'is-current': ch.slug === currentSlug,
                'is-draft': ch.isDraft,
                'is-folded': ch.slug === currentSlug && !outlineOpen,
              }"
            >
              <div class="chapter-head">
                <button
                  class="chapter-row"
                  type="button"
                  :aria-current="ch.slug === currentSlug ? 'page' : undefined"
                  @click="goChapter(ch)"
                >
                  <span class="ch-num">{{ ch.order_index }}</span
                  >{{ " " }}
                  <span class="ch-title">{{ ch.title }}</span>
                  <span v-if="ch.isDraft" class="ch-draft">Draft</span>
                </button>
                <!-- The chapter being read: its sections fold away. The
                     name stays the same and aria-expanded says the state. -->
                <button
                  v-if="ch.slug === currentSlug && outline.length"
                  type="button"
                  class="outline-toggle"
                  data-testid="drawer-outline-toggle"
                  :aria-expanded="outlineOpen"
                  :aria-controls="OUTLINE_ID"
                  :aria-label="`${ch.title} sections`"
                  :title="outlineOpen ? 'Hide sections' : 'Show sections'"
                  @click="outlineOpen = !outlineOpen"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
              <nav
                v-if="ch.slug === currentSlug && outline.length"
                v-show="outlineOpen"
                :id="OUTLINE_ID"
                class="chapter-outline"
                :aria-label="`${ch.title} contents`"
              >
                <div v-for="section in outline" :key="section.id">
                  <button
                    type="button"
                    class="outline-section"
                    :aria-current="isReading(section) ? 'location' : undefined"
                    @click="jumpTo(section.anchor)"
                  >
                    <span class="outline-label">{{ section.label }}</span
                    >{{ section.title }}
                  </button>
                  <button
                    v-for="sub in section.subsections"
                    :key="sub.id"
                    type="button"
                    class="outline-subsection"
                    @click="jumpTo(sub.anchor)"
                  >
                    {{ sub.title }}
                  </button>
                </div>
              </nav>
            </div>
          </nav>

          <!-- The account, which was a button in the top bar. -->
          <div class="drawer-foot">
            <div v-if="isAuthenticated" class="user-footer">
              <span class="avatar" aria-hidden="true">{{ initials }}</span>
              <div class="user-meta">
                <div class="user-name">{{ displayName }}</div>
                <div
                  v-if="user?.email && user.email !== displayName"
                  class="user-sub"
                >
                  {{ user.email }}
                </div>
                <div class="user-links">
                  <router-link
                    :to="dashboard"
                    @click="close({ restoreFocus: false })"
                    >Dashboard</router-link
                  >
                  <router-link
                    to="/settings"
                    @click="close({ restoreFocus: false })"
                    >Settings</router-link
                  >
                  <button type="button" @click="logOut">Log out</button>
                </div>
              </div>
            </div>
            <!-- Signed out: in-drawer auth (login / register / forgot) -->
            <template v-else>
              <button
                v-if="!showAuth"
                class="signin-btn"
                type="button"
                @click="openSignIn"
              >
                Sign in
              </button>

              <div v-else class="auth">
                <div class="auth-tabs">
                  <button
                    class="auth-tab"
                    :class="{ active: authStore.authView === 'login' }"
                    type="button"
                    @click="authStore.setView('login')"
                  >
                    Login
                  </button>
                  <button
                    class="auth-tab"
                    :class="{ active: authStore.authView === 'register' }"
                    type="button"
                    @click="authStore.setView('register')"
                  >
                    Sign Up
                  </button>
                </div>

                <AuthForm
                  variant="drawer"
                  :view="authStore.authView"
                  @set-view="authStore.setView"
                  @login-success="onAuthLogin"
                />
              </div>
            </template>

            <!-- A plain anchor, not a router-link: Storybook is a static
                 build served beside the app (dist/storybook, see
                 railway.json and public/serve.json), so it needs a real
                 page load. The explicit file keeps its assets resolving. -->
            <p class="team-links">
              <a href="/storybook/index.html" target="_blank" rel="noopener"
                >Storybook · design system</a
              >
            </p>
          </div>
        </aside>

        <!-- The chapter library, in the space beside the drawer. A <div>,
             never a <section>: inside the reader a section is a screen
             tall (index.css). -->
        <div
          v-if="libraryOpen"
          class="library"
          role="region"
          aria-label="Full table of contents"
          data-testid="drawer-library"
          @click="onLibraryClick"
        >
          <button
            ref="libraryCloseRef"
            type="button"
            class="library-close"
            aria-label="Close the table of contents, back to the page"
            title="Back to the page"
            @click.stop="close()"
          >
            <CloseIcon :width="18" :height="18" />
          </button>
          <ChaptersLibrary embedded />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* The page dims behind the drawer. No blur and no filter: the page must
   not move or repaint as a layer under it (OPENBRAIN-145). */
.nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  background: rgb(0 0 0 / 0.55);
}

.drawer {
  --d-ink: 255 255 255;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 320px;
  max-width: calc(100% - 44px);
  height: 100%;
  background: rgb(var(--color-dark-surface));
  color: rgb(var(--d-ink));
  font-family: var(--font-ui);
  border-right: 1px solid rgb(var(--d-ink) / 0.1);
  overflow: hidden;
  /* The page hyphenates (index.css); a list of titles should not. */
  hyphens: manual;
  -webkit-hyphens: manual;
}

/* As tall as the reader's top bar and padded like it, so the ✕ lands on
   the mark (10px in; 4px on a phone). */
.drawer-head {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: var(--reader-topbar-h, 3rem);
  padding: 0 10px;
  border-bottom: 1px solid rgb(var(--d-ink) / 0.1);
  box-sizing: border-box;
}
.close-btn {
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
}

/* "See full table of contents" and home. */
.drawer-top {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 4px 10px 4px 20px;
  background: rgb(var(--color-dark-surface-2));
}
.contents-link {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--d-ink) / 0.8);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.12em;
  text-decoration: none;
  text-transform: uppercase;
}
.contents-link.is-open {
  color: rgb(var(--color-chapter-soft));
}
.home-link {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control);
  color: rgb(var(--d-ink) / 0.8);
}

/* The chapters. */
/* The 8px above and below the list are margins on its first and last
   chapter, not padding on the scroller: a scroller's padding insets what
   sticks in it, and the current chapter's row must stick flush with the
   list's top edge. */
.chapter-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.chapter:first-child {
  margin-top: 8px;
}
.chapter:last-child {
  margin-bottom: 8px;
}
.chapter.is-current {
  margin-bottom: 8px;
  padding-bottom: 8px;
  background: rgb(var(--color-dark-surface-2));
}
/* Folded, the chapter being read is one marked row among the others. */
.chapter.is-current.is-folded {
  padding-bottom: 0;
}
/* The row and, on the chapter being read, the chevron that folds its
   sections away. That row stays at the top of the list while its sections
   scroll under it, so the chevron is in reach from anywhere in a long
   chapter. */
.chapter-head {
  display: flex;
  align-items: stretch;
}
.chapter.is-current .chapter-head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--color-dark-surface-2));
}
/* A hairline under it, where the sections pass beneath. */
.chapter.is-current:not(.is-folded) .chapter-head {
  box-shadow: 0 1px 0 rgb(var(--d-ink) / 0.1);
}
.chapter-head .chapter-row {
  flex: 1;
  width: auto;
  min-width: 0;
}
/* Under the home icon: 44px, 10px in from the drawer's edge. */
.outline-toggle {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  min-height: 44px;
  margin-right: 10px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--d-ink) / 0.8);
  cursor: pointer;
}
.outline-toggle svg {
  transition: transform 0.16s ease;
}
.outline-toggle[aria-expanded="false"] svg {
  transform: rotate(-90deg);
}
.chapter-head .chapter-row:not(:last-child) {
  padding-right: 0.5rem;
}
.chapter-row {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr) auto;
  gap: 0.25rem;
  align-items: baseline;
  width: 100%;
  min-height: 44px;
  padding: 0.75rem 1.25rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--ui-size-15);
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
}
.chapter-row[aria-current="page"] {
  font-weight: 600;
}
.ch-num {
  font-variant-numeric: tabular-nums;
}
/* A draft: greyed, and said so. Only creators are shown one. */
.chapter.is-draft .ch-num,
.chapter.is-draft .ch-title {
  color: rgb(var(--d-ink) / 0.6);
}
.ch-draft {
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-warn));
}

.chapter-outline {
  padding: 0 1.25rem 0 2.5rem;
}
.outline-section,
.outline-subsection {
  display: block;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.625rem 0.5rem 0.625rem 0.75rem;
  border: 0;
  background: transparent;
  color: rgb(var(--d-ink) / 0.8);
  font: inherit;
  font-size: var(--ui-size-14);
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
}
.outline-subsection {
  padding-left: 1.75rem;
  color: rgb(var(--d-ink) / 0.62);
  font-size: var(--ui-size-13);
}
.outline-label {
  margin-right: 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  color: rgb(var(--d-ink) / 0.55);
}
/* The section being read, in the chapter's colour: its main step down the
   left edge, and its soft step for the words (the main step is 3:1 on
   this ground, too little for text). */
.outline-section[aria-current="location"] {
  color: rgb(var(--color-chapter-soft));
  box-shadow: inset 2px 0 0 rgb(var(--color-chapter));
}
.outline-section[aria-current="location"] .outline-label {
  color: inherit;
}

@media (hover: hover) {
  .close-btn:hover,
  .home-link:hover,
  .outline-toggle:hover,
  .library-close:hover {
    background: rgb(255 255 255 / 0.1);
  }
  .outline-toggle:hover {
    color: rgb(var(--d-ink));
  }
  .contents-link:hover,
  .chapter-row:hover .ch-title,
  .outline-section:hover,
  .outline-subsection:hover,
  .user-links a:hover,
  .user-links button:hover,
  .team-links a:hover {
    color: rgb(var(--d-ink));
    text-decoration: underline;
    text-underline-offset: 0.25em;
  }
}

/* The foot: the account. */
.drawer-foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  max-height: 70%;
  padding: 14px 20px 16px;
  border-top: 1px solid rgb(var(--d-ink) / 0.1);
  overflow-y: auto;
}
.user-footer {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgb(var(--color-complete));
  color: #0a3d33;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  font-weight: 600;
}
.user-meta {
  min-width: 0;
}
.user-name {
  font-size: var(--ui-size-14);
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.user-sub {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1.4;
  color: rgb(var(--d-ink) / 0.62);
  overflow-wrap: anywhere;
}
.user-links {
  display: flex;
  flex-wrap: wrap;
  column-gap: 1rem;
  margin: 0 0 0 -0.25rem;
}
.user-links a,
.user-links button {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.25rem;
  border: 0;
  background: none;
  color: rgb(var(--d-ink) / 0.8);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-decoration: none;
  text-transform: lowercase;
  cursor: pointer;
}

.team-links {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--d-ink) / 0.55);
}
.team-links a {
  color: inherit;
  text-decoration: none;
}

.signin-btn {
  align-self: flex-start;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgb(var(--d-ink));
  border-radius: var(--radius-control);
  background: rgb(var(--d-ink));
  color: rgb(var(--color-dark-surface));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.signin-btn:hover {
  background: rgb(var(--d-ink) / 0.85);
}

/* In-drawer auth (login / register / forgot): AuthForm's drawer skin is
   drawn for paper, so the form sits on a paper card here. */
.auth {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
}
.auth-tabs {
  display: flex;
  gap: 4px;
}
.auth-tab {
  flex: 1;
  min-height: 36px;
  padding: 8px 0;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-mute));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
}
.auth-tab.active {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border-color: rgb(var(--color-ink));
}

/* The library: the rest of the overlay, scrolling inside itself. */
.library {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgb(var(--color-dark-surface));
}
.library-close {
  position: sticky;
  top: 2px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: 2px 10px -46px auto;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: rgb(var(--color-dark-surface));
  color: #fff;
  cursor: pointer;
}

.close-btn:focus-visible,
.contents-link:focus-visible,
.home-link:focus-visible,
.chapter-row:focus-visible,
.outline-toggle:focus-visible,
.outline-section:focus-visible,
.outline-subsection:focus-visible,
.user-links a:focus-visible,
.user-links button:focus-visible,
.team-links a:focus-visible,
.signin-btn:focus-visible,
.library-close:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: -2px;
}

@media (max-width: 640px) {
  .drawer-head {
    padding: 0 4px;
  }
}

/* In from the left, 320ms. */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.32s ease;
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(-100%);
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .drawer-enter-active,
  :root:not([data-reduce-motion="0"]) .drawer-leave-active,
  :root:not([data-reduce-motion="0"]) .drawer-enter-active .drawer,
  :root:not([data-reduce-motion="0"]) .drawer-leave-active .drawer,
  :root:not([data-reduce-motion="0"]) .outline-toggle svg {
    transition: none;
  }
}
</style>
