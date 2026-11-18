/* Read-only integration check against a running reader, including its real
 * router/history and scroll locks. Run with:
 * node src/components/chapter/timeline/__tests__/timelineHistory.browser.mjs
 *   --base http://127.0.0.1:4242 --out /tmp/openbrain-42
 * No auth session is installed and database writes are blocked before sending.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit, devices } from "playwright";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const base = flag("base", "http://127.0.0.1:4242");
const out = flag("out", "/tmp/openbrain-42");
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
    1,
    "departure stays ringed after landing"
  );
  if (screenshot)
    await page
      .locator(".ctl")
      .screenshot({ path: `${out}/${screenshot}-departure.png` });
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
    "return clears the ring"
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
          await noOverflow(page);
          await page.screenshot({ path: `${out}/${label}-rest.png` });
          if (width >= 768) {
            await page.locator(".ctl").hover();
            await page.waitForTimeout(300);
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
            await page.screenshot({ path: `${out}/${label}-scrubber.png` });
            await noOverflow(page);
            const position = await page.evaluate(() => history.state.position);
            // Touch-pointer drag and hold, matching the phone gesture. The
            // dedicated unit suite covers the scrubber's pointer capture.
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
