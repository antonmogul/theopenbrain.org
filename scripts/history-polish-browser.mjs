/** OPENBRAIN-100: published-reader proof, GET-only; simulate pending SQL locally.
 * node scripts/history-polish-browser.mjs before|after base output [chromium|webkit]
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, webkit, devices } from "@playwright/test";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const [mode, base, out, engine = "chromium"] = process.argv.slice(2);
assert(["before", "after"].includes(mode));
assert(base && out);
await mkdir(out, { recursive: true });
const uploads = {};
for (const [slug, file] of Object.entries({
  "history-penfield-binder": "history-penfield-binder.html",
  "loewi-vagusstoff": "loewi-vagusstoff.html",
}))
  uploads[slug] = await readFile(`src/widgets/uploads/${file}`, "utf8");
const results = [];
const browser = await { chromium, webkit }[engine].launch();
try {
  for (const width of process.env.OB100_WIDTHS
    ? process.env.OB100_WIDTHS.split(",").map(Number)
    : engine === "webkit"
      ? [390]
      : [1331, 1920, 375, 390, 1024, 1440]) {
    const page = await browser.newPage({
      ...(engine === "webkit" ? devices["iPhone 13"] : {}),
      viewport: {
        width,
        height:
          width < 700
            ? engine === "webkit"
              ? 844
              : 704
            : width === 1920
              ? 947
              : 992,
      },
      isMobile: width < 700,
      hasTouch: width < 700,
    });
    const errors = [];
    const measurements = {};
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/rest/v1/**", async (route) => {
      if (route.request().method() !== "GET") return route.abort();
      const response = await route.fetch();
      const rows = await response.json();
      const table = new URL(route.request().url()).pathname.split("/").pop();
      if (
        mode === "before" &&
        width === 1331 &&
        ["sections", "animations", "widget_uploads"].includes(table)
      )
        await writeFile(
          `${out}/live-${table}.json`,
          JSON.stringify(rows, null, 2)
        );
      if (
        mode === "after" &&
        table === "widget_uploads" &&
        Array.isArray(rows)
      ) {
        return route.fulfill({
          response,
          json: rows.map((r) =>
            uploads[r.slug] ? { ...r, html: uploads[r.slug] } : r
          ),
        });
      }
      if (mode === "after" && table === "sections" && Array.isArray(rows)) {
        return route.fulfill({
          response,
          json: rows.map((r) =>
            r.slug === "box-descartes"
              ? {
                  ...r,
                  box_card: { ...r.box_card, enabled: true },
                }
              : r
          ),
        });
      }
      return route.fulfill({ response, json: rows });
    });
    await page.goto(`${base}/chapter/1/foundations-of-neuroscience`);
    await page
      .locator(".head-cover__poster")
      .waitFor({ state: "attached", timeout: 45000 });
    await page.waitForTimeout(2500);
    if (width >= 1024) {
      await page.mouse.move(width * 0.76, 300);
      await page.waitForTimeout(700);
    }
    const shot = async (name) =>
      page.screenshot({
        path: `${out}/${mode}-${engine}-${width}-${name}.png`,
        timeout: 15000,
        caret: "initial",
      });
    const land = async (selector, fraction = 0.35) => {
      const el = page.locator(selector).first();
      await el.waitFor({ state: "attached" });
      await el.evaluate((e, f) => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo({
          top: scrollY + e.getBoundingClientRect().top - innerHeight * f,
          behavior: "instant",
        });
      }, fraction);
      await page.waitForTimeout(1500);
      return el;
    };
    await shot("c1567aff-cover");
    for (const [name, selector] of [
      [
        "7bdd2443-quote",
        '[id="0a651858-efba-4188-8730-473a68353194"] blockquote',
      ],
      ["d0df3145-leborgne", '[id="triggeranimationfoundationsfig9" i]'],
      ["8f601d88-video", '[id="triggeranimationfoundationsfig21" i]'],
      ["ae9c6411-hm", '[data-section-slug="closing-words"]'],
      ["ae9c6411-skull", '[data-section-slug="where-is-my-mind"]'],
      ["a2e798d3-descartes", '[data-section-slug="box-descartes"]'],
      ["bda04830-rail", '[data-section-slug="box-electrical-stim"]'],
    ]) {
      if (!(await page.locator(selector).count())) continue;
      await land(
        selector,
        name.includes("rail") || name.includes("descartes")
          ? 0.06
          : name.includes("leborgne") || name.includes("video")
            ? -0.2
            : 0.35
      );
      console.log({ width, note: name });
      await shot(name);
      if (mode === "after" && name.includes("quote")) {
        const quotes = await page.locator("blockquote").evaluateAll((es) =>
          es.map((e) => ({
            border: getComputedStyle(e).borderLeftWidth,
            weight: getComputedStyle(e).fontWeight,
            color: getComputedStyle(e).color,
          }))
        );
        assert(quotes.length > 0);
        assert(quotes.every((q) => q.border === "0px" && q.weight === "500"));
        measurements.quotes = quotes;
      }
      if (width >= 1024 && name.includes("leborgne")) {
        measurements.figurePadding = await page
          .locator(".figure-pane .fig-area--art")
          .evaluate((e) => ({
            left: parseFloat(getComputedStyle(e).paddingLeft),
            right: parseFloat(getComputedStyle(e).paddingRight),
          }));
        if (mode === "after") assert(measurements.figurePadding.left >= 40);
      }
      if (width >= 1024 && name.includes("video")) {
        measurements.play = await page
          .locator(".figure-pane .ve-poster")
          .evaluate((e) => {
            const r = e.getBoundingClientRect(),
              mark = e.querySelector(".ve-play").getBoundingClientRect();
            return {
              right: r.right - mark.right,
              bottom: r.bottom - mark.bottom,
              shadow: getComputedStyle(e.querySelector(".ve-play")).boxShadow,
            };
          });
        if (mode === "after") {
          assert(
            Math.abs(measurements.play.right - measurements.play.bottom) < 1
          );
          assert(measurements.play.shadow === "none");
        }
      }
      if (width >= 1024 && name.includes("ae9c6411")) {
        const samples = [];
        // The shared picture's opening wash and zoom are driven together.
        for (const fraction of [0.35, 0.15, -0.2]) {
          await land(selector, fraction);
          samples.push(
            await page.locator(".figure-pane").evaluate((e) => {
              const z = e.querySelector("[data-section-zoom]");
              return {
                scale: z
                  ? Number(
                      getComputedStyle(z).transform.match(
                        /matrix\(([^,]+)/
                      )?.[1] || 1
                    )
                  : null,
                wash: e.querySelector("[data-figure-wash]")?.style.opacity,
              };
            })
          );
          await shot(`${name}-${fraction}`);
        }
        measurements[name] = samples;
        if (mode === "after") {
          assert(samples.some((s) => s.scale > 1));
          assert(samples.some((s) => s.scale === 1));
        }
      }
      if (name.includes("rail")) {
        const box = page.locator(selector).first();
        const plate = box.locator(".rf-plate").first();
        await plate.waitFor({ state: "attached", timeout: 10000 });
        if (await plate.isVisible()) {
          // Pass the title card, then land on the rail's first picture.
          await plate.evaluate((e) => {
            const track = e.closest("[data-rail-scroller]");
            const pause = e.closest("[data-rail-pause]");
            if (track.dataset.railMode === "track")
              window.scrollTo({
                top:
                  scrollY +
                  pause.getBoundingClientRect().top -
                  Number(track.dataset.railTop || 0) +
                  Number(track.dataset.railLead || 0) +
                  10,
                behavior: "instant",
              });
            else pause.scrollIntoView({ block: "start", behavior: "instant" });
          });
          await page.waitForTimeout(500);
          await shot(`${name}-footer-closed`);
          await plate.locator("summary").click({ force: true });
          await shot(`${name}-footer-open`);
          const caption = await plate
            .locator(".rf-details p")
            .evaluate((e) => ({
              x: e.getBoundingClientRect().x,
              width: e.getBoundingClientRect().width,
              headingX: e
                .closest(".rf-bar")
                .querySelector(".rf-name")
                .getBoundingClientRect().x,
            }));
          if (mode === "after") {
            assert(caption.width > 150);
            assert(Math.abs(caption.x - caption.headingX) < 2);
          }
        } else {
          // On phones the title card owns this lead picture. Its hidden
          // RailFigure supplies the existing full-screen viewer only.
          const expand = box
            .locator("..")
            .locator("[data-card-expand]")
            .first();
          await expand.click();
          await page.getByRole("dialog").waitFor();
          await shot(`${name}-phone-expanded`);
          await page.keyboard.press("Escape");
        }
      }
    }
    const binder = page.locator(
      '[data-widget-stage="upload:history-penfield-binder"]'
    );
    await land('[data-widget-stage="upload:history-penfield-binder"]', 0.08);
    await binder.locator("iframe").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const frame = binder.locator("iframe").contentFrame();
    await frame.locator("#tabs .tab").first().waitFor({ timeout: 30000 });
    await frame.locator("#tabs .tab").nth(4).click();
    await page.waitForTimeout(2000);
    await shot("4099cac4-binder");
    const clip = await frame.locator(".note").evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const text = [...r.getClientRects()].filter(
        (b) => b.width > 0 && b.height > 0
      );
      const svg = el.querySelector("svg").getBoundingClientRect();
      return {
        clipBottom: svg.bottom,
        textTop: Math.min(...text.map((r) => r.top)),
        overflow: document.documentElement.scrollWidth - innerWidth,
        clearance:
          parseFloat(getComputedStyle(el).paddingTop) -
          parseFloat(getComputedStyle(el.querySelector("svg")).top) -
          parseFloat(getComputedStyle(el.querySelector("svg")).height),
      };
    });
    await land('[id="triggeranimationfoundationsloewiwidget" i]', -0.05);
    const loewiFrame = page
      .locator(
        width < 1024
          ? '[data-widget-stage="upload:loewi-vagusstoff"] iframe'
          : ".figure-pane iframe:visible"
      )
      .first();
    await loewiFrame.scrollIntoViewIfNeeded();
    const loewi = loewiFrame.contentFrame();
    await loewi.locator(".transport").waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    await shot("c901ae53-loewi");
    const timeline = await loewi.locator(".transport").evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      frameWidth: innerWidth,
      bodySize: getComputedStyle(document.querySelector(".cap p")).fontSize,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      `reader overflow ${width}`
    );
    if (mode === "after")
      assert(clip.clearance >= 3, `paperclip clearance ${width}`);
    assert.deepEqual(errors, [], `console/page errors ${width}`);
    assert(
      clip.overflow <= 1 && timeline.overflow <= 1,
      `upload overflow ${width}`
    );
    results.push({ width, errors, clip, timeline, measurements });
    await writeFile(
      `${out}/${mode}-${engine}.json`,
      JSON.stringify(results, null, 2)
    );
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
