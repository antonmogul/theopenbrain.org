<script setup>
/*
 * Creator dashboard "Decks" section (OPENBRAIN-129): slide decks for funders
 * and talks. Each card shows the deck's first slide, its status and whether
 * it has changes funders don't see yet, and opens the editor
 * (/dashboard/decks/<slug>) or the draft presenter in a new tab. A published
 * deck's funder link can be copied from here; making a new link and
 * unpublishing live in the editor's Share dialog.
 *
 * Self-contained: loads through useDecks() when it opens. Until
 * 20261007010000_decks.sql is pushed the table is missing, and the section
 * says so instead of offering a retry. DashboardView loads it as an async
 * component, so the deck layouts behind the thumbnails stay out of the
 * dashboard chunk.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import {
  SectionHeader,
  BaseCard,
  Button,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
  SearchInput,
  FilterChips,
  ConfirmDialog,
} from "@/components/dashboard/shared";
import SlidePreview from "@/components/deck/SlidePreview.vue";
import NewDeckDialog from "@/components/deck/editor/NewDeckDialog.vue";
import { deckHomeLabel, useDecks } from "@/composables/useDecks";
import { relativeShort } from "@/utils/format";

const router = useRouter();
// The pinned deck's address on the site this page is on.
const deckHome = deckHomeLabel();
const {
  decks,
  loading,
  error,
  missingTable,
  fetchDecks,
  createDeck,
  duplicateDeck,
  archiveDeck,
  restoreDeck,
  deleteDeck,
  shareUrl,
} = useDecks();

// The first load shows the loading state; refetches after a write keep the
// grid on screen.
const loaded = ref(false);
async function load() {
  await fetchDecks();
  loaded.value = true;
}
onMounted(load);

// ── filters ──────────────────────────────────────────────────────────────
const search = ref("");
const filter = ref("all");
const filterOptions = computed(() => {
  const count = (status) =>
    decks.value.filter((d) => d.status === status).length;
  return [
    {
      value: "all",
      label: "All",
      count: decks.value.length - count("archived"),
    },
    { value: "draft", label: "Drafts", count: count("draft") },
    { value: "published", label: "Published", count: count("published") },
    { value: "archived", label: "Archived", count: count("archived") },
  ];
});
const shown = computed(() => {
  const q = search.value.trim().toLowerCase();
  return decks.value.filter((d) => {
    if (
      q &&
      !String(d.title || "")
        .toLowerCase()
        .includes(q)
    )
      return false;
    // "All" is the decks in use: archived ones only under Archived.
    if (filter.value === "all") return d.status !== "archived";
    return d.status === filter.value;
  });
});

// The load error's own sentence, unless it only repeats the title.
const loadMessage = computed(() =>
  error.value && !/^The decks couldn't load\.?$/.test(error.value)
    ? error.value
    : "Check your connection and try again."
);

// ── card text ────────────────────────────────────────────────────────────
const KINDS = {
  funding: "Funding",
  pitch: "Pitch",
  talk: "Talk",
  section: "Section",
};
const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const hasChanges = (d) =>
  d.status === "published" &&
  Number(d.version) > Number(d.published_version ?? 0);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const metaLine = (d) =>
  `${plural(Number(d.slide_count) || 0, "slide")} · edited ${relativeShort(d.updated_at)}`;
const editPath = (d) => `/dashboard/decks/${encodeURIComponent(d.slug)}`;
const presentPath = (d) => `${editPath(d)}/present`;

// ── feedback ─────────────────────────────────────────────────────────────
// One polite status line for the section (copied, archived, …), and a
// write error shown on the card it came from.
const notice = ref("");
const cardError = ref({ id: null, message: "" });
let noticeTimer;
function say(message) {
  clearTimeout(noticeTimer);
  notice.value = message;
  noticeTimer = setTimeout(() => (notice.value = ""), 6000);
}
onBeforeUnmount(() => clearTimeout(noticeTimer));

const busyId = ref(null);
// A write from a card: busy while it runs, its error on the card, and the
// list refetched either way so the card shows what the database holds.
async function cardWrite(row, run, done) {
  busyId.value = row.id;
  cardError.value = { id: null, message: "" };
  try {
    await run(row);
    if (done) say(done);
    return true;
  } catch (err) {
    cardError.value = {
      id: row.id,
      message: err?.message || "That didn't work.",
    };
    fetchDecks();
    return false;
  } finally {
    busyId.value = null;
  }
}

async function copyLink(row) {
  const url = shareUrl(row);
  try {
    await navigator.clipboard.writeText(url);
    say(`Link to “${row.title}” copied.`);
  } catch {
    // No clipboard (an insecure origin, a refused permission): show it.
    say(`Copy this link: ${url}`);
  }
}

const duplicate = (row) =>
  cardWrite(row, duplicateDeck, `“${row.title}” duplicated as a draft.`);
const archive = (row) =>
  cardWrite(
    row,
    archiveDeck,
    row.pinned
      ? `“${row.title}” archived. /deck shows the bundled October copy again.`
      : `“${row.title}” archived. Its link stops working.`
  );
const restore = (row) =>
  cardWrite(row, restoreDeck, `“${row.title}” restored as a draft.`);

// ── delete ───────────────────────────────────────────────────────────────
const pendingDelete = ref(null);
const deleting = ref(false);
const deleteError = ref("");
function askDelete(row) {
  deleteError.value = "";
  pendingDelete.value = row;
}
function cancelDelete() {
  pendingDelete.value = null;
}
async function confirmDelete() {
  const row = pendingDelete.value;
  if (!row) return;
  const index = shown.value.findIndex((d) => d.id === row.id);
  deleting.value = true;
  deleteError.value = "";
  try {
    await deleteDeck(row);
    pendingDelete.value = null;
    say(`“${row.title}” deleted.`);
    // The dialog gives focus back to the card's More button, which is gone.
    await nextTick();
    focusAfterCard(row.id, index);
  } catch (err) {
    deleteError.value = err?.message || "The deck couldn't be deleted.";
    fetchDecks();
  } finally {
    deleting.value = false;
  }
}

// ── More menu ────────────────────────────────────────────────────────────
// A small disclosure menu per card. Escape and a click elsewhere close it;
// Escape and the actions put focus back on its button. While a card's write
// runs its More button is aria-disabled, not disabled, so focus can stay on
// it; once the write is done focus goes back to it, or, when the card has
// left the list (archived under All, restored under Archived, deleted), to
// the card that took its place, the one before, or the search box.
const menuFor = ref(null);
const grid = ref(null);
const sectionRoot = ref(null);
const menuButtons = () => [
  ...(grid.value?.querySelectorAll("[data-menu-for]") ?? []),
];
const menuButtonOf = (id) =>
  menuButtons().find((b) => b.dataset.menuFor === id);
function focusMenuButton(id) {
  nextTick(() => menuButtonOf(id)?.focus());
}
function focusAfterCard(id, index) {
  nextTick(() => {
    const own = menuButtonOf(id);
    const active = document.activeElement;
    // Focus moved on during the write (the search box, another card): leave it.
    if (active && active !== document.body && active !== own) return;
    const rest = menuButtons();
    const target =
      own ||
      rest[Math.min(Math.max(index, 0), rest.length - 1)] ||
      sectionRoot.value?.querySelector(
        ".ds-tools input, .ds-empty-actions button"
      );
    target?.focus();
  });
}
function toggleMenu(id) {
  if (busyId.value === id) return;
  menuFor.value = menuFor.value === id ? null : id;
  if (menuFor.value)
    nextTick(() =>
      grid.value?.querySelector(".ds-menu button:not(:disabled)")?.focus()
    );
}
function closeMenu({ refocus = false } = {}) {
  const id = menuFor.value;
  menuFor.value = null;
  if (refocus && id) focusMenuButton(id);
}
async function menuAction(row, fn) {
  const index = shown.value.findIndex((d) => d.id === row.id);
  closeMenu({ refocus: true });
  // Delete only opens its confirmation, which takes focus itself.
  if ((await fn(row)) === undefined) return;
  await nextTick();
  focusAfterCard(row.id, index);
}
function onMenuKeydown(event) {
  if (event.key !== "Escape") return;
  event.stopPropagation();
  closeMenu({ refocus: true });
}
function onDocumentPointer(event) {
  if (!event.target.closest?.(".ds-more")) closeMenu();
}
watch(menuFor, (id) => {
  if (id) document.addEventListener("pointerdown", onDocumentPointer);
  else document.removeEventListener("pointerdown", onDocumentPointer);
});
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", onDocumentPointer)
);

// ── new deck ─────────────────────────────────────────────────────────────
const newOpen = ref(false);
const creating = ref(false);
const createError = ref("");
const takenSlugs = computed(() => decks.value.map((d) => d.slug));
function openNew() {
  createError.value = "";
  newOpen.value = true;
}
async function create(fields) {
  creating.value = true;
  createError.value = "";
  try {
    const row = await createDeck(fields);
    newOpen.value = false;
    router.push(
      `/dashboard/decks/${encodeURIComponent(row?.slug || fields.slug)}`
    );
  } catch (err) {
    createError.value = err?.message || "The deck couldn't be created.";
    // A link name taken in another tab shows up as "Already used" next time.
    fetchDecks();
  } finally {
    creating.value = false;
  }
}

// The empty state's shortcut: the bundled funding deck as a new draft.
const copyingFunding = ref(false);
const fundingError = ref("");
async function copyFunding() {
  copyingFunding.value = true;
  fundingError.value = "";
  try {
    const row = await createDeck({
      title: "Copy of the funding deck",
      slug: "funding-copy",
      kind: "funding",
      starter: "funding",
    });
    router.push(
      `/dashboard/decks/${encodeURIComponent(row?.slug || "funding-copy")}`
    );
  } catch (err) {
    fundingError.value = err?.message || "The deck couldn't be created.";
  } finally {
    copyingFunding.value = false;
  }
}
</script>

<template>
  <section ref="sectionRoot" class="section decks-section">
    <SectionHeader
      eyebrow="10 · Decks"
      title="Decks"
      subtitle="Slide decks for funders and talks. Drafts are private to creators; a published deck opens from its link without signing in."
    >
      <template #actions>
        <Button
          variant="solid"
          size="sm"
          :disabled="missingTable || !loaded"
          @click="openNew"
          >New deck</Button
        >
      </template>
    </SectionHeader>

    <LoadingState v-if="!loaded" message="Loading decks…" />

    <ErrorState
      v-else-if="missingTable"
      title="Decks need a database update"
      :show-retry="false"
    >
      <template #action>
        <p class="ds-hint">
          Run <code>supabase db push</code> for
          <code>20261007010000_decks.sql</code>.
        </p>
      </template>
    </ErrorState>

    <ErrorState
      v-else-if="error && !decks.length"
      title="The decks couldn't load"
      :message="loadMessage"
      :retry-label="loading ? 'Loading…' : 'Try again'"
      @retry="load"
    />

    <EmptyState
      v-else-if="!decks.length"
      title="No decks yet"
      message="Start one from a blank slide, or from a copy of the funding deck to edit and share."
    >
      <template #action>
        <div class="ds-empty-actions">
          <Button variant="solid" size="sm" @click="openNew">New deck</Button>
          <Button
            variant="outline"
            size="sm"
            :loading="copyingFunding"
            @click="copyFunding"
            >Copy the funding deck</Button
          >
        </div>
        <p v-if="fundingError" class="ds-error" role="alert">
          {{ fundingError }}
        </p>
      </template>
    </EmptyState>

    <template v-else>
      <p v-if="error" class="ds-error" role="alert">{{ error }}</p>

      <div class="ds-tools">
        <!-- SearchInput's field is named by its placeholder. -->
        <div class="ds-search" role="search" aria-label="Decks">
          <SearchInput v-model="search" placeholder="Search decks by title…" />
        </div>
        <FilterChips
          v-model="filter"
          :options="filterOptions"
          show-counts
          role="group"
          aria-label="Show decks"
        />
      </div>

      <EmptyState
        v-if="!shown.length"
        title="No decks match"
        message="Try another search or filter."
      />

      <ul v-else ref="grid" class="ds-grid">
        <li v-for="d in shown" :key="d.id">
          <BaseCard
            class="ds-card"
            padding="none"
            :aria-busy="busyId === d.id ? 'true' : undefined"
          >
            <div class="ds-thumb">
              <SlidePreview
                v-if="isObject(d.first_slide)"
                :entry="d.first_slide"
                thumb
              />
              <div v-else class="ds-noslides">No slides</div>
            </div>

            <div class="ds-body">
              <div class="ds-head">
                <h3 class="ds-title">{{ d.title }}</h3>
                <StatusBadge :status="d.status || 'draft'" />
              </div>

              <div class="ds-chips">
                <span class="ds-chip">{{ KINDS[d.kind] || d.kind }}</span>
                <span v-if="d.pinned" class="ds-chip is-pinned"
                  >Shown at /deck</span
                >
              </div>

              <p v-if="hasChanges(d)" class="ds-changes">
                <span class="ds-dot" aria-hidden="true" />Unpublished changes
              </p>
              <p class="ds-meta">{{ metaLine(d) }}</p>

              <p
                v-if="cardError.id === d.id && cardError.message"
                class="ds-error"
                role="alert"
              >
                {{ cardError.message }}
              </p>

              <div class="ds-actions">
                <router-link :to="editPath(d)" class="ds-action is-primary"
                  >Edit<span class="sr-only"> {{ d.title }}</span></router-link
                >
                <a
                  :href="presentPath(d)"
                  target="_blank"
                  rel="noopener"
                  class="ds-action"
                  >Present ↗<span class="sr-only">
                    {{ d.title }} (opens in a new tab)</span
                  ></a
                >
                <button
                  v-if="d.status === 'published'"
                  type="button"
                  class="ds-action"
                  @click="copyLink(d)"
                >
                  Copy link<span class="sr-only"> to {{ d.title }}</span>
                </button>

                <div class="ds-more">
                  <button
                    type="button"
                    class="ds-action"
                    :data-menu-for="d.id"
                    :aria-expanded="menuFor === d.id ? 'true' : 'false'"
                    :aria-controls="`ds-menu-${d.id}`"
                    :aria-disabled="busyId === d.id ? 'true' : undefined"
                    @click="toggleMenu(d.id)"
                  >
                    More<span class="sr-only"> actions for {{ d.title }}</span>
                  </button>
                  <ul
                    v-if="menuFor === d.id"
                    :id="`ds-menu-${d.id}`"
                    class="ds-menu"
                    @keydown="onMenuKeydown"
                  >
                    <li>
                      <button type="button" @click="menuAction(d, duplicate)">
                        Duplicate
                      </button>
                    </li>
                    <li v-if="d.status === 'archived'">
                      <button type="button" @click="menuAction(d, restore)">
                        Restore
                      </button>
                    </li>
                    <li v-else>
                      <button type="button" @click="menuAction(d, archive)">
                        Archive
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        class="is-danger"
                        @click="menuAction(d, askDelete)"
                      >
                        Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </BaseCard>
        </li>
      </ul>
    </template>

    <p class="sr-only" role="status" aria-live="polite">{{ notice }}</p>
    <p v-if="notice" class="ds-notice" aria-hidden="true">{{ notice }}</p>

    <NewDeckDialog
      :open="newOpen"
      :taken-slugs="takenSlugs"
      :busy="creating"
      :error="createError"
      @create="create"
      @close="newOpen = false"
    />

    <ConfirmDialog
      :model-value="!!pendingDelete"
      title="Delete this deck?"
      confirm-label="Delete deck"
      variant="danger"
      :loading="deleting"
      @update:model-value="(open) => !open && cancelDelete()"
      @confirm="confirmDelete"
    >
      <strong>{{ pendingDelete?.title }}</strong> and its funder link go for
      good; anyone who opens the link is told it isn't available.
      <template v-if="pendingDelete?.pinned">
        {{ deckHome }} goes back to the bundled October copy.
      </template>
      <span v-if="deleteError" class="ds-error ds-error--block" role="alert">{{
        deleteError
      }}</span>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
/* The dashboard's .section rhythm, kept here too because .section comes from
   DashboardView's scoped styles. */
