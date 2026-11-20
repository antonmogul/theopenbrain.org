/** OPENBRAIN-65: read-only live-export overlay on the actual reader.
 * SECTION_ART_FIXTURE=/path/live.json node scripts/placeholder-section-art-browser.mjs
 * Captures Chromium/WebKit, 1440/1024/390. No server or database writes.
 */
import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const data = JSON.parse(readFileSync(process.env.SECTION_ART_FIXTURE, "utf8"));
const pictures = JSON.parse(
  readFileSync("scripts/figures/placeholder-section-art.json", "utf8")
);
const out =
  process.env.SECTION_ART_OUT || "/Volumes/Brain/artifacts/retina-cleanup/65";
const base = process.env.SECTION_ART_BASE || "http://127.0.0.1:5265";
mkdirSync(out, { recursive: true });
const results = [];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  for (const width of [1440, 1024, 390]) {
    const prefix = `${engine.name()}-${width}`;
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    let overlay = false;
    await page.route("**/rest/v1/**", (route) => {
      const req = route.request();
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method()))
        return route.abort();
      const url = new URL(req.url());
      const table = url.pathname.split("/").at(-1);
      const d = data["the-retina"];
      if (["sections", "paragraphs", "animations"].includes(table)) {
        let rows = d[table];
        if (table === "sections" && overlay)
          rows = rows.map((s) => ({
            ...s,
            art:
              pictures.find(
                (p) => p.chapter === "the-retina" && p.section === s.slug
              )?.art || s.art,
          }));
        return route.fulfill({ json: rows });
      }
      return route.continue();
    });
    const mounted = [];
    for (const state of ["before", "after"]) {
      overlay = state === "after";
      await page.goto(`${base}/chapter/2/the-retina`);
      await page.locator("#text").waitFor();
      await page.waitForTimeout(2500);
      if (overlay) {
        const toc = page.locator(".otoc");
        await toc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(700);
        assert.equal(
          await page.locator(".otoc__placeholder").textContent(),
          "Placeholder image"
        );
        if (width >= 1024) {
          const fits = await toc.evaluate((el) => {
            const nav = el.querySelector("nav"),
              list = el.querySelector("ol");
            return {
              height: el.offsetHeight,
              screen: innerHeight,
              list: list.scrollHeight,
              room: nav.clientHeight,
            };
          });
          assert.equal(fits.height, 900);
          assert(fits.list <= fits.room + 4, JSON.stringify(fits));
          const first = await page
            .locator(".otoc__pic.is-on")
            .getAttribute("src");
          await page.locator(".otoc__row").nth(1).hover();
          await page.waitForTimeout(600);
          assert.notEqual(
            await page.locator(".otoc__pic.is-on").getAttribute("src"),
            first
          );
        }
        await toc.screenshot({ path: `${out}/retina-toc-${prefix}.png` });
      } else assert.equal(await page.locator(".otoc").count(), 0);
      const triggers = await page
        .locator(".animationTrigger[id]")
        .evaluateAll((els) => els.map((el) => el.id));
      const figures = new Set();
      for (const id of triggers) {
        if (width >= 1024 && !/Placeholder$/i.test(id)) {
          // Use the pane's actual registered window, as the figure-data
          // acceptance harness does. Paragraph geometry alone can land in
          // an overlapping authored hold and miss a short video figure.
          const expected = id.replace(/^trigger/i, "").toLowerCase();
          let selected;
          for (let attempt = 0; attempt < 5; attempt++) {
            const window = await page.evaluate(async (id) => {
              const source = await fetch(
                "/src/components/chapter/Illus/IllustrationsComp.vue"
              ).then((r) => r.text());
              const path = source.match(
                /import ScrollTrigger from "([^"]+)"/
              )[1];
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
            }, id);
            assert(window, `${prefix}: no registered figure window for ${id}`);
            await page.waitForTimeout(200);
            selected = await page
              .locator(".figure-pane")
              .getAttribute("data-figure-key");
            if (
              selected === expected ||
              selected === expected.replace(/^animation/, "")
            )
              break;
          }
          assert(
            selected === expected ||
              selected === expected.replace(/^animation/, ""),
            `${prefix}: ${id} selected ${selected}`
          );
        } else {
          await page.evaluate((id) => {
            const el = document.getElementById(id);
            scrollTo(
              0,
              el.getBoundingClientRect().top + scrollY - innerHeight * 0.4
            );
          }, id);
          await page.waitForTimeout(90);
        }
        for (const key of await page
          .locator("[data-figure-key]")
          .evaluateAll((els) => els.map((e) => e.dataset.figureKey)))
          if (typeof key === "string" && key) figures.add(key);
      }
      mounted.push([...figures].sort());
      if (overlay) {
        let cards = 0;
        for (const s of await page
          .locator("section.reader-section")
          .evaluateAll((els) =>
            els.filter((e) => !e.closest("[data-reader-end]")).map((e) => e.id)
          )) {
          await page.evaluate((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            scrollTo(
              0,
              el.getBoundingClientRect().top + scrollY - innerHeight * 0.8
            );
          }, s);
          await page.waitForTimeout(200);
          if (await page.locator("[data-section-card]").count()) {
            cards++;
            if (cards === 1)
              await page.screenshot({
                path: `${out}/retina-card-${prefix}.png`,
              });
          }
        }
        if (width >= 1024) assert(cards > 0, "No section cards observed");
        else assert.equal(cards, 0, "Phone must retain inline figures");
        const end = page.locator("[data-reader-end]");
        await end.evaluate((el) =>
          scrollTo(
            0,
            el.getBoundingClientRect().top + scrollY - innerHeight * 0.25
          )
        );
        await page.waitForTimeout(300);
        assert.equal(
          await page.locator("[data-section-card]").count(),
          0,
          "Card leaked into reader end"
        );
        assert.equal(
          await page.locator("[data-reader-end] [data-section-card]").count(),
          0
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1
        );
        assert(!overflow, "Horizontal overflow");
        results.push({
          engine: engine.name(),
          width,
          cards,
          triggers: triggers.length,
          figures: figures.size,
          errors: [...new Set(errors)],
        });
      }
    }
    assert.deepEqual(mounted[1], mounted[0], "Figure mount regression");
    await page.close();
    console.log(prefix, results.at(-1));
  }
  await browser.close();
}
writeFileSync(`${out}/browser-results.json`, JSON.stringify(results, null, 2));
assert(
  results.every((r) => !r.errors.length),
  "Console errors: see browser-results.json"
);
