#!/usr/bin/env node
// OPENBRAIN-66: GET-only live export replay; captures the actual shared reader.
import { chromium, webkit, devices } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const out =
  process.env.CHAPTER_PARITY_OUT ||
  "/Volumes/Brain/artifacts/retina-cleanup/66";
const base = process.env.CHAPTER_PARITY_BASE || "http://127.0.0.1:5266";
const phase = process.env.CHAPTER_PARITY_PHASE || "before";
const data = JSON.parse(readFileSync(`${out}/live.json`, "utf8"));
if (phase === "after") {
  const require = createRequire(import.meta.url);
  const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
  const db = new PGlite();
  try {
    await db.exec(
      "create table modules(id uuid,slug text); create table sections(id uuid,module_id uuid,slug text,title text,updated_at timestamptz)"
    );
    for (const m of data.modules)
      await db.query("insert into modules values($1,$2)", [m.id, m.slug]);
    for (const s of data.sections)
      await db.query("insert into sections values($1,$2,$3,$4,$5)", [
        s.id,
        s.module_id,
        s.slug,
        s.title,
        s.updated_at,
      ]);
    await db.exec(
      readFileSync(
        "supabase/migrations/20261120066600_retina_introduction_title.sql",
        "utf8"
      )
    );
    const { rows } = await db.query("select * from sections");
    data.sections = data.sections.map((s) => ({
      ...s,
      ...rows.find((r) => r.id === s.id),
    }));
  } finally {
    await db.close();
  }
}
mkdirSync(out, { recursive: true });
const extras = process.env.CHAPTER_PARITY_EXTRAS === "1";
const resultPath = `${out}/${phase}${extras ? "-extras" : ""}-results.json`;
const results =
  process.env.CHAPTER_PARITY_RESUME === "1"
    ? JSON.parse(readFileSync(resultPath, "utf8"))
    : [];
