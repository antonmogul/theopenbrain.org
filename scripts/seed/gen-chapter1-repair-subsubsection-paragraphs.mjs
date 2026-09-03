#!/usr/bin/env node
/**
 * gen-chapter1-repair-subsubsection-paragraphs.mjs — OPENBRAIN-22 generator
 * =============================================================================
 * Emits an IDEMPOTENT SQL migration that restores the Chapter 1 paragraphs the
 * original importer dropped: every subSubSection entry whose prose lives in a
 * nested `paragraphs[]` array was written as an EMPTY level-2 row and its
 * paragraphs were never inserted (see flattenParagraphs in
 * scripts/import-chapter-1-to-supabase.mjs for the fix).
 *
 * How it works
 *   1. Reads src/assets/json_backend/text.json and flattens it with the FIXED
 *      importer logic → the target row list per main section.
 *   2. Reads the LIVE module `the-retina` (READ-ONLY: anon key from .env, GET
 *      requests only — this script has no way to write).
 *   3. Matches target rows to DB rows by identity (normalized content_text
 *      prefix, or the animation_full block for fullscreen markers) and plans:
 *        - missing row whose slot is an EMPTY level-2 row → UPDATE in place
 *          (keeps the row id + its animation link, e.g. Center-surround);
 *        - other missing rows → INSERT right after the preceding item,
 *          renumbering the rest of the section by a two-phase shift so
 *          UNIQUE(section_id, order_index) never trips;
 *        - existing rows lacking the break_video / break_section block that
 *          carries their title (e.g. "John Dowling", "Color blindness") →
 *          append the block.
 *   4. SELF-ASSERTS: applies the plan to the snapshot in memory, runs the real
 *      reader transform (transformSectionParagraphs) over it and requires the
 *      text set of every section to equal text.json's. Any mismatch throws
 *      and nothing is written.
 *   5. Writes supabase/migrations/20260903000000_repair_chapter1_subsubsection_paragraphs.sql
 *
 * The emitted SQL is a single DO $$ … $$ block, never DELETEs, skips anything
 * already present, resolves animation_id by animation_key, and RAISE NOTICEs
 * its counts. Applying it is a manual, reviewed step (see the SQL header).
 *
 * Usage:  node scripts/seed/gen-chapter1-repair-subsubsection-paragraphs.mjs
 * =============================================================================
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  flattenParagraphs,
  buildParagraphRow,
  buildAnimLookup,
  loadTextJson,
} from "../import-chapter-1-to-supabase.mjs";
import { fetchChapter1, REPO_ROOT } from "../lib/supabase-rest.mjs";
import {
  attachAnimationKeys,
  collectTexts,
  missingFrom,
  shortLabel,
} from "../lib/chapter1-parity.mjs";
import { transformSectionParagraphs } from "../../src/composables/chapterTransform.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_SQL = path.join(
  REPO_ROOT,
  "supabase/migrations/20260903000000_repair_chapter1_subsubsection_paragraphs.sql"
);
const GENERATOR = path.relative(REPO_ROOT, fileURLToPath(import.meta.url));
const MODULE_SLUG = "the-retina";
const SPECIAL_SLUGS = new Set(["introduction", "further-reading", "footnotes"]);
const SHIFT = 100000; // two-phase renumber offset (way above any order_index)
const KEY_LEN = 100;

// ─── Identity keys (must match the SQL expression in sqlNormKey below) ──────
// Whitespace is collapsed with an EXPLICIT ASCII+nbsp class rather than \s so
// JS and PostgreSQL agree character-for-character; comparison is case-sensitive.
function normKey(s) {
  return String(s ?? "")
    .replace(/[ \t\n\r\f\v\u00a0]+/g, " ")
    .trim()
    .slice(0, KEY_LEN);
}
const SQL_NORM_KEY = `left(btrim(regexp_replace(replace(coalesce(content_text, ''), chr(160), ' '), '[ \\t\\n\\r\\f\\v]+', ' ', 'g')), ${KEY_LEN})`;

// Characters whose whitespace / trim / length semantics could differ between
// JS and PostgreSQL (Unicode spaces, BOM, surrogate pairs). Refuse to key on
// text that contains them rather than risk a silent mismatch.
const UNSAFE_CHARS =
  /[\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff\uD800-\uDFFF]/;

function fullscreenIdOf(row) {
  const b = (row.content?.blocks || []).find(
    (x) => x?.type === "animation_full"
  );
  return b ? b.animationId || null : null;
}

/** Identity of a paragraph row — same for a target row and a DB row. */
function identityOf(row) {
  const blocks = row.content?.blocks || [];
  if (row.is_subsection_header) return `h:${normKey(row.content_text)}`;
  const text = normKey(row.content_text);
  if (text) return `t:${text}`;
  const fs = fullscreenIdOf(row);
  if (fs) return `f:${fs}`;
  if (blocks.length === 0) return null; // empty row — no identity
  return `b:${JSON.stringify(blocks)}`;
}

