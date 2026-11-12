import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

// Never launch Chromium in a restricted local executor. This lane contains no
// credentials and permits only read-only requests to its loopback fixture host.
assert.equal(
  process.env.GITHUB_ACTIONS,
  "true",
  "Full-reader browser QA runs only on GitHub Actions"
);
// The fixture host is always loopback. CI serves it on 6010; STORYBOOK_URL
// moves the port when a local run must not collide with another session.
const base = process.env.STORYBOOK_URL || "http://127.0.0.1:6010";
assert.match(new URL(base).origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const output = "history-fixture-browser-artifacts/full-reader";
await mkdir(output, { recursive: true });
const fixture = JSON.parse(
  await readFile("src/stories/historyFullReaderData.json", "utf8")
);
const assets = JSON.parse(
  await readFile("storybook-static/history-full-reader-assets.json", "utf8")
);
await writeFile(
  path.join(output, "assets.json"),
  `${JSON.stringify(assets, null, 2)}\n`
);
const boxes = fixture.sections.filter((s) => s.slug.startsWith("box-"));
assert(boxes.length, "The published chapter has breakout boxes");
const story = "chapter-history-full-reader--published-export";
// What the published chapter adds to the seed this lane used to render: boxes
// read as named Explore parts, widgets authored as database blocks, and an
// uploaded widget as a paragraph's figure. All three come from the fixture, so
// a refresh that adds or removes one changes what is asserted, not the script.
const exploreParts = fixture.paragraphs.filter(
  (p) => p.content?.explore && boxes.some((box) => box.id === p.section_id)
);
const widgetBlocks = fixture.paragraphs.flatMap((paragraph) =>
  (paragraph.content?.blocks || [])
    .filter((block) => block.type === "widget")
    .map((block) => ({ paragraph, block }))
);
const figureWidgets = fixture.paragraphs.flatMap((paragraph) => {
  const animation = fixture.animations.find(
    (a) => a.id === paragraph.animation_id
  );
  const slug = animation?.config?.widgetId?.startsWith("upload:")
    ? animation.config.widgetId.slice("upload:".length)
    : null;
  const upload = fixture.uploads.find((entry) => entry.slug === slug);
  return upload ? [{ paragraph, animation, upload }] : [];
});
const SANDBOX_SERVICE_WORKER =
  /^Failed to read the 'serviceWorker' property from 'Navigator': Service worker is disabled because the context is sandboxed/;
const paneSelector = '.chapter-reader > [class~="reader:fixed"]';
const manifest = {
  commit: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID,
  fixture: fixture.header,
  boundary: fixture.boundary,
  limitations: [
    ...fixture.omissions,
    "Chromium only. Hash history substitutes for the deployed URL base; production route table, guards and scroll behavior are unchanged. Anonymous fixture auth, no RLS, real service calls or deployment. The content is the published chapter as of the fixture's export date, not a live read. The story draws a plain stand-in for each YouTube poster and serves the committed copy of each uploaded widget without its Google Fonts links. Screenshots require visual review.",
  ],
  cases: [],
};
let failures = 0;
let browser;

async function shot(page, result, name) {
  // A name can carry a widget id ("upload:<slug>"): the artifact upload
  // refuses a colon in a file name.
  const file = `${result.width}-${String(name).replace(/[^\w.-]+/g, "-")}.png`;
  await page.screenshot({
    path: path.join(output, file),
    animations: "disabled",
  });
  result.screenshots.push(file);
}
async function step(result, name, work) {
  result.currentStep = name;
  await work();
  result.steps.push(name);
  console.log(`${result.width}: ${name}`);
}
async function scrollTo(page, top) {
  await page.evaluate(
    (value) => window.scrollTo({ top: value, behavior: "instant" }),
    top
  );
  await page.waitForTimeout(250);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(
    sizes.html,
    "document must stay within usable viewport"
  ).toBeLessThanOrEqual(sizes.client + 1);
  expect(
    sizes.body,
    "body must stay within usable viewport"
  ).toBeLessThanOrEqual(sizes.client + 1);
}
async function readerReady(page) {
  await expect(page.locator(".chapter-reader #text")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator("[data-breakout-box]")).toHaveCount(boxes.length);
  await page.evaluate(() => document.fonts.ready);
  // Both real reader components deliberately register GSAP triggers after 500ms.
  await page.waitForTimeout(1000);
}
async function assertPlacements(page, result) {
  const measurements = await page.evaluate(
    ({ boxes, paragraphs }) =>
      boxes.map((box) => {
        const stage = document.querySelector(`[data-breakout-box="${box.id}"]`);
        const rectangle = stage.getBoundingClientRect();
        const slots = [
          ...document.querySelectorAll(".anchored-box > .fb-slot"),
        ];
        const slot =
          stage.closest(".fb-slot") ||
          slots.find(
            (s) => Math.abs(s.getBoundingClientRect().top - rectangle.top) <= 1
          );
        const anchor = document.getElementById(box.anchor_paragraph_id);
        const anchorRow = paragraphs.find(
          (p) => p.id === box.anchor_paragraph_id
        );
        const nextRow = paragraphs
          .filter(
            (p) =>
              p.section_id === box.parent_section_id &&
              p.order_index > anchorRow.order_index
          )
          .sort((a, b) => a.order_index - b.order_index)[0];
        const next = nextRow && document.getElementById(nextRow.id);
        const following = (a, b) =>
          !!(a?.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        return {
          id: box.id,
          parent: slot?.closest("section")?.id,
          afterAnchor: following(anchor, slot),
          beforeNextParagraph: !next || following(slot, next),
          top: rectangle.top + scrollY,
          left: rectangle.left,
          right: rectangle.right,
          width: rectangle.width,
          height: rectangle.height,
          anchorBottom: anchor.getBoundingClientRect().bottom + scrollY,
          floating: stage.classList.contains("fb-stage--floating"),
          client: document.documentElement.clientWidth,
        };
      }),
    { boxes, paragraphs: fixture.paragraphs }
  );
  expect(measurements).toHaveLength(boxes.length);
  for (const measure of measurements) {
    const box = boxes.find((s) => s.id === measure.id);
    expect(
      measure.parent,
      `${box.slug} must remain in its authored section`
    ).toBe(box.parent_section_id);
    expect(
      measure.afterAnchor,
      `${box.slug} must follow its authored paragraph`
    ).toBe(true);
    expect(
      measure.beforeNextParagraph,
      `${box.slug} must precede the next prose paragraph`
    ).toBe(true);
    expect(measure.top + 1, box.slug).toBeGreaterThanOrEqual(
      measure.anchorBottom
    );
    expect(measure.height, box.slug).toBeGreaterThan(100);
    if (result.width >= 1024) {
      expect(measure.floating, box.slug).toBe(true);
      expect(
        Math.abs(measure.left),
        `${box.slug} left edge`
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(measure.right - measure.client),
        `${box.slug} right edge`
      ).toBeLessThanOrEqual(1);
    } else {
      expect(measure.floating, box.slug).toBe(false);
      expect(measure.left, box.slug).toBeGreaterThanOrEqual(-1);
      expect(measure.right, box.slug).toBeLessThanOrEqual(measure.client + 1);
    }
  }
  result.measurements.push({
    kind: "all-box-placements",
    boxes: measurements,
  });
}
async function assertNoBoxLeakage(page) {
  expect(
    await page.locator("[data-breakout-box] .animationTrigger.active").count()
  ).toBe(0);
  const labels = await page
    .locator(`${paneSelector} .fig-label`)
    .allTextContents();
  expect(labels.filter((label) => /^FIG\s+[A-Z]/.test(label.trim()))).toEqual(
    []
  );
  const boxImages = fixture.paragraphs
    .filter((p) => boxes.some((b) => b.id === p.section_id))
    .flatMap(
      (p) =>
        fixture.animations.find((a) => a.id === p.animation_id)?.config
          ?.images || []
    )
    .map((image) => (typeof image === "string" ? image : image.src));
  const paneImages = await page
    .locator(`${paneSelector} img`)
    .evaluateAll((imgs) => imgs.map((img) => new URL(img.src).pathname));
  expect(paneImages.filter((src) => boxImages.includes(src))).toEqual([]);
}
// The boundary below is figureEnd's (src/helper/historyFigureTiming.js) for a
// still image on Automatic: the next trigger or full-width band (FIGURE_BANDS)
// outside this one, else the section's end, never before its own bottom. An
// authored hold (content.animationFlags.hold, OPENBRAIN-131) adds `bottom +
// hold screens` to it: History rows carry none, so if one ever does, add that
// term here in the same change.
async function timing(page, result, number) {
  const trigger = page.locator(`#triggerAnimationFoundationsFig${number}`);
  await expect(trigger).toHaveCount(1);
  const measure = () =>
    trigger.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const top = rect.top + scrollY;
      const bottom = rect.bottom + scrollY;
      const section = element.closest("section");
      const boundaries = [
        ...section.querySelectorAll(
          ".animationTrigger[id], .fb-slot:not(.fb-slot--column), .wb"
        ),
      ]
        .filter(
          (item) =>
            item !== element &&
            !element.contains(item) &&
            !item.closest("[data-breakout-box]")
        )
        .map((item) => item.getBoundingClientRect().top + scrollY)
        .filter((y) => y > top + 1);
      return {
        top,
        bottom,
        boundary: Math.max(
          bottom,
          Math.min(
            section.getBoundingClientRect().bottom + scrollY,
            ...boundaries
          )
        ),
        readingLine: innerHeight / 2,
        scrollY,
      };
    });
  const label = `FIG ${String(number).padStart(2, "0")}`;
  const sample = async (name, position) => {
    const before = await measure();
    let target = position(before) - before.readingLine;
    await scrollTo(page, target);
    let live = await measure();
    // Earlier full-width artwork can settle after a long jump. Re-align only
    // when live geometry changed, keeping the same prose-relative sample.
    const correctedTarget = position(live) - live.readingLine;
    const realigned = Math.abs(correctedTarget - target) > 1;
    if (realigned) {
      target = correctedTarget;
      await scrollTo(page, target);
      live = await measure();
    }
    const next = await page
      .locator(`#triggerAnimationFoundationsFig${number + 1}`)
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top + scrollY, bottom: rect.bottom + scrollY };
        })
      );
    result.measurements.push({
      kind: "static-figure-sample",
      number,
      name,
      target,
      realigned,
      before,
      live,
      next,
    });
    expect(
      Math.abs(live.scrollY - (position(live) - live.readingLine)),
      "sample must remain at its intended live prose position"
    ).toBeLessThanOrEqual(1);
    return live;
  };
  for (const [name, position] of [
    ["opening", (geometry) => geometry.top + 5],
    [
      "last-lines",
      (geometry) => Math.min(geometry.bottom - 3, geometry.boundary - 3),
    ],
  ]) {
    await sample(name, position);
    await expect
      .poll(() => page.locator(`${paneSelector} .fig-label`).allTextContents())
      .toEqual([label]);
    await expect(trigger).toHaveClass(/active/);
  }
  await shot(page, result, `static-figure-${number}-last-lines`);
  await sample("after-boundary", (geometry) => geometry.boundary + 5);
  await expect(trigger).not.toHaveClass(/active/);
  await expect
    .poll(async () =>
      (
        await page.locator(`${paneSelector} .fig-label`).allTextContents()
      ).includes(label)
    )
    .toBe(false);
  // Re-enter in reverse, exercising GSAP's active-trigger ownership too.
  const geometry = await sample(
    "reverse-entry",
    (geometry) => geometry.top + 5
  );
  await expect
    .poll(() => page.locator(`${paneSelector} .fig-label`).allTextContents())
    .toEqual([label]);
  result.measurements.push({
    kind: "static-figure-interval",
    number,
    ...geometry,
  });
}

