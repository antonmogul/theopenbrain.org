#!/usr/bin/env node
/*
 * feedback:locate — open the chapter where a reviewer's note points
 * (OPENBRAIN-204).
 *
 *   npm run feedback:locate -- --anchor <json | file> [--base URL]
 *     [--browser chromium|webkit] [--viewport 1440x900] [--out file.png]
 *     [--path /chapter/2/the-retina]
 *
 * `--anchor` is a note's anchor (the `anchor` column) or the whole note
 * (a `review_feedback` row, or a record from feedback:pull's JSON), as
 * JSON or a file holding it. The script opens the chapter in a browser the
 * size the reviewer's was (anchor.viewport), with their motion and theme,
 * at the URL hash the reader's own jumps land on (anchorHash: the
 * paragraph, the widget's timeline id, the subsection, the box), waits for
 * that landing to settle, then gets to the exact place: a pane figure is
 * scrolled to until the pane shows it, a plate on a box's track is brought
 * across the track (railLandingY, as readerJump does), a phone's swipe box
 * is moved to its page, a long paragraph is scrolled to the point. It
 * outlines the element and the point and screenshots it, and checks the
 * place by pointing at it again with the widget's own resolver: the
 * caption says SAME PLACE (green) or DIFFERS (red, with what is there now).
 *
 * Read-only: every request that is not a GET is refused. The base is the
 * production reader unless --base says otherwise (never theopenbrain.org,
 * which is the 2023 site). Prints a JSON report; exit 1 when the place is
 * not found, 2 when it is found but differs.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY ??= "1";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
export const PRODUCTION = "https://theopenbrainorg-production.up.railway.app";

class UsageError extends Error {}

/** The anchor and the note around it, from JSON or a file. */
export function readNote(input) {
  if (!input) throw new UsageError("--anchor is required");
  const raw = fs.existsSync(input) ? fs.readFileSync(input, "utf8") : input;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new UsageError("--anchor is neither JSON nor a file of JSON");
  }
  if (Array.isArray(data)) data = data[0];
  const anchor =
    data && typeof data.anchor === "object" && data.anchor ? data.anchor : data;
  if (!anchor || typeof anchor !== "object" || !anchor.kind)
    throw new UsageError(
      "the anchor has no kind: is it a review note's anchor?"
    );
  return { anchor, note: data === anchor ? {} : data };
}

/** The chapter path: given, the note's URL, or the module's number. */
async function chapterPathFor(note, given) {
  if (given) return given.split("#")[0];
  if (note.url) {
    try {
      return new URL(note.url).pathname;
    } catch {
      // fall through
    }
  }
  const slug = note.chapter_slug || note.chapterSlug;
  if (!slug)
    throw new UsageError(
      "no chapter: pass --path /chapter/<n>/<slug> or the whole note"
    );
  const { restGet } = await import("../lib/supabase-rest.mjs");
  const rows = await restGet(
    `modules?slug=eq.${encodeURIComponent(slug)}&select=order_index`
  );
  if (!rows?.[0]) throw new UsageError(`no chapter with the slug ${slug}`);
  return `/chapter/${rows[0].order_index}/${slug}`;
}

