// @vitest-environment node
/** Runs 20261021020000_history_figures_round3.sql in PGlite (OPENBRAIN-143).
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyFiguresRound3.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261021020000_history_figures_round3.sql",
  "utf8"
);
const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.animations (id uuid primary key default gen_random_uuid(), animation_key text unique not null,
  image_file_url text, config jsonb not null default '{}', updated_at timestamptz default now());
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(), section_id uuid references public.sections(id),
  order_index int not null, animation_id uuid references public.animations(id), content jsonb default '{}',
  updated_at timestamptz default now());
insert into modules(slug) values ('foundations-of-neuroscience');
insert into sections(module_id, slug, order_index) select id, s, i from modules,
  (values ('do-different-parts', 2), ('basic-functional-unit', 3)) as v(s, i);
insert into animations(animation_key, image_file_url, config) values
  ('animationFoundationsFig5', '/publicAssets/images/foundations/fig05-01.jpg',
   '{"images": [{"alt": "old", "src": "/publicAssets/images/foundations/fig05-01.jpg"}], "caption": "Galen dissecting a pig. From Opera omnia latine in septem classes digesta, published in 1565. Source: Wellcome Collection.", "figureNumber": 5, "placeholder": true}'),
  ('animationFoundationsFig10', '/publicAssets/images/foundations/fig10-01.jpg',
   '{"images": [{"src": "/publicAssets/images/foundations/fig10-01.jpg"}], "figureNumber": 10}'),
  ('animationFoundationsFig11', '/publicAssets/images/foundations/fig11-01.jpg',
   '{"images": [{"alt": "old", "src": "/publicAssets/images/foundations/fig11-01.jpg"}], "caption": "Anatomical drawings of Goltz’s dog (left, Figs. 14 and 15) and Ferrier’s monkey that were presented at the Seventh International Medical Congress in 1881. Image source: Gowers WR, Klein E, Schaefer AE, Langley JN. Preliminary report. Transactions of the International Medical Congress 1881. Volume 1.", "diagramType": "photo", "figureNumber": 11}'),
  ('animationFoundationsFig17', '/publicAssets/images/foundations/fig17-01.jpg',
   '{"images": [{"src": "/publicAssets/images/foundations/fig17-01.jpg"}], "figureNumber": 17}');
insert into paragraphs(section_id, order_index, animation_id, content)
  select s.id, 15, a.id, '{"blocks": [], "animationFlags": {"transition": false}}'
    from sections s, animations a where s.slug = 'do-different-parts' and a.animation_key = 'animationFoundationsFig10';
insert into paragraphs(section_id, order_index, animation_id, content)
  select s.id, 16, a.id, '{"blocks": []}'
    from sections s, animations a where s.slug = 'do-different-parts' and a.animation_key = 'animationFoundationsFig11';
insert into paragraphs(section_id, order_index, animation_id, content)
  select s.id, 12, a.id, '{"blocks": []}'
    from sections s, animations a where s.slug = 'basic-functional-unit' and a.animation_key = 'animationFoundationsFig17';
`;

describe.skipIf(!harness || !existsSync(harness))(
  "History figures round 3 (SQL)",
  () => {
    it("crops Fig 5, relabels Fig 11, and gives Fig 10 and Fig 17 reading room, twice over", async () => {
      const { PGlite } = require(harness);
      const db = new PGlite();
      await db.exec(schema);
      await db.exec(sql);
      await db.exec(sql);

      const figures = await db.query(
        "select animation_key k, image_file_url u, config->'images'->0->>'src' s, config->>'caption' c, config->>'figureNumber' n from animations order by 1"
      );
      const by = Object.fromEntries(figures.rows.map((r) => [r.k, r]));
      expect(by.animationFoundationsFig5).toMatchObject({
        u: "/publicAssets/images/foundations/fig05-01-pig.jpg",
        s: "/publicAssets/images/foundations/fig05-01-pig.jpg",
        c: "Galen dissecting a pig. From Opera omnia latine in septem classes digesta, published in 1565. Source: Wellcome Collection.",
        n: "5",
      });
      expect(by.animationFoundationsFig11).toMatchObject({
        u: "/publicAssets/images/foundations/fig11-01-abc.jpg",
        s: "/publicAssets/images/foundations/fig11-01-abc.jpg",
        n: "11",
      });
      expect(by.animationFoundationsFig11.c).toMatch(/\(left, A and B\)/);
      expect(by.animationFoundationsFig11.c).toMatch(/\(right, C\)/);
      expect(by.animationFoundationsFig11.c).toMatch(
        /Modified from Gowers WR, Klein E, Schaefer AE, Langley JN\./
      );
      expect(by.animationFoundationsFig11.c).not.toMatch(/Figs?\. 1[457]/);
      // Untouched rows keep their files.
      expect(by.animationFoundationsFig10.s).toBe(
        "/publicAssets/images/foundations/fig10-01.jpg"
      );
      expect(by.animationFoundationsFig17.s).toBe(
        "/publicAssets/images/foundations/fig17-01.jpg"
      );

      const flags = await db.query(
        "select s.slug, p.order_index i, p.content->'animationFlags' f from paragraphs p join sections s on s.id = p.section_id order by 1, 2"
      );
      expect(flags.rows).toEqual([
        { slug: "basic-functional-unit", i: 12, f: { room: 1 } },
        {
          slug: "do-different-parts",
          i: 15,
          f: { room: 1, transition: false },
        },
        { slug: "do-different-parts", i: 16, f: null },
      ]);
    });
  }
);
