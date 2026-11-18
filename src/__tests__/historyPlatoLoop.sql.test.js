// @vitest-environment node
/** Runs 20261118090100_history_plato_aristotle_loop.sql in PGlite (OPENBRAIN-201).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyPlatoLoop.sql.test.js (the SQL run is
 * skipped without it; the file checks always run).
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { figureImages } from "@/helper/figureCycle";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261118090100_history_plato_aristotle_loop.sql",
  "utf8"
);
const OLD = "/publicAssets/images/foundations/plato-aristotle.webp";
const BASE = "/publicAssets/video/foundations/plato-aristotle-loop";
const ALT =
  "Two robed philosophers walk side by side under an arch. Plato, older and white-bearded, in red and purple, holds up a brain; Aristotle, in blue and brown, holds a heart in his open hand.";
const CAPTION =
  "Plato and his pupil Aristotle, after Raphael's The School of Athens (1509–1511). Plato, who placed the mind in the head, holds a brain; Aristotle, who placed it in the heart, holds a heart.";
// The row as production held it on 18 Nov (and the History fixture before).
const before = {
  images: [{ alt: ALT, src: OLD }],
  caption: CAPTION,
  diagramType: "illustration",
  placeholder: true,
  figureNumber: 6,
};

describe("Plato and Aristotle loop: files", () => {
  it("ships the poster and both encodings, small", () => {
    for (const ext of ["webp", "webm", "mp4"]) {
      const path = `public${BASE}.${ext}`;
      expect(existsSync(path), path).toBe(true);
      expect(statSync(path).size).toBeLessThan(400_000);
    }
  });
});

describe.skipIf(!harness || !existsSync(harness))(
  "Plato and Aristotle loop (SQL)",
  () => {
    async function fixture(config = before) {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(`create schema if not exists public;
        create table public.animations (animation_key text primary key,
          image_file_url text, config jsonb, updated_at timestamptz default now());`);
      await db.query(
        `insert into public.animations values
           ('animationFoundationsPlatoAristotle', $1, $2, '2026-11-17'),
           ('animationFoundationsFig1', '/x.webp', '{"images":[{"src":"/x.webp"}]}', '2026-11-17')`,
        [config.images[0].src, JSON.stringify(config)]
      );
      return db;
    }
    const rows = async (db) =>
      (await db.query("select * from public.animations order by animation_key"))
        .rows;

    it("puts the loop on the figure, keeping its legend, alt and number", async () => {
      const db = await fixture();
      try {
        await db.exec(sql);
        const [fig1, plato] = await rows(db);
        expect(fig1.config).toEqual({ images: [{ src: "/x.webp" }] });
        expect(plato.image_file_url).toBe(`${BASE}.webp`);
        expect(plato.config).toEqual({
          ...before,
          images: [
            {
              alt: ALT,
              src: `${BASE}.webp`,
              loop: {
                webm: `${BASE}.webm`,
                mp4: `${BASE}.mp4`,
                width: 960,
                height: 1280,
              },
            },
          ],
        });
        // What the reader makes of it.
        expect(figureImages(plato.config)[0].loop).toEqual({
          webm: `${BASE}.webm`,
          mp4: `${BASE}.mp4`,
          width: 960,
          height: 1280,
        });
        const first = await rows(db);
        await db.exec(sql);
        expect(await rows(db)).toEqual(first);
      } finally {
        await db.close();
      }
    });

    it("leaves a figure an author has changed since", async () => {
      const edited = { ...before, images: [{ alt: ALT, src: "/theirs.webp" }] };
      const db = await fixture(edited);
      try {
        await db.exec(sql);
        expect((await rows(db))[1].config).toEqual(edited);
      } finally {
        await db.close();
      }
    });
  }
);
