// @vitest-environment node
/** Runs 20261021030000_history_loewi_widget_fit.sql in PGlite (OPENBRAIN-148).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyLoewiWidgetFit.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261021030000_history_loewi_widget_fit.sql",
  "utf8"
);
// Historical migration remains immutable when a later guarded reupload changes the file.
const file = sql.split("$w$")[1];
const schema = `
create table public.widget_uploads (id uuid primary key default gen_random_uuid(), slug text unique not null,
  html text not null, updated_at timestamptz default now());
insert into widget_uploads(slug, html, updated_at) values
  ('loewi-vagusstoff', '<!DOCTYPE html><html><head><style>#scene{max-height:calc(100vh - 150px)}</style></head></html>', '2026-10-09'),
  ('attn-sdt', '<p>sdt</p>', '2026-10-09');
`;

describe.skipIf(!harness || !existsSync(harness))(
  "Loewi widget fits the pane (SQL)",
  () => {
    it("replaces the upload's html with the fit-aware file, once", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      let { rows } = await db.query(
        "select slug, html, updated_at from widget_uploads order by slug"
      );
      expect(rows[1].slug).toBe("loewi-vagusstoff");
      expect(rows[1].html).toBe(file);
      expect(rows[1].html).toContain("html[data-ob-fit]");
      const stamped = rows[1].updated_at;
      expect(new Date(stamped).getFullYear()).toBeGreaterThan(2026 - 1);
      // The other upload is untouched.
      expect(rows[0]).toMatchObject({ slug: "attn-sdt", html: "<p>sdt</p>" });
      // Running it again changes nothing.
      await db.exec(sql);
      ({ rows } = await db.query(
        "select updated_at from widget_uploads where slug = 'loewi-vagusstoff'"
      ));
      expect(String(rows[0].updated_at)).toBe(String(stamped));
      await db.close();
    });
  }
);
