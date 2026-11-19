// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261119510000_retina_figure_notes.sql",
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
