/*
 * useReviewFeedback — the reviewers' notes, queue first (OPENBRAIN-204).
 *
 * The authors and designers review a chapter in place (the review widget,
 * components/review/). Every note is written to this browser first
 * (localStorage `ob.review.queue`) and sent after, through the
 * SECURITY DEFINER RPC `submit_review_feedback` (OPENBRAIN-203), so
 * nothing is lost to a dropped connection or a database that isn't ready:
 * a note that fails stays queued and goes again on the next send, when
 * the browser comes back online, or when the widget opens. The RPC
 * upserts on `client_id`, so a retry after a lost reply returns the same
 * row. "My notes" asks `review_feedback_status` for the status and reply
 * of the notes this browser sent (ids are unguessable: knowing one is the
 * right to its status).
 *
 * Module scope, like useAuth: one queue for the page. The transport is
 * swappable (setReviewTransport) for tests and stories, which must never
 * reach the network.
 *
 * Kinetix's Colab (evolving-web, js/colab/store.js) is the model; its
 * Asana back end is not: the book has no server, so notes live in Supabase.
 */
import { computed, ref } from "vue";
import { REVIEW_STATUSES } from "@/helper/reviewNotes.mjs";
import { apiRequest, isApiConfigured } from "@/services/api/client";

export const REVIEW_KEYS = Object.freeze({
  identity: "ob.review.identity",
  queue: "ob.review.queue",
  off: "ob.review.off",
});

export const REVIEW_TYPES = Object.freeze([
  {
    value: "content",
    label: "Text",
    hint: "Wording: what it says now and what it should say",
  },
  {
    value: "figure",
    label: "Figure",
    hint: "A figure, its legend or its labels",
  },
  { value: "widget", label: "Widget", hint: "An interactive" },
  { value: "design", label: "Design", hint: "Layout, colour, type, motion" },
  { value: "bug", label: "Bug", hint: "Something broken" },
  { value: "note", label: "Note", hint: "Anything else" },
]);

export const REVIEW_ROLES = Object.freeze([
  { value: "author", label: "Author" },
  { value: "designer", label: "Designer" },
  { value: "reviewer", label: "Reviewer" },
  { value: "other", label: "Other" },
]);

/** The database's statuses, as "My notes" names them. */
export const REVIEW_STATUS_LABELS = Object.freeze(
  Object.fromEntries(REVIEW_STATUSES.map((s) => [s.value, s.label]))
);

/** The caps the RPC enforces (OPENBRAIN-203), checked here first. */
export const REVIEW_LIMITS = Object.freeze({
  note: 4000,
  quote: 2000,
  suggested: 4000,
  name: 80,
  anchorBytes: 16 * 1024,
});

/* ── The kill switch ─────────────────────────────────────────────────── */

/**
 * Whether the widget shows: on unless the build says VITE_REVIEW_WIDGET=off
 * or this browser was given `?review=off` (kept until `?review=on`).
 * Pure: `env` is the build's value, `search` the URL's query string,
 * `storage` a localStorage-like object (or null).
 */
export function reviewWidgetEnabled({ env, search = "", storage = null } = {}) {
  if (String(env || "").toLowerCase() === "off") return false;
  let asked = null;
  try {
    asked = new URLSearchParams(search).get("review");
  } catch {
    asked = null;
  }
  if (asked === "off") {
    try {
      storage?.setItem(REVIEW_KEYS.off, "1");
    } catch {
      // private mode: off for this page only
    }
    return false;
  }
  if (asked === "on") {
    try {
      storage?.removeItem(REVIEW_KEYS.off);
    } catch {
      // ignore
    }
    return true;
  }
  try {
    return storage?.getItem(REVIEW_KEYS.off) !== "1";
  } catch {
    return true;
  }
}

