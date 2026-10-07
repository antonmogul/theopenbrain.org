/*
 * capture-widget-thumbs.mjs — a still of every widget, for the chapter
 * timeline (OPENBRAIN-128).
 *
 * The timeline's preview card and the chapter map show a widget the reader is
 * about to reach as a small card with a picture of it. The widgets are live
 * Vue routes and sandboxed uploads, too heavy to mount for a hover card, so
 * this script photographs each one once and the app ships the stills:
 *
 *   public/publicAssets/images/widgets/thumbs/<id>.jpg   480×300, JPEG q72
 *   src/widgets/thumbnails.js                            widgetId → URL
 *
 * What it captures:
 *   • every entry in src/widgets/catalog.js with a `vuePath`, by opening
 *     <base><vuePath> in Chromium. Entries that share a route (the two
 *     RetINaBox rows) share one image;
 *   • every published uploaded widget (OPENBRAIN-105), keyed "upload:<slug>"
 *     the way chapters place them. Their HTML comes from the widget_uploads
 *     rows seeded by supabase/migrations/, overlaid with the live table when
 *     Supabase credentials are set (env or .env), and runs through the same
 *     srcdoc builder the reader uses (widgetHost.buildWidgetDoc).
 *
 * Each widget is framed on its main visual (FRAMES below, falling back to
 * .widget-root, then the viewport below the page header) at 16:10 on a
 * 1280×800 desktop page, with reduced motion so animated widgets hold still.
 * A widget that cannot render here (Pyodide or a CDN unreachable, a route
 * that errors) is skipped and listed; the app shows its card without a
 * picture. thumbnails.js is rebuilt from what is on disk, so a partial run
 * (--only) keeps the other stills.
 *
 * Usage (against the production build, as the smoke test does):
 *   npm run build && npm run preview         # serves :4173
 *   npm run widget-thumbs                    # in a second terminal
 *   node scripts/timeline/capture-widget-thumbs.mjs --base http://localhost:4174
 *   node scripts/timeline/capture-widget-thumbs.mjs --only sdt,upload:attn-sdt
 *
 * Flags: --base <url> (default http://localhost:4173), --only <ids>,
 * --chromium <path> (or CHROMIUM_PATH) when Playwright's own browser is not
 * installed, --no-uploads, --verbose (print each frame), and
 * --mirror <url prefix>=<dir> (repeatable) to serve a CDN from disk on a
 * machine that cannot reach it, e.g. Pyodide from its npm package:
 *   --mirror https://cdn.jsdelivr.net/pyodide/v0.26.4/full/=<pkg dir>
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export const THUMB_DIR = "public/publicAssets/images/widgets/thumbs";
export const THUMB_URL = "/publicAssets/images/widgets/thumbs";
export const THUMB_W = 480;
export const THUMB_H = 300;
const RATIO = THUMB_W / THUMB_H;
const QUALITY = 0.72;
const VIEWPORT = { width: 1280, height: 800 };
const MODULE_PATH = "src/widgets/thumbnails.js";
// The timeline loads a still on hover; past this the set is worth a look.
const BUDGET_KB = 900;
const VERBOSE = process.argv.includes("--verbose");

/*
 * How to frame each catalog widget, keyed by catalog id (the first id of a
 * shared route). `focus` is a selector for the widget's main visual (every
 * match is unioned). `fit: "contain"` (default) frames the whole focus box,
 * page around it included; "cover" crops inside it, `align` [x, y] (0 start,
 * 0.5 centre, 1 end) choosing which part. `pad` px around the focus;
 * `minWidth` px keeps small visuals from being upscaled. `ready` waits for
 * an element that only exists once the widget has really drawn; `prepare`
 * puts the widget into a state worth a picture.
 */
