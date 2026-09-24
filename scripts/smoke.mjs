/*
 * smoke.mjs — load the real app in a real browser and assert it isn't broken.
 *
 * The gap this fills: unit tests pass while the reader scrolls sideways at
 * every desktop width (OPENBRAIN-4). Nothing in the suite loads a page, so
 * layout regressions and load-time exceptions were invisible until someone
 * looked. This runs a handful of routes at a few widths and fails on:
 *
 *   • an uncaught page error or console error
 *   • horizontal scroll (the whole OPENBRAIN-4 class of bug)
 *   • a route that renders almost no text (blank-screen regressions)
 *
 * Runs against `vite preview` (the production build) so it exercises what
 * actually ships, not the dev server.
 *
 * Usage:
 *   npm run test:smoke
 *   node scripts/smoke.mjs --base http://localhost:4173
 *   node scripts/smoke.mjs --only retina,chapters   (route names, for a quick loop)
 *
 * Failure screenshots land in .smoke/ (git-ignored, uploaded by CI).
 */
import { chromium } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const BASE = flag("base", "http://localhost:4173").replace(/\/$/, "");
const OUT = path.resolve(flag("out", ".smoke"));
const ONLY = (flag("only", "") || "").split(",").filter(Boolean);

/*
 * Widths chosen to cover the breakpoint ladder: below md, the 768–1299 band
 * (where the figure pane is hidden), and above xl:1300 where the reader
 * switches to the pinned two-column layout.
 */
const WIDTHS = [390, 1280, 1440, 1920];

/*
 * minText guards against a route rendering its chrome but no content — the
 * failure mode when a data fetch breaks. Numbers are deliberately generous so
 * this fails on "blank", not on "shorter than I expected".
 *
 * `needsData` marks routes whose content comes from Supabase. Without
 * credentials the build still serves the SPA shell, but the chapter fetch
 * returns index.html and the route renders ~319 chars of chrome. That is a
 * missing secret, not a regression, so on an unconfigured runner those routes
 * drop their content assertion and keep the structural ones (no horizontal
 * scroll, no unexpected errors, HTTP < 400).
 *
 * Set VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY in the CI environment
 * to turn the content checks back on — that is the stronger gate and worth
 * doing before user testing.
 */
function hasSupabaseCredentials() {
  if (
    process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ) {
    return true;
  }
  // Vite reads .env at build time, so the vars aren't in this process's env.
  // Check the file directly rather than reporting a local run as degraded.
  try {
    const env = readFileSync(path.resolve(".env"), "utf8");
    return (
      /^VITE_SUPABASE_URL=.+/m.test(env) &&
      /^VITE_SUPABASE_PUBLISHABLE_KEY=.+/m.test(env)
    );
  } catch {
    return false;
  }
}

const HAS_SUPABASE = hasSupabaseCredentials();

/* The Supabase URL and publishable key, from the environment or .env. */
function supabaseCredentials() {
  let url = process.env.VITE_SUPABASE_URL;
  let key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    try {
      const env = readFileSync(path.resolve(".env"), "utf8");
      url ||= env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
      key ||= env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1]?.trim();
    } catch {
      /* no .env */
    }
  }
  return url && key ? { url, key } : null;
}

/*
 * Data check (OPENBRAIN-76): every figure a published chapter uses must have
 * its artwork. A placeholder card is not an error the browser can see, so
 * History shipped with 26 of 29 figures blank and every check green.
 * Returns failure messages (empty when all figures have artwork).
 */
