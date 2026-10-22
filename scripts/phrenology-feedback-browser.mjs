/** Read-only G3 acceptance against a running Vite/preview server.
 * BASE_URL=http://127.0.0.1:6103 OUT_DIR=/tmp/openbrain-g3-evidence/after \
 *   node scripts/phrenology-feedback-browser.mjs
 * Uses the bundled phrenology route: never writes to Supabase. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:6103";
const out = process.env.OUT_DIR || "/tmp/openbrain-g3-evidence/after";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = [];
const problems = [
  ["Lateral", 31, 1],
  ...[
    [5, 2],
    [2, 1],
    [4, 2],
    [3, 1],
    [11, 2],
    [10, 1],
  ].map(([n, paths]) => ["Posterior", n, paths]),
];
try {
  for (const [size, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
    ["landscape", 844, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
      hasTouch: size !== "desktop",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Fail closed if a future route accidentally attempts a data write.
    await page.route("**/*", (route) =>
      ["GET", "HEAD"].includes(route.request().method())
        ? route.continue()
        : route.abort()
    );
    await page.goto(`${base}/phrenology`);
    await page.locator(".region").first().waitFor();
    // The app route has its own entrance fade, independent of skull timelines.
    await page.waitForTimeout(1800);
    await page.waitForFunction(
      () => !document.querySelector("select").disabled
    );
    const choose = async (n) => {
      await page.locator("select").selectOption(String(n));
      await page.waitForFunction(
        (value) =>
          !document.querySelector("select").disabled &&
          document
            .querySelector(".card__badge")
            ?.textContent.trim()
            .startsWith(`${value} ·`),
        n
      );
    };
    for (const [view, n, count] of problems) {
      await page.getByRole("button", { name: view, exact: true }).click();
      await choose(n);
      assert.equal(await page.locator(".region--on > path").count(), count);
      const geometry = await page
        .locator(".region--on")
        .evaluateAll((regions) =>
          regions.map((r) => {
            const circle = r.querySelector("circle");
            const pt = new DOMPoint(
              +circle.getAttribute("cx"),
              +circle.getAttribute("cy")
            );
            const paths = [...r.querySelectorAll(":scope > path")];
            return {
              labelInside: paths.some((p) => p.isPointInFill(pt)),
              d: paths.map((p) => p.getAttribute("d")),
            };
          })
        );
      assert.ok(
        geometry.every((g) => g.labelInside),
        `${view} ${n} labels must remain inside actual source regions`
      );
      // Exercise the actual painted region at its numbered anchor, not an arbitrary bounding box.
      const point = await page
        .locator(".region--on circle")
        .first()
        .evaluate((circle) => {
          const p = new DOMPoint(
            +circle.getAttribute("cx"),
            +circle.getAttribute("cy")
          ).matrixTransform(circle.getScreenCTM());
          return { x: p.x, y: p.y };
        });
      await page.mouse.click(point.x, point.y);
      if (size !== "desktop") await page.touchscreen.tap(point.x, point.y);
      assert.ok(
        (await page.locator(".card__badge").innerText()).startsWith(`${n} ·`)
      );
      await page.mouse.move(0, 0);
      const skull = await page.locator(".skull").boundingBox();
      const card = await page.locator(".card").boundingBox();
      assert.ok(
        skull.width > 150 && skull.height > 150,
        `${size} skull must remain usable`
      );
      assert.ok(
        card.x >= skull.x + skull.width || card.y >= skull.y + skull.height,
        `${size} card must not cover selected artwork`
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true
      );
      await page.screenshot({
        path: path.join(out, `${size}-${view.toLowerCase()}-${n}.png`),
        fullPage: true,
      });
      evidence.push({
        size,
        view,
        n,
        paths: count,
        labelsInside: true,
        skull,
        card,
      });
    }
    // Long cards remain scrollable, and scrolling can chain back to the page.
    await choose(12);
    const detail = page.locator(".card");
    await detail.hover();
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(200);
    assert.ok(
      await detail.evaluate(
        (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      )
    );
    if (
      await page.evaluate(
        () => document.documentElement.scrollHeight > innerHeight + 2
      )
    ) {
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(200);
      assert.ok(
        await page.evaluate(() => window.scrollY > 0),
        "Card must not trap page scrolling"
      );
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    // Deterministic switching, valid-view retention, and unmapped Weight.
    await page.getByRole("button", { name: "Anterior", exact: true }).click();
    await choose(12);
    assert.equal(
      (await page.locator(".tab--on").innerText()).toLowerCase(),
      "lateral"
    );
    assert.equal(await page.locator(".card__text").count(), 2);
    assert.ok(
      (
        await page.locator('[data-source-blocks="583 584"]').innerText()
      ).includes("One day in a public place")
    );
    await page.getByRole("button", { name: "Posterior", exact: true }).click();
    await choose(12);
    assert.equal(
      (await page.locator(".tab--on").innerText()).toLowerCase(),
      "posterior"
    );
    await choose(21);
    assert.equal(
      (await page.locator(".tab--on").innerText()).toLowerCase(),
      "anterior"
    );
    await choose(24);
    assert.equal(await page.locator(".card__text").count(), 3);
    assert.ok(
      (
        await page.locator('[data-source-blocks="788 789 790"]').innerText()
      ).endsWith("the faculty of space in general.")
    );
    for (const n of [6, 11]) {
      await choose(n);
      assert.equal(await page.locator(".card__editorial").count(), 0);
    }
    await choose(22);
    assert.equal(await page.locator(".region--on").count(), 0);
    assert.equal(
      await page.locator(".card__editorial").innerText(),
      "Region not labelled by Spurzheim in an image plate nor on the manuscript's frontispiece. No skull position is assigned here."
    );
    await page.locator("select").focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".card").count(), 0);
    const region = page.locator(".region").first();
    await region.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".card").count(), 1);
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator(".region")
        .first()
        .evaluate((r) => r === document.activeElement),
      true
    );
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page
        .locator(".region")
        .nth(1)
        .evaluate((r) => r === document.activeElement),
      true
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  // Actual GSAP completion, controls locked during transition, explicit app preference.
  for (const reduce of [false, true]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "no-preference",
    });
    if (reduce)
      await page.addInitScript(() =>
        localStorage.setItem("ob.reduceMotion", "on")
      );
    await page.goto(`${base}/phrenology`);
    await page.locator(".region").first().waitFor();
    // The app route has its own entrance fade, independent of skull timelines.
    await page.waitForTimeout(1800);
    await page.locator("select").selectOption("12");
    if (!reduce) assert.equal(await page.locator("select").isDisabled(), true);
    await page.waitForFunction(
      () =>
        !document.querySelector("select").disabled &&
        document.querySelector(".card__badge")?.textContent.includes("12 ·")
    );
    assert.equal(
      (await page.locator(".tab--on").innerText()).toLowerCase(),
      "lateral"
    );
    if (reduce) {
      assert.equal(
        await page.locator("html").getAttribute("data-reduce-motion"),
        "1"
      );
      assert.ok(
        await page
          .locator(".region path")
          .first()
          .evaluate(
            (p) => parseFloat(getComputedStyle(p).transitionDuration) <= 0.001
          ),
        "Explicit reduced motion uses the global near-zero duration contract"
      );
    }
    await page.close();
  }
  await writeFile(
    path.join(out, "evidence.json"),
    JSON.stringify(evidence, null, 2)
  );
  console.log(
    `PASS: ${evidence.length} selected-artwork cases, source labels, pointer/keyboard, switching, content, three viewports, normal/OS/app reduced motion. Evidence: ${out}`
  );
} finally {
  await browser.close();
}
