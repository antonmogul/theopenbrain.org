// @vitest-environment node
/** Runs 20261020230000_widget_uploads_4mb.sql and
 * 20261021000000_retina_stuart_widgets.sql in PGlite (OPENBRAIN-141).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/retinaStuartWidgets.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const limitSql = readFileSync(
  "supabase/migrations/20261020230000_widget_uploads_4mb.sql",
  "utf8"
);
const sql = readFileSync(
  "supabase/migrations/20261021000000_retina_stuart_widgets.sql",
  "utf8"
);

// The chapter as the 20 October 2026 dump has it: the paragraphs that carry
// the thirteen legacy figures, by section, plus a neighbour without one.
const LEGACY = {
  photoreceptors: ["animationPhotoreceptors", 0],
  phototransduction: ["animationPhototransduction", 5],
  "visual-cycle": ["animationTheVisualCycle", 10],
  pupillary: ["animationPupillaryLightreflex", 2],
  impaired: ["animationImpairedVision", 3],
  onoff: ["animationOnOff", 1],
  "cell-types": ["animationRetinalCellTypes", 0],
  synaptic: ["animationSynapticArchitecture", 16],
  "center-surround": ["animationCenterSurroundReceptiveFields", 2],
  "direction-selectivity": ["animationDirectionSelectivity", 7],
  "object-motion": ["animationObjectMotionSensitivity", 9],
  "rod-cone": ["animationRodVsConeCircuits", 11],
  iprgc: ["animationLightSensitiveGanglionCells", 13],
};

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  title text not null, media_type text not null, interaction_type text not null, component_name text not null,
  config jsonb not null default '{}', scientific_domain text, load_priority text, updated_at timestamptz default now());
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), title text not null, slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index int not null, content jsonb not null default '{}', content_text text, has_animation boolean default false,
  animation_id uuid references public.animations(id), animation_trigger text, updated_at timestamptz default now(),
  unique (section_id, order_index));
-- as 20260926020000 made it: the 2 MB check is an inline column check
create table public.widget_uploads (id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, description text, author text, ramp text, html text not null check (octet_length(html) <= 2097152),
  status text not null default 'draft', updated_at timestamptz default now());
insert into modules(slug) values ('the-retina');
insert into animations(animation_key, title, media_type, interaction_type, component_name)
  select k, k, 'lottie', 'click_states', 'Illustration' from unnest(array[
    ${Object.values(LEGACY)
      .map(([k]) => `'${k}'`)
      .join(",")}]) k;
insert into sections(module_id, title, slug, order_index) select id, 'Story of the eye (EDIT)', 'story-of-the-eye', 1 from modules;
insert into sections(module_id, title, slug, order_index) select id, 'Photoreceptors and phototransduction', 'photoreceptors', 2 from modules;
insert into sections(module_id, title, slug, order_index) select id, 'Retinal cell types', 'cell-types', 3 from modules;
insert into sections(module_id, title, slug, order_index) select id, 'Bipolar cells', 'bipolar', 4 from modules;
insert into sections(module_id, title, slug, order_index) select id, 'Circuits', 'circuits', 5 from modules;
`;

const text = (t) =>
  `jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'text', 'content', '${t}')))`;
const full = (k) =>
  `jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'animation_full', 'scroll', false, 'animationId', '${k}')))`;
const para = (section, order, content, key, trigger = "click") =>
  `insert into paragraphs(section_id, order_index, content, has_animation, animation_id, animation_trigger)
     select s.id, ${order}, ${content}, ${key ? "true" : "false"},
            ${key ? `(select id from animations where animation_key = '${key}')` : "null"},
            ${key ? `'${trigger}'` : "null"}
       from sections s where s.slug = '${section}';`;

const fixture = [
  // Story of the eye: two figures, then the two full-screen animations
  para("story-of-the-eye", 0, text("eye"), null),
  para(
    "story-of-the-eye",
    2,
    full("animationPupillaryLightreflex"),
    "animationPupillaryLightreflex"
  ),
  para(
    "story-of-the-eye",
    3,
    full("animationImpairedVision"),
    "animationImpairedVision"
  ),
  // Photoreceptors: pane figure on ¶0, full-screen on ¶5 and ¶10
  para("photoreceptors", 0, text("photoreceptors"), "animationPhotoreceptors"),
  para("photoreceptors", 4, text("rhodopsin"), null),
  para(
    "photoreceptors",
    5,
    full("animationPhototransduction"),
    "animationPhototransduction"
  ),
  para(
    "photoreceptors",
    10,
    full("animationTheVisualCycle"),
    "animationTheVisualCycle"
  ),
  // Cell types: four paragraphs share one figure, one more has Synaptic architecture
  ...[0, 1, 5, 8].map((i) =>
    para(
      "cell-types",
      i,
      text("cells" + i),
      "animationRetinalCellTypes",
      "scroll"
    )
  ),
  para("cell-types", 16, text("synapses"), "animationSynapticArchitecture"),
  // Bipolar: four paragraphs share ON/OFF
  ...[1, 2, 3, 4].map((i) =>
    para("bipolar", i, text("bipolar" + i), "animationOnOff")
  ),
  para("bipolar", 5, text("rectify"), null),
  // Circuits
  para(
    "circuits",
    2,
    text("center-surround"),
    "animationCenterSurroundReceptiveFields"
  ),
  para("circuits", 7, text("direction"), "animationDirectionSelectivity"),
  para(
    "circuits",
    9,
    text("object motion"),
    "animationObjectMotionSensitivity"
  ),
  para("circuits", 11, text("rod cone"), "animationRodVsConeCircuits"),
  para("circuits", 13, text("iprgc"), "animationLightSensitiveGanglionCells"),
].join("\n");

describe.skipIf(!harness || !existsSync(harness))(
  "Retina: Stuart's widgets (SQL)",
  () => {
    async function makeDb() {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(fixture);
      return db;
    }

    it("needs the 4 MB limit for RetINaBox v3", async () => {
      const db = await makeDb();
      await expect(db.exec(sql)).rejects.toThrow(/widget_uploads_html_check/);
    });

    it("raises the limit, publishes the 14 uploads and re-points the chapter, twice", async () => {
      const db = await makeDb();
      await db.exec(limitSql);
      await db.exec(limitSql);
      await db.exec(sql);
      await db.exec(sql);

      const { rows: limit } = await db.query(
        "select pg_get_constraintdef(oid) def from pg_constraint where conrelid = 'public.widget_uploads'::regclass and contype = 'c'"
      );
      expect(limit).toEqual([
        { def: "CHECK ((octet_length(html) <= 4194304))" },
      ]);

      const { rows: uploads } = await db.query(
        "select slug, status, ramp, author, octet_length(html) bytes from widget_uploads order by slug"
      );
      expect(uploads.map((u) => u.slug)).toEqual([
        "retina-center-surround",
        "retina-direction-selectivity",
        "retina-light-sensitive-ganglion-cells",
        "retina-object-motion-sensitivity",
        "retina-on-off-bipolar-cells",
        "retina-photoreceptors",
        "retina-phototransduction",
        "retina-pupillary-light-reflex",
        "retina-refraction-errors",
        "retina-retinabox",
        "retina-retinal-cell-types",
        "retina-rod-vs-cone-circuits",
        "retina-synaptic-architecture",
        "retina-visual-cycle",
      ]);
      for (const u of uploads) {
        expect(u).toMatchObject({
          status: "published",
          ramp: "perc",
          author: "Stuart Trenholm",
        });
        expect(u.bytes).toBeGreaterThan(300_000);
      }
      expect(
        uploads.find((u) => u.slug === "retina-retinabox").bytes
      ).toBeGreaterThan(2_097_152);

      // every upload has its animations row, widget-upload:<slug>
      const { rows: figs } = await db.query(
        "select count(*)::int n from animations where animation_key like 'widget-upload:retina-%' and media_type = 'widget' and component_name = 'IllustrationWidget' and config->>'widgetId' = 'upload:' || substr(animation_key, 15)"
      );
      expect(figs).toEqual([{ n: 13 }]);
      // the legacy rows are still there
      const { rows: legacy } = await db.query(
        "select count(*)::int n from animations where animation_key like 'animation%'"
      );
      expect(legacy).toEqual([{ n: 13 }]);

      const { rows } = await db.query(
        `select s.slug sec, p.order_index i, a.animation_key k, p.animation_trigger trig, p.has_animation has,
                p.content->'blocks'->0->>'type' t, p.content->'blocks'->0->>'widgetId' w, p.content->'blocks'->0->>'kind' kind, p.content_text txt
           from paragraphs p join sections s on s.id = p.section_id
           left join animations a on a.id = p.animation_id
          order by s.order_index, p.order_index`
      );
      const pane = (sec, i, slug) => ({
        sec,
        i,
        k: `widget-upload:${slug}`,
        trig: "auto",
        has: true,
        t: "text",
        w: null,
        kind: null,
        txt: null,
      });
      const band = (sec, i, slug, title) => ({
        sec,
        i,
        k: null,
        trig: expect.any(String),
        has: false,
        t: "widget",
        w: `upload:${slug}`,
        kind: "inline",
        txt: title,
      });
      const plain = (sec, i) => ({
        sec,
        i,
        k: null,
        trig: null,
        has: false,
        t: "text",
        w: null,
        kind: null,
        txt: null,
      });
      expect(rows).toEqual([
        plain("story-of-the-eye", 0),
        band(
          "story-of-the-eye",
          2,
          "retina-pupillary-light-reflex",
          "Pathway for the pupillary light reflex"
        ),
        band(
          "story-of-the-eye",
          3,
          "retina-refraction-errors",
          "Refractive errors"
        ),
        pane("photoreceptors", 0, "retina-photoreceptors"),
        plain("photoreceptors", 4),
        band(
          "photoreceptors",
          5,
          "retina-phototransduction",
          "Phototransduction"
        ),
        band("photoreceptors", 10, "retina-visual-cycle", "The visual cycle"),
        pane("cell-types", 0, "retina-retinal-cell-types"),
        pane("cell-types", 1, "retina-retinal-cell-types"),
        pane("cell-types", 5, "retina-retinal-cell-types"),
        pane("cell-types", 8, "retina-retinal-cell-types"),
        pane("cell-types", 16, "retina-synaptic-architecture"),
        pane("bipolar", 1, "retina-on-off-bipolar-cells"),
        pane("bipolar", 2, "retina-on-off-bipolar-cells"),
        pane("bipolar", 3, "retina-on-off-bipolar-cells"),
        pane("bipolar", 4, "retina-on-off-bipolar-cells"),
        plain("bipolar", 5),
        pane("circuits", 2, "retina-center-surround"),
        pane("circuits", 7, "retina-direction-selectivity"),
        pane("circuits", 9, "retina-object-motion-sensitivity"),
        pane("circuits", 11, "retina-rod-vs-cone-circuits"),
        pane("circuits", 13, "retina-light-sensitive-ganglion-cells"),
      ]);

      const { rows: titles } = await db.query(
        "select title from sections where slug = 'story-of-the-eye'"
      );
      expect(titles).toEqual([{ title: "Story of the eye" }]);
    });

    it("skips a chapter that isn't there", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(
        schema.replace("insert into modules(slug) values ('the-retina');", "")
      );
      await db.exec(limitSql);
      await db.exec(sql);
      const { rows } = await db.query(
        "select count(*)::int n from paragraphs where animation_id is not null"
      );
      expect(rows).toEqual([{ n: 0 }]);
      const { rows: up } = await db.query(
        "select count(*)::int n from widget_uploads"
      );
      expect(up).toEqual([{ n: 14 }]);
    });
  }
);
