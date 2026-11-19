// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import textFixture from "./fixtures/retinaTextReview.json";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261119510000_retina_figure_notes.sql",
  "utf8"
);
const textSql = readFileSync(
  "supabase/migrations/20261119500000_retina_text_review.sql",
  "utf8"
);
const schema = `
create table modules(id uuid primary key default gen_random_uuid(), slug text);
create table sections(id uuid primary key default gen_random_uuid(), module_id uuid references modules(id), slug text, animation_config jsonb, updated_at timestamptz);
create table animations(id uuid primary key default gen_random_uuid(), animation_key text);
create table paragraphs(id uuid primary key, section_id uuid references sections(id), content jsonb, animation_id uuid references animations(id), has_animation boolean, animation_trigger text, updated_at timestamptz);
insert into modules(slug) values ('the-retina');
insert into sections(module_id,slug,animation_config) select id, 'horizontal-cells-and-feedback', '{"id":"animationRetinalCellTypes3","name":"RetinalCellTypes","stage":"Horizontal cells","custom":true}' from modules;
insert into sections(module_id,slug) select id, 'photoreceptors-and-phototransduction' from modules;
insert into animations(animation_key) values ('widget-upload:retina-photoreceptors'),('widget-upload:retina-center-surround');
insert into paragraphs(id,section_id,animation_id,content) select '42828df2-c097-4ecc-9a06-978899b5ccad', s.id,a.id,'{"blocks":[{"type":"text","content":"Keep this"}],"animationFlags":{"start":true}}' from sections s,animations a where s.slug='photoreceptors-and-phototransduction' and a.animation_key='widget-upload:retina-photoreceptors';
insert into paragraphs(id,section_id,animation_id,content) select '9d0c04b0-f71e-4b4d-8533-ba5c37c7eedc',s.id,a.id,'{"blocks":[]}' from sections s,animations a where s.slug='photoreceptors-and-phototransduction' and a.animation_key='widget-upload:retina-center-surround';
insert into paragraphs(id,section_id,content) select '6cb473ef-50d9-4976-b8b0-707be960fbc7', id,'{"blocks":[{"type":"text","content":"Light sensitivity and temporal differences between rods and cones. Original prose"}]}' from sections where slug='photoreceptors-and-phototransduction';
`;
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  return db;
}
describe.skipIf(!harness || !existsSync(harness))(
  "Retina figure review migration",
  () => {
    it("restores the horizontal preset and three holds, preserving prose and flags on rerun", async () => {
      const db = await fresh();
      await db.exec(sql);
      const one = await db.query("select * from paragraphs order by id");
      await db.exec(sql);
      expect(
        (await db.query("select * from paragraphs order by id")).rows
      ).toEqual(one.rows);
      expect(
        one.rows.every((p) => p.content.animationFlags.hold === "next")
      ).toBe(true);
      expect(one.rows.find((p) => p.id.startsWith("42828")).content).toEqual({
        blocks: [{ type: "text", content: "Keep this" }],
        animationFlags: { start: true, hold: "next" },
      });
      const placed = one.rows.find((p) => p.id.startsWith("6cb47"));
      expect(placed.has_animation).toBe(true);
      expect(placed.animation_id).toBe(
        one.rows.find((p) => p.id.startsWith("42828")).animation_id
      );
      expect(
        (
          await db.query(
            "select animation_config c from sections where slug='horizontal-cells-and-feedback'"
          )
        ).rows[0].c
      ).toEqual({
        id: "animationRetinalCellTypes3",
        name: "RetinalCellTypes3",
        stage: "Horizontal cells",
        custom: true,
      });
      await db.close();
    });
    it("applies after main's 500000 text migration without changing its citations, chart or deletions", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(`
        create table modules(id uuid primary key,slug text);
        create table sections(id uuid primary key,module_id uuid,slug text,animation_config jsonb,updated_at timestamptz);
        create table animations(id uuid primary key default gen_random_uuid(),animation_key text unique,title text,media_type text,image_file_url text,interaction_type text,component_name text,config jsonb,updated_at timestamptz);
        create table paragraphs(id uuid primary key,section_id uuid,order_index int,content jsonb,content_text text,has_animation boolean,animation_id uuid,animation_trigger text,is_subsection_header boolean,subsection_level int,updated_at timestamptz);
      `);
      await db.query("insert into modules values ($1,$2)", [
        textFixture.module.id,
        "the-retina",
      ]);
      const records = {
        sections: [
          textFixture.sections,
          ["id", "module_id", "slug", "animation_config"],
        ],
        animations: [
          textFixture.animations,
          ["id", "animation_key", "title", "config", "image_file_url"],
        ],
        paragraphs: [
          [...textFixture.paragraphs, ...textFixture.footnotes],
          [
            "id",
            "section_id",
            "order_index",
            "content",
            "content_text",
            "has_animation",
            "animation_id",
            "animation_trigger",
            "is_subsection_header",
            "subsection_level",
          ],
        ],
      };
      for (const [table, [rows, columns]] of Object.entries(records))
        for (const row of rows)
          await db.query(
            `insert into ${table} (${columns.join(",")}) values (${columns.map((_, i) => `$${i + 1}`).join(",")})`,
            columns.map((c) => row[c])
          );
      for (const [id, key] of [
        [
          "42828df2-c097-4ecc-9a06-978899b5ccad",
          "widget-upload:retina-photoreceptors",
        ],
        [
          "9d0c04b0-f71e-4b4d-8533-ba5c37c7eedc",
          "widget-upload:retina-center-surround",
        ],
      ])
        await db.query(
          "insert into animations (id,animation_key) values ($1,$2)",
          [textFixture.paragraphs.find((p) => p.id === id).animation_id, key]
        );
      await db.exec(textSql);
      // A prose edit must not disable a placement-only repair.
      await db.query(
        "update paragraphs set content=jsonb_set(content,'{blocks,0,content}',to_jsonb($1::text)) where id=$2",
        [
          'Reviewed rod/cone opening <sup class="citation-ref" data-ref="28">28</sup>',
          "6cb473ef-50d9-4976-b8b0-707be960fbc7",
        ]
      );
      const before = (
        await db.query("select id,content from paragraphs order by id")
      ).rows;
      const artBefore = (await db.query("select * from animations order by id"))
        .rows;
      expect(before).toHaveLength(
        textFixture.paragraphs.length + textFixture.footnotes.length - 3
      );
      expect(JSON.stringify(before)).toContain("citation-ref");
      await db.exec(sql);
      const after = (
        await db.query(
          "select id,content,animation_id from paragraphs order by id"
        )
      ).rows;
      expect(after).toHaveLength(before.length);
      for (const row of after)
        expect(row.content.blocks).toEqual(
          before.find((p) => p.id === row.id).content.blocks
        );
      for (const id of [
        "42828df2-c097-4ecc-9a06-978899b5ccad",
        "9d0c04b0-f71e-4b4d-8533-ba5c37c7eedc",
        "6cb473ef-50d9-4976-b8b0-707be960fbc7",
      ])
        expect(after.find((p) => p.id === id).content.animationFlags.hold).toBe(
          "next"
        );
      expect(after.find((p) => p.id.startsWith("6cb47")).animation_id).toBe(
        after.find((p) => p.id.startsWith("42828")).animation_id
      );
      expect(
        (await db.query("select * from animations order by id")).rows
      ).toEqual(artBefore);
      const snapshot = (await db.query("select * from paragraphs order by id"))
        .rows;
      await db.exec(sql);
      expect(
        (await db.query("select * from paragraphs order by id")).rows
      ).toEqual(snapshot);
      await db.close();
    });
    it("preserves later placement choices and edited section presets", async () => {
      const db = await fresh();
      await db.exec(
        `update paragraphs set content=content || '{"animationFlags":{"hold":0.5}}'::jsonb;update sections set animation_config=jsonb_set(animation_config,'{stage}','"Custom"') where animation_config is not null;`
      );
      const before = await db.query("select * from paragraphs order by id");
      await db.exec(sql);
      expect(
        (await db.query("select * from paragraphs order by id")).rows
      ).toEqual(before.rows);
      expect(
        (
          await db.query(
            "select animation_config->>'name' n from sections where animation_config is not null"
          )
        ).rows[0].n
      ).toBe("RetinalCellTypes");
      await db.close();
    });
  }
);
