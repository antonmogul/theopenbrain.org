/** OPENBRAIN-62b: published reader proof, GET-only, with the eight repaired
 * upload files substituted using page.route. Never writes published data.
 * PW_TEST_SCREENSHOT_NO_FONTS_READY=1 node scripts/retina-tob-reader-browser.mjs
 * --base http://127.0.0.1:5262 --out /tmp/tob-reader
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, webkit } from "@playwright/test";
const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const out = flag("out", "/tmp/tob-reader");
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(
  readFileSync("src/__tests__/fixtures/retinaTobPhoneFit.json", "utf8")
);
const md5 = (html) => createHash("md5").update(html).digest("hex");
const slugs = [
  "retina-direction-selectivity",
  "retina-pupillary-light-reflex",
  "retina-refraction-errors",
  "retina-phototransduction",
  "retina-visual-cycle",
];
const records = [];
for (const engine of flag("engines", "chromium,webkit").split(",")) {
  const browser = await { chromium, webkit }[engine].launch();
  try {
    for (const width of flag("widths", "390,1024,1440")
      .split(",")
      .map(Number)) {
      const page = await browser.newPage({
        viewport: { width, height: 844 },
        isMobile: width === 390,
        hasTouch: width === 390,
      });
      const record = { engine, width, errors: [], uploads: [], bands: [] };
      records.push(record);
      page.on("pageerror", (e) => record.errors.push(e.message));
      await page.route("**/rest/v1/**", async (route) => {
        assert.equal(route.request().method(), "GET", "read-only proof");
        if (
          !new URL(route.request().url()).pathname.endsWith("/widget_uploads")
        )
          return route.continue();
        const response = await route.fetch(),
          rows = await response.json();
        assert(Array.isArray(rows), "public widget GET succeeded");
        for (const row of rows) {
          const item = manifest.find((m) => m.slug === row.slug);
          if (!item) continue;
          assert(
            [item.beforeMd5, item.afterMd5].includes(md5(row.html)),
            `${row.slug}: published preimage drift`
          );
          record.uploads.push({ slug: row.slug, publishedMd5: md5(row.html) });
          row.html = readFileSync(
            `src/widgets/uploads/${row.slug}.html`,
            "utf8"
          );
        }
        await route.fulfill({ response, json: rows });
      });
      try {
        await page.goto(
          `${flag("base", "http://127.0.0.1:5262")}/chapter/2/the-retina`,
          { waitUntil: "networkidle", timeout: 45000 }
        );
        for (const slug of slugs) {
          const id = `upload:${slug}`,
            block = page.locator(`[data-widget-breakout="${id}"]`);
          assert.equal(await block.count(), 1, `${slug}: one published band`);
          const stage = page.locator(`[data-widget-stage="${id}"]`);
          await stage.evaluate((el) => {
            document.documentElement.style.scrollBehavior = "auto";
            window.scrollTo({
              top: el.getBoundingClientRect().top + scrollY,
              behavior: "instant",
            });
          });
          const iframe = stage.locator("iframe.widget-frame");
          await iframe.waitFor();
          const frame = iframe.contentFrame();
          await frame
            .locator(".tob-anim svg")
            .first()
            .waitFor({ state: "attached" });
          await page.waitForTimeout(250);
          if (await frame.locator(".tob-info-open").count())
            await frame.locator(".tob-info-btn").click();
          await page.waitForTimeout(400);
          const metrics = await frame
            .locator(".tob-canvas")
            .evaluate((canvas) => {
              const rect = (el) => {
                const r = el.getBoundingClientRect();
                return { width: r.width, height: r.height };
              };
              return {
                canvas: rect(canvas),
                svg: rect(
                  document.querySelector(".tob-anim:not([hidden]) svg")
                ),
                overflow:
                  document.documentElement.scrollWidth -
                  document.documentElement.clientWidth,
              };
            });
          assert(metrics.canvas.width > 200, `${slug}: canvas squeezed`);
          assert(
            metrics.svg.width > 150 && metrics.svg.height > 120,
            `${slug}: invisible artwork`
          );
          assert(metrics.overflow <= 1, `${slug}: overflow`);
          const hold = stage.locator(
            "xpath=ancestor::*[contains(@class,'fb-screen-hold')][1]"
          );
          assert.equal(await hold.count(), 1, `${slug}: full-screen hold`);
          const pauseRoom = await hold.evaluate(
            (el) =>
              el.parentElement
                .querySelector(".fb-screen-room")
                ?.getBoundingClientRect().height || 0
          );
          if (width >= 1024)
            assert(pauseRoom > 0, `${slug}: History-style pause`);
          record.bands.push({
            slug,
            iframe: await iframe.boundingBox(),
            ...metrics,
            pauseRoom,
          });
          await page.screenshot({
            path: `${out}/${engine}-${width}-${slug}.png`,
          });
        }
        assert.equal(record.errors.length, 0, "no page errors");
        record.ok = true;
      } catch (e) {
        record.failure = e.message;
        console.error(engine, width, e);
      }
      writeFileSync(`${out}/results.json`, JSON.stringify(records, null, 2));
      console.log(JSON.stringify(record));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
assert(
  records.every((r) => r.ok),
  `Reader proof failed; see ${out}/results.json`
);
