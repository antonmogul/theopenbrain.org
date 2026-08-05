/*
 * filmstrip.mjs — capture an animation frame-by-frame to disk.
 *
 * Drives the Case Cabinet's on-screen scrubber (DEBUG_TIMELINE in
 * CaseCabinetView.vue) by setting the GSAP timeline's progress directly, then
 * screenshots each beat. Gives a deterministic set of images to look at instead
 * of guessing from getBoundingClientRect numbers.
 *
 * Usage:
 *   node scripts/filmstrip.mjs                     # default: open sequence
 *   node scripts/filmstrip.mjs --close             # capture the close instead
 *   node scripts/filmstrip.mjs --steps 0,25,50,100 # custom percentages
 *   node scripts/filmstrip.mjs --url http://localhost:5173/case-cabinet
 *
 * Output: .filmstrip/<seq>-<pct>.png  (git-ignored)
 */
import { chromium } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const URL = flag("url", "http://localhost:5173/case-cabinet");
const OUT = flag("out", ".filmstrip");
const CLOSE = args.includes("--close");
const STEPS = flag("steps", "0,15,25,40,55,70,85,100")
  .split(",")
  .map((n) => Number(n.trim()))
  .filter((n) => !Number.isNaN(n));
const VIEWPORT = { width: 1440, height: 900 };

const seq = CLOSE ? "close" : "open";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
});

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".folder");
await page.waitForTimeout(900); // let the mount entrance settle

/*
 * Wait on the timeline handle itself, not the scrubber panel. The panel is now
 * opt-in (?scrub=1) so the animation ships demo-clean, while window.__cc is
 * exposed in any dev build — see readScrub/EXPOSE_TIMELINE in CaseCabinetView.
 * Waiting on the DOM panel would tie this script to a debug affordance it
 * doesn't actually use.
 */
const waitForTimeline = (label) =>
  page.waitForFunction(
    (want) => window.__cc?.tl && window.__cc.label === want,
    label,
    { timeout: 5000 }
  );

// Open the first unlocked case. The timeline only exists once one runs.
await page.click(".folder:not(.folder--locked)");
await waitForTimeline("open");

if (CLOSE) {
  // Let the open finish, then trigger close so its timeline is the active one.
  await page.evaluate(() => window.__cc?.tl?.progress(1));
  await page.waitForTimeout(400);
  await page.click(".flyer__close");
  await waitForTimeline("close");
}

for (const pct of STEPS) {
  // Pause and seek via the exposed timeline handle (see __cc in the view).
  await page.evaluate((p) => {
    const tl = window.__cc?.tl;
    if (tl) {
      tl.pause();
      tl.progress(p / 100);
    }
  }, pct);
  await page.waitForTimeout(220); // let the paint settle at this frame

  const file = path.join(OUT, `${seq}-${String(pct).padStart(3, "0")}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${seq} ${String(pct).padStart(3)}%  →  ${file}`);
}

if (errors.length) {
  console.log("\nPage errors:");
  for (const e of [...new Set(errors)]) console.log("  ✗", e);
}

await browser.close();
console.log(`\n${STEPS.length} frames written to ${OUT}/`);
