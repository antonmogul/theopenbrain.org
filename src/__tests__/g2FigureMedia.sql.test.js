// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261022010000_g2_figure_media_followups.sql",
  "utf8"
);
const schema = `
create table modules (id uuid primary key default gen_random_uuid(), slug text);
create table sections (id uuid primary key default gen_random_uuid(), module_id uuid, slug text);
create table animations (id uuid primary key default gen_random_uuid(), animation_key text, config jsonb, updated_at timestamptz);
create table paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid, animation_id uuid, content jsonb, updated_at timestamptz);
insert into modules(slug) values ('foundations-of-neuroscience');
insert into sections(module_id, slug) select id, 'do-different-parts' from modules;
`;
const plate = (n) => ({
  src: `/publicAssets/images/foundations/fig${n}.jpg`,
  alt: `Source ${n}`,
  provenance: "unchanged",
});
const fixture = {
  animationFoundationsFig19: {
    caption: "Original Galvani caption",
    images: [
      plate("19-01"),
      plate("19-02"),
      { youtube: "ZSCUbYyrHug", caption: "Squid credit", src: "/squid.jpg" },
    ],
  },
  animationFoundationsFig21: {
    caption: "Original Eccles caption",
    images: [
      plate("21-01"),
      {
        youtube: "KbA3RLz3xUQ",
        caption: "Huxley credit",
        src: "/huxley.jpg",
        play: "player",
      },
    ],
  },
  animationFoundationsFig11: { images: [plate("11-01-abc")] },
};
async function seed(db, data = fixture) {
  await db.exec(schema);
  for (const [key, config] of Object.entries(data)) {
    const { rows } = await db.query(
      "insert into animations(animation_key,config) values ($1,$2) returning id",
      [key, JSON.stringify(config)]
    );
    await db.query(
      "insert into paragraphs(section_id,animation_id,content) select id,$1,$2 from sections",
      [
        rows[0].id,
        JSON.stringify({
          blocks: [
            {
              type: "text",
              content:
                "Fritsch and Hitzig’s work was validated soon afterwards in primates by David Ferrier.",
            },
          ],
          animationFlags: { transition: false },
          sourceHash: "keep-me",
        }),
      ]
    );
  }
}
const read = async (db) =>
  (
    await db.query(
      "select animation_key,config from animations order by animation_key"
    )
  ).rows;

describe.skipIf(!harness || !existsSync(harness))("G2 figure media SQL", () => {
  it("preserves media/provenance, supplies plate legends, puts Huxley first, and only spaces the exact Fig11 paragraph idempotently", async () => {
    const { PGlite } = require(harness);
    const db = new PGlite();
    try {
      await seed(db);
      await db.exec(sql);
      const once = await read(db);
      await db.exec(sql);
      expect(await read(db)).toEqual(once);
      const by = Object.fromEntries(
        once.map((r) => [r.animation_key, r.config])
      );
      const fig19 = by.animationFoundationsFig19;
      expect(fig19.caption).toBe(fixture.animationFoundationsFig19.caption);
      expect(fig19.images[0]).toMatchObject({
        ...plate("19-01"),
        caption: expect.stringContaining("friction machine"),
      });
      expect(fig19.images[1].caption).toContain("atmospheric electricity");
      expect(fig19.images[2]).toEqual(
        fixture.animationFoundationsFig19.images[2]
      );
      const fig21 = by.animationFoundationsFig21;
      expect(fig21.images).toEqual([
        fixture.animationFoundationsFig21.images[1],
        { ...plate("21-01"), caption: "Original Eccles caption" },
      ]);
      expect(fig21.caption).toBe("Original Eccles caption");
      const flags = (
        await db.query(
          "select a.animation_key k,p.content c from paragraphs p join animations a on a.id=p.animation_id"
        )
      ).rows;
      for (const { k, c } of flags) {
        expect(c.sourceHash).toBe("keep-me");
        expect(c.animationFlags.transition).toBe(false);
        expect(c.animationFlags.room).toBe(
          k === "animationFoundationsFig11" ? 1 : undefined
        );
      }
    } finally {
      await db.close();
    }
  });
  it("preserves authored captions and refuses missing/duplicate Huxley or a mismatched paragraph", async () => {
    const { PGlite } = require(harness);
    const db = new PGlite();
    try {
      const data = structuredClone(fixture);
      data.animationFoundationsFig19.images[0].caption = "Editor caption";
      data.animationFoundationsFig21.images.push({
        ...data.animationFoundationsFig21.images[1],
      });
      await seed(db, data);
      await db.exec(
        'update paragraphs set content = \'{"blocks":[{"content":"Different paragraph"}]}\''
      );
      await db.exec(sql);
      const by = Object.fromEntries(
        (await read(db)).map((r) => [r.animation_key, r.config])
      );
      expect(by.animationFoundationsFig19.images[0].caption).toBe(
        "Editor caption"
      );
      expect(by.animationFoundationsFig21).toEqual(
        data.animationFoundationsFig21
      );
      expect(
        (
          await db.query(
            "select count(*)::int n from paragraphs where content ? 'animationFlags'"
          )
        ).rows[0].n
      ).toBe(0);
      await db.exec(
        "update animations set config = '{\"images\": []}' where animation_key='animationFoundationsFig21'"
      );
      await db.exec(sql);
      expect(
        (await read(db)).find(
          (r) => r.animation_key === "animationFoundationsFig21"
        ).config.images
      ).toEqual([]);
    } finally {
      await db.close();
    }
  });
});
