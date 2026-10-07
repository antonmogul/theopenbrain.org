/*
 * Storybook fixtures for the deck editor (OPENBRAIN-129).
 *
 * Everything here is local: slides come from the bundled decks, images are
 * /publicAssets/ paths (the widget thumbnails are the ones Storybook serves),
 * and the "database" is an in-memory copy of public.decks behind
 * parameters.api (see .storybook/mocks/api-client.js). No story using these
 * makes a network request.
 *
 * Rows
 *   DECK_ROWS            full public.decks rows (slides included): the
 *                        funding deck (published, pinned, with unpublished
 *                        changes), a pitch draft and an archived talk
 *   DECK_LIST_ROWS       the same rows as the Decks list query returns them
 *                        (no slides; slide_count and first_slide instead)
 *   SHARE_ROWS           { published, pinned, draft }: rows for DeckShareDialog
 *   IMAGE_LIBRARY        media library rows (animations, media_type image)
 *
 * Problems
 *   BROKEN_DECK          the funding deck with a missing title, a repeated
 *                        name, a lead that runs long, and a hidden slide
 *                        that leaves the later eyebrows numbered wrong
 *   BROKEN_DECK_PROBLEMS validateDeck(BROKEN_DECK) plus one overflow warning
 *   problemsBySlide(p)   { [slideId]: { errors, warnings } } counts, the shape
 *                        DeckSlideRail's problemsById takes
 *
 * API (each call returns a fresh parameters.api object)
 *   decksApi(options)    in-memory decks: list, load by slug, create, PATCH
 *                        with the version guard, delete, publish_deck,
 *                        discard_deck_changes, set_pinned_deck,
 *                        get_pinned_deck, get_shared_deck and
 *                        the image library. options: { decks, conflict,
 *                        library }; `conflict: true` makes the first slides
 *                        save lose to "another tab", for the conflict dialog
 *   decksApiLoading()    every decks request stays pending
 *   decksApiError()      every decks request fails with a 500
 *   decksApiMissingTable() the table isn't there yet (404, PGRST205)
 *   creatorParameters(api)  { auth: signed-in creator, api }
 *
 * Helpers
 *   setAtPath(obj, path, value)  an immutable set at an editor path
 *                        ("props.people.2.name"); `undefined` removes the key.
 *                        Story harnesses use it to apply `update` events.
 */
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { deepClone, validateDeck } from "@/data/decks/validate.js";

/** Images Storybook serves (its staticDirs), for stories that show one. */
export const STORY_IMAGES = {
  phrenology: "/publicAssets/images/widgets/thumbs/phrenology.jpg",
  colourVision: "/publicAssets/images/widgets/thumbs/color-vision.jpg",
  caseCabinet: "/publicAssets/images/widgets/thumbs/case-cabinet.jpg",
};

const template = (id) => deepClone(DECK_TEMPLATES.find((e) => e.id === id));

// ── rows ─────────────────────────────────────────────────────────────────
const FUNDING_TITLE = "The Open Brain — Funding deck";

const fundingRow = {
  id: "0b7e9a52-1c34-4f0e-9d1a-5b2e6c7f8a90",
  slug: "funding",
  title: FUNDING_TITLE,
  kind: "funding",
  status: "published",
  schema_version: 1,
  slides: deepClone(FUNDING_DECK),
  version: 5,
  published_slides: deepClone(FUNDING_DECK),
  published_title: FUNDING_TITLE,
  published_version: 4,
  published_at: "2026-10-07T14:02:00.000Z",
  share_token: "4f1c0a9e2b7d4c6f8a3e5d1b9c0f2a7e",
  pinned: true,
  module_id: null,
  created_at: "2026-10-07T09:00:00.000Z",
  updated_at: "2026-10-07T15:20:00.000Z",
};

