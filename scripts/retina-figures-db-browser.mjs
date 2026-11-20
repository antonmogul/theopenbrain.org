#!/usr/bin/env node
// OPENBRAIN-60: production-shaped reader data, GET-only; SQL runs in PGlite.
// RETINA_FIGURES_DATA is an anonymous REST export of modules/sections/paragraphs/
// animations/animation_states/animation_variants. No live writes are permitted.
import { chromium, webkit, devices } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(process.env.RETINA_FIGURES_DATA, "utf8"));
const base = process.env.RETINA_FIGURES_BASE || "http://127.0.0.1:5260";
const out =
  process.env.RETINA_FIGURES_OUT ||
  "/Volumes/Brain/artifacts/retina-cleanup/60";
const phase = process.env.RETINA_FIGURES_PHASE || "after-sql";
mkdirSync(out, { recursive: true });
if (phase === "after-sql") {
  const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
  const db = new PGlite();
  await db.exec(`create table modules(id uuid,slug text);
  create table sections(id uuid,module_id uuid,slug text,animation_id uuid,animation_config jsonb,updated_at timestamptz);
  create table paragraphs(id uuid,section_id uuid,content jsonb,animation_id uuid,animation_trigger text,has_animation boolean,updated_at timestamptz);
  create table animations(id uuid,animation_key text,config jsonb,updated_at timestamptz);`);
  for (const [table, cols] of [
    ["modules", ["id", "slug"]],
    [
      "sections",
      ["id", "module_id", "slug", "animation_id", "animation_config"],
    ],
    [
      "paragraphs",
      [
        "id",
        "section_id",
        "content",
        "animation_id",
        "animation_trigger",
        "has_animation",
      ],
    ],
    ["animations", ["id", "animation_key", "config"]],
  ])
    for (const row of data[table])
      await db.query(
        `insert into ${table}(${cols}) values(${cols.map((_, i) => "$" + (i + 1))})`,
        cols.map((c) => row[c] ?? null)
      );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261120066000_retina_figures_db.sql",
      "utf8"
    )
  );
  for (const table of ["sections", "paragraphs", "animations"]) {
    const { rows } = await db.query(`select * from ${table}`);
    data[table] = data[table].map((row) => ({
      ...row,
      ...rows.find((r) => r.id === row.id),
    }));
  }
  await db.close();
}
const results = [];
const engines = (process.env.RETINA_FIGURES_ENGINES || "chromium,webkit").split(
  ","
);
const widths = (process.env.RETINA_FIGURES_WIDTHS || "1440,1024,390")
  .split(",")
  .map(Number);
