// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PENFIELD_TITLE } from "@/helper/penfieldPresentation";
const harness = process.env.HISTORY_SQL_HARNESS;
const require = createRequire(import.meta.url);
const sql = readFileSync(
  "supabase/migrations/20261022020000_penfield_experience_title.sql",
  "utf8"
);
describe.skipIf(!harness || !existsSync(harness))(
  "Penfield title migration",
  () => {
    it("changes only known History titles at any block index and is idempotent", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      try {
        await db.exec(`
        create table modules(id int primary key, slug text);
        create table sections(id int primary key, module_id int);
        create table paragraphs(id int primary key, section_id int, content jsonb, updated_at timestamptz default '2026-01-01');
        insert into modules values(1, 'foundations-of-neuroscience'),(2, 'the-retina');
        insert into sections values(1,1),(2,2);
      `);
        const widget = {
          type: "widget",
          widgetId: "case-cabinet",
          title: "Be Penfield",
          blurb: "Keep this",
          kind: "breakout",
        };
        const before = [
          {
            blocks: [
              { type: "text", text: "Scientific content" },
              widget,
              { ...widget },
            ],
            extra: "preserve",
          },
          { blocks: [{ ...widget, title: "Author's newer title" }] },
          { blocks: [{ ...widget, widgetId: "other" }] },
          { blocks: [widget] },
          { blocks: null },
          { text: "No blocks" },
          { blocks: { malformed: true } },
          { blocks: [] },
        ];
        for (let i = 0; i < before.length; i++) {
          await db.query(
            "insert into paragraphs(id,section_id,content) values($1,$2,$3)",
            [i + 1, i === 3 ? 2 : 1, JSON.stringify(before[i])]
          );
        }
        await db.exec(sql);
        const once = (await db.query("select * from paragraphs order by id"))
          .rows;
        const expected = JSON.parse(JSON.stringify(before));
        expected[0].blocks[1].title = PENFIELD_TITLE;
        expected[0].blocks[2].title = PENFIELD_TITLE;
        expect(once.map((p) => p.content)).toEqual(expected);
        expect(once[0].updated_at).not.toEqual(once[1].updated_at);
        await db.exec(sql);
        expect(
          (await db.query("select * from paragraphs order by id")).rows
        ).toEqual(once);
      } finally {
        await db.close();
      }
    });
  }
);