const FRAMES = {
  retinabox: { focus: ".rb-panels", fit: "cover", align: [0.5, 0] },
  // The two figures are drawn by Python (Pyodide from jsDelivr); without
  // them the page is captions around empty space, so wait or skip.
  "direction-selectivity": {
    focus: "#rasters",
    ready: "#rasters > *",
    readyTimeout: 45000,
  },
  // "Three lights are enough": the additive RGB beams read at thumbnail
  // size where the spectrum and cone curves are hairlines.
  "color-vision": {
    focus: "section.cv-sec:nth-of-type(3) .cv-panel",
    fit: "cover",
    align: [0, 0.5],
  },
  // With no camera the well is a "Point a camera" placeholder; the built-in
  // demo stimulus shows what the filter does.
  "v1-camera": {
    focus: ".v1-grid",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Demo stimulus" }).click();
      await page.waitForTimeout(1500);
    },
  },
  "visual-pathway-lesions": { focus: ".main", fit: "cover" },
  sdt: { focus: ".sdt-stage" },
  "psychometric-function": { focus: ".pf-row" },
  // The arena is short: take the room below it (status line), not the
  // instructions above.
  "posner-cueing": { focus: ".pn-arena", align: [0.5, 0], pad: 12 },
  // A tall diagram: the monitor with the two stimuli is the part that says
  // "biased competition".
  "biased-competition": { focus: ".bc-svg", fit: "cover", align: [0.5, 0] },
  "contrast-response-gain": { focus: ".crg-stage" },
  "tmt-feature-attention": { focus: ".tmt-panel" },
  "corbetta-pet-attention": { focus: ".cpa-stage", fit: "cover", pad: 0 },
  "hillyard-attention-erp": {
    focus: ".hl-card",
    fit: "cover",
    align: [0.5, 0.3],
  },
  // The model diagram; the contrast-response chart below is an .nm-svg too.
  "normalization-model": { focus: ".nm-body > .nm-svg" },
  "case-cabinet": { focus: ".frame", fit: "cover", pad: 0 },
  // The engraving overflows its stage box.
  phrenology: { focus: ".stage", pad: 56 },
};

// Kit widgets (public/widget-kit/) are a <main> whose first child is the
// title header and whose paragraphs are captions: frame everything else.
const UPLOAD_FRAME = { focus: "main > :not(header, p, script, style)" };

const FALLBACKS = [".widget-root", "main"];

// ── Pure helpers (exported for src/widgets/__tests__/thumbnails.test.js) ──

/** File-safe name for a widget id ("upload:attn-sdt" → "upload-attn-sdt"). */
export function thumbName(id) {
  return String(id).replace(/[^a-z0-9-]+/gi, "-");
}

/**
 * The WIDGETS entries of src/widgets/catalog.js, read as text: the module
 * imports the authors' HTML with Vite's ?raw suffix, so Node cannot load it
 * (scripts/seed/gen-chapter-from-markdown.mjs has the same constraint). The
 * test checks this against the real import.
 * @returns {{ id: string, vuePath: string|null }[]}
 */
export function parseCatalogWidgets(src) {
  const start = src.indexOf("export const WIDGETS");
  const end = src.indexOf("\n];", start);
  if (start < 0 || end < 0) return [];
  const out = [];
  for (const m of src
    .slice(start, end)
    .matchAll(/\{\s*id:\s*"([^"]+)"([\s\S]*?)\n {2}\}/g)) {
    const vuePath = m[2].match(/\bvuePath:\s*"([^"]*)"/)?.[1] ?? null;
    out.push({ id: m[1], vuePath });
  }
  return out;
}

/**
 * Uploaded widgets seeded by a migration: the rows of
 * `insert into public.widget_uploads (slug, title, description, author,
 * ramp, html, status) values ('<slug>', $t$…$t$, $t$…$t$, $t$…$t$,
 * '<ramp>', $w$<html>$w$, '<status>')`, in file order.
 * @returns {{ slug, ramp, html, status }[]}
 */
export function parseUploadsSql(sql) {
  if (!/widget_uploads/i.test(sql)) return [];
  const row =
    /\(\s*'([a-z0-9-]+)',(?:\s*\$t\$[\s\S]*?\$t\$,){3}\s*'([a-z]+)',\s*\$w\$([\s\S]*?)\$w\$,\s*'([a-z]+)'\s*\)/g;
  return [...sql.matchAll(row)].map(([, slug, ramp, html, status]) => ({
    slug,
    ramp,
    html,
    status,
  }));
}