.decks-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.ds-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.ds-search {
  display: block;
  flex: 1 1 240px;
  max-width: 360px;
}
.ds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ds-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: visible;
  font-family: var(--font-ui);
}
.ds-thumb {
  border-bottom: 1px solid rgb(var(--color-line));
}
.ds-noslides {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-mute));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ds-body {
  display: grid;
  gap: 8px;
  align-content: start;
  flex: 1;
  padding: 14px 16px 16px;
}
.ds-head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}
.ds-title {
  margin: 0;
  min-width: 0;
  font-size: var(--ui-size-16);
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.ds-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ds-chip {
  padding: 2px 8px;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
  white-space: nowrap;
}
.ds-chip.is-pinned {
  border-color: rgb(var(--color-complete));
  background: rgb(var(--color-complete) / 0.15);
}
.ds-changes,
.ds-meta {
  margin: 0;
  font-size: var(--ui-size-13);
  color: rgb(var(--color-mute));
}
.ds-changes {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--color-ink));
}
.ds-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--color-warn));
}
.ds-meta {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.04em;
}
/* Ink text marked by an accent edge: small accent text is under 4.5:1 on
   paper for some accent and theme. */
.ds-error {
  margin: 0;
  padding-left: 8px;
  border-left: 3px solid rgb(var(--color-accent));
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}
.ds-error--block {
  display: block;
  margin-top: 12px;
}
.ds-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgb(var(--color-line));
}
.ds-action {
  padding: 4px 0;
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
  text-decoration: none;
  cursor: pointer;
}
.ds-action:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.ds-action.is-primary {
  color: rgb(var(--color-ink));
  text-decoration: underline;
  text-decoration-color: rgb(var(--color-accent));
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.ds-action:disabled,
.ds-action[aria-disabled="true"] {
  color: rgb(var(--color-mute));
  cursor: progress;
}
.ds-action:focus-visible,
.ds-menu button:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.ds-more {
  position: relative;
  margin-left: auto;
}
.ds-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 4px);
  z-index: 5;
  display: grid;
  min-width: 160px;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper));
  box-shadow: 0 8px 24px rgb(var(--color-ink) / 0.12);
}
.ds-menu button {
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
.ds-menu button:hover {
  background: rgb(var(--color-ink) / 0.06);
}
.ds-menu button.is-danger {
  color: rgb(var(--color-ink));
  font-weight: 600;
}
.ds-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.ds-hint {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  color: rgb(var(--color-mute));
}
.ds-hint code {
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
}
.ds-notice {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 30;
  max-width: min(560px, calc(100vw - 32px));
  margin: 0;
  padding: 10px 16px;
  transform: translateX(-50%);
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  overflow-wrap: anywhere;
}
</style>
