/** OPENBRAIN-55: real chapter/WidgetFrame geometry, fixture data only.
 * Start Vite on 5255, then node scripts/loewi-text-browser.mjs.
 * No live data request is sent; before HTML comes from the immutable v4 SQL.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, webkit } from "@playwright/test";

// The active frame's two Plex weights are asserted loaded below. WebKit's
// element screenshot otherwise waits on fonts in unrelated offscreen chapter
// figures; crop the verified frame without that document-wide wait.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const base = process.env.LOEWI_BASE || "http://127.0.0.1:5255";
assert.match(new URL(base).origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const output = process.env.LOEWI_OUTPUT || "/tmp/ob-55-evidence";
await mkdir(output, { recursive: true });
const fixture = JSON.parse(
  await readFile("src/stories/historyFullReaderData.json", "utf8")
);
const v4 = await readFile(
  "supabase/migrations/20261118090000_history_loewi_v4.sql",
  "utf8"
);
const sources = {
  before: v4.slice(v4.indexOf("$w$") + 3, v4.lastIndexOf("$w$")),
  after: await readFile("src/widgets/uploads/loewi-vagusstoff.html", "utf8"),
};
const fontRoot =
  "public/publicAssets/fonts/IBM-Plex/IBM-Plex-Mono/fonts/split/woff2/";
const fontCss = (
  await Promise.all(
    [
      [400, "Regular"],
      [600, "SemiBold"],
    ].map(async ([weight, name]) => {
      const font = await readFile(
        `${fontRoot}IBMPlexMono-${name}-Latin1.woff2`
      );
      return `@font-face{font-family:"IBM Plex Mono";font-weight:${weight};src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2")}`;
    })
  )
).join("\n");
const sizes = [
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1470, 749],
  [1920, 1080],
  [390, 844],
];
const manifest = {
  boundary:
    "Real local chapter route and sandboxed WidgetFrame; committed published-chapter fixture replaces all remote reads; all non-GET requests aborted; no production writes, migration application or deployment.",
  cases: [],
};
if (process.env.LOEWI_APPEND)
  manifest.cases.push(
    ...JSON.parse(await readFile(`${output}/measurements.json`, "utf8")).cases
  );
for (const [engine, launcher] of Object.entries({ chromium, webkit }).filter(
  ([engine]) => !process.env.LOEWI_ENGINE || engine === process.env.LOEWI_ENGINE
)) {
  const browser = await launcher.launch();
  try {
    for (const [version, html] of Object.entries(sources).filter(
      ([version]) =>
        !process.env.LOEWI_VERSION || version === process.env.LOEWI_VERSION
    )) {
      const context = await browser.newContext({ deviceScaleFactor: 2 });
      await context.addInitScript(() => {
        // Observe the actual font at paint time, including the book adapter.
        const fill = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (
          text,
          x,
          y,
          ...rest
        ) {
          if (
            this.canvas.id === "cv" &&
            this.textAlign === "left" &&
            this.textBaseline === "alphabetic" &&
            this.font.includes("IBM Plex Mono") &&
            y < 100
          ) {
            window.__loewiHeading = {
              text,
              font: this.font,
              transform: this.getTransform().toJSON(),
              x,
              y,
              textWidth: this.measureText(text).width,
            };
          }
          if (this.canvas.id === "cv" && this.font.includes("Helvetica Neue")) {
            window.__loewiMoleculeFonts ||= new Set();
            window.__loewiMoleculeFonts.add(
              Number(this.font.match(/([\d.]+)px/)[1])
            );
          }
          return fill.call(this, text, x, y, ...rest);
        };
      });
      await context.route("**/*", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (request.method() !== "GET") return route.abort();
        if (url.origin === base) return route.continue();
        if (url.pathname.startsWith("/rest/v1/")) {
          const table = url.pathname.split("/").pop();
          const data =
            table === "widget_uploads"
              ? url.searchParams.get("slug") === "eq.loewi-vagusstoff"
                ? [
                    {
                      slug: "loewi-vagusstoff",
                      title: "Loewi's Vagusstoff, 1921",
                      ramp: "fund",
                      status: "published",
                      html,
                    },
                  ]
                : []
              : table === "modules"
                ? [fixture.module]
                : fixture[table] || [];
          return route.fulfill({
            json: data,
            headers: { "access-control-allow-origin": "*" },
          });
        }
        // Supply the exact bundled Plex face for the sandbox's Google Fonts
        // request, so font metrics are deterministic and fully local.
        if (url.hostname === "fonts.googleapis.com")
          return route.fulfill({ contentType: "text/css", body: fontCss });
        return route.abort();
      });
      for (const [width, height] of sizes.filter(
        ([width]) =>
          !process.env.LOEWI_WIDTH || width === Number(process.env.LOEWI_WIDTH)
      )) {
        const page = await context.newPage({ viewport: { width, height } });
        await page.setViewportSize({ width, height });
        console.log(`Starting ${engine} ${version} ${width}x${height}`);
        const errors = [],
          warnings = [];
        // This WebKit notification also occurs with the frozen v4 baseline
        // when the complete reader remeasures. Retain it separately; actual
        // exceptions, clipped captions and overflow still fail the run.
        page.on("pageerror", (e) => {
          if (
            e.message ===
            "ResizeObserver loop completed with undelivered notifications."
          )
            warnings.push(e.message);
          else errors.push(e.message);
        });
        await page.goto(`${base}/chapter/1/foundations-of-neuroscience`);
        await page.locator("#text").waitFor();
        await page.waitForTimeout(1600);
        const trigger = page.locator("#triggerAnimationFoundationsLoewiWidget");
        await trigger.evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + scrollY + 5 - innerHeight / 2,
            behavior: "instant",
          })
        );
        const iframe =
          width >= 1024
            ? page.locator(".iw iframe")
            : trigger.locator("iframe");
        await iframe.waitFor({ state: "visible" });
        if (width < 1024) await iframe.scrollIntoViewIfNeeded();
        const inner = iframe.contentFrame();
        await inner
          .locator("#bigplay:not([hidden])")
          .waitFor({ state: "attached", timeout: 20000 })
          .catch(async (error) => {
            await page.screenshot({
              path: `${output}/error-${engine}-${version}-${width}.png`,
            });
            console.log(
              await inner.locator("body").evaluate(() => ({
                h: innerHeight,
                w: innerWidth,
                body: document.body.scrollHeight,
                load: document.getElementById("load")?.outerHTML,
                errors: window.__w ? "ready" : "no controller",
              }))
            );
            throw error;
          });
        const frame = await iframe.elementHandle();
        const fonts = await inner.locator("body").evaluate(async () => {
          await document.fonts.ready;
          return [...document.fonts].map((font) => ({
            family: font.family,
            status: font.status,
          }));
        });
        assert.equal(
          fonts.filter(
            (font) =>
              font.family === "IBM Plex Mono" && font.status === "loaded"
          ).length,
          2,
          "Both Plex weights loaded"
        );
        const scale = await frame.evaluate(
          (el) => el.getBoundingClientRect().width / el.clientWidth
        );
        const readings = [];
        // Include every timed caption and both halves of its narration segment.
        const times = await inner
          .locator("body")
          .evaluate(() =>
            [
              ...new Set([
                0,
                45,
                63,
                95,
                155,
                ...window.__w.TL.segs.flatMap((s) => [
                  s.t0 + 0.2,
                  s.t0 + s.dur / 2,
                  s.t0 + s.dur - 0.2,
                ]),
              ]),
            ].sort((a, b) => a - b)
          );
        for (const time of times) {
          const reading = await inner
            .locator("body")
            .evaluate(async (_, time) => {
              window.__loewiHeading = null;
              window.__w.seek(time);
              await new Promise(requestAnimationFrame);
              const cap = document.querySelector(".cap"),
                canvas = document.getElementById("cv");
              const rect = canvas.getBoundingClientRect(),
                heading = window.__loewiHeading;
              const paintScale = Math.min(
                rect.width / canvas.width,
                rect.height / canvas.height
              );
              const font = (selector) =>
                parseFloat(
                  getComputedStyle(document.querySelector(selector)).fontSize
                );
              const tag = heading
                ? {
                    ...heading,
                    effective:
                      parseFloat(heading.font.match(/([\d.]+)px/)[1]) *
                      Math.hypot(heading.transform.c, heading.transform.d) *
                      paintScale,
                  }
                : null;
              return {
                time,
                caption: font(".cap p"),
                heading: font(".cap h3"),
                timeline: font(".chapters button"),
                clock: font(".clock"),
                speed: font(".ib.spd"),
                tag,
                moleculeFonts: [...(window.__loewiMoleculeFonts || [])].sort(
                  (a, b) => a - b
                ),
                captionFits: cap.scrollHeight <= cap.clientHeight + 1,
                sceneHeight: rect.height,
                overflow:
                  document.documentElement.scrollWidth > innerWidth + 1 ||
                  document.documentElement.scrollHeight > innerHeight + 1,
                bodyText: document.getElementById("cap").textContent,
              };
            }, time);
          for (const key of [
            "caption",
            "heading",
            "timeline",
            "clock",
            "speed",
          ])
            reading[key] *= scale;
          if (reading.tag) reading.tag.effective *= scale;
          if (time === 155)
            assert.deepEqual(
              reading.moleculeFonts,
              [11, 17],
              `${engine} ${width}: author's chemical formula fonts changed`
            );
          if (version === "after") {
            assert(
              reading.caption >= 14,
              `${engine} ${width}: caption too small`
            );
            assert(
              reading.timeline >= 12,
              `${engine} ${width}: timeline too small`
            );
            if (width >= 1024 && reading.tag)
              assert(
                reading.tag.effective >= 12.95,
                `${engine} ${width}: canvas heading too small`
              );
            assert(
              reading.captionFits,
              `${engine} ${width}: clipped caption at ${time}`
            );
            assert(
              !reading.overflow,
              `${engine} ${width}: document overflow at ${time}`
            );
            assert(
              reading.sceneHeight > 100,
              `${engine} ${width}: scene collapsed`
            );
          }
          readings.push(reading);
        }
        // Period heading + artwork, a later recording state, and the conclusion.
        const screenshots = [];
        for (const time of [45, 95, 155]) {
          await inner.locator("body").evaluate(async (_, t) => {
            window.__w.seek(t);
            await new Promise(requestAnimationFrame);
          }, time);
          const filename = `${engine}-${version}-${width}x${height}-${time}.png`;
          await iframe.screenshot({ path: `${output}/${filename}` });
          screenshots.push(filename);
        }
        const pageOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1
        );
        assert(!pageOverflow, `${engine} ${width}: reader overflow`);
        assert.deepEqual(errors, [], `${engine} ${width}: runtime errors`);
        const row = {
          warnings,
          fonts,
          engine,
          version,
          width,
          height,
          scale,
          readings,
          screenshots,
        };
        manifest.cases.push(row);
        await writeFile(
          `${output}/measurements.json`,
          JSON.stringify(manifest, null, 2)
        );
        console.log(
          `${engine} ${version} ${width}x${height}: scale ${scale.toFixed(3)}, caption ${readings[0].caption.toFixed(2)}, timeline ${readings[0].timeline.toFixed(2)}, step ${readings.find((r) => r.tag)?.tag.effective.toFixed(2)}`
        );
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