/** SQL predicate (on paragraphs, section already constrained) for a key. */
function sqlIdentityPredicate(row) {
  const key = identityOf(row);
  if (!key) throw new Error("cannot build a predicate for an empty row");
  const [kind, value] = [key[0], key.slice(2)];
  if (kind === "t" || kind === "h") {
    if (UNSAFE_CHARS.test(row.content_text || "")) {
      throw new Error(`content_text has JS/PG-ambiguous characters: ${value}`);
    }
    return `${SQL_NORM_KEY} = ${dq(value)}`;
  }
  if (kind === "f") {
    return `coalesce(content->'blocks', '[]'::jsonb) @> ${dq(
      JSON.stringify([{ type: "animation_full", animationId: value }])
    )}::jsonb`;
  }
  throw new Error(`unsupported identity kind ${kind}`);
}

// Dollar-quoted literal: no escaping rules to get wrong inside the DO body.
function dq(s) {
  const str = String(s);
  if (str.includes("$q$")) throw new Error("literal contains $q$");
  return `$q$${str}$q$`;
}
const sqlBool = (b) => (b ? "true" : "false");
const sqlNullable = (s) => (s === null || s === undefined ? "NULL" : dq(s));
const comment = (s) => `-- ${String(s).replace(/[\r\n]+/g, " ")}`;

// Blocks that carry a title the reader renders; if the DB row has the text but
// not the block, the title is missing on the page.
const TITLE_BLOCKS = new Set(["break_video", "break_section"]);

