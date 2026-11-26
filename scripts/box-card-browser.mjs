// OPENBRAIN-94: real reader, GET-only production data, locally overlaid seed.
import { chromium, webkit, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const base = process.env.PROOF_BASE || "http://127.0.0.1:4294";
const out = process.env.PROOF_OUT || "box-card-browser-artifacts";
await mkdir(out, { recursive: true });
const sql = await readFile(
  "supabase/migrations/20261124079400_sections_box_card.sql",
  "utf8"
);
const cards = Object.fromEntries(
  [
    ...sql.matchAll(
      /set box_card = '((?:[^']|'')+)'::jsonb[\s\S]*?s.slug='([^']+)'/g
    ),
  ].map((m) => [m[2], JSON.parse(m[1].replaceAll("''", "'"))])
);
const results = [];
for (const scenario of [
  { name: "desktop", width: 1331, height: 992 },
  { name: "reduced", width: 1440, height: 900, reducedMotion: "reduce" },
  { name: "phone", width: 375, height: 704, isMobile: true, hasTouch: true },
  {
    name: "iphone-webkit",
    width: 375,
    height: 704,
    isMobile: true,
    hasTouch: true,
    engine: webkit,
  },
]) {
  const browser = await (scenario.engine || chromium).launch();
  const page = await browser.newPage({
    viewport: { width: scenario.width, height: scenario.height },
    isMobile: scenario.isMobile,
    hasTouch: scenario.hasTouch,
    reducedMotion: scenario.reducedMotion || "no-preference",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/rest/v1/sections?*", async (route) => {
    const response = await route.fetch();
    const rows = await response.json();
    await route.fulfill({
      response,
      json: rows.map((row) => ({ ...row, box_card: cards[row.slug] || null })),
    });
  });
  await page.goto(`${base}/chapter/1/foundations-of-neuroscience`);
  const pause = page.locator("[data-rail-pause]").filter({
    has: page.locator(".tc-title").filter({ hasText: "Hippocrates:" }),
  });
  await expect(pause).toHaveCount(1, { timeout: 60000 });
  await page.waitForTimeout(1600);
  const card = pause.locator("[data-box-title-card]");
  const result = { scenario: scenario.name, errors };
  if (scenario.name === "desktop") {
    await expect(card.locator("[data-card-layer]")).toHaveCount(4);
    const track = pause.locator("[data-rail-scroller]");
    const pin = await pause.evaluate(
      (e) =>
        e.getBoundingClientRect().top +
        scrollY -
        parseFloat(getComputedStyle(e.querySelector(".bx")).top)
    );
    const lead = Number(await track.getAttribute("data-rail-lead"));
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      pin + lead + 100
    );
    await page.waitForTimeout(700);
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      pin + lead + 500
    );
    const lag = [];
    for (let i = 0; i < 20; i++) {
      lag.push(
        await track.evaluate((e) => ({
          time: performance.now(),
          pageY: scrollY,
          native: e.scrollLeft,
          offset: Number(e.dataset.railVisualOffset),
          max: Number(e.dataset.railMax),
        }))
      );
      await page.screenshot({
        path: `${out}/lag-${String(i).padStart(2, "0")}.jpg`,
        type: "jpeg",
        quality: 75,
      });
      await page.waitForTimeout(16);
    }
    result.lag = lag;
    expect(lag.some((s) => Math.abs(s.offset) > 5)).toBe(true);
    expect(Math.abs(lag.at(-1).offset)).toBeLessThan(2);
    expect(
      Math.max(...lag.map((s) => s.pageY)) -
        Math.min(...lag.map((s) => s.pageY))
    ).toBeLessThanOrEqual(1);
    expect(
      Math.max(...lag.map((s) => s.max)) - Math.min(...lag.map((s) => s.max))
    ).toBe(0);
    // Search uses the shared jump to the second rail part.
    await page
      .getByRole("button", { name: "Search this chapter", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Search this chapter" })
      .fill("Humoral theory");
    await page
      .getByRole("option")
      .filter({ hasText: "Humoral theory" })
      .first()
      .click();
    await page.waitForTimeout(1600);
    result.search = await track.evaluate((e) => ({
      x: e.scrollLeft,
      part: [...e.querySelectorAll("[data-rail-part]")].map((p) => ({
        text: p.textContent.slice(0, 80),
        left: p.getBoundingClientRect().left,
      })),
      offset: Number(e.dataset.railVisualOffset),
    }));
    expect(result.search.x).toBeGreaterThan(500);
    expect(Math.abs(result.search.offset)).toBeLessThan(1);
    await page.screenshot({ path: `${out}/search.jpg` });
    await page
      .getByRole("slider", { name: "Chapter timeline", exact: true })
      .hover();
    await page
      .getByRole("button", { name: "Open chapter map", exact: true })
      .click();
    await page
      .locator(".map-section-head")
      .filter({ hasText: "Hippocrates" })
      .click();
    await page.waitForTimeout(1600);
    result.timeline = await pause.evaluate((e) => ({
      top: e.getBoundingClientRect().top,
      card: e.querySelector("[data-box-title-card]").getBoundingClientRect()
        .top,
    }));
    expect(
      await card
        .locator(".tc-copy")
        .evaluate((e) => Number(getComputedStyle(e).opacity))
    ).toBeGreaterThan(0.95);
    expect(await track.evaluate((e) => e.scrollLeft)).toBe(0);
    await page.screenshot({ path: `${out}/timeline.jpg` });
    // Skip's destination is the end of the pause, independent of the spring.
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      pin + 300
    );
    await page.waitForTimeout(700);
    await card.locator("[data-card-skip]").click();
    await page.waitForTimeout(1600);
    result.skip = await pause.evaluate((e) => ({
      bottom: e.getBoundingClientRect().bottom,
      bar:
        document.querySelector(".reader-top-bar")?.getBoundingClientRect()
          .bottom || 48,
    }));
    expect(
      Math.abs(result.skip.bottom - result.skip.bar - 16)
    ).toBeLessThanOrEqual(12);
    await page.screenshot({ path: `${out}/skip.jpg` });
  } else {
    await expect(card.locator("[data-card-flat]")).toHaveAttribute(
      "src",
      /original.webp/
    );
    await expect
      .poll(
        () =>
          card
            .locator("[data-card-flat]")
            .evaluate((e) => e.complete && e.naturalWidth > 0),
        { timeout: 15000 }
      )
      .toBe(true);
    await expect(card.locator("[data-card-layer]")).toHaveCount(0);
    await expect(pause.locator("[data-rail-scroller]")).toHaveAttribute(
      "data-rail-pinned",
      "0"
    );
    await card.evaluate((e) =>
      scrollTo({
        top: e.getBoundingClientRect().top + scrollY - 72,
        behavior: "instant",
      })
    );
    await page.waitForTimeout(700);
    await card.evaluate((e) =>
      scrollTo({
        top: e.getBoundingClientRect().top + scrollY - 72,
        behavior: "instant",
      })
    );
    await page.screenshot({
      path: `${out}/${scenario.name}.jpg`,
      timeout: 15000,
      animations: "disabled",
    });
    await card.locator("[data-card-expand]").click();
    await expect(page.locator(".bx-card-expanded img")).toHaveAttribute(
      "src",
      /original.webp/
    );
    await page.keyboard.press("Escape");
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  ).toBe(true);
  expect(errors).toEqual([]);
  results.push(result);
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
