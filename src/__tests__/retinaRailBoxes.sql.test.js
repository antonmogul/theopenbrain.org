// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import manifest from "./fixtures/retinaRailBoxes.json";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261127079810_retina_rail_boxes.sql",
  "utf8"
);
const uploadSql = readFileSync(
  "supabase/migrations/20261127079800_retina_colour_rail_parts.sql",
  "utf8"
);
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(`create table modules(id uuid primary key,slug text);
    create table sections(id uuid primary key,module_id uuid references modules(id),slug text,title text,
      parent_section_id uuid references sections(id),anchor_paragraph_id uuid,order_index int,
      rail boolean,box_treatment text,box_card jsonb,unique(module_id,slug));
    create table paragraphs(id uuid primary key,section_id uuid references sections(id),order_index int,
      content jsonb,animation_id text,subsection_level int,is_subsection_header boolean,unique(section_id,order_index));
    create table widget_uploads(slug text primary key,html text,updated_at timestamptz);`);
  const module = manifest.boxes[0].module_id;
  await db.query("insert into modules values($1,$2)", [module, "the-retina"]);
  for (const parent of new Set(manifest.boxes.map((b) => b.parent_section_id)))
    await db.query(
      "insert into sections(id,module_id,slug) values($1::uuid,$2::uuid,$1::text)",
      [parent, module]
    );
  for (const p of manifest.moves)
    await db.query("insert into paragraphs values($1,$2,$3,$4,$5,$6,$7)", [
      p.id,
      p.from,
      p.beforeOrder,
      p.beforeContent,
      "preserved-figure",
      p.beforeLevel,
      p.beforeHeader,
    ]);
  return db;
}
it("publishes the exact widget file and retains all four source parts and references", () => {
  const html = readFileSync(
    "src/widgets/uploads/retina-color-vision.html",
    "utf8"
  );
  expect(uploadSql.split("$html$")[1]).toBe(html);
  for (const [, title] of manifest.parts)
    expect(html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")).toContain(
      title.replace("3 numbers", "three numbers")
    );
  expect(html).toContain("CVRL");
  expect(sql).not.toMatch(/delete from/i);
});
describe.skipIf(!harness || !existsSync(harness))(
  "Retina rail migration",
  () => {
    it("moves eight original paragraphs once, merges colour vision and retains authored content on replay", async () => {
      const db = await fresh();
      try {
        await db.exec(sql);
        const first = (await db.query("select * from paragraphs order by id"))
          .rows;
        expect(first).toHaveLength(11);
        for (const m of manifest.moves) {
          const p = first.find((p) => p.id === m.id);
          expect(p.section_id).toBe(m.to);
          expect(p.animation_id).toBe("preserved-figure");
          for (const block of m.beforeContent.blocks.filter(
            (b) => b.type === "text"
          ))
            expect(p.content.blocks).toContainEqual(block);
        }
        const colour = manifest.boxes.find(
          (b) => b.slug === "box-colour-vision"
        );
        expect(first.filter((p) => p.section_id === colour.id)).toHaveLength(5);
        await db.exec(sql);
        expect(
          (await db.query("select * from paragraphs order by id")).rows
        ).toEqual(first);
        await db.query(
          "update sections set box_card='{}',rail=false where id=$1",
          [colour.id]
        );
        await db.query(
          'update paragraphs set content=content || \'{"author":"keep"}\' where id=$1',
          [manifest.moves[0].id]
        );
        await db.exec(sql);
        expect(
          (
            await db.query("select rail,box_card from sections where id=$1", [
              colour.id,
            ])
          ).rows[0]
        ).toEqual({ rail: false, box_card: {} });
        expect(
          (
            await db.query("select content from paragraphs where id=$1", [
              manifest.moves[0].id,
            ])
          ).rows[0].content.author
        ).toBe("keep");
      } finally {
        await db.close();
      }
    });
    it("rejects placement drift before making a partial migration", async () => {
      const db = await fresh();
      try {
        await db.query("update paragraphs set order_index=99 where id=$1", [
          manifest.moves[1].id,
        ]);
        await expect(db.exec(sql)).rejects.toThrow(/placement drift/);
        expect(
          (await db.query("select * from sections where slug like 'box-%'"))
            .rows
        ).toHaveLength(0);
      } finally {
        await db.close();
      }
    });
  }
);
