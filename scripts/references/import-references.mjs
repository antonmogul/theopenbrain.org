#!/usr/bin/env node
/**
 * import-references.mjs — fill the `references` table from a chapter's own
 * reference list, and find each reference's source (OPENBRAIN-92).
 *
 * Stuart, 24 Sep: "we need to come up with an automatic way that takes the
 * ref list and integrates it into the web, and also allows each ref in the
 * end list to be a link to the actual source."
 *
 *   node scripts/references/import-references.mjs \
 *     --slug foundations-of-neuroscience --slug the-retina \
 *     --out supabase/migrations/<stamp>_import_chapter_references.sql
 *
 * For each chapter (published; read over the public REST API with the .env
 * keys) it reads the numbered list: the References section's list, or the
 * Footnotes section (the Retina). Each entry is parsed (parseReference.mjs)
 * and keeps the authors' own text as raw_text, which the reader shows. An
 * entry with no DOI or URL is looked up on Crossref (query.bibliographic);
 * a hit is accepted only if its title's words are in the entry and its year
 * agrees, so a wrong link is less likely than a missing one. Lookups are
 * cached (--cache, default scripts/references/.crossref-cache.json).
 *
 * The migration inserts one row per reference and never overwrites a row
 * already there (a creator's correction wins). Numbers nothing cites are
 * reported; list entries beyond the highest cited number are left out.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseReference } from "./parseReference.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const slugs = args.flatMap((a, i) => (a === "--slug" ? [args[i + 1]] : []));
const out = opt("out");
const cachePath = opt("cache", "scripts/references/.crossref-cache.json");
if (!slugs.length || !out) {
  console.error(
    "usage: import-references.mjs --slug <module-slug> [--slug …] --out <file.sql> [--cache <file>]"
  );
  process.exit(1);
}

// ── env ────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [
      l.slice(0, l.indexOf("=")),
      l.slice(l.indexOf("=") + 1).trim(),
    ])
);
const REST = `${env.VITE_SUPABASE_URL}/rest/v1`;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const rest = async (path) => {
  const r = await fetch(`${REST}/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};

// ── Crossref ───────────────────────────────────────────────────────────
const cache = existsSync(cachePath)
  ? JSON.parse(readFileSync(cachePath, "utf8"))
  : {};
const words = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/<[^>]+>/g, " ")
    .match(/[a-z0-9]{3,}/g) || [];

async function crossref(text) {
  if (text in cache) return cache[text];
  const url =
    "https://api.crossref.org/works?rows=1&select=DOI,title,issued,author,container-title,volume,page,type,score&query.bibliographic=" +
    encodeURIComponent(text.slice(0, 300));
  let hit = null;
  for (let attempt = 0; attempt < 3 && hit === null; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent":
            "TheOpenBrain-references/1.0 (https://theopenbrainorg-production.up.railway.app)",
        },
      });
      if (r.status === 429 || r.status >= 500) {
        await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
        continue;
      }
      const j = await r.json();
      hit = j.message?.items?.[0] || false;
    } catch {
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
  cache[text] = hit || false;
  return cache[text];
}

/** Accept a Crossref hit only when its title's words are in the entry and
 *  the years agree. */
function accept(hit, text, year) {
  if (!hit?.DOI || !hit.title?.[0]) return false;
  const t = words(hit.title[0]);
  if (t.length < 2) return false;
  const have = new Set(words(text));
  const inEntry = t.filter((w) => have.has(w)).length / t.length;
  const hy = hit.issued?.["date-parts"]?.[0]?.[0];
  const yearOk = !year || !hy || Math.abs(hy - year) <= 1;
  return inEntry >= 0.85 && yearOk;
}

const authorsOf = (hit) =>
  (hit.author || [])
    .slice(0, 6)
    .map((a) =>
      [
        a.family,
        (a.given || "")
          .split(/[\s-]+/)
          .filter(Boolean)
          .map((g) => g[0] + ".")
          .join(" "),
      ]
        .filter(Boolean)
        .join(", ")
    )
    .join(", ") + ((hit.author || []).length > 6 ? " et al." : "");

