/** Fixture-driven reader contract, shared by chapter slug. History's additional
 * placement/timing regression cases remain in history-full-reader-browser.mjs.
 * Runs against one existing Storybook build; never contacts a real backend. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
import { readerChapter } from "./reader-fixture-chapters.mjs";

assert.equal(
  process.env.GITHUB_ACTIONS,
  "true",
  "Set GITHUB_ACTIONS=true for an intentional local browser run"
);
// WebKit can leave an unused font face pending indefinitely. Explicitly
// settle used faces below; screenshots must not wait for unrelated faces.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const chapter = readerChapter();
const engine = process.env.READER_ENGINE || "chromium";
assert.ok(["chromium", "webkit"].includes(engine), `Unknown engine ${engine}`);
const fixture = JSON.parse(await readFile(chapter.fixture, "utf8"));
const base = process.env.STORYBOOK_URL || "http://127.0.0.1:6010";
assert.match(new URL(base).origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const output =
  process.env.READER_FIXTURE_OUT ||
  `history-fixture-browser-artifacts/${chapter.key}-full-reader`;
await mkdir(output, { recursive: true });
const started = Date.now();
const manifest = {
  fixture: fixture.header,
  boundary: fixture.boundary,
  omissions: [
    ...fixture.omissions,
    "Only fixture-named YouTube embeds are fulfilled with a local stand-in; player mounting is tested, external playback is not.",
  ],
  engine,
  cases: [],
};
const assets = JSON.parse(await readFile(chapter.assets, "utf8"));
await writeFile(
  path.join(output, "assets.json"),
  JSON.stringify(assets, null, 2)
);
const widgets = fixture.paragraphs.flatMap((paragraph) =>
  (paragraph.content?.blocks || [])
    .filter((b) => b.type === "widget")
    .map((block) => ({ paragraph, block }))
);
const linked = fixture.paragraphs
  .filter((p) => p.animation_id)
  .map((paragraph) => ({
    paragraph,
    animation: fixture.animations.find((a) => a.id === paragraph.animation_id),
  }));
const pane = ".chapter-reader > .figure-pane";
const youtubeIds = new Set(
  fixture.animations
    .flatMap((a) => [
      a.youtube_id,
      ...(a.config?.images || []).map((image) => image.youtube),
    ])
    .filter(Boolean)
);
let failures = 0;
const browser = await { chromium, webkit }[engine].launch({
  headless: true,
  ...(engine === "chromium"
    ? {
        args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
      }
    : {}),
});
async function overflow(page) {
  const size = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(size.html, "document horizontal overflow").toBeLessThanOrEqual(
    size.width + 1
  );
  expect(size.body, "body horizontal overflow").toBeLessThanOrEqual(
    size.width + 1
  );
}
async function scroll(page, node) {
  await node.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
}
async function size(node) {
  const box = await node.boundingBox();
  expect(box?.width, "mounted width").toBeGreaterThan(0);
  expect(box?.height, "mounted height").toBeGreaterThan(0);
  return box;
}
async function upload(page, frame, result, id) {
  await expect(frame).toBeVisible({ timeout: 20000 });
  await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
  // Observe real bridge reports by source window, including opaque sandbox
  // origins. Do not accept a report from another upload with the same title.
  await expect
    .poll(
      () =>
        frame.evaluate(
          (el) =>
            window.__readerReports.find((r) => r.source === el.contentWindow)
              ?.size
        ),
      { timeout: 20000, message: `${id}: size report` }
    )
    .toBeTruthy();
  const report = await frame.evaluate((el) => {
    const r = window.__readerReports.find((r) => r.source === el.contentWindow);
    return { size: r.size, ready: r.ready, errors: r.errors };
  });
  expect(report.ready, `${id}: ready report`).toBe(true);
  expect(report.size.height).toBeGreaterThan(0);
  expect(report.size.viewport).toBeGreaterThan(0);
  expect(
    report.size.scrollWidth,
    `${id}: uploaded document overflow`
  ).toBeLessThanOrEqual(report.size.viewport + 1);
  expect(report.errors, id).toEqual([]);
  result.measurements.push({
    kind: "upload",
    id,
    ...report,
    box: await size(frame),
  });
}
try {
  for (const width of (process.env.READER_WIDTHS || "1440,1024,390")
    .split(",")
    .map(Number)) {
    const caseStarted = Date.now();
    const result = {
      width,
      status: "running",
      measurements: [],
      errors: [],
      labels: [],
      harnessNotes: [],
      blockedRequests: [],
      steps: [],
    };
    manifest.cases.push(result);
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "no-preference",
      serviceWorkers: "block",
    });
    context.setDefaultTimeout(20000);
    context.setDefaultNavigationTimeout(30000);
    await context.route("**/*", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      // This named-player document is fulfilled locally, like the shared
      // story's poster stand-ins. YouTube playback is outside this lane.
      if (
        req.method() === "GET" &&
        ["www.youtube.com", "www.youtube-nocookie.com"].includes(
          url.hostname
        ) &&
        youtubeIds.has(url.pathname.split("/embed/")[1])
      ) {
        await route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><html><body>Offline fixture video player</body></html>",
        });
        return;
      }
      if (
        (["http:", "https:"].includes(url.protocol) &&
          url.origin !== new URL(base).origin) ||
        !["GET", "HEAD"].includes(req.method()) ||
        /\/(rest|auth|functions)\/v1\//.test(url.pathname)
      ) {
        result.blockedRequests.push({
          origin: url.origin,
          path: url.pathname,
          method: req.method(),
        });
        await route.abort();
      } else await route.continue();
    });
    await context.routeWebSocket("**/*", (socket) => {
      result.blockedRequests.push({ websocket: socket.url() });
      socket.close();
    });
    await context.addInitScript(() => {
      window.__readerReports = [];
      addEventListener("message", (e) => {
        if (!e.data?.__ob) return;
        let report = window.__readerReports.find((r) => r.source === e.source);
        if (!report) {
          report = { source: e.source, errors: [], ready: false };
          window.__readerReports.push(report);
        }
        if (e.data.type === "size") report.size = e.data;
        if (e.data.type === "ready") report.ready = true;
        if (["error", "blocked"].includes(e.data.type))
          report.errors.push(e.data.message || e.data.url);
      });
    });
    const page = await context.newPage();
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      // The same WebKit native-control diagnostics captured before this
      // change (retina-figure-numbers-browser); these are browser icon blobs,
      // not failed application assets. Retain them in the manifest.
      if (
        engine === "webkit" &&
        m.text() ===
          "Service Worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag"
      ) {
        result.harnessNotes.push(m.text());
        return;
      }
      if (
        engine === "webkit" &&
        /^Button failed to load, iconName = (?:invalid|pip|airplay)-placard, layoutTraits = \[MacOSLayoutTraits Inline\], src = blob:/.test(
          m.text()
        )
      )
        result.harnessNotes.push(m.text());
      else result.errors.push(m.text());
    });
    page.on("pageerror", (e) => {
      if (
        engine === "webkit" &&
        e.message ===
          "Service Worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag"
      ) {
        result.harnessNotes.push(e.message);
        return;
      }
      // Playwright's own service-worker override throws in opaque srcdoc
      // frames, as documented by the existing History lane.
      if (
        !/^Failed to read the 'serviceWorker' property from 'Navigator': Service worker is disabled because the context is sandboxed/.test(
          e.message
        )
      )
        result.errors.push(e.message);
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        result.errors.push(
          `HTTP ${response.status()} ${new URL(response.url()).pathname}`
        );
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    try {
      await page.goto(
        `${base}/iframe.html?id=${chapter.story}&viewMode=story&globals=reduceMotion:!false`,
        { waitUntil: "domcontentloaded" }
      );
      await expect(page.locator(".chapter-reader #text")).toBeVisible({
        timeout: 30000,
      });
      result.fonts = await page.evaluate(async () => {
        await Promise.all([
          document.fonts.load('600 11px "IBM Plex Mono"'),
          document.fonts.load('400 20px "IBM Plex Sans"'),
        ]);
        return {
          mono: document.fonts.check('600 11px "IBM Plex Mono"'),
          sans: document.fonts.check('400 20px "IBM Plex Sans"'),
        };
      });
      expect(result.fonts).toEqual({ mono: true, sans: true });
      await page.waitForTimeout(1200);
      await overflow(page);
      // The opener's contents list must include every main section; nested
      // headings are additionally checked in the real drawer below.
      const contents = page.locator(".chapter-opener");
      for (const section of fixture.sections.filter(
        (s) => !s.slug.startsWith("box-") && s.slug !== "further-reading"
      ))
        await expect(contents).toContainText(section.title);
      result.steps.push("contents");
      await page.screenshot({
        path: path.join(output, `${width}-contents.png`),
      });
      const mountedFigures = new Set();
      for (const { paragraph, animation } of linked) {
        assert(animation, `${paragraph.id}: exported figure link resolves`);
        const key = animation.animation_key;
        // Repeated prose links keep the same figure alive. The narrow reader
        // deliberately mounts it only at its first occurrence (useInlineFigures).
        if (mountedFigures.has(key)) continue;
        console.log(`${width}: checking ${key} at ${paragraph.id}`);
        result.current = `figure ${key} at ${paragraph.id}`;
        const triggers = page.locator(
          `[id="trigger${key}" i], [id="triggerAnimation${key}" i]`
        );
        const occurrence = linked.filter(
          (entry) =>
            entry.animation.id === animation.id &&
            linked.indexOf(entry) <
              linked.findIndex((entry) => entry.paragraph.id === paragraph.id)
        ).length;
        const trigger = triggers.nth(occurrence);
        // The reader's full-screen figures have paragraph timeline anchors
        // instead of pane triggers. All anchors come from exported DB rows.
        const anchor = (await trigger.count())
          ? trigger.first()
          : page
              .locator(
                `[data-paragraph-id="${paragraph.id}"], [data-timeline-id="${paragraph.id}"]`
              )
              .first();
        await expect(anchor, result.current).toHaveCount(1);
        await scroll(page, anchor);
        if (width >= 1024 && (await trigger.count())) {
          const top = await trigger.first().evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const paneTop = document
              .querySelector(".figure-pane")
              .getBoundingClientRect().top;
            const above = [
              ...document.querySelectorAll(
                ".fb-slot:not(.fb-slot--column), .wb, [data-chapter-opener]"
              ),
            ]
              .filter((cover) => !cover.contains(el) && !el.contains(cover))
              .map((cover) => cover.getBoundingClientRect().bottom)
              .filter((bottom) => bottom <= rect.top + 1);
            const wait = Math.max(
              0,
              Math.min(
                Math.max(...above) - paneTop - (rect.top - innerHeight / 2),
                el.dataset.figureHold === "next"
                  ? Infinity
                  : rect.height - innerHeight / 4
              )
            );
            return rect.top + scrollY + wait;
          });
          await page.evaluate(
            (top) =>
              scrollTo({ top: top + 5 - innerHeight / 2, behavior: "instant" }),
            top
          );
          await page.waitForTimeout(300);
        }
        let figure;
        if (animation.config?.fullscreen) {
          const slot = anchor.locator("..").locator("[data-fb-slot]").first();
          await expect(slot).toHaveCount(1);
          const pair = await slot.getAttribute("data-fb-slot");
          await scroll(page, slot);
          figure = page.locator(`[data-fb-stage="${pair}"]`);
        } else if (width >= 1024 && (await trigger.count())) {
          figure = page.locator(pane);
          await expect(figure).toHaveAttribute(
            "data-figure-key",
            key.toLowerCase(),
            { timeout: 20000 }
          );
        } else if (
          await page
            .locator(`[data-figure-key="${key}"]:not(.figure-pane)`)
            .count()
        )
          figure = page
            .locator(`[data-figure-key="${key}"]:not(.figure-pane)`)
            .first();
        else figure = anchor;
        const config = animation.config || {};
        if (width < 1024 && config.widgetId) {
          // Subsection-header figures follow the header's wrapper, while
          // ordinary paragraph figures are inside it. Both use this band's
          // authored widget id; the hidden desktop pane is never a candidate.
          figure = page.locator(`[data-widget-breakout="${config.widgetId}"]`);
          await expect(figure).toHaveCount(1);
          await scroll(page, figure.locator("[data-widget-stage]").first());
        }
        const record = {
          id: key,
          paragraph: paragraph.id,
          kind: config.widgetId
            ? "upload"
            : config.flip
              ? "video-flip"
              : config.images?.length ||
                  config.illuImage ||
                  animation.image_file_url
                ? "image"
                : config.loop || config.autoLoop
                  ? "loop"
                  : "lottie",
          box: null,
        };
        const uploadEntry = fixture.uploads.find(
          (entry) => `upload:${entry.slug}` === config.widgetId
        );
        const uploadFrame = uploadEntry
          ? figure.getByTitle(uploadEntry.title, { exact: true })
          : null;
        if (config.widgetId?.startsWith("upload:"))
          await upload(page, uploadFrame, result, key);
        else if (animation.youtube_id) {
          const play = figure.getByRole("button", {
            name: `Play video: ${animation.title}`,
          });
          await expect(figure.locator(".ve iframe")).toHaveCount(0);
          await play.click();
          const player = figure.locator(".ve iframe");
          await expect(player).toHaveAttribute(
            "src",
            new RegExp(`/embed/${animation.youtube_id}`)
          );
          await expect(player.contentFrame().locator("body")).toHaveText(
            "Offline fixture video player"
          );
          record.kind = "youtube-player-stand-in";
        } else if (config.flip) {
          const video = figure.locator("video");
          await expect(video).toHaveCount(1);
          await expect
            .poll(() => video.evaluate((el) => el.readyState), {
              timeout: 20000,
            })
            .toBeGreaterThanOrEqual(2);
          const flip = figure.locator(".flip-card");
          await figure.locator(".hoverState").click();
          await expect(flip).toHaveClass(/flip-card.*flip/);
          await expect
            .poll(() => flip.locator("img").evaluate((el) => el.naturalWidth))
            .toBeGreaterThan(0);
        } else if (
          config.images?.length ||
          config.illuImage ||
          animation.image_file_url
        ) {
          if ((config.images || []).some((image) => image.loop)) {
            const loop = figure.locator("video.figimg-loop");
            await expect(loop).toHaveCount(1);
            await expect
              .poll(() => loop.evaluate((el) => el.readyState), {
                timeout: 20000,
              })
              .toBeGreaterThanOrEqual(2);
            await expect
              .poll(() => loop.evaluate((el) => el.currentTime), {
                timeout: 10000,
              })
              .toBeGreaterThan(0);
            await page.screenshot({
              path: path.join(output, `${width}-file-loop-playing.png`),
            });
            record.kind = "file-loop";
          } else {
            await expect
              .poll(
                () =>
                  figure
                    .locator("img")
                    .evaluateAll(
                      (nodes) =>
                        nodes.filter((el) => el.complete && el.naturalWidth > 0)
                          .length
                    ),
                { timeout: 20000 }
              )
              .toBeGreaterThan(0);
          }
        } else {
          // Scope to this record's artwork, excluding toolbar SVGs and a
          // departing figure's transition. Both split halves must draw.
          const artStages = config.split
            ? [".sp-stage-left", ".sp-stage-right"]
            : [`[id="${key}"], [id="${key}--inline"]`];
          for (const stage of artStages)
            await expect
              .poll(
                () => figure.locator(stage).locator("svg[viewBox] g").count(),
                {
                  timeout: 20000,
                  message: `${key}: drawn Lottie in ${stage}`,
                }
              )
              .toBeGreaterThan(0);
        }
        if (
          config.figureNumber !== undefined &&
          config.figureNumber !== null &&
          config.figureNumber !== ""
        ) {
          const number = String(config.figureNumber);
          const label = `FIG ${/^\d+$/.test(number) ? number.padStart(2, "0") : number}`;
          const labels = figure
            .locator(".fig-label, .figure-heading__label, .fbar-fig")
            .filter({ hasText: new RegExp(`^${label}$`, "i"), visible: true });
          await expect(
            labels,
            `${key}: exactly one visible record label`
          ).toHaveCount(1);
          if (width < 1024) {
            const top = await labels.evaluate(
              (el) => el.getBoundingClientRect().top + scrollY
            );
            await page.evaluate(
              (y) => scrollTo({ top: y - 80, behavior: "instant" }),
              top
            );
            await page.waitForTimeout(250);
          }
          const style = await labels.evaluate((el) => {
            const css = getComputedStyle(el);
            return {
              text: el.textContent,
              color: css.color,
              fontFamily: css.fontFamily,
              box: el.getBoundingClientRect().toJSON(),
            };
          });
          expect(style.fontFamily).toMatch(/mono/i);
          if (
            width >= 1024 &&
            (await figure.locator(".illustration-caption").count())
          ) {
            const caption = await figure
              .locator(".illustration-caption")
              .filter({ visible: true })
              .boundingBox();
            const heading = await figure
              .locator(".figure-heading")
              .filter({ visible: true })
              .boundingBox();
            expect(
              caption.y + caption.height,
              `${key}: caption clears heading`
            ).toBeLessThanOrEqual(heading.y + 1);
          }
          result.labels.push({ id: key, label, ...style });
          await page.screenshot({
            path: path.join(output, `${width}-fig-${number}.png`),
          });
        }
        record.box = await size(config.widgetId ? uploadFrame : figure);
        if (
          !result.measurements.some(
            (entry) => entry.kind === "figure" && entry.media === record.kind
          )
        ) {
          await page.screenshot({
            path: path.join(output, `${width}-${record.kind}.png`),
          });
        }
        record.media = record.kind;
        result.measurements.push({ ...record, kind: "figure" });
        mountedFigures.add(key);
        await overflow(page);
      }
      expect(mountedFigures.size).toBe(fixture.animations.length);
      const numbered = fixture.animations.filter(
        (a) => a.config?.figureNumber != null && a.config.figureNumber !== ""
      );
      expect(result.labels.length).toBe(numbered.length);
      result.steps.push(
        `all ${mountedFigures.size} distinct figures mounted (${linked.length} prose links); ${result.labels.length} labels visible once`
      );
      await page.screenshot({
        path: path.join(output, `${width}-figures.png`),
      });
      // A continuous chapter pass catches labels lost during normal pane
      // handoffs, beyond the targeted record visits above. Read innerText as
      // a reader sees it; hidden preloaded sequence layers do not count.
      result.scan = [];
      for (let top = 0; ; top += 450) {
        const extent = await page.evaluate(
          () => document.documentElement.scrollHeight - innerHeight
        );
        await page.evaluate(
          (y) => scrollTo({ top: y, behavior: "instant" }),
          Math.min(top, extent)
        );
        await page.waitForTimeout(100);
        if (top % 45000 === 0)
          console.log(`${width}: label sweep ${top}/${Math.round(extent)}`);
        if (width >= 1024) {
          const active = await page
            .locator(pane)
            .getAttribute("data-figure-key");
          const row = numbered.find(
            (a) => a.animation_key.toLowerCase() === active
          );
          if (row) {
            const label = result.labels.find(
              (r) => r.id === row.animation_key
            ).label;
            await expect
              .poll(
                async () => {
                  const text = await page.locator(pane).innerText();
                  return text
                    .split(/\n/)
                    .filter((line) => line.trim() === label).length;
                },
                {
                  timeout: 3000,
                  message: `scroll ${top}: ${label} visible once`,
                }
              )
              .toBe(1);
            result.scan.push({
              top,
              id: row.animation_key,
              label,
              text: await page.locator(pane).innerText(),
            });
          }
        } else {
          const visible = await page
            .locator(".fig-label, .figure-heading__label, .fbar-fig")
            .evaluateAll((nodes) =>
              nodes
                .filter((el) => {
                  const r = el.getBoundingClientRect();
                  return (
                    r.width > 0 &&
                    r.height > 0 &&
                    r.top >= 64 &&
                    r.bottom <= innerHeight
                  );
                })
                .map((el) => el.textContent.trim())
            );
          expect(
            new Set(visible).size,
            `scroll ${top}: no repeated visible labels`
          ).toBe(visible.length);
          if (visible.length) result.scan.push({ top, labels: visible });
        }
        if (top >= extent) break;
      }
      result.steps.push("450px full-chapter label sweep");
      for (const { paragraph, block } of widgets) {
        result.current = `widget ${block.widgetId}`;
        const band = page.locator(`[data-widget-breakout="${block.widgetId}"]`);
        await expect(band).toHaveCount(1);
        await scroll(page, band);
        const stage = page.locator(`[data-widget-stage="${block.widgetId}"]`);
        const launch = stage.locator(".wb-launch button");
        if (await launch.count()) await launch.click();
        let host = (await page.getByRole("dialog").count())
          ? page.getByRole("dialog")
          : stage;
        if (
          !(await stage.count()) &&
          !(await page.getByRole("dialog").count())
        ) {
          await band.getByRole("button", { name: /Open interactive/ }).click();
          host = page.getByRole("dialog");
        }
        await expect(
          host.locator(
            ".wb-stage-placeholder, .wb-missing, .uw-note, .iw-missing"
          )
        ).toHaveCount(0, { timeout: 20000 });
        if (block.widgetId.startsWith("upload:"))
          await upload(
            page,
            host.locator("iframe.widget-frame"),
            result,
            block.widgetId
          );
        const box = await size(host);
        result.measurements.push({
          kind: "widget-band",
          id: block.widgetId,
          paragraph: paragraph.id,
          box,
        });
        await overflow(page);
        if (await page.getByRole("dialog").count()) {
          await page
            .getByRole("dialog")
            .getByRole("button", { name: "Close demo", exact: true })
            .click();
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
      }
      result.steps.push(`all ${widgets.length} widget bands measured`);
      result.current = "citations to references and back";
      const citation = page.locator(".citation-ref[data-ref]").first();
      await expect(citation).toHaveCount(1);
      const number = await citation.getAttribute("data-ref");
      await scroll(page, citation);
      await citation.click();
      await page.getByRole("button", { name: "In the reference list" }).click();
      await expect(page.locator(`#ref-${number}`)).toBeInViewport({
        timeout: 10000,
      });
      await page.getByRole("button", { name: "Back to the text" }).click();
      await expect(citation).toBeInViewport({ timeout: 10000 });
      result.steps.push("citation round trip");
      await page
        .getByRole("button", { name: "Open chapter menu", exact: true })
        .click();
      const drawer = page.getByRole("dialog", {
        name: "Navigation",
        exact: true,
      });
      for (const section of fixture.sections.filter(
        (s) => s.slug !== "further-reading"
      ))
        await expect(
          drawer
            .locator(".outline-section, .outline-subsection")
            .filter({ hasText: section.title })
        ).toHaveCount(1);
      await page.keyboard.press("Escape");
      await overflow(page);
      expect(result.errors).toEqual([]);
      expect(result.blockedRequests).toEqual([]);
      result.status = "passed";
    } catch (error) {
      failures++;
      result.status = "failed";
      result.failure = {
        at: result.current,
        message: error.message,
        stack: error.stack,
      };
      console.error(`${width}: ${result.current}\n${error.stack}`);
      await page
        .screenshot({ path: path.join(output, `${width}-failure.png`) })
        .catch(() => {});
      await writeFile(
        path.join(output, `${width}-failure.txt`),
        (await page.locator("body").innerText()).slice(0, 30000)
      ).catch(() => {});
    } finally {
      result.seconds = (Date.now() - caseStarted) / 1000;
      if (
        result.status === "passed" &&
        (result.errors.length || result.blockedRequests.length)
      ) {
        result.status = "failed";
        failures++;
      }
      await context.tracing.stop({
        path: path.join(output, `${width}-trace.zip`),
      });
      await context.close();
      console.log(
        `${chapter.title} ${width}: ${result.status} (${result.seconds}s)`
      );
    }
  }
} finally {
  await browser.close();
  manifest.seconds = (Date.now() - started) / 1000;
  manifest.status = failures
    ? "failed"
    : "passed-assertions-awaiting-visual-review";
  await writeFile(
    path.join(output, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(
    `${chapter.title} complete reader: ${manifest.seconds}s; ${failures} failed widths`
  );
}
if (failures) process.exitCode = 1;
