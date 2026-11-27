// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { staticChecks } from "@/widgets/uploaded/widgetHost";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const read = (p) => readFileSync(p, "utf8");
const htmlIn = (s) => s.slice(s.indexOf("$w$") + 3, s.lastIndexOf("$w$"));
const uploads = [
  [
    "history-penfield-binder",
    "20261124078900_history_penfield_binder_v7",
    "20261127100000_history_penfield_binder_v8",
  ],
  [
    "loewi-vagusstoff",
    "20261125099000_history_loewi_v7",
    "20261127100100_history_loewi_v8",
  ],
].map(([slug, before, after]) => ({
  slug,
  before: htmlIn(read(`supabase/migrations/${before}.sql`)),
  sql: read(`supabase/migrations/${after}.sql`),
  file: read(`src/widgets/uploads/${slug}.html`),
}));
const card = read(
  "supabase/migrations/20261127100200_history_descartes_title_card.sql"
);

describe("OPENBRAIN-100 upload source contracts", () => {
  it.each(uploads)(
    "$slug ships its reviewed file byte for byte",
    ({ sql, file }) => {
      expect(htmlIn(sql)).toBe(file);
      expect(staticChecks(file).filter((c) => !c.ok)).toEqual([]);
    }
  );
});

describe.skipIf(!harness || !existsSync(harness))(
  "OPENBRAIN-100 guarded SQL",
  () => {
    it.each(uploads)(
      "$slug replaces v7 once, preserves metadata and refuses later edits",
      async ({ slug, before, sql, file }) => {
        const { PGlite } = require(harness);
        const db = new PGlite();
        try {
          await db.exec(
            "create table widget_uploads(slug text primary key, html text, title text, updated_at timestamptz default now());"
          );
          await db.query(
            "insert into widget_uploads(slug,html,title) values($1,$2,'Author title'),('other','Unchanged','Other')",
            [slug, before]
          );
          await db.exec(sql);
          const rows = async () =>
            (await db.query("select * from widget_uploads order by slug")).rows;
          const first = await rows();
          expect(first.find((r) => r.slug === slug)).toMatchObject({
            html: file,
            title: "Author title",
          });
          expect(first.find((r) => r.slug === "other").html).toBe("Unchanged");
          await db.exec(sql);
          expect(await rows()).toEqual(first);
          await db.query("update widget_uploads set html=$1 where slug=$2", [
            before + "<!-- author edit -->",
            slug,
          ]);
          await expect(db.exec(sql)).rejects.toThrow("expected baseline");
          expect((await rows()).find((r) => r.slug === slug).html).toBe(
            before + "<!-- author edit -->"
          );
          await db.query("delete from widget_uploads where slug=$1", [slug]);
          await expect(db.exec(sql)).rejects.toThrow("upload missing");
        } finally {
          await db.close();
        }
      }
    );

    it("enables only Descartes, preserves all authored card keys and is idempotent", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      const id = "2d9d7545-fff6-44fd-bcb7-2901ede25045";
      const prior = {
        enabled: false,
        image: { src: "/author-image.jpg", alt: "Author alt" },
        quote: "Author words",
        layers: [],
      };
      try {
        await db.exec(
          "create table modules(id int,slug text); create table sections(id uuid, module_id int,slug text,box_card jsonb); insert into modules values(1,'foundations-of-neuroscience'),(2,'other');"
        );
        await db.query(
          "insert into sections values($1,1,'box-descartes',$2),('00000000-0000-0000-0000-000000000001',2,'box-descartes',$2)",
          [id, prior]
        );
        await db.exec(card);
        const rows = async () =>
          (await db.query("select * from sections order by module_id")).rows;
        const first = await rows();
        expect(first[0].box_card).toEqual({ ...prior, enabled: true });
        expect(first[1].box_card).toEqual(prior);
        await db.exec(card);
        expect(await rows()).toEqual(first);
        await db.query("update sections set box_card=$1 where module_id=1", [
          { image: prior.image },
        ]);
        await expect(db.exec(card)).rejects.toThrow("expected false");
        await db.exec("delete from sections where module_id=1");
        await expect(db.exec(card)).rejects.toThrow("section missing");
      } finally {
        await db.close();
      }
    });
  }
);
