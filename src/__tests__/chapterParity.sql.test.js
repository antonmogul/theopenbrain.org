// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transformModuleToChapterFormat } from "../composables/chapterTransform.mjs";
import { buildOutline } from "../composables/useChapterOutline";
const harness = process.env.HISTORY_SQL_HARNESS;
const require = createRequire(import.meta.url);
const sql = readFileSync(
  "supabase/migrations/20261120066600_retina_introduction_title.sql",
  "utf8"
);
describe.skipIf(!harness || !existsSync(harness))(
  "chapter parity migration",
  () => {
    it("changes only Retina introduction metadata, renders its section label, and replays safely", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      try {
        await db.exec(`create table modules(id int,slug text,title text,credits jsonb);
   create table sections(id int,module_id int,slug text,title text,order_index int,updated_at timestamptz);
   insert into modules values(1,'the-retina','The Retina','{"acknowledgements":[]}'),(2,'foundations-of-neuroscience','Foundations of Neuroscience','{"acknowledgements":["Author text"]}'),(3,'attention-and-working-memory','Attention',null);
   insert into sections values(1,1,'introduction','The Retina',0,null),(2,1,'story-of-the-eye','Story of the eye',1,null),(3,2,'introduction','Introduction',0,null),(4,3,'introduction','Introduction',0,null),(5,2,'another','The Retina',1,null);`);
        const before = (await db.query("select * from sections order by id"))
          .rows;
        const credits = (
          await db.query("select credits from modules order by id")
        ).rows;
        await db.exec(sql);
        const after = (await db.query("select * from sections order by id"))
          .rows;
        expect(after[0].title).toBe("Introduction");
        expect(after.slice(1)).toEqual(before.slice(1));
        expect(
          (await db.query("select credits from modules order by id")).rows
        ).toEqual(credits);
        const text = transformModuleToChapterFormat({
          id: 1,
          slug: "the-retina",
          title: "The Retina",
          sections: after
            .filter((s) => s.module_id === 1)
            .map((s) => ({ ...s, paragraphs: [] })),
        });
        expect(text.intro[0]).toMatchObject({
          title: "The Retina",
          sectionTitle: "Introduction",
        });
        expect(buildOutline(text)[0]).toMatchObject({
          label: "0",
          title: "Introduction",
        });
        await db.exec(sql);
        expect(
          (await db.query("select * from sections order by id")).rows
        ).toEqual(after);
        await db.exec(
          "update sections set title='An author’s introduction' where id=1"
        );
        await db.exec(sql);
        expect(
          (await db.query("select title from sections where id=1")).rows[0]
            .title
        ).toBe("An author’s introduction");
      } finally {
        await db.close();
      }
    });
  }
);
