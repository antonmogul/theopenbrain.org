/** R09/R10 read-only browser acceptance. Start the app on 6104 first.
 * PENFIELD_BASE / PENFIELD_OUT / PENFIELD_ENGINE=firefox may override defaults.
 * Case data is bundled; this never saves, publishes or writes Supabase.
 */
import { chromium, firefox } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = process.env.PENFIELD_BASE || "http://127.0.0.1:6104";
const out = process.env.PENFIELD_OUT || "/tmp/openbrain-g4/browser";
const engine = process.env.PENFIELD_ENGINE || "chromium";
const appendix = JSON.parse(
  await readFile("src/data/history/penfieldAppendix.json", "utf8")
);
const order = ["ge", "sbe", "gp", "yn", "nc", "abra", "rw"];
const browser = await { chromium, firefox }[engine].launch({ headless: true });
await mkdir(out, { recursive: true });
const results = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
  ]) {
    const p = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    await p.goto(`${base}/case-cabinet`);
    await p.locator('[data-id="ge"]').waitFor();
    await p.waitForTimeout(1500); // app route fade must finish before artwork evidence
    await p.locator('[data-id="ge"]').focus();
    await p.keyboard.press("Enter");
    await p.locator('.cabinet[data-phase="open"]').waitFor();
    let points = 0,
      events = 0,
      mapped = 0;
    for (const [index, id] of order.entries()) {
      const c = appendix.cases.find((c) => c.id === id);
      await p.locator(".case-tabs button").nth(index).click();
      await p.locator(".brain-map img").evaluate((e) => e.decode());
      await p.waitForTimeout(100);
      const metrics = await p.locator(".map-scroll").evaluate((e) => {
        const image = e.querySelector("img").getBoundingClientRect(),
          r = e.getBoundingClientRect();
        return {
          w: e.clientWidth,
          h: e.clientHeight,
          sw: e.scrollWidth,
          sh: e.scrollHeight,
          full:
            image.top >= r.top - 1 &&
            image.left >= r.left - 1 &&
            image.bottom <= r.bottom + 1 &&
            image.right <= r.right + 1,
        };
      });
      assert(metrics.full, `${width} ${id} full source scan must fit`);
      assert(
        metrics.sw <= metrics.w + 1 && metrics.sh <= metrics.h + 1,
        `${width} ${id} fit must not scroll`
      );
      await p.screenshot({ path: `${out}/${engine}-${width}-${id}.png` });
      for (const point of c.points) {
        const marker = p.locator(`[data-point="${point.id}"]`);
        if (point.hotspots.length) {
          const placement = await marker.evaluate((e) => ({
            x: parseFloat(e.style.left),
            y: parseFloat(e.style.top),
            text: e.textContent.trim(),
            color: getComputedStyle(e).color,
            border: getComputedStyle(e).borderWidth,
            font: getComputedStyle(e).fontSize,
          }));
          assert.equal(placement.x, point.hotspots[0].x);
          assert.equal(placement.y, point.hotspots[0].y);
          assert.equal(placement.text, point.id);
          assert.equal(placement.border, "0px");
          // Real pointer hit-testing, including closely spaced adjacent labels.
          await marker.click();
          mapped++;
        } else {
          assert.equal(await marker.count(), 0);
          await p.locator(`[data-point-option="${point.id}"]`).click();
        }
        assert.equal(
          await p.locator(".transcript h4").innerText(),
          `Point ${point.id} · ${c.tab}`
        );
        assert.deepEqual(
          await p.locator(".note__text").allTextContents(),
          point.events.map((e) => e.text)
        );
        if (point.mapNote)
          assert(
            (await p.locator(".transcript").innerText()).includes(point.mapNote)
          );
        points++;
        events += point.events.length;
        if (width < 761) {
          assert(await p.locator(".transcript").isVisible());
          await p
            .getByRole("button", { name: "Brain map", exact: true })
            .click();
        }
      }
      await p
        .getByRole("button", { name: "Original scan", exact: true })
        .click();
      assert.equal(await p.locator(".map-label-masks").count(), 0);
      assert.equal(await p.locator(".marker").count(), 0);
      assert.equal(
        await p.locator(".brain-map img").getAttribute("src"),
        c.image.src
      );
      await p
        .getByRole("button", { name: "Original scan", exact: true })
        .click();
      await p.getByRole("button", { name: "Enlarge map", exact: true }).click();
      await p.getByRole("button", { name: "Fit", exact: true }).click();
      assert.equal(await p.locator(".map-zoom span").innerText(), "100%");
      results.push({ engine, width, height, id, fit: metrics });
    }
    assert.deepEqual([points, mapped, events], [47, 45, 82]);
    // Keyboard activation and visible focus; Escape restores the right folder.
    const keyPoint = p.locator('[data-point="24"]');
    await keyPoint.focus();
    await p.keyboard.press("Space");
    assert(
      (await p.locator(".transcript h4").innerText()).startsWith("Point 24")
    );
    if (width < 761)
      await p.getByRole("button", { name: "Brain map", exact: true }).click();
    await p.getByRole("button", { name: "Enlarge map", exact: true }).focus();
    await p.keyboard.press("Escape");
    await p.locator('.cabinet[data-phase="closed"]').waitFor();
    assert.equal(
      await p.evaluate(() => document.activeElement.dataset.id),
      "rw"
    );
    assert(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    );
    await p.close();
  }
  // Explicit preference must skip spatial animation even when the OS allows it.
  const p = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  await p.addInitScript(() => localStorage.setItem("ob.reduceMotion", "1"));
  await p.goto(`${base}/case-cabinet`);
  await p.waitForTimeout(1500);
  await p.evaluate(() => (document.documentElement.dataset.reduceMotion = "1"));
  await p.locator('[data-id="rw"]').focus();
  await p.keyboard.press("Enter");
  await p.locator('.cabinet[data-phase="open"]').waitFor();
  assert.equal(
    await p.locator(".cabinet").getAttribute("data-animation-mode"),
    "immediate"
  );
  await p.close();
  // Real animation remains reversible; switching cases must not replay it.
  const animated = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  await animated.goto(`${base}/case-cabinet`);
  await animated.waitForTimeout(1500);
  await animated.locator('[data-id="rw"]').focus();
  await animated.keyboard.press("Enter");
  await animated.locator('.cabinet[data-phase="opening"]').waitFor();
  await animated.keyboard.press("Escape");
  await animated.locator('.cabinet[data-phase="closed"]').waitFor();
  await animated.locator('[data-id="rw"]').focus();
  await animated.keyboard.press("Enter");
  await animated.locator('.cabinet[data-phase="open"]').waitFor();
  assert.equal(
    await animated.locator(".cabinet").getAttribute("data-animation-mode"),
    "storyboard"
  );
  await animated.locator(".case-tabs button").first().click();
  assert.equal(
    await animated.locator(".cabinet").getAttribute("data-phase"),
    "open"
  );
  assert(
    (await animated.locator(".casefile__title").innerText()).includes("G.E.")
  );
  await animated.keyboard.press("Escape");
  await animated.locator('.cabinet[data-phase="closing"]').waitFor();
  await animated.locator('.cabinet[data-phase="closed"]').waitFor();
  assert.equal(
    await animated.evaluate(() => document.activeElement.dataset.id),
    "ge"
  );
  await animated.close();
  await writeFile(
    `${out}/${engine}-results.json`,
    JSON.stringify(
      {
        results,
        countsPerViewport: { patients: 7, points: 47, mapped: 45, events: 82 },
        keyboard: true,
        mobile: true,
        osAndAppReducedMotion: true,
        reversibleAnimation: true,
      },
      null,
      2
    )
  );
  console.log(
    `${engine}: 21 full-map fit checks; 141 points / 246 events; keyboard, mobile, original scan, zoom, reduced motion and reversible animation passed.`
  );
} finally {
  await browser.close();
}
