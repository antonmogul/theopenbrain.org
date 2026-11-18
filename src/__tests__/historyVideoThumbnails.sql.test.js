// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261119440000_history_video_thumbnails.sql",
  "utf8"
);
const targets = [
  [
    "animationFoundationsNgfLeviMontalcini",
    "WgkAR-vrJpM",
    "rita-levi-montalcini",
  ],
  ["animationFoundationsMilnerHM", "g4-6A8u8QBc", "brenda-milner"],
  ["animationFoundationsFig21", "KbA3RLz3xUQ", "andrew-huxley"],
];
const oldItem = (youtube) => ({
  src: `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`,
  youtube,
  play: "player",
  start: 2,
  alt: "Interview",
  caption: "Original credit",
});
const still = { src: "/original.jpg", caption: "Original plate", custom: true };
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(`create table animations(id int generated always as identity primary key,
    animation_key text unique, config jsonb, updated_at timestamptz);
  `);
  for (const [key, youtube] of targets) {
    await db.query(
      "insert into animations(animation_key, config) values ($1,$2)",
      [
        key,
        {
          images: [
            still,
            oldItem(youtube),
            { src: "/loop.jpg", youtube: "OmmH4Rp9-to" },
          ],
          figureNumber: "L",
          custom: "kept",
        },
      ]
    );
  }
  return db;
}
const rows = async (db) =>
  (await db.query("select * from animations order by id")).rows;

describe.skipIf(!harness || !existsSync(harness))(
  "History video thumbnails (SQL)",
  () => {
    it("changes only each exact poster and its corner treatment, preserving order and playback", async () => {
      const db = await fresh();
      try {
        await db.exec(migration);
        const result = await rows(db);
        result.forEach((row, i) => {
          const [, youtube, file] = targets[i];
          expect(row.config).toEqual({
            images: [
              still,
              {
                ...oldItem(youtube),
                src: `/publicAssets/images/foundations/thumbs/${file}.webp`,
                posterPlay: "corner",
              },
              { src: "/loop.jpg", youtube: "OmmH4Rp9-to" },
            ],
            figureNumber: "L",
            custom: "kept",
          });
          const asset = readFileSync(
            `public/publicAssets/images/foundations/thumbs/${file}.webp`
          );
          expect(asset.toString("ascii", 8, 12)).toBe("WEBP");
        });
        await db.exec(migration);
        expect(await rows(db)).toEqual(result);
      } finally {
        await db.close();
      }
    });

    it.each(["src", "youtube", "play", "posterPlay"])(
      "preserves a creator's changed %s",
      async (field) => {
        const db = await fresh();
        try {
          const changed = {
            ...oldItem(targets[0][1]),
            [field]: "creator edit",
          };
          await db.query("update animations set config = $1 where id = 1", [
            { images: [changed] },
          ]);
          await db.exec(migration);
          expect((await rows(db))[0].config.images).toEqual([changed]);
        } finally {
          await db.close();
        }
      }
    );

    it("ignores unrelated figures and missing or malformed image arrays", async () => {
      const db = await fresh();
      try {
        await db.query(
          "insert into animations(animation_key, config) values ('other', $1)",
          [{ images: [oldItem(targets[0][1])] }]
        );
        await db.exec(
          "update animations set config = '{}' where id=1; update animations set config = '{\"images\":null}' where id=2; update animations set config = '{\"images\":{}}' where id=3;"
        );
        const before = await rows(db);
        await db.exec(migration);
        expect(await rows(db)).toEqual(before);
      } finally {
        await db.close();
      }
    });
  }
);
