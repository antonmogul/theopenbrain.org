#!/usr/bin/env node
// Anonymous published content only. GETs with the publishable key; no writes.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => /^VITE_SUPABASE_/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    })
);
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw Error("VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY required");
const data = { exportedAt: new Date().toISOString() };
for (const table of [
  "modules",
  "sections",
  "paragraphs",
  "animations",
  "animation_states",
  "animation_variants",
  "widget_uploads",
  "references",
  "quizzes",
  "flashcards",
]) {
  data[table] = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(
      `${url}/rest/v1/${table}?select=*&limit=1000&offset=${offset}`,
      { headers: { apikey: key } }
    );
    if (!r.ok) throw Error(`${table}: HTTP ${r.status}`);
    const rows = await r.json();
    data[table].push(...rows);
    if (rows.length < 1000) break;
  }
  console.log(`${table}: ${data[table].length}`);
}
const out =
  process.env.CHAPTER_PARITY_OUT ||
  "/Volumes/Brain/artifacts/retina-cleanup/66";
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/live.json`, JSON.stringify(data));
