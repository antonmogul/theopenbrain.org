/* OPENBRAIN-63: read-only live-data parity, with migration output injected
 * through page.route. Start vite preview on 4263; set HISTORY_SQL_HARNESS
 * to a temporary @electric-sql/pglite@0.5.8 install. No production writes.
 * node scripts/chapter-settings-parity.mjs [base] [artifact directory]
 */
import { chromium, webkit } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const BASE = process.argv[2] || "http://127.0.0.1:4263";
const OUT = path.resolve(
  process.argv[3] || "/Volumes/Brain/artifacts/retina-cleanup/63/browser"
);
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => /^VITE_SUPABASE_/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i),
        l
          .slice(i + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      ];
    })
);
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const rest = env.VITE_SUPABASE_URL + "/rest/v1/";
async function get(endpoint) {
  const response = await fetch(rest + endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok)
    throw Error(`GET ${endpoint.split("?")[0]}: ${response.status}`);
  return response.json();
}
// Keep the SQL engine in a short-lived process, so its WASM memory is
// released before opening real browser renderers on a busy workstation.
if (process.argv.includes("--prepare")) {
  const require = createRequire(import.meta.url);
  const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
  const modules = await get("modules?select=*");
  const sections = await get("sections?select=*");
  const db = new PGlite();
  await db.exec(`create table modules(id uuid primary key,slug text,cover_image_url text,authors jsonb,ramp text);
 create table sections(id uuid primary key,module_id uuid,slug text,box_treatment text);`);
  for (const m of modules)
    await db.query("insert into modules values($1,$2,$3,$4,$5)", [
      m.id,
      m.slug,
      m.cover_image_url,
      m.authors,
      m.ramp,
    ]);
  for (const s of sections)
    await db.query("insert into sections values($1,$2,$3,$4)", [
      s.id,
      s.module_id,
      s.slug,
      s.box_treatment,
    ]);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261120066300_chapter_settings_columns.sql",
      "utf8"
    )
  );
  // Preserve settings if the migration has subsequently been applied live.
  for (const m of modules)
    if (m.cover !== undefined || m.credits !== undefined)
      await db.query("update modules set cover=$1,credits=$2 where id=$3", [
        m.cover ?? null,
        m.credits ?? null,
        m.id,
      ]);
  for (const s of sections)
    if (s.art !== undefined || s.rail !== undefined)
      await db.query("update sections set art=$1,rail=$2 where id=$3", [
        s.art ?? null,
        s.rail ?? null,
        s.id,
      ]);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261120066301_chapter_settings_seed.sql",
      "utf8"
    )
  );
  const after = {
    modules: (await db.query("select * from modules")).rows,
    sections: (await db.query("select * from sections")).rows,
  };
  await db.close();
  writeFileSync(
    path.join(OUT, "settings-after.json"),
    JSON.stringify(after, null, 2)
  );
  process.exit(0);
}
execFileSync(process.execPath, [
  fileURLToPath(import.meta.url),
  BASE,
  OUT,
  "--prepare",
]);
const after = JSON.parse(
  readFileSync(path.join(OUT, "settings-after.json"), "utf8")
);
const afterModules = new Map(after.modules.map((m) => [m.id, m]));
const afterSections = new Map(after.sections.map((s) => [s.id, s]));
const cache = new Map();
const resultsFile = path.join(OUT, "results.json");
const results =
  process.env.PARITY_RESUME && existsSync(resultsFile)
    ? JSON.parse(readFileSync(resultsFile, "utf8"))
    : [];