try {
  browser = await chromium.launch({
    headless: true,
    ignoreDefaultArgs: ["--hide-scrollbars"],
    args: [
      "--disable-features=OverlayScrollbar",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    const result = {
      width: viewport.width,
      viewport,
      status: "running",
      steps: [],
      screenshots: [],
      measurements: [],
      errors: [],
      blockedRequests: [],
      harnessNotes: [],
    };
    manifest.cases.push(result);
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (
        (["http:", "https:"].includes(url.protocol) &&
          url.origin !== new URL(base).origin) ||
        !["GET", "HEAD"].includes(request.method()) ||
        /\/(rest|auth|functions)\/v1\//.test(url.pathname)
      ) {
        result.blockedRequests.push({
          origin: url.origin,
          path: url.pathname,
          method: request.method(),
        });
        await route.abort("blockedbyclient");
      } else await route.continue();
    });
    await context.routeWebSocket("**/*", (socket) => {
      result.blockedRequests.push({ type: "websocket", url: socket.url() });
      socket.close();
    });
    // The application hides scrollbars through both the standard property
    // and a WebKit pseudo-element rule. Override both in this fixture so the
    // geometry lane exercises a real classic gutter, not fake padding. The
    // override is in place before the first layout, as a classic scrollbar
    // is: added after load it narrows a settled page by 16px, and when that
    // rewraps the opener (it does with the published contents list) the
    // figure triggers keep their old positions under reduced motion. That
    // is a reader defect outside this lane's geometry; see
    // docs/architecture/history-fixture.md. Widget frames keep their own
    // scrolling.
    await context.addInitScript(() => {
      if (window.top !== window) return;
      const style = document.createElement("style");
      style.textContent = `
        html {
          overflow-y: scroll !important;
          scrollbar-gutter: stable;
          scrollbar-width: auto !important;
        }
        html::-webkit-scrollbar {
          display: block !important;
          width: 16px;
        }
        html::-webkit-scrollbar-thumb { background: #888; }
      `;
      // An init script can run before the parser has made <html>.
      const add = () => document.documentElement.appendChild(style);
      if (document.documentElement) add();
      else
        new MutationObserver((_, observer) => {
          if (!document.documentElement) return;
          observer.disconnect();
          add();
        }).observe(document, { childList: true });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => {
      // Not the page's: with serviceWorkers "block" Playwright overrides
      // navigator.serviceWorker in every frame, and reading it throws inside
      // an uploaded widget's sandbox (no allow-same-origin). Neither the
      // reader nor the widget touches service workers.
      if (SANDBOX_SERVICE_WORKER.test(error.message)) {
        result.harnessNotes.push(error.message);
        return;
      }
      result.errors.push({ type: "pageerror", message: error.message });
    });
    page.on("console", (message) => {
      if (message.type() === "error")
        result.errors.push({ type: "console", message: message.text() });
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        result.errors.push({
          type: "http",
          status: response.status(),
          path: new URL(response.url()).pathname,
        });
    });
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    try {
      await step(
        result,
        "load actual App/ChapterView/TextComp with a nonzero classic scrollbar gutter",
        async () => {
          const response = await page.goto(
            `${base}/iframe.html?id=${story}&viewMode=story&globals=reduceMotion:!true`,
            { waitUntil: "networkidle" }
          );
          expect(response.ok()).toBe(true);
          await readerReady(page);
          await expect
            .poll(() =>
              page.evaluate(
                () => innerWidth - document.documentElement.clientWidth
              )
            )
            .toBeGreaterThan(0);
          await noOverflow(page);
          await shot(page, result, "opener");
        }
      );
      await step(
        result,
        "every breakout box keeps its published anchor and full-bleed left/right edges",
        () => assertPlacements(page, result)
      );
      await step(
        result,
        "main divider, fixed figure pane and progress dot share one scrollbar-aware boundary",
        async () => {
          const geometry = await page.evaluate((selector) => {
            const main = document
              .getElementById("text")
              .getBoundingClientRect();
            const dot = document
              .querySelector(".reading-line")
              .getBoundingClientRect();
            const pane = document
              .querySelector(selector)
              .getBoundingClientRect();
            return {
              divider: main.left,
              dotCenter: dot.left + dot.width / 2,
              paneRight: pane.right,
              client: document.documentElement.clientWidth,
              window: innerWidth,
              appWidth: parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue(
                  "--app-w"
                )
              ),
              border: parseFloat(
                getComputedStyle(document.getElementById("text"))
                  .borderLeftWidth
              ),
            };
          }, paneSelector);
          if (viewport.width >= 1024) {
            expect(geometry.border).toBe(1);
            expect(
              Math.abs(geometry.divider - geometry.dotCenter)
            ).toBeLessThanOrEqual(1);
            expect(
              Math.abs(geometry.divider - geometry.paneRight)
            ).toBeLessThanOrEqual(1);
          }
          expect(geometry.appWidth).toBe(geometry.client);
          expect(geometry.window - geometry.client).toBeGreaterThan(0);
          result.measurements.push({
            kind: "divider-with-scrollbar",
            ...geometry,
          });
        }
      );
      await step(
        result,
        "figure citations are bold nonlinks; repaired adjacent citations remain separated",
        async () => {
          const references = await page
            .locator(".figure-ref")
            .evaluateAll((nodes) =>
              nodes.map((node) => ({
                tag: node.tagName,
                link: !!node.closest("a,button,[role=button]"),
                weight: parseInt(getComputedStyle(node).fontWeight),
                decoration: getComputedStyle(node).textDecorationLine,
              }))
            );
          expect(references.length).toBeGreaterThan(20);
          for (const reference of references) {
            expect(reference.tag).toBe("STRONG");
            expect(reference.link).toBe(false);
            expect(reference.weight).toBeGreaterThanOrEqual(600);
            expect(reference.decoration).toBe("none");
          }
          const flourens = page.locator(
            '[data-paragraph-id="history-section-where-is-my-mind-p11"]'
          );
          await expect(flourens.locator(".citation-ref")).toHaveText([
            "8",
            ",19",
          ]);
        }
      );
      await step(
        result,
        "each breakout keeps its own artwork out of the pinned main figure pane",
        async () => {
          for (const box of boxes) {
            const locator = page.locator(`[data-breakout-box="${box.id}"]`);
            await locator.scrollIntoViewIfNeeded();
            const geometry = await locator.evaluate((element) => {
              const r = element.getBoundingClientRect();
              return { top: r.top + scrollY, bottom: r.bottom + scrollY };
            });
            await scrollTo(page, geometry.top - 80);
            await assertNoBoxLeakage(page);
            await noOverflow(page);
            await shot(page, result, box.slug);
            await scrollTo(page, geometry.bottom - viewport.height / 2 + 5);
            await assertNoBoxLeakage(page);
          }
        }
      );
      await step(
        result,
        "every published Explore part is offered by name inside its box",
        async () => {
          for (const part of exploreParts) {
            const card = page.locator(
              `[data-breakout-box="${part.section_id}"] [data-explore="${part.id}"]`
            );
            await expect(card, part.id).toHaveCount(1);
            await expect(
              card.locator(".xc-title, .rp-title"),
              part.id
            ).toHaveText(part.content.explore.title);
            // Read sideways (a rail part, OPENBRAIN-163/187) or folded
            // behind its button: either way the part's text is in the page
            // under its own name.
            const rail = await card.evaluate((element) =>
              element.hasAttribute("data-rail-part")
            );
            if (!rail)
              await expect(
                card.locator("button.xc-btn"),
                part.id
              ).toHaveAttribute("aria-expanded", "false");
            result.measurements.push({
              kind: "explore-part",
              id: part.id,
              title: part.content.explore.title,
              rail,
            });
          }
        }
      );
      await step(
        result,
        "each picture in a breakout box shows once (OPENBRAIN-187)",
        async () => {
          for (const box of boxes) {
            const sources = await page
              .locator(`[data-breakout-box="${box.id}"] img`)
              .evaluateAll((imgs) =>
                imgs
                  // A gallery's thumbnails and grid tiles repeat its slides
                  // by design; an uploaded widget draws its own.
                  .filter(
                    (img) =>
                      !img.closest(
                        ".figimg-thumbnails, .figimg-grid, .wb-stage, iframe"
                      )
                  )
                  .map((img) => new URL(img.src).pathname)
              );
            const twice = sources.filter((src, i) => sources.indexOf(src) < i);
            expect(twice, `${box.slug} shows a picture twice`).toEqual([]);
          }
        }
      );
      await step(
        result,
        "published widget blocks mount in the prose and the uploaded widget draws as its paragraph's figure",
        async () => {
          for (const { paragraph, block } of widgetBlocks) {
            const band = page.locator(
              `[data-widget-breakout="${block.widgetId}"]`
            );
            await expect(band, block.widgetId).toHaveCount(1);
            await expect(band).toHaveClass(new RegExp(`wb--${block.kind}`));
            await expect(band).toHaveAttribute(
              "data-timeline-id",
              paragraph.id
            );
            await band.scrollIntoViewIfNeeded();
            // A band in the chapter's text has no "Breakout box" kicker; one
            // inside a box keeps it (OPENBRAIN-190).
            const inBox = paragraph.section_id.includes("-box-");
            const kicker = block.kicker || (inBox ? "Breakout box" : "");
            const kickerEl = page.locator(
              `.wb-body:has([data-widget-stage="${block.widgetId}"]) .wb-kicker`
            );
            if (kicker) await expect(kickerEl).toHaveText(kicker);
            else await expect(kickerEl).toHaveCount(0);
            if (block.kind === "inline") {
              // At desktop widths the stage is teleported out of the prose
              // column, so it is found by widget, not under the band.
              const stage = page.locator(
                `[data-widget-stage="${block.widgetId}"]`
              );
              await expect(stage, block.widgetId).toHaveCount(1);
              await expect(
                stage.locator(".wb-stage-placeholder, .wb-missing"),
                `${block.widgetId} must mount its view`
              ).toHaveCount(0, { timeout: 20000 });
              await expect
                .poll(() =>
                  stage.evaluate(
                    (element) => element.getBoundingClientRect().height
                  )
                )
                .toBeGreaterThan(100);
            }
            await noOverflow(page);
            await shot(page, result, `widget-${block.widgetId}`);
          }
          for (const { animation, upload } of figureWidgets) {
            const key = animation.animation_key;
            const trigger = page.locator(
              `#trigger${key[0].toUpperCase()}${key.slice(1)}`
            );
            await expect(trigger, key).toHaveCount(1);
            const top = await trigger.evaluate(
              (element) => element.getBoundingClientRect().top + scrollY
            );
            // Its paragraph's first lines at the reading line: the pane shows
            // it there, and below 1024px the figure is in the text.
            await scrollTo(page, top + 5 - viewport.height / 2);
            const frame =
              viewport.width >= 1024
                ? page.locator(`${paneSelector} iframe.widget-frame`)
                : trigger.locator("iframe.widget-frame");
            await expect(frame, upload.slug).toHaveCount(1, { timeout: 20000 });
            await expect(frame).toHaveAttribute("title", upload.title);
            // Below 1024px the figure is a band in the text, under the
            // record's own kicker (Loewi's "Otto's dream experiment",
            // OPENBRAIN-190).
            if (viewport.width < 1024) {
              const kicker = trigger.locator(".wb-kicker");
              if (animation.config?.kicker)
                await expect(kicker).toHaveText(animation.config.kicker);
              else await expect(kicker).toHaveCount(0);
            }
            await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
            await expect(frame).toBeVisible();
            // The committed copy ran: the frame has a drawn document, and the
            // reader's "isn't available yet" note is nowhere.
            await expect
              .poll(() => frame.contentFrame().locator("body *").count(), {
                timeout: 20000,
              })
              .toBeGreaterThan(5);
            await expect(page.locator(".uw-note, .iw-missing")).toHaveCount(0);
            await noOverflow(page);
            await shot(page, result, `figure-widget-${upload.slug}`);
          }
        }
      );
      await step(
        result,
        "the Penfield binder opens full screen with the screen to itself, and Escape pressed inside it closes the dialog",
        async () => {
          // OPENBRAIN-178. The expand button under the band opens a fresh
          // copy of the upload in the dialog; the bridge tells it so.
          const id = "upload:history-penfield-binder";
          if (!widgetBlocks.some(({ block }) => block.widgetId === id)) return;
          const band = page
            .locator(`[data-widget-stage="${id}"]`)
            .locator("xpath=ancestor::div[contains(@class,'wb-body')][1]");
          const expand = band.locator(".wb-btn--expand");
          await expect(expand).toHaveCount(1);
          // The band at the top of the screen, as a reader lands on it.
          await scrollTo(
            page,
            (await band.evaluate(
              (element) => element.getBoundingClientRect().top + scrollY
            )) - 64
          );
          await expand.click();
          const frame = page.locator(".demo-panel iframe.widget-frame");
          await expect(frame).toHaveCount(1, { timeout: 20000 });
          const inner = frame.contentFrame();
          await expect(inner.locator("html")).toHaveAttribute(
            "data-ob-fullscreen",
            "",
            { timeout: 20000 }
          );
          await expect(inner.locator("#tabs .tab")).toHaveCount(7);
          // Its heading and source line are not drawn, and no tab sits under
          // the dialog's Close button.
          const close = await page.locator(".demo-close").boundingBox();
          const at = await frame.boundingBox();
          const drawn = await inner.locator("#binder").evaluate(() => {
            const box = (node) => {
              const r = node.getBoundingClientRect();
              return [r.left, r.top, r.right, r.bottom];
            };
            return {
              head: box(document.querySelector(".head")),
              cap: box(document.querySelector(".cap")),
              tabs: [...document.querySelectorAll("#tabs .tab")].map(box),
            };
          });
          for (const [left, top, right, bottom] of [drawn.head, drawn.cap]) {
            expect(right - left).toBeLessThanOrEqual(1);
            expect(bottom - top).toBeLessThanOrEqual(1);
          }
          for (const [left, top, right, bottom] of drawn.tabs)
            expect(
              left + at.x < close.x + close.width &&
                right + at.x > close.x &&
                top + at.y < close.y + close.height &&
                bottom + at.y > close.y,
              "a tab under the Close button"
            ).toBe(false);
          await inner.locator("#tabs .tab").first().click();
          await expect(inner.locator("#binder")).toHaveAttribute(
            "data-open",
            "true"
          );
          await noOverflow(page);
          await shot(page, result, "binder-full-screen");
          // Focus is inside the sandboxed frame now: Escape still closes.
          await page.keyboard.press("Escape");
          await expect(page.locator(".demo-panel")).toHaveCount(0);
          await expect(expand).toBeFocused();
        }
      );
      await step(
        result,
        "Broca and Fritsch figures survive their actual prose intervals and clear at the next barrier",
        async () => {
          if (viewport.width >= 1024) {
            await timing(page, result, 9);
            await timing(page, result, 10);
          } else {
            for (const number of [9, 10]) {
              const inline = page.locator(
                `#triggerAnimationFoundationsFig${number} .fig-pane`
              );
              await inline.scrollIntoViewIfNeeded();
              await expect(inline).toBeVisible();
              await expect(inline.locator(".fig-label")).toHaveText(
                `FIG ${String(number).padStart(2, "0")}`
              );
              await shot(page, result, `inline-figure-${number}`);
            }
          }
        }
      );
      await step(
        result,
        "real navigation drawer nests every box heading under its authored section",
        async () => {
          await page
            .getByRole("button", { name: "Open chapter menu", exact: true })
            .click();
          const drawer = page.getByRole("dialog", {
            name: "Navigation",
            exact: true,
          });
          await expect(drawer).toBeVisible();
          for (const box of boxes) {
            const button = drawer.getByRole("button", {
              name: box.title,
              exact: true,
            });
            await expect(button).toHaveClass(/outline-subsection/);
            const parentTitle = fixture.sections.find(
              (s) => s.id === box.parent_section_id
            ).title;
            await expect(
              button.locator("..").locator(".outline-section")
            ).toContainText(parentTitle);
          }
          await shot(page, result, "navigation-outline");
          await drawer
            .getByRole("button", { name: boxes[0].title, exact: true })
            .click();
          await expect(drawer).toHaveCount(0);
          await expect(page.locator(`#${boxes[0].id}`)).toBeInViewport();
          await noOverflow(page);
        }
      );
      await step(
        result,
        "actual overview navigation and browser Back/Forward remount one clean reader",
        async () => {
          await page
            .getByRole("link", { name: "Chapter overview", exact: true })
            .click();
          await expect(page).toHaveURL(/#\/chapter\/1$/);
          await expect(page.locator(".chapter-reader")).toHaveCount(0);
          await page.goBack();
          await expect(page).toHaveURL(
            /#\/chapter\/1\/foundations-of-neuroscience$/
          );
          await readerReady(page);
          await expect(page.locator("#text")).toHaveCount(1);
          await expect(page.locator("#reader-stage-layer")).toHaveCount(1);
          await assertPlacements(page, result);
          await page.goForward();
          await expect(page).toHaveURL(/#\/chapter\/1$/);
          await expect(page.locator(".chapter-reader")).toHaveCount(0);
          await page.goBack();
          await readerReady(page);
          if (viewport.width >= 1024) await timing(page, result, 9);
          await assertNoBoxLeakage(page);
          await shot(page, result, "returned-reader");
        }
      );
      await step(
        result,
        "no missing assets, runtime errors, external requests, writes or leaked dialogs",
        async () => {
          await expect(page.getByRole("dialog")).toHaveCount(0);
          await noOverflow(page);
          expect(result.errors).toEqual([]);
          expect(result.blockedRequests).toEqual([]);
        }
      );
      result.status = "passed";
    } catch (error) {
      failures++;
      result.status = "failed";
      result.failure = {
        step: result.currentStep,
        message: error.message,
        stack: error.stack,
      };
      console.error(`${viewport.width}: ${result.currentStep}\n${error.stack}`);
      await shot(page, result, "failure").catch(() => {});
      await writeFile(
        path.join(output, `${viewport.width}-failure.txt`),
        (await page.locator("body").innerText()).slice(0, 25000)
      ).catch(() => {});
    } finally {
      await context.tracing.stop({
        path: path.join(output, `${viewport.width}-trace.zip`),
      });
      await context.close();
      if (
        (result.errors.length || result.blockedRequests.length) &&
        result.status !== "failed"
      ) {
        result.status = "failed";
        failures++;
      }
      await writeFile(
        path.join(output, "manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    }
  }
} catch (error) {
  failures++;
  manifest.infrastructureFailure = error.stack;
} finally {
  await browser?.close();
  manifest.status = failures
    ? "failed"
    : "passed-assertions-awaiting-visual-review";
  await writeFile(
    path.join(output, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
if (failures) process.exitCode = 1;
else
  console.log(
    `Complete-reader assertions passed at ${manifest.cases.length} widths. Review screenshots before visual signoff.`
  );
