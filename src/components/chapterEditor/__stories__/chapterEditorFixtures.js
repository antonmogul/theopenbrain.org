/*
 * Fixtures for the chapter block page stories (OPENBRAIN-60), in the shape
 * the page loads from Supabase: one module, its sections, paragraph rows and
 * the media library. Content is adapted from The Retina and the Attention
 * draft so every kind of block appears once.
 */
export const editorModule = {
  id: "mod-attention",
  title: "Attention and Working Memory",
  slug: "attention-and-working-memory",
  order_index: 3,
  status: "draft",
  ramp: "lear",
};

export const editorSections = [
  {
    id: "sec-story",
    module_id: editorModule.id,
    title: "The story of attention",
    slug: "story",
    order_index: 1,
  },
  {
    id: "sec-measure",
    module_id: editorModule.id,
    title: "Attention is measured behaviorally",
    // The real slug, so the Posner code placement resolves here and the page
    // offers to make it editable.
    slug: "attention-is-measured-behaviorally",
    order_index: 2,
  },
];

const row = (id, section_id, order_index, blocks, extra = {}) => ({
  id,
  section_id,
  order_index,
  content: { blocks },
  content_text: blocks
    .map((b) => (typeof b.content === "string" ? b.content : ""))
    .join("")
    .replace(/<[^>]*>/g, ""),
  is_subsection_header: false,
  subsection_level: 0,
  animation_id: null,
  animation_trigger: null,
  ...extra,
});

export const citedParagraphBlocks = [
  {
    type: "text",
    content:
      "The retina is often described in two anatomically orthogonal ways: its <em>vertical</em> organization, from photoreceptors to ganglion cells",
  },
  { type: "citation_ref", number: 12 },
  { type: "text", content: ", and its lateral organization (" },
  { type: "figure_placeholder", number: 3 },
  {
    type: "text",
    content:
      "). <span id='alcmeon' class='hoverImg'>Alcmeon</span> was the first to describe the optic nerve.",
  },
];

export const editorParagraphs = [
  row("p-1", "sec-story", 0, citedParagraphBlocks, {
    animation_id: "anim-lateral",
    animation_trigger: "scroll",
  }),
  row("p-2", "sec-story", 1, [
    { type: "heading", level: 3, content: "The cocktail party problem" },
  ]),
  row("p-3", "sec-story", 2, [
    {
      type: "image",
      src: "GABAergic",
      caption:
        "For a given starburst amacrine cell, its distal processes release GABA.",
      closed: true,
    },
  ]),
  row("p-4", "sec-measure", 0, [
    {
      type: "widget",
      widgetId: "sdt",
      kind: "breakout",
      title: "Signal Detection Theory",
      blurb: "Drag the criterion, adjust d′, and watch the ROC curve respond.",
      credit: "Arjun Krishnaswamy",
      placementId: "attention-sdt",
      route: "/sdt",
    },
  ]),
  row("p-6", "sec-measure", 2, [
    {
      type: "text",
      content:
        "The spatial cueing paradigm introduced by Michael Posner in 1980 measures how a cue shifts attention.",
    },
  ]),
  row("p-5", "sec-measure", 1, [
    {
      type: "footnote",
      number: 4,
      content: "Posner, M. I. Orienting of attention. (1980).",
    },
  ]),
];

export const editorMedia = [
  {
    id: "anim-lateral",
    title: "Lateral organization",
    animation_key: "animationLatteralOrganization",
    media_type: "lottie",
  },
];

/** parameters.api for a story of the whole page. */
export const editorApi = {
  "modules?": [editorModule],
  "sections?": editorSections,
  "paragraphs?": editorParagraphs,
  "animations?": editorMedia,
};

/*
 * A tiny in-memory PostgREST for stories (OPENBRAIN-70): reads, inserts,
 * updates and deletes against copies of the fixtures above, so edits made in
 * a story show up the way they would against Supabase. Understands the
 * filters the chapter page uses: col=eq.x, col=in.(a,b), order=col.asc.
 * Each call returns a fresh store, so stories don't share edits.
 */
export function memoryEditorApi(seed = {}) {
  const tables = {
    modules: structuredClone(seed.modules || [editorModule]),
    sections: structuredClone(seed.sections || editorSections),
    paragraphs: structuredClone(seed.paragraphs || editorParagraphs),
    animations: structuredClone(seed.animations || editorMedia),
  };
  let n = 0;
  const parse = (endpoint) => {
    const [table, query = ""] = endpoint.split("?");
    const filters = [];
    let order = null;
    for (const part of query.split("&")) {
      const [col, raw] = part.split("=");
      if (!col || raw === undefined || col === "select") continue;
      if (col === "order") {
        order = raw.split(".")[0];
        continue;
      }
      const [op, ...rest] = raw.split(".");
      const val = decodeURIComponent(rest.join("."));
      // Stories have no route params, so e.g. slug=eq.undefined: match all.
      if (val === "undefined") continue;
      if (op === "eq") filters.push((r) => String(r[col]) === val);
      if (op === "in") {
        const set = new Set(
          val
            .replace(/^\(|\)$/g, "")
            .split(",")
            .map((v) => v.replace(/^"|"$/g, ""))
        );
        filters.push((r) => set.has(String(r[col])));
      }
    }
    return { table, match: (r) => filters.every((f) => f(r)), order };
  };
  const handler = (endpoint, options = {}) => {
    const { table, match, order } = parse(endpoint);
    const rows = tables[table];
    if (!rows) return [];
    const method = (options.method || "GET").toUpperCase();
    if (method === "GET") {
      const out = rows.filter(match);
      return order ? out.sort((a, b) => (a[order] > b[order] ? 1 : -1)) : out;
    }
    if (method === "POST") {
      const body = JSON.parse(options.body);
      const added = (Array.isArray(body) ? body : [body]).map((r) => ({
        id: r.id || `${table}-new-${++n}`,
        ...r,
      }));
      rows.push(...added);
      return added;
    }
    if (method === "PATCH") {
      const body = JSON.parse(options.body);
      const hit = rows.filter(match);
      hit.forEach((r) => Object.assign(r, body));
      return hit;
    }
    if (method === "DELETE") {
      const hit = rows.filter(match);
      tables[table] = rows.filter((r) => !match(r));
      return hit;
    }
    return [];
  };
  // Storybook deep-merges a story's parameters with the file's, so the
  // store takes over editorApi's "table?" keys as well as bare "table" (POST).
  const api = {};
  for (const t of Object.keys(tables)) api[`${t}?`] = api[t] = handler;
  return api;
}
