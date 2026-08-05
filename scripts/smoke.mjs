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
 */
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
  },
  { path: "/chapter/1/the-retina", name: "chapter-1", minText: 2000 },
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
  /404 \(Not Found\)/i, // known missing asset, tracked separately
  /Failed to load resource/i,
];

const isRealError = (text) => !IGNORED_ERRORS.some((re) => re.test(text));

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const failures = [];
  let checks = 0;

  for (const route of ROUTES) {
    for (const width of route.widths || WIDTHS) {
      checks++;
      const label = `${route.name} @ ${width}`;
      const page = await browser.newPage({
        viewport: { width, height: 900 },
      });

      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

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
        if (result.textLength < route.minText) {
          failures.push(
            `${label}: rendered ${result.textLength} chars, expected >= ${route.minText}`
          );
        }

        const real = errors.filter(isRealError);
        if (real.length) {
          failures.push(`${label}: ${real.length} console/page error(s)`);
          real
            .slice(0, 3)
            .forEach((e) => failures.push(`    ${e.slice(0, 160)}`));
        }

        const ok =
          result.maxScrollX <= 1 &&
          result.textLength >= route.minText &&
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
