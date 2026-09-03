#!/usr/bin/env node
/**
 * check-chapter1-text-parity.mjs — READ-ONLY Chapter 1 text parity checker
 * =============================================================================
 * Compares the static source (src/assets/json_backend/text.json) with what the
 * reader would render from the LIVE Supabase module `the-retina`:
 *
 *   text.json section.paragraphs  ──collectTexts──▶  Set A
 *   DB rows ──transformSectionParagraphs (the real useChapter path)──▶ tree
 *                                 ──collectTexts──▶  Set B
 *
 * and prints, per main section, every item of A that is missing from B.
 * Exit code 1 if anything is missing, 0 otherwise.
 *
 * Reads the anon key from .env (never printed). GET requests only.
 *
 * Usage:  npm run parity:chapter1
 *         node scripts/check-chapter1-text-parity.mjs [--json]
 * =============================================================================
 */
import { loadTextJson } from "./import-chapter-1-to-supabase.mjs";
import { fetchChapter1 } from "./lib/supabase-rest.mjs";
import {
  attachAnimationKeys,
  collectTexts,
  missingFrom,
  shortLabel,
} from "./lib/chapter1-parity.mjs";
import { transformSectionParagraphs } from "../src/composables/chapterTransform.mjs";

const SPECIAL_SLUGS = new Set(["introduction", "further-reading", "footnotes"]);

/**
 * Pair text.json main sections with DB main sections by order (text.json
 * section i ↔ DB order_index i+1, as the importer wrote them) and report.
 */
export function computeParity(textData, db) {
  attachAnimationKeys(db.paragraphs, db.animations);
  const dbMain = db.sections
    .filter((s) => !SPECIAL_SLUGS.has(s.slug) && s.order_index !== 0)
    .sort((a, b) => a.order_index - b.order_index);

  const report = [];
  for (let i = 0; i < textData.sections.length; i++) {
    const src = textData.sections[i];
    const dbSec = dbMain[i];
    if (!dbSec) {
      report.push({
        index: i + 1,
        title: src.title,
        dbSection: null,
        want: collectTexts(src.paragraphs).length,
        have: 0,
        missing: [...new Set(collectTexts(src.paragraphs))],
        extra: [],
      });
      continue;
    }
    const rows = db.paragraphs.filter((p) => p.section_id === dbSec.id);
    const tree = transformSectionParagraphs(rows);
    const want = collectTexts(src.paragraphs);
    const have = collectTexts(tree);
    report.push({
      index: i + 1,
      title: src.title,
      dbSection: { id: dbSec.id, title: dbSec.title, rows: rows.length },
      want: new Set(want).size,
      have: new Set(have).size,
      missing: missingFrom(want, have),
      extra: missingFrom(have, want),
    });
  }
  return report;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const textData = loadTextJson();
  const db = await fetchChapter1();
  const report = computeParity(textData, db);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `Chapter 1 text parity — module ${db.module.slug} (${db.module.id}), ${db.sections.length} sections, ${db.paragraphs.length} paragraph rows\n`
    );
    for (const r of report) {
      const status =
        r.missing.length === 0 ? "ok" : `MISSING ${r.missing.length}`;
      console.log(
        `Section ${r.index}: ${r.title} — ${status} (text.json ${r.want} items, DB ${r.have})`
      );
      if (!r.dbSection) console.log("  !! no matching DB section");
      for (const m of r.missing) console.log(`  - ${shortLabel(m)}`);
      if (r.extra.length) {
        console.log(
          `  (info: ${r.extra.length} DB item(s) not in text.json: ${r.extra
            .map((e) => JSON.stringify(shortLabel(e, 40)))
            .join(", ")})`
        );
      }
    }
  }

  const totalMissing = report.reduce((n, r) => n + r.missing.length, 0);
  if (!asJson) {
    console.log(
      `\n${totalMissing === 0 ? "PARITY OK" : "PARITY FAILED"}: ${totalMissing} missing item(s) across ${report.length} sections.`
    );
  }
  process.exit(totalMissing === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("parity check failed:", err.message || err);
  process.exit(2);
});