for (const [engine, browserType] of Object.entries({ chromium, webkit })) {
  const browser = await browserType.launch();
  try {
    for (const width of [1440, 1024, 390])
      for (const slug of ["foundations-of-neuroscience", "the-retina"]) {
        if (
          results.some(
            (r) => r.engine === engine && r.width === width && r.slug === slug
          )
        )
          continue;
        const pair = [];
        for (const phase of ["before", "after"]) {
          const context = await browser.newContext({
            viewport: { width, height: 1000 },
            reducedMotion: "reduce",
          });
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (e) => errors.push(String(e)));
          page.on("console", (msg) => {
            if (msg.type() === "error") errors.push(msg.text());
          });
          await page.route(rest + "**", async (route) => {
            if (route.request().method() !== "GET")
              throw Error("Unexpected data write");
            const url = route.request().url();
            if (!cache.has(url)) {
              const response = await fetch(url, {
                headers: { apikey: key, Authorization: `Bearer ${key}` },
              });
              cache.set(url, {
                status: response.status,
                body: await response.text(),
                headers: { "content-type": "application/json" },
              });
            }
            const source = cache.get(url);
            let body = source.body;
            if (phase === "after") {
              const table = new URL(url).pathname.split("/").pop();
              const map =
                table === "modules"
                  ? afterModules
                  : table === "sections"
                    ? afterSections
                    : null;
              if (map) {
                const rows = JSON.parse(body);
                if (Array.isArray(rows))
                  body = JSON.stringify(
                    rows.map((row) => ({ ...row, ...map.get(row.id) }))
                  );
              }
            }
            await route.fulfill({
              status: source.status,
              headers: source.headers,
              body,
            });
          });
          const number = slug === "the-retina" ? 2 : 1;
          await page.goto(`${BASE}/chapter/${number}/${slug}`, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          await page.locator('[data-testid="chapter-authors"]').waitFor();
          await page.waitForFunction(
            () => !document.querySelector('[data-reactive-cover="loading"]')
          );
          await page.evaluate(() => document.fonts.ready);
          await page.addStyleTag({
            content: "* { caret-color: transparent !important; }",
          });
          await page.waitForTimeout(1000);
          const shots = [];
          const shot = async (name, selector, offset = 80) => {
            if (selector && selector !== "current")
              await page
                .locator(selector)
                .first()
                .evaluate(
                  (el, off) =>
                    window.scrollTo({
                      top:
                        el.getBoundingClientRect().top + window.scrollY - off,
                      behavior: "instant",
                    }),
                  offset
                );
            else if (selector !== "current")
              await page.evaluate(() =>
                window.scrollTo({ top: 0, behavior: "instant" })
              );
            await page.waitForTimeout(500);
            await page.evaluate(async () => {
              await Promise.all(
                [...document.images]
                  .filter((im) => {
                    const r = im.getBoundingClientRect();
                    return r.bottom > 0 && r.top < innerHeight;
                  })
                  .map((im) => im.decode().catch(() => {}))
              );
            });
            await page.waitForTimeout(200);
            const file = path.join(
              OUT,
              `${engine}-${width}-${slug}-${name}-${phase}.png`
            );
            await page.screenshot({ path: file, animations: "disabled" });
            shots.push({ name, file });
          };
          await shot("opener");
          await shot("authors-funding", '[data-testid="chapter-authors"]');
          await shot("box", "[data-breakout-box], [data-break-demo]");
          if (slug === "foundations-of-neuroscience" && width >= 1024) {
            const section = page.locator(
              'section[data-section-slug="where-is-my-mind"]'
            );
            const start = await section.evaluate(
              (el) => el.getBoundingClientRect().top + window.scrollY
            );
            let shown = false;
            for (let off = -300; off < 1600; off += 100) {
              await page.evaluate(
                (y) => window.scrollTo({ top: y, behavior: "instant" }),
                start + off
              );
              await page.waitForTimeout(100);
              if (await page.locator("[data-section-card]").count()) {
                shown = true;
                break;
              }
            }
            if (!shown) throw Error("History section card did not mount");
            await shot("section-card", "current");
          } else
            await shot(
              "section",
              'section.reader-section[data-section-slug]:not([data-section-slug="introduction"])'
            );
          const triggers = await page
            .locator('.animationTrigger[id^="trigger"]')
            .evaluateAll((els) => els.map((e) => e.id));
          const mounted = new Set();
          for (const id of triggers) {
            await page
              .locator(`[id="${id}"]`)
              .first()
              .evaluate((el) =>
                window.scrollTo({
                  top:
                    el.getBoundingClientRect().top +
                    window.scrollY -
                    innerHeight * 0.4,
                  behavior: "instant",
                })
              );
            await page.waitForTimeout(100);
            const visible = await page
              .locator(
                ".figure-pane svg, .figure-pane canvas, .figure-pane img, .figure-pane iframe, .illustration-inline, [data-rail-figure]"
              )
              .evaluateAll((els) =>
                els.map((e) =>
                  JSON.stringify({
                    tag: e.tagName,
                    src: e.getAttribute("src"),
                    id: e.id,
                  })
                )
              );
            visible.forEach((v) => mounted.add(v));
          }
          // Sandboxed film/widget frames can keep the network busy forever.
          // Await this page's REST handlers before closing instead.
          await page.waitForTimeout(1000);
          const figures = [...mounted].sort();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1
          );
          pair.push({
            engine,
            width,
            slug,
            phase,
            errors,
            overflow,
            triggers,
            figures,
            shots,
          });
          await page.unrouteAll({ behavior: "wait" });
          await context.close();
        }
        const diffs = [];
        for (let i = 0; i < pair[0].shots.length; i++) {
          const a = pair[0].shots[i],
            b = pair[1].shots[i];
          const diff = execFileSync(
            "python3",
            [
              "-c",
              `from PIL import Image,ImageChops\nimport sys,json\na=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB');d=ImageChops.difference(a,b);d.save(sys.argv[3]);print(json.dumps({'pixels':sum(1 for p in d.getdata() if max(p)>8),'total':a.width*a.height}))`,
              a.file,
              b.file,
              a.file.replace("-before.png", "-diff.png"),
            ],
            { encoding: "utf8" }
          );
          diffs.push({ name: a.name, ...JSON.parse(diff) });
        }
        const result = {
          ...pair[0],
          shots: undefined,
          after: pair[1],
          diffs,
          identicalTriggers:
            JSON.stringify(pair[0].triggers) ===
            JSON.stringify(pair[1].triggers),
          preservedFigures: pair[0].figures.every((figure) =>
            pair[1].figures.includes(figure)
          ),
        };
        results.push(result);
        writeFileSync(
          path.join(OUT, "results.json"),
          JSON.stringify(results, null, 2)
        );
        console.log(
          engine,
          width,
          slug,
          JSON.stringify({
            diffs,
            errors: pair.flatMap((p) => p.errors),
            overflow: pair.some((p) => p.overflow),
            identicalTriggers: result.identicalTriggers,
            preservedFigures: result.preservedFigures,
          })
        );
      }
  } finally {
    await browser.close();
  }
}
if (
  results.some(
    (r) =>
      r.errors.length ||
      r.after.errors.length ||
      r.overflow ||
      r.after.overflow ||
      !r.identicalTriggers ||
      !r.preservedFigures ||
      r.diffs.some((d) => d.pixels > 0)
  )
)
  process.exitCode = 1;
