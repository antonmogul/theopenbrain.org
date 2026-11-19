// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/retinaTextReview.json";
import { chapterBackReferences } from "@/helper/chapterReferences";
import { transformParagraph } from "@/composables/chapterTransform.mjs";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261119500000_retina_text_review.sql",
  "utf8"
);
const counting = "bced1220-5563-4751-995d-5ddd31acc061";
const amplification = "bb84d092-7ba2-4003-a1eb-1b5eb4ecf67e";
const removed = [
  "bc408844-249e-4f7c-ba42-bd1496d227ed",
  "b92459b8-0d8f-4bc6-9f2f-d48d2f8f70e9",
  "1dca0aa4-b5c3-42eb-af2e-95c42ac8fb8d",
];
const schema = `
create table modules(id uuid primary key default gen_random_uuid(), slug text unique);
create table sections(id uuid primary key, module_id uuid references modules(id), slug text);
create table animations(id uuid primary key default gen_random_uuid(), animation_key text unique, title text,
 media_type text, image_file_url text, interaction_type text, component_name text, config jsonb, updated_at timestamptz);
create table paragraphs(id uuid primary key, section_id uuid references sections(id), order_index int,
 content jsonb, content_text text, has_animation boolean, animation_id uuid, animation_trigger text,
 is_subsection_header boolean, subsection_level int, updated_at timestamptz);
`;
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  await db.query("insert into modules(id,slug) values ($1,$2)", [
    fixture.module.id,
    "the-retina",
  ]);
  for (const s of fixture.sections)
    await db.query("insert into sections values ($1,$2,$3)", [
      s.id,
      s.module_id,
      s.slug,
    ]);
  for (const a of fixture.animations)
    await db.query(
      "insert into animations(id,animation_key,title,config,image_file_url) values ($1,$2,$3,$4,$5)",
      [a.id, a.animation_key, a.title, a.config, a.image_file_url]
    );
  for (const p of [...fixture.paragraphs, ...fixture.footnotes])
    await db.query(
      `insert into paragraphs
    (id,section_id,order_index,content,content_text,has_animation,animation_id,animation_trigger,is_subsection_header,subsection_level)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        p.id,
        p.section_id,
        p.order_index,
        p.content,
        p.content_text,
        p.has_animation,
        p.animation_id,
        p.animation_trigger,
        p.is_subsection_header,
        p.subsection_level,
      ]
    );
  return db;
}
const rows = async (db) =>
  (await db.query("select * from paragraphs order by id")).rows;
const content = (p) => p.content.blocks.map((b) => b.content || "").join("");
const snapshot = async (db) => [
  await rows(db),
  (await db.query("select * from animations order by id")).rows,
];

describe.skipIf(!harness || !existsSync(harness))(
  "Retina review text migration (SQL)",
  () => {
    it("maps every original citation target to the History contract, including ranges, without changing scientific superscripts or bibliography numbering", async () => {
      const db = await fresh();
      try {
        await db.exec(sql);
        const after = await rows(db);
        for (const old of fixture.paragraphs.filter(
          (p) => !removed.includes(p.id)
        )) {
          const next = after.find((p) => p.id === old.id);
          const expected = [
            ...content(old).matchAll(/<sup data-sup=['"]([\d ]+)['"]>/g),
          ].flatMap((m) => m[1].trim().split(/\s+/).map(Number));
          const actual = [
            ...transformParagraph(next).text.matchAll(
              /<sup class="citation-ref" data-ref="(\d+)">/g
            ),
          ].map((m) => Number(m[1]));
          expect(actual, old.id).toEqual(expected);
          expect(content(next)).not.toContain("data-sup=");
          const visible = (html) => html.replace(/<[^>]*>/g, "");
          const expanded = content(old).replace(
            /<sup data-sup=['"]([\d ]+)['"]>([^<]*)<\/sup>/g,
            (_, numbers, label) =>
              numbers.trim().split(/\s+/).join(",") +
              (label.trim().endsWith(",") ? "," : "")
          );
          expect(visible(content(next)), old.id).toBe(visible(expanded));
          expect(
            [...content(next).matchAll(/<sup>(.*?)<\/sup>/g)].map((m) => m[1])
          ).toEqual(
            [...content(old).matchAll(/<sup>(.*?)<\/sup>/g)].map((m) => m[1])
          );
        }
        const notes = after
          .filter((p) => p.section_id === fixture.footnotes[0].section_id)
          .sort((a, b) => a.order_index - b.order_index);
        expect(notes).toEqual(
          expect.arrayContaining(
            fixture.footnotes.map((p) => expect.objectContaining(p))
          )
        );
        const back = chapterBackReferences({
          slug: "the-retina",
          footNotes: {
            notes: notes.map((p) => ({ text: p.content.blocks[0].content })),
          },
        });
        expect(back.entries.map((r) => r.number)).toEqual(
          Array.from({ length: 106 }, (_, i) => i + 1)
        );
      } finally {
        await db.close();
      }
    });
    it("returns both empty demos to prose, links the bundled chart, removes exactly the three planning notes and captions the original colour figure", async () => {
      const db = await fresh();
      try {
        await db.exec(sql);
        const after = await rows(db);
        for (const id of removed)
          expect(after.some((p) => p.id === id)).toBe(false);
        expect(after).toHaveLength(fixture.paragraphs.length + 106 - 3);
        for (const id of [counting, amplification])
          expect(
            transformParagraph(after.find((p) => p.id === id)).type
          ).toBeUndefined();
        const chart = (
          await db.query(
            "select * from animations where animation_key='animationRetinaCountingPhotons'"
          )
        ).rows[0];
        expect(chart.image_file_url).toBe(
          "/publicAssets/images/currentVoltage.png"
        );
        expect(existsSync(`public${chart.image_file_url}`)).toBe(true);
        expect(after.find((p) => p.id === counting).animation_id).toBe(
          chart.id
        );
        expect(
          (
            await db.query(
              "select config from animations where animation_key='animationColorOpponency'"
            )
          ).rows[0].config.caption
        ).toBe(
          "Stare at the cross for 30 seconds, then close your eyes or look at a white wall and notice how the colours change."
        );
      } finally {
        await db.close();
      }
    });
    it("is idempotent, including timestamps and the chart insert", async () => {
      const db = await fresh();
      try {
        await db.exec(sql);
        const once = await snapshot(db);
        await db.exec(sql);
        expect(await snapshot(db)).toEqual(once);
      } finally {
        await db.close();
      }
    });
    it("preserves creator edits, extra content metadata and newly assigned figures", async () => {
      const db = await fresh();
      try {
        await db.query(
          'update paragraphs set content=content || \'{"creator":"keep"}\'::jsonb'
        );
        await db.query(
          'update animations set config=config || \'{"caption":"Creator caption"}\'::jsonb'
        );
        const before = await snapshot(db);
        await db.exec(sql);
        expect(await snapshot(db)).toEqual(before);
      } finally {
        await db.close();
      }
    });
    it("cannot modify another chapter even if the exact snapshot rows are moved there, or caption a shared figure", async () => {
      const db = await fresh();
      try {
        await db.exec(
          "insert into modules(slug) values ('foundations-of-neuroscience'); update sections set module_id=(select id from modules where slug='foundations-of-neuroscience');"
        );
        const before = await snapshot(db);
        await db.exec(sql);
        expect(await snapshot(db)).toEqual(before);
      } finally {
        await db.close();
      }
    });
    it("preserves the colour caption when another chapter also uses that figure", async () => {
      const db = await fresh();
      try {
        await db.exec(
          "insert into modules(slug) values ('another-chapter'); insert into sections values ('00000000-0000-0000-0000-000000000001',(select id from modules where slug='another-chapter'),'other');"
        );
        await db.query(
          "insert into paragraphs(id,section_id,animation_id) values (gen_random_uuid(),'00000000-0000-0000-0000-000000000001',$1)",
          [fixture.animations[0].id]
        );
        await db.exec(sql);
        expect(
          (
            await db.query("select config from animations where id=$1", [
              fixture.animations[0].id,
            ])
          ).rows[0].config
        ).toEqual(fixture.animations[0].config);
      } finally {
        await db.close();
      }
    });
  }
);