/**
 * The 16:10 rectangle to photograph, in page coordinates, for a focus box.
 * @param {{x,y,w,h}} box   the focus element(s), page coordinates
 * @param {{fit?, align?, pad?, minWidth?}} opts  see FRAMES
 * @param {{width, height, viewportH}} pageSize  the page's scrollable size
 *   and the viewport height (a clip must fit on screen)
 */
export function frameFor(box, opts = {}, pageSize) {
  const {
    fit = "contain",
    align = [0.5, 0.5],
    pad = 16,
    minWidth = 640,
  } = opts;
  const b = {
    x: box.x - pad,
    y: box.y - pad,
    w: box.w + 2 * pad,
    h: box.h + 2 * pad,
  };
  const wide = b.w / b.h > RATIO;
  let w =
    fit === "cover" ? (wide ? b.h * RATIO : b.w) : wide ? b.w : b.h * RATIO;
  w = Math.max(w, minWidth);
  w = Math.min(w, pageSize.width, pageSize.viewportH * RATIO);
  w = Math.min(w, pageSize.height * RATIO);
  const h = w / RATIO;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const x = clamp(b.x + (b.w - w) * align[0], 0, pageSize.width - w);
  const y = clamp(b.y + (b.h - h) * align[1], 0, pageSize.height - h);
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
  };
}

/** Source of src/widgets/thumbnails.js for [widgetId, url] pairs. */
export function renderThumbsModule(entries) {
  const rows = [...entries]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, url]) => `  ${JSON.stringify(id)}: ${JSON.stringify(url)},`)
    .join("\n");
  return `/*
 * Widget thumbnails — a still of each widget for the chapter timeline's
 * preview card and chapter map (OPENBRAIN-128).
 *
 * GENERATED by scripts/timeline/capture-widget-thumbs.mjs (\`npm run
 * widget-thumbs\` against a \`vite preview\` of a fresh build); do not edit
 * by hand, re-run it when a widget changes. The images are 480×300 JPEGs in
 *   ${THUMB_DIR}/
 * Keys are the ids chapters place: catalog ids (src/widgets/catalog.js) and
 * uploaded widgets as "upload:<slug>". A widget missing here (it could not
 * be captured, or was uploaded since) gets null and shows its card without
 * a picture. The ?v= suffix is a hash of the image, so a re-capture is not
 * served stale from the one-day publicAssets cache (public/serve.json).
 */

/** @type {Readonly<Record<string, string>>} */
export const WIDGET_THUMBS = Object.freeze({
${rows}
});

/**
 * The thumbnail URL for a widget id, or null when there is none (a widget
 * that could not be captured, or an upload newer than the last capture).
 * @param {string} widgetId
 * @returns {string|null}
 */
export function widgetThumb(widgetId) {
  return typeof widgetId === "string" &&
    Object.prototype.hasOwnProperty.call(WIDGET_THUMBS, widgetId)
    ? WIDGET_THUMBS[widgetId]
    : null;
}
`;
}

// ── CLI ──────────────────────────────────────────────────────────────────

function flag(args, name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

const MIME = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".zip": "application/zip",
};

/* --mirror <prefix>=<dir>: answer requests under the prefix from disk. */
async function mirror(context, args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== "--mirror") continue;
    const [prefix, dir] = String(args[i + 1]).split(/=(.*)/s);
    await context.route(`${prefix}**`, (route) => {
      const rel = route.request().url().slice(prefix.length).split("?")[0];
      const file = path.resolve(dir, rel);
      if (!file.startsWith(path.resolve(dir)) || !existsSync(file))
        return route.continue();
      return route.fulfill({
        path: file,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type":
            MIME[path.extname(file)] || "application/octet-stream",
        },
      });
    });
  }
}

