/** OPENBRAIN-67: GET-only published-data proof, with the real SQL applied
 * only in PGlite and its results supplied to page.route. No live writes.
 * HISTORY_SQL_HARNESS=/path/to/pglite node scripts/retina-figure-numbers-browser.mjs
 * --snapshot /path/to/live.json --out /path/to/proof [--base http://127.0.0.1:5267]
 * The base is a Vite dev server (measured ScrollTrigger windows use its imports).
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium, webkit, devices } from "@playwright/test";
import {
  figureNumbersDb,
  sql,
} from "../src/__tests__/helpers/retinaFigureNumbers.mjs";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const data = JSON.parse(readFileSync(flag("snapshot"), "utf8"));
const out = flag("out");
const base = flag("base", "http://127.0.0.1:5267");
mkdirSync(out, { recursive: true });
const db = await figureNumbersDb(data);
await db.exec(sql);
const numbered = (await db.query("select * from animations")).rows;
await db.close();
const after = data.animations.map((a) => ({
  ...a,
  ...numbered.find((r) => r.id === a.id),
}));
const retina = data.modules.find((m) => m.slug === "the-retina");
const sids = data.sections
  .filter((s) => s.module_id === retina.id)
  .map((s) => s.id);
const ids = new Set(
  data.paragraphs
    .filter((p) => sids.includes(p.section_id))
    .map((p) => p.animation_id)
    .filter(Boolean)
);
const figures = after.filter((a) => ids.has(a.id));
assert.equal(figures.length, 26);
const normalize = (key) =>
  key
    .toLowerCase()
    .replace(/^trigger/, "")
    .replace(/^animation/, "");
const recordFor = (key) =>
  figures.find((a) => normalize(a.animation_key) === normalize(key));
const results = [];
const save = () =>
  writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
const selected = flag("engines", "chromium,webkit").split(",");
const widths = flag("widths", "1440,1024,390").split(",").map(Number);
const phases = flag("phases", "before,after").split(",");
for (const engine of [chromium, webkit].filter((e) =>
  selected.includes(e.name())
)) {
  const browser = await engine.launch();
  try {
    for (const width of widths) {
      let before;
      for (const phase of phases) {
        const prefix = `${phase}-${engine.name()}-${width}`;
        const result = {
          phase,
          engine: engine.name(),
          width,
          pane: [],
          inline: [],
          search: [],
          rail: [],
          errors: [],
          warnings: [],
          blocked: [],
        };
        results.push(result);
        const context = await browser.newContext({
          ...(width === 390 ? devices["iPhone 13"] : {}),
          viewport: { width, height: width === 390 ? 844 : 900 },
        });
        try {
          await context.route("**/*", async (route) => {
            const req = route.request();
            const url = new URL(req.url());
            if (
              !["GET", "HEAD", "OPTIONS"].includes(req.method()) &&
              (url.origin === new URL(base).origin ||
                /\/(rest|auth)\/v1\//.test(url.pathname))
            ) {
              result.blocked.push(req.url());
              return route.abort();
            }
            const table = url.pathname.split("/").at(-1);
            if (!url.pathname.includes("/rest/v1/") || !data[table])
              return route.continue();
            let rows =
              table === "animations" && phase === "after" ? after : data[table];
            for (const [key, filter] of url.searchParams) {
              if (filter.startsWith("eq."))
                rows = rows.filter((r) => String(r[key]) === filter.slice(3));
              if (filter.startsWith("in.(")) {
                const vals = filter.slice(4, -1).replaceAll('"', "").split(",");
                rows = rows.filter((r) => vals.includes(String(r[key])));
              }
            }
            const order = url.searchParams.get("order");
            if (order)
              rows = [...rows].sort((a, b) => {
                for (const col of order.split(",")) {
                  const [key, dir] = col.split(".");
                  const n =
                    typeof a[key] === "number"
                      ? a[key] - b[key]
                      : String(a[key]).localeCompare(String(b[key]));
                  if (n) return dir === "desc" ? -n : n;
                }
                return 0;
              });
            return route.fulfill({ json: rows });
          });
          const page = await context.newPage();
          page.on("pageerror", (e) => result.errors.push(e.message));
          page.on("console", (m) => {
            if (m.type() === "error") result.errors.push(m.text());
            if (m.type() === "warning") result.warnings.push(m.text());
          });
          await page.goto(`${base}/chapter/2/the-retina`);
          await page.locator("#text").waitFor();
          await page
            .locator(".animationTrigger[id]")
            .first()
            .waitFor({ state: "attached" });
          await page.waitForTimeout(1800);
          result.triggers = await page
            .locator(".animationTrigger[id]")
            .evaluateAll((es) => es.map((e) => e.id));
          result.text = await page.locator("#text").evaluate((el) => {
            const prose = el.cloneNode(true);
            // Inline toolbars belong to #text on phones; compare the prose
            // independently of the figure labels this migration adds.
            prose
              .querySelectorAll(".fig-label")
              .forEach((label) => label.remove());
            return prose.textContent;
          });
          result.bands = await page
            .locator(".wb[data-widget-breakout]")
            .evaluateAll((es) => es.map((e) => e.dataset.widgetBreakout));
          await page.evaluate(() => {
            document.documentElement.style.scrollBehavior = "auto";
          });

          if (width >= 1024) {
            const marks = page.locator(".rr-mark");
            result.rail = await marks.evaluateAll((es) =>
              es.map((e) => ({
                name: e.getAttribute("aria-label"),
                tip: e.querySelector(".rr-tip")?.textContent,
              }))
            );
            assert(result.rail.length >= 25, `${prefix}: reading rail mounted`);
            if (phase === "after") {
              for (const mark of result.rail)
                assert.match(
                  mark.tip,
                  /^Figure \d+:/,
                  `${prefix}: rail tooltip`
                );
              for (const a of figures.filter((a) => !a.config.fullscreen))
                assert(
                  result.rail.some((m) =>
                    m.tip.startsWith(
                      `Figure ${a.config.figureNumber}: ${a.title}`
                    )
                  ),
                  `${prefix}: rail ${a.animation_key}`
                );
            }
            for (
              let i = 0;
              i < (await page.locator(".animationTrigger[id]").count());
              i++
            ) {
              const trigger = page.locator(".animationTrigger[id]").nth(i);
              const triggerId = await trigger.getAttribute("id");
              const record = recordFor(triggerId);
              if (!record || record.config.fullscreen) continue;
              const land = () =>
                trigger.evaluate(async (el) => {
                  const source = await fetch(
                    "/src/components/chapter/Illus/IllustrationsComp.vue"
                  ).then((r) => r.text());
                  const { default: ST } = await import(
                    source.match(/import ScrollTrigger from "([^"]+)"/)[1]
                  );
                  ST.refresh();
                  const st = ST.getAll().find(
                    (s) =>
                      s.vars.id === "scrollTriggerAnimation" && s.trigger === el
                  );
                  if (!st) return null;
                  scrollTo(
                    0,
                    st.start + Math.max(1, (st.end - st.start) * 0.4)
                  );
                  ST.update();
                  return { start: st.start, end: st.end };
                });
              let window;
              const pane = page.locator(".figure-pane");
              for (let attempt = 0; attempt < 8; attempt++) {
                window = await land();
                await page.waitForTimeout(300);
                const key = await pane.getAttribute("data-figure-key");
                if (key && normalize(key) === normalize(record.animation_key))
                  break;
              }
              assert(window, `${prefix}: trigger window ${triggerId}`);
              assert.equal(
                normalize((await pane.getAttribute("data-figure-key")) || ""),
                normalize(record.animation_key),
                `${prefix}: selected ${triggerId}`
              );
              await pane
                .locator(".fade-leave-active, .fade-enter-active")
                .first()
                .waitFor({ state: "detached", timeout: 5000 });
              await pane
                .locator("svg, img, iframe, video, canvas, .ve-poster")
                .filter({ visible: true })
                .first()
                .waitFor({ state: "attached", timeout: 15000 });
              const labels = await pane
                .locator(".fig-label")
                .filter({ visible: true })
                .allTextContents();
              for (const label of labels)
                assert.equal(
                  label,
                  phase === "after"
                    ? `FIG ${String(record.config.figureNumber).padStart(2, "0")}`
                    : "FIG"
                );
              result.pane.push({
                trigger: triggerId,
                key: record.animation_key,
                number: record.config.figureNumber,
                window,
                labels,
              });
              if (labels.length)
                await pane.screenshot({
                  path: `${out}/${prefix}-${record.animation_key}-toolbar.png`,
                });
              if (
                phase === "after" &&
                /widget-upload:retina-photoreceptors/.test(record.animation_key)
              )
                await pane.screenshot({
                  path: `${out}/${prefix}-pane-upload.png`,
                });
            }
          } else {
            const inline = page.locator(".illu-inline[data-figure-key]");
            for (let i = 0; i < (await inline.count()); i++) {
              const el = inline.nth(i);
              const key = await el.getAttribute("data-figure-key");
              const record = recordFor(key);
              assert(record, `${prefix}: inline record ${key}`);
              await el.scrollIntoViewIfNeeded();
              await el
                .locator("svg, img, iframe, video, canvas, .ve-poster")
                .filter({ visible: true })
                .first()
                .waitFor({ state: "attached", timeout: 15000 });
              const labels = await el.locator(".fig-label").allTextContents();
              for (const label of labels)
                assert.equal(
                  label,
                  phase === "after"
                    ? `FIG ${String(record.config.figureNumber).padStart(2, "0")}`
                    : "FIG"
                );
              result.inline.push({ key, labels });
              if (labels.length)
                await el.screenshot({
                  path: `${out}/${prefix}-${key}-toolbar.png`,
                });
            }
          }
          // Visit all uploaded figure placements and standalone widget bands.
          for (
            let i = 0;
            i < (await page.locator(".wb[data-widget-breakout]").count());
            i++
          ) {
            const band = page.locator(".wb[data-widget-breakout]").nth(i);
            await band.scrollIntoViewIfNeeded();
            await page.waitForTimeout(80);
          }
          // The fullscreen split/gallery is the same mounted figure before/after.
          result.fullscreen = await page
            .locator(".sp .sp-stage-left svg")
            .count();
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth
            ),
            false,
            `${prefix}: no horizontal scroll`
          );
          // Leave any floating widget stage before using the fixed top bar.
          await page.evaluate(() => scrollTo(0, 0));
          await page.waitForTimeout(500);
          if (width === 390)
            await page.getByTestId("reader-search-toggle").click();
          const input = page.getByTestId("reader-search-input");
          for (const [query, n] of [
            ["Counting photons", 8],
            ["Photoreceptors", 7],
            ["Spontaneous waves", 20],
            ["Retinitis pigmentosa", 26],
          ]) {
            await input.fill(query);
            const hit = page
              .locator('[role="option"][data-kind="figure"]')
              .filter({ hasText: query })
              .first();
            await hit.waitFor();
            const tag = await hit.locator(".result-tag").textContent();
            assert.equal(
              tag,
              phase === "after" ? `Fig ${String(n).padStart(2, "0")}` : "Fig"
            );
            result.search.push({ query, tag });
          }
          await page.screenshot({ path: `${out}/${prefix}-search.png` });
          await input.press("Escape");
          const unexpected = result.errors.filter(
            (e) =>
              !(
                engine.name() === "webkit" &&
                /^Button failed to load, iconName = (?:invalid|pip|airplay)-placard, layoutTraits = \[MacOSLayoutTraits Inline\], src = blob:/.test(
                  e
                )
              )
          );
          assert.deepEqual(unexpected, [], `${prefix}: console errors`);
          assert.deepEqual(result.blocked, [], `${prefix}: no write requests`);
          if (phase === "before") before = result;
          if (before && phase === "after") {
            assert.deepEqual(
              result.triggers,
              before.triggers,
              `${prefix}: same triggers`
            );
            assert.deepEqual(
              result.bands,
              before.bands,
              `${prefix}: same widget placements`
            );
            assert.deepEqual(
              result.pane.map((f) => f.key),
              before.pane.map((f) => f.key),
              `${prefix}: same pane figures mount`
            );
            assert.deepEqual(
              result.inline.map((f) => f.key),
              before.inline.map((f) => f.key),
              `${prefix}: same inline figures mount`
            );
            assert.equal(
              result.text,
              before.text,
              `${prefix}: unchanged prose`
            );
            assert.equal(
              result.fullscreen,
              before.fullscreen,
              `${prefix}: same fullscreen figures`
            );
          }
          result.passed = true;
          save();
          console.log(
            prefix,
            "passed",
            result.pane.length,
            "pane",
            result.inline.length,
            "inline"
          );
        } catch (e) {
          result.failure = e.stack;
          save();
          throw e;
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
