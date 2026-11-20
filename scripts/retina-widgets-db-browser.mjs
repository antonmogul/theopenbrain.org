/** OPENBRAIN-62 read-only release proof.
 * HISTORY_SQL_HARNESS=/path/to/pglite node scripts/retina-widgets-db-browser.mjs
 * --snapshot /path/to/published-data.json --uploads /path/to/uploads-before.json
 * --out /path/to/proof --main http://127.0.0.1:4262 --after http://127.0.0.1:5262
 * Set PW_TEST_SCREENSHOT_NO_FONTS_READY=1 if WebKit stalls at its fonts-ready wait.
 * Capture the two inputs with creator-free GETs; never use a creator session.
 * The main URL must serve an unmodified origin/main build, captured before edits.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium, webkit } from "@playwright/test";
import { sql, widgetsDb } from "../src/__tests__/helpers/retinaWidgetsDb.mjs";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const data = JSON.parse(readFileSync(flag("snapshot"), "utf8"));
const oldUploads = JSON.parse(readFileSync(flag("uploads"), "utf8"));
const out = flag("out");
mkdirSync(out, { recursive: true });
const db = await widgetsDb(data, oldUploads);
await db.exec(sql);
const changed = (await db.query("select * from paragraphs")).rows;
const newUploads = (await db.query("select * from widget_uploads")).rows;
await db.close();
const after = changed.map((p) => ({
  ...data.paragraphs.find((r) => r.id === p.id),
  ...p,
}));
writeFileSync(
  `${out}/migrated-paragraphs.json`,
  JSON.stringify(after, null, 2)
);
const retina = data.modules.find((m) => m.slug === "the-retina");
const sectionIds = new Set(
  data.sections.filter((s) => s.module_id === retina.id).map((s) => s.id)
);
const paneTargets = data.paragraphs
  .filter((p) => sectionIds.has(p.section_id))
  .flatMap((p) => {
    const a = data.animations.find((a) => a.id === p.animation_id);
    return a?.config?.widgetId?.startsWith("upload:retina-")
      ? [{ paragraph: p.id, widget: a.config.widgetId }]
      : [];
  })
  .filter((p, i, all) => all.findIndex((r) => r.widget === p.widget) === i);
const rowsFor = (url, rows) => {
  let list = rows;
  for (const [field, filter] of url.searchParams) {
    if (filter.startsWith("eq."))
      list = list.filter((r) => String(r[field]) === filter.slice(3));
    if (filter.startsWith("in.(")) {
      const ids = filter.slice(4, -1).replaceAll('"', "").split(",");
      list = list.filter((r) => ids.includes(String(r[field])));
    }
  }
  if (url.searchParams.has("order")) {
    const [key, dir] = url.searchParams.get("order").split(".");
    list = [...list].sort(
      (a, b) => (a[key] - b[key]) * (dir === "desc" ? -1 : 1)
    );
  }
  return list;
};
const results = [];
const engines = { chromium, webkit };
const selected = flag("engines", "chromium,webkit").split(",");
const widths = flag("widths", "1440,1024,390").split(",").map(Number);
const variants = [
  {
    name: "before",
    base: flag("before", "https://theopenbrainorg-production.up.railway.app"),
    migrated: false,
  },
  {
    name: "main-migrated",
    base: flag("main", "http://127.0.0.1:4262"),
    migrated: true,
  },
  {
    name: "after",
    base: flag("after", "http://127.0.0.1:5262"),
    migrated: true,
  },
].filter((v) =>
  flag("variants", "before,main-migrated,after").split(",").includes(v.name)
);

for (const engine of selected) {
  const browser = await engines[engine].launch({ headless: true });
  try {
    for (const width of widths)
      for (const variant of variants) {
        const context = await browser.newContext({
          viewport: { width, height: 960 },
          reducedMotion: "no-preference",
        });
        const page = await context.newPage();
        const record = {
          engine,
          width,
          variant: variant.name,
          pane: [],
          bands: [],
          errors: [],
          violations: [],
          requests: [],
        };
        results.push(record);
        page.on("pageerror", (e) => record.errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error") record.errors.push(m.text());
        });
        await page.addInitScript(() => {
          window.__ob62 = [];
          window.addEventListener("message", (e) => {
            if (!e.data?.__ob) return;
            const frame = [...document.querySelectorAll("iframe")].find(
              (f) => f.contentWindow === e.source
            );
            window.__ob62.push({
              title: frame?.title,
              widget: frame
                ?.closest("[data-widget-stage]")
                ?.getAttribute("data-widget-stage"),
              ...e.data,
            });
          });
        });
        await page.route("**/rest/v1/**", async (route) => {
          const request = route.request(),
            url = new URL(request.url());
          assert.equal(
            request.method(),
            "GET",
            "browser proof must never write"
          );
          const table = url.pathname.split("/").at(-1);
          let rows = data[table];
          if (table === "paragraphs")
            rows = variant.migrated ? after : data.paragraphs;
          if (table === "widget_uploads") {
            rows = variant.migrated
              ? newUploads.map((u) => ({
                  ...oldUploads.find((r) => r.slug === u.slug),
                  ...u,
                }))
              : oldUploads;
            // The three other chapters' uploads remain their real published rows.
            if (
              url.searchParams.get("slug") &&
              !url.searchParams.get("slug").includes("retina-")
            )
              return route.continue();
            record.requests.push(url.searchParams.get("slug"));
          }
          if (!rows) return route.continue();
          await route.fulfill({
            json: rowsFor(url, rows),
            headers: { "access-control-allow-origin": "*" },
          });
        });
        const scroll = async (locator, inset = 64) => {
          await locator.first().evaluate((el, offset) => {
            document.documentElement.style.scrollBehavior = "auto";
            window.scrollTo({
              top: el.getBoundingClientRect().top + window.scrollY - offset,
              behavior: "instant",
            });
          }, inset);
          await page.waitForTimeout(600);
        };
        try {
          await page.goto(`${variant.base}/chapter/2/the-retina`, {
            waitUntil: "networkidle",
            timeout: 45000,
          });
          await page
            .locator("[data-widget-breakout]")
            .first()
            .waitFor({ timeout: 30000 });
          await page.waitForTimeout(700);
          await page.screenshot({
            path: `${out}/${engine}-${width}-${variant.name}-opener.png`,
          });
          record.triggers = await page
            .locator(".animationTrigger")
            .evaluateAll((els) => [
              ...new Set(els.map((e) => e.id).filter(Boolean)),
            ]);
          for (const target of flag("only") === "existing-inline"
            ? []
            : paneTargets) {
            if (
              variant.migrated &&
              target.widget === "upload:retina-direction-selectivity"
            )
              continue;
            let trigger = page.locator(
              `[data-paragraph-id="${target.paragraph}"]`
            );
            if ((await trigger.count()) === 0)
              trigger = page
                .locator(
                  `.animationTrigger[id*="${target.widget.replace("upload:", "widget-upload:")}"]`
                )
                .first();
            if ((await trigger.count()) === 0)
              throw Error(`missing paragraph ${target.paragraph}`);
            await scroll(trigger);
            const title = oldUploads.find(
              (u) => `upload:${u.slug}` === target.widget
            )?.title;
            const iframe = page.locator("iframe.widget-frame");
            await page.waitForFunction(
              (title) =>
                [...document.querySelectorAll("iframe.widget-frame")].some(
                  (f) => f.title === title
                ),
              title,
              { timeout: 12000 }
            );
            record.pane.push({
              widget: target.widget,
              title,
              frames: await iframe.count(),
            });
            if (target.widget === "upload:retina-photoreceptors")
              await page.screenshot({
                path: `${out}/${engine}-${width}-${variant.name}-photoreceptors.png`,
              });
          }
          const bandIds = variant.migrated
            ? [
                "upload:retina-color-vision",
                "upload:retina-direction-selectivity",
                "upload:retina-retinabox",
              ]
            : [
                "color-vision",
                "direction-selectivity",
                "upload:retina-retinabox",
              ];
          const existingInline = [
            "upload:retina-pupillary-light-reflex",
            "upload:retina-refraction-errors",
            "upload:retina-phototransduction",
            "upload:retina-visual-cycle",
          ];
          const checkedBands =
            flag("only") === "existing-inline"
              ? existingInline
              : [...existingInline, ...bandIds];
          for (const id of checkedBands) {
            const block = page.locator(`[data-widget-breakout="${id}"]`);
            assert.equal(await block.count(), 1, `one band ${id}`);
            await scroll(block);
            const stage = page.locator(`[data-widget-stage="${id}"]`);
            if (await stage.count()) await scroll(stage, 0);
            const metrics = await block.evaluate((el) => ({
              kind: el.className,
              timeline: el.dataset.timelineId,
              slot: el.querySelector(".wb-fb")?.getBoundingClientRect().height,
            }));
            if (id === "upload:retina-retinabox") {
              const load = page.getByRole("button", {
                name: "Load RetINaBox",
                exact: true,
              });
              assert.equal(await load.count(), 1, "RetINaBox cover present");
              assert(
                !record.requests.some((r) => r === "eq.retina-retinabox"),
                "RetINaBox was fetched before Load"
              );
              await page.screenshot({
                path: `${out}/${engine}-${width}-${variant.name}-retinabox-cover.png`,
              });
              await load.click();
            }
            if (id.startsWith("upload:")) {
              const title =
                id === "upload:retina-color-vision"
                  ? "Colour vision"
                  : oldUploads.find((u) => `upload:${u.slug}` === id)?.title;
              await page.waitForFunction(
                (title) =>
                  [...document.querySelectorAll("iframe.widget-frame")].some(
                    (f) => f.title === title
                  ),
                title,
                { timeout: 15000 }
              );
              await page.waitForTimeout(600);
            }
            const screen = page
              .locator(`[data-widget-stage="${id}"]`)
              .locator(
                "xpath=ancestor::*[contains(@class,'fb-screen-hold')][1]"
              );
            if (await screen.count()) {
              metrics.hold = await screen.evaluate((el) => ({
                height: el.getBoundingClientRect().height,
                position: getComputedStyle(el).position,
                room:
                  el.parentElement
                    .querySelector(".fb-screen-room")
                    ?.getBoundingClientRect().height || 0,
              }));
              if (width >= 1024)
                assert(
                  metrics.hold.room > 0,
                  `${id} has the History scroll pause`
                );
            }
            record.bands.push({ id, ...metrics });
            await page.screenshot({
              path: `${out}/${engine}-${width}-${variant.name}-${id.split(":").at(-1)}.png`,
            });
            if (await page.locator('[role="dialog"]').count())
              await page.keyboard.press("Escape");
          }
          record.overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          );
          assert(record.overflow <= 1, "no horizontal page scroll");
          record.retinaErrors = [...record.errors];
          const reports = await page.evaluate(() => window.__ob62);
          record.widgetOverflow = reports.filter(
            (m) => m.type === "size" && m.scrollWidth > m.viewport + 1
          );
          assert.equal(
            record.widgetOverflow.length,
            0,
            "no horizontal widget overflow"
          );
          record.bridgeErrors = reports.filter(
            (m) => m.type === "error" || m.type === "blocked"
          );
          assert.equal(
            record.bridgeErrors.length,
            0,
            "no sandbox errors or blocked widget requests"
          );
          assert.equal(record.errors.length, 0, "no console or page errors");
          if (variant.migrated)
            assert(
              !record.triggers.some((id) =>
                id.includes("widget-upload:retina-direction-selectivity")
              ),
              "duplicate DS pane trigger removed"
            );
          if (flag("only") !== "existing-inline") {
            // History still mounts its existing two DB bands, with identical holds.
            await page.goto(
              `${variant.base}/chapter/1/foundations-of-neuroscience`,
              { waitUntil: "networkidle", timeout: 45000 }
            );
            await page
              .locator('[data-widget-breakout="phrenology"]')
              .waitFor({ timeout: 30000 });
            record.history = await page
              .locator("[data-widget-breakout]")
              .evaluateAll((els) =>
                els.map((e) => ({
                  id: e.dataset.widgetBreakout,
                  kind: e.className,
                }))
              );
            assert(record.history.some((p) => p.id === "phrenology"));
            assert(
              record.history.some(
                (p) => p.id === "upload:history-penfield-binder"
              )
            );
            record.historyHolds = [];
            for (const id of ["phrenology", "upload:history-penfield-binder"]) {
              const stage = page.locator(`[data-widget-stage="${id}"]`).first();
              await scroll(stage, 0);
              const hold = stage.locator(
                "xpath=ancestor::*[contains(@class,'fb-screen-hold')][1]"
              );
              assert.equal(
                await hold.count(),
                1,
                `History viewport band ${id}`
              );
              const metrics = await hold.evaluate((el) => ({
                height: el.getBoundingClientRect().height,
                position: getComputedStyle(el).position,
                room:
                  el.parentElement
                    .querySelector(".fb-screen-room")
                    ?.getBoundingClientRect().height || 0,
              }));
              if (width >= 1024)
                assert(metrics.room > 0, `History pause ${id}`);
              record.historyHolds.push({ id, ...metrics });
              await page.screenshot({
                path: `${out}/${engine}-${width}-${variant.name}-history-${id.split(":").at(-1)}.png`,
              });
            }
          }
          record.ok = true;
        } catch (e) {
          record.failure = e.message;
          console.error(engine, width, variant.name, e.message);
          await page
            .screenshot({
              path: `${out}/${engine}-${width}-${variant.name}-failure.png`,
            })
            .catch(() => {});
        }
        writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
        console.log(
          JSON.stringify({
            engine,
            width,
            variant: variant.name,
            ok: record.ok,
            failure: record.failure,
            pane: record.pane.length,
            bands: record.bands.length,
            errors: record.errors,
          })
        );
        await context.close();
      }
  } finally {
    await browser.close();
  }
}
for (const record of results) {
  const baseline = results.find(
    (r) =>
      r.engine === record.engine &&
      r.width === record.width &&
      r.variant === "before"
  );
  if (baseline?.ok && record.ok)
    assert.deepEqual(
      [...new Set(record.errors)].sort(),
      [...new Set(baseline.errors)].sort(),
      "no new errors during History scrolling relative to the production baseline"
    );
}
assert(
  results.every((r) => r.ok),
  `${results.filter((r) => !r.ok).length} browser proof cases failed; see ${out}/results.json`
);
