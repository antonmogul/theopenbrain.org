/** OPENBRAIN-85: count every copy, including images leaked into prose.
 * node scripts/retina-image-copies-browser.mjs --base http://127.0.0.1:4285
 *   --out /path/to/evidence --phase before [--allow-duplicates]
 * Reads published data only. Zoom cases emulate the CSS viewport and DPR
 * of desktop page zoom; they do not drive a native browser's zoom menu.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit, devices } from "@playwright/test";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const base = flag("base", "http://127.0.0.1:4285");
const out = flag("out", ".smoke/retina-image-copies");
const phase = flag("phase", "after");
mkdirSync(out, { recursive: true });
const results = [];
const errors = [];
const save = () =>
  writeFileSync(
    `${out}/${phase}-copies.json`,
    JSON.stringify({ results, errors }, null, 2)
  );

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 947 },
    });
    await context.route("**/*", (route) => {
      const req = route.request();
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method()))
        return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const open = async (p) => {
      p.on("pageerror", (e) => errors.push(`${engine.name()}: ${e.message}`));
      p.on("console", (m) => {
        if (m.type() === "error") errors.push(`${engine.name()}: ${m.text()}`);
      });
      await p.goto(`${base}/chapter/2/the-retina`);
      await p.locator(".fb-slot--column").first().waitFor();
      await p.waitForTimeout(700);
    };
    const measure = async (p, scenario) => {
      // Visibility means laid out, including below the current fold: every
      // figure in the chapter is checked at every width, not only one screenshot.
      const data = await p.evaluate(() => {
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width > 0 &&
            r.height > 0 &&
            getComputedStyle(el).visibility !== "hidden" &&
            !el.closest('[aria-hidden="true"]')
          );
        };
        const slots = [...document.querySelectorAll(".fb-slot--column")]
          .filter((slot) => slot.querySelector(".ii-figure, .w-text"))
          .map((slot) => {
            const image = slot.querySelector("img");
            const number = slot.querySelector("[data-figure-number]")?.dataset
              .figureNumber;
            const copies = image
              ? [...document.querySelectorAll("#text img")].filter(
                  (img) => img.src === image.src && visible(img)
                )
              : [];
            return {
              number,
              source: image?.getAttribute("src"),
              slotImages: [...slot.querySelectorAll("img")].filter(visible)
                .length,
              visibleCopies: copies.length,
              copies: copies.map((img) => ({
                inProse: !!img.closest("[data-paragraph-id]"),
                width: img.getBoundingClientRect().width,
                right: img.getBoundingClientRect().right,
              })),
            };
          });
        return {
          width: innerWidth,
          dpr: devicePixelRatio,
          wide: matchMedia("(min-width: 1024px)").matches,
          narrow: matchMedia("(max-width: 1023px)").matches,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          slots,
        };
      });
      assert.equal(
        data.slots.length,
        8,
        "all eight published Retina image blocks loaded"
      );
      results.push({ engine: engine.name(), scenario, ...data });
    };
    await open(page);
    await measure(page, "reviewer-1920");
    await page
      .locator(".fb-slot--column")
      .first()
      .evaluate((el) => {
        const prev = el.previousElementSibling;
        window.scrollTo(
          0,
          (prev?.querySelector("img") || el).getBoundingClientRect().top +
            scrollY -
            80
        );
      });
    await page.screenshot({
      path: `${out}/${phase}-${engine.name()}-1920.png`,
      animations: "disabled",
      timeout: 15000,
    });
    for (let width = 320; width <= 1100; width += 10) {
      await page.setViewportSize({ width, height: 947 });
      await page.waitForTimeout(70);
      await measure(page, "width-sweep");
    }
    for (const width of [1023, 1024, 1025, 1440, 1920, 375, 1920]) {
      await page.setViewportSize({ width, height: 947 });
      await page.waitForTimeout(150);
      await measure(page, "resize-boundary-roundtrip");
      if ([1024, 1440].includes(width)) {
        await page.locator(".fb-slot--column").first().scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `${out}/${phase}-${engine.name()}-${width}.png`,
          animations: "disabled",
          timeout: 15000,
        });
      }
    }
    for (const physicalWidth of [1920, 1470]) {
      for (let percent = 80; percent <= 200; percent += 10) {
        const zoom = percent / 100;
        const zoomContext = await browser.newContext({
          deviceScaleFactor: zoom,
          viewport: {
            width: Math.round(physicalWidth / zoom),
            height: Math.round(947 / zoom),
          },
        });
        await zoomContext.route("**/*", (route) =>
          ["GET", "HEAD", "OPTIONS"].includes(route.request().method())
            ? route.continue()
            : route.abort()
        );
        const zoomPage = await zoomContext.newPage();
        await open(zoomPage);
        await measure(zoomPage, `zoom-equivalent-${physicalWidth}-${percent}%`);
        await zoomContext.close();
      }
    }
    const phone = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 375, height: 704 },
      deviceScaleFactor: 3,
    });
    await phone.route("**/*", (route) =>
      ["GET", "HEAD", "OPTIONS"].includes(route.request().method())
        ? route.continue()
        : route.abort()
    );
    const mobile = await phone.newPage();
    await open(mobile);
    await measure(mobile, "phone-375-dpr3");
    await mobile.locator(".fb-slot--column").first().scrollIntoViewIfNeeded();
    await mobile.screenshot({
      path: `${out}/${phase}-${engine.name()}-375.png`,
      animations: "disabled",
      timeout: 15000,
    });
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.waitForTimeout(150);
    await measure(mobile, "phone-390-dpr3");
    await mobile.locator(".fb-slot--column").first().scrollIntoViewIfNeeded();
    await mobile.screenshot({
      path: `${out}/${phase}-${engine.name()}-390.png`,
      animations: "disabled",
      timeout: 15000,
    });
    await phone.close();
    save();
    await context.close();
  } finally {
    await browser.close();
    save();
  }
}
const duplicates = results.filter((r) =>
  r.slots.some((s) => s.visibleCopies !== 1 || s.slotImages !== 1)
);
console.log(
  JSON.stringify({
    cases: results.length,
    duplicateCases: duplicates.length,
    errors: errors.length,
  })
);
if (!process.argv.includes("--allow-duplicates"))
  assert.equal(
    duplicates.length,
    0,
    "one visible copy per figure in every layout"
  );
assert.equal(
  results.filter((r) => r.overflow).length,
  0,
  "no horizontal page overflow"
);
assert.equal(errors.length, 0, "no browser errors");