const pitchSlides = [
  {
    id: "s-1a2b3c4d",
    label: "Title",
    layout: "hero",
    props: {
      brand: true,
      size: "display",
      title: "Open Brain at SfN",
      lead: "A free, interactive neuroscience textbook — and the platform behind it.",
      image: { src: STORY_IMAGES.phrenology, alt: "A phrenology bust" },
    },
  },
  { ...template("t4-three-columns"), id: "s-5e6f7a8b", label: "Three ideas" },
  { ...template("t6-statement"), id: "s-9c0d1e2f", label: "Statement" },
].map((e) => ({ ...e, label: e.label.replace(/^T\d+ · /, "") }));

const pitchRow = {
  id: "5d2c8e14-7a9b-4c3d-8e2f-1a0b9c8d7e6f",
  slug: "sfn-2026-pitch",
  title: "SfN 2026 pitch",
  kind: "pitch",
  status: "draft",
  schema_version: 1,
  slides: pitchSlides,
  version: 3,
  published_slides: null,
  published_title: null,
  published_version: null,
  published_at: null,
  share_token: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  pinned: false,
  module_id: null,
  created_at: "2026-10-05T10:00:00.000Z",
  updated_at: "2026-10-06T16:45:00.000Z",
};

const talkRow = {
  id: "9f8e7d6c-5b4a-4392-8170-6f5e4d3c2b1a",
  slug: "mni-seminar",
  title: "MNI seminar — reading with figures",
  kind: "talk",
  status: "archived",
  schema_version: 1,
  slides: [template("t1-section"), template("t2-text")].map((e) => ({
    ...e,
    label: e.label.replace(/^T\d+ · /, ""),
  })),
  version: 2,
  published_slides: null,
  published_title: null,
  published_version: null,
  published_at: null,
  share_token: "0f1e2d3c4b5a69788796a5b4c3d2e1f0",
  pinned: false,
  module_id: null,
  created_at: "2026-09-12T13:00:00.000Z",
  updated_at: "2026-09-20T08:30:00.000Z",
};

export const DECK_ROWS = [fundingRow, pitchRow, talkRow];

const LIST_KEYS = [
  "id",
  "slug",
  "title",
  "kind",
  "status",
  "version",
  "published_version",
  "published_at",
  "updated_at",
  "pinned",
  "share_token",
];
const listRow = (row) => ({
  ...Object.fromEntries(LIST_KEYS.map((k) => [k, row[k]])),
  slide_count: row.slides.length,
  first_slide: row.slides[0] ?? null,
});

export const DECK_LIST_ROWS = DECK_ROWS.map(listRow);

const withoutSlides = ({ slides, published_slides, ...row }) => row; // eslint-disable-line no-unused-vars

export const SHARE_ROWS = {
  published: { ...withoutSlides(fundingRow), pinned: false },
  pinned: withoutSlides(fundingRow),
  draft: withoutSlides(pitchRow),
};

export const IMAGE_LIBRARY = [
  {
    id: "img-phrenology",
    title: "Phrenology bust",
    animation_key: "image-phrenology",
    media_type: "image",
    image_file_url: STORY_IMAGES.phrenology,
  },
  {
    id: "img-colour",
    title: "Colour vision widget",
    animation_key: "image-colour-vision",
    media_type: "image",
    image_file_url: STORY_IMAGES.colourVision,
  },
  {
    id: "img-cabinet",
    title: "Case cabinet",
    animation_key: "image-case-cabinet",
    media_type: "image",
    image_file_url: STORY_IMAGES.caseCabinet,
  },
];

// ── problems ─────────────────────────────────────────────────────────────
export const BROKEN_DECK = (() => {
  const deck = deepClone(FUNDING_DECK);
  const byId = (id) => deck.find((e) => e.id === id);
  byId("team").props.title = "";
  byId("team").props.people[4].name = "Sonia";
  byId("team").props.people[3].name = "Sonia";
  byId("textbook-today").hidden = true;
  byId("finishing").props.lead =
    "We would welcome a conversation about philanthropic support to bring the remaining 24 chapters to every student, free, in every country, in every language, for as long as there are students.";
  return deck;
})();

