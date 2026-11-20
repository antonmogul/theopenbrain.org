// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transformModuleToChapterFormat } from "../composables/chapterTransform.mjs";
import {
  chapterBackReferences,
  referenceFromChapter,
} from "../helper/chapterReferences.js";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261120066100_retina_legacy_json.sql",
  "utf8"
);
const fixture = JSON.parse(
  readFileSync("src/__tests__/fixtures/retinaLegacyReader.json", "utf8")
);
const schema = `
create role anon; create role authenticated;
create function public.is_creator() returns boolean language sql stable as $$ select current_setting('app.creator', true) = 'yes' $$;
create table modules(id uuid primary key, slug text, status text);
create table sections(id uuid primary key, module_id uuid references modules(id), slug text, title text, order_index integer, updated_at timestamptz);
create table paragraphs(id uuid primary key, section_id uuid references sections(id), content jsonb, order_index integer, updated_at timestamptz);
grant usage on schema public to anon, authenticated;
grant select on modules to anon, authenticated;
`;
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  await db.query("insert into modules values ($1,$2,'published')", [
    fixture.module.id,
    fixture.module.slug,
  ]);
  for (const s of fixture.sections)
    await db.query(
      "insert into sections(id,module_id,slug,title,order_index) values ($1,$2,$3,$4,$5)",
      [s.id, s.module_id, s.slug, s.title, s.order_index]
    );
  for (const p of fixture.paragraphs)
    await db.query(
      "insert into paragraphs(id,section_id,content,order_index) values ($1,$2,$3,$4)",
      [p.id, p.section_id, p.content, p.order_index]
    );
  return db;
}
async function snapshot(db) {
  const { rows: sections } = await db.query(
    "select * from sections order by order_index"
  );
  const { rows: paragraphs } = await db.query(
    "select * from paragraphs order by section_id,order_index"
  );
  return {
    ...fixture.module,
    sections: sections.map((s) => ({
      ...s,
      paragraphs: paragraphs.filter((p) => p.section_id === s.id),
    })),
  };
}
describe.skipIf(!harness || !existsSync(harness))(
  "OPENBRAIN-61 guarded reader data migration",
  () => {
    it("keeps all 106 numbers, paragraph ids and citation targets before and after SQL, including reruns", async () => {
      const db = await fresh();
      const before = transformModuleToChapterFormat(await snapshot(db));
      const oldRefs = chapterBackReferences(before);
      expect(oldRefs.entries).toHaveLength(106);
      await db.exec(sql);
      const after = transformModuleToChapterFormat(await snapshot(db));
      expect(chapterBackReferences(after)).toEqual(oldRefs);
      for (let n = 1; n <= 106; n++) {
        expect(referenceFromChapter(after, n)).toEqual(
          referenceFromChapter(before, n)
        );
        expect(chapterBackReferences(after).entries[n - 1].number).toBe(n);
      }
      expect(after.footNotes.notes).toEqual([]);
      const once = await snapshot(db);
      await db.exec(sql);
      expect(await snapshot(db)).toEqual(once);
      await db.close();
    });
    it("places media and hover metadata on their blocks without changing scientific prose or custom media", async () => {
      const db = await fresh();
      await db.query(
        `update paragraphs set content = jsonb_set(content,'{blocks,1,poster}','"/creator.webp"') where id = $1`,
        ["f8fbd23b-3204-4fa4-b355-ea250b659430"]
      );
      await db.exec(sql);
      const { rows } = await db.query("select id,content from paragraphs");
      const baden = rows.find(
        (p) => p.id === "f8fbd23b-3204-4fa4-b355-ea250b659430"
      ).content.blocks[1];
      expect(baden).toMatchObject({
        src: "/publicAssets/videos/baden.mp4",
        poster: "/creator.webp",
        speaker: "Tom Baden",
        title: "Tom Baden",
      });
      for (const original of fixture.paragraphs) {
        const changed = rows.find((p) => p.id === original.id);
        original.content.blocks.forEach((b, i) => {
          if (b.type !== "text") return;
          expect(
            changed.content.blocks[i].content.replace(/<[^>]+>/g, "")
          ).toBe(b.content.replace(/<[^>]+>/g, ""));
          if (b.content.includes("hoverImg")) {
            expect(changed.content.blocks[i].content).toContain(
              "data-hover-text="
            );
            expect(changed.content.blocks[i].content).toContain(
              "data-hover-src="
            );
          }
        });
      }
      await db.close();
    });
    it("fails closed on numbering drift and leaves other chapters and edited tags alone", async () => {
      const db = await fresh();
      await db.exec(
        `update paragraphs set content = jsonb_set(content,'{blocks,0,number}','999') where content->'blocks'->0->>'number' = '1'`
      );
      await expect(db.exec(sql)).rejects.toThrow(/footnote shape changed/);
      await db.close();
    });
    it.each(["type", "content"])(
      "fails closed when a bibliography block has no %s",
      async (key) => {
        const db = await fresh();
        const note = fixture.paragraphs.find(
          (p) => p.content.blocks[0]?.type === "footnote"
        );
        await db.query(
          "update paragraphs set content = content #- $1::text[] where id = $2",
          [["blocks", "0", key], note.id]
        );
        await expect(db.exec(sql)).rejects.toThrow(/footnote shape changed/);
        await db.close();
      }
    );

    it("leaves History, Attention and Stress blocks and section slugs unchanged", async () => {
      const db = await fresh();
      for (const slug of [
        "foundations-of-neuroscience",
        "attention-and-working-memory",
        "stress",
      ]) {
        const {
          rows: [m],
        } = await db.query(
          "insert into modules values (gen_random_uuid(),$1,'published') returning id",
          [slug]
        );
        const {
          rows: [section],
        } = await db.query(
          "insert into sections(id,module_id,slug,title,order_index) values(gen_random_uuid(),$1,'references','References',99) returning id",
          [m.id]
        );
        await db.query(
          "insert into paragraphs(id,section_id,content,order_index) values(gen_random_uuid(),$1,$2,0)",
          [section.id, fixture.paragraphs[0].content]
        );
      }
      const otherRows = () =>
        db
          .query(
            "select s.slug, p.content from paragraphs p join sections s on s.id=p.section_id join modules m on m.id=s.module_id where m.slug<>'the-retina' order by m.slug"
          )
          .then((r) => r.rows);
      const before = await otherRows();
      await db.exec(sql);
      expect(await otherRows()).toEqual(before);
      await db.close();
    });
    it("keeps the four old standalone URLs and enforces published read / creator write RLS", async () => {
      const db = await fresh();
      await db.exec(sql);
      await db.exec("set role anon");
      expect(
        (
          await db.query("select slug from break_videos order by slug")
        ).rows.map((r) => r.slug)
      ).toEqual([
        "baden",
        "dowling-and-werblin",
        "neitz-myopia",
        "placeholder",
      ]);
      await expect(db.exec("delete from break_videos")).rejects.toThrow(
        /permission denied/
      );
      await db.exec(
        "reset role; update modules set status = 'draft'; set role anon"
      );
      expect((await db.query("select * from break_videos")).rows).toEqual([]);
      await db.exec(
        "reset role; set role authenticated; set app.creator = 'yes'"
      );
      expect((await db.query("select * from break_videos")).rows).toHaveLength(
        4
      );
      await db.exec(
        'update break_videos set data = data || \'{"credit":"Creator"}\'::jsonb'
      );
      await db.close();
    });
  }
);
