/*
 * smoke.mjs — load the real app in a real browser and assert it isn't broken.
 *
 * The gap this fills: unit tests pass while the reader scrolls sideways at
 * every desktop width (OPENBRAIN-4). Nothing in the suite loads a page, so
 * layout regressions and load-time exceptions were invisible until someone
 * looked. This runs a handful of routes at a few widths and fails on:
 *
 *   • an uncaught page error or console error
 *   • horizontal scroll (the whole OPENBRAIN-4 class of bug)
 *   • a route that renders almost no text (blank-screen regressions)
 *
 * Runs against `vite preview` (the production build) so it exercises what
 * actually ships, not the dev server.
 *
 * Usage:
 *   npm run test:smoke
 *   node scripts/smoke.mjs --base http://localhost:4173
 *
 * Failure screenshots land in .smoke/ (git-ignored, uploaded by CI).
 */
import { chromium } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const BASE = flag("base", "http://localhost:4173").replace(/\/$/, "");
const OUT = path.resolve(flag("out", ".smoke"));

/*
 * Widths chosen to cover the breakpoint ladder: below md, the 768–1299 band
 * (where the figure pane is hidden), and above xl:1300 where the reader
 * switches to the pinned two-column layout.
 */
const WIDTHS = [390, 1280, 1440, 1920];

/*
 * minText guards against a route rendering its chrome but no content — the
 * failure mode when a data fetch breaks. Numbers are deliberately generous so
 * this fails on "blank", not on "shorter than I expected".
 *
 * `needsData` marks routes whose content comes from Supabase. Without
 * credentials the build still serves the SPA shell, but the chapter fetch
 * returns index.html and the route renders ~319 chars of chrome. That is a
 * missing secret, not a regression, so on an unconfigured runner those routes
 * drop their content assertion and keep the structural ones (no horizontal
 * scroll, no unexpected errors, HTTP < 400).
 *
 * Set VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY in the CI environment
 * to turn the content checks back on — that is the stronger gate and worth
 * doing before user testing.
 */
function hasSupabaseCredentials() {
  if (
    process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ) {
    return true;
  }
  // Vite reads .env at build time, so the vars aren't in this process's env.
  // Check the file directly rather than reporting a local run as degraded.
  try {
    const env = readFileSync(path.resolve(".env"), "utf8");
    return (
      /^VITE_SUPABASE_URL=.+/m.test(env) &&
      /^VITE_SUPABASE_PUBLISHABLE_KEY=.+/m.test(env)
    );
  } catch {
    return false;
  }
}

const HAS_SUPABASE = hasSupabaseCredentials();
/*
 * `widths` narrows the check for routes that are legitimately desktop-only.
 * /styleguide and /case-cabinet are unlisted internal routes — a design
 * reference and an interaction prototype — with fixed-pixel layouts that
 * overflow at phone width by design. They still get checked on desktop, so a
 * regression there is caught; they just don't block on a mobile layout nobody
 * has built yet. Student- and professor-facing routes are checked everywhere.
 */