let bundled = null;
/** The page script: reviewAnchor + the rail landing, as one IIFE. */
export async function pageScript() {
  if (bundled) return bundled;
  const esbuild = await import("esbuild");
  const alias = {
    name: "at-alias",
    setup(build) {
      build.onResolve({ filter: /^@\// }, (a) =>
        build.resolve(`./${a.path.slice(2)}`, {
          kind: a.kind,
          resolveDir: path.join(ROOT, "src"),
        })
      );
    },
  };
  const out = await esbuild.build({
    entryPoints: [path.join(here, "locate-page.js")],
    bundle: true,
    format: "iife",
    write: false,
    platform: "browser",
    target: "es2020",
    plugins: [alias],
    logLevel: "silent",
  });
  bundled = out.outputFiles[0].text;
  return bundled;
}

const sameKey = (a, b) =>
  a === b || a.replace(/^animation/, "") === b.replace(/^animation/, "");

/**
 * Open the chapter at the anchor, get to its place, outline it,
 * screenshot it and check it. Returns the report ({ found, same, ... }).
 */
export async function locateAnchor({
  anchor,
  note = {},
  base = PRODUCTION,
  engine = "chromium",
  viewport: size = null,
  out = null,
  chapterPath = null,
  browser: shared = null,
}) {
  const viewport = {
    width: size?.width || anchor.viewport?.w || 1440,
    height: size?.height || anchor.viewport?.h || 900,
  };
  const phone = viewport.width < 768;
  const { chromium, webkit } = await import("@playwright/test");
  const { anchorHash } = await import("../../src/helper/reviewAnchor.mjs");
  const where = await chapterPathFor(note, chapterPath);
  const hash = anchorHash(anchor);
  const url = `${base.replace(/\/$/, "")}${where}${hash ? `#${encodeURIComponent(hash)}` : ""}`;
  const shot = path.resolve(
    out ||
      path.join(
        ROOT,
        ".feedback",
        `locate-${String(note.id || anchor.paragraphId || anchor.kind || "note").slice(0, 12)}-${engine}-${viewport.width}.png`
      )
  );
  fs.mkdirSync(path.dirname(shot), { recursive: true });

  const browser =
    shared || (await (engine === "webkit" ? webkit : chromium).launch());
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: Math.min(2, anchor.viewport?.dpr || 1),
    isMobile: phone && engine === "chromium",
    hasTouch: phone,
    reducedMotion: anchor.reduceMotion ? "reduce" : "no-preference",
    colorScheme: anchor.theme === "dark" ? "dark" : "light",
  });
  const report = {
    url,
    engine,
    viewport,
    kind: anchor.kind,
    label: anchor.label,
  };
  try {
    // Read-only: nothing but GETs leave the page.
    await context.route("**/*", (route) => {
      const method = route.request().method();
      return ["GET", "HEAD", "OPTIONS"].includes(method)
        ? route.continue()
        : route.abort();
    });
    // The review widget off in this browser, so it doesn't sit over the
    // place in the screenshot.
    await context.addInitScript(() => {
      try {
        localStorage.setItem("ob.review.off", "1");
      } catch {
        // ignore
      }
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    // A chapter that came up empty (a dropped request): load it once more.
    const loaded = () =>
      page
        .waitForSelector("[data-paragraph-id]", { timeout: 20000 })
        .then(() => true)
        .catch(() => false);
    if (!(await loaded())) {
      report.reloaded = true;
      await page.reload({ waitUntil: "networkidle", timeout: 90000 });
      await loaded();
    }
    // ChapterView lands on the hash and holds it for up to 5 s (holdLanding).
    await page.waitForTimeout(6000);
    await page.addScriptTag({ content: await pageScript() });

    // Late figures, widgets and fonts still move the page after the landing
    // (on a phone especially), so a place that moved away under the check
    // is gone to again, up to three times.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const placed = await page.evaluate(
        (a) => window.__obLocate.place(a),
        anchor
      );
      report.how = placed.how;
      report.attempts = attempt;
      if (!placed.found) {
        report.found = false;
        await page.screenshot({ path: shot });
        report.screenshot = shot;
        return report;
      }
      await page.waitForTimeout(900);
      if (placed.stops?.length) {
        // The pane shows a figure once its trigger is at the reading line
        // (a little later when a box above it is still over the pane).
        const want = String(anchor.figureKey || "").toLowerCase();
        for (const y of placed.stops.slice(1)) {
          const key = await page.evaluate(() => window.__obLocate.paneKey());
          if (sameKey(key, want)) break;
          await page.evaluate((top) => window.__obLocate.scrollTop(top), y);
          await page.waitForTimeout(700);
        }
      }
      if (await page.evaluate((a) => window.__obLocate.revealPoint(a), anchor))
        await page.waitForTimeout(700);
      Object.assign(
        report,
        await page.evaluate((a) => window.__obLocate.check(a), anchor)
      );
      if (report.same) break;
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: shot });
    report.screenshot = shot;
    return report;
  } finally {
    await context.close();
    if (!shared) await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name, fallback = null) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
  };
  const { anchor, note } = readNote(flag("anchor"));
  const [w, h] = (flag("viewport") || "").split("x").map((n) => Number(n) || 0);
  const report = await locateAnchor({
    anchor,
    note,
    base: flag("base") || PRODUCTION,
    engine: flag("browser", "chromium"),
    viewport: w && h ? { width: w, height: h } : null,
    out: flag("out"),
    chapterPath: flag("path"),
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.found === false ? 1 : report.same ? 0 : 2);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((err) => {
    if (err instanceof UsageError) {
      console.error(err.message);
      console.error(
        "usage: npm run feedback:locate -- --anchor <json|file> [--base URL] [--browser chromium|webkit] [--viewport WxH] [--out file.png] [--path /chapter/N/slug]"
      );
      process.exit(64);
    }
    console.error(err?.stack || err);
    process.exit(1);
  });
}
