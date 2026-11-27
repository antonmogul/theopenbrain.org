// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/retinaStuartSectionArt.json";
import pictures from "../../scripts/figures/retina-stuart-section-art.json";

const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261124079700_retina_stuart_section_art.sql",
  "utf8"
);
const rows = async (db) =>
  (await db.query("select * from sections order by id")).rows;
async function seed() {
  const { PGlite } = createRequire(import.meta.url)(harness);
  const db = new PGlite();
  await db.exec(`create table modules(id uuid primary key,slug text,status text);
    create table sections(id uuid primary key,module_id uuid,slug text,art jsonb,
      prose text default 'author prose',updated_at timestamptz default '2026-01-01');`);
  await db.query("insert into modules values ($1,$2,$3)", [
    fixture.module.id,
    "the-retina",
    "published",
  ]);
  for (const section of fixture.sections)
    await db.query(
      "insert into sections(id,module_id,slug,art) values ($1,$2,$3,$4)",
      [
        section.id,
        fixture.module.id,
        section.slug,
        { ...section.art, credit: "author metadata" },
      ]
    );
  await db.exec(`insert into modules values ('11111111-1111-1111-1111-111111111111','foundations-of-neuroscience','published'),
    ('22222222-2222-2222-2222-222222222222','the-retina','archived');
    insert into sections(id,module_id,slug,art) select gen_random_uuid(),id,'introduction','{"src":"/keep.webp","placeholder":true}' from modules where id!='${fixture.module.id}';`);
  return db;
}

describe.skipIf(!harness || !existsSync(harness))(
  "Stuart’s Retina section art in isolated Postgres",
  () => {
    it("replaces exactly eleven live placeholders, keeps unrelated art and metadata, and replays unchanged", async () => {
      const db = await seed();
      try {
        const before = await rows(db);
        await db.exec(sql);
        const after = await rows(db);
        expect(
          after.filter(
            (s, i) => JSON.stringify(s) !== JSON.stringify(before[i])
          )
        ).toHaveLength(11);
        for (const section of after) {
          const picture =
            section.module_id === fixture.module.id &&
            pictures.find((p) => p.section === section.slug);
          if (picture) {
            expect(section.art).toEqual({
              ...picture.art,
              credit: "author metadata",
            });
            expect(section.prose).toBe("author prose");
            expect(existsSync(`public${picture.art.src}`)).toBe(true);
          } else
            expect(section).toEqual(before.find((s) => s.id === section.id));
        }
        await db.exec(sql);
        expect(await rows(db)).toEqual(after);
      } finally {
        await db.close();
      }
    });
    it.each(["src", "alt", "position", "placeholder"])(
      "aborts all replacements if an author changed %s",
      async (key) => {
        const db = await seed();
        try {
          await db.query(
            "update sections set art=jsonb_set(art,$1,$2) where slug='looking-forward'",
            [
              [key],
              JSON.stringify(key === "placeholder" ? false : "author edit"),
            ]
          );
          const before = await rows(db);
          await expect(db.exec(sql)).rejects.toThrow("section art drift");
          expect(await rows(db)).toEqual(before);
        } finally {
          await db.close();
        }
      }
    );
  }
);

it("maps the eleven review anchors to distinct section-art assets", () => {
  expect(pictures).toHaveLength(11);
  expect(new Set(pictures.map((p) => p.note)).size).toBe(11);
  expect(new Set(pictures.map((p) => p.art.src)).size).toBe(11);
  expect(pictures.every((p) => !p.art.placeholder)).toBe(true);
});