export const BROKEN_DECK_PROBLEMS = [
  ...validateDeck(BROKEN_DECK),
  {
    slideId: "finishing",
    path: "",
    level: "warn",
    code: "W_OVERFLOW",
    message: "Text runs off the slide.",
  },
];

export function problemsBySlide(problems) {
  const out = {};
  for (const p of problems) {
    if (!p.slideId) continue;
    out[p.slideId] ??= { errors: 0, warnings: 0 };
    if (p.level === "error") out[p.slideId].errors += 1;
    else out[p.slideId].warnings += 1;
  }
  return out;
}

// ── helpers ──────────────────────────────────────────────────────────────
const isIndex = (k) => /^\d+$/.test(k);

export function setAtPath(target, path, value) {
  const keys = String(path).split(".");
  const copy = (v, nextKey) =>
    Array.isArray(v)
      ? [...v]
      : v && typeof v === "object"
        ? { ...v }
        : isIndex(nextKey)
          ? []
          : {};
  const root = copy(target, keys[0]);
  let node = root;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      if (value === undefined && !Array.isArray(node)) delete node[key];
      else node[key] = value;
      return;
    }
    node[key] = copy(node[key], keys[i + 1]);
    node = node[key];
  });
  return root;
}

// ── in-memory API ────────────────────────────────────────────────────────
function parse(endpoint) {
  const [table, query = ""] = String(endpoint).split("?");
  const params = new URLSearchParams(query);
  const filters = [];
  let select = "*";
  let order = null;
  for (const [key, value] of params) {
    if (key === "select") select = value;
    else if (key === "order") order = value;
    else filters.push([key, value]);
  }
  return { table, select, order, filters, params };
}

const matches = (row, filters) =>
  filters.every(([key, value]) =>
    value.startsWith("eq.") ? String(row[key]) === value.slice(3) : true
  );

// slide_count is a generated column in public.decks: computed here too.
const withGenerated = (row) => ({
  ...row,
  slide_count: Array.isArray(row.slides) ? row.slides.length : 0,
});

function project(stored, select) {
  const row = withGenerated(stored);
  if (select === "*") return deepClone(row);
  const out = {};
  for (const part of select.split(",")) {
    const [alias, expr] = part.includes(":") ? part.split(":") : [part, part];
    const [column, index] = expr.split("->");
    out[alias] =
      index !== undefined
        ? (row[column]?.[Number(index)] ?? null)
        : deepClone(row[column] ?? null);
  }
  return out;
}

const bodyOf = (options) =>
  typeof options?.body === "string" ? JSON.parse(options.body) : {};

const apiError = (status, response) =>
  Object.assign(new Error(`API Error ${status}: ${response}`), {
    status,
    response,
  });

const publicSlides = (slides) =>
  (slides || []).filter((e) => e?.hidden !== true).map(({ notes, ...e }) => e); // eslint-disable-line no-unused-vars

const publicDeck = (row) =>
  row && {
    slug: row.slug,
    title: row.published_title ?? row.title,
    kind: row.kind,
    published_at: row.published_at,
    slides: publicSlides(row.published_slides),
  };

let tokenSeed = 0;
const storyToken = () =>
  (++tokenSeed).toString(16).padStart(8, "0").repeat(4).slice(0, 32);

