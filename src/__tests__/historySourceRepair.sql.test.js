// @vitest-environment node
/** Isolated PostgreSQL-compatible execution tests.
 * Run with HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historySourceRepair.sql.test.js
 * No server, credentials, Supabase CLI, auth, extensions or network are used.
 * The minimal schema models columns, constraints and inbound FKs touched here;
 * this does NOT establish hosted Supabase RLS or production-state parity.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import fixture from "../data/history/sourceContentRepairs.json";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261005000000_history_source_content_repairs.sql",
  "utf8"
);
let sharedDb;
const chapter = fixture.chapterSlug;
const schema = `
create table public.content_versions (id uuid primary key);
insert into public.content_versions values ('00000000-0000-0000-0000-000000000001');
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null default '00000000-0000-0000-0000-000000000001'
    references public.content_versions(id),
  slug text not null, unique(content_version_id, slug));
create table public.animations (
  id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  title text not null, media_type text not null, interaction_type text not null,
  component_name text not null, config jsonb not null default '{}', image_file_url text,
  scientific_domain text, load_priority text, updated_at timestamptz default now());
create table public.sections (
  id uuid primary key default gen_random_uuid(), module_id uuid references public.modules(id),
  title text not null, slug text not null, order_index integer not null,
  updated_at timestamptz default now(), unique(module_id,slug), unique(module_id,order_index));
create table public.paragraphs (
  id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  content jsonb not null, content_text text, order_index integer not null,
  has_animation boolean default false, animation_id uuid references public.animations(id),
  animation_trigger text, is_subsection_header boolean default false, subsection_level integer default 0,
  created_at timestamptz default now(), updated_at timestamptz default now(), unique(section_id,order_index));
create table public."references" (
  id uuid primary key default gen_random_uuid(), module_id uuid references public.modules(id),
  number integer, authors text, title text, journal text, year integer, volume text,
  pages text, doi text, url text, pub_type text, raw_text text, unique(module_id,number));
create table public.highlights (id uuid primary key default gen_random_uuid(),
  paragraph_id uuid references public.paragraphs(id) on delete cascade, selected_text text);
create table public.comments (id uuid primary key default gen_random_uuid(),
  paragraph_id uuid references public.paragraphs(id) on delete cascade, content text);
create table public.reading_progress (id uuid primary key default gen_random_uuid(),
  last_paragraph_id uuid references public.paragraphs(id));
create table public.box_anchors (id uuid primary key default gen_random_uuid(),
  anchor_paragraph_id uuid references public.paragraphs(id) on delete set null);
`;

async function makeDb({ seed = true } = {}) {
  const { PGlite } = require(harness);
  const notices = [];
  if (!sharedDb) sharedDb = new PGlite();
  const db = sharedDb;
  await db.exec("drop schema public cascade; create schema public;");
  await db.exec(schema);
  if (seed) {
    for (const slug of [chapter, "another-chapter"]) {
      const {
        rows: [module],
      } = await db.query("insert into modules(slug) values ($1) returning id", [
        slug,
      ]);
      const rows = [
        ...fixture.paragraphUpdates,
        ...fixture.fragments,
        ...fixture.figures,
      ];
      const bySection = new Map();
      for (const item of rows) {
        if (!bySection.has(item.sectionSlug))
          bySection.set(item.sectionSlug, []);
        bySection.get(item.sectionSlug).push(item);
      }
      let index = 0;
      for (const [sectionSlug, items] of bySection) {
        const title =
          fixture.titles.find((t) => t.sectionSlug === sectionSlug)?.before ||
          sectionSlug;
        const {
          rows: [section],
        } = await db.query(
          "insert into sections(module_id,title,slug,order_index) values ($1,$2,$3,$4) returning id",
          [module.id, title, sectionSlug, index++]
        );
        for (const item of items) {
          await db.query(
            "insert into paragraphs(section_id,content,content_text,order_index) values ($1,$2,$3,$4) on conflict (section_id,order_index) do nothing",
            [
              section.id,
              item.before.content,
              item.before.content_text,
              item.orderIndex,
            ]
          );
        }
      }
      const r = fixture.referenceUpdates[0];
      const columns = Object.keys(r.before);
      await db.query(
        `insert into public."references" (module_id,number,${columns.join(",")}) values ($1,$2,${columns.map((_, i) => `$${i + 3}`).join(",")})`,
        [module.id, r.number, ...Object.values(r.before)]
      );
    }
    await db.query(
      "insert into animations(animation_key,title,media_type,interaction_type,component_name,config,image_file_url) values ('animationFoundationsFigK','The four humors','image','static_image','IllustrationPlaceholder',$1,'/existing-humors.jpg')",
      [
        {
          placeholder: true,
          figureNumber: "K",
          images: [{ src: "/existing-humors.jpg" }],
        },
      ]
    );
  }
  return { db, notices };
}
async function paragraph(db, sectionSlug, orderIndex, slug = chapter) {
  return (
    await db.query(
      "select p.* from paragraphs p join sections s on s.id=p.section_id join modules m on m.id=s.module_id where m.slug=$1 and s.slug=$2 and p.order_index=$3",
      [slug, sectionSlug, orderIndex]
    )
  ).rows[0];
}
async function snapshot(db) {
  const result = {};
  for (const table of [
    "modules",
    "sections",
    "paragraphs",
    "animations",
    "references",
    "highlights",
    "comments",
    "reading_progress",
    "box_anchors",
  ]) {
    result[table] = (
      await db.query(`select * from public."${table}" order by id`)
    ).rows;
  }
  return result;
}
afterAll(async () => {
  if (sharedDb) await sharedDb.close();
});

describe.skipIf(!harness)(
  "History migration in isolated PostgreSQL-compatible PGlite",
  () => {
    it("rejects an ambiguous History slug across content versions without changing either", async () => {
      const { db } = await makeDb();
      await db.exec(
        "insert into content_versions values ('00000000-0000-0000-0000-000000000002')"
      );
      await db.query(
        "insert into modules (content_version_id, slug) values ('00000000-0000-0000-0000-000000000002', $1)",
        [chapter]
      );
      const before = await snapshot(db);
      await expect(db.exec(sql)).rejects.toThrow("ambiguous chapter slug");
      expect(await snapshot(db)).toEqual(before);
    });

    it("repairs exact source snapshots, preserves other chapters and humoral K, and is idempotent", async () => {
      const { db, notices } = await makeDb();
      const before = await snapshot(db);
      await db.exec(sql, {
        onNotice: (notice) => notices.push(notice.message),
      });
      for (const item of fixture.paragraphUpdates) {
        const p = await paragraph(db, item.sectionSlug, item.orderIndex);
        expect(p.content).toEqual(item.after.content);
        expect(p.content_text).toBe(item.after.content_text);
        const other = await paragraph(
          db,
          item.sectionSlug,
          item.orderIndex,
          "another-chapter"
        );
        expect(other.content).toEqual(item.before.content);
      }
      for (const item of fixture.fragments) {
        expect(
          await paragraph(db, item.sectionSlug, item.orderIndex)
        ).toBeUndefined();
        expect(
          await paragraph(
            db,
            item.sectionSlug,
            item.orderIndex,
            "another-chapter"
          )
        ).toBeDefined();
      }
      for (const item of fixture.figures) {
        const p = await paragraph(db, item.sectionSlug, item.orderIndex);
        const a = (
          await db.query("select * from animations where id=$1", [
            p.animation_id,
          ])
        ).rows[0];
        expect(a.animation_key).toBe(item.animationKey);
        expect(a.config).toEqual(item.config);
      }
      expect(
        (
          await db.query(
            "select * from animations where animation_key='animationFoundationsFigK'"
          )
        ).rows[0]
      ).toEqual(before.animations[0]);
      expect((await paragraph(db, "further-reading", 0)).content).toEqual(
        fixture.furtherReading.paragraph.content
      );
      expect(
        (
          await db.query(
            'select r.* from public."references" r join modules m on m.id=r.module_id where m.slug=$1',
            [chapter]
          )
        ).rows[0]
      ).toMatchObject(fixture.referenceUpdates[0].after);
      expect(notices.some((x) => x.includes("deleting exact fragment"))).toBe(
        true
      );
      const after = await snapshot(db);
      await db.exec(sql, {
        onNotice: (notice) => notices.push(notice.message),
      });
      expect(await snapshot(db)).toEqual(after);
    }, 30000);

    it("retains divergent content, titles, bibliography, artwork and authored further reading with notices", async () => {
      const { db, notices } = await makeDb();
      const p = await paragraph(db, "where-is-my-mind", 0);
      await db.query("update paragraphs set content=$1 where id=$2", [
        { blocks: [{ type: "text", content: "Author edit" }] },
        p.id,
      ]);
      await db.query(
        "update sections set title='Author title' where module_id=(select id from modules where slug=$1) and slug='box-ngf'",
        [chapter]
      );
      await db.query(
        'update public."references" set raw_text=$1 where module_id=(select id from modules where slug=$2)',
        ["Author bibliography", chapter]
      );
      const f = fixture.figures[0];
      await db.query(
        "insert into animations(animation_key,title,media_type,interaction_type,component_name,config) values ($1,'Author artwork','image','static_image','IllustrationPlaceholder','{}')",
        [f.animationKey]
      );
      await db.query(
        "insert into sections(module_id,title,slug,order_index) select id,'Author resources','further-reading',99 from modules where slug=$1",
        [chapter]
      );
      await db.exec(sql, {
        onNotice: (notice) => notices.push(notice.message),
      });
      expect(
        (await paragraph(db, "where-is-my-mind", 0)).content.blocks[0].content
      ).toBe("Author edit");
      expect(await paragraph(db, "box-ngf", 0)).toBeDefined();
      expect(
        (await paragraph(db, f.sectionSlug, f.orderIndex)).animation_id
      ).toBeNull();
      expect(
        (
          await db.query(
            'select r.raw_text from public."references" r join modules m on m.id=r.module_id where m.slug=$1',
            [chapter]
          )
        ).rows[0].raw_text
      ).toBe("Author bibliography");
      expect(await paragraph(db, "further-reading", 0)).toBeUndefined();
      expect(notices.some((x) => x.includes("divergent artwork"))).toBe(true);
      expect(notices.some((x) => x.includes("noncanonical title"))).toBe(true);
    }, 30000);

    it("never cascades highlights, comments, reading progress or box anchors", async () => {
      const { db, notices } = await makeDb();
      const first = await paragraph(db, fixture.fragments[0].sectionSlug, 0);
      const second = await paragraph(db, fixture.fragments[1].sectionSlug, 0);
      const third = await paragraph(db, fixture.fragments[2].sectionSlug, 0);
      await db.query(
        "insert into highlights(paragraph_id,selected_text) values ($1,'Saved highlight')",
        [first.id]
      );
      await db.query(
        "insert into comments(paragraph_id,content) values ($1,'Saved comment')",
        [second.id]
      );
      await db.query(
        "insert into reading_progress(last_paragraph_id) values ($1)",
        [third.id]
      );
      await db.query(
        "insert into box_anchors(anchor_paragraph_id) values ($1)",
        [third.id]
      );
      const before = await snapshot(db);
      await db.exec(sql, {
        onNotice: (notice) => notices.push(notice.message),
      });
      const after = await snapshot(db);
      for (const item of fixture.fragments)
        expect(await paragraph(db, item.sectionSlug, 0)).toBeDefined();
      for (const table of [
        "highlights",
        "comments",
        "reading_progress",
        "box_anchors",
      ])
        expect(after[table]).toEqual(before[table]);
      expect(notices.filter((x) => x.includes("dependent data")).length).toBe(
        3
      );
    }, 30000);

    it.each([
      ["highlights", "paragraph_id"],
      ["comments", "paragraph_id"],
      ["reading_progress", "last_paragraph_id"],
      ["box_anchors", "anchor_paragraph_id"],
    ])(
      "retains fragments for an independent %s reference",
      async (table, column) => {
        const { db, notices } = await makeDb();
        const row = await paragraph(db, fixture.fragments[0].sectionSlug, 0);
        await db.query(`insert into ${table}(${column}) values ($1)`, [row.id]);
        await db.exec(sql, {
          onNotice: (notice) => notices.push(notice.message),
        });
        expect(
          (await paragraph(db, fixture.fragments[0].sectionSlug, 0)).id
        ).toBe(row.id);
        expect(
          (await db.query(`select ${column} from ${table}`)).rows[0][column]
        ).toBe(row.id);
        expect(
          notices.some((x) => x.includes(`dependent data in ${table}`))
        ).toBe(true);
      },
      30000
    );

    it("fails closed if an unexpected composite paragraph FK is introduced", async () => {
      const { db, notices } = await makeDb();
      await db.exec(`alter table paragraphs add unique (id,section_id);
      create table composite_dependency (paragraph_id uuid, section_id uuid,
      foreign key (paragraph_id,section_id) references paragraphs(id,section_id) on delete cascade);`);
      await db.exec(sql, {
        onNotice: (notice) => notices.push(notice.message),
      });
      for (const item of fixture.fragments)
        expect(await paragraph(db, item.sectionSlug, 0)).toBeDefined();
      expect(
        notices.filter((x) => x.includes("unsupported inbound FK"))
      ).toHaveLength(3);
    }, 30000);

    it("does nothing when History is absent", async () => {
      const { db, notices } = await makeDb({ seed: false });
      await db.exec(sql, {
        onNotice: (notice) => notices.push(notice.message),
      });
      expect((await snapshot(db)).animations).toEqual([]);
      expect(notices.some((x) => x.includes("chapter absent"))).toBe(true);
    }, 30000);
  }
);
