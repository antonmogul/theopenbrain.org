import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

// Deliberately hosted-only. Do not retry a local browser launch in restricted
// executors. Preparing assets, building and checking syntax remain local-safe.
assert.equal(
  process.env.GITHUB_ACTIONS,
  "true",
  "Run this browser lane on GitHub Actions; local browser execution is not supported."
);
const baseUrl = process.env.STORYBOOK_URL || "http://127.0.0.1:6010";
assert.equal(
  new URL(baseUrl).origin,
  "http://127.0.0.1:6010",
  "Only the isolated loopback Storybook server is permitted"
);
const output = "history-fixture-browser-artifacts";
await mkdir(output, { recursive: true });
const source = JSON.parse(
  await readFile("src/views/__stories__/historyFixtureData.json", "utf8")
);
const penfield = JSON.parse(
  await readFile("src/data/history/penfieldAppendix.json", "utf8")
);
const phrenology = JSON.parse(
  await readFile("src/data/history/phrenologyAppendix.json", "utf8")
);
const assetManifest = JSON.parse(
  await readFile("storybook-static/history-fixture-assets.json", "utf8")
);
await writeFile(
  path.join(output, "assets.json"),
  `${JSON.stringify(assetManifest, null, 2)}\n`
);

const manifest = {
  schemaVersion: 1,
  commit: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID,
  createdAt: new Date().toISOString(),
  boundary: source.boundary,
  limitations: [
    "Reader-shaped fixture, not the complete ChapterView/TextComp, live chapter route, production migration state, authentication or live AI.",
    "The 3D view is real and the dialog is real; their fixture composition does not assert a published 3D embed placement.",
    "Chromium only, with isolated software WebGL. Screenshots require human inspection; passing DOM assertions is not a visual signoff.",
    "Source-content parity here proves UI selection of local authoritative fixtures, not a fresh manuscript audit.",
    "The offline AI preview checks scripted labels, an explicit no-local-voices boundary and the actual downloaded text file. It does not test native audio output or generated answers.",
  ],
  networkPolicy:
    "Only GET/HEAD to http://127.0.0.1:6010 is allowed, excluding Supabase API routes. External requests, writes and every WebSocket are blocked and fail the run. Service workers are disabled.",
  cases: [],
};
const scenarios = [
  {
    name: "cabinet",
    story: "chapter-history-fixture-browser-qa--cabinet",
    run: testCabinet,
  },
  {
    name: "skull-2d",
    story: "chapter-history-fixture-browser-qa--skull-2-d",
    run: testSkull,
  },
  {
    name: "skull-3d",
    story: "chapter-history-fixture-browser-qa--skull-3-d",
    run: testSkull,
  },
  {
    name: "figure-6",
    story: "chapter-history-fixture-browser-qa--figure-6-gallery",
    run: testGallery,
  },
  {
    name: "offline-preview",
    story: "student-ai-tutor-aitutorpreview--default",
    run: testOfflinePreview,
  },
];
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

