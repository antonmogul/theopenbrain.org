// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261124079400_sections_box_card.sql",
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
const fixture = JSON.parse(
  readFileSync("src/stories/historyFullReaderData.json", "utf8")
);
describe.skipIf(!harness || !existsSync(harness))("box title card SQL", () => {
  it("seeds seven boxes, preserves edits on replay, and retains published/creator RLS", async () => {
    const { PGlite } = require(harness);
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated;
        create table modules(id serial primary key,slug text,status text);
        create table sections(id serial primary key,module_id int references modules(id),slug text);
        alter table modules enable row level security; alter table sections enable row level security;
        grant select on modules,sections to anon;
        grant select,update on modules,sections to authenticated;
        create function public.is_creator() returns boolean language sql stable as $$ select current_setting('test.creator',true)='yes' $$;
        ${policies}
        insert into modules(slug,status) values ('foundations-of-neuroscience','published'),('draft','draft');
        insert into sections(module_id,slug) values (2,'box-sacred-disease');`);
      for (const section of fixture.sections.filter((s) =>
        s.slug.startsWith("box-")
      ))
        await db.query("insert into sections(module_id,slug) values(1,$1)", [
          section.slug,
        ]);
      await db.exec(sql);
      await db.exec(sql);
      const seeded = (
        await db.query("select slug,box_card from sections where module_id=1")
      ).rows;
      expect(seeded).toHaveLength(7);
      expect(seeded.every((s) => s.box_card.image.src)).toBe(true);
      expect(
        seeded.find((s) => s.slug === "box-sacred-disease").box_card.layers
      ).toHaveLength(4);
      expect(seeded.find((s) => s.slug === "box-ngf").box_card.enabled).toBe(
        false
      );
      await db.exec(
        `update sections set box_card='{"quote":"Author edit"}' where module_id=1 and slug='box-sacred-disease';`
      );
      await db.exec(sql);
      expect(
        (
          await db.query(
            "select box_card from sections where module_id=1 and slug='box-sacred-disease'"
          )
        ).rows[0].box_card
      ).toEqual({ quote: "Author edit" });
      await db.exec("set role anon");
      expect((await db.query("select * from sections")).rows).toHaveLength(7);
      await expect(
        db.exec("update sections set box_card='{}'")
      ).rejects.toThrow(/permission denied/i);
      await db.exec("reset role; set role authenticated");
      expect(
        (await db.query("update sections set box_card='{}' returning id")).rows
      ).toHaveLength(0);
      await db.exec("set test.creator='yes'");
      expect((await db.query("select * from sections")).rows).toHaveLength(8);
      expect(
        (await db.query("update sections set box_card='{}' returning id")).rows
      ).toHaveLength(8);
      await expect(
        db.exec("update sections set box_card='[]'")
      ).rejects.toThrow(/sections_box_card_object/);
    } finally {
      await db.close();
    }
  });
});