/* Supabase URL + publishable key from the environment or .env (as smoke.mjs). */
function supabaseCredentials() {
  let url = process.env.VITE_SUPABASE_URL;
  let key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    try {
      const env = readFileSync(path.join(ROOT, ".env"), "utf8");
      url ||= env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
      key ||=
        env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1]?.trim() ||
        env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim();
    } catch {
      /* no .env */
    }
  }
  return url && key ? { url, key } : null;
}

/* Published uploads: the migrations' seed rows, then the live table on top. */
async function loadUploads() {
  const bySlug = new Map();
  const dir = path.join(ROOT, "supabase/migrations");
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".sql")) continue;
    for (const row of parseUploadsSql(
      readFileSync(path.join(dir, file), "utf8")
    ))
      bySlug.set(row.slug, row);
  }
  const creds = supabaseCredentials();
  if (creds) {
    try {
      const res = await fetch(
        `${creds.url}/rest/v1/widget_uploads?status=eq.published&select=slug,ramp,html,status`,
        { headers: { apikey: creds.key } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const row of await res.json()) bySlug.set(row.slug, row);
    } catch (e) {
      console.warn(`  widget_uploads: ${e.message}; using the migrations only`);
    }
  }
  return [...bySlug.values()].filter((u) => u.status === "published");
}

/* Let a widget finish loading: network quiet (8s at most), fonts, a beat. */
async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(600);
}

/* Hide the app's fixed chrome (menus, feedback button) around a widget route. */
async function hideChrome(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(".widget-root") || el.querySelector(".widget-root"))
        continue;
      const { position } = getComputedStyle(el);
      if (position === "fixed" || position === "sticky")
        el.style.visibility = "hidden";
    }
  });
}

/* The focus box (union of matches) or the first fallback that matches. */
async function measure(page, focus) {
  return page.evaluate(
    ({ selectors }) => {
      const union = (rects) => {
        const left = Math.min(...rects.map((r) => r.left));
        const top = Math.min(...rects.map((r) => r.top));
        const right = Math.max(...rects.map((r) => r.right));
        const bottom = Math.max(...rects.map((r) => r.bottom));
        return {
          x: left + scrollX,
          y: top + scrollY,
          w: right - left,
          h: bottom - top,
        };
      };
      const size = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.scrollHeight,
        viewportH: innerHeight,
      };
      for (const sel of selectors) {
        const rects = [...document.querySelectorAll(sel)]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 1 && r.height > 1);
        if (rects.length) return { selector: sel, box: union(rects), size };
      }
      // Last resort: the first screen below any page header.
      const header = document.querySelector("header")?.getBoundingClientRect();
      const top = header ? header.bottom + scrollY : 0;
      return {
        selector: "viewport",
        box: { x: 0, y: top, w: size.width, h: innerHeight - top },
        size,
      };
    },
    { selectors: [focus, ...FALLBACKS].filter(Boolean) }
  );
}

/* Photograph the frame and scale it to THUMB_W×THUMB_H JPEG (base64). */
async function shoot(page, resizer, frameOpts) {
  const m = await measure(page, frameOpts.focus);
  const fallback = m.selector !== frameOpts.focus;
  const f = frameFor(
    m.box,
    fallback ? { fit: "cover", align: [0.5, 0] } : frameOpts,
    m.size
  );
  const scrollY = await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: "instant" });
    return window.scrollY;
  }, f.y);
  await page.waitForTimeout(400);
  const png = await page.screenshot({
    clip: { x: f.x, y: f.y - scrollY, width: f.w, height: f.h },
    animations: "disabled",
  });
  // Downscale in Chromium (halving steps, then high-quality smoothing):
  // no image library to install, and better than rendering at a fraction
  // of a device pixel.
  const jpeg = await resizer.evaluate(
    async ({ b64, w, h, q }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      let src = img;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      while (sw / 2 >= w) {
        const step = document.createElement("canvas");
        step.width = Math.round(sw / 2);
        step.height = Math.round(sh / 2);
        const g = step.getContext("2d");
        g.imageSmoothingQuality = "high";
        g.drawImage(src, 0, 0, step.width, step.height);
        [src, sw, sh] = [step, step.width, step.height];
      }
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const g = out.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      g.imageSmoothingQuality = "high";
      g.drawImage(src, 0, 0, w, h);
      return out.toDataURL("image/jpeg", q).split(",")[1];
    },
    { b64: png.toString("base64"), w: THUMB_W, h: THUMB_H, q: QUALITY }
  );
  return {
    buffer: Buffer.from(jpeg, "base64"),
    note: [
      fallback ? `framed by fallback ${m.selector}` : "",
      VERBOSE ? `frame ${f.w}×${f.h} at ${f.x},${f.y}` : "",
    ]
      .filter(Boolean)
      .join("; "),
  };
}

