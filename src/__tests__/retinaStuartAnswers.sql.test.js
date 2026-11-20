// @vitest-environment node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/retinaTextReview.json";
import answersFixture from "./fixtures/retinaStuartAnswers.json";
import { transformParagraph } from "@/composables/chapterTransform.mjs";
import { figureImages } from "@/helper/figureCycle";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261119540100_retina_stuart_answers.sql",
  "utf8"
);
const counting = "bced1220-5563-4751-995d-5ddd31acc061";
const baden = "f8fbd23b-3204-4fa4-b355-ea250b659430";
const development = "f96d99ae-0771-4784-8949-d73788bb9c90";
const schema = `
create table modules(id uuid primary key,slug text);
create table sections(id uuid primary key,module_id uuid,slug text,animation_config jsonb,updated_at timestamptz);
create table animations(id uuid primary key default gen_random_uuid(),animation_key text unique,title text,media_type text,image_file_url text,interaction_type text,component_name text,config jsonb,updated_at timestamptz);
create table paragraphs(id uuid primary key,section_id uuid,order_index int,content jsonb,content_text text,has_animation boolean,animation_id uuid,animation_trigger text,is_subsection_header boolean,subsection_level int,updated_at timestamptz);
`;
async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  await db.query("insert into modules values ($1,$2)", [
    fixture.module.id,
    "the-retina",
  ]);
  const records = {
    sections: [
      fixture.sections,
      ["id", "module_id", "slug", "animation_config"],
    ],
    animations: [
      fixture.animations,
      ["id", "animation_key", "title", "config", "image_file_url"],
    ],
    paragraphs: [
      [
        ...fixture.paragraphs,
        ...answersFixture.paragraphs,
        ...fixture.footnotes,
      ],
      [
        "id",
        "section_id",
        "order_index",
        "content",
        "content_text",
        "has_animation",
        "animation_id",
        "animation_trigger",
        "is_subsection_header",
        "subsection_level",
      ],
    ],
  };
  for (const [table, [rows, columns]] of Object.entries(records))
    for (const row of rows)
      await db.query(
        `insert into ${table} (${columns.join(",")}) values (${columns.map((_, i) => `$${i + 1}`).join(",")})`,
        columns.map((c) => row[c])
      );
  for (const name of [
    "20261119500000_retina_text_review",
    "20261119510000_retina_figure_notes",
  ])
    await db.exec(readFileSync(`supabase/migrations/${name}.sql`, "utf8"));
  return db;
}
const rows = async (db) =>
  (await db.query("select * from paragraphs order by id")).rows;
const art = async (db) =>
  (await db.query("select * from animations order by animation_key")).rows;
const snapshot = async (db) => [await rows(db), await art(db)];

