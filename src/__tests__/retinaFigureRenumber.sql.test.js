// @vitest-environment node
// OPENBRAIN-79: the Retina's eight images in the text join the chapter's
// figure series, so its figures run 1-34 in reading order. The expected
// order is derived from the exported chapter, not copied from the SQL.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import data from "./fixtures/retinaFigureNumbers.json";
import { sql as numbersSql } from "./helpers/retinaFigureNumbers.mjs";
import { buildSearchIndex } from "../helper/chapterSearch";
import { transformModuleToChapterFormat } from "../composables/chapterTransform.mjs";

const sql = readFileSync(
  "supabase/migrations/20261124079200_retina_figure_renumber.sql",
  "utf8"
);
const retina = data.modules.find((m) => m.slug === "the-retina");
const ordered = (rows) =>
  [...rows].sort((a, b) => a.order_index - b.order_index);
const sections = ordered(
  data.sections.filter((s) => s.module_id === retina.id)
);
const paragraphs = sections.flatMap((s) =>
  ordered(data.paragraphs.filter((p) => p.section_id === s.id))
);
const imageOf = (p) =>
  (p.content?.blocks || []).find((b) => b.type === "image");

// Reading order: a record at its first placement, then the paragraph's image.
const series = [];
for (const p of paragraphs) {
  if (p.animation_id && !series.some((f) => f.record === p.animation_id))
    series.push({ record: p.animation_id });
  if (imageOf(p)) series.push({ image: p.id, src: imageOf(p).src });
}
const numberOfRecord = (id) => series.findIndex((f) => f.record === id) + 1;
const numberOfImage = (id) => series.findIndex((f) => f.image === id) + 1;

it("the exported chapter has 26 records and 8 images, and cites no figure by number", () => {
  expect(series.filter((f) => f.record)).toHaveLength(26);
  expect(series.filter((f) => f.image).map((f) => f.src)).toEqual([
    "RodBySchultze",
    "waveLength",
    "ONOFFLamina",
    "bipolarCellTerminal",
    "GABAergic",
    "retinoRecipientRegions",
    "testSpotLuminance",
    "ramonYCajal",
  ]);
  const cites = /\b(?:figures?|figs?\.?)\s*(?:<[^>]+>\s*)*[0-9]+\b/i;
  expect(
    paragraphs.filter((p) =>
      cites.test(JSON.stringify(p.content) + " " + p.content_text)
    )
  ).toEqual([]);
  expect(
    data.animations.filter(
      (a) =>
        series.some((f) => f.record === a.id) &&
        cites.test(JSON.stringify(a.config))
    )
  ).toEqual([]);
});

async function freshDb() {
  const require = createRequire(import.meta.url);
  const { PGlite } = require(process.env.HISTORY_SQL_HARNESS);
  const db = new PGlite();
  await db.exec(`
    create table modules(id uuid primary key, slug text);
    create table sections(id uuid primary key, module_id uuid, slug text, animation_id uuid);
    create table paragraphs(id uuid primary key, section_id uuid, animation_id uuid, content jsonb, content_text text, updated_at timestamptz);
    create table animations(id uuid primary key, animation_key text, config jsonb, updated_at timestamptz);
  `);
  for (const [table, cols] of [
    ["modules", ["id", "slug"]],
    ["sections", ["id", "module_id", "slug", "animation_id"]],
    [
      "paragraphs",
      ["id", "section_id", "animation_id", "content", "content_text"],
    ],
    ["animations", ["id", "animation_key", "config"]],
  ])
    for (const row of data[table])
      await db.query(
        `insert into ${table}(${cols.join(",")}) values(${cols.map((_, i) => `$${i + 1}`).join(",")})`,
        cols.map((c) => row[c] ?? null)
      );
  // Production's state today: OPENBRAIN-67's numbers 1-26.
  await db.exec(numbersSql);
  return db;
}
const rows = async (db, table) =>
  (await db.query(`select * from ${table} order by id`)).rows;
const strip = (list) => list.map(({ updated_at: _u, ...row }) => row);

