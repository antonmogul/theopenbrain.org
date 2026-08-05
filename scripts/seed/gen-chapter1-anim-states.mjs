#!/usr/bin/env node
/**
 * gen-chapter1-anim-states.mjs — DATA-FIX #2/#5 + #6 generator
 * =============================================================================
 * Emits an IDEMPOTENT SQL migration that backfills `animation_states`,
 * `animation_variants`, and full `config.infoText` for Chapter 1's interactive
 * animations, DERIVED FROM src/assets/json_backend/animations.json (the
 * authoritative static source).
 *
 * This script is FILESYSTEM-ONLY: it reads animations.json and writes a .sql
 * file. It has NO Supabase client, NO credentials, and performs NO database
 * writes. Applying the emitted SQL is a manual, reviewed step done by a human
 * with service-role access — see the header of the generated file.
 *
 * Correctness guarantees:
 *  - is_highlight_state is derived from which JSON array a label lives in
 *    (.states → false, .statesHighlight → true). This intentionally DIFFERS from
 *    the legacy 20260406000000 migration, which mis-marked EyeStructur /
 *    RetinalCellTypes(x3) / Photoreceptors as highlight and produced empty
 *    `states[]` through the transform.
 *  - order_index: regular states 0..N-1, highlight states 100..100+M-1
 *    (satisfies UNIQUE(animation_id, order_index) and UNIQUE(animation_id,
 *    state_label)).
 *  - Byte-for-byte label copy (whitespace preserved).
 *  - SELF-ASSERTION: before emitting, the rows are fed through a replica of the
 *    useAnimations partition logic and DEEP-COMPARED against animations.json.
 *    Any mismatch throws and nothing is written.
 *
 * Usage:  node scripts/seed/gen-chapter1-anim-states.mjs
 *   → writes supabase/migrations/20260711000000_seed_chapter1_anim_states.sql
 * =============================================================================
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const ANIM_JSON = path.join(REPO, "src/assets/json_backend/animations.json");
const OUT_SQL = path.join(
  REPO,
  "supabase/migrations/20260711000000_seed_chapter1_anim_states.sql"
);

const animations = JSON.parse(fs.readFileSync(ANIM_JSON, "utf8")).animations;

// SQL string literal escaping (single quotes doubled).
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

/**
 * Build the row model for one animation from its animations.json entry.
 * Returns { key, states: [{label, description, order, highlight}], variants,
 *           infoText } or null if it needs no seed rows.
 */
function buildModel(a) {
  const states = [];
  const variants = [];

  // Regular states (.states) — is_highlight_state = false.
  // state_description holds the exact JSON string; a synthetic `Step N` label
  // keeps state_label unique. Transform yields state_description || state_label.
  (a.states || []).forEach((label, i) => {
    states.push({
      label: `Step ${i + 1}`,
      description: label, // byte-for-byte, whitespace preserved
      order: i,
      highlight: false,
    });
  });

  // Highlight states (.statesHighlight) — is_highlight_state = true.
  // Transform yields state_label. Put the exact JSON string in state_label.
  (a.statesHighlight || []).forEach((label, i) => {
    states.push({
      label, // exact string
      description: null,
      order: 100 + i,
      highlight: true,
    });
  });

  // Switch variants (.switches) — only for switch figures.
  (a.switches || []).forEach((label, i) => {
    variants.push({ label, order: i });
  });

  const infoText = a.infoText && a.infoText.length > 0 ? a.infoText : null;

  if (states.length === 0 && variants.length === 0 && !infoText) return null;
  return { key: a.id, states, variants, infoText };
}

const models = animations.map(buildModel).filter(Boolean);

// -----------------------------------------------------------------------------
// SELF-ASSERTION — reconstruct states/statesHighlight/switches from the rows we
// are about to emit, using the SAME logic as useAnimations.js, and deep-compare
// against animations.json. Throw on any mismatch.
// -----------------------------------------------------------------------------
function reconstructFromRows(model) {
  const out = {};
  const regular = model.states
    .filter((s) => !s.highlight)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.description || s.label); // mirrors state_description || state_label
  const highlight = model.states
    .filter((s) => s.highlight)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.label);
  if (regular.length) out.states = regular;
  if (highlight.length) out.statesHighlight = highlight;
  if (model.variants.length)
    out.switches = model.variants
      .sort((a, b) => a.order - b.order)
      .map((v) => v.label);
  return out;
}

