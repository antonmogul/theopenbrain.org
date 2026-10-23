/** G5 read-only authored-widget acceptance. No database or dev server needed.
 * node scripts/widget-narration-browser.mjs
 * G5_FIREFOX_EXECUTABLE=/path/to/firefox runs Firefox in addition to Chromium.
 * G5_ONLY_FIREFOX=1 limits the run to that engine. An unavailable browser is reported.
 * G5_ALLOW_AUDIO_CONTROL_FAILURE=1 continues layout/policy checks if a bare
 * unsandboxed decoder control fails; audio acceptance is explicitly INCONCLUSIVE.
 * Uses the actual reader CSP, widgetHost and upload in an HTTP-served srcdoc.
 * Artifacts: .superpowers/g5-browser (override G5_ARTIFACTS).
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { chromium, firefox } from "playwright";

const out = process.env.G5_ARTIFACTS || ".superpowers/g5-browser";
await mkdir(out, { recursive: true });
const read = (p) => readFile(p, "utf8");
const host = await import(
  `data:text/javascript;base64,${Buffer.from(await read("src/widgets/uploaded/widgetHost.js")).toString("base64")}`
);
const csp = (await read("index.html")).match(
  /http-equiv="Content-Security-Policy"\s+content="([^"]+)/
)[1];
const uploads = {
  loewi: await read("src/widgets/uploads/loewi-vagusstoff.html"),
  retina: await read("src/widgets/uploads/retina-center-surround.html"),
  baseline: (
    await read(
      "supabase/migrations/20261021030000_history_loewi_widget_fit.sql"
    )
  ).split("$w$")[1],
};
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/control") {
    const src = uploads.loewi.match(/"audio":"(data:audio[^" ]+)/)[1];
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      `<button id="control">Play bare audio control</button><script>document.querySelector("button").onclick=function(){window.controlAudio=new Audio(${JSON.stringify(src)});controlAudio.play();}</script>`
    );
    return;
  }
  const policy = url.searchParams.has("blocked")
    ? csp.replace("media-src 'self' data:", "media-src 'self'")
    : csp;
  const height = Number(url.searchParams.get("height")) || 600;
  const doc = host.buildWidgetDoc(
    uploads[url.pathname.slice(1)] || uploads.loewi,
    {
      maxHeight: height,
      reduceMotion: url.searchParams.has("reduce"),
    }
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${escape(policy)}"></head><body style="margin:0"><iframe title="Authored widget" sandbox="allow-scripts" style="border:0;width:100%;height:${height}px" srcdoc="${escape(doc)}"></iframe></body></html>`
  );
});
await new Promise((resolve) => server.listen(6105, "127.0.0.1", resolve));
const results = [];
const engines = process.env.G5_ONLY_FIREFOX ? [] : [["chromium", chromium, {}]];
const ff = process.env.G5_FIREFOX_EXECUTABLE || firefox.executablePath();
try {
  await access(ff);
  engines.push(["firefox", firefox, { executablePath: ff }]);
} catch {
  results.push({
    engine: "firefox",
    skipped: "Browser executable unavailable",
  });
}
try {
  for (const [engine, type, options] of engines) {
    const browser = await type.launch({ headless: true, ...options });
    try {
      const page = await browser.newPage({
        viewport: { width: 700, height: 700 },
      });
      await page.addInitScript(() => {
        // Observe real media output, without replacing play/decode or synthesizing sound.
        const NativeAudio = window.Audio;
        window.__g5 = { audios: [], violations: [], peak: 0, context: null };
        const sources = new WeakSet();
        function connect(audio) {
          const state = window.__g5;
          if (!state.context || sources.has(audio)) return;
          const source = state.context.createMediaElementSource(audio);
          const analyser = state.context.createAnalyser();
          source.connect(analyser);
          analyser.connect(state.context.destination);
          sources.add(audio);
          const samples = new Float32Array(analyser.fftSize);
          setInterval(() => {
            analyser.getFloatTimeDomainData(samples);
            state.peak = Math.max(state.peak, ...samples.map(Math.abs));
          }, 25);
        }
        window.Audio = function (...args) {
          const a = new NativeAudio(...args);
          window.__g5.audios.push(a);
          connect(a);
          return a;
        };
        document.addEventListener(
          "click",
          (event) => {
            if (!event.isTrusted) return;
            const state = window.__g5;
            state.context ||= new AudioContext();
            state.context.resume();
            state.audios.forEach(connect);
          },
          true
        );
        document.addEventListener("securitypolicyviolation", (event) => {
          window.__g5.violations.push({
            directive: event.effectiveDirective,
            url: event.blockedURI,
          });
        });
      });
      // A bare, unsandboxed/no-CSP control distinguishes a broken local decoder
      // from widget policy. The explicit opt-in records an INCONCLUSIVE engine;
      // it never treats metadata or synthetic timeline seeks as decoded audio.
      await page.goto("http://127.0.0.1:6105/control");
      await page.locator("#control").click();
      await page.waitForTimeout(3000);
      const control = await page.evaluate(() => ({
        peak: window.__g5.peak,
        time: window.controlAudio.currentTime,
        ready: window.controlAudio.readyState,
        context: window.__g5.context.state,
      }));
      const audioUnavailable = control.peak <= 0.001;
      results.push({
        engine,
        bareAudioControl: control,
        audioAcceptance: audioUnavailable
          ? "INCONCLUSIVE: bare decoder control also fails"
          : "available",
      });
      if (audioUnavailable && !process.env.G5_ALLOW_AUDIO_CONTROL_FAILURE) {
        throw new Error(
          `${engine} bare audio decoder failed; see results.json (no widget audio acceptance)`
        );
      }
      for (const slug of ["loewi", "retina"]) {
        for (const blocked of [true, false]) {
          await page.goto(
            `http://127.0.0.1:6105/${slug}${blocked ? "?blocked" : ""}`
          );
          const frame = page.frames()[1];
          const button = frame.locator(
            slug === "loewi" ? "#play" : "#tob-narr-btn"
          );
          await button.click();
          if (blocked || audioUnavailable) await page.waitForTimeout(1800);
          else
            await frame.waitForFunction(
              () =>
                window.__g5.peak > 0.001 &&
                window.__g5.audios.some(
                  (a) => a.currentTime > 1 && a.readyState >= 2
                )
            );
          const evidence = await frame.evaluate(() => ({
            peak: window.__g5.peak,
            context: window.__g5.context?.state,
            audio: window.__g5.audios.map((a) => ({
              time: a.currentTime,
              ready: a.readyState,
              error: a.error?.code || null,
              paused: a.paused,
            })),
            violations: window.__g5.violations,
          }));
          if (blocked) {
            assert(
              evidence.violations.some(
                (v) => v.directive === "media-src" && v.url === "data"
              )
            );
            assert.equal(evidence.peak, 0);
          } else {
            if (!audioUnavailable) assert(evidence.peak > 0.001);
            assert.equal(evidence.context, "running");
            assert(
              !evidence.violations.some((v) => v.directive === "media-src")
            );
          }
          results.push({
            engine,
            slug,
            blocked,
            decodedPlayback: !blocked && !audioUnavailable,
            ...evidence,
          });
          await page.screenshot({
            path: `${out}/${engine}-${slug}-${blocked ? "blocked" : "playing"}.png`,
          });
        }
      }
      // Reproduce the exact redundant-label collision at a desktop pane width.
      await page.setViewportSize({ width: 900, height: 620 });
      await page.goto("http://127.0.0.1:6105/baseline");
      const oldFrame = page.frames()[1];
      await oldFrame.waitForSelector("#chapters button");
      const oldGap = await oldFrame.evaluate(() => {
        const buttons = [...document.querySelectorAll("#chapters button")];
        return (
          buttons[2].getBoundingClientRect().left -
          buttons[1].getBoundingClientRect().right
        );
      });
      assert(
        oldGap < 0,
        "Baseline must reproduce the reported chapter-label overlap"
      );
      await oldFrame.locator("#chapters").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${out}/${engine}-loewi-baseline-label-overlap.png`,
      });
      results.push({ engine, baselineLabelOverlap: -oldGap });
      for (const [width, height] of [
        [1280, 800],
        [900, 600],
        [700, 600],
        [390, 600],
        [390, 420],
      ]) {
        await page.setViewportSize({ width, height: height + 20 });
        await page.goto(`http://127.0.0.1:6105/loewi?height=${height}&reduce`);
        const frame = page.frames()[1];
        await frame.waitForFunction(() => !!window.__loewi);
        const count = await frame.evaluate(() => window.__loewi.TL.segs.length);
        let minGap = Infinity;
        for (let i = 0; i < count; i++) {
          await frame.evaluate(
            (index) =>
              window.__loewi.seek(window.__loewi.TL.segs[index].t0 + 0.1),
            i
          );
          await frame.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
              )
          );
          const layout = await frame.evaluate(() => {
            const cap = document.querySelector("#cap");
            const range = document.createRange();
            range.selectNodeContents(cap);
            const text = range.getBoundingClientRect(),
              controls = document
                .querySelector(".transport")
                .getBoundingClientRect();
            return {
              gap: controls.top - text.bottom,
              capHeight: cap.clientHeight,
              textHeight: text.height,
              overflow: document.documentElement.scrollWidth - innerWidth,
            };
          });
          assert(
            layout.gap >= 0,
            `${engine} ${width} caption ${i} overlaps by ${layout.gap}`
          );
          assert(layout.capHeight >= layout.textHeight - 1);
          assert(layout.overflow <= 1);
          minGap = Math.min(minGap, layout.gap);
        }
        assert.equal(
          await frame
            .locator("#chapters button")
            .filter({ hasText: "Figure 1" })
            .count(),
          0
        );
        if (width > 820) {
          const labels = await frame
            .locator("#chapters button")
            .allTextContents();
          assert.deepEqual(labels, [
            "The set-up",
            "Collecting the fluids",
            "Vagusstoff",
          ]);
          const gaps = await frame.evaluate(() => {
            const rects = [
              ...document.querySelectorAll("#chapters button"),
            ].map((e) => e.getBoundingClientRect());
            return rects.slice(1).map((r, i) => r.left - rects[i].right);
          });
          assert(
            gaps.every((gap) => gap >= 0),
            `${engine} ${width} timeline label collision`
          );
        }
        assert.equal(await frame.evaluate(() => window.OB.reducedMotion), true);
        assert.equal(await frame.evaluate(() => window.__loewi.playing), false);
        await frame.locator("#restart").focus();
        await page.keyboard.press("Enter");
        await frame.waitForFunction(() => window.__loewi.playing);
        await frame.locator("#play").click();
        const longest = await frame.evaluate(
          () =>
            window.__loewi.TL.segs.reduce((a, b) =>
              a.text.length > b.text.length ? a : b
            ).t0
        );
        await frame.evaluate((t) => window.__loewi.seek(t + 0.1), longest);
        await frame.locator("#cap").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `${out}/${engine}-loewi-${width}x${height}-caption.png`,
        });
        await frame.locator("#next").focus();
        await page.keyboard.press("Enter");
        assert.equal(await frame.evaluate(() => window.__loewi.playing), false);
        await frame.locator(".cite").scrollIntoViewIfNeeded();
        results.push({
          engine,
          layout: `${width}x${height}`,
          captions: count,
          minGap,
          keyboard: "restart and step",
          reducedMotion: true,
        });
      }
      await page.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
