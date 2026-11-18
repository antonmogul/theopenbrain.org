#!/usr/bin/env node
/**
 * npm run feedback:pull -- [--out notes.json] [--status new,doing | --all]
 *                          [--chapter <slug>] [--base <url>]
 *
 * Reviewer notes (OPENBRAIN-203) as a tracker: prints a markdown table of the
 * notes still to pick up (new and doing by default) and, with --out, writes
 * them as JSON (each with its anchor, `link` and `label`) for the locate
 * script (`npm run feedback:locate`, OPENBRAIN-204).
 *
 * READ-ONLY. `review_feedback` is readable by creators only, so it needs one:
 *   REVIEW_PULL_TOKEN   a creator's access token (the `access_token` in the
 *                       browser's localStorage `sb-<ref>-auth-token` while
 *                       signed in to the dashboard). GET requests only.
 *   SUPABASE_DB_URL     otherwise, a Postgres URL; the query runs through
 *                       psql inside BEGIN READ ONLY … ROLLBACK.
 * The Supabase URL and publishable key come from the environment or .env.
 * Tokens and URLs are never printed.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { loadSupabaseEnv } from "../lib/supabase-rest.mjs";
import {
  OPEN_STATUSES,
  REVIEW_STATUSES,
  reviewAnchorLabel,
  reviewNoteHref,
  reviewNotesMarkdown,
} from "../../src/helper/reviewNotes.mjs";

const PRODUCTION = "https://theopenbrainorg-production.up.railway.app";
const COLUMNS =
  "id,created_at,updated_at,chapter_slug,section_slug,paragraph_id,type,note,quote,suggested_text,anchor,reviewer_name,reviewer_role,user_id,url,viewport,user_agent,status,reply,replied_at,parent_id";

function parseArgs(argv) {
  const opts = {
    out: null,
    statuses: ["new", "doing"],
    chapter: null,
    base: PRODUCTION,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (!next || next.startsWith("--")) fail(`${arg} needs a value`);
      return next;
    };
    if (arg === "--out") opts.out = value();
    else if (arg === "--status") opts.statuses = value().split(",");
    else if (arg === "--all") opts.statuses = null;
    else if (arg === "--open") opts.statuses = OPEN_STATUSES;
    else if (arg === "--chapter") opts.chapter = value();
    else if (arg === "--base") opts.base = value().replace(/\/$/, "");
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "npm run feedback:pull -- [--out file.json] [--status new,doing | --open | --all] [--chapter slug] [--base url]"
      );
      process.exit(0);
    } else fail(`Unknown argument ${arg}`);
  }
  const known = REVIEW_STATUSES.map((s) => s.value);
  for (const s of opts.statuses || [])
    if (!known.includes(s)) fail(`Unknown status ${s} (${known.join(", ")})`);
  if (opts.chapter && !/^[a-z0-9][a-z0-9-]*$/.test(opts.chapter))
    fail("--chapter takes a chapter slug, e.g. the-retina");
  return opts;
}

function fail(message) {
  console.error(`feedback:pull: ${message}`);
  process.exit(1);
}

async function viaRest(opts, token) {
  const env = loadSupabaseEnv();
  const get = async (endpoint) => {
    const response = await fetch(`${env.url}/rest/v1/${endpoint}`, {
      method: "GET",
      headers: { apikey: env.key, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401)
        fail("REVIEW_PULL_TOKEN was refused (expired? sign in again).");
      if (/PGRST20[25]/.test(body))
        fail(
          "review_feedback isn't in the database yet: 20261118150000_review_feedback.sql is not pushed."
        );
      fail(`${endpoint.split("?")[0]}: HTTP ${response.status} ${body}`);
    }
    return response.json();
  };
  // Statuses are applied in JS, so replies can follow their note.
  const filters = opts.chapter ? `&chapter_slug=eq.${opts.chapter}` : "";
  const notes = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await get(
      `review_feedback?select=${COLUMNS}${filters}&order=created_at.asc,id.asc&limit=1000&offset=${offset}`
    );
    notes.push(...page);
    if (page.length < 1000) break;
  }
  const modules = await get(
    "modules?select=id,slug,title,order_index&limit=1000"
  );
  const sections = await get(
    "sections?select=id,module_id,slug,title,order_index&limit=5000"
  );
  return { notes, modules, sections, source: "rest" };
}

function viaPsql(opts, dbUrl) {
  // The slug is checked against a pattern in parseArgs.
  const where = opts.chapter ? `chapter_slug = '${opts.chapter}'` : "true";
  const sql = `begin read only;
select json_build_object(
  'notes', coalesce((select json_agg(r order by r.created_at, r.id) from (
     select ${COLUMNS} from public.review_feedback where ${where}) r), '[]'),
  'modules', coalesce((select json_agg(m) from (
     select id, slug, title, order_index from public.modules) m), '[]'),
  'sections', coalesce((select json_agg(s) from (
     select id, module_id, slug, title, order_index from public.sections) s), '[]'));
rollback;
`;
  const run = spawnSync(
    "psql",
    [dbUrl, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-f", "-"],
    {
      input: sql,
      encoding: "utf8",
      env: { ...process.env, PGOPTIONS: "-c default_transaction_read_only=on" },
    }
  );
  if (run.error) fail(`psql: ${run.error.message}`);
  if (run.status !== 0) fail(`psql failed: ${run.stderr.trim()}`);
  const line = run.stdout.split("\n").find((l) => l.trim().startsWith("{"));
  if (!line) fail("psql returned no data");
  return { ...JSON.parse(line), source: "psql" };
}

const opts = parseArgs(process.argv.slice(2));
const token = process.env.REVIEW_PULL_TOKEN;
const dbUrl = process.env.SUPABASE_DB_URL;
if (!token && !dbUrl)
  fail(
    "Set REVIEW_PULL_TOKEN (a creator's access token) or SUPABASE_DB_URL. See docs/review-feedback.md."
  );

const pulled = token ? await viaRest(opts, token) : viaPsql(opts, dbUrl);
const { modules, sections, source } = pulled;
// Notes in the asked statuses, and every reply to them (a reply's own status
// doesn't matter).
const picked = pulled.notes.filter(
  (n) => !n.parent_id && (!opts.statuses || opts.statuses.includes(n.status))
);
const pickedIds = new Set(picked.map((n) => n.id));
const notes = [
  ...picked,
  ...pulled.notes.filter((n) => n.parent_id && pickedIds.has(n.parent_id)),
];

const moduleBySlug = new Map(modules.map((m) => [m.slug, m]));
const withPlace = notes.map((note) => {
  const href = reviewNoteHref(note, moduleBySlug.get(note.chapter_slug));
  return {
    ...note,
    label: reviewAnchorLabel(note),
    link: href ? `${opts.base}${href}` : null,
  };
});

console.log(
  `Review notes (${opts.statuses ? opts.statuses.join(", ") : "all statuses"}${opts.chapter ? `, ${opts.chapter}` : ""}): ${picked.length}, ${notes.length - picked.length} replies, read via ${source}\n`
);
console.log(reviewNotesMarkdown(notes, modules, sections, { base: opts.base }));

if (opts.out) {
  writeFileSync(
    opts.out,
    `${JSON.stringify(
      {
        pulledAt: new Date().toISOString(),
        source,
        statuses: opts.statuses || "all",
        chapter: opts.chapter,
        base: opts.base,
        notes: withPlace,
      },
      null,
      2
    )}\n`
  );
  console.log(`\nWrote ${withPlace.length} notes to ${opts.out}`);
}
