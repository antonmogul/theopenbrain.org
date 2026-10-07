import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../data/history/referenceLinks.json";
import sourceRepairs from "../data/history/sourceContentRepairs.json";
import { historyReferenceLinksSql } from "../helper/historyReferenceLinks.mjs";

const sql = readFileSync(
  "supabase/migrations/20261005010000_history_retina_reference_links.sql",
  "utf8"
);
const permittedEvidenceHosts = new Set([
  "global.oup.com",
  "classics.mit.edu",
  "wellcomecollection.org",
  "psychclassics.yorku.ca",
  "psycnet.apa.org",
  "royalsocietypublishing.org",
  "www.nobelprize.org",
  "direct.mit.edu",
  "mitpress.mit.edu",
  "onlinelibrary.wiley.com",
  "www.webvision.pitt.edu",
  "www.ncbi.nlm.nih.gov",
  "portal.research.lu.se",
  "digital.zbmed.de",
  "pmc.ncbi.nlm.nih.gov",
  "shop.elsevier.com",
  "catalog.nlm.nih.gov",
  "archive.org",
  "karger.com",
  "pubmed.ncbi.nlm.nih.gov",
]);

describe("verified History and Retina reference link manifest", () => {
  it("covers all 25 baseline gaps exactly once, distinguishing 23 recoveries from two unresolved works", () => {
    expect(manifest.entries).toHaveLength(25);
    expect(
      new Set(manifest.entries.map((e) => `${e.chapterSlug}/${e.number}`)).size
    ).toBe(25);
    expect(
      manifest.entries.filter(
        (e) => e.chapterSlug === "foundations-of-neuroscience"
      )
    ).toHaveLength(17);
    expect(
      manifest.entries.filter((e) => e.status === "verified")
    ).toHaveLength(23);
    expect(
      manifest.entries
        .filter((e) => e.status === "unresolved")
        .map((e) => [e.chapterSlug, e.number])
    ).toEqual([
      ["foundations-of-neuroscience", 98],
      ["the-retina", 2],
    ]);
  });

  it("keeps source evidence, access dates and qualified matching notes for every decision", () => {
    for (const entry of manifest.entries) {
      expect(entry.accessedOn).toBe("2026-10-05");
      expect(entry.confidence.length).toBeGreaterThan(3);
      expect(entry.matchNotes.length).toBeGreaterThan(50);
      expect(entry.before.raw_text.length).toBeGreaterThan(20);
      expect(entry.before.doi).toBeNull();
      expect(entry.before.url).toBeNull();
      expect(entry.evidenceUrls.length).toBeGreaterThan(0);
      for (const evidence of entry.evidenceUrls) {
        const url = new URL(evidence);
        expect(url.protocol).toBe("https:");
        expect(permittedEvidenceHosts.has(url.hostname)).toBe(true);
        expect(url.username + url.password + url.search).toBe("");
      }
      if (entry.status === "unresolved") {
        expect(entry.doi).toBeNull();
        expect(entry.url).toBeNull();
      } else {
        expect(new URL(entry.url).protocol).toBe("https:");
        if (entry.doi) {
          expect(entry.doi).toMatch(/^10\.\d{4,9}\/\S+$/);
          expect(entry.url).toBe(`https://doi.org/${entry.doi}`);
        } else expect(entry.evidenceUrls).toContain(entry.url);
      }
    }
  });

  it("does not correct disputed source dates or replace ambiguous editions", () => {
    for (const number of [43, 70, 74]) {
      const entry = manifest.entries.find(
        (e) =>
          e.chapterSlug === "foundations-of-neuroscience" && e.number === number
      );
      expect(entry.before.year).toBe(1997);
      expect(entry.before.raw_text).toContain("(1997)");
      expect(entry.matchNotes).toMatch(/preserv|unchanged/i);
    }
    const retinaGap = manifest.entries.find(
      (e) => e.chapterSlug === "the-retina" && e.number === 34
    );
    expect(retinaGap.before.year).toBe(1995);
    expect(retinaGap.matchNotes).toContain("2019");
    const gross = manifest.entries.find(
      (e) => e.chapterSlug === "the-retina" && e.number === 2
    );
    expect(gross.before.year).toBe(2011);
    expect(gross.status).toBe("unresolved");
  });

  it("guards repaired Katz text and keeps the Cajal importer correction separate", () => {
    const katz = manifest.entries.find(
      (e) => e.chapterSlug === "foundations-of-neuroscience" && e.number === 79
    );
    expect(katz.before).toEqual(sourceRepairs.referenceUpdates[0].after);
    expect(manifest.metadataRepairs).toHaveLength(1);
    const repair = manifest.metadataRepairs[0];
    expect(repair.chapterSlug).toBe("foundations-of-neuroscience");
    expect(repair.number).toBe(59);
    expect(repair.before.title).toBe("y");
    expect(repair.after).toEqual({
      authors: "Cajal, S. R. y",
      title: "Recollections of My Life",
    });
    expect(repair.before.raw_text).toContain("Cajal, S. R. y.");
    expect(repair.before.raw_text).toContain(
      "<em>Recollections of My Life</em>"
    );
  });

  it("generates only guarded reference updates and is reproducible", () => {
    expect(sql).toBe(historyReferenceLinksSql(manifest));
    expect(sql).toContain("r.doi is null and r.url is null");
    expect(sql).toContain("and to_jsonb(r) @> (item->'before')");
    expect(sql).toContain("and m.slug = item->>'chapterSlug'");
    expect(
      sql.match(/where candidate.slug = item->>'chapterSlug'\) = 1/g)
    ).toHaveLength(2);
    expect(sql).toContain("r.number = (item->>'number')::integer");
    expect(sql).not.toMatch(
      /\b(?:insert into|delete from|alter table|create table|grant|commit;)\b/i
    );
    expect(sql).not.toMatch(/set\s+(?:raw_text|year|module_id|number)\s*=/i);
    expect(sql).not.toMatch(
      /(?:update|delete from) public\.(?:paragraphs|animations|sections)/i
    );
    for (const reason of ["$reference_payload$", "$reference_links$"]) {
      expect(() =>
        historyReferenceLinksSql({
          ...manifest,
          metadataRepairs: [{ ...manifest.metadataRepairs[0], reason }],
        })
      ).toThrow("Unsafe SQL payload delimiter");
    }
  });
});
