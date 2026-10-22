/** G3 native focus + real FullBleed/WidgetBreakout regression.
 * Run production preview and built Storybook on isolated ports, then:
 * BASE_URL=http://127.0.0.1:6123 STORY_URL=http://127.0.0.1:6124 \
 * OUT_DIR=/tmp/openbrain-g3fix-evidence node scripts/phrenology-host-browser.mjs
 * All requests are read-only. No synthetic host dimensions or focus repair. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:6123";
const story = process.env.STORY_URL || "http://127.0.0.1:6124";
const out = process.env.OUT_DIR || "/tmp/openbrain-g3fix-evidence";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const evidence = [];
const settled = (page, n) =>
  page.waitForFunction(
    (n) =>
      !document.querySelector(".phreno select")?.disabled &&
      document.querySelector(".card__badge")?.textContent.includes(`${n} ·`),
    n
  );
const hasFocus = (locator) =>
  locator.evaluate((el) => el === document.activeElement);
try {
  for (const [host, url] of [
    ["standalone", `${base}/phrenology`],
    [
      "responsive-host",
      `${story}/iframe.html?id=views-widgets-phrenologyview--embedded-responsive&viewMode=story`,
    ],
    [
      "embedded",
      `${story}/iframe.html?id=chapter-text-widgetbreakout--full-screen-band&viewMode=story`,
    ],
  ]) {
    for (const [size, width, height] of [
      ["desktop", 1440, 1000],
      ["mobile", 390, 844],
      ["landscape", 844, 390],
    ]) {
      for (const motion of ["normal", "os-reduced", "app-reduced"]) {
        const page = await browser.newPage({
          viewport: { width, height },
          reducedMotion: motion === "os-reduced" ? "reduce" : "no-preference",
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("**/*", (route) =>
          ["GET", "HEAD"].includes(route.request().method())
            ? route.continue()
            : route.abort()
        );
        if (motion === "app-reduced") {
          await page.addInitScript(() =>
            localStorage.setItem("ob.reduceMotion", "on")
          );
        }
        await page.goto(
          host !== "standalone"
            ? `${url}&globals=reduceMotion:!${motion === "app-reduced"}`
            : url
        );
        await page.locator(".phreno .region").first().waitFor();
        // Storybook owns its preference attribute instead of the app bootstrap.
        await page.waitForTimeout(1800);
        const duration = await page
          .locator(".region path")
          .first()
          .evaluate((el) =>
            parseFloat(getComputedStyle(el).transitionDuration)
          );
        assert.ok(
          motion === "normal" ? duration > 0.01 : duration <= 0.001,
          `${host}/${size}/${motion}: effective motion preference`
        );
        const select = page.locator(".phreno select");
        await select.focus();
        await select.selectOption("12");
        await settled(page, 12);
        assert.ok(
          await hasFocus(select),
          `${host}/${size}/${motion}: picker focus`
        );
        // Do not refocus: this is the regression the original suite concealed.
        await page.keyboard.press("Escape");
        assert.equal(await page.locator(".card").count(), 0);
        assert.ok(await hasFocus(select));
        const anterior = page.getByRole("button", {
          name: "Anterior",
          exact: true,
        });
        await anterior.focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(
          () => !document.querySelector(".phreno select").disabled
        );
        assert.ok(
          await hasFocus(anterior),
          `${host}/${size}/${motion}: tab focus`
        );
        // If the reader focuses a stable control outside the widget while disabled,
        // finishing the animation must not steal focus back.
        if (motion === "normal") {
          await select.focus();
          await select.selectOption("12");
          const elsewhere = await page.evaluateHandle(() => {
            const button = document.createElement("button");
            button.textContent = "Regression focus sentinel";
            document.body.append(button);
            button.focus();
            return button;
          });
          await settled(page, 12);
          assert.ok(
            await elsewhere.evaluate(
              (el) => el !== document.body && el === document.activeElement
            )
          );
          await elsewhere.evaluate((el) => el.remove());
          await select.focus();
          await page.keyboard.press("Escape");
        }
        await select.focus();
        await select.selectOption("12");
        await settled(page, 12);
        await page.waitForTimeout(250);
        const card = page.locator(".card");
        await card.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        // Bring the actual final line into the viewport, including any short-host
        // overflow. This cannot bypass clipping by an overflow:hidden ancestor.
        await page.locator(".card__text").last().scrollIntoViewIfNeeded();
        await card.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        const bounds = await card.evaluate((el) => {
          const rect = (node) => {
            const r = node.getBoundingClientRect();
            return {
              top: r.top,
              bottom: r.bottom,
              left: r.left,
              right: r.right,
              width: r.width,
              height: r.height,
            };
          };
          const para = el.querySelector(".card__text:last-of-type");
          const range = document.createRange();
          range.selectNodeContents(para);
          const lines = [...range.getClientRects()];
          const last = lines.at(-1);
          const clips = [];
          for (let node = el; node; node = node.parentElement) {
            if (
              /auto|scroll|hidden|clip/.test(getComputedStyle(node).overflowY)
            )
              clips.push(rect(node));
          }
          return {
            root: rect(el.closest(".phreno")),
            card: rect(el),
            skull: rect(document.querySelector(".skull")),
            footer: rect(document.querySelector(".phreno__foot")),
            finalLine: {
              top: last.top,
              bottom: last.bottom,
              left: last.left,
              right: last.right,
            },
            visibleTop: Math.max(0, ...clips.map((r) => r.top)),
            visibleBottom: Math.min(innerHeight, ...clips.map((r) => r.bottom)),
            atScrollEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
          };
        });
        assert.ok(bounds.atScrollEnd);
        if (host !== "embedded") {
          assert.ok(
            bounds.finalLine.left >= 0 && bounds.finalLine.right <= width,
            `${host}/${size}: complete final line must fit horizontally`
          );
        }
        assert.ok(
          bounds.finalLine.top >= bounds.visibleTop - 1 &&
            bounds.finalLine.bottom <= bounds.visibleBottom + 1,
          `${host}/${size}/${motion}: clipped final line ${JSON.stringify(bounds)}`
        );
        assert.ok(
          bounds.card.left >= bounds.skull.right - 1 ||
            bounds.card.top >= bounds.skull.bottom - 1
        );
        assert.ok(
          bounds.footer.top >= bounds.card.bottom - 1,
          "citation must not overlap the card"
        );
        assert.ok(bounds.skull.width >= 150 && bounds.skull.height >= 150);
        await page.screenshot({
          path: path.join(out, `${host}-${size}-${motion}-final-line.png`),
        });
        // A short landscape host scrolls locally; its complete citation must
        // also be reachable, not merely positioned below the reading card.
        const foot = page.locator(".phreno__foot");
        await foot.scrollIntoViewIfNeeded();
        const footerVisible = await foot.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const root = el.closest(".phreno").getBoundingClientRect();
          return (
            r.top >= Math.max(0, root.top) - 1 &&
            r.bottom <= Math.min(innerHeight, root.bottom) + 1
          );
        });
        assert.ok(
          footerVisible,
          `${host}/${size}/${motion}: complete citation reachable`
        );
        assert.deepEqual(errors, []);
        evidence.push({
          host,
          size,
          motion,
          focusRestored: true,
          footerVisible,
          escapeWithoutRefocus: true,
          ...bounds,
        });
        console.log(`PASS ${host}/${size}/${motion}`);
        await page.close();
      }
    }
  }
  await writeFile(
    path.join(out, "host-regression.json"),
    JSON.stringify(evidence, null, 2)
  );
  console.log(
    `PASS: ${evidence.length} host/viewport/motion cases; native focus, Escape without refocus, final line inside all clipping ancestors, separated artwork and citation.`
  );
} finally {
  await browser.close();
}