/* ── Storage ─────────────────────────────────────────────────────────── */

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readJSON(key, fallback) {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    storage()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** A client id for the queue: unique per note, stable across retries. */
export function newClientId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return `r_${c.randomUUID()}`;
  return `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/* ── The payload ─────────────────────────────────────────────────────── */

const clip = (value, max) => {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
};

/** Byte length of a string as UTF-8. */
function utf8Bytes(s) {
  try {
    return new TextEncoder().encode(s).length;
  } catch {
    return s.length;
  }
}

/**
 * The anchor, small enough for the RPC's 16 KB cap: the excerpt and the
 * selector go first if it is ever too big.
 */
export function fitAnchor(anchor) {
  if (!anchor) return {};
  let out = { ...anchor };
  if (utf8Bytes(JSON.stringify(out)) <= REVIEW_LIMITS.anchorBytes) return out;
  out = { ...out, textExcerpt: String(out.textExcerpt || "").slice(0, 80) };
  if (utf8Bytes(JSON.stringify(out)) <= REVIEW_LIMITS.anchorBytes) return out;
  const { selector, ...rest } = out; // eslint-disable-line no-unused-vars
  return rest;
}

/**
 * What the reviewer has to give: a note, or both the current and the
 * suggested text. A list of problems ([] when it can be sent).
 */
export function reviewProblems({ note, quote, suggestedText } = {}) {
  const problems = [];
  const hasNote = !!String(note || "").trim();
  const hasEdit =
    !!String(quote || "").trim() && !!String(suggestedText || "").trim();
  if (!hasNote && !hasEdit)
    problems.push("Write a note, or the current and the suggested text.");
  if (String(note || "").length > REVIEW_LIMITS.note)
    problems.push(`The note is over ${REVIEW_LIMITS.note} characters.`);
  if (String(suggestedText || "").length > REVIEW_LIMITS.suggested)
    problems.push(
      `The suggested text is over ${REVIEW_LIMITS.suggested} characters.`
    );
  return problems;
}

/**
 * The RPC's `p` for a note: the shared contract's columns, capped. `env`
 * is { url, viewport, userAgent } (pageEnv() reads them).
 */
export function buildReviewPayload(
  { type, note, quote, suggestedText, anchor, chapterSlug, clientId, parentId },
  identity,
  env = {}
) {
  const kind = REVIEW_TYPES.some((t) => t.value === type) ? type : "note";
  const fitted = fitAnchor(anchor);
  return {
    client_id: clientId,
    // A reply to another note (the "All notes" thread); absent otherwise.
    ...(isUuid(parentId) ? { parent_id: parentId } : {}),
    chapter_slug: chapterSlug,
    section_slug: fitted.sectionSlug || fitted.boxSlug || null,
    paragraph_id: isUuid(fitted.paragraphId) ? fitted.paragraphId : null,
    type: kind,
    note: clip(note, REVIEW_LIMITS.note),
    quote: clip(quote, REVIEW_LIMITS.quote),
    suggested_text: clip(suggestedText, REVIEW_LIMITS.suggested),
    anchor: fitted,
    reviewer_name: clip(identity?.name, REVIEW_LIMITS.name),
    reviewer_role: REVIEW_ROLES.some((r) => r.value === identity?.role)
      ? identity.role
      : "reviewer",
    url: clip(env.url, 2000),
    viewport: clip(env.viewport, 80),
    user_agent: clip(env.userAgent, 400),
  };
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

/** The page's URL, viewport ("1440×900 @2x") and user agent. */
export function pageEnv(win = globalThis.window) {
  if (!win) return {};
  const dpr = win.devicePixelRatio || 1;
  return {
    url: win.location?.href || "",
    viewport: `${win.innerWidth}×${win.innerHeight}${dpr !== 1 ? ` @${Math.round(dpr * 100) / 100}x` : ""}`,
    userAgent: win.navigator?.userAgent || "",
  };
}

/** The RPC's error code ("review_rate_limited", "review_invalid") from an
 *  apiRequest error, or "" for anything else (offline, 404 before 203). */
export function reviewErrorCode(err) {
  const raw = `${err?.response || ""} ${err?.message || ""}`;
  const m = /review_[a-z_]+/.exec(raw);
  return m ? m[0] : "";
}

/* ── The transport ───────────────────────────────────────────────────── */

const defaultTransport = {
  configured: () => isApiConfigured(),
  submit: (p) =>
    apiRequest("rpc/submit_review_feedback", {
      method: "POST",
      body: JSON.stringify({ p }),
    }),
  statuses: (ids) =>
    apiRequest(
      `rpc/review_feedback_status?p_ids=${encodeURIComponent(`{${ids.join(",")}}`)}`,
      { method: "GET" }
    ),
  authorAction: (id, clientId, action, note) =>
    apiRequest("rpc/review_feedback_author_action", {
      method: "POST",
      body: JSON.stringify({
        p_id: id,
        p_client_id: clientId,
        p_action: action,
        p_note: note || null,
      }),
    }),
  // Stable, so a GET, like the deck RPCs (and never on page load: the
  // widget asks only when its panel opens on "All notes").
  list: (chapter, since = null) =>
    apiRequest(
      `rpc/list_review_feedback?p_chapter=${encodeURIComponent(chapter)}${
        since ? `&p_since=${encodeURIComponent(since)}` : ""
      }`,
      { method: "GET" }
    ),
};
let transport = defaultTransport;

/** Swap the network for tests and stories; null puts the real one back. */
export function setReviewTransport(next) {
  transport = next ? { configured: () => true, ...next } : defaultTransport;
}

/* ── Module state ────────────────────────────────────────────────────── */

const identity = ref(readJSON(REVIEW_KEYS.identity, null));
const queue = ref(readJSON(REVIEW_KEYS.queue, []));
const syncing = ref(false);
const lastError = ref("");
let syncPromise = null;
let listening = false;
let statusRevision = 0;

function saveQueue() {
  writeJSON(REVIEW_KEYS.queue, queue.value);
}

function update(clientId, patch) {
  queue.value = queue.value.map((r) =>
    r.clientId === clientId ? { ...r, ...patch } : r
  );
  saveQueue();
}

/** Re-read storage (another tab, a test). */
export function reloadReviewState() {
  identity.value = readJSON(REVIEW_KEYS.identity, null);
  queue.value = readJSON(REVIEW_KEYS.queue, []);
  lastError.value = "";
}

/**
 * Send every note that hasn't gone yet, one at a time. Resolves to the
 * number sent. A rate limit stops the round; any other failure marks the
 * note and moves on (it goes again next time).
 */
export function syncReviewQueue() {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    const pending = queue.value.filter((r) => r.state === "queued");
    if (!pending.length || !transport.configured()) return 0;
    syncing.value = true;
    lastError.value = "";
    let sent = 0;
    try {
      for (const rec of pending) {
        try {
          const res = await transport.submit(rec.payload);
          const row = Array.isArray(res) ? res[0] : res;
          update(rec.clientId, {
            state: "sent",
            id: row?.id || rec.id || null,
            status: row?.status || "new",
            sentAt: new Date().toISOString(),
            error: "",
          });
          sent += 1;
        } catch (err) {
          const code = reviewErrorCode(err);
          const message =
            code === "review_rate_limited"
              ? "Too many notes in an hour. It will go later."
              : code === "review_invalid"
                ? "The database turned this note down."
                : "Not sent yet. It will go when the connection is back.";
          update(rec.clientId, {
            state: code === "review_invalid" ? "rejected" : "queued",
            attempts: (rec.attempts || 0) + 1,
            error: message,
          });
          lastError.value = message;
          if (code === "review_rate_limited") break;
        }
      }
    } finally {
      syncing.value = false;
    }
    return sent;
  })().finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}

/** Ask the database for the status and reply of the notes sent from here. */
export async function refreshReviewStatuses() {
  const ids = queue.value
    .filter((r) => r.state === "sent" && r.id)
    .map((r) => r.id)
    .slice(-200);
  if (!ids.length || !transport.configured()) return 0;
  const revision = statusRevision;
  let rows;
  try {
    rows = await transport.statuses(ids);
  } catch (err) {
    lastError.value = "Couldn't check the notes' status just now.";
    return 0;
  }
  // A slow GET must not undo an author action that completed meanwhile.
  if (revision !== statusRevision) return 0;
  const byId = new Map((Array.isArray(rows) ? rows : []).map((r) => [r.id, r]));
  queue.value = queue.value.map((r) => {
    const row = r.id && byId.get(r.id);
    return row
      ? {
          ...r,
          status: row.status || r.status,
          reply: row.reply || "",
          repliedAt: row.replied_at || null,
          updatedAt: row.updated_at || null,
          verifiedAt: row.verified_at || null,
        }
      : r;
  });
  saveQueue();
  return byId.size;
}

/** Only a sent queue record carries proof of authorship; list rows never do. */
export async function reviewAuthorAction(id, action, note = null) {
  const own = queue.value.find((r) => r.id === id && r.state === "sent");
  if (!own?.clientId) throw new Error("Use the browser that sent this note.");
  if (action === "reopen" && !String(note || "").trim())
    throw new Error("Add a comment about what still needs changing.");
  let row;
  try {
    const res = await transport.authorAction(id, own.clientId, action, note);
    row = Array.isArray(res) ? res[0] : res;
    if (!row?.status) throw new Error("Missing status");
  } catch (err) {
    throw new Error(
      reviewErrorCode(err) === "review_rate_limited"
        ? "Too many changes this hour. Please try again later."
        : "The change couldn't be saved. Check for replies, then try again."
    );
  }
  statusRevision++;
  update(own.clientId, {
    status: row.status,
    reply: row.reply || "",
    repliedAt: row.replied_at || null,
    updatedAt: row.updated_at || null,
    verifiedAt: row.verified_at || null,
  });
  chapterNotes.value = chapterNotes.value.map((n) =>
    n.id === id ? { ...n, ...row } : n
  );
  if (action === "reopen" && chapterNotes.value.length)
    await fetchChapterReviewNotes(own.chapterSlug);
  return true;
}

/* ── Everyone's notes (the "All notes" view) ─────────────────────────── */

/**
 * The chapter's rows as threads: the notes (no parent), oldest first, each
 * with its replies (rows whose parent_id is the note's id) in order, then
 * grouped by the place's section (a box counts as its own group).
 * Returns [{ key, notes: [{ ...row, replies: [...] }] }] in reading order
 * of first appearance. `order(key)` may rank the groups (the page's
 * section order); unknown keys go last.
 */
export function threadReviewNotes(rows = [], order = null) {
  const byTime = (a, b) =>
    String(a.created_at || "").localeCompare(String(b.created_at || ""));
  const list = (Array.isArray(rows) ? rows : []).slice().sort(byTime);
  const ids = new Set(list.map((r) => r.id));
  const replies = new Map();
  const notes = [];
  for (const row of list) {
    if (row.parent_id && ids.has(row.parent_id)) {
      if (!replies.has(row.parent_id)) replies.set(row.parent_id, []);
      replies.get(row.parent_id).push(row);
    } else notes.push(row);
  }
  const groups = new Map();
  for (const note of notes) {
    const a = note.anchor || {};
    const key = a.boxSlug || a.sectionSlug || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...note, replies: replies.get(note.id) || [] });
  }
  const out = [...groups].map(([key, items]) => ({ key, notes: items }));
  if (order) {
    const rank = (k) => {
      const r = order(k);
      return r === undefined || r === null || r < 0 ? Infinity : r;
    };
    out.sort((x, y) => rank(x.key) - rank(y.key));
  }
  return out;
}

const chapterNotes = ref([]);
const listing = ref(false);
const listError = ref("");

/** Fetch every note and reply on a chapter (GET). Resolves to the rows. */
export async function fetchChapterReviewNotes(chapterSlug) {
  if (!chapterSlug || !transport.configured() || !transport.list) return [];
  listing.value = true;
  listError.value = "";
  try {
    const rows = await transport.list(chapterSlug);
    chapterNotes.value = Array.isArray(rows) ? rows : [];
  } catch {
    listError.value = "Couldn't load the notes just now.";
  } finally {
    listing.value = false;
  }
  return chapterNotes.value;
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("online", () => void syncReviewQueue());
  window.addEventListener("storage", (e) => {
    if (e.key === REVIEW_KEYS.queue || e.key === REVIEW_KEYS.identity)
      reloadReviewState();
  });
}

/** For tests: forget the module's state and storage listeners' effects. */
export function resetReviewForTests() {
  identity.value = null;
  queue.value = [];
  syncing.value = false;
  lastError.value = "";
  syncPromise = null;
  chapterNotes.value = [];
  listError.value = "";
  try {
    storage()?.removeItem(REVIEW_KEYS.identity);
    storage()?.removeItem(REVIEW_KEYS.queue);
  } catch {
    // ignore
  }
}

export function useReviewFeedback() {
  listen();

  function setIdentity({ name, role }) {
    const rec = {
      name: String(name || "")
        .trim()
        .slice(0, REVIEW_LIMITS.name),
      role: REVIEW_ROLES.some((r) => r.value === role) ? role : "reviewer",
    };
    if (!rec.name) return null;
    identity.value = rec;
    writeJSON(REVIEW_KEYS.identity, rec);
    return rec;
  }

  function forgetIdentity() {
    identity.value = null;
    try {
      storage()?.removeItem(REVIEW_KEYS.identity);
    } catch {
      // ignore
    }
  }

  /**
   * Queue a note and start sending it. Returns the queued record, or
   * { problems } when there is nothing to send.
   */
  function submit(draft, env = pageEnv()) {
    const problems = reviewProblems(draft);
    if (problems.length) return { problems };
    if (!identity.value?.name) return { problems: ["Say who you are first."] };
    const clientId = newClientId();
    const payload = buildReviewPayload(
      { ...draft, clientId },
      identity.value,
      env
    );
    const rec = {
      clientId,
      state: "queued",
      createdAt: new Date().toISOString(),
      chapterSlug: draft.chapterSlug,
      type: payload.type,
      label: draft.anchor?.label || "",
      note: payload.note || "",
      quote: payload.quote || "",
      suggestedText: payload.suggested_text || "",
      hash: draft.hash || "",
      parentId: payload.parent_id || null,
      payload,
      attempts: 0,
    };
    queue.value = [...queue.value, rec];
    saveQueue();
    void syncReviewQueue();
    return rec;
  }

  /** Take a note out of the queue (only one that hasn't been sent). */
  function discard(clientId) {
    queue.value = queue.value.filter(
      (r) => r.clientId !== clientId || r.state === "sent"
    );
    saveQueue();
  }

  const pendingCount = computed(
    () => queue.value.filter((r) => r.state === "queued").length
  );

  return {
    identity,
    queue,
    syncing,
    lastError,
    pendingCount,
    awaitingCheckCount: computed(
      () =>
        queue.value.filter(
          (r) => r.state === "sent" && !r.parentId && r.status === "done"
        ).length
    ),
    authorAction: reviewAuthorAction,
    setIdentity,
    forgetIdentity,
    submit,
    discard,
    sync: syncReviewQueue,
    refreshStatuses: refreshReviewStatuses,
    chapterNotes,
    listing,
    listError,
    fetchChapterNotes: fetchChapterReviewNotes,
  };
}