describe.skipIf(!harness || !existsSync(harness))(
  "Stuart's Retina answers (SQL)",
  () => {
    it("holds the existing chart across all three paragraphs, preserving reviewed prose and citations", async () => {
      const db = await fresh();
      try {
        const before = await rows(db);
        await db.exec(sql);
        const after = await rows(db);
        expect(after).toHaveLength(before.length);
        for (const p of after) {
          const old = before.find((row) => row.id === p.id);
          expect(p.content_text).toBe(old.content_text);
          expect(p.order_index).toBe(old.order_index);
          if (p.id !== baden)
            expect(p.content.blocks).toEqual(old.content.blocks);
        }
        expect(
          after.find((p) => p.id === counting).content.animationFlags.hold
        ).toBe("next");
        for (const id of [
          "ad6af548-5205-4f42-ac03-224533d5d3bf",
          "bb84d092-7ba2-4003-a1eb-1b5eb4ecf67e",
        ])
          expect(after.find((p) => p.id === id).animation_id).toBeNull();
        const chart = (await art(db)).find(
          (a) => a.animation_key === "animationRetinaCountingPhotons"
        );
        expect(chart.image_file_url).toBe(
          "/publicAssets/images/currentVoltage.png"
        );
        expect(chart.config.caption).toBe(
          "Current-voltage relationship from the outer segment of an isolated salamander rod. Voltage was held at the dark level and current was measured 20 ms after switching to the new light level. Curve 1 – dark. Curve 2 – half-saturating light. Curve 3 – Saturating light. Adapted from Baylor and Nunn (1986)."
        );
        expect(JSON.stringify(after)).toContain("citation-ref");
      } finally {
        await db.close();
      }
    });

    it("restores Baden after Blind spot and links a local silent loop at Generation and wiring", async () => {
      const db = await fresh();
      try {
        await db.exec(sql);
        const all = await rows(db),
          animations = await art(db);
        const video = all.find((p) => p.id === baden);
        expect(transformParagraph(video, [])).toMatchObject({
          type: "breakVideo",
          videoSlug: "baden",
          title: "Tom Baden",
        });
        const preceding = all.find(
          (p) =>
            p.section_id === video.section_id &&
            p.order_index === video.order_index - 1
        );
        expect(preceding.content.blocks).toContainEqual(
          expect.objectContaining({
            type: "break_section",
            title: "Blind spot",
          })
        );
        const paragraph = all.find((p) => p.id === development);
        const record = animations.find((a) => a.id === paragraph.animation_id);
        expect(paragraph).toMatchObject({
          has_animation: true,
          animation_trigger: "animationRetinaDevelopment",
        });
        const image = figureImages({
          ...record.config,
          imageUrl: record.image_file_url,
        })[0];
        expect(image.loop).toEqual({
          mp4: "/publicAssets/videos/retina/retinal-development-loop.mp4",
          webm: "/publicAssets/videos/retina/retinal-development-loop.webm",
          width: 960,
          height: 960,
        });
        expect(record.config.caption).toContain("developing retina");
        for (const path of [image.src, image.loop.mp4, image.loop.webm])
          expect(existsSync(`public${path}`)).toBe(true);
        const once = await snapshot(db);
        await db.exec(sql);
        expect(await snapshot(db)).toEqual(once);
      } finally {
        await db.close();
      }
    });

    it("preserves later author choices on every changed key while allowing unrelated prose/config edits", async () => {
      const db = await fresh();
      try {
        await db.exec(`
        update animations set config = config || '{"caption":"Author caption","custom":true}' where animation_key='animationRetinaCountingPhotons';
        update paragraphs set content=jsonb_set(content,'{animationFlags}','{"hold":0.5,"room":1}') where id='${counting}';
        update paragraphs set content=jsonb_set(content,'{blocks,1,videoSlug}','"author-video"') where id='${baden}';
        update paragraphs set animation_trigger='author-figure' where id='${development}';
      `);
        const before = await snapshot(db);
        await db.exec(sql);
        expect(await snapshot(db)).toEqual(before);
      } finally {
        await db.close();
      }

      const edited = await fresh();
      try {
        await edited.exec(`
        update animations set config=config || '{"custom":true}' where animation_key='animationRetinaCountingPhotons';
        update paragraphs set content=jsonb_set(content,'{blocks,0,content}','"Author prose"') where id in ('${counting}','${development}');
      `);
        await edited.exec(sql);
        const result = await rows(edited);
        expect(
          result.find((p) => p.id === counting).content.blocks[0].content
        ).toBe("Author prose");
        expect(
          result.find((p) => p.id === development).content.blocks[0].content
        ).toBe("Author prose");
        expect(result.find((p) => p.id === development).has_animation).toBe(
          true
        );
        expect(
          (await art(edited)).find(
            (a) => a.animation_key === "animationRetinaCountingPhotons"
          ).config.custom
        ).toBe(true);
      } finally {
        await edited.close();
      }
    });

    it("never places a conflicting development record or changes another chapter's paragraphs", async () => {
      const db = await fresh();
      try {
        await db.exec(
          'insert into animations(animation_key,config) values (\'animationRetinaDevelopment\',\'{"images":[{"src":"/author.webp"}]}\')'
        );
        await db.exec(sql);
        expect(
          (await rows(db)).find((p) => p.id === development).animation_id
        ).toBeNull();
      } finally {
        await db.close();
      }
      const other = await fresh();
      try {
        await other.exec("update modules set slug='another-chapter'");
        const before = await rows(other);
        await other.exec(sql);
        expect(await rows(other)).toEqual(before);
      } finally {
        await other.close();
      }
    });
  }
);
