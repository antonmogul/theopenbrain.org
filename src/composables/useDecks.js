import { ref } from "vue";
import { authedRequest } from "@/services/api/client";
import { STARTERS } from "@/data/decks/index.js";
import { SCHEMA_VERSION } from "@/data/decks/validate.js";

/**
 * The creator dashboard's Decks section (OPENBRAIN-129): the deck list and
 * the writes made from it (create, duplicate, archive, delete) and from the
 * Share dialog (link, unpublish, /deck).
 *
 * Decks are creator-only rows in public.decks
 * (supabase/migrations/20261007010000_decks.sql); every request here goes
 * with the session. Writes throw an Error whose message can be shown as-is,
 * and refetch the list when they succeed. Until the migration is pushed the
 * table is missing (404, PGRST205): `missingTable` says so and the section
 * asks for `supabase db push` instead of offering a retry.
 */

const LIST_COLUMNS =
  "id,slug,title,kind,status,slide_count,version,published_version,published_at,updated_at,pinned,share_token,first_slide:slides->0";
// What a write returns: the row without its slides.
const ROW_COLUMNS =
  "id,slug,title,kind,status,slide_count,version,published_version,published_at,updated_at,pinned,share_token";
export const DECK_LIST_QUERY = `decks?select=${LIST_COLUMNS}&order=updated_at.desc`;

const SLUG_MAX = 80;

/** Is this API error "the table or function isn't there yet"? */
export const isMissingTable = (err) =>
  err?.status === 404 || /PGRST20[25]/.test(String(err?.response || ""));

/** A user-facing sentence for a failed deck request. */
export function deckErrorMessage(err, fallback = "That didn't work.") {
  const body = String(err?.response || err?.message || "");
  if (isMissingTable(err))
    return "Decks need a database update. Run `supabase db push` for 20261007010000_decks.sql.";
  if (err?.status === 409 || /23505/.test(body))
    return "A deck with that link name already exists. Choose another.";
  if (/deck_not_published/.test(body))
    return "Publish the deck before showing it at /deck.";
  if (/decks_slug_check/.test(body))
    return "That link name isn't allowed. Use lowercase letters, digits and dashes (not new, present, s or templates).";
  if (/decks_title_check/.test(body)) return "The deck needs a title.";
  if (/decks_slides_check/.test(body))
    return "The deck is over the limit (100 slides, 1 MB).";
  if (err?.status === 401 || err?.status === 403 || /42501/.test(body))
    return "Only creators can change decks. Check you are still signed in.";
  if (err instanceof TypeError || /Failed to fetch|NetworkError/i.test(body))
    return "Couldn't reach the database. Check your connection and try again.";
  return fallback;
}

const fail = (err, fallback) => {
  const error = new Error(deckErrorMessage(err, fallback));
  error.cause = err;
  error.status = err?.status;
  return error;
};

/** 32 hex digits, the shape public.decks.share_token takes. */
export function newShareToken() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replaceAll("-", "");
  const bytes = c.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const first = (rows) => (Array.isArray(rows) ? rows[0] : rows) || null;

/**
 * Where the pinned deck shows, as this site's address: "<host>/deck". The
 * site serves /deck itself, so naming the host the page is on is right
 * wherever it runs (the Railway host today, theopenbrain.org once the domain
 * moves). Just "/deck" when there is no location (tests, SSR).
 */
export const deckHomeLabel = () => `${globalThis.location?.host ?? ""}/deck`;

