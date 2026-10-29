/*
 * Capture the brain atlas's poster (OPENBRAIN-158):
 *   public/publicAssets/images/brain/brain-poster.webp      1000×1000, 1x
 *   public/publicAssets/images/brain/brain-poster@2x.webp   2000×2000, 2x
 *
 * The home cover and /brain open on this still and fade the live brain in
 * over it (src/helper/brain/poster.js says how it is placed), so it must be
 * the brain exactly as the stage first draws it: the tour's t = 0 pose
 * (helper/brain/dopeframe.js), the book closed, each chapter's part in its
 * resting tint, on nothing. So the script photographs the stage itself:
 *
 *   • opens <base>/brain in Chromium with reduced motion on, which parks
 *     the stage on that pose (no tour, no easing) and keeps it there;
 *   • waits for the stage to report ready and the catalog to answer (the
 *     tints depend on which chapters are published), then a moment for
 *     the tints to settle;
 *   • strips every background and the stage's chrome (label, status,
 *     controls, the poster itself), and screenshots the centre square of
 *     the stage with a transparent background. The page is wide enough
 *     (stage aspect > FIT_ASPECT) that the camera is at the pose's own
 *     distance, fit 1, which the poster's placement assumes;
 *   • encodes WebP in the same Chromium (canvas.toDataURL), so nothing
 *     beyond Playwright is needed. Alpha is kept.
 *
 * The 1x and 2x stills are two captures at device scale 1 and 2, not one
 * resized, so each is what the renderer draws at that pixel ratio.
 *
 * Usage (against the production build, as the smoke test does):
 *   npm run build && npm run preview         # serves :4173
 *   npm run brain-poster                     # in a second terminal
 *   node scripts/brain/capture-brain-poster.mjs --base http://localhost:4231
 *
 * Flags: --base <url> (default http://localhost:4173), --quality <0..1>
 * (WebP, default 0.84), --chromium <path> (or CHROMIUM_PATH) when
 * Playwright's own browser is not installed.
 *
 * Re-run it when the model, its colours, the resting pose or the chapters'
 * parts change; the sizes are printed, and each still should stay well
 * under 150 KB.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const OUT_DIR = path.join(ROOT, "public/publicAssets/images/brain");
const SIZE = 1000; // CSS px of the square still (the stage's height)
// A stage this wide at that height keeps the camera at fit 1 (aspect well
// above FIT_ASPECT) with room for the panel beside it.
const VIEWPORT = { width: 2600, height: SIZE };
const STILLS = [
  { file: "brain-poster.webp", scale: 1 },
  { file: "brain-poster@2x.webp", scale: 2 },
];

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const BASE = flag("base", "http://localhost:4173").replace(/\/$/, "");
const QUALITY = Number(flag("quality", "0.84"));
const CHROMIUM = flag("chromium", process.env.CHROMIUM_PATH);

// What must not be in the picture: every ground, and the stage's chrome.
const BARE_CSS = `
  html, body, .brain-view, .atlas, .atlas__stage { background: transparent !important; }
  .atlas__label, .atlas__status, .atlas__controls, .atlas__poster { display: none !important; }
`;

async function capture(browser, { file, scale }) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: scale,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`${BASE}/brain`, { waitUntil: "networkidle" });
  await page.waitForSelector('.atlas__stage[data-status="ready"]', {
    timeout: 60_000,
  });
  // The catalog has answered once a published chapter has its Read link.
  await page.waitForSelector(".contents__read", { timeout: 30_000 });
  await page.addStyleTag({ content: BARE_CSS });
  await page.waitForTimeout(1500); // tints ease in over ~0.5 s; be sure
  if (errors.length) throw new Error(`console errors:\n${errors.join("\n")}`);

  const box = await page.locator(".atlas__stage").boundingBox();
  if (!box || box.width < box.height * 1.5)
    throw new Error(`stage is ${box?.width}×${box?.height}; widen VIEWPORT`);
  const png = await page.screenshot({
    omitBackground: true,
    clip: {
      x: box.x + (box.width - box.height) / 2,
      y: box.y,
      width: box.height,
      height: box.height,
    },
  });

  // Encode in the browser: Chromium's canvas writes WebP with alpha.
  const dataUrl = await page.evaluate(
    async ({ png, quality }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/webp", quality);
    },
    { png: png.toString("base64"), quality: QUALITY }
  );
  await context.close();
  if (!dataUrl.startsWith("data:image/webp")) throw new Error("no WebP");
  const webp = Buffer.from(dataUrl.split(",")[1], "base64");
  await writeFile(path.join(OUT_DIR, file), webp);
  return { file, side: SIZE * scale, kb: Math.round(webp.length / 1024) };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROMIUM || undefined,
  });
  try {
    for (const still of STILLS) {
      const r = await capture(browser, still);
      console.log(`${r.file}  ${r.side}×${r.side}  ${r.kb} KB`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
