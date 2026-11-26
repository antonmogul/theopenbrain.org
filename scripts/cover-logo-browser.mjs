// OPENBRAIN-95: real reader covers, reversible scroll handoff and keyboard
// ownership. Live chapter requests are read-only; drafts use Storybook doubles.
// node scripts/cover-logo-browser.mjs --base http://localhost:5295 --stories http://localhost:4295 --out /absolute/evidence
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "@playwright/test";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const base = flag("base", "http://localhost:5295");
const stories = flag("stories", "http://localhost:4295");
const out = flag("out", "cover-logo-artifacts");
const engine = flag("engine", "chromium");
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
await mkdir(out, { recursive: true });
const browser = await { chromium, webkit }[engine].launch();
const report = [];
const story = (id) =>
  `${stories}/iframe.html?id=${id}&viewMode=story&globals=reduceMotion:!false`;
const cases = [
  ["history", `${base}/chapter/1/foundations-of-neuroscience`],
  ["retina", `${base}/chapter/2/the-retina`],
  ["attention", story("chapter-cover-logo--attention-creator")],
  ["stress", story("chapter-cover-logo--stress-creator")],
];
const sizes =
  engine === "webkit"
    ? [[375, 704]]
    : [
        [1331, 992],
        [1440, 900],
        [375, 704],
        [390, 844],
      ];
const near = (actual, wanted, label) =>
  assert.ok(
    Math.abs(actual - wanted) < 0.08,
    `${label}: ${actual} ≠ ${wanted}`
  );

async function state(page) {
  return page.evaluate(() => {
    const cover = document.querySelector(".cover-logo");
    const link = document.querySelector(".cover-logo-link");
    const mark = document.querySelector(".menu-logo");
    const bar = document.querySelector(".reader-top-bar");
    const css = getComputedStyle(link);
    return {
      scrollY,
      cover: cover.getBoundingClientRect().toJSON(),
      mark: mark.getBoundingClientRect().toJSON(),
      visible: css.display !== "none",
      barOpacity: Number(getComputedStyle(bar).opacity),
      wordmark: Number(
        getComputedStyle(cover.querySelector("svg > g")).opacity
      ),
      endpoint: {
        x: parseFloat(css.left),
        y: parseFloat(css.top),
        height: parseFloat(getComputedStyle(cover).height),
      },
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}
async function scroll(page, y) {
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    y
  );
  await page.waitForTimeout(120);
}

try {
  for (const [name, url] of cases) {
    for (const [width, height] of sizes) {
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 640,
        hasTouch: width < 640,
        reducedMotion: "no-preference",
      });
      await context.addInitScript(() =>
        localStorage.setItem("ob.motionNotice", "1")
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.route("**/*", async (route) => {
        const request = route.request();
        if (
          /\.supabase\.co\//.test(request.url()) &&
          !["GET", "HEAD", "OPTIONS"].includes(request.method())
        ) {
          errors.push(`Blocked unexpected write: ${request.method()}`);
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.locator(".cover-logo-link").waitFor();
      await page.waitForTimeout(1200);
      const frames = [];
      for (let y = 0; y <= 200; y += 20) {
        await scroll(page, y);
        const current = await state(page);
        near(current.scrollY, y, "scroll position");
        assert.equal(current.visible, y < 56, "one cover logo before handoff");
        assert.equal(
          current.barOpacity,
          y < 56 ? 0 : 1,
          "one bar mark after handoff"
        );
        assert.equal(current.overflow, false, "no horizontal overflow");
        const file = `${engine}-${name}-${width}x${height}-${String(y).padStart(3, "0")}.png`;
        await page.screenshot({ path: `${out}/${file}`, timeout: 20000 });
        frames.push({ ...current, file });
      }
      near(frames[0].cover.x, width < 640 ? 20 : 50, "2023 left placement");
      near(frames[0].cover.y, 15, "2023 top placement");
      near(
        frames[0].cover.height,
        width < 640 ? 60 : 90,
        "2023 height / phone height"
      );
      assert.ok(
        frames[1].cover.height < frames[0].cover.height &&
          frames[2].cover.height < frames[1].cover.height
      );
      assert.ok(
        frames[1].wordmark < 1 && frames[2].wordmark < frames[1].wordmark
      );
      for (const y of [55, 56, 55, 0]) {
        await scroll(page, y);
        const current = await state(page);
        assert.equal(current.visible, y < 56, "reverse scroll ownership");
        if (y === 56) {
          near(current.endpoint.x, current.mark.x, "handoff x");
          near(current.endpoint.y, current.mark.y, "handoff y");
          near(current.endpoint.height, current.mark.height, "handoff height");
          assert.equal(current.wordmark, 0);
        }
      }
      const link = page.locator(".cover-logo-link");
      assert.equal(
        await link.getAttribute("href"),
        name === "attention" || name === "stress" ? "/chapters" : "/"
      );
      await link.focus();
      await scroll(page, 56);
      assert.equal(
        await page
          .locator(".reader-menu-btn")
          .evaluate((el) => el === document.activeElement),
        true
      );
      await page.locator(".reader-menu-btn").evaluate((el) => el.blur());
      await scroll(page, 0);
      await link.focus();
      // Mobile WebKit skips opacity-hidden chrome in sequential navigation;
      // focusing the bar explicitly checks its focus-reveal path there.
      if (engine === "webkit") await page.locator(".reader-menu-btn").focus();
      else await page.keyboard.press("Tab");
      assert.equal(
        (await state(page)).visible,
        false,
        "no second logo while keyboard reveals the bar"
      );
      await page.evaluate(() => document.activeElement.blur());
      await page.emulateMedia({ reducedMotion: "reduce" });
      if (url.startsWith(stories)) {
        // The Storybook Motion toolbar is an explicit reader override, so it
        // correctly wins over emulateMedia. Exercise its off setting as well.
        await page.goto(
          url.replace("reduceMotion:!false", "reduceMotion:!true"),
          {
            waitUntil: "networkidle",
          }
        );
        await page.locator(".cover-logo-link").waitFor();
      }
      await scroll(page, 0);
      const resting = await state(page);
      await scroll(page, 40);
      const reduced = await state(page);
      near(reduced.cover.height, resting.cover.height, "reduced motion height");
      near(reduced.cover.x, resting.cover.x, "reduced motion x");
      assert.equal(reduced.wordmark, 1);
      await page.screenshot({
        path: `${out}/${engine}-${name}-${width}-reduced.png`,
        timeout: 20000,
      });
      await scroll(page, 56);
      assert.equal((await state(page)).visible, false);
      assert.deepEqual(errors, []);
      report.push({
        name,
        width,
        height,
        engine,
        frames,
        keyboard: "passed",
        reverseScroll: "passed",
        reducedMotion: "passed",
        errors,
      });
      console.log(`PASS ${engine} ${name} ${width}x${height}`);
      await context.close();
    }
  }
  const page = await browser.newPage();
  await page.goto(story("chapter-cover-logo--attention-student-denied"), {
    waitUntil: "networkidle",
  });
  assert.equal(await page.locator(".cover-logo-link").count(), 0);
  assert.match(
    await page.locator("body").innerText(),
    /not published|not available|not found|draft/i
  );
  await page.close();
} finally {
  await writeFile(
    `${out}/${engine}-measurements.json`,
    JSON.stringify(report, null, 2)
  );
  await browser.close();
}