function assertMatches(model) {
  const a = animations.find((x) => x.id === model.key);
  const got = reconstructFromRows(model);
  const wantStates = a.states || [];
  const wantHl = a.statesHighlight || [];
  const wantSw = a.switches || [];

  const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  if (wantStates.length && !eq(got.states, wantStates))
    throw new Error(
      `states mismatch for ${model.key}:\n  got ${JSON.stringify(got.states)}\n  want ${JSON.stringify(wantStates)}`
    );
  if (wantHl.length && !eq(got.statesHighlight, wantHl))
    throw new Error(
      `statesHighlight mismatch for ${model.key}:\n  got ${JSON.stringify(got.statesHighlight)}\n  want ${JSON.stringify(wantHl)}`
    );
  if (wantSw.length && !eq(got.switches, wantSw))
    throw new Error(
      `switches mismatch for ${model.key}:\n  got ${JSON.stringify(got.switches)}\n  want ${JSON.stringify(wantSw)}`
    );
}

for (const m of models) assertMatches(m);
console.log(`Self-assertion passed for ${models.length} animations.`);

// -----------------------------------------------------------------------------
// EMIT SQL
// -----------------------------------------------------------------------------
const lines = [];
lines.push(
  "-- ============================================================================="
);
lines.push(
  "-- Chapter 1: animation_states / animation_variants / infoText backfill"
);
lines.push("-- Migration: 20260711000000_seed_chapter1_anim_states.sql");
lines.push("-- GENERATED by scripts/seed/gen-chapter1-anim-states.mjs from");
lines.push(
  "--   src/assets/json_backend/animations.json — DO NOT hand-edit; re-run the"
);
lines.push(
  "--   generator instead. (DATA-FIX #2/#5 + #6 of docs/chapter1-parity.)"
);
lines.push("--");
lines.push(
  "-- WHAT IT DOES: backfills the empty animation_states / animation_variants"
);
lines.push(
  "--   tables and repairs truncated config.infoText for Chapter 1's interactive"
);
lines.push(
  "--   figures, so useAnimations emits the states / statesHighlight / switches"
);
lines.push("--   arrays the components expect.");
lines.push("--");
lines.push(
  "-- IDEMPOTENT: per animation_key it resolves the (existing) UUID, DELETEs its"
);
lines.push(
  "--   child rows, then re-INSERTs from JSON. Re-running is safe. A missing key"
);
lines.push(
  "--   RAISEs EXCEPTION and rolls back the whole transaction (exact-parity: fail"
);
lines.push("--   loud, never partial).");
lines.push("--");
lines.push(
  "-- is_highlight_state is derived from JSON array membership (.states=false,"
);
lines.push(
  "--   .statesHighlight=true) — this CORRECTS the legacy 20260406000000 seed,"
);
lines.push(
  "--   which mis-marked several figures and produced empty states[]."
);
lines.push("--");
lines.push(
  "-- RUN with service_role / superuser (bypasses RLS). Review before applying."
);
lines.push(
  "-- ============================================================================="
);
lines.push("");
lines.push("BEGIN;");
lines.push("");
lines.push("DO $$");
lines.push("DECLARE");
lines.push("  v_anim_id UUID;");
lines.push("BEGIN");
lines.push("");

for (const m of models) {
  lines.push(`  -- ${m.key}`);
  lines.push(
    `  SELECT id INTO v_anim_id FROM animations WHERE animation_key = ${q(m.key)};`
  );
  lines.push(`  IF v_anim_id IS NULL THEN`);
  lines.push(
    `    RAISE EXCEPTION 'animation_key % not found — aborting seed', ${q(m.key)};`
  );
  lines.push(`  END IF;`);

  if (m.states.length || m.variants.length) {
    lines.push(
      `  DELETE FROM animation_states   WHERE animation_id = v_anim_id;`
    );
    lines.push(
      `  DELETE FROM animation_variants WHERE animation_id = v_anim_id;`
    );
  }

  if (m.states.length) {
    lines.push(
      `  INSERT INTO animation_states (animation_id, state_label, state_description, order_index, is_highlight_state) VALUES`
    );
    const vals = m.states.map(
      (s) =>
        `    (v_anim_id, ${q(s.label)}, ${s.description === null ? "NULL" : q(s.description)}, ${s.order}, ${s.highlight})`
    );
    lines.push(vals.join(",\n") + ";");
  }

  if (m.variants.length) {
    lines.push(
      `  INSERT INTO animation_variants (animation_id, variant_label, order_index) VALUES`
    );
    const vals = m.variants.map(
      (v) => `    (v_anim_id, ${q(v.label)}, ${v.order})`
    );
    lines.push(vals.join(",\n") + ";");
  }

  if (m.infoText) {
    // DATA-FIX #6: restore full infoText into config JSONB (idempotent overwrite).
    lines.push(
      `  UPDATE animations SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{infoText}', to_jsonb(${q(m.infoText)}::text), true) WHERE id = v_anim_id;`
    );
  }

  lines.push("");
}

lines.push("END $$;");
lines.push("");
lines.push("COMMIT;");
lines.push("");

fs.writeFileSync(OUT_SQL, lines.join("\n"), "utf8");
console.log(
  `Wrote ${path.relative(REPO, OUT_SQL)} (${models.length} animations).`
);