async function checkFigureArtwork() {
  const creds = supabaseCredentials();
  if (!creds) return [];
  const get = async (q) => {
    const res = await fetch(`${creds.url}/rest/v1/${q}`, {
      headers: { apikey: creds.key },
    });
    if (!res.ok) throw new Error(`${q.split("?")[0]}: HTTP ${res.status}`);
    return res.json();
  };
  const inList = (ids) => `(${ids.map((id) => `"${id}"`).join(",")})`;
  const modules = await get("modules?status=eq.published&select=id,slug");
  if (!modules.length) return [];
  const sections = await get(
    `sections?module_id=in.${inList(modules.map((m) => m.id))}&select=id,module_id`
  );
  const rows = sections.length
    ? await get(
        `paragraphs?section_id=in.${inList(sections.map((x) => x.id))}&animation_id=not.is.null&select=animation_id,section_id`
      )
    : [];
  const ids = [...new Set(rows.map((r) => r.animation_id))];
  if (!ids.length) return [];
  const media = await get(
    `animations?id=in.${inList(ids)}&select=id,animation_key,title,media_type,image_file_url,lottie_file_url,video_file_url,youtube_id,config`
  );
  const slugOf = new Map(
    sections.map((x) => [x.id, modules.find((m) => m.id === x.module_id)?.slug])
  );
  const chaptersFor = (id) =>
    [
      ...new Set(
        rows
          .filter((r) => r.animation_id === id)
          .map((r) => slugOf.get(r.section_id))
      ),
    ].join(", ");
  const blank = media.filter((m) => {
    const frames = Array.isArray(m.config?.images) ? m.config.images.length : 0;
    if (m.media_type === "image") return !m.image_file_url && !frames;
    if (m.media_type === "video") return !m.video_file_url;
    if (m.media_type === "youtube") return !m.youtube_id;
    return false; // lottie loads by key; widgets by config
  });
  return blank.map(
    (m) =>
      `figure "${m.title || m.animation_key}" (${m.animation_key}) in ${chaptersFor(m.id)} has no artwork — readers see a placeholder`
  );
}
/*
 * `widths` narrows the check for routes that are legitimately desktop-only.
 * /styleguide and /case-cabinet are unlisted internal routes — a design
 * reference and an interaction prototype — with fixed-pixel layouts that
 * overflow at phone width by design. They still get checked on desktop, so a
 * regression there is caught; they just don't block on a mobile layout nobody
 * has built yet. Student- and professor-facing routes are checked everywhere.
 */
