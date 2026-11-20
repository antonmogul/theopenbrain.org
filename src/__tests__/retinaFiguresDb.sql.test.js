// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/retinaFiguresDb.json";
import {
  paragraphFiguresForSection,
  transformModuleToChapterFormat,
} from "../composables/chapterTransform.mjs";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261120066000_retina_figures_db.sql",
  "utf8"
);
const schema = `
create table modules(id uuid primary key, slug text);
create table sections(id uuid primary key, module_id uuid references modules, slug text, order_index int, animation_id uuid, animation_config jsonb, updated_at timestamptz);
create table paragraphs(id uuid primary key, section_id uuid references sections, order_index int, animation_id uuid, animation_trigger text, has_animation boolean, content jsonb, updated_at timestamptz);
create table animations(id uuid primary key, animation_key text, config jsonb, updated_at timestamptz);
`;
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  for (const [table, columns] of [
    ["modules", ["id", "slug"]],
    [
      "sections",
      [
        "id",
        "module_id",
        "slug",
        "order_index",
        "animation_id",
        "animation_config",
      ],
    ],
    [
      "paragraphs",
      [
        "id",
        "section_id",
        "order_index",
        "animation_id",
        "animation_trigger",
        "has_animation",
        "content",
      ],
    ],
    ["animations", ["id", "animation_key", "config"]],
  ]) {
    for (const row of fixture[table])
      await db.query(
        `insert into ${table}(${columns.join(",")}) values (${columns.map((_, i) => "$" + (i + 1)).join(",")})`,
        columns.map((c) => row[c] ?? null)
      );
  }
  return db;
}
const rows = (db, table) =>
  db.query(`select * from ${table} order by id`).then((r) => r.rows);
function chapter(sections, paragraphs) {
  paragraphs = structuredClone(paragraphs);
  return {
    title: "The Retina",
    sections: sections.map((s) => {
      const a = fixture.animations.find((a) => a.id === s.animation_id);
      return {
        ...s,
        animation_key: a?.animation_key,
        animation_title: a?.title,
        paragraphs: paragraphs
          .filter((p) => p.section_id === s.id)
          .map((p) => {
            const a = fixture.animations.find((a) => a.id === p.animation_id);
            return {
              ...p,
              animation_key: a?.animation_key,
              animation_title: a?.title,
            };
          }),
      };
    }),
  };
}

describe("section figure compatibility", () => {
  it("lowers the three legacy placements without a section renderer or mutating source", () => {
    const data = chapter(fixture.sections, fixture.paragraphs);
    const before = structuredClone(data);
    const tree = transformModuleToChapterFormat(data);
    expect(data).toEqual(before);
    expect(tree.intro[0]).not.toHaveProperty("animation");
    expect(tree.intro[0].paragraphs[0].animation).toMatchObject({
      id: "animationDragon",
      hold: "next",
    });
    for (const [slug, key, stage] of [
      [
        "horizontal-cells-and-feedback",
        "animationRetinalCellTypes3",
        "Horizontal cells",
      ],
      [
        "bipolar-cells-diversify-photoreceptor-signals",
        "animationRetinalCellTypes2",
        "Bipolar cells",
      ],
    ]) {
      const section = tree.sections.find((s) => s.slug === slug);
      expect(section).not.toHaveProperty("animation");
      expect(section.paragraphs[0].animation).toMatchObject({
        id: key,
        stage,
        hold: "next",
      });
    }
  });
  it("keeps a paragraph's own figure and authored flags", () => {
    const section = chapter(fixture.sections, fixture.paragraphs).sections.find(
      (s) => s.animation_config?.stage
    );
    section.paragraphs[0].content.animationFlags = {
      hold: 0,
      stage: "Creator stage",
    };
    expect(
      paragraphFiguresForSection(section)[0].content.animationFlags
    ).toEqual({ hold: 0, stage: "Creator stage" });
    section.paragraphs[0].animation_id = "another-figure";
    expect(paragraphFiguresForSection(section)[0]).toBe(section.paragraphs[0]);
  });
});

describe.skipIf(!harness || !existsSync(harness))(
  "Retina figures DB migration",
  () => {
    it("preserves the same reader tree before and after migration and is idempotent", async () => {
      const db = await fresh();
      try {
        const before = transformModuleToChapterFormat(
          chapter(await rows(db, "sections"), await rows(db, "paragraphs"))
        );
        await db.exec(migration);
        const sections = await rows(db, "sections");
        const paragraphs = await rows(db, "paragraphs");
        expect(
          sections.filter((s) => s.animation_id || s.animation_config)
        ).toHaveLength(0);
        expect(
          paragraphs.filter(
            (p) =>
              p.animation_trigger &&
              !["auto", "scroll"].includes(p.animation_trigger)
          )
        ).toHaveLength(0);
        expect(
          paragraphs.filter(
            (p) =>
              [
                "65b52ec0-a886-486c-af64-cadc150d2096",
                "b9d2316d-f213-4d6d-a0ad-21aa85194e9a",
                "4bb764b8-e8ce-4503-8d09-9db82ccb9958",
              ].includes(p.id) && p.content.animationFlags?.hold === "next"
          )
        ).toHaveLength(3);
        expect(
          transformModuleToChapterFormat(chapter(sections, paragraphs))
        ).toEqual(before);
        const once = [sections, paragraphs, await rows(db, "animations")];
        await db.exec(migration);
        expect([
          await rows(db, "sections"),
          await rows(db, "paragraphs"),
          await rows(db, "animations"),
        ]).toEqual(once);
        const flips = (await rows(db, "animations")).filter(
          (a) => a.config.flip
        );
        expect(flips).toHaveLength(6);
        expect(
          flips.every(
            (a) => Array.isArray(a.config.states) && !a.config.states.length
          )
        ).toBe(true);
      } finally {
        await db.close();
      }
    });
    it("preserves prose edits, unrelated configuration, and creator placement choices", async () => {
      const db = await fresh();
      try {
        const first = "65b52ec0-a886-486c-af64-cadc150d2096";
        const horizontal = "4bb764b8-e8ce-4503-8d09-9db82ccb9958";
        await db.query(
          'update paragraphs set content = jsonb_set(content, \'{blocks}\', \'[{"type":"text","content":"New prose"}]\') where id = $1',
          [first]
        );
        await db.query(
          'update paragraphs set content = content || \'{"animationFlags":{"hold":0}}\' where id = $1',
          [horizontal]
        );
        await db.exec(
          'update animations set config = config || \'{"states":["Creator state"],"credit":"Creator credit"}\' where animation_key=\'animationNormalVision\''
        );
        await db.exec(migration);
        const paragraphs = await rows(db, "paragraphs");
        expect(paragraphs.find((p) => p.id === first)).toMatchObject({
          animation_id: expect.any(String),
          content: { blocks: [{ type: "text", content: "New prose" }] },
        });
        expect(
          paragraphs.find((p) => p.id === horizontal).animation_id
        ).toBeNull();
        expect(
          (await rows(db, "sections")).find(
            (s) => s.slug === "horizontal-cells-and-feedback"
          ).animation_id
        ).not.toBeNull();
        expect(
          (await rows(db, "animations")).find(
            (a) => a.animation_key === "animationNormalVision"
          ).config
        ).toMatchObject({
          states: ["Creator state"],
          credit: "Creator credit",
        });
      } finally {
        await db.close();
      }
    });
  }
);
