/*
 * Compare two Storybook snapshot sets pixel by pixel (OPENBRAIN-118).
 *
 *   BEFORE=snap-before AFTER=snap-after npm run storybook:diff
 *
 * Both folders come from scripts/storybook-snapshots.mjs (same widths). Each
 * pair is drawn onto a canvas in headless Chromium and compared channel by
 * channel (a pixel counts as changed when any channel differs by more than
 * THRESHOLD, default 8 of 255, which ignores anti-aliasing noise). No image
 * library: the browser does the decoding.
 *
 * NOISE=<diff.json from two runs of the same code> skips the snapshots that
 * differ between runs anyway (animations, video frames), so what is left is
 * the change under test.
 *
 * Writes <AFTER>/diff.json and <AFTER>/diff.html (changed images side by
 * side) and exits 1 when MAX_CHANGED_RATIO (default 0) is exceeded, so it
 * can gate a "no visual change" refactor.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { chromium } from "@playwright/test";

const before = process.env.BEFORE || "snap-before";
const after = process.env.AFTER || "snap-after";
const threshold = Number(process.env.THRESHOLD || 8);
const maxRatio = Number(process.env.MAX_CHANGED_RATIO || 0);
const noise = new Set(
  process.env.NOISE
    ? JSON.parse(await readFile(process.env.NOISE, "utf8"))
        .filter((r) => r.status !== "same")
        .map((r) => r.file)
    : []
);

async function pngs(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await pngs(p)));
    else if (entry.name.endsWith(".png")) out.push(p);
  }
  return out;
}

const afterFiles = (await pngs(after))
  .map((p) => relative(after, p))
  .filter((f) => !noise.has(f))
  .sort();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent("<canvas></canvas>");

const results = [];
for (const rel of afterFiles) {
  let a;
  try {
    a = await readFile(join(before, rel));
  } catch {
    results.push({ file: rel, status: "new" });
    continue;
  }
  const b = await readFile(join(after, rel));
  const r = await page.evaluate(
    async ({ a, b, threshold }) => {
      const load = (b64) =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = `data:image/png;base64,${b64}`;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height)
        return {
          size: `${ia.width}×${ia.height} → ${ib.width}×${ib.height}`,
          changed: -1,
          total: ib.width * ib.height,
        };
      const w = ia.width;
      const h = ia.height;
      const px = (img) => {
        const c = new OffscreenCanvas(w, h);
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const da = px(ia);
      const db = px(ib);
      let changed = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (
          Math.abs(da[i] - db[i]) > threshold ||
          Math.abs(da[i + 1] - db[i + 1]) > threshold ||
          Math.abs(da[i + 2] - db[i + 2]) > threshold
        )
          changed++;
      }
      return { changed, total: w * h };
    },
    { a: a.toString("base64"), b: b.toString("base64"), threshold }
  );
  const ratio = r.changed < 0 ? 1 : r.changed / r.total;
  results.push({
    file: rel,
    status: r.changed === 0 ? "same" : r.changed < 0 ? "resized" : "changed",
    ...r,
    ratio,
  });
}
await browser.close();

const changed = results.filter((r) => r.status !== "same");
const worst = changed.filter((r) => (r.ratio ?? 1) > maxRatio);
await writeFile(join(after, "diff.json"), JSON.stringify(results, null, 2));
const rows = changed
  .sort((x, y) => (y.ratio ?? 1) - (x.ratio ?? 1))
  .map(
    (r) =>
      `<tr><th>${r.file}<br><small>${r.status} ${r.size || ""} ${r.ratio != null ? (r.ratio * 100).toFixed(3) + "%" : ""}</small></th>` +
      `<td><img src="${relative(after, join(before, r.file))}" width="360"></td>` +
      `<td><img src="${r.file}" width="360"></td></tr>`
  )
  .join("\n");
await writeFile(
  join(after, "diff.html"),
  `<!doctype html><meta charset="utf-8"><title>Storybook diff</title><style>body{font:13px system-ui;margin:24px}th{text-align:left;vertical-align:top;width:300px;padding:8px}td{vertical-align:top;padding:8px}img{border:1px solid #ddd}</style>
<h1>Storybook diff</h1><p>${results.length} snapshots · ${changed.length} differ (threshold ${threshold}/255) · before | after</p><table>${rows}</table>`
);
console.log(
  `${results.length} compared${noise.size ? ` (${noise.size} noisy skipped)` : ""} · ${results.length - changed.length} identical · ${changed.length} differ · ${worst.length} over ${(maxRatio * 100).toFixed(2)}%`
);
for (const r of changed.slice(0, 20))
  console.log(
    `  ${r.status.padEnd(7)} ${r.file} ${r.size || ""} ${r.ratio != null ? (r.ratio * 100).toFixed(3) + "%" : ""}`
  );
if (worst.length) process.exitCode = 1;
