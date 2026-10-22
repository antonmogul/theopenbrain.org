/** Read-only G6 fixture acceptance. Start Storybook on :6106 before running. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, expect } from "@playwright/test";

const base = process.env.G6_STORYBOOK_URL || "http://localhost:6106";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base));
const output = process.env.G6_OUTPUT || "/tmp/openbrain-g6/evidence";
await mkdir(output, { recursive: true });
const cases = [];
const engine = process.env.G6_BROWSER === "firefox" ? firefox : chromium;
const browser = await engine.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  hasTouch: true,
  serviceWorkers: "block",
});
const blocked = [];
await context.route("**/*", async (route) => {
  const request = route.request();
  if (
    new URL(request.url()).origin === base &&
    ["GET", "HEAD"].includes(request.method())
  )
    return route.continue();
  // External navigation tests prove href activation without depending on third-party uptime.
  if (
    request.isNavigationRequest() &&
    /^https:\/\/plato\.stanford\.edu\/entries\/(alcmaeon|descartes|dualism)\/$/.test(
      request.url()
    )
  ) {
    return route.fulfill({
      contentType: "text/html",
      body: "<h1>External destination test stub</h1>",
    });
  }
  blocked.push(`${request.method()} ${new URL(request.url()).origin}`);
  return route.abort();
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function story(id) {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  await page.locator("#storybook-root > *").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function screenshot(name, fullPage = true) {
  await page.screenshot({
    path: `${output}/${name}.png`,
    fullPage,
    animations: "disabled",
  });
}
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    ),
    "page must not overflow horizontally"
  );
}
try {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await story("chapter-text-explorecard--inline-figure");
    const panel = page.locator(".xc-panel-inner");
    await expect(panel.locator(".figimg-img")).toBeVisible();
    await expect
      .poll(() =>
        panel
          .locator(".figimg-img")
          .evaluate((img) => img.complete && img.naturalWidth > 0)
      )
      .toBe(true);
    const geometry = await panel.evaluate((container) => {
      const panel = container.getBoundingClientRect().toJSON();
      const elements = [
        ...container.querySelectorAll(
          ".fig-shell, .fig-toolbar, .fig-legend, .figimg-img, .fig-fs-btn"
        ),
      ].map((el) => ({
        className: el.className,
        rect: el.getBoundingClientRect().toJSON(),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }));
      const img = container.querySelector(".figimg-img");
      return {
        panel,
        elements,
        imageFit: getComputedStyle(img).objectFit,
        legend: container.querySelector(".fig-legend").textContent.trim(),
      };
    });
    assert.equal(geometry.elements.length, 5);
    for (const element of geometry.elements) {
      assert.ok(
        element.rect.left >= geometry.panel.left - 1 &&
          element.rect.right <= geometry.panel.right + 1,
        `${element.className} stays horizontally inside the disclosure`
      );
      assert.ok(
        element.rect.top >= geometry.panel.top - 1 &&
          element.rect.bottom <= geometry.panel.bottom + 1,
        `${element.className} stays vertically inside the disclosure`
      );
      assert.ok(
        element.scrollWidth <= element.clientWidth + 1,
        `${element.className} has no clipped horizontal content`
      );
    }
    assert.equal(geometry.imageFit, "contain");
    assert.ok(
      geometry.legend.startsWith("Galen’s physiology") &&
        geometry.legend.endsWith("Source: Wellcome Collection.")
    );
    await noOverflow();
    await screenshot(`nested-figure-${width}`);
    await panel.getByRole("button", { name: "Expand to full screen" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    cases.push({
      name: "nested-figure",
      width,
      geometry,
      expandAndEscape: true,
    });
  }
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await story("chapter-text-sectioncomp--consecutive-widgets");
    const widgets = page.locator("#widget-seams .wb--inline");
    await expect(widgets).toHaveCount(3);
    const seams = await widgets.evaluateAll((elements) =>
      elements.map((el) => ({
        top: parseFloat(getComputedStyle(el).marginTop),
        bottom: parseFloat(getComputedStyle(el).marginBottom),
        rect: el.getBoundingClientRect().toJSON(),
      }))
    );
    assert.equal(
      seams[0].bottom,
      0,
      "first widget has no touching bottom margin"
    );
    assert.equal(seams[1].top, 0, "second widget has no touching top margin");
    assert.ok(
      Math.abs(seams[1].rect.top - seams[0].rect.bottom) < 1,
      "adjacent rendered widget bands touch"
    );
    assert.ok(seams[0].top > 0, "run keeps its leading prose spacing");
    assert.ok(seams[1].bottom > 0, "run keeps its trailing prose spacing");
    assert.ok(
      seams[2].top > 0 && seams[2].bottom > 0,
      "prose-separated widget retains both margins"
    );
    assert.ok(
      seams[2].rect.top > seams[1].rect.bottom,
      "intervening prose separates widget runs"
    );
    await expect(page.locator("#widget-seams .explore-pair-item")).toHaveCount(
      0
    );
    await noOverflow();
    await screenshot(`widget-seams-${width}`);
    cases.push({ name: "widget-seams", width, seams });
  }
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of ["hippocrates", "comparative"]) {
      await story(`chapter-text-sectioncomp--${name}-pair`);
      const cards = page.locator(".xc");
      await expect(cards).toHaveCount(2);
      await expect
        .poll(() =>
          cards
            .locator(".xc-img")
            .evaluateAll((images) =>
              images.every((image) => image.complete && image.naturalWidth > 0)
            )
        )
        .toBe(true);
      const rects = await cards.evaluateAll((elements) =>
        elements.map((el) => el.getBoundingClientRect().toJSON())
      );
      if (width >= 1024) {
        assert.ok(Math.abs(rects[0].y - rects[1].y) < 1);
        assert.ok(rects[1].x > rects[0].right);
      } else {
        assert.ok(Math.abs(rects[0].x - rects[1].x) < 1);
        assert.ok(rects[1].y > rects[0].bottom);
      }
      assert.deepEqual(
        await cards
          .locator(".xc-img")
          .evaluateAll((es) => es.map((e) => getComputedStyle(e).objectFit)),
        ["contain", "contain"]
      );
      await noOverflow();
      await screenshot(`${name}-${width}-closed`);
      const first = cards.nth(0).locator(".xc-btn");
      const second = cards.nth(1).locator(".xc-btn");
      await first.focus();
      await page.keyboard.press("Space");
      await expect(first).toHaveAttribute("aria-expanded", "true");
      await expect(second).toHaveAttribute("aria-expanded", "false");
      assert.ok(
        (await cards.nth(0).locator("[data-paragraph-id]").innerText()).length >
          100
      );
      assert.ok(
        await cards
          .nth(0)
          .locator("[data-paragraph-id]")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 17),
        "reading text must use reader typography"
      );
      await noOverflow();
      await screenshot(`${name}-${width}-first-open`);
      await first.press("Enter");
      await second.tap();
      await expect(first).toHaveAttribute("aria-expanded", "false");
      await expect(second).toHaveAttribute("aria-expanded", "true");
      assert.ok(
        (await cards.nth(1).locator("[data-paragraph-id]").innerText()).length >
          100
      );
      await noOverflow();
      cases.push({
        name,
        width,
        paired: width >= 1024,
        independentKeyboardAndTouch: true,
        artworkLoadedAndContained: true,
        rects,
      });
    }
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await story("chapter-text-breakoutrail--descartes-trial");
    const track = page.locator(".br-track");
    await expect(page.locator("[data-source-paragraph]")).toHaveCount(8);
    await page.evaluate(
      () => (document.documentElement.dataset.reduceMotion = "1")
    );
    await expect
      .poll(() => track.evaluate((e) => getComputedStyle(e).scrollBehavior))
      .toBe("auto");
    await track.focus();
    await track.press("ArrowRight");
    await expect(page.getByRole("status")).toHaveText("2 of 3");
    await track.press("End");
    await expect(page.getByRole("status")).toHaveText("3 of 3");
    await expect(
      page.getByRole("button", { name: "Next", exact: true })
    ).toBeDisabled();
    await track.press("Home");
    await expect(page.getByRole("status")).toHaveText("1 of 3");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("2 of 3");
    await expect
      .poll(() =>
        track.evaluate((el) => Math.abs(el.scrollLeft - el.clientWidth))
      )
      .toBeLessThan(2);
    // Full-page capture changes Chromium's viewport and can re-snap a tall
    // horizontal region. Validate the normal viewport and keep it unchanged.
    await screenshot(`descartes-${width}-lateral`, false);
    await expect(page.getByRole("status")).toHaveText("2 of 3");
    await expect
      .poll(() =>
        track.evaluate((el) => Math.abs(el.scrollLeft - el.clientWidth))
      )
      .toBeLessThan(2);
    for (const viewport of [
      { width: 390, height: 1800 },
      { width: 844, height: 390 },
      { width: 1440, height: 1000 },
      { width, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      await expect
        .poll(() =>
          track.evaluate((el) => Math.abs(el.scrollLeft - el.clientWidth))
        )
        .toBeLessThan(2);
      await expect(page.getByRole("status")).toHaveText("2 of 3");
    }
    // Explicit reader OFF wins over OS reduce; unset follows OS reduce.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(
      () => (document.documentElement.dataset.reduceMotion = "0")
    );
    assert.equal(
      await track.evaluate((e) => getComputedStyle(e).scrollBehavior),
      "smooth"
    );
    await page.evaluate(
      () => delete document.documentElement.dataset.reduceMotion
    );
    assert.equal(
      await track.evaluate((e) => getComputedStyle(e).scrollBehavior),
      "auto"
    );
    assert.ok(
      await page
        .locator("[data-source-paragraph]")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 17)
    );
    await track.evaluate((el) =>
      el.scrollTo({ left: el.clientWidth, behavior: "instant" })
    );
    await expect
      .poll(() =>
        track.evaluate((el) => Math.abs(el.scrollLeft - el.clientWidth))
      )
      .toBeLessThan(2);
    await track.scrollIntoViewIfNeeded();
    const beforeWheel = await page.evaluate(() => scrollY);
    const bounds = await track.boundingBox();
    await page.mouse.move(
      bounds.x + 30,
      Math.max(10, Math.min(bounds.y + 100, 900))
    );
    await page.mouse.wheel(0, 250);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(beforeWheel);
    await noOverflow();
    await expect
      .poll(() =>
        track.evaluate((el) => Math.abs(el.scrollLeft - el.clientWidth))
      )
      .toBeLessThan(2);
    await page.getByRole("button", { name: "Read vertically" }).click();
    await expect(page.locator(".br")).toHaveClass(/br--vertical/);
    await expect(page.locator("[data-source-paragraph]")).toHaveCount(8);
    await noOverflow();
    await screenshot(`descartes-${width}-vertical`);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    cases.push({
      name: "descartes",
      width,
      keyboardAndButtons: true,
      motionPrecedence: true,
      selectedPanelSurvivesResizeAndOrientation: true,
      allEightParagraphs: true,
      verticalAlternative: true,
    });
  }
  for (const [input, slug] of [
    ["mouse", "alcmaeon"],
    ["keyboard", "descartes"],
    ["touch", "dualism"],
  ]) {
    await story("chapter-text-reference-links-review--ordinary-links");
    const href = `https://plato.stanford.edu/entries/${slug}/`;
    const link = page.locator(`a[href="${href}"]`);
    await expect(link).toBeVisible();
    assert.equal(
      await link.evaluate((el) => getComputedStyle(el).textDecorationLine),
      "underline"
    );
    assert.equal(await link.evaluate((el) => el.tabIndex), 0);
    await screenshot(`reference-links-${input}`);
    if (input === "mouse") await link.click();
    else if (input === "touch") await link.tap();
    else {
      await link.focus();
      await link.press("Enter");
    }
    await expect(page).toHaveURL(href);
    cases.push({
      name: "ordinary reference link",
      input,
      href,
      destinationStubbed: true,
    });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      { engine: process.env.G6_BROWSER || "chromium", cases, errors, blocked },
      null,
      2
    ) + "\n"
  );
  console.log(`PASS ${cases.length} G6 browser scenarios; ${output}`);
} finally {
  await browser.close();
}