async function snapshot(state, name) {
  const file = `${state.id}-${name}.png`;
  await state.page.screenshot({
    path: path.join(output, file),
    fullPage: false,
    animations: "disabled",
  });
  state.result.screenshots.push({ state: name, file, viewportOnly: true });
}
async function step(state, name, fn) {
  state.result.currentStep = name;
  const start = Date.now();
  await fn();
  state.result.steps.push({
    name,
    milliseconds: Date.now() - start,
    status: "passed",
  });
  console.log(`${state.id}: ${name}`);
}
async function scrollStyle(page) {
  return page.evaluate(() => [
    document.documentElement.style.overflow,
    document.body.style.overflow,
  ]);
}
async function expectLock(page, locked, original) {
  await expect
    .poll(() => scrollStyle(page))
    .toEqual(locked ? ["hidden", "hidden"] : original);
}
async function noSidewaysScroll(page) {
  const sizes = await page.evaluate(() => ({
    width: innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(sizes.html, "document horizontal overflow").toBeLessThanOrEqual(
    sizes.width + 1
  );
  expect(sizes.body, "body horizontal overflow").toBeLessThanOrEqual(
    sizes.width + 1
  );
}
async function imageReady(locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(
      () =>
        locator.evaluate((image) => image.complete && image.naturalWidth > 0),
      { timeout: 15_000 }
    )
    .toBe(true);
}
async function bounds(locator, normalizeScroll = false) {
  return locator.evaluate((element, normalize) => {
    const rect = element.getBoundingClientRect();
    const host = element.closest(".demo-body");
    return {
      x: rect.x,
      y: rect.y + (normalize ? (host?.scrollTop || 0) + window.scrollY : 0),
      width: rect.width,
      height: rect.height,
    };
  }, normalizeScroll);
}
function sameBounds(
  before,
  after,
  label,
  dimensions = ["x", "y", "width", "height"]
) {
  for (const key of dimensions)
    expect(
      Math.abs(before[key] - after[key]),
      `${label}: ${key} changed`
    ).toBeLessThanOrEqual(1);
}
async function viewportDialog(page, selector = ".demo-panel") {
  const viewport = page.viewportSize();
  // Allow the real dialog's entry transition to settle before measuring.
  await expect
    .poll(
      async () => {
        const box = await bounds(page.locator(selector));
        return Math.max(
          Math.abs(box.x),
          Math.abs(box.y),
          Math.abs(box.width - viewport.width),
          Math.abs(box.height - viewport.height)
        );
      },
      { message: "dialog must fill viewport after its entry transition" }
    )
    .toBeLessThanOrEqual(1);
}
function openerFor(state) {
  return state.page.getByRole("button", {
    name:
      state.name === "figure-6"
        ? "Expand to full screen"
        : state.name === "skull-3d"
          ? "Open 3D comparison"
          : "Open interactive",
    exact: true,
  });
}
async function openDialog(state) {
  const opener = openerFor(state);
  await opener.focus();
  await opener.press("Enter");
  const dialog = state.page.locator(".demo-panel");
  await expect(dialog).toBeVisible();
  await expectLock(state.page, true);
  await viewportDialog(state.page);
  return dialog;
}
async function closeDialog(state) {
  await state.page
    .locator(".demo-panel")
    .getByRole("button", { name: "Close demo", exact: true })
    .click();
  await expect(state.page.locator(".demo-panel")).toHaveCount(0);
  await expectLock(state.page, false, state.originalScroll);
  await expect(openerFor(state)).toBeFocused();
}
async function focusContained(page, dialog, cycles = 8) {
  for (let index = 0; index < cycles; index++) {
    await page.keyboard.press(index < cycles / 2 ? "Tab" : "Shift+Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement)
      ),
      "keyboard focus escaped active dialog"
    ).toBe(true);
  }
}
async function historyDismissal(state) {
  const { page } = state;
  // Real browser same-document history: Back and Forward each dismiss an
  // already-open overlay. Memory-router navigation alone would not test this.
  await page.evaluate(() => {
    history.pushState(
      { fixture: "first" },
      "",
      `${location.pathname}${location.search}#fixture-first`
    );
    history.pushState(
      { fixture: "second" },
      "",
      `${location.pathname}${location.search}#fixture-second`
    );
  });
  await openDialog(state);
  if (state.name === "figure-6")
    await page.locator(".demo-panel .figimg-thumb").first().click();
  await page.goBack();
  await expect(page).toHaveURL(/#fixture-first$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectLock(page, false, state.originalScroll);
  await openDialog(state);
  if (state.name === "figure-6")
    await page.locator(".demo-panel .figimg-thumb").first().click();
  await page.goForward();
  await expect(page).toHaveURL(/#fixture-second$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectLock(page, false, state.originalScroll);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !document.activeElement?.closest('[role="dialog"]')
    )
  ).toBe(true);
}

async function testCabinet(state) {
  const { page } = state;
  const cabinet = page.locator(".cabinet");
  await step(
    state,
    "keyboard breakout, full viewport, scroll lock and focus trap",
    async () => {
      const dialog = await openDialog(state);
      await expect(cabinet).toHaveAttribute("data-phase", "closed");
      await expect(cabinet.locator("[data-id]")).toHaveCount(7);
      await expect(
        dialog.getByRole("button", { name: "Close demo" })
      ).toBeFocused();
      await focusContained(page, dialog, 18);
      await snapshot(state, "drawer");
    }
  );
  await step(
    state,
    "source map click shows the corresponding original stimulation event",
    async () => {
      const folder = cabinet.locator('[data-id="rw"]');
      await folder.focus();
      await folder.press("Enter");
      await expect(cabinet).toHaveAttribute(
        "data-animation-mode",
        state.viewport.width > 760 && !state.reduced
          ? "storyboard"
          : "immediate"
      );
      if (state.viewport.width > 760 && !state.reduced) {
        // Preserve actual intermediate GSAP frames for storyboard review.
        // These are timed observations, not assertions about frame contents.
        for (const [delay, name] of [
          [180, "cabinet-lift"],
          [420, "cabinet-quarter-turn"],
          [850, "cabinet-hinged-cover"],
        ]) {
          await page.waitForTimeout(delay);
          await snapshot(state, name);
        }
      }
      await expect(cabinet).toHaveAttribute("data-phase", "open", {
        timeout: 8_000,
      });
      await expect(cabinet.locator(".casefile__title")).toBeFocused();
      await imageReady(cabinet.locator(".brain-map img"));
      const sourceCase = penfield.cases.find((record) => record.id === "rw");
      const point = sourceCase.points.find((record) => record.id === "24");
      await cabinet
        .getByRole("button", { name: "Read point 24 for R.W.", exact: true })
        .click();
      await expect(cabinet.locator(".note")).toHaveCount(point.events.length);
      for (const event of point.events)
        await expect(
          cabinet.locator(`[data-event="${event.id}"] .note__text`)
        ).toHaveText(event.text);
      await expect(cabinet.locator('[data-point-option="24"]')).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      await snapshot(state, "rw-point-24");
      await cabinet
        .getByRole("button", { name: "Enlarge map", exact: true })
        .click();
      await expect(cabinet.locator(".map-zoom")).toContainText("150%");
      await cabinet
        .getByRole("button", { name: "Reduce map magnification", exact: true })
        .click();
      await expect(cabinet.locator(".map-zoom")).toContainText("100%");
      await page.keyboard.press("Escape");
      await expect(cabinet).toHaveAttribute("data-phase", "closed", {
        timeout: 8_000,
      });
      await expect(folder).toBeFocused();
      await expect(page.locator(".demo-panel")).toBeVisible();
      await expectLock(page, true);
    }
  );
  await step(
    state,
    "repeated opening, interruption and queued-case cancellation",
    async () => {
      const folder = cabinet.locator('[data-id="ge"]');
      for (let repeat = 0; repeat < 2; repeat++) {
        await folder.focus();
        await folder.press("Enter");
        // No delay: exercise Escape before/at the start of the spatial timeline.
        await page.keyboard.press("Escape");
        await expect(cabinet).toHaveAttribute("data-phase", "closed", {
          timeout: 8_000,
        });
        await expect(folder).toBeFocused();
      }
      await folder.press("Enter");
      await expect(cabinet).toHaveAttribute("data-phase", "open", {
        timeout: 8_000,
      });
      if (!state.reduced && state.viewport.width > 760) {
        await cabinet
          .getByRole("navigation", { name: "Switch patient case" })
          .getByRole("button", { name: "3 · R.W.", exact: true })
          .click();
        await expect(cabinet).toHaveAttribute("data-phase", "closing");
        await page.keyboard.press("Escape");
        await expect(cabinet).toHaveAttribute("data-phase", "closed", {
          timeout: 8_000,
        });
        await expect(cabinet.locator(".casefile")).toHaveCount(0);
        await folder.focus();
        await folder.press("Enter");
        await expect(cabinet).toHaveAttribute("data-phase", "open", {
          timeout: 8_000,
        });
      }
      await cabinet
        .getByRole("button", { name: "Back to cases", exact: true })
        .click();
      await expect(cabinet).toHaveAttribute("data-phase", "closed", {
        timeout: 8_000,
      });
      await expect(folder).toBeFocused();
    }
  );
  if (state.viewport.width === 1440 && state.reduced) {
    await step(
      state,
      "all seven cases and 47 point selections retain all 82 original events",
      async () => {
        let points = 0;
        let events = 0;
        for (const record of penfield.cases) {
          const folder = cabinet.locator(`[data-id="${record.id}"]`);
          await folder.focus();
          await folder.press("Enter");
          await expect(cabinet).toHaveAttribute("data-phase", "open");
          await imageReady(cabinet.locator(".brain-map img"));
          for (const point of record.points) {
            await cabinet.locator(`[data-point-option="${point.id}"]`).click();
            await expect(cabinet.locator(".note")).toHaveCount(
              point.events.length
            );
            for (const event of point.events)
              await expect(
                cabinet.locator(`[data-event="${event.id}"] .note__text`)
              ).toHaveText(event.text);
            if (!point.hotspots.length) {
              await expect(
                cabinet.locator(`[data-point="${point.id}"]`)
              ).toHaveCount(0);
              await expect(
                cabinet.locator(".transcript .source-note")
              ).toHaveText(point.mapNote);
            }
            points++;
            events += point.events.length;
          }
          await cabinet
            .getByRole("button", { name: "Back to cases", exact: true })
            .click();
          await expect(cabinet).toHaveAttribute("data-phase", "closed");
        }
        expect(points).toBe(47);
        expect(events).toBe(82);
        state.result.sourceSelections = { cases: 7, points, events };
      }
    );
  }
  await step(state, "outer dismissal restores reader focus and scroll", () =>
    closeDialog(state)
  );
  await step(
    state,
    "real browser Back and Forward dismiss overlays without stale locks",
    () => historyDismissal(state)
  );
}

async function assertFaculty(state, number, widget) {
  const record = phrenology.faculties.find((item) => item.n === number);
  assert(record, `Unknown source faculty ${number}`);
  const card = widget.locator(".card");
  await expect(card).toBeVisible();
  await expect(card.locator(".card__text")).toHaveCount(record.quotes.length);
  for (const quote of record.quotes)
    await expect(
      card.locator(`[data-source-block="${quote.sourceBlock}"]`)
    ).toHaveText(quote.text);
  await expect(card.locator(".source-image")).toHaveCount(record.images.length);
  for (const image of record.images)
    await expect(card.locator(`img[src="${image.src}"]`)).toHaveAttribute(
      "alt",
      image.caption
    );
}

async function testSkull(state) {
  const { page } = state;
  const is3d = state.name === "skull-3d";
  const widget = page.locator(is3d ? ".phreno3d" : ".phreno");
  const stage = widget.locator(is3d ? ".stage__canvas" : ".skull__img");
  await step(
    state,
    "real skull assets load inside viewport dialog",
    async () => {
      await openDialog(state);
      await expect(widget).toBeVisible();
      if (is3d) {
        await expect(widget.locator(".stage__hint")).toBeVisible({
          timeout: 30_000,
        });
        await expect(
          widget.getByText("The 3D skull could not be loaded.")
        ).toHaveCount(0);
        expect(
          await stage.evaluate(
            (canvas) => canvas.width > 100 && canvas.height > 100
          )
        ).toBe(true);
        if (state.viewport.width <= 760) {
          const hint = await widget.locator(".stage__hint").boundingBox();
          const instruction = await widget
            .locator(".card-instruction")
            .boundingBox();
          assert(
            hint && instruction,
            "Mobile skull instructions must be rendered"
          );
          expect(hint.y + hint.height).toBeLessThanOrEqual(instruction.y);
        }
      } else {
        await imageReady(stage);
        await expect(widget.locator(".region").first()).toBeVisible();
      }
      // The real entrance/reveal finishes in <=1.5s, independently of fetch time.
      await page.waitForTimeout(1_600);
      await snapshot(state, "skull-unselected");
    }
  );
  await step(state, "source region click and stable skull bounds", async () => {
    let target;
    let number;
    if (is3d) {
      target = widget.locator(".marker:visible").first();
      await expect(target).toBeVisible();
      number = Number(
        (await target.getAttribute("aria-label")).match(/\d+/)[0]
      );
    } else {
      target = widget.locator(".region").first();
      number = Number(
        (await target.getAttribute("aria-label")).match(/^\d+/)[0]
      );
    }
    await target.focus();
    const before = await bounds(stage, true);
    if (is3d) await target.click();
    else {
      // Click the verified number anchor inside the SVG shape, not its possibly
      // empty bounding-box centre or a synthetic DOM click.
      const circle = await target.locator(".region-label circle").boundingBox();
      assert(circle, "A mapped region needs its verified label anchor");
      await page.mouse.click(
        circle.x + circle.width / 2,
        circle.y + circle.height / 2
      );
    }
    await assertFaculty(state, number, widget);
    await page.waitForTimeout(400);
    const after = await bounds(stage, true);
    sameBounds(before, after, "skull after faculty selection");
    state.result.measurements.push({
      name: "skull-selection",
      faculty: number,
      before,
      after,
      scrollNormalized: true,
    });
    await snapshot(state, "skull-selected");
    await page.keyboard.press("Escape");
    await expect(widget.locator(".card")).toHaveCount(0);
    await expect(target).toBeFocused();
    await expect(page.locator(".demo-panel")).toBeVisible();
    await expectLock(page, true);
    if (!is3d) {
      await target.press("ArrowRight");
      expect(
        await widget
          .locator(".region")
          .evaluateAll((regions) => regions.includes(document.activeElement))
      ).toBe(true);
      await page.keyboard.press("Enter");
      await expect(widget.locator(".card")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(widget.locator(".card")).toHaveCount(0);
    }
  });
  await step(
    state,
    "unmapped faculty remains source-readable without an invented hotspot",
    async () => {
      const picker = widget.getByRole("combobox", { name: "Browse a faculty" });
      await picker.selectOption("22");
      await assertFaculty(state, 22, widget);
      await expect(
        widget.getByRole("button", {
          name: is3d ? "Faculty 22" : /^22\./,
          exact: is3d,
        })
      ).toHaveCount(0);
      await picker.focus();
      await page.keyboard.press("Escape");
      await expect(widget.locator(".card")).toHaveCount(0);
    }
  );
  await step(state, "all skull viewpoints remain interactive", async () => {
    for (const name of ["Lateral", "Posterior", "Anterior"]) {
      await widget.getByRole("button", { name, exact: true }).click();
      if (is3d)
        await expect(
          widget.getByRole("button", { name, exact: true })
        ).toHaveAttribute("aria-pressed", "true");
      else
        await expect(stage).toHaveAttribute(
          "src",
          new RegExp(`skull-${name.toLowerCase()}\\.png$`)
        );
      await page.waitForTimeout(1_100);
      if (state.viewport.width === 1440)
        await snapshot(state, `skull-${name.toLowerCase()}`);
    }
  });
  await step(state, "outer dismissal restores reader focus and scroll", () =>
    closeDialog(state)
  );
  await step(
    state,
    "real browser Back and Forward clean up skull overlays",
    () => historyDismissal(state)
  );
}

async function testGallery(state) {
  const { page } = state;
  await step(
    state,
    "all ten authentic Figure 6 plates render in reader frame",
    async () => {
      await expect(page.locator(".history-fixture .figimg-thumb")).toHaveCount(
        10
      );
      for (const image of await page
        .locator(".history-fixture .figimg-thumb-img")
        .all())
        await imageReady(image);
      await snapshot(state, "gallery-reader");
    }
  );
  await step(
    state,
    "nested full-viewport gallery, focus trap and shared scroll lock",
    async () => {
      const outer = await openDialog(state);
      await outer.locator(".figimg-thumb").first().click();
      const viewer = page.locator(".figview");
      await expect(viewer).toBeVisible();
      await viewportDialog(page, ".figview");
      await expect(page.getByRole("dialog")).toHaveCount(2);
      await expect(
        viewer.getByRole("button", { name: "Close viewer" })
      ).toBeFocused();
      await focusContained(page, viewer, 30);
      await expectLock(page, true);
    }
  );
  await step(
    state,
    "gallery arrows stay fixed across all ten unequal captions",
    async () => {
      const viewer = page.locator(".figview");
      const next = viewer.getByRole("button", {
        name: "Next image",
        exact: true,
      });
      const previous = viewer.getByRole("button", {
        name: "Previous image",
        exact: true,
      });
      const before = {
        next: await bounds(next),
        previous: await bounds(previous),
      };
      for (let index = 0; index < source.images.length; index++) {
        await expect(viewer.locator(".figview-count")).toHaveText(
          `${index + 1} / 10`
        );
        await expect(viewer.locator(".figview-caption")).toHaveText(
          source.images[index].caption
        );
        await expect(viewer.locator(".figview-img")).toHaveAttribute(
          "src",
          source.images[index].src
        );
        await imageReady(viewer.locator(".figview-img"));
        const after = {
          next: await bounds(next),
          previous: await bounds(previous),
        };
        sameBounds(before.next, after.next, `next arrow at image ${index + 1}`);
        sameBounds(
          before.previous,
          after.previous,
          `previous arrow at image ${index + 1}`
        );
        state.result.measurements.push({
          name: "gallery-navigation",
          image: index + 1,
          ...after,
        });
        if ([0, 2, 9].includes(index))
          await snapshot(state, `gallery-image-${index + 1}`);
        await page.keyboard.press("ArrowRight");
      }
      await expect(viewer.locator(".figview-count")).toHaveText("1 / 10");
      await page.keyboard.press("ArrowLeft");
      await expect(viewer.locator(".figview-count")).toHaveText("10 / 10");
      await viewer
        .getByRole("button", { name: "Show image 3 of 10", exact: true })
        .click();
      await expect(viewer.locator(".figview-count")).toHaveText("3 / 10");
    }
  );
  await step(
    state,
    "Escape closes one layer at a time and restores each opener",
    async () => {
      await page.keyboard.press("Escape");
      await expect(page.locator(".figview")).toHaveCount(0);
      await expect(page.locator(".demo-panel")).toBeVisible();
      await expect(
        page.locator(".demo-panel .figimg-thumb").first()
      ).toBeFocused();
      await expectLock(page, true);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expectLock(page, false, state.originalScroll);
      await expect(openerFor(state)).toBeFocused();
    }
  );
  await step(
    state,
    "repeated nested open and close leaves no stale listeners",
    async () => {
      for (let repeat = 0; repeat < 2; repeat++) {
        await openDialog(state);
        await page.locator(".demo-panel .figimg-thumb").nth(repeat).click();
        await page
          .getByRole("button", { name: "Close viewer", exact: true })
          .click();
        await expect(page.locator(".figview")).toHaveCount(0);
        await expectLock(page, true);
        await closeDialog(state);
      }
    }
  );
  await step(
    state,
    "real browser Back and Forward dismiss both nested layers",
    () => historyDismissal(state)
  );
}

async function testOfflinePreview(state) {
  const { page } = state;
  const preview = page.getByRole("region", {
    name: "Offline chapter previews",
  });
  await step(
    state,
    "scripted preview labels and source reading are explicit",
    async () => {
      await expect(preview.locator(".preview-notice")).toContainText(
        "These scripted previews use the loaded chapter. They are not live AI."
      );
      await expect(preview.locator(".scripted-chat")).toContainText(
        "there are no generated answers or free-form prompts"
      );
      await expect(preview.getByRole("textbox")).toHaveCount(0);
      await expect(preview.locator(".source-excerpt")).toContainText(
        "Vision begins when photons are absorbed by photopigments in rods and cones."
      );
      await snapshot(state, "scripted-walkthrough");
    }
  );
  await step(
    state,
    "no local voices means no playback or speech calls",
    async () => {
      await preview
        .getByRole("button", { name: "Read aloud", exact: true })
        .click();
      await expect(preview).toContainText(
        "This is device text-to-speech, not AI narration."
      );
      await expect(preview.getByRole("status")).toHaveText(
        "No local-device voice is available. Remote voices are never used."
      );
      await expect(
        preview.getByRole("button", { name: "Play", exact: true })
      ).toHaveCount(0);
      const speech = await page.evaluate(() => ({
        supported: typeof window.SpeechSynthesisUtterance === "function",
        nativeVoices: window.__historyFixtureSpeech.nativeVoiceCounts(),
        fixtureLocalVoices: window.speechSynthesis
          .getVoices()
          .filter((voice) => voice.localService === true).length,
        speakCalls: window.__historyFixtureSpeech.speakCalls,
        speaking: window.speechSynthesis.speaking,
      }));
      expect(speech.fixtureLocalVoices).toBe(0);
      expect(speech.speakCalls).toBe(0);
      expect(speech.speaking).toBe(false);
      state.result.speech = {
        ...speech,
        boundary:
          "Native availability recorded, then the local-voice list is deliberately empty. No native audio playback is claimed.",
      };
      await snapshot(state, "no-local-voice");
    }
  );
  await step(
    state,
    "actual plain-text transcript download matches the displayed script",
    async () => {
      await preview
        .getByRole("button", { name: "Podcast format", exact: true })
        .click();
      await expect(preview).toContainText(
        "not an AI-generated episode or audio file"
      );
      const lines = await preview.locator(".transcript p").allTextContents();
      const downloaded = page.waitForEvent("download");
      await preview
        .getByRole("link", { name: "Download plain transcript", exact: true })
        .click();
      const download = await downloaded;
      expect(download.suggestedFilename()).toBe("chapter-podcast-preview.txt");
      const filename = `${state.id}-chapter-podcast-preview.txt`;
      await download.saveAs(path.join(output, filename));
      expect(await download.failure()).toBeNull();
      const contents = await readFile(path.join(output, filename), "utf8");
      expect(contents).toBe(lines.map((line) => line.trim()).join("\n\n"));
      expect(contents).toMatch(
        /^SCRIPTED PODCAST-FORMAT PREVIEW — NOT AI-GENERATED/
      );
      expect(contents).toContain("HOST: The Retina");
      expect(contents).toContain("HOST: Photoreceptors");
      expect(contents).toContain("HOST: Retinal Circuits");
      expect(contents).toContain("HOST: End of this scripted preview.");
      expect(contents).not.toMatch(/<[^>]+>/);
      expect(
        await page.evaluate(() => window.__historyFixtureSpeech.speakCalls)
      ).toBe(0);
      state.result.download = {
        file: filename,
        bytes: Buffer.byteLength(contents),
        sha256: createHash("sha256").update(contents).digest("hex"),
        type: "text/plain",
        audioFile: false,
      };
      await snapshot(state, "podcast-transcript");
    }
  );
}

let browser;
let failures = 0;
try {
  // SwiftShader makes the real 3D model available on GitHub's display-less
  // runner. This browser contains only repository fixtures and cannot send
  // external requests. It uses a fresh profile and no credentials.
  browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  for (const viewport of viewports) {
    for (const scenario of scenarios) {
      for (const reduced of scenario.name === "cabinet"
        ? [false, true]
        : [false]) {
        const id = `${scenario.name}-${viewport.width}-${reduced ? "reduced" : "motion"}`;
        const result = {
          id,
          story: scenario.story,
          viewport,
          reducedMotion: reduced,
          status: "running",
          screenshots: [],
          steps: [],
          measurements: [],
          errors: [],
          blockedRequests: [],
        };
        manifest.cases.push(result);
        const context = await browser.newContext({
          viewport,
          reducedMotion: reduced ? "reduce" : "no-preference",
          serviceWorkers: "block",
        });
        const page = await context.newPage();
        if (scenario.name === "offline-preview") {
          await page.addInitScript(() => {
            const synthesis = window.speechSynthesis;
            if (!synthesis)
              throw new Error(
                "Chromium speech API is missing; cannot exercise the no-local-voice contract"
              );
            const nativeVoices = synthesis.getVoices.bind(synthesis);
            window.__historyFixtureSpeech = {
              speakCalls: 0,
              nativeVoiceCounts: () => {
                const voices = nativeVoices();
                return {
                  total: voices.length,
                  local: voices.filter((voice) => voice.localService === true)
                    .length,
                };
              },
            };
            Object.defineProperty(synthesis, "getVoices", {
              configurable: true,
              value: () => [],
            });
            Object.defineProperty(synthesis, "speak", {
              configurable: true,
              value: () => {
                window.__historyFixtureSpeech.speakCalls++;
              },
            });
          });
        }
        page.setDefaultTimeout(15_000);
        const state = {
          id,
          name: scenario.name,
          page,
          result,
          viewport,
          reduced,
        };
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (
            (["http:", "https:"].includes(url.protocol) &&
              url.origin !== new URL(baseUrl).origin) ||
            !["GET", "HEAD"].includes(route.request().method()) ||
            /^\/(rest|auth|functions)\/v1\//.test(url.pathname)
          ) {
            result.blockedRequests.push({
              type: "http",
              origin: url.origin,
              method: route.request().method(),
            });
            await route.abort("blockedbyclient");
          } else await route.continue();
        });
        await context.routeWebSocket("**/*", (socket) => {
          result.blockedRequests.push({
            type: "websocket",
            origin: new URL(socket.url()).origin,
          });
          socket.close();
        });
        page.on("pageerror", (error) =>
          result.errors.push({ type: "pageerror", message: error.message })
        );
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
        try {
          await context.tracing.start({
            screenshots: true,
            snapshots: true,
            sources: true,
          });
          await step(
            state,
            "load local fixture, real fonts and responsive reader frame",
            async () => {
              const response = await page.goto(
                `${baseUrl}/iframe.html?id=${scenario.story}&viewMode=story&globals=reduceMotion:!${reduced}`,
                { waitUntil: "networkidle", timeout: 30_000 }
              );
              expect(response?.ok()).toBe(true);
              await expect(
                page.locator(
                  scenario.name === "offline-preview"
                    ? ".offline-preview"
                    : ".history-fixture"
                )
              ).toBeVisible();
              await page.evaluate(() => document.fonts.ready);
              state.originalScroll = await scrollStyle(page);
              await noSidewaysScroll(page);
              await snapshot(state, "reader");
            }
          );
          await scenario.run(state);
          await step(
            state,
            "no runtime errors, missing assets, external requests or leaked dialogs",
            async () => {
              await expect(page.getByRole("dialog")).toHaveCount(0);
              await noSidewaysScroll(page);
              expect(result.blockedRequests).toEqual([]);
              expect(result.errors).toEqual([]);
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
          console.error(`${id}: ${result.currentStep}\n${error.stack}`);
          try {
            await snapshot(state, "failure");
            await writeFile(
              path.join(output, `${id}-failure.txt`),
              (await page.locator("body").innerText()).slice(0, 25_000)
            );
          } catch (captureError) {
            result.errors.push({
              type: "capture",
              message: captureError.message,
            });
          }
        } finally {
          try {
            await context.tracing.stop({
              path: path.join(output, `${id}-trace.zip`),
            });
          } catch (traceError) {
            result.errors.push({ type: "trace", message: traceError.message });
            if (result.status !== "failed") {
              result.status = "failed";
              failures++;
            }
          }
          await context.close();
          if (
            (result.errors.length || result.blockedRequests.length) &&
            result.status !== "failed"
          ) {
            result.status = "failed";
            result.failure = {
              step: "context teardown",
              message:
                "Late runtime errors or blocked requests were recorded; see errors and blockedRequests.",
            };
            failures++;
          }
          await writeFile(
            path.join(output, "manifest.json"),
            `${JSON.stringify(manifest, null, 2)}\n`
          );
        }
      }
    }
  }
} catch (error) {
  failures++;
  manifest.infrastructureFailure = {
    message: error.message,
    stack: error.stack,
  };
  console.error(error.stack);
} finally {
  await browser?.close();
  manifest.completedAt = new Date().toISOString();
  manifest.status = failures
    ? "failed"
    : "passed-assertions-awaiting-visual-review";
  await writeFile(
    path.join(output, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]
    );
  const cards = manifest.cases
    .map(
      (result) =>
        `<section><h2>${escape(result.id)}: ${escape(result.status)}</h2>${result.failure ? `<pre>${escape(result.failure.step)}\n${escape(result.failure.message)}</pre>` : ""}<p>${result.steps.length} assertion groups completed · <a href="${escape(result.id)}-trace.zip">Playwright trace</a></p><div class="screens">${result.screenshots.map((shot) => `<figure><a href="${escape(shot.file)}"><img src="${escape(shot.file)}" loading="lazy" alt="${escape(result.id)} ${escape(shot.state)}"></a><figcaption>${escape(shot.state)}</figcaption></figure>`).join("")}</div></section>`
    )
    .join("\n");
  await writeFile(
    path.join(output, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>History fixture browser evidence</title><style>body{font:16px/1.5 system-ui;max-width:1500px;margin:2rem auto;padding:1rem;background:#f7f5f0;color:#222}pre{white-space:pre-wrap;background:#fee;padding:1rem}.screens{display:flex;gap:1rem;flex-wrap:wrap}figure{width:310px;margin:0 0 2rem}img{width:100%;border:1px solid #aaa}section{border-top:1px solid #aaa;padding-top:1rem}h1,h2{line-height:1.2}</style><h1>History fixture browser evidence</h1><p>Commit ${escape(manifest.commit)} · ${escape(manifest.status)}</p><p>${escape(manifest.boundary)}</p><p>DOM and layout assertions do not replace human screenshot review. No production database or authentication was exercised.</p><p><a href="manifest.json">Machine-readable assertions, measurements and errors</a> · <a href="assets.json">Source asset hashes</a></p><ul>${manifest.limitations.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>${cards}</html>`
  );
}
if (failures) process.exitCode = 1;
else
  console.log(
    `Passed assertions for ${manifest.cases.length} fixture cases. Inspect the screenshots before giving visual signoff.`
  );
