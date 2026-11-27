/** OPENBRAIN-97: published-data reader before/after proof; no external writes.
 * --base URL --out DIR --live snapshot.json [--widths 1920,1331,1440,1024,390,375]
 * HISTORY_SQL_HARNESS must point to PGlite; the real migration supplies the overlay.
 */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium, webkit, devices } from "@playwright/test";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const flag = (key, fallback) => {
  const index = process.argv.indexOf(`--${key}`);
  return index < 0 ? fallback : process.argv[index + 1];
};
const base = flag("base", "http://127.0.0.1:4297");
const out = flag("out", ".smoke/retina-stuart-art");
const live = JSON.parse(readFileSync(flag("live"), "utf8"));
const pictures = JSON.parse(
  readFileSync("scripts/figures/retina-stuart-section-art.json", "utf8")
);
const { PGlite } = createRequire(import.meta.url)(
  process.env.HISTORY_SQL_HARNESS
);
const db = new PGlite();
await db.exec(`create table modules(id uuid,slug text,status text);
  create table sections(id uuid,module_id uuid,slug text,art jsonb,updated_at timestamptz);`);
for (const module of live.modules)
  await db.query("insert into modules values($1,$2,$3)", [
    module.id,
    module.slug,
    module.status,
  ]);
for (const section of live.sections)
  await db.query(
    "insert into sections(id,module_id,slug,art) values($1,$2,$3,$4)",
    [section.id, section.module_id, section.slug, section.art]
  );
await db.exec(
  readFileSync(
    "supabase/migrations/20261124079700_retina_stuart_section_art.sql",
    "utf8"
  )
);
const migrated = new Map(
  (await db.query("select id,art from sections")).rows.map((s) => [s.id, s.art])
);
await db.close();
mkdirSync(out, { recursive: true });
const results = [];
const save = () =>
  writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
const widths = flag("widths", "1920,1331,1440,1024,390,375")
  .split(",")
  .map(Number);
for (const engine of [chromium, webkit].filter((e) =>
  flag("engines", "chromium,webkit").includes(e.name())
)) {
  const browser = await engine.launch();
  try {
    for (const width of widths) {
      if (engine === webkit && width !== 390) continue;
      for (const phase of flag("phases", "before,after").split(",")) {
        const height =
          width === 1920 ? 947 : width === 1331 ? 992 : width < 768 ? 844 : 900;
        const result = {
          engine: engine.name(),
          width,
          height,
          phase,
          toc: [],
          cards: [],
          errors: [],
          browserWarnings: [],
        };
        results.push(result);
        save();
        const context = await browser.newContext({
          ...(width < 768 ? devices["iPhone 13"] : {}),
          viewport: { width, height },
          reducedMotion: "reduce",
        });
        await context.route("**/*", async (route) => {
          const request = route.request();
          if (!["GET", "HEAD", "OPTIONS"].includes(request.method()))
            return route.abort();
          const url = new URL(request.url());
          if (url.pathname.endsWith("/rest/v1/sections")) {
            const response = await route.fetch();
            const rows = await response.json();
            return route.fulfill({
              response,
              json:
                phase === "after"
                  ? rows.map((s) =>
                      migrated.has(s.id) ? { ...s, art: migrated.get(s.id) } : s
                    )
                  : rows,
            });
          }
          return route.continue();
        });
        const page = await context.newPage();
        page.on("pageerror", (e) => result.errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() !== "error") return;
          if (
            engine === webkit &&
            /^Button failed to load, iconName = .*placard/.test(m.text())
          )
            result.browserWarnings.push(m.text());
          else result.errors.push(m.text());
        });
        try {
          await page.goto(`${base}/chapter/2/the-retina`, {
            waitUntil: "domcontentloaded",
          });
          await page.locator("#text").waitFor();
          await page.waitForTimeout(2000);
          const toc = page.locator("#chapter-toc");
          await toc.scrollIntoViewIfNeeded();
          for (const [index, picture] of pictures.entries()) {
            if (width < 1024 && index > 0) continue; // touch TOC displays its initial plate
            const section = live.sections.find(
              (s) =>
                s.slug === picture.section &&
                s.module_id ===
                  live.modules.find((m) => m.slug === "the-retina").id
            );
            if (width >= 1024)
              await toc.locator(`a[href="#${section.id}"]`).hover();
            await page.waitForTimeout(150);
            const image = page.locator(".otoc__pic.is-on");
            const expected =
              phase === "after" ? picture.art.src : section.art.src;
            assert.equal(await image.getAttribute("src"), expected);
            await image.evaluate((img) => img.decode());
            assert.equal(
              await page.locator(".otoc__placeholder").count(),
              phase === "after" ? 0 : 1
            );
            result.toc.push({ section: picture.section, src: expected });
            if ([1920, 1331].includes(width) || index === 0)
              await page.screenshot({
                path: `${out}/${phase}-${engine.name()}-${width}-toc-${picture.section}.png`,
                timeout: 10000,
                animations: "disabled",
              });
          }
          if ([1920, 1331].includes(width)) {
            for (const picture of pictures.filter(
              (p) => !["introduction", "references"].includes(p.section)
            )) {
              const section = page.locator(
                `section.reader-section[data-section-slug="${picture.section}"]`
              );
              const top = await section.evaluate(
                (el) => el.getBoundingClientRect().top + scrollY
              );
              const expected =
                phase === "after"
                  ? picture.art.src
                  : live.sections.find((s) => s.slug === picture.section).art
                      .src;
              let found = false;
              for (let y = top - height; y <= top + height * 0.3; y += 70) {
                await page.evaluate(
                  (y) => scrollTo({ top: y, behavior: "instant" }),
                  y
                );
                await page.waitForTimeout(80);
                const card = page.locator("[data-section-card] img");
                if (
                  (await card.count()) &&
                  (await card.getAttribute("src")) === expected
                ) {
                  found = true;
                  break;
                }
              }
              if (!found) {
                const first = await section
                  .locator(".animationTrigger")
                  .first()
                  .evaluate((el) => ({
                    id: el.id,
                    transition: el.classList.contains(
                      "section-transition-spacer"
                    ),
                  }))
                  .catch(() => null);
                result.cards.push({
                  section: picture.section,
                  shown: false,
                  first,
                });
                continue;
              }
              await page
                .locator("[data-section-card] img")
                .evaluate((img) => img.decode());
              assert.equal(
                await page.locator(".sec-card__placeholder").count(),
                phase === "after" ? 0 : 1
              );
              result.cards.push({ section: picture.section, src: expected });
              await page.screenshot({
                path: `${out}/${phase}-${engine.name()}-${width}-card-${picture.section}.png`,
                timeout: 10000,
                animations: "disabled",
              });
            }
          } else if (width < 1024)
            assert.equal(await page.locator("[data-section-card]").count(), 0);
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1
            ),
            "Horizontal overflow"
          );
          assert.deepEqual(result.errors, []);
          result.passed = true;
        } finally {
          save();
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
console.log(
  JSON.stringify(
    results.map(({ errors, browserWarnings, ...r }) => ({
      ...r,
      toc: r.toc.length,
      cards: r.cards.length,
      errors,
      browserWarnings: browserWarnings.length,
    })),
    null,
    2
  )
);