// ─── Planning ────────────────────────────────────────────────────────────────
function planSection({ src, dbRows, animLookup, keyById }) {
  const flat = flattenParagraphs(src.paragraphs || []);
  const target = flat.map((fp) => {
    const row = buildParagraphRow(fp, animLookup);
    return { fp, row, key: identityOf(row) };
  });
  for (const t of target) {
    if (!t.key)
      throw new Error(`target row without identity in "${src.title}"`);
  }
  const dupTarget = target
    .map((t) => t.key)
    .filter((k, i, a) => a.indexOf(k) !== i);
  if (dupTarget.length) {
    throw new Error(
      `duplicate target keys in "${src.title}": ${dupTarget.join(" | ")}`
    );
  }

  const rows = [...dbRows].sort((a, b) => a.order_index - b.order_index);
  const byKey = new Map();
  for (const r of rows) {
    const k = identityOf(r);
    r._key = k;
    if (!k) continue;
    if (byKey.has(k))
      throw new Error(`duplicate DB key in "${src.title}": ${k}`);
    byKey.set(k, r);
  }

  const ops = []; // in emission order
  const info = []; // drift we noticed but do not act on
  let cursor = -1; // index into `rows` of the last matched / consumed DB row
  let anchorRowId = null; // DB row id the current run of inserts hangs off
  let runOpen = false; // are we inside a run of missing items?
  const consumed = new Set();

  for (let k = 0; k < target.length; k++) {
    const t = target[k];
    const match = byKey.get(t.key);
    if (match) {
      const j = rows.indexOf(match);
      if (j <= cursor) {
        throw new Error(
          `order drift in "${src.title}": "${shortLabel(t.key, 60)}" appears before the previous item in the DB`
        );
      }
      // Rows between cursor and j exist in the DB but not in text.json.
      for (let x = cursor + 1; x < j; x++) {
        if (!consumed.has(rows[x].id)) {
          info.push(
            `DB-only row order_index ${rows[x].order_index} (${rows[x]._key ? shortLabel(rows[x]._key, 50) : "empty"}) left untouched`
          );
        }
      }
      cursor = j;
      runOpen = false;

      // Block-level repair: text present, title block missing.
      const dbTypes = new Set(
        (match.content?.blocks || []).map((b) => b?.type)
      );
      for (const block of t.row.content.blocks) {
        if (TITLE_BLOCKS.has(block.type) && !dbTypes.has(block.type)) {
          ops.push({ op: "addBlock", rowId: match.id, block, label: t.key });
        }
      }
      const tTypes = t.row.content.blocks.map((b) => b.type).join("+");
      const dTypes = (match.content?.blocks || [])
        .map((b) => b?.type)
        .join("+");
      if (tTypes !== dTypes) {
        info.push(
          `block shape differs for "${shortLabel(t.key, 50)}": target [${tTypes}] vs DB [${dTypes}]${
            t.row.content.blocks.some((b) => TITLE_BLOCKS.has(b.type))
              ? " (title block repaired)"
              : ""
          }`
        );
      }
      continue;
    }

    // Missing item.
    if (!runOpen) {
      anchorRowId = cursor >= 0 ? rows[cursor].id : null;
      ops.push({
        op: "anchor",
        rowId: anchorRowId,
        label: cursor >= 0 ? rows[cursor]._key : "(start)",
      });
      runOpen = true;
    }
    const next = rows[cursor + 1];
    const emptySlot =
      next && !next._key && !next.is_subsection_header && !consumed.has(next.id)
        ? next
        : null;
    if (emptySlot) {
      consumed.add(emptySlot.id);
      cursor += 1;
    }
    ops.push({
      op: "ensure",
      target: t,
      emptyRowId: emptySlot ? emptySlot.id : null,
      animationKey: animationKeyOf(t, keyById),
    });
  }
  for (let x = cursor + 1; x < rows.length; x++) {
    if (!consumed.has(rows[x].id)) {
      info.push(
        `DB-only trailing row order_index ${rows[x].order_index} (${rows[x]._key ? shortLabel(rows[x]._key, 50) : "empty"}) left untouched`
      );
    }
  }

  return { target, rows, ops, info };
}

/** animation_key the SQL must resolve for this target row (or null). */
function animationKeyOf(t, keyById) {
  if (!t.row.animation_id) return null;
  const key = keyById.get(t.row.animation_id);
  if (!key)
    throw new Error(`animation id ${t.row.animation_id} not in animations`);
  return key;
}

// ─── Simulation (self-assertion) ────────────────────────────────────────────
function simulate(plan, animations) {
  const sim = plan.rows.map((r) => ({
    ...r,
    content: structuredClone(r.content),
  }));
  let pos = -1;
  for (const op of plan.ops) {
    if (op.op === "anchor") {
      pos = op.rowId ? sim.findIndex((r) => r.id === op.rowId) : -1;
      if (op.rowId && pos < 0) throw new Error("anchor vanished in simulation");
      continue;
    }
    if (op.op === "addBlock") {
      const r = sim.find((x) => x.id === op.rowId);
      r.content.blocks = [...(r.content.blocks || []), op.block];
      continue;
    }
    if (op.op === "ensure") {
      const payload = {
        ...op.target.row,
        content: structuredClone(op.target.row.content),
        section_id: sim[0]?.section_id,
      };
      if (op.emptyRowId) {
        const i = sim.findIndex((r) => r.id === op.emptyRowId);
        if (i !== pos + 1)
          throw new Error("empty slot not adjacent in simulation");
        sim[i] = { ...sim[i], ...payload };
        pos = i;
      } else {
        sim.splice(pos + 1, 0, {
          id: `new-${pos + 1}-${Math.random()}`,
          ...payload,
        });
        pos = pos + 1;
      }
    }
  }
  sim.forEach((r, i) => (r.order_index = i));
  attachAnimationKeys(sim, animations);
  return sim;
}

