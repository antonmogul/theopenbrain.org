// @vitest-environment node
/** Runs 20261021010000_history_breakout_boxes.sql in PGlite (OPENBRAIN-142).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyBreakoutBoxes.sql.test.js (skipped without it)
 *
 * The seed is the 20 Oct snapshot of the four boxes the migration touches:
 * the text the migration matches on, the rows it must leave alone, and
 * reading_progress rows on everything it removes.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261021010000_history_breakout_boxes.sql",
  "utf8"
);

const text = (s) =>
  `jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'text', 'content', ${s})))`;

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  title text not null, media_type text not null, interaction_type text not null, component_name text not null,
  image_file_url text, config jsonb not null default '{}', scientific_domain text, load_priority text,
  updated_at timestamptz default now());
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), title text not null, slug text not null, order_index int not null,
  parent_section_id uuid references public.sections(id), anchor_paragraph_id uuid, updated_at timestamptz default now(),
  unique (module_id, slug), unique (module_id, order_index));
create table public.paragraphs (id uuid primary key default gen_random_uuid(),
  section_id uuid references public.sections(id) on delete cascade, order_index int not null,
  has_animation boolean default false, animation_id uuid references public.animations(id), animation_trigger text,
  content jsonb default '{}', content_text text, updated_at timestamptz default now(),
  unique (section_id, order_index));
create table public.reading_progress (id serial primary key, last_section_id uuid references public.sections(id),
  last_paragraph_id uuid references public.paragraphs(id));

insert into modules(slug) values ('foundations-of-neuroscience');
insert into sections(module_id, title, slug, order_index)
  select id, 'Where is my mind?', 'where-is-my-mind', 1 from modules;
insert into sections(module_id, title, slug, order_index)
  select id, 'Separating mind from body: Descartes and dualism', 'box-descartes', 6 from modules;
insert into sections(module_id, title, slug, order_index)
  select id, 'Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor', 'box-rete-mirabile', 7 from modules;
insert into sections(module_id, title, slug, order_index)
  select id, 'The developing brain: The discovery of nerve growth factor and chemoaffinity', 'box-ngf', 11 from modules;
insert into sections(module_id, title, slug, order_index, parent_section_id)
  select m.id, 'Hippocrates: On the Sacred Disease ~400 BCE', 'box-sacred-disease', 12, s.id
    from modules m, sections s where s.slug = 'where-is-my-mind';
insert into sections(module_id, title, slug, order_index, parent_section_id)
  select m.id, 'Humoral theory', 'box-humoral-theory', 13, s.id
    from modules m, sections s where s.slug = 'where-is-my-mind';

insert into animations(animation_key, title, media_type, interaction_type, component_name)
  values ('animationFoundationsFigK', 'The four humors', 'image', 'static_image', 'IllustrationPlaceholder'),
         ('animationFoundationsFigC', 'The rete mirabile', 'image', 'static_image', 'IllustrationPlaceholder'),
         ('animationFoundationsFigD', 'Hippocampus minor', 'image', 'static_image', 'IllustrationPlaceholder'),
         ('animationFoundationsNgfLeviMontalcini', 'Video', 'youtube', 'video', 'IllustrationPlaceholder');

-- Sacred Disease: the quote, then the stale bust legend.
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 1, ${text("'“It is thus with regard to the disease called Sacred [epilepsy]: it appears to me to be nowise more divine… But the brain is the cause of this affection, as it is of other very great diseases.”'")},
    '“It is thus with regard to the disease called Sacred [epilepsy]: it appears to me to be nowise more divine… But the brain is the cause of this affection, as it is of other very great diseases.”'
  from sections where slug = 'box-sacred-disease';
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 3, ${text("'<em><strong>Figure</strong> <strong>K</strong></em>. Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.'")},
    'Figure K. Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.'
  from sections where slug = 'box-sacred-disease';
-- Humoral theory: one paragraph with Figure K and a citation.
insert into paragraphs(section_id, order_index, animation_id, has_animation, content, content_text)
  select s.id, 1, a.id, true,
    jsonb_build_object('blocks', jsonb_build_array(
      jsonb_build_object('type', 'text', 'content', 'In ancient Greece, the Pythogoreans were mathematicians…'),
      jsonb_build_object('type', 'citation_ref', 'number', 121)),
      'animationFlags', jsonb_build_object('hold', 1)),
    'In ancient Greece, the Pythogoreans were mathematicians…'
  from sections s, animations a where s.slug = 'box-humoral-theory' and a.animation_key = 'animationFoundationsFigK';
-- Rete mirabile: two paragraphs, Figures C and D.
insert into paragraphs(section_id, order_index, animation_id, has_animation, content, content_text)
  select s.id, 1, a.id, true, ${text("'How does our brain generate the mind? In his book…'")}, 'How does our brain generate the mind? In his book…'
  from sections s, animations a where s.slug = 'box-rete-mirabile' and a.animation_key = 'animationFoundationsFigC';
insert into paragraphs(section_id, order_index, animation_id, has_animation, content, content_text)
  select s.id, 2, a.id, true, ${text("'In contrast to the example above where an anatomical structure…'")}, 'In contrast to the example above where an anatomical structure…'
  from sections s, animations a where s.slug = 'box-rete-mirabile' and a.animation_key = 'animationFoundationsFigD';
-- Descartes: the lead-in, the four lines, the paragraph after.
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 2, ${text("'…including the following poem (translated from Latin):'")}, '…including the following poem (translated from Latin):'
  from sections where slug = 'box-descartes';
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 3, ${text("'“This small skull once belonged to the great Cartesius,'")}, '“This small skull once belonged to the great Cartesius,'
  from sections where slug = 'box-descartes';
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 4, ${text("'The rest of his remains are hidden far away in the land of France;'")}, 'The rest of his remains are hidden far away in the land of France;'
  from sections where slug = 'box-descartes';
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 5, ${text("'But all around the circle of the globe his genius is praised,'")}, 'But all around the circle of the globe his genius is praised,'
  from sections where slug = 'box-descartes';
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 6, jsonb_build_object('blocks', jsonb_build_array(
      jsonb_build_object('type', 'text', 'content', 'And his spirit still rejoices in the sphere of heaven.”'),
      jsonb_build_object('type', 'citation_ref', 'number', 91))),
    'And his spirit still rejoices in the sphere of heaven.”'
  from sections where slug = 'box-descartes';
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 8, ${text("'Berzilius gave the skull to the French Académie de Sciences.'")}, 'Berzilius gave the skull to the French Académie de Sciences.'
  from sections where slug = 'box-descartes';
-- NGF: Cajal, Levi-Montalcini (video), Sperry.
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 1, ${text("'Upon discovering axonal growth cones…'")}, 'Upon discovering axonal growth cones…'
  from sections where slug = 'box-ngf';
insert into paragraphs(section_id, order_index, animation_id, has_animation, content, content_text)
  select s.id, 2, a.id, true, ${text("'In the 1950s, working at Washington University…'")}, 'In the 1950s, working at Washington University…'
  from sections s, animations a where s.slug = 'box-ngf' and a.animation_key = 'animationFoundationsNgfLeviMontalcini';
insert into paragraphs(section_id, order_index, content, content_text)
  select id, 3, ${text("'However, if NGF was the only factor at play…'")}, 'However, if NGF was the only factor at play…'
  from sections where slug = 'box-ngf';

-- Readers parked on rows that go: the bust legend, a poem line, box H.
insert into reading_progress(last_paragraph_id)
  select p.id from paragraphs p join sections s on s.id = p.section_id
   where s.slug = 'box-sacred-disease' and p.order_index = 3;
insert into reading_progress(last_paragraph_id)
  select p.id from paragraphs p join sections s on s.id = p.section_id
   where s.slug = 'box-descartes' and p.order_index = 5;
insert into reading_progress(last_section_id)
  select id from sections where slug = 'box-humoral-theory';
`;

describe.skipIf(!harness || !existsSync(harness))(
  "History breakout boxes (SQL)",
  () => {
    it("merges G and H into one box of two cards, cards box B, folds the poem, adds the portraits, twice", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      await db.exec(sql);

      const sections = await db.query(
        "select slug, title from sections order by order_index"
      );
      expect(sections.rows.map((r) => r.slug)).toEqual([
        "where-is-my-mind",
        "box-descartes",
        "box-rete-mirabile",
        "box-ngf",
        "box-sacred-disease",
      ]);
      expect(sections.rows[4].title).toBe(
        "Hippocrates: the sacred disease and the four humours"
      );

      // The Hippocrates box: the quote (now a blockquote) behind the bust,
      // the humours paragraph (figure, citation and hold intact) behind
      // the woodcut; the bust legend row is gone.
      const sacred = await db.query(`
        select p.order_index i, p.content->'blocks'->0->>'type' t,
               p.content->'explore'->>'title' title,
               p.content->'explore'->'image'->>'src' img,
               p.content->'explore'->>'legend' legend,
               p.content->'animationFlags'->>'hold' hold,
               p.content->'blocks'->1->>'number' ref,
               a.animation_key k
          from paragraphs p join sections s on s.id = p.section_id
          left join animations a on a.id = p.animation_id
         where s.slug = 'box-sacred-disease' order by p.order_index`);
      expect(sacred.rows).toEqual([
        {
          i: 1,
          t: "blockquote",
          title: "Hippocrates’ view on epilepsy",
          img: "/publicAssets/images/foundations/narrative/hippocrates-bust.jpg",
          legend:
            "Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.",
          hold: null,
          ref: null,
          k: null,
        },
        {
          i: 11,
          t: "text",
          title: "Humoral theory",
          img: "/publicAssets/images/foundations/thurneysser-four-humours-1574.jpg",
          legend:
            "The four humours and their corresponding elements and zodiacal signs. Woodcut in Quinta Essentia by Leonhart Thurneysser (1574). Credit: Wikimedia Commons.",
          hold: "1",
          ref: "121",
          k: "animationFoundationsFigK",
        },
      ]);
      const quote = await db.query(`
        select p.content->'blocks'->0->>'content' c from paragraphs p
          join sections s on s.id = p.section_id
         where s.slug = 'box-sacred-disease' and p.order_index = 1`);
      expect(quote.rows[0].c).toMatch(/^“It is thus with regard/);

      // Box B: two cards, figures untouched.
      const rete = await db.query(`
        select p.order_index i, p.content->'explore'->>'title' title,
               p.content->'explore'->>'prompt' prompt, a.animation_key k
          from paragraphs p join sections s on s.id = p.section_id
          left join animations a on a.id = p.animation_id
         where s.slug = 'box-rete-mirabile' order by p.order_index`);
      expect(rete.rows).toEqual([
        {
          i: 1,
          title: "The rete mirabile",
          prompt: "Explore more about the rete mirabile",
          k: "animationFoundationsFigC",
        },
        {
          i: 2,
          title: "The hippocampus minor",
          prompt: "Explore more about the hippocampus minor",
          k: "animationFoundationsFigD",
        },
      ]);

      // The poem: one blockquote of four lines, its citation after it.
      const poem = await db.query(`
        select p.order_index i, p.content->'blocks' b, p.content_text t
          from paragraphs p join sections s on s.id = p.section_id
         where s.slug = 'box-descartes' order by p.order_index`);
      expect(poem.rows.map((r) => r.i)).toEqual([2, 3, 8]);
      expect(poem.rows[1].b).toEqual([
        {
          type: "blockquote",
          content:
            "“This small skull once belonged to the great Cartesius,<br>The rest of his remains are hidden far away in the land of France;<br>But all around the circle of the globe his genius is praised,<br>And his spirit still rejoices in the sphere of heaven.”",
        },
        { type: "citation_ref", number: 91 },
      ]);
      expect(poem.rows[1].t.split("\n")).toHaveLength(4);

      // The portraits, on the Sperry paragraph only.
      const ngf = await db.query(`
        select p.order_index i, a.animation_key k, a.config->'images'->1->>'src' img2
          from paragraphs p join sections s on s.id = p.section_id
          left join animations a on a.id = p.animation_id
         where s.slug = 'box-ngf' order by p.order_index`);
      expect(ngf.rows).toEqual([
        { i: 1, k: null, img2: null },
        { i: 2, k: "animationFoundationsNgfLeviMontalcini", img2: null },
        {
          i: 3,
          k: "animationFoundationsNgfPortraits",
          img2: "/publicAssets/images/foundations/portrait-sperry.jpg",
        },
      ]);

      // Nobody is left pointing at a removed row.
      const progress = await db.query(`
        select coalesce(s.slug, ps.slug) slug, p.order_index i
          from reading_progress r
          left join paragraphs p on p.id = r.last_paragraph_id
          left join sections ps on ps.id = p.section_id
          left join sections s on s.id = r.last_section_id
         order by r.id`);
      expect(progress.rows).toEqual([
        { slug: "box-sacred-disease", i: 1 },
        { slug: "box-descartes", i: 3 },
        { slug: "box-sacred-disease", i: null },
      ]);
    });
  }
);
