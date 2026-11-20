/** OPENBRAIN-62b: assert artwork bounds, not just iframe mounts/overflow.
 * node scripts/retina-tob-fit-browser.mjs --out /tmp/tob-fit
 * --engines chromium,webkit --widths 390,1024,1440 --variants before,after
 * No server, database or credentials. Renders the real uploaded HTML through
 * the real sandbox host at the phone band height that exposed the regression.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium, webkit } from "@playwright/test";
import { buildWidgetDoc } from "../src/widgets/uploaded/widgetHost.js";
import { atWidgetsDb } from "../src/__tests__/helpers/retinaWidgetsDb.mjs";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const out = flag("out", "history-fixture-browser-artifacts/tob-fit");
mkdirSync(out, { recursive: true });
const files = readdirSync("src/widgets/uploads").filter(
  (f) =>
    f.startsWith("retina-") &&
    f.endsWith(".html") &&
    readFileSync(`src/widgets/uploads/${f}`, "utf8").includes(".tob-canvas")
);
const results = [];
for (const engine of flag("engines", "chromium,webkit").split(",")) {
  const browser = await { chromium, webkit }[engine].launch();
  try {
    for (const width of flag("widths", "390,1024,1440").split(",").map(Number))
      for (const file of files)
        for (const variant of flag("variants", "after").split(",")) {
          const page = await browser.newPage({
            viewport: { width, height: 900 },
            isMobile: width === 390,
            hasTouch: width === 390,
          });
          const record = {
            engine,
            width,
            slug: file.slice(0, -5),
            variant,
            errors: [],
          };
          results.push(record);
          page.on("pageerror", (e) => record.errors.push(e.message));
          const html = readFileSync(`src/widgets/uploads/${file}`, "utf8");
          const doc = buildWidgetDoc(
            variant === "before" ? atWidgetsDb(html) : html,
            { ramp: "perc", maxHeight: 768 }
          );
          try {
            await page.setContent(
              '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe title="Retina widget" style="display:block;width:100%;height:768px;border:0" sandbox="allow-scripts"></iframe>'
            );
            await page.locator("iframe").evaluate((f, srcdoc) => {
              f.srcdoc = srcdoc;
            }, doc);
            const frame = page.frames().find((f) => f !== page.mainFrame());
            await frame.waitForSelector(".tob-anim svg", { state: "attached" });
            await page.waitForTimeout(120);
            const measure = () =>
              frame.evaluate(() => {
                const bounds = (s) => {
                  const el = document.querySelector(s),
                    b = el?.getBoundingClientRect();
                  return b
                    ? { x: b.x, y: b.y, width: b.width, height: b.height }
                    : null;
                };
                return {
                  canvas: bounds(".tob-canvas"),
                  svg: bounds(".tob-anim:not([hidden]) svg"),
                  key: bounds(".tob-key"),
                  picks: bounds(".tob-picks"),
                  overflow:
                    document.documentElement.scrollWidth -
                    document.documentElement.clientWidth,
                };
              });
            record.initial = await measure();
            const check = (m) => {
              assert(
                m.canvas.width > 200,
                `${record.slug}: canvas is squeezed`
              );
              assert(
                m.svg.width > 150 && m.svg.height > 120,
                `${record.slug}: artwork is invisible/squeezed`
              );
              assert(m.overflow <= 1, `${record.slug}: horizontal scroll`);
              if (width === 390 && m.key?.height > 0)
                assert(
                  m.key.y >= m.canvas.y + m.canvas.height - 1,
                  "key stays below drawing"
                );
              if (width === 390 && m.picks?.height > 0)
                assert(
                  m.picks.y + m.picks.height <= m.canvas.y + 1,
                  "picker stays above drawing"
                );
            };
            if (variant === "after") check(record.initial);
            await page.screenshot({
              path: `${out}/${engine}-${width}-${record.slug}-${variant}.png`,
            });
            // Exercise every visible alternative (cell-type picks, rod/cone,
            // animation states), including toggles that redraw a fresh SVG.
            record.alternatives = [];
            const buttons = frame.locator(".tob-picks button, .tob-seg button");
            for (let i = 0; i < (await buttons.count()); i++) {
              const button = buttons.nth(i);
              if (!(await button.isVisible()) || !(await button.isEnabled()))
                continue;
              await button.click();
              await page.waitForTimeout(70);
              const metrics = await measure();
              record.alternatives.push(metrics);
              if (variant === "after") check(metrics);
            }
            assert.equal(
              record.errors.length,
              0,
              "no widget JavaScript errors"
            );
            record.ok = true;
          } catch (e) {
            record.failure = e.message;
            await page
              .screenshot({
                path: `${out}/${engine}-${width}-${record.slug}-${variant}-failure.png`,
              })
              .catch(() => {});
          }
          await page.close();
          writeFileSync(
            `${out}/results.json`,
            JSON.stringify(results, null, 2)
          );
          console.log(
            JSON.stringify({
              engine,
              width,
              slug: record.slug,
              variant,
              canvas: record.initial?.canvas.width,
              svg: record.initial?.svg.width,
              failure: record.failure,
            })
          );
        }
  } finally {
    await browser.close();
  }
}
assert(
  results.every((r) => r.ok),
  `Artwork proof failed; see ${out}/results.json`
);