for (const engine of [chromium, webkit].filter((e) =>
  (process.env.CHAPTER_PARITY_ENGINES || "chromium,webkit").includes(e.name())
)) {
  const browser = await engine.launch();
  for (const width of (process.env.CHAPTER_PARITY_WIDTHS || "1440,1024,390")
    .split(",")
    .map(Number)) {
    for (const m of data.modules.filter(
      (m) =>
        !process.env.CHAPTER_PARITY_CHAPTERS ||
        process.env.CHAPTER_PARITY_CHAPTERS.split(",").includes(m.slug)
    )) {
      if (
        results.some(
          (r) =>
            r.chapter === m.slug &&
            r.width === width &&
            r.engine === engine.name()
        )
      )
        continue;
      const context = await browser.newContext({
        ...(width === 390 ? devices["iPhone 13"] : {}),
        viewport: { width, height: width === 390 ? 844 : 900 },
        reducedMotion: "reduce",
      });
      if (process.env.CHAPTER_PARITY_DIAGNOSE)
        await context.addInitScript(() => {
          const Original = window.ResizeObserver;
          const recent = [];
          window.ResizeObserver = class extends Original {
            constructor(fn) {
              const stack = new Error().stack;
              super((entries, observer) => {
                recent.push({
                  stack,
                  targets: entries.map((e) => ({
                    tag: e.target.tagName,
                    cls: e.target.className,
                    id: e.target.id,
                    width: e.contentRect.width,
                    height: e.contentRect.height,
                  })),
                });
                if (recent.length > 8) recent.shift();
                fn(entries, observer);
              });
            }
          };
          window.addEventListener("error", (e) => {
            if (e.message.includes("ResizeObserver"))
              console.warn(
                "RO DIAGNOSTIC " +
                  JSON.stringify({ url: location.href, recent })
              );
          });
        });
      const blocked = [];
      await context.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        if (
          !["GET", "HEAD", "OPTIONS"].includes(req.method()) &&
          (url.origin === new URL(base).origin ||
            /\/(rest|auth)\/v1\//.test(url.pathname))
        ) {
          blocked.push(url.pathname);
          return route.abort();
        }
        const table = url.pathname.split("/").at(-1);
        if (!url.pathname.includes("/rest/v1/") || !data[table])
          return route.continue();
        let rows = structuredClone(data[table]);
        for (const [key, filter] of url.searchParams) {
          if (filter.startsWith("eq."))
            rows = rows.filter((r) => String(r[key]) === filter.slice(3));
          else if (filter.startsWith("in.(")) {
            const vals = filter.slice(4, -1).replaceAll('"', "").split(",");
            rows = rows.filter((r) => vals.includes(String(r[key])));
          } else if (filter.startsWith("is."))
            rows = rows.filter((r) => String(r[key]) === filter.slice(3));
        }
        const order = url.searchParams.get("order");
        if (order)
          rows.sort((a, b) => {
            for (const col of order.split(",")) {
              const [k, dir] = col.split(".");
              const n =
                typeof a[k] === "number"
                  ? a[k] - b[k]
                  : String(a[k]).localeCompare(String(b[k]));
              if (n) return dir === "desc" ? -n : n;
            }
            return 0;
          });
        const limit = Number(url.searchParams.get("limit"));
        if (limit) rows = rows.slice(0, limit);
        return route.fulfill({ json: rows });
      });
      const page = await context.newPage(),
        errors = [],
        nativeMediaErrors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (process.env.CHAPTER_PARITY_DIAGNOSE && m.type() === "warning")
          console.log(m.text());
        if (m.type() === "error") {
          // The macOS WebKit native video controls emit these even on the
          // unchanged reader. Keep them in the report, apart from app errors.
          if (
            /^Button failed to load, iconName = (?:invalid|pip|airplay)-placard, layoutTraits = \[MacOSLayoutTraits Inline\], src = blob:/.test(
              m.text()
            )
          )
            nativeMediaErrors.push(m.text());
          else errors.push(m.text());
        }
      });
      const prefix = `${phase}-${engine.name()}-${width}-${m.slug}`;
      console.log(prefix);
      await page.goto(`${base}/chapter/${m.order_index}/${m.slug}`);
      await page.locator("#text").waitFor();
      await page.waitForTimeout(2200);
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
      });
      const shot = async (name, selector, offset = 80) => {
        if (selector && (await page.locator(selector).count()))
          await page
            .locator(selector)
            .first()
            .evaluate(
              (el, offset) =>
                scrollTo(0, el.getBoundingClientRect().top + scrollY - offset),
              offset
            );
        await page.waitForTimeout(350);
        await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
      };
      await shot("hero");
      const hero = await page.locator(".opener-hero").evaluate((el) => ({
        height: el.offsetHeight,
        state: el.dataset.reactiveCover,
        bar: document
          .querySelector(".reader-top-bar")
          ?.getBoundingClientRect()
          .toJSON(),
      }));
      await shot("contents", "#chapter-toc", 0);
      if (width === 390)
        await page
          .locator("#chapter-toc")
          .screenshot({ path: `${out}/${prefix}-contents-full.png` });
      const toc = await page.locator("#chapter-toc").evaluate((el) => {
        const nav = el.querySelector("nav"),
          list = el.querySelector("ol");
        return {
          height: el.offsetHeight,
          fit: el.style.getPropertyValue("--otoc-fit"),
          scrolls: el.classList.contains("otoc--scrolls"),
          rows: [...el.querySelectorAll(".otoc__row")].map((e) =>
            e.textContent.trim()
          ),
          room: nav?.clientHeight,
          list: list?.scrollHeight,
        };
      });
      await shot("authors", "#text .chapter-front-credits");
      await shot("intro", "#text section.reader-section");
      const sections = await page
        .locator("#text section.reader-section[data-section-slug]")
        .evaluateAll((es) =>
          es
            .filter((e) => !e.closest("[data-reader-end]"))
            .map((e) => ({ id: e.id, slug: e.dataset.sectionSlug }))
        );
      if (sections[0])
        await shot(
          "section",
          `[data-section-slug="${sections[0].slug}"]`,
          Math.round((width < 1024 ? 0.15 : 0.62) * 900)
        );
      let card = 0;
      const cardChecks = [];
      for (const section of sections) {
        await page
          .locator(`[id="${section.id}"]`)
          .evaluate((el) =>
            scrollTo(
              0,
              el.getBoundingClientRect().top + scrollY - innerHeight * 0.8
            )
          );
        await page.waitForTimeout(120);
        const seen = await page.locator("[data-section-card]").count();
        cardChecks.push({ slug: section.slug, seen });
        if (seen && !card) {
          card = seen;
          await shot("section-card");
        }
      }
      if (width >= 1024)
        assert(card > 0, `${prefix}: no section card observed`);
      else assert.equal(card, 0);
      const triggers = await page
        .locator(".animationTrigger[id]")
        .evaluateAll((es) =>
          es.filter((e) => !e.closest(".bx")).map((e) => e.id)
        );
      const figureKeys = new Set();
      const timing = [];
      let genericShot = false;
      for (const id of triggers.filter(
        (id) =>
          !extras ||
          /RetinaDevelopment|FoundationsFig1$|AttentionV2Fig1$/i.test(id)
      )) {
        if (/Placeholder$/i.test(id)) continue;
        if (width >= 1024) {
          const win = await page.evaluate(async (id) => {
            const source = await fetch(
              "/src/components/chapter/Illus/IllustrationsComp.vue"
            ).then((r) => r.text());
            const path = source.match(/import ScrollTrigger from "([^"]+)"/)[1];
            const { default: ST } = await import(path);
            ST.refresh();
            const st = ST.getAll().find(
              (s) =>
                s.vars.id === "scrollTriggerAnimation" && s.trigger?.id === id
            );
            if (!st) return null;
            scrollTo(0, st.start + Math.max(1, (st.end - st.start) * 0.4));
            ST.update();
            return { start: st.start, end: st.end };
          }, id);
          if (!win) continue;
          await page.waitForTimeout(150);
          timing.push({
            id,
            ...win,
            key: await page
              .locator(".figure-pane")
              .getAttribute("data-figure-key"),
            card: await page.locator("[data-section-card]").count(),
          });
        } else {
          await page
            .locator(`[id="${id}"]`)
            .first()
            .evaluate((el) =>
              scrollTo(
                0,
                el.getBoundingClientRect().top + scrollY - innerHeight * 0.35
              )
            );
          await page.waitForTimeout(120);
        }
        for (const k of await page
          .locator("[data-figure-key]")
          .evaluateAll((es) => es.map((e) => e.dataset.figureKey)))
          if (k) figureKeys.add(k);
        if (timing.length === 1 || (width < 1024 && figureKeys.size === 1))
          await shot("figure");
        if (
          !genericShot &&
          (width >= 1024
            ? await page.locator(".figure-pane .fig-toolbar").count()
            : /RetinaDevelopment|FoundationsFig1$|AttentionV2Fig1$/i.test(id))
        ) {
          const shell =
            width >= 1024
              ? page.locator(".figure-pane .fig-pane").first()
              : page
                  .locator(
                    `figure.illu-inline[data-figure-key="${id.replace(/^trigger/i, "")}" i] .fig-pane`
                  )
                  .first();
          if (await shell.count()) {
            if (width < 1024)
              await shell.evaluate((el) =>
                scrollTo(0, el.getBoundingClientRect().top + scrollY - 80)
              );
            await shot("generic-figure");
            const button = shell.locator(".fig-legend-btn").last();
            if (await button.count()) {
              if (phase === "after" && width >= 1024) {
                await button.focus();
                await page.waitForTimeout(180);
                const peek = shell.locator(".fig-legend--folds.is-open");
                assert.equal(await peek.count(), 1);
                const peekBox = await peek.boundingBox(),
                  barBox = await shell.locator(".fig-toolbar").boundingBox();
                assert(
                  peekBox.y + peekBox.height <= barBox.y + 1,
                  "Legend peek must open above the toolbar"
                );
                await shot("generic-legend-peek");
              }
              await button.click();
              await shot("generic-legend");
              assert.equal(await button.getAttribute("aria-expanded"), "true");
              await button.click();
            }
            if (width >= 1024) {
              const geometry = await shell.evaluate((el) => ({
                toolbar: el
                  .querySelector(".fig-toolbar")
                  .getBoundingClientRect()
                  .toJSON(),
                art: el
                  .querySelector(".fig-area--art")
                  ?.getBoundingClientRect()
                  .toJSON(),
              }));
              timing.at(-1).generic = geometry;
              if (phase === "after" && geometry.art)
                assert(
                  geometry.toolbar.top >= geometry.art.bottom - 1,
                  JSON.stringify(geometry)
                );
            }
            await shell.locator(".fig-fs-btn").click();
            await shot("generic-expanded");
            if (width >= 1024) {
              const paper =
                (await page
                  .locator(".figure-pane")
                  .getAttribute("data-ground")) === "paper";
              assert.equal(
                await page
                  .locator(".demo-panel")
                  .evaluate((el) => el.classList.contains("demo-panel--dark")),
                !paper
              );
            }
            await page.keyboard.press("Escape");
            await page.waitForTimeout(100);
            genericShot = true;
          }
        }
      }
      await shot("chapter-end", "[data-chapter-close]");
      if (await page.locator("[data-chapter-next]").count())
        await shot("up-next", "[data-chapter-next]");
      else await shot("up-next", ".cc-next");
      await shot("back-matter", ".chapter-back__matter");
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight)
      );
      await shot("footer");
      const end = await page.locator("[data-reader-end]").evaluate((el) => ({
        text: el.textContent,
        ack: !!el.querySelector('[data-testid="chapter-acknowledgements"]'),
        test: !!el.querySelector("[data-chapter-test]"),
        next: el.querySelector(".cc-next")?.textContent,
      }));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      );
      const result = {
        phase,
        engine: engine.name(),
        width,
        chapter: m.slug,
        hero,
        toc,
        card,
        sections,
        figureKeys: [...figureKeys].sort(),
        timing,
        cardChecks,
        end,
        overflow,
        errors,
        nativeMediaErrors,
        blocked,
      };
      results.push(result);
      writeFileSync(resultPath, JSON.stringify(results, null, 2));
      assert(overflow <= 1, `${prefix}: overflow ${overflow}`);
      if (phase === "after")
        assert.equal(errors.length, 0, JSON.stringify(errors));
      assert.equal(blocked.length, 0, JSON.stringify(blocked));
      if (phase === "after" && !extras) {
        const before = JSON.parse(
          readFileSync(`${out}/before-results.json`, "utf8")
        ).find(
          (r) =>
            r.engine === engine.name() &&
            r.width === width &&
            r.chapter === m.slug
        );
        assert.deepEqual(
          [
            ...new Set(result.figureKeys.map((key) => key.toLowerCase())),
          ].sort(),
          [
            ...new Set(before.figureKeys.map((key) => key.toLowerCase())),
          ].sort(),
          `${prefix}: mounted figure inventory changed`
        );
        if (width >= 1024) {
          assert(toc.list <= toc.room + 4, `${prefix}: contents clipped`);
          assert.equal(toc.height, 900);
        }
        assert.equal(hero.height, width === 390 ? 844 : 900);
        if (m.slug === "the-retina")
          assert.equal(toc.rows[0], "0.Introduction");
      }
      await context.close();
    }
  }
  await browser.close();
}
