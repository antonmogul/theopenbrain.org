/** Export the PUBLISHED History chapter as the complete-reader fixture.
 *
 * The admin (the database) is History's source of truth, so the fixture the
 * History browser lane tests is a dated export of what readers get, not a
 * reconstruction from migrations.
 *
 *   npm run history:fixture:export   # refresh the committed fixture
 *   npm run history:fixture:drift    # report drift from live, exit 1 on any
 *   node scripts/history-full-reader-export.mjs [--check] [--env <path to .env>]
 *
 * Reads only: GET requests with the publishable key, the reads the reader
 * makes (modules, sections, paragraphs, animations, the chapter's references
 * and any uploaded widget a figure names). It never writes to a database.
 * The URL and key come from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 * in the environment, else from the file given with --env, else from ./.env.
 * Neither value is printed or written to the fixture.
 *
 * It needs the network and the key, so it is a local command, never a CI step:
 * CI checks the committed fixture's shape (historyFullReaderFixture.test.js).
 * See docs/architecture/history-fixture.md.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import prettier from "prettier";

const SLUG = "foundations-of-neuroscience";
const TARGET = "src/stories/historyFullReaderData.json";
// Row bookkeeping the reader never renders. Everything else is exported, so a
// column a later migration adds reaches the fixture without a change here.
const DROPPED = new Set([
  "created_at",
  "updated_at",
  "created_by",
  "content_version_id",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const args = process.argv.slice(2);
const check = args.includes("--check");
const envFlag = args.indexOf("--env");
const envPath = envFlag >= 0 ? args[envFlag + 1] : null;
assert(envFlag < 0 || envPath, "--env needs a path");

async function settings() {
  const read = (source) =>
    source.VITE_SUPABASE_URL &&
    (source.VITE_SUPABASE_PUBLISHABLE_KEY || source.VITE_SUPABASE_ANON_KEY)
      ? {
          url: source.VITE_SUPABASE_URL.replace(/\/+$/, ""),
          key:
            source.VITE_SUPABASE_PUBLISHABLE_KEY ||
            source.VITE_SUPABASE_ANON_KEY,
        }
      : null;
  const fromProcess = read(process.env);
  if (fromProcess) return fromProcess;
  const file = envPath || ".env";
  assert(
    existsSync(file),
    `Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or pass --env <path>: no ${file}`
  );
  const parsed = {};
  for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match)
      parsed[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  const fromFile = read(parsed);
  assert(
    fromFile,
    `${file} has no VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY`
  );
  return fromFile;
}

const { url, key } = await settings();
assert(
  !/^(sb_secret_|service_role)/.test(key),
  "Use the publishable key, never a secret key"
);

/** The only request this script makes: a read. */
async function get(query) {
  const table = query.split("?")[0];
  const response = await fetch(`${url}/rest/v1/${query}`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert(response.ok, `GET ${table}: HTTP ${response.status}`);
  const rows = await response.json();
  assert(Array.isArray(rows), `GET ${table}: expected rows`);
  // PostgREST caps a response at 1000 rows; a chapter is nowhere near it.
  assert(rows.length < 1000, `GET ${table}: page limit reached`);
  return rows;
}
const inList = (ids) => `(${ids.map((id) => `"${id}"`).join(",")})`;

async function exportChapter() {
  const modules = await get(`modules?slug=eq.${SLUG}&select=*`);
  assert.equal(modules.length, 1, `Exactly one ${SLUG} module`);
  const [module] = modules;
  assert.equal(
    module.status,
    "published",
    "The fixture is the published chapter"
  );
  const sections = await get(
    `sections?module_id=eq.${module.id}&select=*&order=order_index.asc`
  );
  assert(sections.length, "The chapter has sections");
  const paragraphs = await get(
    `paragraphs?section_id=in.${inList(sections.map((s) => s.id))}&select=*&order=order_index.asc`
  );
  const linked = [
    ...new Set(paragraphs.map((p) => p.animation_id).filter(Boolean)),
  ];
  const animations = linked.length
    ? await get(
        `animations?id=in.${inList(linked)}&select=*&order=animation_key.asc`
      )
    : [];
  const references = await get(
    `references?module_id=eq.${module.id}&select=*&order=number.asc`
  );
  // Uploaded widgets a figure or widget block names. Their HTML is large and
  // already committed in src/widgets/uploads/, so the fixture records which
  // published file it was (sha256) and the fixture test holds the committed
  // copy to it.
  const uploadSlugs = [
    ...new Set(
      [
        ...animations.map((a) => a.config?.widgetId),
        ...paragraphs.flatMap((p) =>
          (p.content?.blocks || []).map((block) => block.widgetId)
        ),
      ]
        .filter((id) => typeof id === "string" && id.startsWith("upload:"))
        .map((id) => id.slice("upload:".length))
    ),
  ].sort();
  const uploads = [];
  for (const slug of uploadSlugs) {
    const [upload] = await get(
      `widget_uploads?slug=eq.${encodeURIComponent(slug)}&select=slug,title,ramp,status,html`
    );
    assert(upload?.html, `Published upload ${slug} is readable`);
    uploads.push({
      slug: upload.slug,
      title: upload.title,
      ramp: upload.ramp,
      status: upload.status,
      bytes: Buffer.byteLength(upload.html),
      sha256: createHash("sha256").update(upload.html).digest("hex"),
    });
  }

  // Stable, readable ids instead of production UUIDs: the stories, tests and
  // browser assertions name rows by them, and a refresh's diff stays about
  // content. The scheme is the one the fixture has always used.
  const ids = new Map([[module.id, "history-fixture-module"]]);
  for (const s of sections) ids.set(s.id, `history-section-${s.slug}`);
  for (const a of animations)
    ids.set(a.id, `history-animation-${a.animation_key}`);
  for (const p of paragraphs)
    ids.set(p.id, `${ids.get(p.section_id)}-p${p.order_index}`);
  for (const r of references) ids.set(r.id, `history-reference-${r.number}`);
  assert.equal(
    new Set(ids.values()).size,
    ids.size,
    "Stable ids must be unique"
  );

  const stray = [];
  const remap = (value, path) => {
    if (typeof value === "string") {
      if (ids.has(value)) return ids.get(value);
      if (UUID.test(value)) stray.push(`${path} = ${value}`);
      return value;
    }
    if (Array.isArray(value))
      return value.map((item, index) => remap(item, `${path}[${index}]`));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([field, item]) => [
          field,
          remap(item, `${path}.${field}`),
        ])
      );
    return value;
  };
  const exported = (row, path) =>
    remap(
      Object.fromEntries(
        Object.entries(row).filter(([field]) => !DROPPED.has(field))
      ),
      path
    );
  const rows = (table, list) =>
    list.map((row) => exported(row, `${table} ${ids.get(row.id)}`));

  const fixture = {
    header: null,
    boundary:
      "The published History chapter as readers get it: the module, its sections, paragraphs, the figures its paragraphs link and its reference list, exported read-only from the database and rendered by the real App, ChapterView and TextComp against Storybook's API doubles. No authentication, RLS, production route or deployment is asserted, and the export is only as fresh as its date.",
    omissions: [
      "Only figures (animations rows) a History paragraph links are exported. The reader also loads every other chapter's rows; they are never drawn in History.",
      "An uploaded widget's HTML is not stored here. The fixture records the published file's sha256; the story serves the committed copy in src/widgets/uploads/, without its Google Fonts links, and the fixture test holds that copy to the hash.",
      "A figure that plays a YouTube video keeps its i.ytimg.com poster URL here. The story draws a plain stand-in for it, because the browser lane allows no outside request.",
      "Row ids are stable fixture ids, not production ids; created_at, updated_at, created_by and content_version_id are dropped.",
      "Highlights, notes, trending passages, reading progress, quizzes and figure states or variants are not exported: the story answers those reads with nothing, as for a first-time anonymous reader.",
    ],
    module: exported(module, "module"),
    sections: rows("sections", sections),
    paragraphs: rows("paragraphs", paragraphs).sort(
      (a, b) =>
        a.section_id.localeCompare(b.section_id) ||
        a.order_index - b.order_index
    ),
    animations: rows("animations", animations),
    references: rows("references", references),
    uploads,
  };
  assert.deepEqual(
    stray,
    [],
    "A production id outside the exported rows would dangle in the fixture"
  );
  fixture.header = {
    source: "published chapter export",
    chapter: SLUG,
    exportedAt: new Date().toISOString().slice(0, 10),
    exportedBy: "scripts/history-full-reader-export.mjs",
    counts: counts(fixture),
  };
  return fixture;
}

