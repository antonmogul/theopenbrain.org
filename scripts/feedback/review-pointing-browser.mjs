#!/usr/bin/env node
/*
 * The review widget's pointing, end to end in real browsers (OPENBRAIN-204).
 *
 * For each chapter, width and engine it points at a paragraph, a heading,
 * the figure in the pane (an inline figure on a phone), a plate on a
 * side-scrolling box's track (History; the Retina's widget card), an
 * upload widget's iframe and the chapter timeline, the way a reviewer
 * does: the Feedback button, "Point at it", hover and click (a tap and
 * "Use this" on a phone), a note, Send. The send goes to a mocked RPC, so
 * the anchor checked is exactly the one the database would get. Then
 * feedback:locate opens a fresh browser on that anchor and must land on
 * the same place (pointing there again names the same thing).
 *
 *   node scripts/feedback/review-pointing-browser.mjs --base http://localhost:4204 \
 *     [--engines chromium,webkit] [--widths 1440,1024,390] \
 *     [--chapters history,retina] [--out .feedback/pointing]
 *
 * Needs a reader with chapter content (a preview build with the .env, or
 * production). Writes the screenshots and results.json to --out and exits 1
 * if any place was not found or differs.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, devices, webkit } from "@playwright/test";
import { locateAnchor, pageScript } from "./locate.mjs";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY ??= "1";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = flag("base", "http://localhost:4173").replace(/\/$/, "");
const ENGINES = flag("engines", "chromium,webkit").split(",");
const WIDTHS = flag("widths", "1440,1024,390").split(",").map(Number);
const CHAPTERS = flag("chapters", "history,retina").split(",");
const OUT = path.resolve(flag("out", ".feedback/pointing"));
// "reduce" (reduced motion on: a box's track scrolls by itself) and/or
// "no-preference" (motion on: the track is pinned and driven by the page).
const MOTIONS = flag("motion", "reduce,no-preference").split(",");
fs.mkdirSync(OUT, { recursive: true });

const RPC_ID = "00000000-0000-4000-8000-0000000000aa";

/*
 * Each target: `prepare` runs in the page (with window.__obLocate) and
 * returns the viewport point to point at, or null to skip; `want` is what
 * the picked anchor must be.
 */
