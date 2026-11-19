// @vitest-environment node
/** Runs 20261110000000_history_penfield_binder.sql in PGlite (OPENBRAIN-168),
 * then 20261111180200_history_penfield_binder_v2.sql (OPENBRAIN-178),
 * 20261112190000_history_penfield_binder_v3.sql (OPENBRAIN-191) and
 * 20261117196000_history_penfield_binder_v4.sql (OPENBRAIN-196), each of which
 * replaces the upload's HTML; the last carries the widget file as it is now.
 * HISTORY_SQL_HARNESS=/absolute/path/to/@electric-sql/pglite npm test --
 * --pool=forks src/__tests__/historyPenfieldBinder.sql.test.js (the SQL run is
 * skipped without it; the file check always runs).
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_WIDGET_BYTES, staticChecks } from "@/widgets/uploaded/widgetHost";

const require = createRequire(import.meta.url);
const harness = process.env.HISTORY_SQL_HARNESS;
const sql = readFileSync(
  "supabase/migrations/20261110000000_history_penfield_binder.sql",
  "utf8"
);
const sqlV2 = readFileSync(
  "supabase/migrations/20261111180200_history_penfield_binder_v2.sql",
  "utf8"
);
const sqlV3 = readFileSync(
  "supabase/migrations/20261112190000_history_penfield_binder_v3.sql",
  "utf8"
);
const sqlV4 = readFileSync(
  "supabase/migrations/20261117196000_history_penfield_binder_v4.sql",
  "utf8"
);
const sqlV5 = readFileSync(
  "supabase/migrations/20261118120100_history_penfield_binder_v5.sql",
  "utf8"
);
const sqlV6 = readFileSync(
  "supabase/migrations/20261119480100_history_penfield_binder_v6.sql",
  "utf8"
);
const fileV5 = htmlInVersion5();
function htmlInVersion5() {
  return sqlV5.slice(sqlV5.indexOf("$w$") + 3, sqlV5.lastIndexOf("$w$"));
}
const file = readFileSync(
  "src/widgets/uploads/history-penfield-binder.html",
  "utf8"
);
const htmlIn = (text) =>
  text.slice(text.indexOf("$w$") + "$w$".length, text.lastIndexOf("$w$"));
// Versions 1 to 3, as they were pushed on 10, 11 and 12 Nov: a pushed
// migration is not edited.
const fileV1 = htmlIn(sql);
const fileV2 = htmlIn(sqlV2);
const fileV3 = htmlIn(sqlV3);
const fileV4 = htmlIn(sqlV4);
const json = (html, id) =>
  JSON.parse(
    html.match(
      new RegExp(
        `<script id="${id}" type="application/json">([\\s\\S]*?)</script>`
      )
    )[1]
  );
const onlyTheUpload = (text) => {
  const statements = text
    .split("\n")
    .filter((line) =>
      /^(insert|update|delete|alter|create|drop)\b/i.test(line)
    );
  expect(statements).toEqual([
    "insert into public.widget_uploads (slug, title, description, author, ramp, html, status)",
  ]);
  expect(text).toContain("set html = excluded.html, updated_at = now()");
  expect(text).toContain(
    "where public.widget_uploads.html is distinct from excluded.html"
  );
};

describe("Penfield binder migrations", () => {
  it("the latest carries the widget file as it is in src/widgets/uploads", () => {
    expect(htmlIn(sqlV6)).toBe(file);
  });

  it("states the file's size and hash", () => {
    expect(sqlV6).toContain(
      `-- ${Buffer.byteLength(file, "utf8")} bytes, sha256 ${createHash("sha256").update(file).digest("hex")}`
    );
  });

  it("the earlier ones still carry versions 1, 2 and 3", () => {
    expect(fileV1).toContain("Version:  1 (2026-11-10)");
    expect(fileV2).toContain("Version:  2 (2026-11-11)");
    expect(fileV3).toContain("Version:  3 (2026-11-12)");
    expect(fileV4).toContain("Version:  4 (2026-11-17)");
    expect(fileV5).toContain("Version:  5 (2026-11-18)");
    expect(file).toContain("Version:  6 (2026-11-19)");
  });

  it("version 6 removes only the visible close words and retains accessible labels", () => {
    onlyTheUpload(sqlV6);
    expect(file).not.toMatch(
      /<span aria-hidden="true">Close(?: the binder)?<\/span>/
    );
    expect((file.match(/aria-label="Close the binder"/g) || []).length).toBe(2);
    expect(file).toBe(
      fileV5
        .replace("Version:  5 (2026-11-18)", "Version:  6 (2026-11-19)")
        .replace(
          /^\s*<span aria-hidden="true">Close(?: the binder)?<\/span>\n/gm,
          "\n"
        )
    );
  });

  describe("version 5 (OPENBRAIN-202)", () => {
    it("changes the upload's HTML and nothing else", () => {
      onlyTheUpload(sqlV5);
    });

    it("fixes the scan's '1' and ']' for 'I' in four quotations, and nothing else", () => {
      // Stuart, 18 Nov: A. Bra. point 17, "Yes, 1 have heard it before."
      const fixes = [
        ["Yes, 1 have heard it before.", "Yes, I have heard it before."],
        ["and 1 was talking to a man", "and I was talking to a man"],
        ['"1 hear my brother talking."', '"I hear my brother talking."'],
        ["Again something ] have heard of", "Again something I have heard of"],
      ];
      let before = JSON.stringify(json(fileV4, "cases"));
      const after = JSON.stringify(json(file, "cases"));
      for (const [typo, fixed] of fixes) {
        expect(before).toContain(JSON.stringify(typo).slice(1, -1));
        expect(after).not.toContain(JSON.stringify(typo).slice(1, -1));
        before = before.replace(
          JSON.stringify(typo).slice(1, -1),
          JSON.stringify(fixed).slice(1, -1)
        );
      }
      expect(after).toBe(before);
    });
  });

  describe("version 4 (OPENBRAIN-196)", () => {
    const assets = json(file, "assets");
    // The captions as Stuart sent them on 14 Nov, numbered as his files were.
    const captions = [
      "Telegraph from Charles Sherrington to Wilder Penfield on the occasion of the opening of the Montreal Neurological Institute in 1934.",
      "Rejection letter Penfield once received from The Journal of the American Medical Association.",
      "Letter from Donald Hebb to Wilder Penfield from 1953, recommending that they hire someone to perform “psychological” of Penfield’s patients.",
      "Penfield’s notes, from 1952, following a phone conversation with William Scoville, related to temporal resections.",
      "Draft proposal from Penfield related to a study into dementia praecox (now schizophrenia).",
      "Entry from Penfield’s diary, from 1916, written at the military hospital in Dover a few days after a boat he was on, the Sussex, was torpedoed during the war. In March 1916 he was crossing to France to work in a war hospital during a university break.",
      "Letter from Penfield to Wilburt Davison in March 1916, written from the Dover military hospital, following the torpedoing of a boat Penfield was on, as he was crossing from England to France to work in a war hospital during a university break.",
      "Wilder Penfield and William Cone with colleagues.",
      "Figure indicating the site of various phenomena in the brain.",
      "Early sketch of the Montreal Neurological Institute.",
      "Sketch of the motor homunculus.",
      "Sketch of motor and somatosensory homunculi.",
      "Localization of brain function.",
      "Drawing of a brain resection.",
    ];
    // The widget's own table, read out of its script.
    const archive = new Function(
      `return ${file.match(/const ARCHIVE = (\{[\s\S]*?\n {6}\});/)[1]}`
    )();

    it("changes the upload's HTML and nothing else, and fits the 4 MB limit", () => {
      onlyTheUpload(sqlV4);
      expect(Buffer.byteLength(file, "utf8")).toBeLessThan(MAX_WIDGET_BYTES);
      // Small enough to stay a quick load: the fourteen pictures are WebP.
      expect(Buffer.byteLength(file, "utf8")).toBeLessThan(1_500_000);
      expect(staticChecks(file).filter((check) => !check.ok)).toEqual([]);
    });

    it("leaves the cases, the maps, the cover and the probe as they were", () => {
      expect(json(fileV4, "cases")).toEqual(json(fileV3, "cases"));
      const before = json(fileV3, "assets");
      for (const key of Object.keys(before).filter(
        (k) => k !== "photo" && k !== "letter"
      ))
        expect(assets[key], key).toBe(before[key]);
      expect(file).toContain(
        'const ORDER = ["rw", "abra", "yn", "gp", "sbe", "nc", "ge"];'
      );
    });

    it("has Stuart's fourteen archive pieces, each with its caption and a description", () => {
      expect(Object.keys(archive).map(Number)).toEqual(
        Array.from({ length: 14 }, (_, n) => n + 1)
      );
      captions.forEach((caption, n) => {
        const item = archive[n + 1];
        expect(item.caption, String(n + 1)).toBe(caption);
        expect(item.alt.length, String(n + 1)).toBeGreaterThan(60);
        expect(item.name, String(n + 1)).toMatch(/\S/);
        // The picture is in the file, a WebP, at the size the table says.
        const data = assets[`a${n + 1}`];
        expect(data, String(n + 1)).toMatch(/^data:image\/webp;base64,/);
        const bytes = Buffer.from(data.split(",")[1], "base64");
        expect(bytes.subarray(0, 4).toString("latin1")).toBe("RIFF");
        expect(bytes.subarray(8, 12).toString("latin1")).toBe("WEBP");
        expect(item.w).toBeGreaterThanOrEqual(650);
        expect(item.h).toBeGreaterThanOrEqual(650);
      });
      expect(file).toContain(
        '"Courtesy of the Osler Library of the History of Medicine, McGill University, Canada."'
      );
      // The large view shows the caption, then the credit.
      expect(file).toContain('$("lbtext").textContent = item.caption');
      expect(file).toContain('$("lbcredit").textContent = CREDIT');
    });

    it("gives each tab one document and one picture, in the order they were sent", () => {
      // Top tab (case 3): document 1 and picture 8 … last (case 32): 7 and 14.
      expect(file).toContain(
        "const archiveOf = (i) => ({ doc: i + 1, pic: i + 8 });"
      );
      expect(file.match(/kind: "(doc|pic)"/g)).toEqual([
        'kind: "doc"',
        'kind: "pic"',
      ]);
      // No case hides them any more (the tall maps did), and phones have them.
      expect(file).not.toContain(".page--left[data-tall] .eph");
      expect(file).not.toMatch(/\.binder\[data-layout="stack"\] \.eph,\n/);
    });

    it("drops the stand-in photograph and letter, and the notes that asked about them", () => {
      expect(assets).not.toHaveProperty("photo");
      expect(assets).not.toHaveProperty("letter");
      for (const gone of [
        "Van Nuys",
        "design placeholder",
        "The photograph needs a caption",
        "not one of Penfield’s papers",
      ])
        expect(file, gone).not.toContain(gone);
      expect(fileV3).toContain("design placeholder");
    });

    it("can be closed, and its large view can always be closed", () => {
      // A Close control on the report page and one for phones, both wired.
      expect(file).toContain('id="shut" aria-label="Close the binder"');
      expect(file).toContain('id="shutStack" aria-label="Close the binder"');
      expect(file).toContain('$("shut").addEventListener("click", shut);');
      expect(file).toContain('$("shutStack").addEventListener("click", shut);');
      // The pages turn back unless motion is reduced.
      expect(file).toMatch(
        /const moving = binder\.dataset\.layout === "spread" && !reduced\(\)/
      );
      // The large view keeps to the rows of the frame that are on screen,
      // and Escape closes it.
      expect(file).toContain("new IntersectionObserver(");
      expect(file).toContain('lb.style.setProperty("--lb-top"');
      expect(file).toMatch(
        /if \(ev\.key === "Escape"\) \{\s+ev\.preventDefault\(\);\s+closeLightbox\(\);/
      );
    });
  });

  it("version 3 puts the cases in numerical order and changes nothing else", () => {
    // Top tab to bottom: 3 R.W., 4 A.Bra., 12 Y.N., 24 G.P., 29 S.Be., 31 N.C., 32 G.E.
    expect(fileV3).toContain(
      'const ORDER = ["rw", "abra", "yn", "gp", "sbe", "nc", "ge"];'
    );
    expect(fileV2).toContain(
      'const ORDER = ["ge", "sbe", "gp", "yn", "nc", "abra", "rw"];'
    );
    const ids = [
      ...fileV3.matchAll(/\{"id":"([a-z]+)","tab":"[^"]*","caseNo":(\d+)/g),
    ];
    const caseNo = Object.fromEntries(ids.map(([, id, n]) => [id, Number(n)]));
    const order = JSON.parse(fileV3.match(/const ORDER = (\[[^\]]+\]);/)[1]);
    expect(order.map((id) => caseNo[id])).toEqual([3, 4, 12, 24, 29, 31, 32]);
    // Apart from the order and the header comment the two files are the same.
    const body = (html) =>
      html
        .slice(html.indexOf("-->"))
        .replace(/\/\/ The seven patients[\s\S]*?const ORDER = [^\n]+\n/, "");
    expect(body(fileV3)).toBe(body(fileV2));
    onlyTheUpload(sqlV3);
  });

  it("version 2 changes the upload's HTML and nothing else", () => {
    onlyTheUpload(sqlV2);
  });
});

const schema = `
create table public.modules (id uuid primary key default gen_random_uuid(), slug text unique not null);
create table public.sections (id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id), slug text not null, order_index int not null);
create table public.paragraphs (id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id), content jsonb not null, content_text text,
  order_index int not null, updated_at timestamptz default now(), unique(section_id, order_index));
create table public.widget_uploads (id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, description text, author text, ramp text, html text not null,
  status text not null default 'draft', updated_at timestamptz default now());
`;
const widget = (extra) =>
  JSON.stringify({
    blocks: [
      { type: "text", content: "before" },
      {
        type: "widget",
        kind: "inline",
        title: "Find out what it was like to be Dr. Wilder Penfield",
        blurb: "Explore.",
        credit: "Interactive by The Open Brain",
        ...extra,
      },
    ],
  }).replace(/'/g, "''");

async function makeDb() {
  const { PGlite } = require(harness);
  const db = new PGlite();
  await db.exec(schema);
  await db.exec(`
    insert into modules(slug) values ('foundations-of-neuroscience'), ('the-retina');
    insert into sections(module_id, slug, order_index)
      select id, 'box-penfield', 10 from modules where slug = 'foundations-of-neuroscience';
    insert into sections(module_id, slug, order_index)
      select id, 'do-different-parts', 2 from modules where slug = 'foundations-of-neuroscience';
    insert into sections(module_id, slug, order_index)
      select id, 'elsewhere', 1 from modules where slug = 'the-retina';
    insert into paragraphs(section_id, order_index, content)
      select id, 3, '${widget({ widgetId: "case-cabinet", route: "/case-cabinet", placementId: "foundations-case-cabinet" })}'::jsonb
        from sections where slug = 'box-penfield';
    insert into paragraphs(section_id, order_index, content)
      select id, 9, '${widget({ widgetId: "phrenology", route: "/phrenology", placementId: "foundations-phrenology" })}'::jsonb
        from sections where slug = 'do-different-parts';
    insert into paragraphs(section_id, order_index, content)
      select id, 0, '${widget({ widgetId: "case-cabinet", route: "/case-cabinet" })}'::jsonb
        from sections where slug = 'elsewhere';`);
  return db;
}

describe.skipIf(!harness || !existsSync(harness))(
  "Penfield binder (SQL)",
  () => {
    it("publishes the upload and turns the History cabinet block into the binder, once", async () => {
      const db = await makeDb();
      await db.exec(sql);
      const stamp = async () =>
        (await db.query("select max(updated_at) t from paragraphs")).rows[0].t;
      const first = await stamp();
      await db.exec(sql); // a second push changes nothing
      expect(await stamp()).toEqual(first);

      const { rows: up } = await db.query(
        "select slug, status, ramp, html from widget_uploads"
      );
      expect(up).toHaveLength(1);
      expect(up[0]).toMatchObject({
        slug: "history-penfield-binder",
        status: "published",
        ramp: "fund",
      });
      expect(up[0].html).toBe(fileV1);

      const { rows } = await db.query(
        `select s.slug, p.content->'blocks'->0 first, p.content->'blocks'->1 w
           from paragraphs p join sections s on s.id = p.section_id order by s.slug`
      );
      const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
      // History's Penfield block: the binder, full screen, the rest kept
      expect(by["box-penfield"].first).toEqual({
        type: "text",
        content: "before",
      });
      expect(by["box-penfield"].w).toEqual({
        type: "widget",
        kind: "inline",
        widgetId: "upload:history-penfield-binder",
        fullScreen: true,
        title: "Find out what it was like to be Dr. Wilder Penfield",
        blurb: "Explore.",
        credit: "Interactive by The Open Brain",
        placementId: "foundations-case-cabinet",
      });
      // Phrenology keeps its widget and gains the flag
      expect(by["do-different-parts"].w).toMatchObject({
        widgetId: "phrenology",
        route: "/phrenology",
        fullScreen: true,
      });
      // Another chapter's cabinet block is not touched
      expect(by.elsewhere.w).toMatchObject({
        widgetId: "case-cabinet",
        route: "/case-cabinet",
      });
      expect(by.elsewhere.w).not.toHaveProperty("fullScreen");
    });

    it("version 2 replaces the upload's HTML, once, and leaves the chapter alone", async () => {
      const db = await makeDb();
      await db.exec(sql);
      const paragraphs = async () =>
        (
          await db.query(
            "select id, content, updated_at from paragraphs order by id"
          )
        ).rows;
      const before = await paragraphs();
      await db.exec(sqlV2);
      const row = async () =>
        (
          await db.query(
            "select slug, title, status, ramp, html, updated_at from widget_uploads"
          )
        ).rows;
      const first = await row();
      expect(first).toHaveLength(1);
      expect(first[0]).toMatchObject({
        slug: "history-penfield-binder",
        title: "Penfield's case binder",
        status: "published",
        ramp: "fund",
      });
      expect(first[0].html).toBe(fileV2);
      await db.exec(sqlV2); // a second push changes nothing
      expect(await row()).toEqual(first);
      expect(await paragraphs()).toEqual(before);
      // Versions 3 and 4 on top, each once: the last is the file as it is now.
      for (const [text, html] of [
        [sqlV3, fileV3],
        [sqlV4, fileV4],
        [sqlV5, fileV5],
        [sqlV6, file],
      ]) {
        await db.exec(text);
        const next = await row();
        expect(next).toHaveLength(1);
        expect(next[0].html).toBe(html);
        expect(next[0]).toMatchObject({
          slug: "history-penfield-binder",
          title: "Penfield's case binder",
          status: "published",
          ramp: "fund",
        });
        await db.exec(text); // a second push changes nothing
        expect(await row()).toEqual(next);
        expect(await paragraphs()).toEqual(before);
      }
    });

    it("version 6 alone, on a database without the upload, publishes it", async () => {
      const db = await makeDb();
      await db.exec(sqlV6);
      const { rows } = await db.query(
        "select slug, status, ramp, html from widget_uploads"
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: "published", ramp: "fund" });
      expect(rows[0].html).toBe(file);
    });

    it("version 2 alone, on a database without the upload, publishes it", async () => {
      const db = await makeDb();
      await db.exec(sqlV2);
      const { rows } = await db.query(
        "select slug, status, html from widget_uploads"
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("published");
      expect(rows[0].html).toBe(fileV2);
    });
  }
);
