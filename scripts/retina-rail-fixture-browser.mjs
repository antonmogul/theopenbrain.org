// Offline pending-migration lane; the published Retina lane stays separate.
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const base = process.env.STORYBOOK_URL || "http://127.0.0.1:6010";
const out =
  process.env.RAIL_FIXTURE_OUT ||
  "history-fixture-browser-artifacts/retina-rails";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const width of [1920, 1331, 375]) {
  const page = await browser.newPage({
    viewport: { width, height: width === 375 ? 704 : 947 },
    isMobile: width === 375,
    hasTouch: width === 375,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `${base}/iframe.html?id=chapter-retina-full-reader--rail-boxes&viewMode=story`
  );
  await expect(page.locator("[data-rail-scroller]")).toHaveCount(7, {
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  const boxes = page.locator(".bx");
  for (let i = 0; i < 7; i++) {
    const box = boxes.nth(i),
      track = box.locator("[data-rail-scroller]");
    await expect(track).toHaveAttribute(
      "data-rail-mode",
      width === 375 ? "swipe" : "track"
    );
    await expect(box.locator(".rp-screen .fb-stage--floating")).toHaveCount(0);
    await track.evaluate((el) => {
      const pause = el.closest("[data-rail-pause]");
      scrollTo({
        top:
          pause.getBoundingClientRect().top +
          scrollY -
          Number(el.dataset.railTop) +
          Number(el.dataset.railLead),
        behavior: "instant",
      });
    });
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `${out}/${width}-${i}.png`,
      animations: "disabled",
      timeout: 15000,
    });
  }
  // The merged box keeps Dalton and four independent interactive screens.
  const color = page.locator('[data-section-slug="box-colour-vision"]');
  await expect(color.locator("[data-rail-part]")).toHaveCount(5);
  await expect(color.locator(".rp-screen")).toHaveCount(4);
  await expect(color).toContainText("John Dalton");
  const track = color.locator("[data-rail-scroller]");
  for (let i = 1; i < 5; i++) {
    await track.evaluate((el, index) => {
      const part = el.querySelectorAll("[data-rail-part]")[index];
      const x =
        part.getBoundingClientRect().left -
        el.getBoundingClientRect().left +
        el.scrollLeft -
        parseFloat(getComputedStyle(el).paddingLeft);
      if (el.dataset.railPinned === "1") {
        const pause = el.closest("[data-rail-pause]");
        scrollTo({
          top:
            pause.getBoundingClientRect().top +
            scrollY -
            Number(el.dataset.railTop) +
            Number(el.dataset.railLead) +
            x,
          behavior: "instant",
        });
      } else {
        el.scrollLeft = x;
        scrollTo({
          top: el.getBoundingClientRect().top + scrollY - 72,
          behavior: "instant",
        });
      }
    }, i);
    const part = color.locator("[data-rail-part]").nth(i);
    const frame = part.locator("iframe");
    await expect(frame).toBeVisible({ timeout: 15000 });
    await expect(
      frame.contentFrame().locator(".ob-sec:visible .ob-h2").first()
    ).toHaveText(
      [
        "The sliver we can see",
        "One wavelength, three numbers",
        "Three lights are enough",
        "Losing a channel",
      ][i - 1]
    );
    await expect(part.locator(".rp-screen")).toBeVisible();
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
  await page.close();
}
await browser.close();
console.log("Retina rail fixtures passed at 1920, 1331 and 375");