// ─── SQL emission ───────────────────────────────────────────────────────────
function emitSection(lines, { src, dbSec, plan }) {
  lines.push("");
  lines.push(`  -- ${"=".repeat(74)}`);
  lines.push(`  ${comment(`Section ${dbSec.order_index}: ${src.title}`)}`);
  lines.push(`  -- ${"=".repeat(74)}`);
  lines.push(`  SELECT s.id INTO v_sec FROM sections s`);
  lines.push(`    JOIN modules m ON m.id = s.module_id`);
  lines.push(
    `   WHERE s.id = ${dq(dbSec.id)} AND m.slug = ${dq(MODULE_SLUG)};`
  );
  lines.push(`  IF v_sec IS NULL THEN`);
  lines.push(
    `    RAISE EXCEPTION 'section % (%) not found in module ${MODULE_SLUG} — aborting', ${dq(dbSec.id)}, ${dq(src.title)};`
  );
  lines.push(`  END IF;`);

  for (const op of plan.ops) {
    lines.push("");
    if (op.op === "anchor") {
      lines.push(
        `  ${comment(`anchor: after row "${shortLabel(String(op.label).slice(2), 60)}"`)}`
      );
      if (op.rowId) {
        lines.push(`  v_pos := NULL;`);
        lines.push(
          `  SELECT order_index INTO v_pos FROM paragraphs WHERE id = ${dq(op.rowId)} AND section_id = v_sec;`
        );
        lines.push(`  IF v_pos IS NULL THEN`);
        lines.push(
          `    RAISE EXCEPTION 'anchor paragraph % not found — aborting', ${dq(op.rowId)};`
        );
        lines.push(`  END IF;`);
      } else {
        lines.push(`  v_pos := -1;`);
      }
      continue;
    }
    if (op.op === "addBlock") {
      lines.push(
        `  ${comment(`title block: append ${op.block.type} "${op.block.title}" to existing row "${shortLabel(op.label.slice(2), 50)}"`)}`
      );
      lines.push(
        `  IF NOT EXISTS (SELECT 1 FROM paragraphs WHERE id = ${dq(op.rowId)} AND section_id = v_sec) THEN`
      );
      lines.push(
        `    RAISE EXCEPTION 'paragraph % not found — aborting', ${dq(op.rowId)};`
      );
      lines.push(`  END IF;`);
      lines.push(`  UPDATE paragraphs`);
      lines.push(
        `     SET content = jsonb_set(content, '{blocks}', coalesce(content->'blocks', '[]'::jsonb) || ${dq(JSON.stringify(op.block))}::jsonb),`
      );
      lines.push(`         updated_at = now()`);
      lines.push(`   WHERE id = ${dq(op.rowId)} AND section_id = v_sec`);
      lines.push(
        `     AND NOT (coalesce(content->'blocks', '[]'::jsonb) @> ${dq(JSON.stringify([{ type: op.block.type }]))}::jsonb);`
      );
      lines.push(`  GET DIAGNOSTICS v_n = ROW_COUNT;`);
      lines.push(`  v_blocks := v_blocks + v_n;`);
      lines.push(`  IF v_n = 0 THEN v_skipped := v_skipped + 1; END IF;`);
      continue;
    }
    if (op.op === "ensure") {
      const { row } = op.target;
      const label = shortLabel(op.target.key.slice(2), 60);
      lines.push(
        `  ${comment(`row: "${label}"${op.emptyRowId ? ` (empty slot ${op.emptyRowId})` : ""}`)}`
      );
      lines.push(`  v_anim := NULL;`);
      if (op.animationKey) {
        lines.push(
          `  SELECT id INTO v_anim FROM animations WHERE animation_key = ${dq(op.animationKey)};`
        );
        lines.push(`  IF v_anim IS NULL THEN`);
        lines.push(
          `    RAISE EXCEPTION 'animation_key % not found — aborting', ${dq(op.animationKey)};`
        );
        lines.push(`  END IF;`);
      }
      lines.push(`  v_found := NULL;`);
      lines.push(`  SELECT order_index INTO v_found FROM paragraphs`);
      lines.push(
        `   WHERE section_id = v_sec AND ${sqlIdentityPredicate(row)}`
      );
      lines.push(`   ORDER BY order_index LIMIT 1;`);
      lines.push(`  IF v_found IS NOT NULL THEN`);
      lines.push(`    v_skipped := v_skipped + 1;`);
      lines.push(`    v_pos := v_found;`);
      const setList = [
        `content = ${dq(JSON.stringify(row.content))}::jsonb`,
        `content_text = ${sqlNullable(row.content_text)}`,
        `has_animation = ${sqlBool(row.has_animation)}`,
        `animation_id = v_anim`,
        `animation_trigger = ${sqlNullable(row.animation_trigger)}`,
        `is_subsection_header = ${sqlBool(row.is_subsection_header)}`,
        `subsection_level = ${row.subsection_level}`,
        `updated_at = now()`,
      ];
      if (op.emptyRowId) {
        lines.push(`  ELSIF EXISTS (`);
        lines.push(`    SELECT 1 FROM paragraphs`);
        lines.push(
          `     WHERE id = ${dq(op.emptyRowId)} AND section_id = v_sec`
        );
        lines.push(
          `       AND order_index = v_pos + 1 AND NOT is_subsection_header`
        );
        lines.push(
          `       AND jsonb_array_length(coalesce(content->'blocks', '[]'::jsonb)) = 0`
        );
        lines.push(`  ) THEN`);
        lines.push(
          `    -- the importer's empty level-2 row sits exactly where this paragraph`
        );
        lines.push(
          `    -- belongs: fill it in place (keeps its id and animation link)`
        );
        lines.push(`    UPDATE paragraphs`);
        lines.push(`       SET ${setList.join(",\n           ")}`);
        lines.push(`     WHERE id = ${dq(op.emptyRowId)};`);
        lines.push(`    v_updated := v_updated + 1;`);
        lines.push(`    v_pos := v_pos + 1;`);
      }
      lines.push(`  ELSE`);
      if (op.emptyRowId) {
        lines.push(
          `    RAISE NOTICE 'empty row % is not at position % — inserting a new row instead', ${dq(op.emptyRowId)}, v_pos + 1;`
        );
      }
      lines.push(
        `    -- make room: two-phase shift keeps UNIQUE(section_id, order_index) happy`
      );
      lines.push(
        `    UPDATE paragraphs SET order_index = order_index + ${SHIFT}`
      );
      lines.push(`     WHERE section_id = v_sec AND order_index > v_pos;`);
      lines.push(
        `    UPDATE paragraphs SET order_index = order_index - ${SHIFT - 1}`
      );
      lines.push(`     WHERE section_id = v_sec AND order_index >= ${SHIFT};`);
      lines.push(`    INSERT INTO paragraphs`);
      lines.push(
        `      (section_id, content, content_text, order_index, has_animation,`
      );
      lines.push(
        `       animation_id, animation_trigger, is_subsection_header, subsection_level)`
      );
      lines.push(`    VALUES`);
      lines.push(
        `      (v_sec, ${dq(JSON.stringify(row.content))}::jsonb, ${sqlNullable(row.content_text)}, v_pos + 1, ${sqlBool(row.has_animation)},`
      );
      lines.push(
        `       v_anim, ${sqlNullable(row.animation_trigger)}, ${sqlBool(row.is_subsection_header)}, ${row.subsection_level});`
      );
      lines.push(`    v_inserted := v_inserted + 1;`);
      lines.push(`    v_pos := v_pos + 1;`);
      lines.push(`  END IF;`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const textData = loadTextJson();
  const db = await fetchChapter1(MODULE_SLUG);
  attachAnimationKeys(db.paragraphs, db.animations);
  const animLookup = buildAnimLookup(db.animations);
  const keyById = new Map(db.animations.map((a) => [a.id, a.animation_key]));

  const dbMain = db.sections
    .filter((s) => !SPECIAL_SLUGS.has(s.slug) && s.order_index !== 0)
    .sort((a, b) => a.order_index - b.order_index);
  if (dbMain.length !== textData.sections.length) {
    throw new Error(
      `section count mismatch: text.json ${textData.sections.length} vs DB ${dbMain.length}`
    );
  }

  const sections = [];
  let totalInsert = 0,
    totalUpdate = 0,
    totalBlocks = 0;
  for (let i = 0; i < textData.sections.length; i++) {
    const src = textData.sections[i];
    const dbSec = dbMain[i];
    if (dbSec.title !== src.title) {
      throw new Error(
        `section ${i + 1} title mismatch: "${src.title}" vs DB "${dbSec.title}"`
      );
    }
    const dbRows = db.paragraphs.filter((p) => p.section_id === dbSec.id);
    const plan = planSection({ src, dbRows, animLookup, keyById });

    // Self-assertion: the plan applied to the snapshot must give the reader
    // exactly text.json's text set, in target order.
    const sim = simulate(plan, db.animations);
    const simKeys = sim.map((r) => identityOf(r));
    const targetKeys = plan.target.map((t) => t.key);
    if (JSON.stringify(simKeys) !== JSON.stringify(targetKeys)) {
      throw new Error(
        `self-assertion failed (row order) in "${src.title}":\n  sim    ${JSON.stringify(simKeys)}\n  target ${JSON.stringify(targetKeys)}`
      );
    }
    const want = collectTexts(src.paragraphs);
    const have = collectTexts(transformSectionParagraphs(sim));
    const missing = missingFrom(want, have);
    const extra = missingFrom(have, want);
    if (missing.length || extra.length) {
      throw new Error(
        `self-assertion failed (text set) in "${src.title}":\n  missing ${JSON.stringify(missing)}\n  extra ${JSON.stringify(extra)}`
      );
    }

    const inserts = plan.ops.filter(
      (o) => o.op === "ensure" && !o.emptyRowId
    ).length;
    const updates = plan.ops.filter(
      (o) => o.op === "ensure" && o.emptyRowId
    ).length;
    const blocks = plan.ops.filter((o) => o.op === "addBlock").length;
    totalInsert += inserts;
    totalUpdate += updates;
    totalBlocks += blocks;
    sections.push({ src, dbSec, plan, inserts, updates, blocks });

    const tag = inserts + updates + blocks ? "REPAIR" : "ok";
    console.log(
      `Section ${dbSec.order_index}: ${src.title} — ${tag} (${plan.rows.length} DB rows → ${plan.target.length} target rows; ${updates} in-place, ${inserts} inserts, ${blocks} title blocks)`
    );
    for (const op of plan.ops) {
      if (op.op === "ensure")
        console.log(
          `    ${op.emptyRowId ? "fill " : "insert"} "${shortLabel(op.target.key.slice(2), 70)}"${op.animationKey ? ` [${op.animationKey}]` : ""}`
        );
      if (op.op === "addBlock")
        console.log(
          `    block  ${op.block.type} "${op.block.title}" → "${shortLabel(op.label.slice(2), 50)}"`
        );
    }
    for (const line of plan.info) console.log(`    info: ${line}`);
  }

  const total = totalInsert + totalUpdate + totalBlocks;
  console.log(
    `\nSelf-assertion passed for ${sections.length} sections. Plan: ${totalUpdate} in-place fills, ${totalInsert} inserts, ${totalBlocks} title blocks.`
  );

  // ── Emit ──
  const L = [];
  L.push(
    "-- ============================================================================="
  );
  L.push(
    "-- Chapter 1: restore subSubSection paragraphs dropped by the importer"
  );
  L.push(
    "-- Migration: 20260903000000_repair_chapter1_subsubsection_paragraphs.sql"
  );
  L.push(`-- GENERATED by ${GENERATOR}`);
  L.push(
    "--   from src/assets/json_backend/text.json + a READ-ONLY snapshot of the live"
  );
  L.push(
    `--   module '${MODULE_SLUG}' (${db.module.id}) — DO NOT hand-edit; re-run the`
  );
  L.push("--   generator against the current DB instead. (OPENBRAIN-22)");
  L.push("--");
  L.push(
    "-- WHAT IT DOES: flattenParagraphs() only read subsub.text, so every"
  );
  L.push(
    "--   subSubSection entry with nested paragraphs[] became an EMPTY level-2 row"
  );
  L.push("--   and its paragraphs were never inserted. This migration:");
  L.push(
    `--     - fills ${totalUpdate} of those empty rows in place (id + animation link kept),`
  );
  L.push(
    `--     - inserts ${totalInsert} paragraph rows at their correct order_index (rows after`
  );
  L.push(
    "--       them are renumbered with a two-phase shift so UNIQUE(section_id,"
  );
  L.push("--       order_index) never trips),");
  L.push(
    `--     - appends ${totalBlocks} break_video / break_section blocks to existing rows`
  );
  L.push(
    '--       whose title the reader could not show ("John Dowling", "Color'
  );
  L.push('--       blindness", …).');
  L.push(
    "--   animation_id is resolved by animation_key at run time; has_animation is set."
  );
  L.push("--");
  L.push(
    "-- IDEMPOTENT: every row is skipped when a row with the same normalized"
  );
  L.push(
    "--   content_text (or the same animation_full block) already exists in its"
  );
  L.push(
    "--   section; block appends are skipped when the block type is present."
  );
  L.push(
    "--   Re-running is safe. NOTHING IS DELETED. A missing section / anchor row /"
  );
  L.push("--   animation_key RAISEs EXCEPTION and rolls the whole block back.");
  L.push("--");
  L.push(
    "-- VERIFY: npm run parity:chapter1  (must print PARITY OK afterwards)"
  );
  L.push(
    "-- RUN with service_role / superuser (bypasses RLS). Review before applying."
  );
  L.push(
    "-- ============================================================================="
  );
  L.push("");
  L.push("DO $$");
  L.push("DECLARE");
  L.push("  v_sec      UUID;");
  L.push("  v_anim     UUID;");
  L.push("  v_pos      INTEGER;");
  L.push("  v_found    INTEGER;");
  L.push("  v_n        INTEGER;");
  L.push("  v_inserted INTEGER := 0;");
  L.push("  v_updated  INTEGER := 0;");
  L.push("  v_blocks   INTEGER := 0;");
  L.push("  v_skipped  INTEGER := 0;");
  L.push("BEGIN");

  for (const s of sections) {
    if (s.inserts + s.updates + s.blocks === 0) continue;
    emitSection(L, s);
  }

  L.push("");
  L.push(
    "  RAISE NOTICE 'chapter1 subSubSection repair: % rows inserted, % empty rows filled in place, % title blocks appended, % steps skipped (already present)',"
  );
  L.push("    v_inserted, v_updated, v_blocks, v_skipped;");
  L.push(`  IF v_inserted + v_updated + v_blocks + v_skipped <> ${total} THEN`);
  L.push(
    `    RAISE EXCEPTION 'expected ${total} planned steps to be applied or skipped, got % — aborting', v_inserted + v_updated + v_blocks + v_skipped;`
  );
  L.push("  END IF;");
  L.push("END $$;");
  L.push("");

  fs.writeFileSync(OUT_SQL, L.join("\n"), "utf8");
  console.log(
    `Wrote ${path.relative(REPO_ROOT, OUT_SQL)} (${L.length} lines).`
  );
}

main().catch((err) => {
  console.error("generator failed:", err.message || err);
  process.exit(1);
});
