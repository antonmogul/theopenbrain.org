/* eslint-disable import/no-unresolved -- browser imports served by Vite */
import { chromium, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const out =
  process.env.PROOF_OUT ||
  "/Volumes/Brain/artifacts/feedback-2026-11-24/OPENBRAIN-98";
const before = process.argv.includes("--before");
const base =
  process.env.PROOF_BASE ||
  (before
    ? "https://theopenbrainorg-production.up.railway.app"
    : "http://127.0.0.1:5298");
const data = JSON.parse(
  await readFile(`${out}/${before ? "live" : "migrated"}.json`, "utf8")
);
const manifest = JSON.parse(
  await readFile("src/__tests__/fixtures/retinaRailBoxes.json", "utf8")
);
const html = await readFile(
  "src/widgets/uploads/retina-color-vision.html",
  "utf8"
);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const viewport of [
  { width: 1920, height: 947 },
  { width: 1331, height: 992 },
  { width: 375, height: 704 },
  ...(!before ? [{ width: 1331, height: 992, reduced: true }] : []),
]) {
  if (
    process.env.PROOF_WIDTH &&
    String(viewport.width) !== process.env.PROOF_WIDTH
  )
    continue;
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.width === 375,
    hasTouch: viewport.width === 375,
    reducedMotion: viewport.reduced ? "reduce" : "no-preference",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (!before) {
    await page.route("**/rest/v1/sections?*", (route) =>
      route.fulfill({ json: data.sections })
    );
    await page.route("**/rest/v1/paragraphs?*", (route) =>
      route.fulfill({ json: data.paragraphs })
    );
    await page.route("**/rest/v1/widget_uploads?*", async (route) => {
      const response = await route.fetch();
      const rows = await response.json();
      await route.fulfill({
        response,
        json: rows.map((r) =>
          r.slug === "retina-color-vision" ? { ...r, html } : r
        ),
      });
    });
  }
  await page.goto(`${base}/chapter/2/the-retina`);
  await page.waitForSelector(".chapter-reader #text", { timeout: 60000 });
  await page.waitForTimeout(2500);
  for (const box of manifest.boxes) {
    if (process.env.PROOF_BOX && box.slug !== process.env.PROOF_BOX) continue;
    console.log(viewport.width, box.slug, viewport.reduced ? "reduced" : "");
    const prefix = `${before ? "before" : "after"}-${viewport.width}${viewport.reduced ? "-reduced" : ""}-${box.slug}`;
    if (before) {
      const id = manifest.moves.find((m) => m.to === box.id).id;
      const target = page.locator(`[data-timeline-id="${id}"]`).first();
      await target.evaluate((el) =>
        window.scrollTo({
          top: el.getBoundingClientRect().top + scrollY - 70,
          behavior: "instant",
        })
      );
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${out}/${prefix}.png`,
        animations: "disabled",
        timeout: 15000,
      });
      continue;
    }
    const frame = page.locator(`[data-section-slug="${box.slug}"]`);
    await expect(frame).toHaveCount(1);
    const pause = frame.locator("..");
    const track = frame.locator("[data-rail-scroller]");
    await expect(track).toHaveCount(1);
    const geometry = await track.evaluate((el) => {
      const pause = el.closest("[data-rail-pause]");
      return {
        pin:
          pause.getBoundingClientRect().top +
          scrollY -
          Number(el.dataset.railTop),
        lead: Number(el.dataset.railLead),
        max: Number(el.dataset.railMax),
        mode: el.dataset.railMode,
      };
    });
    const captures =
      viewport.width === 375 || viewport.reduced
        ? [0, 1]
        : [0, 0.28, 0.55, 1, 1.5, 2];
    for (const [i, part] of captures.entries()) {
      if (viewport.width === 375 || viewport.reduced) {
        const node = i === 0 ? pause.locator("[data-box-title-card]") : track;
        await node.evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + scrollY - 72,
            behavior: "instant",
          })
        );
      } else
        await page.evaluate(
          (y) => scrollTo({ top: y, behavior: "instant" }),
          geometry.pin +
            Math.min(geometry.lead + geometry.max, geometry.lead * part)
        );
      await page.waitForTimeout(650);
      await page.screenshot({
        path: `${out}/${prefix}-${i}.png`,
        animations: "disabled",
        timeout: 15000,
      });
    }
    const targets = frame.locator("[data-timeline-id],.P[id]");
    const ids = await targets.evaluateAll((els) =>
      els.map((el) => el.dataset.timelineId || el.id)
    );
    for (const id of ids) {
      // Use the production reader helper, rather than hand-written jump math.
      await page.evaluate(async (id) => {
        const { jumpToId } = await import("/src/helper/readerJump.js");
        return jumpToId(id, { focus: true });
      }, id);
      await page.waitForTimeout(1000);
      const landing = await page.evaluate(async (id) => {
        const { findReaderAnchor } = await import("/src/helper/readerJump.js");
        const { railXOf } = await import("/src/helper/exploreRail.js");
        const el = findReaderAnchor(id),
          sc = el.closest("[data-rail-scroller]");
        return {
          x: sc.scrollLeft,
          wanted: railXOf(el, sc),
          top: sc.getBoundingClientRect().top,
        };
      }, id);
      expect(Math.abs(landing.x - landing.wanted), id).toBeLessThan(4);
      await page.screenshot({
        path: `${out}/${prefix}-part-${ids.indexOf(id)}.png`,
        animations: "disabled",
        timeout: 15000,
      });
    }
    if (viewport.width >= 1024 && !viewport.reduced) {
      await page
        .getByRole("slider", { name: "Chapter timeline", exact: true })
        .hover();
      await page
        .getByRole("button", { name: "Open chapter map", exact: true })
        .click();
      await page
        .locator(".map-section-head")
        .filter({ has: page.getByText(box.title, { exact: true }) })
        .click();
      await page.waitForTimeout(1100);
      console.log(
        "timeline",
        await frame.evaluate((el) => ({
          y: scrollY,
          top: el.getBoundingClientRect().top,
          box: el.dataset.boxCard,
          sc: el.querySelector("[data-rail-scroller]").dataset,
          card: el.querySelector("[data-box-title-card]")?.dataset,
        }))
      );
      await page.screenshot({
        path: `${out}/${prefix}-timeline.png`,
        animations: "disabled",
        timeout: 15000,
      });
      expect(await track.evaluate((el) => el.scrollLeft)).toBe(0);
      const card = pause.locator("[data-box-title-card]");
      await expect
        .poll(
          () =>
            card
              .locator(".tc-copy")
              .evaluate((el) => Number(getComputedStyle(el).opacity)),
          { timeout: 6000 }
        )
        .toBeGreaterThan(0.95);
      await card.locator("[data-card-skip]").click();
      await page.waitForTimeout(1600);
      const bottom = await pause.evaluate(
        (el) => el.getBoundingClientRect().bottom
      );
      expect(Math.abs(bottom - 72)).toBeLessThan(16);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
    if (viewport.reduced)
      expect(await track.getAttribute("data-rail-pinned")).toBe("0");
    results.push({ viewport, box: box.slug, geometry, ids, errors });
  }
  await page.close();
}
await browser.close();
await writeFile(
  `${out}/${before ? "before" : "after"}-results.json`,
  JSON.stringify(results, null, 2)
);