export function decksApi({
  decks = DECK_ROWS,
  conflict = false,
  library = IMAGE_LIBRARY,
} = {}) {
  let rows = deepClone(decks);
  let conflictPending = conflict;
  const stamp = () => new Date().toISOString();

  function decksTable(endpoint, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const { select, order, filters } = parse(endpoint);
    const hit = rows.filter((r) => matches(r, filters));

    if (method === "GET") {
      const list = order?.startsWith("updated_at.desc")
        ? [...hit].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        : hit;
      return list.map((r) => project(r, select));
    }

    if (method === "POST") {
      const body = bodyOf(options);
      if (rows.some((r) => r.slug === body.slug))
        throw apiError(409, '{"code":"23505","message":"duplicate key"}');
      const row = {
        id: `story-${body.slug}`,
        kind: "funding",
        status: "draft",
        schema_version: 1,
        slides: [],
        version: 1,
        published_slides: null,
        published_title: null,
        published_version: null,
        published_at: null,
        share_token: storyToken(),
        pinned: false,
        module_id: null,
        created_at: stamp(),
        updated_at: stamp(),
        ...body,
      };
      rows = [row, ...rows];
      return [project(row, select)];
    }

    if (method === "PATCH") {
      const body = bodyOf(options);
      // "Another tab" saves first: the guard misses and the editor asks.
      if (conflictPending && "slides" in body && hit.length) {
        conflictPending = false;
        hit.forEach((r) => {
          r.version += 1;
          r.updated_at = stamp();
        });
        return [];
      }
      hit.forEach((r) =>
        Object.assign(r, deepClone(body), { updated_at: stamp() })
      );
      return hit.map((r) => project(r, select));
    }

    if (method === "DELETE") {
      rows = rows.filter((r) => !hit.includes(r));
      return hit.map((r) => project(r, select));
    }
    return [];
  }

  return {
    "rpc/publish_deck": (_endpoint, options) => {
      const { p_id: id, p_version: version } = bodyOf(options);
      const row = rows.find((r) => r.id === id);
      if (!row || row.version !== version)
        throw apiError(400, '{"message":"deck_conflict"}');
      Object.assign(row, {
        status: "published",
        published_slides: deepClone(row.slides),
        published_title: row.title,
        published_version: row.version,
        published_at: stamp(),
      });
      return deepClone(row);
    },
    // The published snapshot back as the working copy, read from the row.
    "rpc/discard_deck_changes": (_endpoint, options) => {
      const { p_id: id, p_version: version } = bodyOf(options);
      const row = rows.find((r) => r.id === id);
      if (!row || row.version !== version || !row.published_slides)
        throw apiError(400, '{"message":"deck_conflict"}');
      Object.assign(row, {
        slides: deepClone(row.published_slides),
        title: row.published_title ?? row.title,
        version: version + 1,
        published_version: version + 1,
        updated_at: stamp(),
      });
      return withGenerated(deepClone(row));
    },
    "rpc/set_pinned_deck": (_endpoint, options) => {
      const { p_id: id } = bodyOf(options);
      const target = rows.find((r) => r.id === id);
      if (id && target?.status !== "published")
        throw apiError(400, '{"message":"deck_not_published"}');
      rows.forEach((r) => (r.pinned = r.id === id));
      return { success: true };
    },
    "rpc/get_pinned_deck": () =>
      publicDeck(
        rows.find((r) => r.pinned && r.status === "published") || null
      ),
    "rpc/get_shared_deck": (endpoint) => {
      const token = parse(endpoint).params.get("p_token");
      return publicDeck(
        rows.find((r) => r.share_token === token && r.status === "published") ||
          null
      );
    },
    "decks?": decksTable,
    "animations?": () => deepClone(library),
  };
}

const failing = (error) => {
  const fail = () => Promise.reject(error);
  return {
    "rpc/get_pinned_deck": fail,
    "rpc/get_shared_deck": fail,
    "decks?": fail,
  };
};

export const decksApiLoading = () => ({
  "decks?": () => new Promise(() => {}),
  "rpc/get_pinned_deck": () => new Promise(() => {}),
  "rpc/get_shared_deck": () => new Promise(() => {}),
});

export const decksApiError = () =>
  failing(apiError(500, '{"message":"Internal server error"}'));

export const decksApiMissingTable = () =>
  failing(
    apiError(
      404,
      '{"code":"PGRST205","message":"Could not find the table \'public.decks\' in the schema cache"}'
    )
  );

export const creatorParameters = (api = decksApi()) => ({
  auth: { authenticated: true, role: "creator", name: "Anton Morrison" },
  api,
});
