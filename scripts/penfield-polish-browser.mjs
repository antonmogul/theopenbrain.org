/** OPENBRAIN-89: real-reader proof with the upload migration simulated by GET routing.
 * node scripts/penfield-polish-browser.mjs before|after [base] [out] [chromium|webkit]
 * Before uses the immutable v6 migration; production v6 was also checked live.
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const [
  mode = "after",
  base = "http://127.0.0.1:4289",
  out = ".penfield-polish",
  engine = "chromium",
] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const source = await readFile(
  mode === "before"
    ? "supabase/migrations/20261119480100_history_penfield_binder_v6.sql"
    : "src/widgets/uploads/history-penfield-binder.html",
  "utf8"
);
const html =
  mode === "before"
    ? source.slice(source.indexOf("$w$") + 3, source.lastIndexOf("$w$"))
    : source;
const browser = await { chromium, webkit }[engine].launch();
const results = [];
try {
  for (const width of engine === "webkit"
    ? [375]
    : [1331, 375, 390, 1024, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: width < 700 ? 704 : 992 },
      isMobile: width < 700,
      hasTouch: width < 700,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/rest/v1/widget_uploads?*", async (route) => {
      const res = await route.fetch();
      const rows = await res.json();
      await route.fulfill({
        response: res,
        json: rows.map((r) =>
          r.slug === "history-penfield-binder" ? { ...r, html } : r
        ),
      });
    });
    await page.goto(`${base}/chapter/1/foundations-of-neuroscience`);
    const stage = page.locator(
      '[data-widget-stage="upload:history-penfield-binder"]'
    );
    await stage.waitFor({ timeout: 30000 });
    await stage.scrollIntoViewIfNeeded();
    const iframe = stage.locator("iframe");
    const frame = iframe.contentFrame();
    await frame.locator("#tabs .tab").first().waitFor({ timeout: 30000 });
    await iframe.scrollIntoViewIfNeeded();
    const shot = async (name) =>
      page.screenshot({
        path: `${out}/${mode}-${engine}-${width}-${name}.png`,
        timeout: 15000,
        caret: "initial",
      });
    await frame.locator("#tabs .tab").nth(4).click();
    await page.waitForTimeout(3500);
    await iframe.evaluate((e) => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo({
        top: scrollY + e.getBoundingClientRect().top - 48,
        behavior: "instant",
      });
    });
    await page.waitForTimeout(1000);
    await shot("45aadb17-b96c2f6d-clip-spacing");
    const metrics = await frame.locator("body").evaluate(() => {
      const rect = (q) => document.querySelector(q).getBoundingClientRect();
      return {
        gap: rect("#binder").top - rect(".head").bottom,
        overflow: document.documentElement.scrollWidth - innerWidth,
        layout: document.querySelector("#binder").dataset.layout,
      };
    });
    assert(metrics.overflow <= 1, `frame overflow ${width}`);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      `reader overflow ${width}`
    );
    if (width === 1331) {
      const paper = frame.locator("#ephs .eph").nth(1);
      const hit = await paper.evaluate((e) => {
        const r = e.getBoundingClientRect();
        for (let y = r.bottom - 10; y > r.top; y -= 8)
          for (let x = r.left + 10; x < r.right; x += 8)
            if (document.elementFromPoint(x, y)?.closest(".eph") === e)
              return { x, y };
        throw new Error("No exposed archive hit target");
      });
      const bounds = await iframe.boundingBox();
      const start = { x: bounds.x + hit.x, y: bounds.y + hit.y };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 100, start.y - 280, { steps: 12 });
      await page.mouse.up();
      const moved = await paper.evaluate((e) =>
        e.style.getPropertyValue("--dy")
      );
      assert(Number(moved) < -100, "archive was actually dragged");
      await shot("94359ad1-dragged");
      await frame.locator("#left").click({ position: { x: 4, y: 4 } });
      const reset = await paper.evaluate((e) => ({
        dx: e.style.getPropertyValue("--dx"),
        dy: e.style.getPropertyValue("--dy"),
        z: e.style.getPropertyValue("--z"),
      }));
      if (mode === "after")
        assert.deepEqual(reset, { dx: "0.0", dy: "0.0", z: "2" });
      else assert.equal(reset.dy, moved);
      await shot("94359ad1-page-click");
      await paper.focus();
      await paper.press("ArrowUp");
      await frame.locator("#left").click({ position: { x: 4, y: 4 } });
      if (mode === "after")
        assert.equal(
          await paper.evaluate((e) => e.style.getPropertyValue("--dy")),
          "0.0"
        );
      await paper.press("Enter");
      assert(await frame.locator("#lb").isVisible());
      await frame.locator("#lbx").click();
      await page.waitForTimeout(500);
      await frame.locator("body").evaluate(() => {
        window.__pulseSeen = false;
        new MutationObserver(() => {
          if (document.querySelector(".pulse")) window.__pulseSeen = true;
        }).observe(document.querySelector("#map"), { childList: true });
      });
      await frame.locator(".pt").nth(1).click();
      await page.waitForTimeout(400);
      await shot("d594819b-stimulation");
      await page.waitForTimeout(1600);
      const pulseSeen = await frame
        .locator("body")
        .evaluate(() => window.__pulseSeen);
      assert.equal(pulseSeen, mode === "before");
      if (mode === "after") {
        assert.equal(await frame.locator(".mk[data-on] b").innerText(), "15");
        assert.equal(
          await frame
            .locator(".mk[data-on] i")
            .evaluate((e) => getComputedStyle(e).opacity),
          "1"
        );
      }
      await shot("d594819b-selected");
      await frame.locator("#shut").evaluate((e) => {
        e.click();
        window.__closing = document
          .getAnimations()
          .filter((a) =>
            ["leaf", "binder"].some((c) =>
              a.effect.target.classList.contains(c)
            )
          );
        window.__closing.forEach((a) => a.pause());
      });
      for (const time of [0, 200, 390, 650, 779]) {
        await frame.locator("body").evaluate(
          (_element, ms) =>
            window.__closing.forEach((a) => {
              a.currentTime = ms;
            }),
          time
        );
        await shot(`cf0bcb16-close-${time}`);
      }
      await frame
        .locator("body")
        .evaluate(() => window.__closing.forEach((a) => a.finish()));
      await page.waitForTimeout(250);
      assert.equal(await frame.locator(".leaf").count(), 0);
      assert.equal(
        await frame.locator("#binder").getAttribute("data-open"),
        "false"
      );
      assert.equal(
        await frame
          .locator("#tabs .tab")
          .nth(4)
          .evaluate((e) => e === document.activeElement),
        true
      );
      await shot("cf0bcb16-closed");
      results.push({ width, ...metrics, reset, pulseSeen, closeFocus: true });
    } else {
      if (width < 700) {
        await frame.locator("#ephs .eph").first().click();
        assert(await frame.locator("#lb").isVisible());
        await shot("archive-viewer");
        await frame.locator("#lbx").click();
        await frame.locator("#shutStack").click();
        assert.equal(
          await frame.locator("#binder").getAttribute("data-open"),
          "false"
        );
        await shot("closed");
      }
      results.push({ width, ...metrics });
    }
    assert.deepEqual(errors, [], `browser errors at ${width}`);
    console.log(`${mode} ${engine} ${width}: passed`);
    await page.close();
  }
  await writeFile(
    `${out}/${mode}-${engine}-results.json`,
    JSON.stringify(results, null, 2)
  );
} finally {
  await browser.close();
}
