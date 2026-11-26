// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { figureFill, figureImages } from "../helper/figureCycle";
import { wantsTintFade } from "../helper/figureTint";
import { sectionCardFigure } from "../helper/sectionCard";

/*
 * OPENBRAIN-86: the wash comes off History's six photographs, and Closing
 * words gets Maura's new picture, filling the pane, with the section's
 * cover as its washed copy. The migration is replayed after the one it
 * undoes, and what it leaves is read back through the reader's own helpers.
 */
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const read = (name) => readFileSync(`supabase/migrations/${name}.sql`, "utf8");
const tintFade = read("20261124078000_history_tint_fade");
const migration = read("20261125098600_history_wash_off_hm_picture");

const PHOTO = "/publicAssets/images/foundations/hm-brain-v3.webp";
const COVER = "/publicAssets/images/foundations/sections/closing-words-v2.webp";
const OLD_PHOTO = "/publicAssets/images/foundations/hm-brain.jpg?v=2";
const OLD_COVER =
  "/publicAssets/images/foundations/sections/closing-words.webp";
const CLOSING = "animationFoundationsClosingHM";
const washed = [
  "animationFoundationsMilnerHM",
  "animationFoundationsFig9",
  "animationFoundationsFig12",
  "animationFoundationsFig17",
  "animationFoundationsFig18",
];
const untouched = ["animationFoundationsFig1", "animationOtherChapter"];
const config = { images: [{ src: "/a.jpg" }], figureNumber: 3, custom: "kept" };
const closing = {
  images: [{ src: OLD_PHOTO, alt: "A preserved human brain." }],
  caption: "The brain of Henry Molaison (H.M.).",
  figureNumber: 26,
  placeholder: true,
};
const art = { src: OLD_COVER, alt: "A human brain seen from the side" };

async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(`create table animations(id int generated always as identity primary key,
    animation_key text unique, config jsonb, image_file_url text, updated_at timestamptz);
   create table modules(id int primary key, slug text);
   create table sections(id int generated always as identity primary key,
    module_id int, slug text, art jsonb);
   insert into modules values (1, 'foundations-of-neuroscience'), (2, 'the-retina');`);
  for (const key of [...washed, ...untouched])
    await db.query(
      "insert into animations(animation_key, config, image_file_url) values ($1,$2,$3)",
      [key, config, "/a.jpg"]
    );
  await db.query(
    "insert into animations(animation_key, config, image_file_url) values ($1,$2,$3)",
    [CLOSING, closing, OLD_PHOTO]
  );
  for (const [module, slug] of [
    [1, "closing-words"],
    [1, "where-is-my-mind"],
    [2, "closing-words"],
  ])
    await db.query(
      "insert into sections(module_id, slug, art) values ($1,$2,$3)",
      [module, slug, art]
    );
  await db.exec(tintFade);
  await db.exec("update animations set updated_at = null");
  return db;
}
const rows = async (db, table) =>
  (await db.query(`select * from ${table} order by id`)).rows;
const byKey = async (db) =>
  Object.fromEntries(
    (await rows(db, "animations")).map((row) => [row.animation_key, row])
  );

describe.skipIf(!harness || !existsSync(harness))(
  "History: the wash off, the new H.M. picture (SQL)",
  () => {
    it("takes tintFade off the six figures and keeps every other key", async () => {
      const db = await fresh();
      try {
        const before = await byKey(db);
        for (const key of [...washed, CLOSING])
          expect(wantsTintFade(before[key].config)).toBe(true);
        await db.exec(migration);
        const after = await byKey(db);
        for (const key of washed) {
          expect(after[key].config).toEqual(config);
          expect(after[key].updated_at).not.toBeNull();
        }
        expect(after[CLOSING].config).not.toHaveProperty("tintFade");
        for (const key of untouched) {
          expect(after[key].config).toEqual(config);
          expect(after[key].updated_at).toBeNull();
        }
      } finally {
        await db.close();
      }
    });

    it("gives Fig 26 the new picture, filling the pane, with the cover as its wash", async () => {
      const db = await fresh();
      try {
        await db.exec(migration);
        const row = (await byKey(db))[CLOSING];
        expect(row.image_file_url).toBe(PHOTO);
        expect(row.config).toEqual({
          ...closing,
          images: [{ ...closing.images[0], src: PHOTO, wash: COVER }],
          fill: true,
        });
        // As the reader reads it: one picture, covering the pane around
        // its centre, and the section's cover is that picture's own wash.
        expect(figureImages(row.config)[0]).toMatchObject({
          src: PHOTO,
          wash: COVER,
        });
        expect(figureFill(row.config)).toBe("50% 50%");
        const sections = await rows(db, "sections");
        expect(sections.map((s) => s.art.src)).toEqual([
          COVER,
          OLD_COVER,
          OLD_COVER,
        ]);
        expect(sections[0].art.alt).toBe(art.alt);
        expect(
          sectionCardFigure(sections[0].art, { id: CLOSING, ...row.config })
        ).toBeTruthy();
      } finally {
        await db.close();
      }
    });

    it("replays as a no-op", async () => {
      const db = await fresh();
      try {
        await db.exec(migration);
        const animations = await rows(db, "animations");
        const sections = await rows(db, "sections");
        await db.exec(migration);
        expect(await rows(db, "animations")).toEqual(animations);
        expect(await rows(db, "sections")).toEqual(sections);
      } finally {
        await db.close();
      }
    });

    it("leaves a picture, a focal point or a cover an author has since set", async () => {
      const db = await fresh();
      try {
        await db.query(
          "update animations set config = $1, image_file_url = '/own.webp' where animation_key = $2",
          [
            {
              ...closing,
              images: [{ src: "/own.webp" }],
              focus: "40% 60%",
              tintFade: true,
            },
            CLOSING,
          ]
        );
        await db.exec(
          `update sections set art = '{"src":"/own-cover.webp"}' where module_id = 1 and slug = 'closing-words'`
        );
        await db.exec(migration);
        const row = (await byKey(db))[CLOSING];
        // The wash still comes off; the author's picture is theirs.
        expect(row.config).toEqual({
          ...closing,
          images: [{ src: "/own.webp" }],
          focus: "40% 60%",
        });
        expect(row.image_file_url).toBe("/own.webp");
        expect((await rows(db, "sections"))[0].art).toEqual({
          src: "/own-cover.webp",
        });
      } finally {
        await db.close();
      }
    });

    it("keeps a focal point stored beside the old picture", async () => {
      const db = await fresh();
      try {
        await db.query(
          'update animations set config = config || \'{"focus": "50% 40%"}\' where animation_key = $1',
          [CLOSING]
        );
        await db.exec(migration);
        const row = (await byKey(db))[CLOSING];
        expect(row.config.focus).toBe("50% 40%");
        expect(figureFill(row.config)).toBe("50% 40%");
      } finally {
        await db.close();
      }
    });
  }
);