/** Row counts recorded in the header; the fixture test recomputes them. */
function counts(fixture) {
  return {
    sections: fixture.sections.length,
    boxes: fixture.sections.filter((s) => s.slug.startsWith("box-")).length,
    paragraphs: fixture.paragraphs.length,
    figureLinks: fixture.paragraphs.filter((p) => p.animation_id).length,
    animations: fixture.animations.length,
    widgetBlocks: fixture.paragraphs.flatMap((p) =>
      (p.content?.blocks || []).filter((block) => block.type === "widget")
    ).length,
    references: fixture.references.length,
    uploads: fixture.uploads.length,
  };
}

/** What differs between the committed fixture and a fresh export. */
function drift(committed, live) {
  const lines = [];
  const fields = (before = {}, after = {}) =>
    [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((field) => !isDeepStrictEqual(before[field], after[field]))
      .sort();
  const changedModule = fields(committed.module, live.module);
  if (changedModule.length) lines.push(`~ module: ${changedModule.join(", ")}`);
  for (const table of [
    "sections",
    "paragraphs",
    "animations",
    "references",
    "uploads",
  ]) {
    const id = (row) => row.id || row.slug;
    const before = new Map(
      (committed[table] || []).map((row) => [id(row), row])
    );
    const after = new Map(live[table].map((row) => [id(row), row]));
    for (const id of after.keys())
      if (!before.has(id)) lines.push(`+ ${table} ${id} (live only)`);
    for (const [id, row] of before) {
      if (!after.has(id)) lines.push(`- ${table} ${id} (fixture only)`);
      else {
        const changed = fields(row, after.get(id));
        if (changed.length)
          lines.push(`~ ${table} ${id}: ${changed.join(", ")}`);
      }
    }
  }
  for (const field of ["boundary", "omissions"])
    if (!isDeepStrictEqual(committed[field], live[field]))
      lines.push(`~ ${field} text (refresh to rewrite it)`);
  return lines;
}

const summary = (c) =>
  `${c.sections} sections (${c.boxes} boxes), ${c.paragraphs} paragraphs, ${c.figureLinks} figure links, ${c.animations} animations, ${c.widgetBlocks} widget blocks, ${c.references} references, ${c.uploads} uploaded widget${c.uploads === 1 ? "" : "s"}`;

const live = await exportChapter();
if (check) {
  const committed = JSON.parse(await readFile(TARGET, "utf8"));
  const lines = drift(committed, live);
  if (lines.length) {
    console.log(lines.join("\n"));
    console.log(
      `History fixture drift: ${lines.length} difference${lines.length === 1 ? "" : "s"} between the fixture exported ${committed.header?.exportedAt || "(undated)"} and the published chapter today. Refresh with: npm run history:fixture:export`
    );
    process.exitCode = 1;
  } else
    console.log(
      `History fixture drift: 0. The fixture exported ${committed.header.exportedAt} matches the published chapter: ${summary(live.header.counts)}.`
    );
} else {
  const options = await prettier.resolveConfig(TARGET);
  await writeFile(
    TARGET,
    await prettier.format(JSON.stringify(live), {
      ...options,
      filepath: TARGET,
    })
  );
  console.log(
    `History fixture exported ${live.header.exportedAt} from the published chapter: ${summary(live.header.counts)}.`
  );
}
