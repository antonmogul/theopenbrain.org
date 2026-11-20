/** OPENBRAIN-56. Run against a local reader with its normal read-only chapter
 * data: node scripts/video-fullscreen-browser.mjs [--live-youtube]
 * BASE_URL=http://127.0.0.1:5256 OUT_DIR=/tmp/openbrain-56/after
 * Default: deterministic cross-origin YouTube double, real Fullscreen API.
 * --live-youtube: actual YouTube playback; records unavailable controls/codecs
 * separately (Playwright WebKit is not the native Safari application).
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const base = process.env.BASE_URL || "http://127.0.0.1:5256";
assert.match(new URL(base).origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const live = process.argv.includes("--live-youtube");
const output = process.env.OUT_DIR || "/tmp/openbrain-56/after";
await mkdir(output, { recursive: true });
const results = {
  mode: live ? "live YouTube" : "cross-origin player double",
  cases: [],
};
const targets = [
  ["Fig21", 0],
  ["MilnerHM", 1],
  ["Fig19", 2],
];
const playerDouble = `<!doctype html><html><body style="margin:0;background:#111;color:white;font:24px sans-serif"><p>Open Brain fullscreen player test double</p><button onclick="document.documentElement.requestFullscreen()">Enter full screen</button><script>window.playerIdentity=crypto.randomUUID();</script></body></html>`;

async function remember(frame) {
  return frame.evaluate(() => {
    window.playerIdentity ||= crypto.randomUUID();
    return {
      identity: window.playerIdentity,
      time: document.querySelector("video")?.currentTime ?? null,
    };
  });
}
async function samePlayer(frame, before) {
  const after = await remember(frame);
  assert.equal(
    after.identity,
    before.identity,
    "Iframe document must not reload"
  );
  if (before.time !== null && after.time !== null)
    assert(after.time >= before.time - 0.5, "Playback must not restart");
}
async function shot(page, prefix, name) {
  await page.screenshot({
    path: path.join(output, `${prefix}-${name}.png`),
    timeout: 10000,
  });
}
async function nativeRoundTrip(page, iframe, prefix, result) {
  const element = await iframe.elementHandle();
  const frame = await element.contentFrame();
  if (live) {
    const play = frame.getByRole("button", { name: "Play video", exact: true });
    if (await play.isVisible()) await play.click();
  }
  const before = await remember(frame);
  const y = await page.evaluate(() => scrollY);
  await iframe.hover();
  const button = frame.getByRole("button", {
    name: /^(Enter full screen|Full screen.*)$/i,
  });
  if (live)
    await button
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {});
  if (!(await button.count())) {
    assert(live, "The deterministic player always has its fullscreen button");
    result.nativePlayer =
      "YouTube did not expose a fullscreen control in this engine";
    return;
  }
  await button.first().click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.waitForTimeout(350);
  assert(await element.evaluate((el) => el.isConnected));
  await samePlayer(frame, before);
  await shot(page, prefix, "youtube-fullscreen");
  await page.evaluate(() => document.exitFullscreen());
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page.waitForTimeout(500);
  await samePlayer(frame, before);
  assert(
    Math.abs((await page.evaluate(() => scrollY)) - y) <= 2,
    "Native fullscreen must preserve the reading position"
  );
  result.nativePlayer = "passed";
}

for (const [engine, type] of Object.entries({ chromium, webkit })) {
  const browser = await type.launch();
  try {
    for (const viewport of [
      { width: 1470, height: 749 },
      { width: 1440, height: 900 },
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
      if (!live)
        await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
          route.fulfill({ contentType: "text/html", body: playerDouble })
        );
      await page.goto(`${base}/chapter/1/foundations-of-neuroscience`);
      await page.locator("#triggerAnimationFoundationsFig21").waitFor();
      await page.waitForTimeout(1800);
      for (const [key, index] of targets) {
        const prefix = `${engine}-${viewport.width}-${key}`;
        const result = { engine, viewport, key };
        results.cases.push(result);
        await page
          .locator(`#triggerAnimationFoundations${key}`)
          .evaluate((el) =>
            window.scrollTo({
              top: el.getBoundingClientRect().top + scrollY - innerHeight * 0.4,
              behavior: "instant",
            })
          );
        const pane = page.locator(".figure-pane .fig-pane");
        await expect(pane).toHaveCount(1);
        await expect(pane).toBeVisible();
        await page.waitForTimeout(600);
        if (index) await pane.locator(".figimg-thumbnail").nth(index).click();
        await pane.locator(".ve-poster").click();
        const iframe = pane.locator(".ve iframe");
        await iframe.waitFor();
        await page.waitForTimeout(live ? 2500 : 300);
        await nativeRoundTrip(page, iframe, `${prefix}-pane`, result);
        const element = await iframe.elementHandle();
        const frame = await element.contentFrame();
        const before = await remember(frame);
        const y = await page.evaluate(() => scrollY);
        await pane
          .getByRole("button", { name: "Expand to full screen", exact: true })
          .click();
        await expect
          .poll(() =>
            page.evaluate(() =>
              document.fullscreenElement?.classList.contains("ve-frame")
            )
          )
          .toBe(true);
        await samePlayer(frame, before);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.locator(".ve iframe")).toHaveCount(1);
        await shot(page, prefix, "book-fullscreen");
        await page.evaluate(() => document.exitFullscreen());
        await page.waitForTimeout(500);
        await samePlayer(frame, before);
        assert(Math.abs((await page.evaluate(() => scrollY)) - y) <= 2);
        result.bookExpand = "same iframe, playback and scroll retained";
        // Before playback the book still opens its gallery dialog. Select
        // away and back to deliberately end this playback, then open it.
        await pane
          .locator(".figimg-thumbnail")
          .nth(index === 0 ? 1 : 0)
          .click();
        await pane.locator(".figimg-thumbnail").nth(index).click();
        await pane
          .getByRole("button", { name: "Expand to full screen", exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        await dialog.locator(".ve-poster").click();
        await page.waitForTimeout(live ? 2500 : 300);
        const dialogResult = {};
        await nativeRoundTrip(
          page,
          dialog.locator(".ve iframe"),
          `${prefix}-dialog`,
          dialogResult
        );
        await expect(dialog).toBeVisible();
        await shot(page, prefix, "dialog-after-native");
        result.dialogNative = dialogResult.nativePlayer;
        await dialog.getByRole("button", { name: "Close demo" }).click();
        await page.waitForTimeout(400);
        assert(Math.abs((await page.evaluate(() => scrollY)) - y) <= 2);
        console.log(`${prefix}: ${JSON.stringify(result)}`);
        await writeFile(
          path.join(output, "results.json"),
          `${JSON.stringify(results, null, 2)}\n`
        );
      }
      // Rita is a single player inside a History breakout, independent of
      // the pinned-pane galleries above.
      const rita = page.locator(".fig-pane").filter({
        has: page.locator('.ve-poster[aria-label*="Rita Levi-Montalcini"]'),
      });
      await rita.getByRole("button", { name: /Play video:/ }).click();
      const ritaFrame = page.locator(
        '.fig-pane .ve iframe[title*="Rita Levi-Montalcini"]'
      );
      await expect(ritaFrame).toHaveAttribute("src", /start=2/);
      const ritaResult = { engine, viewport, key: "Rita" };
      await page.waitForTimeout(live ? 2500 : 300);
      await nativeRoundTrip(
        page,
        ritaFrame,
        `${engine}-${viewport.width}-rita`,
        ritaResult
      );
      results.cases.push(ritaResult);
      for (const slug of ["neitz-myopia", "dowling-and-werblin"]) {
        await page.goto(`${base}/chapter/break/${slug}`);
        const video = page.locator("video");
        await expect(video).toHaveAttribute("controls", "");
        await expect(video).toHaveAttribute("playsinline", "");
        await expect(video.locator("source")).toHaveAttribute(
          "src",
          new RegExp(`${slug}\\.mp4$`)
        );
        await video.evaluate(async (el) => {
          el.muted = true;
          await el.play();
        });
        await expect
          .poll(() => video.evaluate((el) => el.currentTime))
          .toBeGreaterThan(0.2);
        await video.evaluate((el) => el.requestFullscreen());
        await expect
          .poll(() => page.evaluate(() => !!document.fullscreenElement))
          .toBe(true);
        await page.evaluate(() => document.exitFullscreen());
        await video.evaluate((el) => el.pause());
        results.cases.push({
          engine,
          viewport,
          key: slug,
          nativeVideo: "passed",
        });
      }
      await writeFile(
        path.join(output, "results.json"),
        `${JSON.stringify(results, null, 2)}\n`
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
console.log(`Saved ${results.cases.length} results to ${output}`);