function isLocal(url) {
  try {
    const { hostname, protocol } = new URL(url);
    return (
      protocol === "data:" ||
      protocol === "blob:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    );
  } catch {
    return true;
  }
}

/* Open a page, recording which outside hosts failed to load. */
async function openPage(context) {
  const page = await context.newPage();
  const blocked = new Set();
  const errors = [];
  page.on("requestfailed", (r) => {
    if (!isLocal(r.url())) blocked.add(new URL(r.url()).host);
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return { page, blocked, errors };
}

function launchOptions(args) {
  const exe =
    flag(args, "chromium", null) ||
    process.env.CHROMIUM_PATH ||
    // Where cloud agent sandboxes keep a Chromium that matches no
    // Playwright release; elsewhere Playwright's own browser is used.
    (existsSync("/opt/pw-browsers/chromium")
      ? "/opt/pw-browsers/chromium"
      : undefined);
  // Chromium ignores HTTPS_PROXY; pass it on so Google Fonts and the CDNs a
  // widget uses still load behind a proxy.
  const proxy = process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" }
    : undefined;
  return {
    executablePath: exe,
    proxy,
    // Software WebGL, so the V1 camera's shader pipeline renders headless.
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const base = flag(args, "base", "http://localhost:4173").replace(/\/$/, "");
  const only = (flag(args, "only", "") || "").split(",").filter(Boolean);
  const wanted = (ids) => !only.length || ids.some((id) => only.includes(id));

  try {
    const res = await fetch(base);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(
      `Cannot reach ${base} (${e.message}). Serve a fresh build first: npm run build && npm run preview`
    );
    process.exit(1);
  }

  const catalog = parseCatalogWidgets(
    readFileSync(path.join(ROOT, "src/widgets/catalog.js"), "utf8")
  );
  if (!catalog.length) {
    console.error("No widgets parsed from src/widgets/catalog.js");
    process.exit(1);
  }
  // One capture per route; every catalog id on that route shares the still.
  const routes = new Map();
  for (const w of catalog.filter((w) => w.vuePath)) {
    if (!routes.has(w.vuePath)) routes.set(w.vuePath, []);
    routes.get(w.vuePath).push(w.id);
  }
  // Listed even with --no-uploads, so their stills stay in the map.
  const uploads = await loadUploads();
  const captureUploads = !args.includes("--no-uploads");

  const jobs = [
    ...[...routes].map(([vuePath, ids]) => ({
      ids,
      file: thumbName(ids[0]),
      frame: FRAMES[ids[0]] || {},
      open: (page) => page.goto(base + vuePath, { waitUntil: "load" }),
      chrome: true,
    })),
    ...(captureUploads ? uploads : []).map((u) => ({
      ids: [`upload:${u.slug}`],
      file: thumbName(`upload:${u.slug}`),
      frame: UPLOAD_FRAME,
      open: async (page) => {
        // widgetHost has no imports, so Node loads the reader's own builder.
        const { buildWidgetDoc } = await import(
          pathToFileURL(path.join(ROOT, "src/widgets/uploaded/widgetHost.js"))
            .href
        );
        await page.setContent(buildWidgetDoc(u.html, { ramp: u.ramp }), {
          waitUntil: "load",
        });
      },
      chrome: false,
    })),
  ].filter((job) => wanted(job.ids));
  if (only.length && !jobs.length)
    console.warn(`  --only ${only.join(",")} matches no widget`);

  const outDir = path.join(ROOT, THUMB_DIR);
  await mkdir(outDir, { recursive: true });

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch(launchOptions(args));
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await mirror(context, args);
  const resizer = await context.newPage();

  console.log(`widget thumbnails: ${base} → ${THUMB_DIR}/`);
  const report = [];
  for (const job of jobs) {
    const label =
      job.ids[0] +
      (job.ids.length > 1 ? ` (+${job.ids.slice(1).join(", ")})` : "");
    const { page, blocked, errors } = await openPage(context);
    try {
      await job.open(page);
      await settle(page);
      if (job.frame.ready)
        await page
          .waitForSelector(job.frame.ready, {
            timeout: job.frame.readyTimeout ?? 15000,
          })
          .catch(() => {
            throw new Error(`${job.frame.ready} never appeared`);
          });
      if (job.frame.prepare) await job.frame.prepare(page);
      if (job.chrome) await hideChrome(page);
      const { buffer, note } = await shoot(page, resizer, job.frame);
      await writeFile(path.join(outDir, `${job.file}.jpg`), buffer);
      const notes = [
        note,
        errors.length ? `${errors.length} page error(s)` : "",
      ];
      report.push({ label, ok: true, kb: buffer.length / 1024, notes });
    } catch (e) {
      const hosts = [...blocked];
      report.push({
        label,
        ok: false,
        notes: [
          e.message.split("\n")[0],
          hosts.length ? `unreachable: ${hosts.join(", ")}` : "",
        ],
      });
    } finally {
      await page.close();
    }
  }
  await browser.close();

  // Rebuild the map from the stills on disk, so a partial run keeps the rest.
  const entries = [];
  const known = new Set();
  const allJobs = [
    ...[...routes.values()].map((ids) => ({ ids, file: thumbName(ids[0]) })),
    ...uploads.map((u) => ({
      ids: [`upload:${u.slug}`],
      file: thumbName(`upload:${u.slug}`),
    })),
  ];
  for (const { ids, file } of allJobs) {
    known.add(`${file}.jpg`);
    const abs = path.join(outDir, `${file}.jpg`);
    if (!existsSync(abs)) continue;
    const hash = createHash("sha1")
      .update(readFileSync(abs))
      .digest("hex")
      .slice(0, 8);
    for (const id of ids)
      entries.push([id, `${THUMB_URL}/${file}.jpg?v=${hash}`]);
  }
  const prettier = await import("prettier");
  const modulePath = path.join(ROOT, MODULE_PATH);
  const config = (await prettier.resolveConfig(modulePath)) || {};
  await writeFile(
    modulePath,
    await prettier.format(renderThumbsModule(entries), {
      ...config,
      filepath: modulePath,
    })
  );

  for (const r of report) {
    const size = r.ok ? `${r.kb.toFixed(1).padStart(5)} KB` : "        ";
    const notes = r.notes.filter(Boolean).join("; ");
    console.log(
      `  ${r.ok ? "ok     " : "skipped"} ${r.label.padEnd(44)} ${size}  ${notes}`
    );
  }
  const files = readdirSync(outDir).filter((f) => f.endsWith(".jpg"));
  const totalKb =
    files.reduce((n, f) => n + statSync(path.join(outDir, f)).size, 0) / 1024;
  const orphans = files.filter((f) => !known.has(f));
  console.log(
    `${files.length} stills, ${totalKb.toFixed(0)} KB in all (budget ${BUDGET_KB} KB); ${entries.length} ids in ${MODULE_PATH}`
  );
  if (totalKb > BUDGET_KB)
    console.warn(`  over budget: lower QUALITY or the frame sizes`);
  if (orphans.length)
    console.warn(`  no widget uses: ${orphans.join(", ")} (delete them?)`);
  const skipped = report.filter((r) => !r.ok);
  if (skipped.length === report.length && report.length) process.exit(1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
