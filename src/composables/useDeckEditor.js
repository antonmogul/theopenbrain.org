import {
  computed,
  getCurrentScope,
  isRef,
  onScopeDispose,
  ref,
  shallowRef,
  unref,
  watch,
} from "vue";
import { authedRequest } from "@/services/api/client";
import {
  SCHEMA_VERSION,
  carryOver,
  cloneEntry,
  deepClone,
  newSlideId,
  normalizeSlide,
  renumberEyebrows,
  validateDeck,
} from "@/data/decks/validate.js";
import { deckErrorMessage, isMissingTable } from "@/composables/useDecks";

/**
 * The deck editor at /dashboard/decks/:slug (OPENBRAIN-129).
 *
 * The whole deck (title + slides) is the unit of work. Edits are immutable
 * (each change makes new arrays/objects along its path, so undo snapshots
 * are cheap references) and autosave 1 s after the last one with a
 * compare-and-swap PATCH: `decks?id=eq.<id>&version=eq.<n>` sets version
 * n+1. Zero rows back means someone else saved first (the version moved: a
 * conflict, resolved with "Load theirs" or "Keep mine") or the database
 * refused (not a creator any more). A network or API error keeps the local
 * copy and retries on the next change. Drafts may hold errors; only Publish
 * needs zero.
 *
 * Publishing is public.publish_deck(id, version): the working copy becomes
 * the frozen snapshot funders see, in one transaction with a revision row.
 * Discarding unpublished changes is public.discard_deck_changes(id,
 * version), which copies the row's own snapshot back on the server: what a
 * tab remembers of the snapshot may predate another tab's publish.
 *
 * A save whose answer never arrives (the connection dropped after the
 * request left) may still have landed. If the next save then finds the
 * version one ahead, the row is compared with what was sent: when it is that
 * save, it counts as saved and the later edits go out on top of it, rather
 * than this tab reporting a conflict with itself.
 *
 * Paths are relative to the entry, as in validate.js problems:
 * update("props.people.2.name", "Ada"), update("label", …), update("hidden",
 * true). Setting `undefined` removes the key.
 *
 * While mounted it saves when the tab is hidden and asks before unloading
 * with unsaved changes; the view awaits flush() in onBeforeRouteLeave.
 */

const AUTOSAVE_MS = 1000;
const COALESCE_MS = 800;
const HISTORY_MAX = 50;
const isDeckConflict = (err) =>
  /deck_conflict/.test(String(err?.response || err?.message || ""));
// What a save returns: the row without its slides.
const META_COLUMNS =
  "id,slug,title,kind,status,schema_version,slide_count,version,published_version,published_title,published_at,pinned,share_token,updated_at";
export const REFUSED_MESSAGE =
  "The database didn't allow this change. Check you are still signed in as a creator.";

const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Equal as JSON, whatever the key order (jsonb reorders object keys). */
export function sameJson(a, b) {
  if (a === b) return true;
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  if (Array.isArray(a))
    return a.length === b.length && a.every((x, i) => sameJson(x, b[i]));
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((k) => Object.hasOwn(b, k) && sameJson(a[k], b[k]))
  );
}
const asJson = (v) =>
  v === undefined ? undefined : JSON.parse(JSON.stringify(v));

// The value at `segments` inside `obj` (undefined when any step is missing).
const getIn = (obj, segments) =>
  segments.reduce(
    (o, k) =>
      o === null || typeof o !== "object"
        ? undefined
        : o[Array.isArray(o) ? Number(k) : k],
    obj
  );

// A failure after which the request may still have reached the database:
// no answer at all, an unreadable one, or a gateway error.
const mayHaveLanded = (err) =>
  err instanceof TypeError ||
  err instanceof SyntaxError ||
  Number(err?.status) >= 500;

// A deck row without its working slides (the editor holds those).
const metaOf = (row) =>
  Object.fromEntries(
    Object.entries(row).filter(([k]) => k !== "slides" && k !== "first_slide")
  );

