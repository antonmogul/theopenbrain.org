// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pictures from "../../scripts/figures/placeholder-section-art.json";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261120066500_placeholder_section_art.sql",
  "utf8"
);
describe.skipIf(!harness || !existsSync(harness))(
  "placeholder section art migration",
  () => {
    it("fills only matching NULL art in published/draft chapters and is repeatable", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      try {
        await db.exec(
          `create table modules(id serial primary key,slug text,status text); create table sections(id serial primary key,module_id int,slug text,art jsonb,prose text default 'author text');`
        );
        for (const chapter of [
          ...new Set(pictures.map((p) => p.chapter)),
          "foundations-of-neuroscience",
          "unrelated",
        ]) {
          await db.query("insert into modules(slug,status) values ($1,$2)", [
            chapter,
            chapter === "stress" ? "draft" : "published",
          ]);
        }
        for (const p of pictures)
          await db.query(
            "insert into sections(module_id,slug) select id,$1 from modules where slug=$2",
            [p.section, p.chapter]
          );
        await db.exec(
          `insert into sections(module_id,slug,art) select id,'introduction','{"src":"/designer.webp"}' from modules where slug in ('unrelated','foundations-of-neuroscience'); insert into modules(slug,status) values ('the-retina','archived'); insert into sections(module_id,slug) select id,'introduction' from modules where status='archived';`
        );
        await db.exec(sql);
        for (const p of pictures) {
          const { rows } = await db.query(
            "select s.* from sections s join modules m on m.id=s.module_id where m.slug=$1 and m.status!='archived' and s.slug=$2",
            [p.chapter, p.section]
          );
          expect(rows[0].art).toEqual(p.art);
          expect(rows[0].prose).toBe("author text");
          expect(existsSync(`public${p.art.src}`)).toBe(true);
        }
        const snapshot = (await db.query("select * from sections order by id"))
          .rows;
        await db.exec(sql);
        expect(
          (await db.query("select * from sections order by id")).rows
        ).toEqual(snapshot);
        expect(
          (
            await db.query(
              "select s.art from sections s join modules m on m.id=s.module_id where m.status='archived'"
            )
          ).rows[0].art
        ).toBeNull();
        await db.exec(
          `update sections set art='{"src":"/designer.webp","extra":1}' where slug='introduction';`
        );
        await db.exec(sql);
        for (const row of (
          await db.query("select art from sections where slug='introduction'")
        ).rows)
          expect(row.art).toEqual({ src: "/designer.webp", extra: 1 });
      } finally {
        await db.close();
      }
    });
  }
);
