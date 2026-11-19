/*
 * Fixtures for the review widget's stories (OPENBRAIN-204): anchors as the
 * widget builds them on History and the Retina, notes in each state, and a
 * transport that never leaves the page (the story smoke fails on any
 * request that isn't to localhost).
 */
export const ANCHORS = {
  pane: {
    v: 1,
    kind: "figure-pane",
    label:
      "Fig 08 · The cell doctrine (ventricular theory), at 45% across, 40% down",
    sectionSlug: "do-different-parts",
    figureKey: "animationFoundationsFig6",
    figureNumber: "8",
    figureTitle: "The cell doctrine (ventricular theory)",
    point: { x: 0.45, y: 0.4 },
    via: "point",
  },
  plate: {
    v: 1,
    kind: "rail-figure",
    label:
      "Fig E · Piece of Descartes' skull, Lund in “Separating mind from body: Descartes and dualism”",
    boxSlug: "box-descartes",
    figureKey: "animationFoundationsFigA",
    plateIndex: 1,
    railPart: { index: 1, count: 2 },
    point: { x: 0.5, y: 0.4 },
    via: "point",
  },
  selection: {
    v: 1,
    kind: "paragraph",
    label: "¶ 2 in “Phototransduction”",
    paragraphId: "0c312cd5-5107-4931-b766-a659294a64f3",
    via: "selection",
  },
  reading: {
    v: 1,
    kind: "paragraph",
    label: "¶ 6 in “Where is my mind?”",
    paragraphId: "0651e0fe-afc6-4c6d-b5e8-ec652e15e21e",
    via: "reading",
  },
};

const base = {
  chapterSlug: "foundations-of-neuroscience",
  createdAt: "2026-11-18T14:00:00Z",
  hash: "",
  payload: { url: "http://localhost/chapter/1/foundations-of-neuroscience" },
};

export const NOTES = [
  {
    ...base,
    clientId: "r_1",
    state: "sent",
    id: "a",
    status: "done",
    type: "figure",
    label: ANCHORS.pane.label,
    note: "The legend says 1543; the woodcut is from 1503.",
    reply: "Fixed: the legend now reads 1503.",
  },
  {
    ...base,
    clientId: "r_2",
    state: "sent",
    id: "b",
    status: "question",
    type: "content",
    label: ANCHORS.selection.label,
    quote: "rods are more sensitive",
    suggestedText: "rods are about 100 times more sensitive",
    reply: "Which source should we cite for the 100?",
  },
  {
    ...base,
    clientId: "r_3",
    state: "queued",
    type: "design",
    label: ANCHORS.plate.label,
    note: "The plate's label covers the bone.",
    error: "Not sent yet. It will go when the connection is back.",
  },
  {
    ...base,
    clientId: "r_4",
    state: "sent",
    id: "c",
    status: "new",
    type: "note",
    label: "Chapter timeline, at 35% across",
    note: "Hard to see on a laptop.",
  },
];

const id = (n) => `aaaaaaaa-0000-4000-8000-00000000000${n}`;

/** list_review_feedback's rows for a chapter: notes and replies. */
export const CHAPTER_ROWS = [
  {
    id: id(1),
    parent_id: null,
    created_at: "2026-11-18T10:00:00Z",
    type: "figure",
    note: "The legend says 1543; the woodcut is from 1503.",
    anchor: { ...ANCHORS.pane, via: undefined },
    reviewer_name: "Maura",
    reviewer_role: "designer",
    status: "doing",
    reply: "Checking the source.",
  },
  {
    id: id(2),
    parent_id: id(1),
    created_at: "2026-11-18T11:00:00Z",
    type: "note",
    note: "Agreed: Reisch's Margarita philosophica is 1503.",
    anchor: {},
    reviewer_name: "Stuart Trenholm",
    reviewer_role: "author",
    status: "new",
  },
  {
    id: id(3),
    parent_id: null,
    created_at: "2026-11-18T12:00:00Z",
    type: "design",
    note: "The plate's label covers the bone.",
    anchor: ANCHORS.plate,
    reviewer_name: "Sonia",
    reviewer_role: "designer",
    status: "new",
  },
];

/** A transport that answers at once and remembers nothing. */
export const offlineTransport = {
  submit: async (p) => ({ id: `story-${p.client_id}`, status: "new" }),
  statuses: async (ids) =>
    ids.map((id) => {
      const note = NOTES.find((n) => n.id === id);
      return { id, status: note?.status || "doing", reply: note?.reply || "" };
    }),
  list: async () => CHAPTER_ROWS,
  authorAction: async (id, clientId, action) => ({
    id,
    status: action === "verify" ? "verified" : "new",
  }),
};
