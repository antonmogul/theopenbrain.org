/** Local production reader with published data; rejects every write request. */
import { chromium, firefox, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.G6_READER_URL || "http://127.0.0.1:6117";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base));
const output = process.env.G6_OUTPUT || "/tmp/openbrain-g6-repair/reader";
await mkdir(output, { recursive: true });
const browser = await (
  process.env.G6_BROWSER === "firefox" ? firefox : chromium
).launch();
const results = [];
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      hasTouch: true,
      serviceWorkers: "block",
    });
    const blocked = [];
    await page.route("**/*", (route) => {
      if (!["GET", "HEAD"].includes(route.request().method())) {
        blocked.push(route.request().method());
        return route.abort();
      }
      return route.continue();
    });
    await page.addInitScript(() =>
      localStorage.setItem("ob.reduceMotion", "on")
    );
    await page.goto(`${base}/chapter/1/foundations-of-neuroscience`);
    const boxes = page.locator(".bx--paired");
    await expect(boxes).toHaveCount(2, { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    for (const [index, box] of (await boxes.all()).entries()) {
      const cards = box.locator(".xc");
      await expect(cards).toHaveCount(2);
      await box.scrollIntoViewIfNeeded();
      const rects = await cards.evaluateAll((elements) =>
        elements.map((el) => el.getBoundingClientRect().toJSON())
      );
      assert.ok(
        width >= 1024
          ? Math.abs(rects[0].y - rects[1].y) < 1
          : rects[1].y >= rects[0].bottom
      );
      await cards.nth(0).locator(".xc-btn").press("Space");
      await expect(cards.nth(1).locator(".xc-btn")).toHaveAttribute(
        "aria-expanded",
        "false"
      );
      await cards.nth(1).locator(".xc-btn").tap();
      await expect(cards.nth(0).locator(".xc-btn")).toHaveAttribute(
        "aria-expanded",
        "true"
      );
      const figures = [];
      for (const card of await cards.all()) {
        assert.ok(
          (await card.locator("[data-paragraph-id]").innerText()).length > 100
        );
        await expect
          .poll(() =>
            card
              .locator("img")
              .evaluateAll((images) =>
                images.every((img) => img.complete && img.naturalWidth > 0)
              )
          )
          .toBe(true);
        // Both comparative cards have real nested illustrations. Hippocrates'
        // first card has prose only, so do not manufacture an expected figure.
        if (index === 1)
          await expect(
            card.locator(".xc-panel .fig-shell--inline")
          ).toHaveCount(1);
        for (const shell of await card
          .locator(".xc-panel .fig-shell--inline")
          .all()) {
          await shell.scrollIntoViewIfNeeded();
          const geometry = await shell.evaluate((shell) => {
            const panel = shell
              .closest(".xc-panel-inner")
              .getBoundingClientRect()
              .toJSON();
            return {
              panel,
              elements: [
                shell,
                ...shell.querySelectorAll(
                  ".fig-legend, .figimg-img, .fig-fs-btn"
                ),
              ].map((el) => ({
                className: el.className,
                rect: el.getBoundingClientRect().toJSON(),
                clientWidth: el.clientWidth,
                scrollWidth: el.scrollWidth,
              })),
              imageFit: getComputedStyle(shell.querySelector(".figimg-img"))
                .objectFit,
              legend: shell.querySelector(".fig-legend")?.textContent.trim(),
            };
          });
          assert.equal(geometry.elements.length, 4);
          assert.ok(geometry.legend?.length > 50);
          assert.equal(geometry.imageFit, "contain");
          for (const el of geometry.elements) {
            assert.ok(
              el.rect.left >= geometry.panel.left - 1 &&
                el.rect.right <= geometry.panel.right + 1,
              `${el.className} fits panel at ${width}`
            );
            assert.ok(
              el.rect.top >= geometry.panel.top - 1 &&
                el.rect.bottom <= geometry.panel.bottom + 1,
              `${el.className} fits panel height at ${width}`
            );
            assert.ok(
              el.scrollWidth <= el.clientWidth + 1,
              `${el.className} has no clipped content at ${width}`
            );
          }
          figures.push(geometry);
          await shell.screenshot({
            path: `${output}/figure-${width}-${index}-${figures.length}.png`,
          });
          await shell
            .getByRole("button", { name: "Expand to full screen" })
            .click();
          await expect(page.getByRole("dialog")).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
      }
      results.push({
        width,
        box: await box.getAttribute("id"),
        rects,
        bothOpen: true,
        figures,
      });
    }
    await expect(page.locator(".br-track,.review-reference-links")).toHaveCount(
      0
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      )
    );
    assert.deepEqual(blocked, []);
    await page.close();
  }
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(results, null, 2) + "\n"
  );
  console.log(
    `PASS ${results.length} read-only production-build reader cases; ${output}`
  );
} finally {
  await browser.close();
}
