// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261124078000_history_tint_fade.sql",
  "utf8"
);
const flagged = [
  "animationFoundationsClosingHM",
  "animationFoundationsMilnerHM",
  "animationFoundationsFig9",
  "animationFoundationsFig12",
  "animationFoundationsFig17",
  "animationFoundationsFig18",
];
// Line art, a figure whose only photograph is a baked poster, a widget.
const untouched = [
  "animationFoundationsFig1",
  "animationFoundationsFig21",
  "animationFoundationsLoewiWidget",
];
const config = { images: [{ src: "/a.jpg" }], figureNumber: 3, custom: "kept" };

async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(`create table animations(id int generated always as identity primary key,
    animation_key text unique, config jsonb, updated_at timestamptz);`);
  for (const key of [...flagged, ...untouched])
    await db.query(
      "insert into animations(animation_key, config) values ($1,$2)",
      [key, config]
    );
  return db;
}
const rows = async (db) =>
  (await db.query("select * from animations order by id")).rows;

describe.skipIf(!harness || !existsSync(harness))(
  "History tint fade (SQL)",
  () => {
    it("flags only History's photographs, keeps every other key and replays as a no-op", async () => {
      const db = await fresh();
      try {
        await db.exec(migration);
        const result = await rows(db);
        for (const row of result) {
          if (flagged.includes(row.animation_key)) {
            expect(row.config).toEqual({ ...config, tintFade: true });
            expect(row.updated_at).not.toBeNull();
          } else {
            expect(row.config).toEqual(config);
            expect(row.updated_at).toBeNull();
          }
        }
        await db.exec(migration);
        expect(await rows(db)).toEqual(result);
      } finally {
        await db.close();
      }
    });

    it("turns a stored non-true value into true and fills a null config", async () => {
      const db = await fresh();
      try {
        await db.query(
          "update animations set config = $1 where animation_key = $2",
          [{ ...config, tintFade: "yes" }, flagged[0]]
        );
        await db.query(
          "update animations set config = null where animation_key = $1",
          [flagged[1]]
        );
        await db.exec(migration);
        const byKey = Object.fromEntries(
          (await rows(db)).map((row) => [row.animation_key, row.config])
        );
        expect(byKey[flagged[0]]).toEqual({ ...config, tintFade: true });
        expect(byKey[flagged[1]]).toEqual({ tintFade: true });
      } finally {
        await db.close();
      }
    });
  }
);
