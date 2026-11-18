// @vitest-environment node
/** Runs the OPENBRAIN-202 migration in PGlite: five figure titles, the
 * Descartes box's two photographs as Figures D and E, and no self-credits
 * on History's and the Retina's widgets.
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyStuart18Nov.sql.test.js (skipped without it)
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const migration = readFileSync(
  "supabase/migrations/20261118120000_history_stuart_18nov.sql",
  "utf8"
);

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique);
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade, slug text);
create table public.animations (id uuid primary key default gen_random_uuid(),
  animation_key text unique, title text, config jsonb, updated_at timestamptz);
create table public.paragraphs (id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade, order_index int,
  content jsonb, updated_at timestamptz);

insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina'), ('attention-and-working-memory');
insert into sections(module_id, slug) select id, 's-' || slug from modules;

insert into animations(animation_key, title, config) values
  ('animationFoundationsIntroWoodcut', 'Woodcut from Lorenz Fries, Spiegel der Artzny, 1519', '{"figureNumber":1}'),
  ('animationFoundationsPlatoAristotle', 'Plato and Aristotle', '{"figureNumber":6}'),
  ('animationFoundationsFig13', 'Deiters'' nerve cell (axon & dendrites)', '{"figureNumber":17}'),
  ('animationFoundationsFig18', 'The synapse under electron microscopy', '{"figureNumber":22}'),
  ('animationFoundationsFig21', 'Eccles'' stretch-reflex circuit', '{"figureNumber":25}'),
  ('animationFoundationsFig17', 'Golgi''s lab at the University of Pavia', '{"figureNumber":21}'),
  ('animationFoundationsFigA', 'Descartes'' skull, Musée de l''homme',
   '{"figureNumber":"D","images":[{"src":"/a.jpg","alt":"skull"},{"src":"/b.jpg","alt":"piece","caption":"Lund"}]}'),
  ('animationFoundationsLoewiWidget', 'Loewi''s Vagusstoff, 1921',
   '{"widgetId":"upload:loewi-vagusstoff","credit":"Stuart Trenholm, after Loewi (1921), Figure 1"}'),
  ('widget-upload:retina-photoreceptors', 'Photoreceptors',
   '{"widgetId":"upload:retina-photoreceptors","credit":"Stuart Trenholm"}'),
  ('widget-upload:retina-center-surround', 'Center surround',
   '{"widgetId":"upload:retina-center-surround","credit":"Someone else"}');

insert into paragraphs(section_id, order_index, content)
  select s.id, 1, '{"blocks":[{"type":"text","content":"Before"},{"type":"widget","widgetId":"phrenology","credit":"Interactive by The Open Brain","placementId":"foundations-phrenology"},{"type":"text","content":"After"}]}'
    from sections s where s.slug = 's-foundations-of-neuroscience';
insert into paragraphs(section_id, order_index, content)
  select s.id, 2, '{"blocks":[{"type":"widget","widgetId":"upload:retina-visual-cycle","credit":"Stuart Trenholm"}]}'
    from sections s where s.slug = 's-the-retina';
insert into paragraphs(section_id, order_index, content)
  select s.id, 3, '{"blocks":[{"type":"widget","widgetId":"biased-competition","credit":"Stuart Trenholm"}]}'
    from sections s where s.slug = 's-attention-and-working-memory';
insert into paragraphs(section_id, order_index, content)
  select s.id, 4, '{"blocks":[{"type":"text","content":"Trenholm, S. (2014)","credit":"Stuart Trenholm"}]}'
    from sections s where s.slug = 's-the-retina';
`;

async function fresh() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  return db;
}

const titles = (db) =>
  db
    .query("select animation_key k, title t from animations order by 1")
    .then((r) => Object.fromEntries(r.rows.map((row) => [row.k, row.t])));
const configs = (db) =>
  db
    .query("select animation_key k, config c from animations order by 1")
    .then((r) => Object.fromEntries(r.rows.map((row) => [row.k, row.c])));
const blocks = (db) =>
  db
    .query("select order_index o, content c from paragraphs order by 1")
    .then((r) => r.rows.map((row) => row.c.blocks));

describe.skipIf(!harness || !existsSync(harness))(
  "Stuart 18 Nov migration (SQL)",
  () => {
    it("retitles the five figures and leaves the others", async () => {
      const db = await fresh();
      await db.exec(migration);
      const t = await titles(db);
      expect(t.animationFoundationsIntroWoodcut).toBe(
        "Renaissance era drawing of human anatomy"
      );
      expect(t.animationFoundationsPlatoAristotle).toBe(
        "Plato, Aristotle, and the debate of head vs. heart"
      );
      expect(t.animationFoundationsFig13).toBe("Deiters' nerve cells");
      expect(t.animationFoundationsFig18).toBe(
        "The first picture of a chemical synapse"
      );
      expect(t.animationFoundationsFig21).toBe(
        "Neuronal excitability and synaptic transmission"
      );
      expect(t.animationFoundationsFig17).toBe(
        "Golgi's lab at the University of Pavia"
      );
    });

    it("names Descartes' two photographs Figure D and Figure E", async () => {
      const db = await fresh();
      await db.exec(migration);
      const { animationFoundationsFigA: c } = await configs(db);
      expect(c.figureNumber).toBe("D");
      expect(c.images).toEqual([
        {
          src: "/a.jpg",
          alt: "skull",
          figureNumber: "D",
          title: "Descartes' skull, Musée de l'homme",
        },
        {
          src: "/b.jpg",
          alt: "piece",
          caption: "Lund",
          figureNumber: "E",
          title: "Piece of Descartes' skull, Lund",
        },
      ]);
    });

    it("drops the self-credits on History and the Retina only", async () => {
      const db = await fresh();
      await db.exec(migration);
      const [history, retina, attention, text] = await blocks(db);
      expect(history).toEqual([
        { type: "text", content: "Before" },
        {
          type: "widget",
          widgetId: "phrenology",
          placementId: "foundations-phrenology",
        },
        { type: "text", content: "After" },
      ]);
      expect(retina).toEqual([
        { type: "widget", widgetId: "upload:retina-visual-cycle" },
      ]);
      // Not in this chapter set, and not a widget: untouched.
      expect(attention[0].credit).toBe("Stuart Trenholm");
      expect(text[0].credit).toBe("Stuart Trenholm");

      const c = await configs(db);
      expect(c["widget-upload:retina-photoreceptors"]).toEqual({
        widgetId: "upload:retina-photoreceptors",
      });
      expect(c["widget-upload:retina-center-surround"].credit).toBe(
        "Someone else"
      );
      expect(c.animationFoundationsLoewiWidget.credit).toBe(
        "After Loewi (1921), Figure 1"
      );
    });

    it("changes nothing on a second run or after a creator's edit", async () => {
      const db = await fresh();
      await db.exec(migration);
      const once = [await titles(db), await configs(db), await blocks(db)];
      await db.exec(migration);
      expect([await titles(db), await configs(db), await blocks(db)]).toEqual(
        once
      );

      const edited = await fresh();
      await edited.exec(
        "update animations set title = 'A creator''s title' where animation_key = 'animationFoundationsFig13'"
      );
      await edited.exec(migration);
      expect((await titles(edited)).animationFoundationsFig13).toBe(
        "A creator's title"
      );
    });
  }
);
