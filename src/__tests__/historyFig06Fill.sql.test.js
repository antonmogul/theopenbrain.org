// @vitest-environment node
/** Runs 20261124078400_history_fig06_fill.sql in PGlite (OPENBRAIN-84).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyFig06Fill.sql.test.js (the SQL run is
 * skipped without it; the reader checks always run).
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { figureFill } from "@/helper/figureCycle";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261124078400_history_fig06_fill.sql",
  "utf8"
);
const KEY = "animationFoundationsPlatoAristotle";
const BASE = "/publicAssets/video/foundations/plato-aristotle-loop";
// The row as production holds it on 25 Nov (and the History fixture).
const before = {
  images: [
    {
      alt: "Two robed philosophers walk side by side under an arch.",
      src: `${BASE}.webp`,
      loop: {
        mp4: `${BASE}.mp4`,
        webm: `${BASE}.webm`,
        width: 960,
        height: 1280,
      },
    },
  ],
  caption: "Plato and his pupil Aristotle.",
  diagramType: "illustration",
  placeholder: true,
  figureNumber: 6,
};
const FOCUS = "50% 15%";

describe("Fig 06 fills the pane: the reader", () => {
  it("reads the migrated row as a fill around the heads, and today's row as before", () => {
    expect(figureFill(before)).toBe("");
    expect(figureFill({ ...before, fill: true, focus: FOCUS })).toBe(FOCUS);
  });

  it("names the focal point the migration writes", () => {
    expect(migration).toContain(`{"focus": "${FOCUS}"}`);
    expect(migration).not.toMatch(/^\s*(begin|commit)\s*;/im);
  });

  // The heads (hair to beard, in the film's 960 × 1280 pixels) stay inside
  // the crop on every pane from the narrowest two-column reader to an
  // ultra-wide screen: the pane is 100vw less the text column (50vw, at
  // least 35rem, at most 890px) wide, and the window less the top bar
  // (48px), the timeline (20px) and the FIG row (about 75px) tall.
  it("keeps the heads in frame from 1024 × 600 to 3440 × 1440", () => {
    const HEADS = { left: 205, top: 140, right: 760, bottom: 345 };
    const [fx, fy] = FOCUS.split(" ").map((v) => parseFloat(v) / 100);
    for (const [vw, vh] of [
      [1024, 600],
      [1024, 768],
      [1280, 720],
      [1331, 992],
      [1440, 900],
      [1920, 947],
      [1920, 1080],
      [2560, 1080],
      [2560, 1440],
      [3440, 1440],
    ]) {
      const w = vw - Math.min(890, Math.max(560, vw / 2));
      const h = vh - 48 - 20 - 75;
      const scale = Math.max(w / 960, h / 1280);
      const seen = {
        left: ((960 * scale - w) * fx) / scale,
        top: ((1280 * scale - h) * fy) / scale,
      };
      seen.right = seen.left + w / scale;
      seen.bottom = seen.top + h / scale;
      const size = `${vw}×${vh}`;
      expect(seen.left, size).toBeLessThanOrEqual(HEADS.left);
      expect(seen.top, size).toBeLessThanOrEqual(HEADS.top);
      expect(seen.right, size).toBeGreaterThanOrEqual(HEADS.right);
      expect(seen.bottom, size).toBeGreaterThanOrEqual(HEADS.bottom);
    }
  });
});

describe.skipIf(!harness || !existsSync(harness))(
  "Fig 06 fills the pane (SQL)",
  () => {
    async function fresh(config = before) {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(`create schema if not exists public;
        create table public.animations (animation_key text primary key,
          config jsonb, updated_at timestamptz);`);
      await db.query(
        `insert into public.animations(animation_key, config) values
           ($1, $2), ('animationFoundationsFig1', $3)`,
        [KEY, config, { images: [{ src: "/x.webp" }] }]
      );
      return db;
    }
    const rows = async (db) =>
      (await db.query("select * from public.animations order by animation_key"))
        .rows;

    it("sets fill and the focal point on Fig 06 only, keeps every other key and replays as a no-op", async () => {
      const db = await fresh();
      try {
        await db.exec(migration);
        const result = await rows(db);
        const [fig1, plato] = result;
        expect(fig1.config).toEqual({ images: [{ src: "/x.webp" }] });
        expect(fig1.updated_at).toBeNull();
        expect(plato.config).toEqual({ ...before, fill: true, focus: FOCUS });
        expect(plato.updated_at).not.toBeNull();
        expect(figureFill(plato.config)).toBe(FOCUS);
        await db.exec(migration);
        expect(await rows(db)).toEqual(result);
      } finally {
        await db.close();
      }
    });

    it("keeps a focal point an author set, and turns a stored non-true fill into true", async () => {
      const db = await fresh({ ...before, fill: "yes", focus: "40% 20%" });
      try {
        await db.exec(migration);
        const plato = (await rows(db))[1];
        expect(plato.config).toEqual({
          ...before,
          fill: true,
          focus: "40% 20%",
        });
      } finally {
        await db.close();
      }
    });

    it("fills a null config and does nothing without the row", async () => {
      const db = await fresh();
      try {
        await db.query(
          "update public.animations set config = null where animation_key = $1",
          [KEY]
        );
        await db.exec(migration);
        expect((await rows(db))[1].config).toEqual({
          fill: true,
          focus: FOCUS,
        });
        await db.query(
          "delete from public.animations where animation_key = $1",
          [KEY]
        );
        await db.exec(migration);
        expect(await rows(db)).toHaveLength(1);
      } finally {
        await db.close();
      }
    });
  }
);
