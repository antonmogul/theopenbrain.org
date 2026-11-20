// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COVER_BY_SLUG, REACTIVE_COVER_BY_SLUG } from "../helper/chapterCover";
import { CREDITS_BY_SLUG } from "../helper/chapterCredits";
import { SECTION_ART_BY_SLUG } from "../helper/sectionArt";
import { BOX_TREATMENT_BY_SLUG } from "../helper/breakoutTreatment";
import { RAIL_BOXES_BY_SLUG } from "../helper/exploreRail";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const columns = readFileSync(
  "supabase/migrations/20261120066300_chapter_settings_columns.sql",
  "utf8"
);
const seed = readFileSync(
  "supabase/migrations/20261120066301_chapter_settings_seed.sql",
  "utf8"
);

const lockdown = readFileSync(
  "supabase/migrations/20260923000000_rls_lockdown_content_and_profiles.sql",
  "utf8"
);
const policies = lockdown.slice(
  lockdown.indexOf('create policy "Read published chapters'),
  lockdown.indexOf("-- ── paragraphs")
);

async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create table modules(id serial primary key, slug text, status text default 'published', authors jsonb, ramp text, cover_image_url text);
    create table sections(id serial primary key, module_id int references modules(id), slug text, box_treatment text);
    alter table modules enable row level security; alter table sections enable row level security;
    grant select on modules, sections to anon;
    grant select, update on modules, sections to authenticated;
    create function public.is_creator() returns boolean language sql stable as $$ select current_setting('test.creator', true) = 'yes' $$;
    ${policies}
    insert into modules(slug) values ('foundations-of-neuroscience'),('the-retina'),('attention-and-working-memory'),('stress'),('unrelated');
    update modules set status = 'draft' where slug = 'stress';
  `);
  for (const [chapter, entries] of Object.entries(SECTION_ART_BY_SLUG)) {
    const slugs = new Set([
      ...Object.keys(entries),
      ...Object.keys(BOX_TREATMENT_BY_SLUG[chapter] || {}),
    ]);
    for (const slug of slugs)
      await db.query(
        "insert into sections(module_id, slug) select id, $1 from modules where slug = $2",
        [slug, chapter]
      );
  }
  await db.exec(
    "insert into sections(module_id,slug) select id,'box-descartes' from modules where slug in ('the-retina','stress')"
  );
  await db.exec(columns);
  return db;
}

describe.skipIf(!harness || !existsSync(harness))(
  "chapter settings migrations",
  () => {
    it("copies every current map value and is idempotent", async () => {
      const db = await fresh();
      try {
        await db.exec(seed);
        const { rows } = await db.query("select * from modules order by id");
        for (const row of rows) {
          if (COVER_BY_SLUG[row.slug])
            expect(row.cover.image).toBe(COVER_BY_SLUG[row.slug]);
          if (REACTIVE_COVER_BY_SLUG[row.slug])
            expect(row.cover.reactive).toEqual({
              ...REACTIVE_COVER_BY_SLUG[row.slug],
              kind: REACTIVE_COVER_BY_SLUG[row.slug].kind || "lottie",
            });
          if (CREDITS_BY_SLUG[row.slug])
            expect(row.credits).toEqual({
              ...CREDITS_BY_SLUG[row.slug],
              acknowledgements:
                CREDITS_BY_SLUG[row.slug].acknowledgements || [],
            });
          if (row.authors)
            for (const a of row.authors)
              expect(a).toMatchObject({
                url: expect.stringMatching(/^https:/),
                photo: null,
              });
        }
        const sections = (
          await db.query(
            "select s.*,m.slug chapter from sections s join modules m on m.id=module_id order by s.id"
          )
        ).rows;
        for (const s of sections) {
          expect(s.art).toEqual(
            SECTION_ART_BY_SLUG[s.chapter]?.[s.slug] || null
          );
          expect(s.box_treatment).toBe(
            BOX_TREATMENT_BY_SLUG[s.chapter]?.[s.slug] || null
          );
          expect(s.rail).toBe(
            RAIL_BOXES_BY_SLUG[s.chapter]?.includes(s.slug) ? true : null
          );
        }
        await db.exec(columns);
        await db.exec(seed);
        expect(
          (await db.query("select * from modules order by id")).rows
        ).toEqual(rows);
        expect(
          (
            await db.query(
              "select s.*,m.slug chapter from sections s join modules m on m.id=module_id order by s.id"
            )
          ).rows
        ).toEqual(sections);
      } finally {
        await db.close();
      }
    });
    it("preserves authored settings and unrelated keys, and only fills missing author profile keys", async () => {
      const db = await fresh();
      try {
        await db.exec(`update modules set cover='{"image":"/custom.webp","reactive":null,"extra":1}', credits='{"funding":null,"extra":2}', ramp='move', authors='[{"name":"Stuart Trenholm","url":"https://custom.example","photo":"/face.webp","extra":3}]' where slug='foundations-of-neuroscience';
        update modules set cover_image_url='/legacy.webp' where slug='the-retina';
        update sections set art='{"src":"/own.webp"}',rail=false,box_treatment='pale';`);
        await db.exec(seed);
        const history = (
          await db.query(
            "select * from modules where slug='foundations-of-neuroscience'"
          )
        ).rows[0];
        expect(history.cover).toEqual({
          image: "/custom.webp",
          reactive: null,
          extra: 1,
        });
        expect(history.credits).toMatchObject({ funding: null, extra: 2 });
        expect(history.ramp).toBe("move");
        expect(history.authors).toEqual([
          {
            name: "Stuart Trenholm",
            url: "https://custom.example",
            photo: "/face.webp",
            extra: 3,
          },
        ]);
        expect(
          (await db.query("select cover from modules where slug='the-retina'"))
            .rows[0].cover.image
        ).toBe("/legacy.webp");
        for (const s of (await db.query("select * from sections")).rows)
          expect(s).toMatchObject({
            art: { src: "/own.webp" },
            rail: false,
            box_treatment: "pale",
          });
      } finally {
        await db.close();
      }
    });
    it("inherits published-only anon reads and creator-only writes", async () => {
      const db = await fresh();
      try {
        await db.exec(seed);
        await db.exec("set role anon");
        expect(
          (
            await db.query(
              "select cover,credits from modules where slug='the-retina'"
            )
          ).rows[0].credits.funding
        ).toBeTruthy();
        expect(
          (await db.query("select * from modules where slug='stress'")).rows
        ).toEqual([]);
        expect(
          (await db.query("select * from sections where module_id=4")).rows
        ).toEqual([]);
        await expect(db.exec("update modules set cover=null")).rejects.toThrow(
          /permission denied/
        );
        await db.exec(
          "reset role; set role authenticated; set test.creator='no'"
        );
        expect(
          (await db.query("update modules set cover=null returning id")).rows
        ).toEqual([]);
        await db.exec("set test.creator='yes'");
        expect(
          (
            await db.query(
              "update modules set cover=null where slug='stress' returning id"
            )
          ).rows
        ).toHaveLength(1);
      } finally {
        await db.close();
      }
    });
  }
);