for (const engine of [chromium, webkit].filter((e) =>
  engines.includes(e.name())
)) {
  const browser = await engine.launch();
  for (const width of widths) {
    const context = await browser.newContext({
      ...(width === 390 ? devices["iPhone 13"] : {}),
      viewport: { width, height: width === 390 ? 844 : 900 },
    });
    const blocked = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      // Keep chapter/database requests read-only. The embedded media player's
      // own playback/telemetry APIs may use POST after its play control opens.
      if (
        !["GET", "HEAD", "OPTIONS"].includes(request.method()) &&
        (url.origin === new URL(base).origin ||
          /\/(rest|auth)\/v1\//.test(url.pathname))
      ) {
        blocked.push(request.url());
        return route.abort();
      }
      const table = url.pathname.split("/").at(-1);
      if (!url.pathname.includes("/rest/v1/") || !data[table])
        return route.continue();
      let rows = data[table];
      for (const [key, filter] of url.searchParams) {
        if (filter.startsWith("eq."))
          rows = rows.filter((r) => String(r[key]) === filter.slice(3));
        else if (filter.startsWith("in.(")) {
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
    const errors = [],
      warnings = [];
    page.on("pageerror", (e) =>
      errors.push({
        text: e.message,
        stack: e.stack,
        url: (e.stack || "").match(/https?:\/\/[^ )]+/)?.[0] || "",
      })
    );
    page.on("console", (m) => {
      if (m.type() === "error")
        errors.push({ text: m.text(), url: m.location().url });
      if (m.type() === "warning") warnings.push(m.text());
    });
    await page.goto(`${base}/chapter/2/the-retina`);
    await page.locator("#text").waitFor();
    await page
      .locator(".chapter-reader .animationTrigger[id]")
      .first()
      .waitFor({ state: "attached", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${out}/${phase}-${engine.name()}-${width}-opener.png`,
    });
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      document.documentElement.dataset.reduceMotion = "0";
    });
    const prefix = `${phase}-${engine.name()}-${width}`;
    const entries = await page
      .locator(".chapter-reader .animationTrigger[id]")
      .evaluateAll((es) =>
        es.map((e) => ({ id: e.id, box: !!e.closest(".bx") }))
      );
    const checks = [];
    if (width >= 1024) {
      for (const entry of entries.filter(
        (e) => !e.box && !/Placeholder$/i.test(e.id)
      )) {
        // Use the actual registered trigger's measured window, accounting for
        // the opener, widget bands, authored holds and late image/font layout.
        const land = async () =>
          page.evaluate(async (id) => {
            const source = await fetch(
              "/src/components/chapter/Illus/IllustrationsComp.vue"
            ).then((r) => r.text());
            const path = source.match(/import ScrollTrigger from "([^"]+)"/)[1];
            const { default: ScrollTrigger } = await import(path);
            ScrollTrigger.refresh();
            const st = ScrollTrigger.getAll().find(
              (s) =>
                s.vars.id === "scrollTriggerAnimation" && s.trigger?.id === id
            );
            if (!st) return null;
            scrollTo(0, st.start + Math.max(1, (st.end - st.start) * 0.4));
            ScrollTrigger.update();
            return { start: st.start, end: st.end };
          }, entry.id);
        let window = await land();
        for (let attempt = 0; !window && attempt < 10; attempt++) {
          await page.waitForTimeout(500);
          window = await land();
        }
        assert(window, `${prefix} ${entry.id} has no registered pane trigger`);
        const pane = page.locator(".figure-pane");
        const expected = entry.id.replace(/^trigger/i, "").toLowerCase();
        let key;
        for (let attempt = 0; attempt < 5; attempt++) {
          await page.waitForTimeout(500);
          await land();
          await page.waitForTimeout(250);
          key = await pane.getAttribute("data-figure-key");
          if (key === expected || key === expected.replace(/^animation/, ""))
            break;
        }
        assert(
          key &&
            (key === expected || key === expected.replace(/^animation/, "")),
          `${prefix} ${entry.id} selected ${key} window=${JSON.stringify(window)}`
        );
        await pane
          .locator("svg, img, iframe, video, canvas, .ve-poster")
          .filter({ visible: true })
          .first()
          .waitFor({ state: "attached", timeout: 15000 });
        checks.push({ trigger: entry.id, key, window, art: true });
        const preset =
          key === "animationretinalcelltypes3"
            ? "horizontalCellsHighlight"
            : key === "animationretinalcelltypes2"
              ? "bipolarCellsHighlight"
              : null;
        if (preset) {
          assert(
            await pane.locator(`.${preset}.highlightIllu`).count(),
            `${prefix} ${key} preset`
          );
          checks.push({ key, preset });
          await pane.screenshot({ path: `${out}/${prefix}-${key}-preset.png` });
        }
        // Open the remote player last: removing its live iframe during
        // Safari's pending Cache API work produces a WebKit teardown error.
        if (key !== "animationwavesofactivity")
          await exercise(pane, key, page, checks);
        if (
          /Dragon|EyeStructur$|RetinalCellTypes[23]|NormalVision|Cataracts|WavesOfActivity|Glaucoma|EyeMovements|Development/i.test(
            entry.id
          )
        )
          await pane.screenshot({
            path: `${out}/${prefix}-${key.replaceAll(":", "-")}.png`,
          });
      }
    } else {
      const figures = page.locator(".illu-inline[data-figure-key]");
      for (let i = 0; i < (await figures.count()); i++) {
        const figure = figures.nth(i),
          key = await figure.getAttribute("data-figure-key");
        await figure.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        await figure
          .locator("svg, img, iframe, video, canvas, .ve-poster")
          .filter({ visible: true })
          .first()
          .waitFor({ state: "attached", timeout: 15000 });
        checks.push({ key, art: true });
        await exercise(figure, key.toLowerCase(), page, checks);
        await figure.screenshot({ path: `${out}/${prefix}-${key}.png` });
      }
    }
    // Full-width figure widgets and uploaded figures are lazy: visit every
    // placement to ensure their real artwork/frames load, including boxes.
    const bands = page.locator(".fb-slot");
    for (let i = 0; i < (await bands.count()); i++) {
      const band = bands.nth(i);
      await band.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
    }
    if (width >= 1024) {
      const wave = entries.find((e) => /WavesOfActivity$/i.test(e.id));
      await page.evaluate(async (id) => {
        const source = await fetch(
          "/src/components/chapter/Illus/IllustrationsComp.vue"
        ).then((r) => r.text());
        const { default: ST } = await import(
          source.match(/import ScrollTrigger from "([^"]+)"/)[1]
        );
        ST.refresh();
        const st = ST.getAll().find(
          (s) => s.vars.id === "scrollTriggerAnimation" && s.trigger?.id === id
        );
        scrollTo(0, (st.start + st.end) / 2);
        ST.update();
      }, wave.id);
      await page.waitForTimeout(600);
      const pane = page.locator(".figure-pane");
      assert.equal(
        await pane.getAttribute("data-figure-key"),
        "animationwavesofactivity"
      );
      await exercise(pane, "animationwavesofactivity", page, checks);
      await pane.screenshot({ path: `${out}/${prefix}-waves-player.png` });
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false,
      `${prefix} overflow`
    );
    const unexpected = errors.filter(
      (e) =>
        !(
          engine.name() === "webkit" &&
          /^Button failed to load, iconName = (?:invalid|pip|airplay)-placard, layoutTraits = \[MacOSLayoutTraits Inline\], src = blob:/.test(
            e.text || ""
          )
        )
    );
    writeFileSync(
      `${out}/${prefix}-diagnostics.json`,
      JSON.stringify({ errors, warnings, checks }, null, 2)
    );
    assert.deepEqual(unexpected, [], `${prefix} console errors`);
    assert.deepEqual(blocked, [], `${prefix} non-GET requests`);
    const result = {
      phase,
      engine: engine.name(),
      width,
      entries,
      checks,
      errors,
      warnings,
    };
    results.push(result);
    writeFileSync(
      `${out}/${phase}-results.json`,
      JSON.stringify(results, null, 2)
    );
    console.log(prefix, checks.length, "checks", warnings.length, "warnings");
    await context.close();
  }
  await browser.close();
}
async function exercise(scope, key, page, checks) {
  const buttons = scope
    .locator("button[aria-pressed]")
    .filter({ visible: true });
  if (await buttons.count()) {
    const labels = [];
    for (let i = 0; i < (await buttons.count()); i++) {
      const button = buttons.nth(i);
      labels.push((await button.textContent()).trim());
      await button.click({ force: true });
      assert.equal(
        await button.getAttribute("aria-pressed"),
        "true",
        `${key} state ${i}`
      );
    }
    checks.push({ key, interaction: "states", labels });
  }

  const flip = scope.locator(".flip-card").filter({ visible: true });
  if (await flip.count()) {
    const control = scope
      .locator(".flip-card")
      .filter({ visible: true })
      .locator("..")
      .locator("> svg");
    await control.click({ force: true });
    assert.match(await flip.getAttribute("class"), /\bflip\b/);
    await control.click({ force: true });
    assert(
      !/\bflip\b/.test(
        (await flip.getAttribute("class")).replace("flip-card", "")
      )
    );
    const video = scope.locator("video").first();
    await video.evaluate((v) => v.play());
    await page.waitForTimeout(160);
    assert(
      await video.evaluate(
        (v) => v.readyState >= 2 && v.currentTime > 0 && v.loop
      )
    );
    checks.push({ key, interaction: "flip-and-video" });
  }
  if (key === "animationwavesofactivity") {
    const poster = scope.locator(".ve-poster").filter({ visible: true });
    if (await poster.count()) await poster.click({ force: true });
    const src = await scope
      .locator('iframe[src*="k0_HXpcH4zI"]')
      .getAttribute("src");
    assert(src.includes("k0_HXpcH4zI"));
    checks.push({ key, interaction: "youtube-source", src });
  }
  if (key === "animationdragon" || key === "animationeyemovements") {
    const sample = () =>
      scope.evaluate(async (el) => {
        const modulePath = "/src/composables/useLottie.js";
        const l = await (await import(modulePath)).loadLottie();
        return l
          .getRegisteredAnimations()
          .filter((a) => el.contains(a.wrapper))
          .map((a) => ({
            frame: a.currentFrame,
            loop: a.loop,
            paused: a.isPaused,
          }));
      });
    const before = await sample();
    await page.waitForTimeout(220);
    const after = await sample();
    assert(
      before.length && after.some((a, i) => a.frame !== before[i]?.frame),
      `${key} advances`
    );
    checks.push({ key, interaction: "loop", before, after });
  }
}