describe.skipIf(
  !process.env.HISTORY_SQL_HARNESS ||
    !existsSync(process.env.HISTORY_SQL_HARNESS)
)("Retina figure renumbering in isolated Postgres", () => {
  it("numbers records and images 1-34 in reading order, keeps everything else, and replays unchanged", async () => {
    const db = await freshDb();
    try {
      const animationsBefore = await rows(db, "animations");
      const paragraphsBefore = await rows(db, "paragraphs");
      const sectionsBefore = await rows(db, "sections");
      await db.exec(sql);
      const animations = await rows(db, "animations");
      const after = await rows(db, "paragraphs");

      const numbers = series.map((f) =>
        f.record
          ? animations.find((a) => a.id === f.record).config.figureNumber
          : imageOf(after.find((p) => p.id === f.image)).figureNumber
      );
      expect(numbers).toEqual(Array.from({ length: 34 }, (_, i) => i + 1));

      for (const a of animations) {
        const original = animationsBefore.find((b) => b.id === a.id);
        const n = numberOfRecord(a.id);
        if (n)
          expect(a.config).toEqual({ ...original.config, figureNumber: n });
        else expect(a).toEqual(original);
      }
      for (const p of after) {
        const original = paragraphsBefore.find((b) => b.id === p.id);
        const n = numberOfImage(p.id);
        if (!n) {
          expect(p).toEqual(original);
          continue;
        }
        expect(p.updated_at).not.toBeNull();
        const { blocks, ...rest } = p.content;
        const { blocks: originalBlocks, ...originalRest } = original.content;
        expect(rest).toEqual(originalRest);
        expect(blocks).toHaveLength(originalBlocks.length);
        blocks.forEach((block, i) => {
          if (block.type !== "image")
            return expect(block).toEqual(originalBlocks[i]);
          const { figureNumber, title, ...kept } = block;
          expect(kept).toEqual(originalBlocks[i]);
          expect(figureNumber).toBe(n);
          expect(title).toMatch(/^[A-Z].{3,40}$/);
        });
      }
      expect(await rows(db, "sections")).toEqual(sectionsBefore);

      await db.exec(sql);
      expect(await rows(db, "animations")).toEqual(animations);
      expect(await rows(db, "paragraphs")).toEqual(after);

      // The reader's own helpers see the images as numbered figures.
      const tree = transformModuleToChapterFormat({
        ...retina,
        sections: sections.map((s) => ({
          ...s,
          paragraphs: ordered(
            after
              .filter((p) => p.section_id === s.id)
              .map((p) => ({
                ...data.paragraphs.find((d) => d.id === p.id),
                ...p,
              }))
          ),
        })),
      });
      const index = buildSearchIndex(tree, { figures: [] });
      for (const f of series.filter((f) => f.image)) {
        const n = String(numberOfImage(f.image)).padStart(2, "0");
        expect(
          index.filter((e) => e.kind === "figure" && e.tag === `Fig ${n}`)
        ).toHaveLength(1);
      }
    } finally {
      await db.close();
    }
  });

  it("keeps a creator's number, a creator's image title and number, and other chapters", async () => {
    const db = await freshDb();
    try {
      const synaptic = data.animations.find(
        (a) => a.animation_key === "widget-upload:retina-synaptic-architecture"
      );
      const text = data.animations.find(
        (a) => a.animation_key === "animationColorOpponency"
      );
      await db.query(
        "update animations set config = jsonb_set(config, '{figureNumber}', '99') where id=$1",
        [synaptic.id]
      );
      await db.query(
        "update animations set config = jsonb_set(config, '{figureNumber}', '\"14\"') where id=$1",
        [text.id]
      );
      const rod = paragraphs.find((p) => imageOf(p)?.src === "RodBySchultze");
      const cajal = paragraphs.find((p) => imageOf(p)?.src === "ramonYCajal");
      const setBlock = (p, extra) =>
        db.query("update paragraphs set content = $1 where id=$2", [
          JSON.stringify({
            ...p.content,
            blocks: p.content.blocks.map((b) =>
              b.type === "image" ? { ...b, ...extra } : b
            ),
          }),
          p.id,
        ]);
      await setBlock(rod, { title: "Schultze's rod and cone" });
      await setBlock(cajal, { figureNumber: "A", title: null });
      // The same picture in another chapter is not the Retina's figure.
      const other = data.sections.find((s) => s.module_id !== retina.id);
      await db.query(
        "insert into paragraphs(id, section_id, content) values(gen_random_uuid(), $1, $2)",
        [
          other.id,
          JSON.stringify({ blocks: [{ type: "image", src: "waveLength" }] }),
        ]
      );
      await db.exec(sql);
      const animations = await rows(db, "animations");
      expect(
        animations.find((a) => a.id === synaptic.id).config.figureNumber
      ).toBe(99);
      expect(animations.find((a) => a.id === text.id).config.figureNumber).toBe(
        "14"
      );
      const after = await rows(db, "paragraphs");
      expect(imageOf(after.find((p) => p.id === rod.id))).toMatchObject({
        figureNumber: 6,
        title: "Schultze's rod and cone",
      });
      expect(imageOf(after.find((p) => p.id === cajal.id))).toMatchObject({
        figureNumber: "A",
        title: "Cajal's avian retina",
      });
      expect(
        strip(after).filter(
          (p) => p.section_id === other.id && imageOf(p)?.src === "waveLength"
        )[0].content
      ).toEqual({ blocks: [{ type: "image", src: "waveLength" }] });
    } finally {
      await db.close();
    }
  });

  it("does nothing without the Retina module", async () => {
    const db = await freshDb();
    try {
      const before = [
        await rows(db, "animations"),
        await rows(db, "paragraphs"),
      ];
      await db.query("delete from modules where id=$1", [retina.id]);
      await db.exec(sql);
      expect([
        await rows(db, "animations"),
        await rows(db, "paragraphs"),
      ]).toEqual(before);
    } finally {
      await db.close();
    }
  });
});
