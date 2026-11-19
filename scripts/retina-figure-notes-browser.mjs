#!/usr/bin/env node
// OPENBRAIN-51: real reader, published GETs, and local migration overlay only.
// RETINA_FIGURE_FIXTURE=/tmp/live.json supplies the read-only export documented
// in docs/retina-figure-notes.md. No database or review-status writes occur.
import { chromium, webkit } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
const data = JSON.parse(
  readFileSync(process.env.RETINA_FIGURE_FIXTURE, "utf8")
);
const out =
  process.env.RETINA_FIGURE_OUT || "/private/tmp/retina-figures/acceptance";
mkdirSync(out, { recursive: true });
const base = process.env.RETINA_FIGURE_BASE || "http://127.0.0.1:5251";
const db = new PGlite();
await db.exec(
  `create table modules(id uuid,slug text);create table sections(id uuid,module_id uuid,slug text,animation_config jsonb,updated_at timestamptz);create table animations(id uuid,animation_key text);create table paragraphs(id uuid,section_id uuid,animation_id uuid,has_animation boolean,animation_trigger text,content jsonb,updated_at timestamptz);`
);
for (const [table, columns] of [
  ["modules", ["id", "slug"]],
  ["sections", ["id", "module_id", "slug", "animation_config"]],
  ["animations", ["id", "animation_key"]],
  [
    "paragraphs",
    [
      "id",
      "section_id",
      "animation_id",
      "has_animation",
      "animation_trigger",
      "content",
    ],
  ],
]) {
  for (const row of data[table])
    await db.query(
      `insert into ${table}(${columns.join(",")}) values (${columns.map((_, i) => "$" + (i + 1)).join(",")})`,
      columns.map((c) => row[c])
    );
}
await db.exec(
  readFileSync(
    "supabase/migrations/20261119510000_retina_figure_notes.sql",
    "utf8"
  )
);
for (const table of ["sections", "paragraphs"]) {
  const { rows } = await db.query(`select * from ${table}`);
  data[table] = data[table].map((original) => ({
    ...original,
    ...rows.find((r) => r.id === original.id),
  }));
}
await db.close();
const results = [];
const record = (result) => {
  results.push(result);
  console.log(result.engine, result.width, result.test);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
for (const engine of [chromium, webkit].filter(
  (e) =>
    !process.env.RETINA_FIGURE_ENGINES ||
    process.env.RETINA_FIGURE_ENGINES.split(",").includes(e.name())
)) {
  const browser = await engine.launch();
  for (const width of (process.env.RETINA_FIGURE_WIDTHS || "1440,1024,390")
    .split(",")
    .map(Number)) {
    const context = await browser.newContext({
      viewport: {
        width,
        height: width === 390 ? 844 : width === 1024 ? 768 : 900,
      },
    });
    const blocked = new Set();
    await context.route("**/*", (route) => {
      const req = route.request();
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) {
        blocked.add(req.url());
        return route.abort();
      }
      const url = new URL(req.url());
      const table = url.pathname.split("/").at(-1);
      if (
        url.pathname.includes("/rest/v1/") &&
        ["sections", "paragraphs"].includes(table)
      )
        return route.fulfill({ json: data[table] });
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error")
        errors.push({ text: m.text(), url: m.location().url });
    });
    await page.goto(`${base}/chapter/2/the-retina`);
    await page.locator("#text").waitFor();
    await pause(2500);
    const land = async (selector, fraction = 0.5) => {
      const target = page.locator(selector).first();
      await target.waitFor({ state: "attached" });
      const align = () =>
        target.evaluate(
          (e, f) =>
            scrollTo(
              0,
              e.getBoundingClientRect().top +
                scrollY +
                e.offsetHeight * f -
                innerHeight / 2
            ),
          fraction
        );
      await align();
      await pause(1300);
      await align();
      await pause(800);
      return target;
    };
    const prefix = `${engine.name()}-${width}`;
    for (const [label, id, highlight] of [
      [
        "horizontal",
        "4bb764b8-e8ce-4503-8d09-9db82ccb9958",
        "horizontalCellsHighlight",
      ],
      [
        "bipolar",
        "b9d2316d-f213-4d6d-a0ad-21aa85194e9a",
        "bipolarCellsHighlight",
      ],
      [
        "bipolar-return",
        "9d58814b-cffe-4e2e-9292-8859e833c8cf",
        "bipolarCellsHighlight",
      ],
    ]) {
      await land(`[id="${id}"]`, 0.12);
      const scope =
        width >= 1024
          ? page.locator(".figure-pane")
          : page
              .locator(
                `[data-figure-key="${label === "horizontal" ? "animationRetinalCellTypes3" : "animationRetinalCellTypes2"}"]`
              )
              .filter({ visible: true })
              .first();
      await scope.locator("svg path").first().waitFor();
      assert(
        (await scope.locator(`.${highlight}.highlightIllu`).count()) > 0,
        `${prefix} ${label} preset`
      );
      await scope.screenshot({ path: `${out}/${prefix}-${label}.png` });
      record({
        engine: engine.name(),
        width,
        test: label,
        highlight: true,
      });
    }
    if (width >= 1024) {
      for (const [label, selector, key] of [
        [
          "photoreceptors-gap",
          '[id="37f73c1d-d42b-4b2b-bd8c-773d3633eaea"]',
          "widget-upload:retina-photoreceptors",
        ],
        [
          "rod-cone-gap",
          '[id="0cb275ed-dc4e-4ee2-b78b-2d51e0b2b88c"]',
          "widget-upload:retina-photoreceptors",
        ],
        [
          "center-gap",
          '[id="5b101815-0894-48a9-9ed0-a94a9d4d9492"]',
          "widget-upload:retina-center-surround",
        ],
      ]) {
        await land(selector);
        assert.equal(
          await page.locator(".figure-pane").getAttribute("data-figure-key"),
          key
        );
        await page.screenshot({ path: `${out}/${prefix}-${label}.png` });
        record({ engine: engine.name(), width, test: label, key });
      }
      await land('[id="fccf2f42-9f63-4c68-b8d9-24f67b239637"]', 0.2);
      assert.equal(
        await page.locator(".figure-pane").getAttribute("data-figure-key"),
        "animationcoloropponency"
      );
      for (const [label, key, transition] of [
        [
          "cell-handoff",
          "widget-upload:retina-retinal-cell-types",
          "animationRetinalCellTypesTransition",
        ],
        [
          "circuit-handoff",
          "widget-upload:retina-center-surround",
          "animationRetinalCircuitsTransition",
        ],
      ]) {
        const bare = key.replace(/^animation/, "");
        await land(
          `[id="triggerAnimation${bare}" i], [id="trigger${bare}" i]`,
          0.05
        );
        await pause(1600);
        const sequence = page
          .locator(".figure-sequence")
          .filter({ visible: true })
          .first();
        const frame = sequence.locator("iframe");
        await frame.waitFor();
        const actual = await frame
          .contentFrame()
          .locator(".tob-canvas .tob-anim svg")
          .first()
          .evaluate((e) => {
            const r = e.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              viewBox: e.getAttribute("viewBox"),
            };
          });
        const iframeBox = await frame.boundingBox();
        const scale = await frame.evaluate(
          (e) => e.getBoundingClientRect().width / e.clientWidth
        );
        const expected = {
          x: iframeBox.x + actual.x * scale,
          y: iframeBox.y + actual.y * scale,
          width: actual.width * scale,
          height: actual.height * scale,
        };
        const target = sequence.locator(".transition-art");
        const rect = await target.boundingBox();
        for (const dim of ["x", "y", "width", "height"])
          assert(
            Math.abs(rect[dim] - expected[dim]) < 2,
            `${prefix} ${label} ${dim}: ${rect[dim]} != ${expected[dim]}`
          );
        assert.equal(
          await target.locator("svg").getAttribute("viewBox"),
          actual.viewBox
        );
        await page.screenshot({ path: `${out}/${prefix}-${label}-widget.png` });
        // Back into the authored entrance: both stay mounted, at the same scale/crop.
        const trigger = page.locator(`[id="trigger${transition}" i]`).first();
        if (await trigger.count())
          await land(`[id="trigger${transition}" i]`, 0.92);
        else await land('[id="08333789-23e1-4864-bb75-de07fc3447d4"]', 0.5);
        await page.screenshot({
          path: `${out}/${prefix}-${label}-entrance.png`,
        });
        record({
          engine: engine.name(),
          width,
          test: label,
          rect,
          expected,
        });
      }
      await land('[id="4107a5c6-18d1-40a2-a517-23caee05c465"]', 0.25);
      const eye = page.locator(".figure-pane");
      await eye.locator(".illustration-caption strong").waitFor();
      const title = await eye
        .locator(".illustration-caption strong")
        .boundingBox();
      const art = await eye.locator(".illustration-art").boundingBox();
      assert(title.y >= art.y + art.height - 1);
      await eye.screenshot({ path: `${out}/${prefix}-eye-movements.png` });
      await land('[id="triggerAnimationdragon" i]', 0.85);
      const samples = [];
      await page.evaluate(() => {
        window.__captionSamples = [];
        const end = performance.now() + 800;
        function sample() {
          const e = document.querySelector(
            ".figure-pane .illustration-caption"
          );
          if (e) {
            const r = e.getBoundingClientRect();
            window.__captionSamples.push({ y: r.y, h: r.height });
          }
          if (performance.now() < end) requestAnimationFrame(sample);
        }
        sample();
        const e = document.querySelector('[id="triggerAnimationdragon" i]');
        scrollTo(
          0,
          e.getBoundingClientRect().bottom + scrollY - innerHeight / 2 + 5
        );
      });
      await pause(900);
      samples.push(...(await page.evaluate(() => window.__captionSamples)));
      if (samples.length)
        assert(
          Math.max(...samples.map((s) => s.y)) -
            Math.min(...samples.map((s) => s.y)) <
            2,
          `${prefix} Zahn caption moved during leave`
        );
      record({
        engine: engine.name(),
        width,
        test: "Zahn leave",
        samples,
      });
    }
    if (width === 390) {
      await land('[id="4107a5c6-18d1-40a2-a517-23caee05c465"]', 0.1);
      const eye = page
        .locator('[data-figure-key="animationEyeMovements"]')
        .filter({ visible: true })
        .first();
      await eye.locator(".illustration-caption").waitFor();
      await eye.screenshot({
        path: `${out}/${prefix}-eye-movements-inline.png`,
      });
    }
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-reduce-motion", "1")
    );
    await land('[id="4bb764b8-e8ce-4503-8d09-9db82ccb9958"]', 0.12);
    const reduced =
      width >= 1024
        ? page.locator(".figure-pane")
        : page
            .locator('[data-figure-key="animationRetinalCellTypes3"]')
            .filter({ visible: true })
            .first();
    assert(
      (await reduced
        .locator(".horizontalCellsHighlight.highlightIllu")
        .count()) > 0
    );
    await reduced.screenshot({ path: `${out}/${prefix}-reduced.png` });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      `${prefix} horizontal overflow`
    );
    const unexpected = errors.filter(
      (error) => typeof error === "string" || !blocked.has(error.url)
    );
    assert.deepEqual(unexpected, [], `${prefix} console errors`);
    record({
      engine: engine.name(),
      width,
      test: "console, overflow and read-only guard",
      blocked: [...blocked],
    });
    await context.close();
  }
  await browser.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
console.log(`${results.length} reader checks passed; ${out}`);