const ROUTES = [
  { path: "/", name: "home", minText: 50 },
  {
    path: "/chapter/1/foundations-of-neuroscience",
    name: "foundations",
    minText: 2000,
    needsData: true,
  },
  {
    path: "/chapter/2/the-retina",
    name: "retina",
    minText: 2000,
    needsData: true,
    /*
     * The three client-placed interactives (OPENBRAIN-21) must be in the
     * prose. Their anchors depend on chapter content, so this is a data
     * assertion and is skipped without credentials like minText.
     */
    expectCount: { selector: "[data-widget-breakout]", min: 3 },
    /*
     * The scroll-trigger markers are dev chrome behind ?markers=1
     * (OPENBRAIN-31). Without the flag none may render — they were the
     * "dots in the middle of the page" readers saw. Structural, so it runs
     * with or without credentials.
     */
    expectAbsent: ".marker-start, .marker-end, .marker-center",
    /*
     * The inline RetINaBox stage must be VISIBLE full-bleed, not just laid
     * out full-bleed: its DOM width was already the window's while the
     * prose column's overflow clip hid everything left of the divider
     * (OPENBRAIN-37). Desktop widths only, and a data assertion (the stage
     * exists only once the chapter content places it).
     */
    expectStage: {
      selector: '[data-widget-stage="retinabox"]',
      minWidthRatio: 0.95,
      probeX: 300,
      minWidth: 1300,
    },
  },
  { path: "/chapters", name: "chapters", minText: 50 },
  {
    path: "/styleguide",
    name: "styleguide",
    minText: 200,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/case-cabinet",
    name: "case-cabinet",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  // History widget 1, both versions (OPENBRAIN-44): the 3D one loads a GLB
  // and three SVG maps into WebGL, so errors there only show in a browser.
  {
    path: "/phrenology",
    name: "phrenology",
    minText: 30,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/phrenology-3d",
    name: "phrenology-3d",
    minText: 30,
    widths: [1280, 1440, 1920],
  },
  /*
   * Interactive widgets (OPENBRAIN-13/14). Every widget route in the catalog
   * gets a check: these are the pages shown to the authors, and ~15k lines of
   * them shipped with only /sdt guarded. The CSP bug that blocked Pyodide on
   * /direction-selectivity survived precisely because nothing loaded that
   * route in a browser — this list closes that gap.
   *
   * Desktop widths only, matching the other internal routes: the widgets are
   * built desktop-first and several (V1 camera, RetINaBox) have fixed-pixel
   * control panels that overflow at 390px by design.
   *
   * minText is deliberately low. Most of these are canvas/SVG-driven, so text
   * length measures "the chrome rendered", not "the science is right". The
   * error and overflow assertions are what actually gate these routes.
   */
  {
    path: "/sdt",
    name: "sdt-widget",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/biased-competition",
    name: "widget-biased-competition",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/contrast-response",
    name: "widget-contrast-response",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/posner-cueing",
    name: "widget-posner-cueing",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/feature-attention",
    name: "widget-feature-attention",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/hillyard-erp",
    name: "widget-hillyard-erp",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/color-vision",
    name: "widget-color-vision",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/visual-pathway",
    name: "widget-visual-pathway",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    /*
     * Pyodide loads from the jsDelivr CDN, so this route needs network and is
     * slower than the rest. It is also the canary for the CSP allowance in
     * index.html: if script-src stops permitting cdn.jsdelivr.net, the console
     * logs a CSP violation and this check fails — which is the point.
     */
    path: "/direction-selectivity",
    name: "widget-direction-selectivity",
    minText: 50,
    widths: [1280, 1440, 1920],
    slow: true,
  },
  {
    /*
     * Requests camera access. Headless Chromium denies it silently rather than
     * prompting, so this asserts the widget renders its chrome and fails
     * gracefully without a camera — not that the video pipeline works.
     */
    path: "/v1-camera",
    name: "widget-v1-camera",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    path: "/retinabox",
    name: "widget-retinabox",
    minText: 50,
    widths: [1280, 1440, 1920],
  },
  {
    /*
     * The library itself. Renders the active widget's Vue port in a nested
     * iframe, so this also catches a catalog entry pointing at a dead route.
     */
    path: "/widgets",
    name: "widget-library",
    minText: 50,
    widths: [1280, 1440, 1920],
    slow: true,
  },
];

/* Noise that predates this harness and isn't what we're gating on. Keep this
   list short and justified — every entry is a bug someone chose not to fix. */
const IGNORED_ERRORS = [
  /favicon/i,
  // 404s are REAL failures again — the every-route font 404s were fixed by
  // pruning dead @font-face rules (OPENBRAIN-9 §5). The ONE remaining
  // exemption is the missing Lottie animation files (tracked in OPENBRAIN-9
  // §4b): the app-side lottieAssetOk guard probes them with HEAD and skips
  // the figure, but the browser still logs the probe's 404. Delete this line
  // when the assets ship.
  /404 \(Not Found\).*\/publicAssets\/animations\//i,
  // Third-party noise from the YouTube embed's own player script (mobile
  // inline figures render YT embeds): its permissions-policy probes are not
  // ours to fix.
  /Permissions policy violation.*youtube\.com/i,
];

const isRealError = (text) => !IGNORED_ERRORS.some((re) => re.test(text));

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  if (!HAS_SUPABASE) {
    console.warn(
      "\n  ! No Supabase credentials — chapter CONTENT checks are skipped.\n" +
        "    Structural checks (scroll, errors, status) still run.\n" +
        "    Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for the full gate.\n"
    );
  }

  const browser = await chromium.launch();
  const failures = [];
  let checks = 0;

  if (HAS_SUPABASE && !ONLY.length) {
    checks++;
    try {
      const blank = await checkFigureArtwork();
      failures.push(...blank);
      console.log(
        blank.length
          ? `  ✗ figures: ${blank.length} without artwork`
          : "  ✓ figures: every figure in a published chapter has artwork"
      );
    } catch (err) {
      failures.push(`figure artwork check failed: ${err.message}`);
    }
  }
  let skippedContent = 0;

  for (const route of ROUTES) {
    if (ONLY.length && !ONLY.includes(route.name)) continue;
    for (const width of route.widths || WIDTHS) {
      checks++;
      const label = `${route.name} @ ${width}`;
      const page = await browser.newPage({
        viewport: { width, height: 900 },
      });

      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on(
        "console",
        (m) =>
          m.type() === "error" &&
          // Include the source URL: network-error texts alone don't say WHAT
          // 404'd, and the ignore list below filters by path.
          errors.push(`${m.text()} @ ${m.location()?.url || ""}`)
      );

      try {
        /*
         * `slow` routes pull a large runtime over the network before they
         * finish rendering (Pyodide on /direction-selectivity; a nested widget
         * iframe on /widgets). They get a longer navigation budget and a
         * longer settle so a cold CDN reads as slow, not as broken.
         */
        const res = await page.goto(BASE + route.path, {
          waitUntil: "networkidle",
          timeout: route.slow ? 90_000 : 30_000,
        });
        if (res && res.status() >= 400) {
          failures.push(`${label}: HTTP ${res.status()}`);
        }
        // Let route transitions and entrance animations settle.
        await page.waitForTimeout(route.slow ? 20_000 : 2500);

        const stageCheck =
          route.expectStage && width >= (route.expectStage.minWidth || 0)
            ? route.expectStage
            : null;
        const result = await page.evaluate(
          async ([countSelector, absentSelector, stage]) => {
            const measureScrollX = () => {
              const before = window.scrollX;
              window.scrollTo(9999, window.scrollY);
              const max = window.scrollX;
              window.scrollTo(before, window.scrollY);
              return max;
            };
            let maxScrollX = measureScrollX();
            let stageResult = null;
            if (stage) {
              const el = document.querySelector(stage.selector);
              if (el) {
                // Bring the stage on screen so the lazy widget mounts, wait
                // for it (the placeholder must be gone), then hit-test a
                // point in its left half: with the clip bug elementFromPoint
                // returned <html> there. The horizontal-scroll measurement is
                // repeated with the real widget in the DOM.
                el.scrollIntoView({ block: "center", behavior: "instant" });
                const started = Date.now();
                while (
                  el.querySelector(".wb-stage-placeholder") &&
                  Date.now() - started < 15000
                ) {
                  await new Promise((r) => setTimeout(r, 200));
                }
                maxScrollX = Math.max(maxScrollX, measureScrollX());
                const rect = el.getBoundingClientRect();
                const y = Math.min(
                  rect.top + rect.height / 2,
                  window.innerHeight / 2
                );
                const clientWidth = document.documentElement.clientWidth;
                // At the fixed probe the stage shell itself counts: with the
                // clip bug elementFromPoint returned <html> there, and the
                // widget's own centred card can start further in on wide
                // screens. A second probe at a quarter of the width must hit
                // a real widget descendant, so a painted-but-empty stage
                // cannot pass.
                const hit = document.elementFromPoint(stage.probeX, y);
                const hitControl = document.elementFromPoint(
                  Math.round(clientWidth * 0.25),
                  y
                );
                stageResult = {
                  found: true,
                  mounted: !el.querySelector(".wb-stage-placeholder"),
                  left: Math.round(rect.left),
                  width: Math.round(rect.width),
                  clientWidth,
                  hitInside: !!hit && el.contains(hit),
                  hitWidget:
                    !!hitControl &&
                    hitControl !== el &&
                    el.contains(hitControl),
                };
              } else {
                stageResult = { found: false };
              }
            }
            /*
             * Wheel dead zones (OPENBRAIN-39): a scroll container — and
             * overflow:hidden makes one — with overscroll-behavior:none never
             * hands the wheel on to the page, even with nothing to scroll
             * itself. A global `* { overscroll-behavior: none }` froze the
             * reader over the opener hero and every figure. `contain` on a
             * real overlay scroller is fine; `none` below the root is not.
             */
            const isScroller = (v) =>
              v === "hidden" || v === "auto" || v === "scroll";
            const deadZones = [];
            for (const el of document.querySelectorAll("body *")) {
              const cs = getComputedStyle(el);
              if (cs.overscrollBehaviorY !== "none") continue;
              if (!isScroller(cs.overflowY) && !isScroller(cs.overflowX))
                continue;
              const r = el.getBoundingClientRect();
              if (r.width < 200 || r.height < 100) continue;
              deadZones.push(
                `${el.tagName.toLowerCase()}.${(el.getAttribute("class") || "").slice(0, 40)}`
              );
            }
            return {
              maxScrollX,
              deadZones,
              scrollable:
                document.documentElement.scrollHeight >
                window.innerHeight + 600,
              textLength: document.body.innerText.trim().length,
              count: countSelector
                ? document.querySelectorAll(countSelector).length
                : null,
              absent: absentSelector
                ? document.querySelectorAll(absentSelector).length
                : null,
              stage: stageResult,
            };
          },
          [
            route.expectCount?.selector || null,
            route.expectAbsent || null,
            stageCheck,
          ]
        );

        // 1px of slack absorbs sub-pixel rounding at fractional widths.
        if (result.maxScrollX > 1) {
          failures.push(
            `${label}: scrolls horizontally by ${result.maxScrollX}px`
          );
        }
        // Structural: no wheel dead zones, and a real wheel over the middle
        // of the first screen must move the page (OPENBRAIN-39). scrollTo()
        // always works, so only real input catches this.
        let wheelOk = result.deadZones.length === 0;
        if (!wheelOk) {
          failures.push(
            `${label}: ${result.deadZones.length} wheel dead zone(s) (overscroll-behavior: none on a scroll container), e.g. ${result.deadZones.slice(0, 3).join(", ")}`
          );
        }
        if (result.scrollable) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.mouse.move(Math.round(width / 2), 450);
          await page.mouse.wheel(0, 600);
          await page.waitForTimeout(600);
          const wheeledTo = await page.evaluate(() => window.scrollY);
          if (wheeledTo < 1) {
            wheelOk = false;
            failures.push(
              `${label}: a mouse wheel at the top of the page did not scroll it`
            );
          }
        }
        // Inline figures must paint inside themselves (OPENBRAIN-68): their
        // label layers are position: fixed for the desktop pane, and below
        // xl they escaped to the top of the viewport, over the opener. At the
        // top of the page, nothing from a figure that starts below the first
        // screen may be visible in it.
        if (!route.needsData || HAS_SUPABASE) {
          const escaped = await page.evaluate(() => {
            window.scrollTo(0, 0);
            const vh = window.innerHeight;
            let n = 0;
            for (const fig of document.querySelectorAll("figure.illu-inline")) {
              if (fig.getBoundingClientRect().top < vh) continue;
              for (const el of fig.querySelectorAll("*")) {
                const r = el.getBoundingClientRect();
                if (r.width && r.height && r.bottom > 0 && r.top < vh) {
                  const cs = getComputedStyle(el);
                  if (cs.visibility !== "hidden" && cs.opacity !== "0") {
                    n++;
                    break;
                  }
                }
              }
            }
            return n;
          });
          if (escaped > 0) {
            failures.push(
              `${label}: ${escaped} inline figure(s) paint outside themselves, over the top of the page`
            );
          }
        }
        // Structural: things that must never be in the DOM (dev-only chrome).
        if (route.expectAbsent && result.absent > 0) {
          failures.push(
            `${label}: found ${result.absent} × ${route.expectAbsent}, expected none`
          );
        }
        const checkContent = !route.needsData || HAS_SUPABASE;
        if (!checkContent) skippedContent++;
        if (checkContent && result.textLength < route.minText) {
          failures.push(
            `${label}: rendered ${result.textLength} chars, expected >= ${route.minText}`
          );
        }
        const countOk =
          !checkContent ||
          !route.expectCount ||
          result.count >= route.expectCount.min;
        if (!countOk) {
          failures.push(
            `${label}: found ${result.count} × ${route.expectCount.selector}, expected >= ${route.expectCount.min}`
          );
        }
        // Inline stage visibility (OPENBRAIN-37): full content width, at
        // x = 0, and hit-testable well left of the prose divider.
        let stageOk = true;
        if (checkContent && stageCheck && result.stage) {
          const st = result.stage;
          if (!st.found) {
            stageOk = false;
            failures.push(`${label}: ${stageCheck.selector} not in the DOM`);
          } else {
            const wideEnough =
              st.width >= stageCheck.minWidthRatio * st.clientWidth;
            if (
              !wideEnough ||
              st.left > 1 ||
              !st.hitInside ||
              !st.hitWidget ||
              !st.mounted
            ) {
              stageOk = false;
              failures.push(
                `${label}: inline stage mounted=${st.mounted} left=${st.left} width=${st.width}/${st.clientWidth} hit-inside=${st.hitInside} hit-widget=${st.hitWidget}`
              );
            }
          }
        }

        // Without credentials the chapter fetch gets index.html back and throws
        // a JSON parse error. Expected on an unconfigured runner; still a real
        // failure anywhere the keys exist.
        const real = errors
          .filter(isRealError)
          .filter(
            (e) =>
              checkContent ||
              !/Error fetching chapter|is not valid JSON/i.test(e)
          );
        if (real.length) {
          failures.push(`${label}: ${real.length} console/page error(s)`);
          real
            .slice(0, 3)
            .forEach((e) => failures.push(`    ${e.slice(0, 160)}`));
        }

        const absentOk = !route.expectAbsent || result.absent === 0;
        const ok =
          result.maxScrollX <= 1 &&
          (!checkContent || result.textLength >= route.minText) &&
          countOk &&
          absentOk &&
          stageOk &&
          wheelOk &&
          !real.length;
        if (!ok) {
          await page.screenshot({
            path: path.join(OUT, `${route.name}-${width}.png`),
            fullPage: false,
          });
        }
        console.log(
          `  ${ok ? "✓" : "✗"} ${label.padEnd(28)} ` +
            `scrollX=${result.maxScrollX} text=${result.textLength}`
        );
      } catch (err) {
        failures.push(`${label}: ${err.message.split("\n")[0]}`);
        console.log(`  ✗ ${label.padEnd(28)} ${err.message.split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();

  console.log(`\n${checks} checks across ${ROUTES.length} routes.`);
  if (skippedContent) {
    console.warn(
      `  ! ${skippedContent} content assertion(s) skipped — no Supabase credentials.`
    );
  }
  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    failures.forEach((f) => console.error(`  ${f}`));
    console.error(`\nScreenshots in ${OUT}/`);
    process.exit(1);
  }
  console.log("All smoke checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
