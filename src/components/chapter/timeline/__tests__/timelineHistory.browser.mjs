/* Read-only integration check against a running reader, including its real
 * router/history and scroll locks. Run with:
 * node src/components/chapter/timeline/__tests__/timelineHistory.browser.mjs
 *   --base http://127.0.0.1:4249 --out /tmp/openbrain-49
 * No auth session is installed and database writes are blocked before sending.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit, devices } from "playwright";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const base = flag("base", "http://127.0.0.1:4249");
const out = flag("out", "/tmp/openbrain-49");
const engines = flag("engines", "chromium,webkit").split(",");
// WebKit can leave document.fonts.ready pending after all local reader
// faces loaded. Wait for the actual reader fonts below, then capture without
// Playwright's additional unbounded document.fonts.ready wait.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const results = [];
await mkdir(out, { recursive: true });

async function noOverflow(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1
    ),
    false,
    "reader must not scroll horizontally"
  );
}

// Check rendered SVG geometry and CSS: a unit DOM cannot catch a missing
// played-dot selector, a filled frame, or marks squeezed by a narrow strip.
async function checkMarks(page, selector, expanded = false) {
  const marks = await page.locator(selector).evaluate((el) => {
    const base = el.querySelector(".tl-layer:not(.is-played)");
    const played = el.querySelector(".is-played");
    const frame = (type) => {
      const node = base.querySelector(`[data-type="${type}"]`);
      if (!node) return null;
      const css = getComputedStyle(node);
      return { fill: css.fill, stroke: css.stroke, dash: css.strokeDasharray };
    };
    return {
      dashH: base.querySelector(".tl-text").getBBox().height,
      dotH: base.querySelector(".tl-block").getBBox().height,
      textFill: getComputedStyle(played.querySelector(".tl-text")).fill,
      dotFill: getComputedStyle(played.querySelector(".tl-block")).fill,
      unreadFill: getComputedStyle(base.querySelector(".tl-block")).fill,
      figure: frame("figure"),
      widget: frame("widget"),
      rings: el.querySelectorAll(".tl-origin").length,
    };
  });
  assert.ok(marks.dotH > marks.dashH, "object dots are larger than dashes");
  assert.equal(marks.dotFill, marks.textFill, "read dots match read dashes");
  assert.notEqual(marks.dotFill, marks.unreadFill, "read dots change colour");
  assert.equal(marks.rings, 0, "no departure ring on any surface");
  if (expanded) {
    for (const type of ["figure", "widget"]) {
      assert.ok(marks[type], `${type} frame present`);
      assert.equal(marks[type].fill, "none", `${type} frame is hollow`);
      assert.notEqual(marks[type].stroke, "none", `${type} outline visible`);
    }
    assert.equal(marks.figure.dash, "none", "figure outline is solid");
    assert.notEqual(marks.widget.dash, "none", "widget outline is dashed");
  }
  return marks;
}

// Review chrome stays enabled: geometry and hit tests prove that Feedback
// neither covers the dock/map button nor intercepts a phone scrubber gesture.
async function checkHitArea(locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const points = [0.15, 0.5, 0.85].map((f) => ({
      x: r.left + r.width * f,
      y: r.top + r.height / 2,
    }));
    return points.every(({ x, y }) =>
      el.contains(document.elementFromPoint(x, y))
    );
  });
}

async function checkReviewClearance(
  page,
  { peek = false, modal = false } = {}
) {
  const fab = page.getByTestId("review-fab");
  assert.equal(await fab.count(), 1, "review widget is enabled");
  if (modal) {
    assert.equal(
      await fab.isVisible(),
      false,
      "timeline dialog hides the launcher"
    );
    return { hiddenForTimelineDialog: true };
  }
  await fab.waitFor({ state: "visible" });
  const button = await fab.boundingBox();
  const dock = await page.locator(".ctl").boundingBox();
  const gap = dock.y - (button.y + button.height);
  assert.ok(
    gap >= 15,
    `Feedback clears the ${peek ? "peek" : "resting"} dock by ${gap}px`
  );
  assert.ok(button.y >= 0, "Feedback remains in the viewport");
  assert.ok(await checkHitArea(fab), "Feedback itself remains clickable");
  assert.ok(
    await checkHitArea(page.locator(".ctl")),
    "dock tap target stays clear across its width"
  );
  if (peek)
    assert.ok(
      await checkHitArea(
        page.getByRole("button", { name: "Open chapter map" })
      ),
      "map button is not covered"
    );
  return { gap, button };
}

async function sourceAt(page) {
  await page.mouse.move(100, 100);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 2147, behavior: "instant" });
  });
  await page.waitForTimeout(700);
  return page.evaluate(() => window.scrollY);
}

async function backTo(page, source, position, screenshot) {
  await page.waitForTimeout(1700);
  assert.equal(
    await page.evaluate(() => history.state.position),
    position + 1,
    "one entry per jump"
  );
  assert.equal(
    await page.locator(".ctl .tl-origin").count(),
    0,
    "jumps have no departure ring"
  );
  if (screenshot)
    await page
      .locator(".ctl")
      .screenshot({ path: `${out}/${screenshot}-after-jump.png` });
  const destination = await page.evaluate(() => scrollY);
  assert.ok(Math.abs(destination - source) > 30, "jump must move the reader");
  // Same-document Back can wait for a load event that WebKit never sends to
  // page.goBack(); observe the actual scroll restoration instead.
  await page.evaluate(() => history.back());
  await page.waitForFunction((y) => Math.abs(scrollY - y) <= 2, source, {
    timeout: 10000,
  });
  await page.waitForTimeout(300);
  assert.equal(
    await page.locator(".ctl .tl-origin").count(),
    0,
    "Back keeps the ring absent"
  );
  return { source, destination, restored: await page.evaluate(() => scrollY) };
}

for (const engine of engines) {
  const browser = await { chromium, webkit }[engine].launch();
  try {
    for (const [width, height] of [
      [1440, 900],
      [1024, 768],
      [390, 844],
    ]) {
      for (const reduced of [false, true]) {
        const label = `${engine}-${width}${reduced ? "-reduced" : ""}`;
        const context = await browser.newContext({
          ...(width === 390 ? devices["iPhone 13"] : {}),
          viewport: { width, height },
          reducedMotion: reduced ? "reduce" : "no-preference",
        });
        const page = await context.newPage();
        const errors = [];
        await page.route("**/*", async (route) => {
          const request = route.request();
          if (
            new URL(request.url()).hostname.endsWith(".supabase.co") &&
            !["GET", "HEAD", "OPTIONS"].includes(request.method())
          ) {
            errors.push(`Blocked write: ${request.method()}`);
            return route.abort();
          }
          return route.continue();
        });
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        const jumps = [];
        try {
          await page.goto(
            `${base}/chapter/1/foundations-of-neuroscience${reduced ? "?resume=1" : ""}`,
            { waitUntil: "domcontentloaded" }
          );
          await page
            .locator(".ctl .tl-text")
            .first()
            .waitFor({ timeout: 60000 });
          await page.waitForTimeout(6500);
          await page.evaluate(async () => {
            const style = getComputedStyle(document.documentElement);
            for (const token of ["--font-ui", "--font-mono", "--font-body"]) {
              const family = style.getPropertyValue(token).trim();
              if (family) await document.fonts.load(`16px ${family}`);
            }
          });
          let source = await sourceAt(page);
          const marks = { rest: await checkMarks(page, ".ctl .tl-bars") };
          const review = { rest: await checkReviewClearance(page) };
          // The relocated launcher still opens the real review panel; no
          // note is created or sent during this read-only integration test.
          await page.getByTestId("review-fab").click();
          await page.getByTestId("review-panel").waitFor();
          await page
            .getByTestId("review-panel")
            .getByRole("button", { name: "Close", exact: true })
            .click();
          await page.mouse.move(100, 100);
          await page.waitForTimeout(250);
          await noOverflow(page);
          await page.screenshot({ path: `${out}/${label}-rest.png` });
          if (width >= 768) {
            await page.locator(".ctl").hover();
            await page.waitForTimeout(300);
            marks.peek = await checkMarks(page, ".ctl .tl-bars", true);
            review.peek = await checkReviewClearance(page, { peek: true });
            await page.screenshot({ path: `${out}/${label}-peek.png` });
            let position = await page.evaluate(() => history.state.position);
            await page
              .locator(".ctl-bars")
              .click({ position: { x: width * 0.54, y: 45 } });
            await page.mouse.move(100, 100);
            jumps.push({
              kind: "strip",
              ...(await backTo(page, source, position, label)),
            });
            await page.locator(".ctl").hover();
            await page
              .getByRole("button", { name: "Open chapter map" })
              .click();
            await page.locator(".ctl-map").waitFor();
            await page.waitForTimeout(300);
            marks.map = await checkMarks(page, ".map-bars .tl-bars", true);
            review.map = await checkReviewClearance(page, { modal: true });
            const glyphs = await page.locator(".map-legend").evaluate((el) =>
              ["figure", "widget"].map((type) => {
                const css = getComputedStyle(
                  el.querySelector(`[data-type="${type}"]`)
                );
                return {
                  type,
                  background: css.backgroundColor,
                  border: css.borderTopStyle,
                };
              })
            );
            assert.deepEqual(
              glyphs.map((g) => g.border),
              ["solid", "dashed"]
            );
            assert.ok(glyphs.every((g) => g.background === "rgba(0, 0, 0, 0)"));
            await page.screenshot({ path: `${out}/${label}-map.png` });
            await noOverflow(page);
            source = await page.evaluate(() => scrollY);
            position = await page.evaluate(() => history.state.position);
            await page.locator(".map-section-head").nth(3).click();
            jumps.push({
              kind: "map heading",
              ...(await backTo(page, source, position)),
            });
            await page.locator(".ctl").hover();
            await page
              .getByRole("button", { name: "Open chapter map" })
              .click();
            source = await page.evaluate(() => scrollY);
            position = await page.evaluate(() => history.state.position);
            await page
              .locator(".map-bars .tl-bars")
              .click({ position: { x: width * 0.45, y: 65 } });
            jumps.push({
              kind: "map marks",
              ...(await backTo(page, source, position)),
            });
          } else {
            await page.locator(".ctl").tap();
            await page.locator(".tls-strip").waitFor();
            await page.waitForTimeout(300);
            marks.scrubber = await checkMarks(page, ".tls-bars", true);
            review.scrubber = await checkReviewClearance(page, { modal: true });
            assert.ok(
              await checkHitArea(page.locator(".tls-strip")),
              "phone scrubber hit area is clear"
            );
            assert.ok(
              await checkHitArea(page.locator(".tls-close")),
              "phone scrubber close button is clear"
            );
            await page.screenshot({ path: `${out}/${label}-scrubber.png` });
            await noOverflow(page);
            const position = await page.evaluate(() => history.state.position);
            // The browser's hit test above chooses the real target; the
            // pointer events exercise drag/hold while unit tests cover capture.
            const strip = page.locator(".tls-strip");
            await strip.dispatchEvent("pointerdown", {
              pointerType: "touch",
              pointerId: 1,
              clientX: 290,
              button: 0,
            });
            await strip.dispatchEvent("pointermove", {
              pointerType: "touch",
              pointerId: 1,
              clientX: 70,
            });
            await page.waitForTimeout(400);
            await page.screenshot({
              path: `${out}/${label}-scrubber-preview.png`,
            });
            await strip.dispatchEvent("pointerup", {
              pointerType: "touch",
              pointerId: 1,
              clientX: 70,
            });
            jumps.push({
              kind: "scrubber drag",
              ...(await backTo(page, source, position)),
            });
            // Keyboard commits are an independent path into the same jump.
            await page.locator(".ctl").tap();
            await page.locator(".tls-here").waitFor();
            await page.locator(".tls-strip").press("End");
            const keyboardPosition = await page.evaluate(
              () => history.state.position
            );
            await page.locator(".tls-strip").press("Enter");
            jumps.push({
              kind: "scrubber keyboard",
              ...(await backTo(page, source, keyboardPosition)),
            });
          }
          review.afterBack = await checkReviewClearance(page);
          await noOverflow(page);
          // This exact WebKit engine warning reproduces on unchanged live
          // production. Keep it visible in the evidence; fail all other errors.
          const baselineWarnings =
            engine === "webkit"
              ? errors.filter(
                  (e) =>
                    e ===
                    "ResizeObserver loop completed with undelivered notifications."
                )
              : [];
          const unexpected = errors.filter(
            (e) => !baselineWarnings.includes(e)
          );
          assert.deepEqual(unexpected, [], "no unexpected console/page errors");
          results.push({
            label,
            passed: true,
            marks,
            review,
            jumps,
            errors,
            baselineWarnings,
          });
          console.log(
            `PASS ${label}: ${jumps.length} jumps and exact Back restoration`
          );
        } catch (error) {
          await page
            .screenshot({ path: `${out}/${label}-failure.png` })
            .catch(() => {});
          results.push({
            label,
            passed: false,
            jumps,
            errors,
            failure: error.message,
          });
          console.error(`FAIL ${label}: ${error.message}`);
        } finally {
          await context.close();
          await writeFile(
            `${out}/browser-results.json`,
            JSON.stringify(results, null, 2)
          );
        }
      }
    }
  } finally {
    await browser.close();
  }
}
assert.ok(
  results.every((r) => r.passed),
  `See ${out}/browser-results.json`
);
