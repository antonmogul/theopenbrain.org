// @vitest-environment node
/** Runs 20261112193000_history_loewi_kicker.sql in PGlite (OPENBRAIN-190).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiKicker.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261112193000_history_loewi_kicker.sql",
  "utf8"
);
const fixture = JSON.parse(
  readFileSync("src/stories/historyFullReaderData.json", "utf8")
);
const KICKER = "Otto’s dream experiment";
const schema = `
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  config jsonb, updated_at timestamptz default '2026-11-01');
insert into animations(animation_key, config) values
  ('animationFoundationsLoewiWidget', '{"credit": "Stuart Trenholm, after Loewi (1921), Figure 1", "widgetId": "upload:loewi-vagusstoff"}'),
  ('animationFoundationsFig6', '{"figureNumber": 6}');
`;

describe("Loewi's kicker (fixture)", () => {
  it("is the one the migration writes, on the published figure", () => {
    const row = fixture.animations.find(
      (a) => a.animation_key === "animationFoundationsLoewiWidget"
    );
    expect(row.config.kicker).toBe(KICKER);
    expect(sql).toContain(`'${KICKER}'`);
  });
});

describe.skipIf(!harness || !existsSync(harness))(
  "Loewi's kicker (SQL)",
  () => {
    it("names Otto's dream on the Loewi figure only, keeps its config, and runs twice", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      const first = await db.query(
        "select animation_key k, config c, updated_at u from animations order by 1"
      );
      expect(first.rows[0].c).toEqual({ figureNumber: 6 });
      expect(first.rows[1].c).toEqual({
        credit: "Stuart Trenholm, after Loewi (1921), Figure 1",
        widgetId: "upload:loewi-vagusstoff",
        kicker: KICKER,
      });
      await db.exec(sql);
      const second = await db.query(
        "select updated_at u from animations where animation_key = 'animationFoundationsLoewiWidget'"
      );
      // The second run finds nothing to change.
      expect(second.rows[0].u).toEqual(first.rows[1].u);
    });

    it("finds nothing to do without the figure", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(
        "create table public.animations (id serial primary key, animation_key text unique not null, config jsonb, updated_at timestamptz)"
      );
      await db.exec(sql);
      const { rows } = await db.query("select count(*)::int n from animations");
      expect(rows[0].n).toBe(0);
    });
  }
);
