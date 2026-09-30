/*
 * Storybook snapshots for review (OPENBRAIN-115).
 *
 * Screenshots the design-system stories (Guides and Foundations docs, and the
 * chapter building blocks: opener, text, illustrations) at phone (390) and
 * desktop (1280) widths into storybook-snapshots/, with an index.html
 * gallery. CI uploads the folder as an artifact on every run, so a PR's
 * visual effect on the system can be looked at without running Storybook.
 *
 * It is a review aid, not a gate: a pixel-diff gate needs baselines rendered
 * on CI's own Linux fonts, which is a separate step.
 *
 * Run against a served build: `npm run storybook:snapshots:ci` (CI), or
 * `STORYBOOK_URL=http://localhost:6006 npm run storybook:snapshots`.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.STORYBOOK_URL || "http://127.0.0.1:6010";
// Not a dot-folder: actions/upload-artifact@v4 skips hidden files.
const outDir = "storybook-snapshots";
const WIDTHS = [390, 1280];
const PREFIXES = [
  "guides-",
  "foundations-",
  "chapter-opener-",
  "chapter-text-",
  "chapter-illustrations-",
];

const index = JSON.parse(await readFile("storybook-static/index.json", "utf8"));
const entries = Object.values(index.entries || {})
  .filter((e) => PREFIXES.some((p) => e.id.startsWith(p)))
  // Docs pages for Guides; stories (not autodocs pages) for the rest.
  .filter((e) =>
    e.id.startsWith("guides-") ? e.type === "docs" : e.type === "story"
  )
  .sort((a, b) => a.id.localeCompare(b.id));

const browser = await chromium.launch({ headless: true });
const concurrency = Number(process.env.STORYBOOK_SNAPSHOT_CONCURRENCY || 4);
const shots = [];
const jobs = WIDTHS.flatMap((width) => entries.map((e) => ({ e, width })));
for (const width of WIDTHS)
  await mkdir(`${outDir}/${width}`, { recursive: true });
let cursor = 0;
async function worker() {
  const pages = {};
  while (cursor < jobs.length) {
    const { e, width } = jobs[cursor++];
    pages[width] ||= await browser.newPage({
      viewport: { width, height: 900 },
    });
    const page = pages[width];
    const viewMode = e.type === "docs" ? "docs" : "story";
    const url = `${baseUrl}/iframe.html?id=${e.id}&viewMode=${viewMode}`;
    try {
      // "load" + the rendered root, not networkidle: the story smoke already
      // proves no request is left hanging, and networkidle waits 500ms each.
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await page
        .locator("#storybook-root > *, #storybook-docs > *")
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => {});
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(150);
      const file = `${width}/${e.id}.png`;
      await page.screenshot({ path: `${outDir}/${file}`, fullPage: true });
      shots.push({ id: e.id, title: `${e.title} · ${e.name}`, width, file });
    } catch (err) {
      shots.push({
        id: e.id,
        title: e.title,
        width,
        error: String(err.message || err),
      });
    }
  }
  await Promise.all(Object.values(pages).map((p) => p.close()));
}
const started = Date.now();
await Promise.all(Array.from({ length: concurrency }, worker));
await browser.close();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const rows = entries
  .map((e) => {
    const cells = WIDTHS.map((w) => {
      const s = shots.find((x) => x.id === e.id && x.width === w);
      return s?.file
        ? `<td><a href="${s.file}"><img src="${s.file}" loading="lazy" width="${w === 390 ? 195 : 400}"></a></td>`
        : `<td>failed: ${esc(s?.error || "?")}</td>`;
    }).join("");
    return `<tr><th>${esc(e.title)}<br><small>${esc(e.name)}</small></th>${cells}</tr>`;
  })
  .join("\n");
await writeFile(
  `${outDir}/index.html`,
  `<!doctype html><meta charset="utf-8"><title>Storybook snapshots</title>
<style>body{font:14px system-ui;margin:24px}th{text-align:left;vertical-align:top;padding:8px;width:260px}td{vertical-align:top;padding:8px}img{border:1px solid #ddd}</style>
<h1>Storybook snapshots</h1><p>${entries.length} entries × ${WIDTHS.join(" / ")}px</p>
<table><tr><th></th>${WIDTHS.map((w) => `<th>${w}px</th>`).join("")}</tr>${rows}</table>`
);
const failed = shots.filter((s) => s.error);
console.log(
  `Captured ${shots.length - failed.length}/${shots.length} snapshots into ${outDir}/ in ${Math.round((Date.now() - started) / 1000)}s`
);
if (failed.length)
  console.log(`Failed: ${failed.map((f) => `${f.id}@${f.width}`).join(", ")}`);