const ROUTES = [
  { path: "/", name: "home", minText: 50 },
  {
    path: "/chapter/3/foundations-of-neuroscience",
    name: "chapter-3",
    minText: 2000,
    needsData: true,
  },
  {
    path: "/chapter/1/the-retina",
    name: "chapter-1",
    minText: 2000,
    needsData: true,
  },
  { path: "/chapters", name: "chapters", minText: 50 },
  {
    path: "/styleguide",
    name: "styleguide",
    minText: 200,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/case-cabinet",
    name: "case-cabinet",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
];

/* Noise that predates this harness and isn't what we're gating on. Keep this
   list short and justified — every entry is a bug someone chose not to fix. */
const IGNORED_ERRORS = [
  /favicon/i,
  // 404s are REAL failures again — the every-route font 404s were fixed by
  // pruning dead @font-face rules (OPENBRAIN-9 §5). The ONE remaining
  // exemption is the missing Lottie animation files (tracked in OPENBRAIN-9
  // §4b): the app-side lottieAssetOk guard probes them with HEAD and skips
  // the figure, but the browser still logs the probe's 404. Delete this line
  // when the assets ship.
  /404 \(Not Found\).*\/publicAssets\/animations\//i,
];

const isRealError = (text) => !IGNORED_ERRORS.some((re) => re.test(text));

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  if (!HAS_SUPABASE) {
    console.warn(
      "\n  ! No Supabase credentials — chapter CONTENT checks are skipped.\n" +
        "    Structural checks (scroll, errors, status) still run.\n" +
        "    Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for the full gate.\n"
    );
  }

  const browser = await chromium.launch();
  const failures = [];
  let checks = 0;
  let skippedContent = 0;

  for (const route of ROUTES) {
    for (const width of route.widths || WIDTHS) {
      checks++;
      const label = `${route.name} @ ${width}`;
      const page = await browser.newPage({
        viewport: { width, height: 900 },
      });

      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on(
        "console",
        (m) =>
          m.type() === "error" &&
          // Include the source URL: network-error texts alone don't say WHAT
          // 404'd, and the ignore list below filters by path.
          errors.push(`${m.text()} @ ${m.location()?.url || ""}`)
      );

      try {
        const res = await page.goto(BASE + route.path, {
          waitUntil: "networkidle",
          timeout: 30_000,
        });
        if (res && res.status() >= 400) {
          failures.push(`${label}: HTTP ${res.status()}`);
        }
        // Let route transitions and entrance animations settle.
        await page.waitForTimeout(2500);

        const result = await page.evaluate(() => {
          const before = window.scrollX;
          window.scrollTo(9999, 0);
          const maxScrollX = window.scrollX;
          window.scrollTo(before, 0);
          return {
            maxScrollX,
            textLength: document.body.innerText.trim().length,
          };
        });

        // 1px of slack absorbs sub-pixel rounding at fractional widths.
        if (result.maxScrollX > 1) {
          failures.push(
            `${label}: scrolls horizontally by ${result.maxScrollX}px`
          );
        }
        const checkContent = !route.needsData || HAS_SUPABASE;
        if (!checkContent) skippedContent++;
        if (checkContent && result.textLength < route.minText) {
          failures.push(
            `${label}: rendered ${result.textLength} chars, expected >= ${route.minText}`
          );
        }

        // Without credentials the chapter fetch gets index.html back and throws
        // a JSON parse error. Expected on an unconfigured runner; still a real
        // failure anywhere the keys exist.
        const real = errors
          .filter(isRealError)
          .filter(
            (e) =>
              checkContent ||
              !/Error fetching chapter|is not valid JSON/i.test(e)
          );
        if (real.length) {
          failures.push(`${label}: ${real.length} console/page error(s)`);
          real
            .slice(0, 3)
            .forEach((e) => failures.push(`    ${e.slice(0, 160)}`));
        }

        const ok =
          result.maxScrollX <= 1 &&
          (!checkContent || result.textLength >= route.minText) &&
          !real.length;
        if (!ok) {
          await page.screenshot({
            path: path.join(OUT, `${route.name}-${width}.png`),
            fullPage: false,
          });
        }
        console.log(
          `  ${ok ? "✓" : "✗"} ${label.padEnd(28)} ` +
            `scrollX=${result.maxScrollX} text=${result.textLength}`
        );
      } catch (err) {
        failures.push(`${label}: ${err.message.split("\n")[0]}`);
        console.log(`  ✗ ${label.padEnd(28)} ${err.message.split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();

  console.log(`\n${checks} checks across ${ROUTES.length} routes.`);
  if (skippedContent) {
    console.warn(
      `  ! ${skippedContent} content assertion(s) skipped — no Supabase credentials.`
    );
  }
  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    failures.forEach((f) => console.error(`  ${f}`));
    console.error(`\nScreenshots in ${OUT}/`);
    process.exit(1);
  }
  console.log("All smoke checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