export function useDecks() {
  const decks = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const missingTable = ref(false);

  async function fetchDecks() {
    loading.value = true;
    error.value = null;
    try {
      const rows = await authedRequest(DECK_LIST_QUERY);
      decks.value = Array.isArray(rows) ? rows : [];
      missingTable.value = false;
    } catch (err) {
      missingTable.value = isMissingTable(err);
      error.value = deckErrorMessage(err, "The decks couldn't load.");
    } finally {
      loading.value = false;
    }
    return decks.value;
  }

  // Writes: refetch on success; the list's own error state stays for loads.
  async function write(run, fallback) {
    let result;
    try {
      result = await run();
    } catch (err) {
      throw fail(err, fallback);
    }
    await fetchDecks();
    return result;
  }

  const insert = (body) =>
    authedRequest(`decks?select=${ROW_COLUMNS}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    }).then(first);

  const patchRow = (row, body) =>
    authedRequest(`decks?id=eq.${row.id}&select=${ROW_COLUMNS}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    }).then((rows) => {
      if (Array.isArray(rows) && !rows.length)
        throw Object.assign(new Error("No row changed"), { status: 403 });
      return first(rows);
    });

  /** A new draft deck from a starter ('blank', 'funding', 'templates'). */
  function createDeck({ title, slug, kind = "funding", starter = "blank" }) {
    const from = STARTERS[starter] || STARTERS.blank;
    return write(
      () =>
        insert({
          title: String(title ?? "").trim(),
          slug,
          kind,
          slides: from.entries(),
          schema_version: SCHEMA_VERSION,
        }),
      "The deck couldn't be created."
    );
  }

  /** `<slug>-copy`, then `-copy-2`, … : the first not in the list. */
  function copySlug(slug, alsoTaken = []) {
    const taken = new Set([...decks.value.map((d) => d.slug), ...alsoTaken]);
    for (let n = 1; ; n += 1) {
      const suffix = n === 1 ? "-copy" : `-copy-${n}`;
      const base = String(slug).slice(0, SLUG_MAX - suffix.length);
      const next = `${base.replace(/-+$/, "")}${suffix}`;
      if (!taken.has(next)) return next;
    }
  }

  /** A draft copy of the working slides: new link, not shown at /deck. */
  async function duplicateDeck(row) {
    return write(async () => {
      const source = first(
        await authedRequest(
          `decks?id=eq.${row.id}&select=title,kind,slides,schema_version`
        )
      );
      if (!source)
        throw Object.assign(new Error("Deck not found"), { status: 403 });
      // The list may be stale: on a clash, try the next suffix (a few times).
      const clashed = [];
      let slug = copySlug(row.slug);
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await insert({
            slug,
            title: `Copy of ${source.title}`.slice(0, 200),
            kind: source.kind,
            slides: source.slides,
            schema_version: source.schema_version,
            status: "draft",
          });
        } catch (err) {
          if (
            attempt >= 3 ||
            !(err?.status === 409 || /23505/.test(err?.response))
          )
            throw err;
          clashed.push(slug);
          slug = copySlug(row.slug, clashed);
        }
      }
    }, "The deck couldn't be duplicated.");
  }

  /** Archived decks leave /deck and their link stops working. */
  const archiveDeck = (row) =>
    write(
      () => patchRow(row, { status: "archived", pinned: false }),
      "The deck couldn't be archived."
    );

  const restoreDeck = (row) =>
    write(
      () => patchRow(row, { status: "draft" }),
      "The deck couldn't be restored."
    );

  const deleteDeck = (row) =>
    write(async () => {
      const rows = await authedRequest(`decks?id=eq.${row.id}&select=id`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      if (Array.isArray(rows) && !rows.length)
        throw Object.assign(new Error("No row deleted"), { status: 403 });
      return true;
    }, "The deck couldn't be deleted.");

  /**
   * Back to a draft: the link stops working until it is published again
   * (same token, same snapshot). A draft is never shown at /deck, so it is
   * also unpinned rather than left with a "Shown at /deck" chip.
   */
  const unpublishDeck = (row) =>
    write(
      () => patchRow(row, { status: "draft", pinned: false }),
      "The deck couldn't be unpublished."
    );

  /** A new share token: the old link stops working. */
  const rotateLink = (row) =>
    write(
      () => patchRow(row, { share_token: newShareToken() }),
      "A new link couldn't be made."
    );

  /**
   * Show this published deck at /deck (`on`), or stop showing it. Turning it
   * on moves /deck from whichever deck had it; turning it off touches this
   * deck's row only, so a switch left on in a stale tab can never unpin a
   * deck another creator chose since. Resolves to this deck's row when
   * turning off.
   */
  const setPinned = (row, on = true) =>
    write(
      () =>
        on
          ? authedRequest("rpc/set_pinned_deck", {
              method: "POST",
              body: JSON.stringify({ p_id: row.id }),
            })
          : patchRow(row, { pinned: false }),
      "/deck couldn't be changed."
    );

  /** The media library's images, for the image fields' picker (read-only). */
  async function fetchImageLibrary() {
    try {
      const rows = await authedRequest(
        "animations?select=id,title,animation_key,media_type,image_file_url&media_type=eq.image&order=title.asc"
      );
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      throw fail(err, "The media library couldn't load.");
    }
  }

  const shareUrl = (row) =>
    `${globalThis.location?.origin ?? ""}/deck/s/${row?.share_token ?? ""}`;

  const slugTaken = (slug) => decks.value.some((d) => d.slug === slug);

  return {
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
    unpublishDeck,
    rotateLink,
    setPinned,
    fetchImageLibrary,
    shareUrl,
    slugTaken,
  };
}