// ── chapters ───────────────────────────────────────────────────────────
async function chapterList(slug) {
  const [mod] = await rest(`modules?select=id,slug&slug=eq.${slug}`);
  if (!mod) throw new Error(`${slug}: no such published module`);
  const sections = await rest(`sections?select=id,slug&module_id=eq.${mod.id}`);
  const refSec =
    sections.find((s) => s.slug === "references") ||
    sections.find((s) => s.slug === "footnotes");
  if (!refSec) throw new Error(`${slug}: no References or Footnotes section`);
  const paras = await rest(
    `paragraphs?select=order_index,content&section_id=eq.${refSec.id}&order=order_index`
  );
  const entries = [];
  for (const p of paras)
    for (const b of p.content?.blocks || []) {
      if (b.type === "list")
        for (const item of b.items || [])
          entries.push({ number: entries.length + 1, html: item });
      if (b.type === "footnote" && b.content)
        entries.push({ number: Number(b.number), html: b.content });
    }
  // What the text cites.
  const allSecs = sections.map((s) => s.id).join(",");
  const body = await rest(
    `paragraphs?select=content&section_id=in.(${allSecs})`
  );
  const cited = new Set();
  for (const p of body)
    for (const b of p.content?.blocks || []) {
      if (b.type === "citation_ref" && /^\d+$/.test(String(b.number)))
        cited.add(Number(b.number));
      // The Retina's (legacy) citations: <sup data-sup="48 49"> in the text.
      const html = typeof b.content === "string" ? b.content : "";
      for (const m of html.matchAll(/data-sup=["']([\d\s,]+)["']/g))
        for (const n of m[1].split(/[\s,]+/)) if (n) cited.add(Number(n));
    }
  return { mod, source: refSec.slug, entries, cited };
}

const dq = (s) => {
  if (s === null || s === undefined || s === "") return "null";
  const str = String(s);
  if (str.includes("$r$")) throw new Error("dollar-quote clash");
  return `$r$${str}$r$`;
};

const blocks = [];
const report = [];
for (const slug of slugs) {
  const { entries, cited, source } = await chapterList(slug);
  const maxCited = Math.max(0, ...cited);
  const rows = [];
  let found = 0;
  let own = 0;
  for (const e of entries) {
    if (e.number > maxCited) {
      report.push(
        `${slug} #${e.number}: beyond the last cited number, left out`
      );
      continue;
    }
    const f = parseReference(e.html);
    const text = f.title + " " + e.html.replace(/<[^>]+>/g, " ");
    if (f.doi || f.url) own++;
    else {
      const hit = await crossref(
        e.html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      );
      if (accept(hit, text, f.year)) {
        f.doi = hit.DOI;
        found++;
        if (!f.authors) f.authors = authorsOf(hit);
        if (!f.journal && hit["container-title"]?.[0])
          f.journal = hit["container-title"][0];
      }
    }
    if (!cited.has(e.number))
      report.push(`${slug} #${e.number}: not cited in the text`);
    rows.push({ ...f, number: e.number, raw: e.html });
  }
  report.unshift(
    `${slug}: ${rows.length} references (from ${source}); ${own} link in the text, ${found} found on Crossref, ${rows.length - own - found} without a link`
  );
  const values = rows
    .map(
      (r) =>
        `  (${r.number}, ${dq(r.authors)}, ${dq(r.title)}, ${dq(r.journal)}, ${r.year ?? "null"}, ${dq(r.volume)}, ${dq(r.pages)}, ${dq(r.doi)}, ${dq(r.url)}, ${dq(r.pub_type)}, ${dq(r.raw)})`
    )
    .join(",\n");
  blocks.push(`-- ${slug}: ${rows.length} references
insert into public."references"
  (module_id, number, authors, title, journal, year, volume, pages, doi, url, pub_type, raw_text)
select m.id, v.number::int, coalesce(v.authors, ''), v.title, v.journal, v.year::int, v.volume, v.pages, v.doi, v.url, v.pub_type, v.raw_text
from public.modules m,
(values
${values}
) as v(number, authors, title, journal, year, volume, pages, doi, url, pub_type, raw_text)
where m.slug = '${slug}'
on conflict (module_id, number) do nothing;
`);
}

writeFileSync(cachePath, JSON.stringify(cache, null, 1));
writeFileSync(
  out,
  `-- OPENBRAIN-92: the chapters' references, as data.
--
-- Generated by scripts/references/import-references.mjs from each chapter's
-- own reference list (regenerate rather than hand-edit). The reader shows
-- raw_text, the authors' own formatting, with a link to the source: the DOI
-- or URL in the entry, or a DOI found on Crossref (accepted only when the
-- title and year agree). Rows that already exist are left alone.
--
${report.map((l) => `--   ${l}`).join("\n")}

begin;

${blocks.join("\n")}
commit;
`
);
console.log(report.join("\n"));
