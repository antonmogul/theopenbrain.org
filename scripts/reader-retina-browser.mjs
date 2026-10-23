#!/usr/bin/env node
// Read-only G1 acceptance against a running reader (default: local port 6101).
// Uses live published GETs; rejects any external write, never opens admin.
// G1_BASE=http://127.0.0.1:6101 G1_OUT=/tmp/openbrain-g1/acceptance node scripts/reader-retina-browser.mjs
import { chromium, firefox } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const base = process.env.G1_BASE || "http://127.0.0.1:6101";
const out = process.env.G1_OUT || "/tmp/openbrain-g1/acceptance";
await mkdir(out, { recursive: true });
const results = [];
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function open(browser, { width = 1440, reduced = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  await context.route("**/*", (route) => {
    const request = route.request();
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()))
      return route.abort("blockedbyclient");
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) =>
    results.push({ engine: browser.browserType().name(), error: e.message })
  );
  return { context, page };
}
async function goto(page, chapter = "2/the-retina") {
  await page.goto(`${base}/chapter/${chapter}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('.opener-hero[data-reactive-cover="ready"]').waitFor();
  await page.waitForTimeout(1500); // trigger setup + fonts
}
async function snapshot(page, selector, name) {
  const target = page.locator(selector).first();
  await target.waitFor({ state: "visible" });
  return digest(
    await target.screenshot({ path: `${out}/${name}.png`, timeout: 10000 })
  );
}
async function land(page, key) {
  const trigger = page.locator(`[id="triggerAnimation${key}" i]`).first();
  const align = () =>
    trigger.evaluate((e) => {
      const rect = e.getBoundingClientRect();
      window.scrollTo(
        0,
        rect.top +
          window.scrollY +
          Math.min(rect.height / 2, 150) -
          window.innerHeight / 2
      );
    });
  await align();
  await page.waitForTimeout(1500); // lazy stages above the target can settle on first entry
  await align();
  await page.waitForTimeout(650);
}

for (const engine of [chromium, firefox]) {
  const browser = await engine.launch({ headless: true });
  const name = engine.name();
  try {
    const { context, page } = await open(browser);
    for (const chapter of ["1/foundations-of-neuroscience", "2/the-retina"]) {
      await goto(page, chapter);
      const chapterName = chapter.startsWith("1") ? "history" : "retina";
      await page.mouse.move(5, 100);
      await page.waitForTimeout(60);
      const left = await snapshot(
        page,
        ".reactive-cover",
        `${name}-${chapterName}-left`
      );
      await page.mouse.move(1435, 100);
      await page.waitForTimeout(60);
      const right = await snapshot(
        page,
        ".reactive-cover",
        `${name}-${chapterName}-right`
      );
      assert.notEqual(
        left,
        right,
        `${name} ${chapterName}: painted cover must follow pointer`
      );
      results.push({
        engine: name,
        test: `${chapterName} painted cover moves`,
        rootMotion: await page
          .locator("html")
          .getAttribute("data-reduce-motion"),
        left,
        right,
      });
    }
    // Freeze and restart the already mounted cover without navigating.
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-reduce-motion", "1")
    );
    await page.waitForTimeout(100);
    const fixed = await snapshot(
      page,
      ".reactive-cover",
      `${name}-cover-reduced`
    );
    await page.mouse.move(5, 100);
    assert.equal(
      fixed,
      await snapshot(page, ".reactive-cover", `${name}-cover-reduced-left`)
    );
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-reduce-motion", "0")
    );
    await page.waitForTimeout(100);
    await page.mouse.move(1435, 100);
    assert.notEqual(
      fixed,
      await snapshot(page, ".reactive-cover", `${name}-cover-resumed`)
    );
    results.push({
      engine: name,
      test: "live explicit preference stops/restarts painted cover",
    });

    for (const key of [
      "Dragon",
      "EyeStructur",
      "AccommodationVergence",
      "EyeMovements",
      "Dragon",
    ]) {
      await land(page, key);
      const selector = `[id="animation${key}"]`;
      await page.locator(`${selector} svg`).waitFor();
      const a = await snapshot(page, selector, `${name}-${key}`);
      if (key === "EyeStructur") {
        await page.getByRole("button", { name: "Cornea", exact: true }).focus();
        await page.keyboard.press("Enter");
        assert.equal(
          (await page
            .locator(`${selector} .corneaHighlight.highlightIllu`)
            .count()) > 0,
          true
        );
        const highlighted = await snapshot(
          page,
          selector,
          `${name}-eye-cornea-selected`
        );
        await page.getByRole("button", { name: "Retina", exact: true }).focus();
        await page.keyboard.press("Space");
        assert.equal(
          (await page
            .locator(`${selector} .retinaHighlight.highlightIllu`)
            .count()) > 0,
          true
        );
        assert.notEqual(
          highlighted,
          await snapshot(page, selector, `${name}-eye-retina-selected`)
        );
      } else {
        await page.waitForTimeout(350);
        assert.notEqual(
          a,
          await snapshot(page, selector, `${name}-${key}-later`),
          `${key} must visibly animate`
        );
        const pause = page.getByRole("button", {
          name: "Pause animation",
          exact: true,
        });
        await pause.focus();
        await page.keyboard.press("Enter");
        const still = await snapshot(page, selector, `${name}-${key}-paused`);
        await page.waitForTimeout(250);
        assert.equal(
          still,
          await snapshot(page, selector, `${name}-${key}-paused-later`)
        );
      }
      results.push({
        engine: name,
        test: `${key} original art and keyboard interaction`,
        reverseReturn: key === "Dragon",
      });
    }
    // Transition is rendered on scroll and remains visible on reverse entry.
    await land(page, "EyeStructurTransition");
    const transition = page.locator(".tr-stage svg");
    await transition.waitFor();
    const trBefore = await snapshot(
      page,
      ".tr-stage",
      `${name}-transition-start`
    );
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(1400);
    assert.notEqual(
      trBefore,
      await snapshot(page, ".tr-stage", `${name}-transition-end`)
    );
    await page.evaluate(() => window.scrollBy(0, -400));
    await page.waitForTimeout(1400);
    await snapshot(page, ".tr-stage", `${name}-transition-reverse`);
    results.push({
      engine: name,
      test: "eye entrance paints through forward/reverse scroll",
    });
    assert.equal(await page.locator(".ref-list").count(), 1);
    assert.equal(await page.locator("#footnotes").count(), 0);
    assert.equal(
      (await page.locator("body").innerText()).split(
        "Origins of neuroscience: a history of explorations into brain function"
      ).length - 1,
      1
    );
    const refs = await page
      .locator(".ref-list__item")
      .evaluateAll((es) => es.map((e) => ({ id: e.id, number: e.value })));
    assert.equal(new Set(refs.map((r) => r.id)).size, refs.length);
    assert.ok(refs.length >= 100);
    assert.ok((await page.locator("body").innerText()).includes("Webvision"));
    results.push({
      engine: name,
      test: "single complete numbered bibliography; Webvision retained",
      count: refs.length,
    });
    await context.close();

    for (const width of [1440, 390]) {
      const { context: reducedContext, page: reducedPage } = await open(
        browser,
        { width, reduced: true }
      );
      await goto(reducedPage);
      if (width === 1440) {
        await land(reducedPage, "EyeStructurTransition");
        const parked = await snapshot(
          reducedPage,
          ".tr-stage",
          `${name}-reduced-transition`
        );
        await reducedPage.evaluate(() => window.scrollBy(0, 400));
        await reducedPage.waitForTimeout(1200);
        assert.equal(
          parked,
          await snapshot(
            reducedPage,
            ".tr-stage",
            `${name}-reduced-transition-later`
          )
        );
        results.push({
          engine: name,
          test: "reduced eye entrance stays on complete drawing during scroll",
        });
      } else {
        await reducedPage.evaluate(() =>
          document.documentElement.setAttribute("data-reduce-motion", "0")
        );
        await reducedPage.waitForTimeout(150);
        const moving = await snapshot(
          reducedPage,
          "#animationEyeMovements--inline",
          `${name}-mobile-motion-enabled`
        );
        await reducedPage.waitForTimeout(350);
        assert.notEqual(
          moving,
          await snapshot(
            reducedPage,
            "#animationEyeMovements--inline",
            `${name}-mobile-motion-enabled-later`
          )
        );
        await reducedPage.evaluate(() => window.scrollTo(0, 0));
        await reducedPage.waitForTimeout(300);
        await reducedPage
          .locator(".reactive-cover")
          .dispatchEvent("pointermove", {
            clientX: 5,
            clientY: 100,
            pointerType: "touch",
            bubbles: true,
          });
        const touch = await snapshot(
          reducedPage,
          ".reactive-cover",
          `${name}-mobile-touch-left`
        );
        await reducedPage
          .locator(".reactive-cover")
          .dispatchEvent("pointermove", {
            clientX: 385,
            clientY: 100,
            pointerType: "touch",
            bubbles: true,
          });
        assert.notEqual(
          touch,
          await snapshot(
            reducedPage,
            ".reactive-cover",
            `${name}-mobile-touch-right`
          )
        );
        results.push({
          engine: name,
          test: "390px explicit motion override resumes artwork; simulated touch pointer scrubs cover",
          rootMotion: "0",
          osReducedMotion: true,
        });
        await reducedPage.evaluate(() =>
          document.documentElement.removeAttribute("data-reduce-motion")
        );
        await reducedPage.waitForTimeout(150);
      }
      assert.equal(
        await reducedPage.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches
        ),
        true
      );
      for (const key of [
        "Dragon",
        "EyeStructur",
        "AccommodationVergence",
        "EyeMovements",
      ]) {
        const selector =
          width < 1024 ? `#animation${key}--inline` : `#animation${key}`;
        if (width < 1024)
          await reducedPage.locator(selector).scrollIntoViewIfNeeded();
        else await land(reducedPage, key);
        await reducedPage.locator(`${selector} svg`).waitFor();
        const first = await snapshot(
          reducedPage,
          selector,
          `${name}-${width}-reduced-${key}`
        );
        await reducedPage.waitForTimeout(300);
        assert.equal(
          first,
          await snapshot(
            reducedPage,
            selector,
            `${name}-${width}-reduced-${key}-later`
          )
        );
        results.push({
          engine: name,
          test: `${width}px reduced ${key}: visible original still`,
          rootMotion: await reducedPage
            .locator("html")
            .getAttribute("data-reduce-motion"),
          osReducedMotion: true,
        });
      }
      assert.equal(
        await reducedPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        ),
        true
      );
      await reducedContext.close();
    }
    // Missing cover retains the chapter poster.
    const fallback = await open(browser);
    await fallback.page.route("**/covers/matisse-eyes.json", (r) =>
      r.fulfill({ status: 404, body: "" })
    );
    await fallback.page.goto(`${base}/chapter/2/the-retina`, {
      waitUntil: "domcontentloaded",
    });
    await fallback.page
      .locator('.opener-hero[data-reactive-cover="unavailable"]')
      .waitFor();
    assert.equal(await fallback.page.locator(".reactive-cover").count(), 0);
    await snapshot(
      fallback.page,
      ".opener-hero__cover",
      `${name}-poster-fallback`
    );
    results.push({ engine: name, test: "missing cover retains poster" });
    await fallback.context.close();
  } finally {
    await browser.close();
    await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  }
}
assert.equal(
  results.filter((r) => r.error).length,
  0,
  "unexpected page errors"
);
console.log(`Passed ${results.length} G1 browser checks. Evidence: ${out}`);