const CHAPTER_TARGETS = {
  history: {
    path: "/chapter/1/foundations-of-neuroscience",
    targets: [
      {
        name: "paragraph",
        want: {
          kind: "paragraph",
          paragraphId: "0651e0fe-afc6-4c6d-b5e8-ec652e15e21e",
        },
        prepare: `
          const el = document.querySelector('[data-paragraph-id="0651e0fe-afc6-4c6d-b5e8-ec652e15e21e"]');
          window.__obLocate.scrollTop(el.getBoundingClientRect().top + scrollY - 160);
          await wait(800);
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width * 0.4, y: r.top + Math.min(r.height * 0.3, 120) };`,
      },
      {
        name: "heading",
        want: { kind: "heading", sectionSlug: "do-different-parts" },
        prepare: `
          const el = document.querySelector('section.reader-section[data-section-slug="do-different-parts"] > h2.T');
          window.__obLocate.scrollTop(el.getBoundingClientRect().top + scrollY - 200);
          await wait(1200);
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width * 0.3, y: r.top + r.height / 2 };`,
      },
      {
        name: "figure",
        want: { figureKey: "animationFoundationsFig6" },
        prepare: `
          const wide = matchMedia("(min-width: 1024px)").matches;
          if (wide) {
            const t = document.getElementById("triggerAnimationFoundationsFig6");
            window.__obLocate.scrollTop(t.getBoundingClientRect().top + scrollY - innerHeight / 2 + 60);
            await wait(1500);
            const p = document.querySelector(".figure-pane").getBoundingClientRect();
            return { x: p.left + p.width * 0.45, y: p.top + p.height * 0.4 };
          }
          const f = document.querySelector('[data-figure-key="animationFoundationsFig6"]');
          window.__obLocate.scrollTop(f.getBoundingClientRect().top + scrollY - 120);
          await wait(1000);
          const r = f.getBoundingClientRect();
          return { x: r.left + r.width * 0.5, y: r.top + Math.min(r.height * 0.5, innerHeight / 2) };`,
      },
      {
        name: "rail-plate",
        want: { kind: "rail-figure", boxSlug: "box-descartes", plateIndex: 1 },
        prepare: `
          const a = { kind: "rail-figure", boxSlug: "box-descartes", figureKey: "animationFoundationsFigA", plateIndex: 1, railPart: { index: 1 } };
          window.__obLocate.place(a);
          await wait(1500);
          window.__obLocate.place(a);
          await wait(1000);
          const plate = document.querySelector('aside.bx[data-section-slug="box-descartes"] [data-rail-figure-id="animationFoundationsFigA"]').querySelectorAll("[data-rail-plate]")[1];
          const r = plate.getBoundingClientRect();
          return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.4 };`,
      },
      {
        name: "upload-iframe",
        want: { kind: "widget", widgetId: "upload:history-penfield-binder" },
        prepare: UPLOAD_PREPARE("upload:history-penfield-binder"),
      },
      {
        name: "timeline",
        want: { kind: "chrome" },
        prepare: TIMELINE_PREPARE(),
      },
    ],
  },
  retina: {
    path: "/chapter/2/the-retina",
    targets: [
      {
        name: "paragraph",
        want: {
          kind: "paragraph",
          paragraphId: "0c312cd5-5107-4931-b766-a659294a64f3",
        },
        prepare: `
          const el = document.querySelector('[data-paragraph-id="0c312cd5-5107-4931-b766-a659294a64f3"]');
          window.__obLocate.scrollTop(el.getBoundingClientRect().top + scrollY - 160);
          await wait(800);
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width * 0.6, y: r.top + Math.min(r.height * 0.5, 200) };`,
      },
      {
        name: "heading",
        want: { kind: "heading", subsectionId: "synaptic-architecture" },
        prepare: `
          const el = document.getElementById("synaptic-architecture").nextElementSibling;
          window.__obLocate.scrollTop(el.getBoundingClientRect().top + scrollY - 200);
          await wait(1000);
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width * 0.2, y: r.top + r.height / 2 };`,
      },
      {
        name: "figure",
        want: { figureKey: "animationEyeStructur" },
        prepare: `
          const wide = matchMedia("(min-width: 1024px)").matches;
          if (wide) {
            const t = document.getElementById("triggerAnimationEyeStructur");
            window.__obLocate.scrollTop(t.getBoundingClientRect().top + scrollY - innerHeight / 2 + 60);
            await wait(1500);
            const p = document.querySelector(".figure-pane").getBoundingClientRect();
            return { x: p.left + p.width * 0.5, y: p.top + p.height * 0.5 };
          }
          const f = document.querySelector('[data-figure-key="animationEyeStructur"]') || document.querySelector('#triggerAnimationEyeStructur figure');
          if (!f) return null;
          window.__obLocate.scrollTop(f.getBoundingClientRect().top + scrollY - 120);
          await wait(1000);
          const r = f.getBoundingClientRect();
          return { x: r.left + r.width * 0.5, y: r.top + Math.min(r.height * 0.5, innerHeight / 2) };`,
      },
      {
        name: "widget-card",
        want: { kind: "widget", widgetId: "color-vision" },
        prepare: `
          const el = document.querySelector('[data-widget-breakout="color-vision"]');
          window.__obLocate.scrollTop(el.getBoundingClientRect().top + scrollY - 200);
          await wait(1000);
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width * 0.5, y: r.top + 30 };`,
      },
      {
        name: "upload-iframe",
        want: {
          kind: "widget",
          widgetId: "upload:retina-pupillary-light-reflex",
        },
        prepare: UPLOAD_PREPARE("upload:retina-pupillary-light-reflex"),
      },
      {
        name: "timeline",
        want: { kind: "chrome" },
        prepare: TIMELINE_PREPARE(),
      },
    ],
  },
};

function UPLOAD_PREPARE(widgetId) {
  return `
    const a = { kind: "widget", widgetId: ${JSON.stringify(widgetId)}, selector: "iframe" };
    window.__obLocate.place(a);
    let frame = null;
    for (let i = 0; i < 40 && !frame; i++) {
      await wait(250);
      const host = document.querySelector('[data-widget-breakout=${JSON.stringify(widgetId)}]');
      const slot = host && host.querySelector("[data-fb-slot]");
      const stage = slot && document.querySelector('[data-fb-stage="' + slot.getAttribute("data-fb-slot") + '"]');
      frame = (stage || host)?.querySelector('[data-widget-stage] iframe') || null;
    }
    if (!frame) return null;
    window.__obLocate.place(a);
    await wait(1200);
    const r = frame.getBoundingClientRect();
    return { x: r.left + r.width * 0.62, y: Math.max(r.top, 0) + Math.min(r.height, innerHeight - Math.max(r.top, 0)) * 0.4 };`;
}

