// Read-only browser evidence against a preview or production reader.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const base = process.env.PROOF_BASE || "http://127.0.0.1:4294";
const out = process.env.PROOF_OUT || "box-motion-proof-artifacts";
const browser = await chromium.launch();
await mkdir(out, { recursive: true });
for (const viewport of [
  { width: 1331, height: 992 },
  { width: 1440, height: 900 },
]) {
  const page = await browser.newPage({ viewport });
  if (process.env.PROOF_MIGRATED) {
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
    await page.route("**/rest/v1/sections?*", async (route) => {
      const response = await route.fetch();
      const rows = await response.json();
      await route.fulfill({
        response,
        json: rows.map((row) => ({
          ...row,
          box_card: cards[row.slug] || null,
        })),
      });
    });
  }
  await page.addInitScript(() => {
    localStorage.setItem("ob.motionNotice", "1");
    document.documentElement.dataset.reduceMotion = "0";
  });
  await page.goto(`${base}/chapter/1/foundations-of-neuroscience`);
  await page.waitForSelector("[data-box-title-card]", { timeout: 60000 });
  await page.waitForTimeout(2500);
  const boxes = await page.locator("[data-rail-pause]").evaluateAll((els) =>
    els.map((e) => ({
      id: e.querySelector("[data-breakout-box]")?.dataset.breakoutBox,
      title: e.querySelector(".tc-title")?.textContent,
      src: e.querySelector(".tc-img")?.getAttribute("src"),
    }))
  );
  await writeFile(
    `${out}/boxes-${viewport.width}.json`,
    JSON.stringify(boxes, null, 2)
  );
  for (const slug of ["sacred-disease", "rete-mirabile"]) {
    // Production IDs are UUIDs; title text locates the same authored boxes.
    const title =
      slug === "sacred-disease" ? "Hippocrates:" : "Failures in comparative";
    const pause = page
      .locator("[data-rail-pause]")
      .filter({ has: page.locator(".tc-title").filter({ hasText: title }) });
    const pin = await pause.evaluate(
      (e) =>
        e.getBoundingClientRect().top +
        scrollY -
        parseFloat(getComputedStyle(e.querySelector(".bx")).top)
    );
    const dir = `${out}/${viewport.width}-${slug}`;
    await mkdir(dir, { recursive: true });
    const end = await pause.evaluate((e) => {
      const track = e.querySelector("[data-rail-scroller]");
      return (
        Number(track.dataset.railLead) +
        (track.hasAttribute("data-rail-max")
          ? Number(track.dataset.railMax)
          : track.scrollWidth - track.clientWidth) +
        innerHeight * 0.2
      );
    });
    const frames = [];
    for (let delta = -160; delta <= end; delta += 40) {
      await page.evaluate(
        (y) => window.scrollTo({ top: y, behavior: "instant" }),
        pin + delta
      );
      await page.waitForTimeout(230);
      frames.push(
        await pause.evaluate((e, delta) => {
          const card = e.querySelector("[data-box-title-card]");
          const picture = card.querySelector(".tc-picture");
          const lead = e.querySelector(
            "[data-rail-part] [data-rail-figure] img"
          );
          return {
            delta,
            transform: getComputedStyle(picture).transform,
            opacity: Number(getComputedStyle(picture).opacity),
            state: card.dataset.cardState,
            leadVisibility: getComputedStyle(lead).visibility,
            leadSrc: lead.getAttribute("src"),
          };
        }, delta)
      );
      await page.screenshot({
        path: `${dir}/${String(delta + 160).padStart(4, "0")}.jpg`,
        type: "jpeg",
        quality: 65,
      });
    }
    await writeFile(`${dir}/handoff.json`, JSON.stringify(frames, null, 2));
    if (process.env.PROOF_MIGRATED) {
      if (slug === "sacred-disease") {
        expect(frames.every((f) => f.transform === "none")).toBe(true);
        expect(frames.every((f) => f.leadVisibility === "visible")).toBe(true);
        expect(frames.some((f) => f.opacity > 0 && f.opacity < 1)).toBe(true);
      } else {
        expect(frames.some((f) => f.transform !== "none")).toBe(true);
        expect(frames.some((f) => f.leadVisibility === "hidden")).toBe(true);
        expect(frames.at(-1).leadVisibility).toBe("visible");
      }
    }
  }
  await page.close();
}
await browser.close();
