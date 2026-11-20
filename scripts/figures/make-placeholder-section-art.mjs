#!/usr/bin/env node
/** OPENBRAIN-65. Read-only: generate temporary section pictures, never DB writes.
 * node scripts/figures/make-placeholder-section-art.mjs [--fixture export.json]
 * Pillow and fonttools are required (the same image tooling as make-references-art.py).
 * Live anonymous GETs discover published chapters; Stress's inaccessible draft
 * is described by its committed seed. Pass a creator-exported fixture to refresh
 * drafts. Sources and fallback reasons are recorded in the manifest.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
const root = process.cwd();
const args = process.argv.slice(2);
const option = (key) =>
  args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
const out = option("--out") || "/Volumes/Brain/artifacts/retina-cleanup/65";
await mkdir(out, { recursive: true });
const server = await createServer({ server: { middlewareMode: true } });
const { RAMP_HEX, rampForModule } = await server.ssrLoadModule(
  "/src/helper/chapterTheme.js"
);
const { coverForModule } = await server.ssrLoadModule(
  "/src/helper/chapterCover.js"
);
const { sectionArtFor } = await server.ssrLoadModule(
  "/src/helper/sectionArt.js"
);
await server.close();
let data;
if (args.includes("--fixture"))
  data = JSON.parse(await readFile(option("--fixture"), "utf8"));
else {
  const env = Object.fromEntries(
    (await readFile(".env", "utf8")).split(/\r?\n/).flatMap((line) => {
      const m = line.match(/^\s*(VITE_SUPABASE_\w+)\s*=\s*(.*)$/);
      return m ? [[m[1], m[2].replace(/^['"]|['"]$/g, "")]] : [];
    })
  );
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!key || /^sb_secret_/.test(key))
    throw Error("A publishable key is required");
  const get = async (q) => {
    const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${q}`, {
      headers: { apikey: key },
    });
    if (!r.ok) throw Error(`GET ${q.split("?")[0]}: ${r.status}`);
    const rows = await r.json();
    if (rows.length >= 1000) throw Error("Export requires pagination");
    return rows;
  };
  data = {};
  for (const m of await get(
    "modules?status=in.(published,draft)&select=*&order=order_index"
  )) {
    const sections = await get(
      `sections?module_id=eq.${m.id}&select=*&order=order_index`
    );
    if (!sections.length) continue;
    const paragraphs = await get(
      `paragraphs?section_id=in.(${sections.map((s) => s.id).join(",")})&select=*&order=order_index`
    );
    const ids = [
      ...new Set(paragraphs.map((p) => p.animation_id).filter(Boolean)),
    ];
    const animations = ids.length
      ? await get(`animations?id=in.(${ids.join(",")})&select=*`)
      : [];
    data[m.slug] = { modules: [m], sections, paragraphs, animations };
  }
}
// The draft has no supplied figure artwork; its seed explicitly says Artwork pending.
if (!data.stress) {
  const seed = await readFile(
    "supabase/migrations/20260925030000_seed_chapter_stress_draft.sql",
    "utf8"
  );
  const sections = [
    ...seed.matchAll(
      /VALUES \(v_section_id, v_module_id, \$ob\$(.*?)\$ob\$, \$ob\$(.*?)\$ob\$, (\d+), NULL\);/g
    ),
  ].map((m) => ({ title: m[1], slug: m[2], order_index: Number(m[3]) }));
  data.stress = {
    modules: [{ slug: "stress", ramp: "deve", status: "draft" }],
    sections,
    paragraphs: [],
    animations: [],
  };
}
let browser;
const manifest = [];
const local = async (src) => {
  if (src.startsWith("/")) {
    const file = path.join(root, "public", src.split("?")[0]);
    try {
      await access(file);
      return file;
    } catch {
      /* try production below */
    }
  }
  const url = new URL(src, "https://theopenbrainorg-production.up.railway.app");
  const r = await fetch(url);
  if (!r.ok || !r.headers.get("content-type")?.startsWith("image/"))
    throw Error(`Missing image: ${src}`);
  const file = path.join(out, `source-${manifest.length}.img`);
  await writeFile(file, Buffer.from(await r.arrayBuffer()));
  return file;
};
try {
  for (const [slug, d] of Object.entries(data)) {
    const m = d.modules[0];
    if (!["published", "draft"].includes(m.status)) continue;
    for (const s of [...d.sections].sort(
      (a, b) => a.order_index - b.order_index
    )) {
      if (
        s.parent_section_id ||
        s.slug.startsWith("box-") ||
        sectionArtFor(slug, s)
      )
        continue;
      if (!/^[a-z0-9-]+$/.test(slug) || !/^[a-z0-9-]+$/.test(s.slug))
        throw Error("Unsafe slug");
      const p = [...d.paragraphs]
        .sort((a, b) => a.order_index - b.order_index)
        .find(
          (p) => p.section_id === s.id && (p.animation_id || p.has_animation)
        );
      const figure = d.animations.find((a) => a.id === p?.animation_id);
      const first = figure?.config?.images?.[0];
      let source =
        first?.src ||
        first?.poster ||
        figure?.image_file_url ||
        figure?.config?.poster ||
        figure?.config?.posterUrl;
      let reason = source
        ? "first figure still"
        : "chapter cover: first figure has no still";
      let input;
      if (!source && figure?.media_type === "lottie") {
        // Capture the mounted figure on the actual reader; never another figure.
        browser ||= await chromium.launch();
        const page = await browser.newPage({
          viewport: { width: 390, height: 844 },
        });
        try {
          await page.goto(
            `https://theopenbrainorg-production.up.railway.app/chapter/${m.order_index}/${slug}`,
            { waitUntil: "domcontentloaded" }
          );
          const target = page
            .locator(`[data-figure-key="${figure.animation_key}"]`)
            .first();
          await target.waitFor({ timeout: 15000 });
          await target.scrollIntoViewIfNeeded();
          const drawing = target.locator("svg, canvas").first();
          await drawing.waitFor({ timeout: 8000 });
          await page.waitForTimeout(800);
          input = path.join(out, `frame-${s.slug}.png`);
          await drawing.screenshot({ path: input });
          source = `live figure frame: ${figure.animation_key}`;
          reason = "first Lottie figure rendered on live reader";
        } catch {
          reason =
            "chapter cover: first Lottie frame unavailable on live reader";
        } finally {
          await page.close();
        }
      }
      if (!input) {
        source ||= coverForModule(m);
        try {
          input = await local(source);
        } catch {
          source = coverForModule(m);
          input = await local(source);
          reason = "chapter cover: first still unavailable";
        }
      }
      const src = `/publicAssets/images/${slug}/sections/placeholder-${s.slug}.webp`;
      const target = path.join(root, "public", src);
      await mkdir(path.dirname(target), { recursive: true });
      const colour = RAMP_HEX[rampForModule(m)]?.main;
      if (!colour) throw Error(`Chapter ramp missing: ${slug}`);
      const result = spawnSync(
        "python3",
        ["scripts/figures/placeholder-section-art.py", input, target, colour],
        { encoding: "utf8" }
      );
      if (result.status !== 0) throw Error(result.stderr);
      manifest.push({
        chapter: slug,
        section: s.slug,
        title: s.title,
        source,
        reason,
        art: {
          src,
          alt: `Placeholder image for ${s.title}; temporary chapter-colour artwork`,
          position: "50% 50%",
          placeholder: true,
        },
      });
      console.log(`${slug}/${s.slug}: ${reason}`);
    }
  }
} finally {
  await browser?.close();
}
if (!manifest.length)
  throw Error(
    "No missing section art; existing manifest and migration retained"
  );
await writeFile(
  "scripts/figures/placeholder-section-art.json",
  JSON.stringify(manifest, null, 2) + "\n"
);
const quote = (s) => `'${s.replaceAll("'", "''")}'`;
const values = manifest
  .map(
    (e) =>
      `  (${quote(e.chapter)}, ${quote(e.section)}, ${quote(JSON.stringify(e.art))}::jsonb)`
  )
  .join(",\n");
await writeFile(
  "supabase/migrations/20261120066500_placeholder_section_art.sql",
  `-- OPENBRAIN-65: generated TEMPORARY section pictures. Designers replace art\n-- with an object without placeholder. Only NULL art is filled; no prose changes.\n-- Requires 20261120066300. Deploy assets first to avoid temporary image 404s.\nwith pictures(chapter, section, art) as (values\n${values}\n)\nupdate public.sections s set art = p.art\nfrom pictures p, public.modules m\nwhere s.module_id = m.id and m.slug = p.chapter and s.slug = p.section\n  and m.status in ('published', 'draft') and s.art is null;\n`
);
console.log(`${manifest.length} clearly marked placeholder pictures generated`);
