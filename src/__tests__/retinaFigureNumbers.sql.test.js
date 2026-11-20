// @vitest-environment node
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import data from "./fixtures/retinaFigureNumbers.json";
import { figureNumbersDb, sql } from "./helpers/retinaFigureNumbers.mjs";
import { railMarkFor } from "../helper/readingRail";
import { buildSearchIndex } from "../helper/chapterSearch";
import { transformModuleToChapterFormat } from "../composables/chapterTransform.mjs";

const retina = data.modules.find((m) => m.slug === "the-retina");
const ordered = (rows) =>
  [...rows].sort((a, b) => a.order_index - b.order_index);
const sections = ordered(
  data.sections.filter((s) => s.module_id === retina.id)
);
const placements = sections.flatMap((s) =>
  ordered(data.paragraphs.filter((p) => p.section_id === s.id)).filter(
    (p) => p.animation_id
  )
);
const ids = [...new Set(placements.map((p) => p.animation_id))];
const numberOf = (id) => ids.indexOf(id) + 1;
const rows = async (db, table) =>
  (await db.query(`select * from ${table} order by id`)).rows;

it("audits reading order, repeated placements, shared records and actual citations", () => {
  expect(ids).toHaveLength(26);
  expect(placements).toHaveLength(33);
  expect(sections.every((s) => !s.parent_section_id)).toBe(true);
  expect(data.animations.find((a) => a.id === ids[0]).animation_key).toBe(
    "animationDragon"
  );
  expect(data.animations.find((a) => a.id === ids[25]).animation_key).toBe(
    "animationRetinitisPigmentosa"
  );
  const otherSections = data.sections.filter((s) => s.module_id !== retina.id);
  expect(otherSections.filter((s) => ids.includes(s.animation_id))).toEqual([]);
  expect(
    data.paragraphs.filter(
      (p) =>
        ids.includes(p.animation_id) &&
        otherSections.some((s) => s.id === p.section_id)
    )
  ).toEqual([]);
  const paragraphs = data.paragraphs.filter((p) =>
    sections.some((s) => s.id === p.section_id)
  );
  expect(
    paragraphs.flatMap((p) =>
      (p.content?.blocks || []).filter((b) => b.type === "figure_placeholder")
    )
  ).toEqual([]);
  expect(
    paragraphs.filter((p) =>
      /\b(?:figures?|figs?\.)\s*(?:<[^>]+>\s*)*[0-9]+\b/i.test(
        JSON.stringify(p.content) + " " + p.content_text
      )
    )
  ).toEqual([]);
});

describe.skipIf(
  !process.env.HISTORY_SQL_HARNESS ||
    !existsSync(process.env.HISTORY_SQL_HARNESS)
)("Retina figure numbers in isolated Postgres", () => {
  it("numbers every record in reading order, preserves all other data, and replays unchanged", async () => {
    const db = await figureNumbersDb(data);
    try {
      const before = await rows(db, "animations");
      const paragraphs = await rows(db, "paragraphs");
      const sectionRows = await rows(db, "sections");
      await db.exec(sql);
      const after = await rows(db, "animations");
      expect(
        ids.map((id) => after.find((a) => a.id === id).config.figureNumber)
      ).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
      expect(
        placements.map(
          (p) => after.find((a) => a.id === p.animation_id).config.figureNumber
        )
      ).toEqual(placements.map((p) => numberOf(p.animation_id)));
      for (const a of after) {
        const original = before.find((b) => b.id === a.id);
        if (ids.includes(a.id)) {
          expect(a.config).toEqual({
            ...original.config,
            figureNumber: numberOf(a.id),
          });
          expect(a.updated_at).not.toBeNull();
        } else expect(a).toEqual(original);
      }
      expect(await rows(db, "paragraphs")).toEqual(paragraphs);
      expect(await rows(db, "sections")).toEqual(sectionRows);
      await db.exec(sql);
      expect(await rows(db, "animations")).toEqual(after);

      // Use the same data shape useAnimations exposes, through the actual
      // search/rail helpers. Uploads, gallery and film numbers need no UI fork.
      const figures = after.map((a) => ({
        id: a.animation_key,
        title: data.animations.find((b) => b.id === a.id).title,
        ...a.config,
      }));
      const tree = transformModuleToChapterFormat({
        ...retina,
        sections: sections.map((s) => ({
          ...s,
          paragraphs: ordered(
            data.paragraphs.filter((p) => p.section_id === s.id)
          ).map((p) => ({
            ...p,
            animation_key: after.find((a) => a.id === p.animation_id)
              ?.animation_key,
          })),
        })),
      });
      const index = buildSearchIndex(tree, { figures });
      for (const id of ids) {
        const a = after.find((a) => a.id === id);
        const record = figures.find((f) => f.id === a.animation_key);
        const n = numberOf(id);
        expect(
          index.some(
            (e) =>
              e.kind === "figure" &&
              e.tag === `Fig ${String(n).padStart(2, "0")}`
          )
        ).toBe(true);
        if (!record.fullscreen && !record.isTransition)
          expect(railMarkFor(record).tip).toMatch(new RegExp(`^Figure ${n}:`));
      }
    } finally {
      await db.close();
    }
  });

  it("preserves creator numbers and sibling edits, fills missing and JSON null numbers only", async () => {
    const db = await figureNumbersDb(data);
    try {
      for (const [i, number] of ["Author label", 99, "", 0].entries())
        await db.query(
          "update animations set config = jsonb_set(config, '{figureNumber}', $1::jsonb) where id=$2",
          [JSON.stringify(number), ids[i]]
        );
      await db.query(
        'update animations set config = config || \'{"figureNumber":null,"authorNote":"Keep this"}\' where id=$1',
        [ids[4]]
      );
      await db.query("update animations set config = null where id=$1", [
        ids[5],
      ]);
      await db.exec(sql);
      const after = await rows(db, "animations");
      expect(
        ids
          .slice(0, 4)
          .map((id) => after.find((a) => a.id === id).config.figureNumber)
      ).toEqual(["Author label", 99, "", 0]);
      expect(after.find((a) => a.id === ids[4]).config).toMatchObject({
        figureNumber: 5,
        authorNote: "Keep this",
      });
      expect(after.find((a) => a.id === ids[5]).config).toEqual({
        figureNumber: 6,
      });
    } finally {
      await db.close();
    }
  });

  it("skips records shared through another chapter's paragraph or section and unlinked records", async () => {
    const db = await figureNumbersDb(data);
    try {
      const other = data.sections.find((s) => s.module_id !== retina.id);
      await db.query(
        "insert into paragraphs(id,section_id,animation_id) values(gen_random_uuid(),$1,$2)",
        [other.id, ids[0]]
      );
      await db.query("update sections set animation_id=$1 where id=$2", [
        ids[1],
        other.id,
      ]);
      await db.query(
        "update paragraphs set animation_id=null where animation_id=$1",
        [ids[2]]
      );
      await db.exec(sql);
      const after = await rows(db, "animations");
      for (const id of ids.slice(0, 3))
        expect(after.find((a) => a.id === id).config).not.toHaveProperty(
          "figureNumber"
        );
      expect(after.find((a) => a.id === ids[3]).config.figureNumber).toBe(4);
    } finally {
      await db.close();
    }
  });

  it("does nothing without the Retina module", async () => {
    const db = await figureNumbersDb(data);
    try {
      const before = await rows(db, "animations");
      await db.query("delete from modules where id=$1", [retina.id]);
      await db.exec(sql);
      expect(await rows(db, "animations")).toEqual(before);
    } finally {
      await db.close();
    }
  });
});