function TIMELINE_PREPARE() {
  return `
    window.__obLocate.scrollTop(document.querySelector("main#text").getBoundingClientRect().top + scrollY + 1500);
    await wait(1000);
    const dock = document.querySelector(".ctl");
    if (!dock) return null;
    const r = dock.getBoundingClientRect();
    return { x: r.left + r.width * 0.35, y: r.bottom - Math.min(8, r.height / 2) };`;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function matches(anchor, want) {
  return Object.entries(want).every(([k, v]) =>
    k === "figureKey"
      ? String(anchor[k] || "").toLowerCase() === v.toLowerCase()
      : anchor[k] === v
  );
}

async function capture(engineName, browser, width, chapter, motion) {
  const spec = CHAPTER_TARGETS[chapter];
  const phone = width < 768;
  const height = phone ? 844 : 900;
  const context = await browser.newContext({
    ...(phone
      ? { userAgent: devices["iPhone 13"].userAgent, deviceScaleFactor: 2 }
      : {}),
    viewport: { width, height },
    isMobile: phone && engineName === "chromium",
    hasTouch: phone,
    reducedMotion: motion,
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem(
        "ob.review.identity",
        JSON.stringify({ name: "Pointing check", role: "reviewer" })
      );
      localStorage.removeItem("ob.review.queue");
    } catch {
      // a sandboxed widget frame has no storage
    }
  });
  const posted = [];
  await context.route(
    "**/rest/v1/rpc/submit_review_feedback",
    async (route) => {
      posted.push(JSON.parse(route.request().postData() || "{}").p);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: RPC_ID, status: "new" }),
      });
    }
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}${spec.path}`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.waitForTimeout(3000);
  await page.addScriptTag({ content: await pageScript() });

  const results = [];
  for (const target of spec.targets) {
    const tag = `${chapter}-${target.name}-${engineName}-${width}-${motion === "reduce" ? "still" : "motion"}`;
    const row = {
      chapter,
      target: target.name,
      engine: engineName,
      width,
      motion,
    };
    try {
      const measure = () =>
        page.evaluate(
          `(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${target.prepare} })()`
        );
      let point = await measure();
      if (!point) {
        row.skipped = "nothing to point at at this width";
        results.push(row);
        continue;
      }
      await page.click('[data-testid="review-fab"]');
      await page.click('[data-testid="review-point"]');
      await page.waitForSelector('[data-testid="review-pointer"]');
      // Measured again under the layer: late layout may have moved it.
      point = (await measure()) || point;
      if (phone) {
        await page.touchscreen.tap(point.x, point.y);
        await page.waitForSelector('[data-testid="review-pointer-confirm"]', {
          timeout: 4000,
        });
        await page.screenshot({ path: path.join(OUT, `point-${tag}.png`) });
        await page.click('[data-testid="review-pointer-use"]');
      } else {
        await page.mouse.move(point.x - 20, point.y - 20);
        await page.mouse.move(point.x, point.y, { steps: 4 });
        await wait(250);
        await page.screenshot({ path: path.join(OUT, `point-${tag}.png`) });
        await page.mouse.click(point.x, point.y);
      }
      row.label = (
        await page.textContent('[data-testid="review-place-label"]')
      )?.trim();
      await page.fill(
        '[data-testid="review-note"]',
        `Pointing check: ${target.name}`
      );
      const before = posted.length;
      await page.click('[data-testid="review-send"]');
      for (let i = 0; i < 40 && posted.length === before; i++) await wait(100);
      const sent = posted[posted.length - 1];
      row.anchor = sent?.anchor;
      row.picked = row.anchor && matches(row.anchor, target.want);
      await page.keyboard.press("Escape");
      if (!row.anchor) throw new Error("no note was sent");
      const report = await locateAnchor({
        anchor: row.anchor,
        note: { url: sent.url },
        base: BASE,
        engine: engineName,
        out: path.join(OUT, `locate-${tag}.png`),
        browser,
      });
      row.located = {
        found: report.found !== false,
        same: report.same,
        how: report.how,
        live: report.live?.label,
      };
    } catch (err) {
      row.error = String(err?.message || err).split("\n")[0];
      await page.keyboard.press("Escape").catch(() => {});
    }
    results.push(row);
    const ok = row.skipped
      ? "skip"
      : row.picked && row.located?.same
        ? "ok  "
        : "FAIL";
    console.log(
      `${ok} ${tag.padEnd(44)} ${row.skipped || row.error || `${row.label}  →  ${row.located?.same ? "same place" : `differs: ${row.located?.live}`} (${row.located?.how})`}`
    );
  }
  if (errors.length)
    console.log(
      `  page errors (${chapter} ${engineName} ${width}):`,
      errors.slice(0, 3)
    );
  await context.close();
  return results;
}

const all = [];
for (const engineName of ENGINES) {
  const browser = await (engineName === "webkit" ? webkit : chromium).launch();
  for (const width of WIDTHS)
    for (const motion of MOTIONS)
      for (const chapter of CHAPTERS)
        all.push(
          ...(await capture(engineName, browser, width, chapter, motion))
        );
  await browser.close();
}
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(all, null, 2));
const failed = all.filter((r) => !r.skipped && !(r.picked && r.located?.same));
console.log(
  `\n${all.length - failed.length}/${all.length} places pointed at and found again; screenshots in ${OUT}`
);
process.exit(failed.length ? 1 : 0);