// A copy of `obj` with `value` at `segments` (undefined deletes the key),
// copying only the containers along the path.
function setIn(obj, segments, value) {
  const [head, ...rest] = segments;
  const isIndex = /^\d+$/.test(head);
  const container = Array.isArray(obj)
    ? [...obj]
    : isObject(obj)
      ? { ...obj }
      : isIndex
        ? []
        : {};
  const key = Array.isArray(container) ? Number(head) : head;
  if (rest.length) container[key] = setIn(container[key], rest, value);
  else if (value === undefined) {
    if (Array.isArray(container)) container.splice(key, 1);
    else delete container[key];
  } else container[key] = value;
  return container;
}

export function useDeckEditor(slug) {
  const slugOf = () =>
    String((typeof slug === "function" ? slug() : unref(slug)) ?? "");

  const status = ref("loading"); // loading | ready | not-found | missing-table | error
  const loadError = ref(null);
  const deck = ref(null); // the row's meta (no working slides)
  const title = ref("");
  const entries = shallowRef([]);
  const selectedId = ref(null);

  const saveState = ref("saved"); // saved | pending | saving | error | conflict | refused
  const lastSavedAt = ref(null);
  const saveError = ref(null);
  const conflict = ref(null); // { version, updatedAt } of the newer row

  // ── selection ────────────────────────────────────────────────────────────
  const selectedIndex = computed(() =>
    entries.value.findIndex((e) => e?.id === selectedId.value)
  );
  const selected = computed(() => entries.value[selectedIndex.value] ?? null);
  const ids = () => entries.value.map((e) => e?.id).filter(Boolean);

  function select(id) {
    if (entries.value.some((e) => e?.id === id)) selectedId.value = id;
  }

  // ── problems ─────────────────────────────────────────────────────────────
  const overflowIds = shallowRef(new Set());
  function setOverflow(id, overflowing) {
    if (overflowIds.value.has(id) === Boolean(overflowing)) return;
    const next = new Set(overflowIds.value);
    if (overflowing) next.add(id);
    else next.delete(id);
    overflowIds.value = next;
  }

  const problems = computed(() => {
    const out = validateDeck(entries.value);
    const present = new Set(ids());
    for (const id of overflowIds.value)
      if (present.has(id))
        out.push({
          slideId: id,
          path: "",
          level: "warn",
          code: "W_OVERFLOW",
          message: "Text runs off the slide.",
        });
    return out;
  });
  /** { [slideId]: { errors, warnings } } counts, for the rail's badges. */
  const problemsById = computed(() => {
    const out = {};
    for (const p of problems.value) {
      if (!p.slideId) continue;
      out[p.slideId] ??= { errors: 0, warnings: 0 };
      out[p.slideId][p.level === "error" ? "errors" : "warnings"] += 1;
    }
    return out;
  });
  const errorCount = computed(
    () => problems.value.filter((p) => p.level === "error").length
  );
  const warningCount = computed(
    () => problems.value.filter((p) => p.level === "warn").length
  );

  // ── history ──────────────────────────────────────────────────────────────
  const undoStack = shallowRef([]);
  const redoStack = shallowRef([]);
  let lastKey = null;
  let lastAt = 0;
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);
  const snapshot = () => ({ title: title.value, entries: entries.value });

  // Call before a change. Edits to the same key within 800 ms are one step.
  function record(key = null) {
    const now = Date.now();
    if (key && key === lastKey && now - lastAt < COALESCE_MS) {
      lastAt = now;
      return;
    }
    undoStack.value = [...undoStack.value, snapshot()].slice(-HISTORY_MAX);
    redoStack.value = [];
    lastKey = key;
    lastAt = now;
  }

  function restore(state) {
    title.value = state.title;
    entries.value = state.entries;
    if (!entries.value.some((e) => e?.id === selectedId.value))
      selectedId.value = entries.value[0]?.id ?? null;
    lastKey = null;
    changed();
  }

  function undo() {
    if (!undoStack.value.length) return;
    const prev = undoStack.value.at(-1);
    undoStack.value = undoStack.value.slice(0, -1);
    redoStack.value = [...redoStack.value, snapshot()];
    restore(prev);
  }

  function redo() {
    if (!redoStack.value.length) return;
    const next = redoStack.value.at(-1);
    redoStack.value = redoStack.value.slice(0, -1);
    undoStack.value = [...undoStack.value, snapshot()].slice(-HISTORY_MAX);
    restore(next);
  }

  // ── saving ───────────────────────────────────────────────────────────────
  let timer = null;
  let inFlight = null;
  let savedTitle = null;
  let savedEntries = null;
  // Writes at a version whose answer never came: a save { version, title,
  // entries } or a discard { version, discard: true }.
  let unsure = [];
  const hasUnsaved = () =>
    status.value === "ready" &&
    (title.value !== savedTitle || entries.value !== savedEntries);
  const blocked = () =>
    saveState.value === "conflict" || saveState.value === "refused";

  const dirtySincePublish = computed(
    () =>
      deck.value?.status === "published" &&
      (deck.value.version > (deck.value.published_version ?? 0) ||
        saveState.value !== "saved")
  );

  // After any edit: autosave in a second, unless a conflict or refusal is
  // waiting on the creator.
  function changed() {
    if (status.value !== "ready" || blocked()) return;
    saveState.value = "pending";
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, AUTOSAVE_MS);
  }

  /** Merge a deck row's columns into the meta (never the working slides). */
  function applyMeta(row) {
    if (!isObject(row)) return;
    deck.value = { ...(deck.value || {}), ...metaOf(row) };
  }

  // Is the row one ahead because of one of this tab's own unanswered writes?
  // Then that write landed. A save becomes the saved state. A discard this
  // tab was told had failed only moves the version on: what is here (the
  // edits it meant to drop, and any since) is then saved over it, as the
  // creator expects after "couldn't be discarded".
  async function adoptLostSave(expectedVersion, row) {
    const candidates = unsure.filter((u) => u.version === expectedVersion);
    if (!candidates.length || row.version !== expectedVersion + 1) return false;
    const rows = await authedRequest(
      `decks?id=eq.${deck.value.id}&select=id,version,updated_at,title,slides,published_slides,published_version`
    );
    const now = Array.isArray(rows) ? rows[0] : null;
    if (!now || now.version !== row.version) return false;
    const mine = candidates.find((u) =>
      u.discard
        ? now.published_version === now.version &&
          sameJson(now.slides, now.published_slides)
        : u.title === now.title && sameJson(asJson(u.entries), now.slides)
    );
    if (!mine) return false;
    applyMeta({
      version: now.version,
      published_version: now.published_version,
      updated_at: now.updated_at,
    });
    savedTitle = mine.discard ? null : mine.title;
    savedEntries = mine.discard ? null : mine.entries;
    unsure = [];
    lastSavedAt.value = now.updated_at ? new Date(now.updated_at) : new Date();
    saveError.value = null;
    saveState.value = hasUnsaved() ? "pending" : "saved";
    return true;
  }

  /**
   * Zero rows back from a guarded write: whose fault? Resolves "conflict"
   * (the version moved), "adopted" (it moved by this tab's own unanswered
   * save, now counted as saved), "refused" (same version: the database said
   * no) or "error"; sets saveState to match. `onSameVersion` replaces the
   * refusal for a write that can miss for another reason.
   */
  async function explainNoRows(expectedVersion, { onSameVersion } = {}) {
    try {
      const rows = await authedRequest(
        `decks?id=eq.${deck.value.id}&select=id,version,updated_at`
      );
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row && row.version !== expectedVersion) {
        if (await adoptLostSave(expectedVersion, row)) return "adopted";
        conflict.value = { version: row.version, updatedAt: row.updated_at };
        saveState.value = "conflict";
        saveError.value = null;
        return "conflict";
      }
      if (row && onSameVersion) return onSameVersion();
      saveState.value = "refused";
      saveError.value = REFUSED_MESSAGE;
      return "refused";
    } catch (err) {
      saveState.value = "error";
      saveError.value = deckErrorMessage(err, "Not saved.");
      return "error";
    }
  }

  async function save() {
    const sentTitle = title.value;
    const sentEntries = entries.value;
    const n = deck.value.version;
    saveState.value = "saving";
    try {
      const rows = await authedRequest(
        `decks?id=eq.${deck.value.id}&version=eq.${n}&select=${META_COLUMNS}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            title: sentTitle,
            slides: sentEntries,
            schema_version: SCHEMA_VERSION,
            version: n + 1,
          }),
        }
      );
      if (Array.isArray(rows) && rows.length === 0) {
        // One of this tab's unanswered saves landed: send what came after it.
        if ((await explainNoRows(n)) === "adopted")
          return hasUnsaved() ? save() : true;
        return false;
      }
      applyMeta({ version: n + 1, ...(Array.isArray(rows) ? rows[0] : {}) });
      savedTitle = sentTitle;
      savedEntries = sentEntries;
      unsure = [];
      lastSavedAt.value = new Date();
      saveError.value = null;
      saveState.value = hasUnsaved() ? "pending" : "saved";
      if (saveState.value === "pending" && !timer) changed();
      return true;
    } catch (err) {
      const refused = err?.status === 403 || /42501/.test(err?.response || "");
      if (!refused && mayHaveLanded(err))
        unsure.push({ version: n, title: sentTitle, entries: sentEntries });
      saveState.value = refused ? "refused" : "error";
      saveError.value = refused
        ? REFUSED_MESSAGE
        : deckErrorMessage(err, "Not saved. Your changes are kept here.");
      return false;
    }
  }

  /**
   * Save now. Resolves true when everything is saved (or there was nothing
   * to save), false when it couldn't be: an error, a refusal or a conflict.
   */
  async function flush() {
    clearTimeout(timer);
    timer = null;
    while (inFlight) await inFlight;
    if (status.value !== "ready") return true;
    if (blocked()) return false;
    if (!hasUnsaved()) {
      if (saveState.value !== "saved") saveState.value = "saved";
      return true;
    }
    inFlight = save().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  /** Try again after "Not saved" (or a refusal, once signed in again). */
  function retry() {
    if (saveState.value === "conflict") return Promise.resolve(false);
    if (saveState.value === "refused") saveState.value = "pending";
    return flush();
  }

  /**
   * "Load theirs" reloads, and keeps this tab's version as one undo step
   * (undo brings it back and saves it over theirs); "Keep mine" overwrites
   * their version.
   */
  async function resolveConflict(choice) {
    const theirs = conflict.value;
    if (!theirs) return false;
    conflict.value = null;
    if (choice === "theirs") {
      const mine = snapshot();
      saveState.value = "saved";
      await load({ keepStatus: true });
      if (status.value !== "ready") return false;
      if (mine.title !== title.value || !sameJson(mine.entries, entries.value))
        undoStack.value = [mine];
      return true;
    }
    deck.value = { ...deck.value, version: theirs.version };
    savedEntries = null; // what's here differs from theirs: save it
    saveState.value = "pending";
    return flush();
  }

  // ── loading ──────────────────────────────────────────────────────────────
  async function load({ keepStatus = false } = {}) {
    clearTimeout(timer);
    timer = null;
    const wanted = slugOf();
    if (!keepStatus || status.value !== "ready") status.value = "loading";
    loadError.value = null;
    try {
      const rows = await authedRequest(
        `decks?slug=eq.${encodeURIComponent(wanted)}&select=*`
      );
      if (wanted !== slugOf()) return;
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        deck.value = null;
        status.value = "not-found";
        return;
      }
      deck.value = metaOf(row);
      title.value = row.title ?? "";
      entries.value = (Array.isArray(row.slides) ? row.slides : [])
        .filter(isObject)
        .map(normalizeSlide);
      savedTitle = title.value;
      savedEntries = entries.value;
      selectedId.value = entries.value.some((e) => e.id === selectedId.value)
        ? selectedId.value
        : (entries.value[0]?.id ?? null);
      undoStack.value = [];
      redoStack.value = [];
      lastKey = null;
      unsure = [];
      conflict.value = null;
      saveError.value = null;
      saveState.value = "saved";
      lastSavedAt.value = row.updated_at ? new Date(row.updated_at) : null;
      overflowIds.value = new Set();
      status.value = "ready";
    } catch (err) {
      if (wanted !== slugOf()) return;
      loadError.value = deckErrorMessage(err, "The deck couldn't load.");
      status.value = isMissingTable(err) ? "missing-table" : "error";
    }
  }

  // ── edits ────────────────────────────────────────────────────────────────
  function setTitle(t) {
    if (t === title.value) return;
    record("title");
    title.value = String(t ?? "");
    changed();
  }

  /**
   * Set `path` of slide `id`. Resolves false and changes nothing when the
   * value is already there (re-choosing the current option is not an edit)
   * or when it would give the slide an id another slide has: every lookup
   * goes by id, so the second slide could no longer be selected.
   */
  function updateEntry(id, path, value) {
    const i = entries.value.findIndex((e) => e?.id === id);
    if (i < 0 || !path) return false;
    const segments = String(path).split(".");
    if (
      path === "id" &&
      (typeof value !== "string" ||
        !value ||
        entries.value.some((e, j) => j !== i && e?.id === value))
    )
      return false;
    if (sameJson(getIn(entries.value[i], segments), value)) return false;
    record(`${id}:${path}`);
    const next = [...entries.value];
    next[i] = setIn(entries.value[i], segments, value);
    entries.value = next;
    // A renamed slide keeps its selection.
    if (path === "id" && selectedId.value === id) selectedId.value = value;
    changed();
    return true;
  }

  const update = (path, value) => updateEntry(selectedId.value, path, value);

  function setEntries(next) {
    record();
    entries.value = next;
    changed();
  }

  /** Add `entry` after the slide `after` (default the end); returns its id. */
  function insert(entry, { after } = {}) {
    let copy = normalizeSlide(deepClone(entry));
    if (!copy?.id || ids().includes(copy.id))
      copy = { ...copy, id: newSlideId(ids()) };
    const at = entries.value.findIndex((e) => e?.id === after);
    const next = [...entries.value];
    next.splice(at < 0 ? next.length : at + 1, 0, copy);
    setEntries(next);
    selectedId.value = copy.id;
    return copy.id;
  }

  function duplicate(id) {
    const i = entries.value.findIndex((e) => e?.id === id);
    if (i < 0) return null;
    const copy = cloneEntry(entries.value[i], ids());
    const next = [...entries.value];
    next.splice(i + 1, 0, copy);
    setEntries(next);
    selectedId.value = copy.id;
    return copy.id;
  }

  /**
   * Remove a slide; the selection moves to the next one (or the last).
   * Returns whether a slide went (and so an undo step was recorded).
   */
  function remove(id) {
    const i = entries.value.findIndex((e) => e?.id === id);
    if (i < 0) return false;
    const next = entries.value.filter((_, j) => j !== i);
    setEntries(next);
    if (selectedId.value === id || !next.some((e) => e.id === selectedId.value))
      selectedId.value = next[Math.min(i, next.length - 1)]?.id ?? null;
    return true;
  }

  function moveTo(id, index) {
    const from = entries.value.findIndex((e) => e?.id === id);
    if (from < 0) return;
    const to = Math.min(
      Math.max(Number(index) || 0, 0),
      entries.value.length - 1
    );
    if (to === from) return;
    const next = [...entries.value];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry);
    setEntries(next);
  }

  function move(id, delta) {
    const from = entries.value.findIndex((e) => e?.id === id);
    if (from >= 0) moveTo(id, from + delta);
  }

  /** Hidden slides stay in the deck and are skipped when presenting. */
  function toggleHidden(id) {
    const entry = entries.value.find((e) => e?.id === id);
    if (!entry) return;
    record();
    const next = { ...entry };
    if (entry.hidden === true) delete next.hidden;
    else next.hidden = true;
    entries.value = entries.value.map((e) => (e === entry ? next : e));
    changed();
  }

  /** Switch a slide's layout; returns the props keys whose content went. */
  function changeLayout(id, layout) {
    const i = entries.value.findIndex((e) => e?.id === id);
    if (i < 0) return [];
    const { entry, dropped } = carryOver(entries.value[i], layout);
    const next = [...entries.value];
    next[i] = entry;
    setEntries(next);
    return dropped;
  }

  /** Returns whether any eyebrow changed (and so an undo step was recorded). */
  function renumber() {
    const next = renumberEyebrows(entries.value);
    if (next.every((e, i) => e === entries.value[i])) return false;
    setEntries(next);
    return true;
  }

  // ── publishing ───────────────────────────────────────────────────────────
  /**
   * Save, then make the working copy what funders see. Resolves to the
   * updated meta, or null when another save got there first (saveState
   * becomes 'conflict'). Throws an Error with a message to show otherwise.
   */
  async function publish() {
    if (!(await flush())) {
      if (saveState.value === "conflict") return null;
      throw new Error(saveError.value || "Save the deck before publishing.");
    }
    if (errorCount.value > 0)
      throw new Error(
        `Fix ${errorCount.value} ${errorCount.value === 1 ? "problem" : "problems"} to publish.`
      );
    const version = deck.value.version;
    try {
      const result = await authedRequest("rpc/publish_deck", {
        method: "POST",
        body: JSON.stringify({ p_id: deck.value.id, p_version: version }),
      });
      applyMeta(Array.isArray(result) ? result[0] : result);
      return deck.value;
    } catch (err) {
      if (isDeckConflict(err)) {
        // The version moved by one of this tab's own unanswered saves (now
        // counted as saved): publish what is here, at the version it made.
        // Adopting clears those saves, so this goes round once at most.
        if ((await explainNoRows(version)) === "adopted") return publish();
        return null;
      }
      throw new Error(deckErrorMessage(err, "The deck couldn't be published."));
    }
  }

  /**
   * Put the published snapshot back as the working copy (undoable: undo
   * brings the edits back and saves them again). The database copies the
   * snapshot it holds, so another tab's publish since this one loaded is
   * what comes back. Resolves false on a conflict (saveState says so);
   * throws an Error with a message to show otherwise.
   */
  async function discardUnpublished() {
    if (!deck.value?.id) return false;
    clearTimeout(timer);
    timer = null;
    while (inFlight) await inFlight;
    // A second pass only after adopting one of this tab's unanswered saves.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const n = deck.value.version;
      let row;
      try {
        const result = await authedRequest("rpc/discard_deck_changes", {
          method: "POST",
          body: JSON.stringify({ p_id: deck.value.id, p_version: n }),
        });
        row = Array.isArray(result) ? result[0] : result;
      } catch (err) {
        if (!isDeckConflict(err)) {
          if (mayHaveLanded(err)) unsure.push({ version: n, discard: true });
          throw new Error(
            deckErrorMessage(err, "The changes couldn't be discarded.")
          );
        }
        let nothingPublished = false;
        const outcome = await explainNoRows(n, {
          onSameVersion: () => {
            nothingPublished = true;
            return "none";
          },
        });
        if (nothingPublished)
          throw new Error("There is no published version to go back to.");
        if (outcome === "adopted") continue;
        return false;
      }
      if (!isObject(row)) throw new Error("The changes couldn't be discarded.");
      record();
      applyMeta(row);
      title.value = row.title ?? title.value;
      entries.value = (Array.isArray(row.slides) ? row.slides : [])
        .filter(isObject)
        .map(normalizeSlide);
      savedTitle = title.value;
      savedEntries = entries.value;
      unsure = [];
      if (!entries.value.some((e) => e.id === selectedId.value))
        selectedId.value = entries.value[0]?.id ?? null;
      saveError.value = null;
      saveState.value = "saved";
      lastSavedAt.value = row.updated_at
        ? new Date(row.updated_at)
        : new Date();
      return true;
    }
    return false;
  }

  // ── page lifecycle ───────────────────────────────────────────────────────
  if (isRef(slug) || typeof slug === "function")
    watch(slugOf, async () => {
      await flush();
      load();
    });

  if (getCurrentScope() && typeof document !== "undefined") {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (e) => {
      if (hasUnsaved() || inFlight) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    onScopeDispose(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(timer);
    });
  }

  return {
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
    setOverflow,
    saveState,
    lastSavedAt,
    saveError,
    conflict,
    dirtySincePublish,
    canUndo,
    canRedo,
    load,
    select,
    setTitle,
    update,
    updateEntry,
    insert,
    duplicate,
    remove,
    move,
    moveTo,
    toggleHidden,
    changeLayout,
    renumber,
    undo,
    redo,
    flush,
    retry,
    resolveConflict,
    publish,
    discardUnpublished,
    applyMeta,
  };
}
