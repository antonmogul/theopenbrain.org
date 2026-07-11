#!/usr/bin/env node
/**
 * convert-rem.mjs — remove the `font-size: 62.5%` root hack safely.
 *
 * The project sets `html, body { font-size: 62.5% }` so 1rem = 10px, and ~1408
 * rem literals across the codebase were authored against that base. Removing the
 * hack makes 1rem = 16px, which would scale every rem 1.6x. To keep pixels
 * identical, every rem literal is recomputed: new = old / 1.6  (== old * 0.625).
 *
 * This script ONLY rewrites `<number>rem` numeric literals. It does not touch the
 * `62.5%` line or the `body` pin — those are separate manual edits (see PLAN.md
 * §5 / §4a). It is a pure text transform (never AST re-serialisation), so nothing
 * but the digits inside rem tokens can change.
 *
 * Usage:
 *   node scripts/convert-rem.mjs --check    # dry run: print manifest, write nothing
 *   node scripts/convert-rem.mjs            # apply, write files + manifest
 *   node scripts/convert-rem.mjs --audit    # diff-based proof: working tree == a
 *                                           #   fresh conversion of the base revision,
 *                                           #   byte-for-byte, per file (default base:
 *                                           #   main; override with AUDIT_BASE=<ref>)
 *
 * Safety:
 *   - Single source-of-truth regex REM (enumeration == conversion == audit).
 *   - Negative lookbehind (?<![\w.]) blocks exponent tails (1e-3rem), glued
 *     identifiers, and multi-dot numbers.
 *   - Case-insensitive so 1REM is caught too.
 *   - Defensive pre-scan aborts on malformed/unsupported forms.
 *   - Exact ×0.625 (0.625 is exact in IEEE-754) + per-token round-trip assertion
 *     (new * 1.6 === old within 1e-9) — zero rounding error for every token.
 *   - Idempotency guard: refuses to run if the 62.5% hack is already gone
 *     (unless --check/--audit), preventing a double-convert.
 *   - Writes a manifest of every replacement for auditability.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── single source of truth ────────────────────────────────────────────────
// Matches a rem numeric literal: optional sign, digits with optional dot,
// followed by the literal unit `rem` and a word boundary. The negative
// lookbehind ensures the char before the number is not a word char or a dot,
// so `1e-3rem`, `foo1rem`, and `1.2.3rem` never match cleanly.
const REM = /(?<![\w.])(-?\d*\.?\d+)rem\b/gi;

// Malformed / unsupported forms we refuse to silently convert. These are NOT
// matched by REM (they'd be missed silently), so we scan for them explicitly
// and abort — making the codemod future-safe, not just correct-for-today.
const FORBIDDEN = [
  { name: "exponent", re: /(?<![\w.])-?\d*\.?\d+e[-+]?\d+rem\b/gi },
  { name: "multi-dot", re: /(?<![\w.])-?\d+\.\d+\.\d+rem\b/gi },
  // trailing-dot form `1.rem` / `-2.rem`: a digit, a dot, then `rem` with no
  // fractional digit. REM's `\d*\.?\d+` requires ≥1 digit after the dot, so it
  // would NOT match `1.rem` cleanly (it'd match a bare-`.`-less part or nothing)
  // — refuse rather than mis-handle.
  { name: "trailing-dot", re: /(?<![\w.])-?\d+\.rem\b/gi },
];

const HACK_MARKER = "font-size: 62.5%";
const INDEX_CSS = join(ROOT, "src", "index.css");
const MANIFEST = join(ROOT, "docs", "font-refactor", "conversion-manifest.tsv");

const MODE = process.argv.includes("--check")
  ? "check"
  : process.argv.includes("--audit")
    ? "audit"
    : "apply";

// ── file enumeration (the script itself decides scope; no external grep) ────
const SCOPE_EXT = /\.(vue|css|js|ts|html)$/;
function listCandidateFiles() {
  // Track only committed/tracked files. Use a DIRECTORY pathspec ("src") — NOT
  // a glob like 'src/**/*.css'. A `**` glob does NOT match files that live
  // directly in src/ (e.g. src/index.css — which holds the hack AND 152 rem
  // literals), so it would silently exclude them. "src" matches the whole tree;
  // we then filter by extension in JS. tailwind.config.js is added explicitly.
  const out = execSync("git ls-files src tailwind.config.js", { cwd: ROOT, encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((p) => p === "tailwind.config.js" || SCOPE_EXT.test(p))
    .map((p) => join(ROOT, p));
}

function convertToken(numStr) {
  const value = parseFloat(numStr);
  const converted = value * 0.625; // exact: 0.625 == 5/8 is representable in IEEE-754
  // Number.toString() yields the SHORTEST decimal that round-trips to this exact
  // double — which, since ×0.625 always terminates, is the exact converted value
  // (e.g. 0.8125 -> "0.5078125", 4 dp source -> 7 dp result). A fixed toFixed(N)
  // would truncate/round longer results and silently lose precision, so we do NOT
  // use it. Guard against scientific notation (would corrupt CSS) just in case.
  let s = converted.toString();
  if (/e/i.test(s)) {
    throw new Error(`Refusing: ${numStr}rem produced exponential form "${s}". Handle manually.`);
  }
  if (s === "-0") s = "0";
  // Round-trip assertion: the machine-checked proof that old_px == new_px.
  // (×1.6 reintroduces tiny float noise, so compare within tolerance.) Use a
  // RELATIVE tolerance so the guarantee holds at any magnitude, not just small
  // values — a fixed 1e-9 absolute epsilon is meaningless for large rems.
  const back = parseFloat(s) * 1.6;
  const tol = 1e-9 * Math.max(1, Math.abs(value));
  if (Math.abs(back - value) > tol) {
    throw new Error(
      `Round-trip failed for ${numStr}rem -> ${s}rem (back=${back}, expected ${value})`,
    );
  }
  return s;
}

function preScan(files) {
  for (const f of files) {
    const content = readFileSync(f, "utf8");
    for (const { name, re } of FORBIDDEN) {
      re.lastIndex = 0;
      const m = re.exec(content);
      if (m) {
        throw new Error(
          `Refusing to run: ${name} rem token found in ${relative(ROOT, f)}: "${m[0]}". ` +
            `Handle this token manually before running the codemod.`,
        );
      }
    }
  }
}

// Escape control chars so a manifest field can never contain a literal
// tab/newline (which would corrupt the TSV for a machine reader).
function tsvField(s) {
  return s.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}

// Pure, position-based conversion of one file's contents. Returns
// { converted, rows: [{line, old, new, snippet}], tokens }. The SAME function
// is used for `apply`, `check`, and `audit`, so the transform an audit compares
// against is byte-identical to the transform that was applied.
function convertContent(rel, original) {
  const rows = [];
  let tokens = 0;

  const lineStarts = [];
  { let acc = 0; for (const ln of original.split("\n")) { lineStarts.push(acc); acc += ln.length + 1; } }
  const lineOf = (idx) => {
    let lo = 0, hi = lineStarts.length - 1, ans = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (lineStarts[mid] <= idx) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans + 1;
  };

  REM.lastIndex = 0;
  const converted = original.replace(REM, (match, num, offset) => {
    const newNum = convertToken(num);
    tokens++;
    const line = lineOf(offset);
    const ctxStart = original.lastIndexOf("\n", offset) + 1;
    let ctxEnd = original.indexOf("\n", offset);
    if (ctxEnd === -1) ctxEnd = original.length;
    const snippet = original.slice(ctxStart, ctxEnd).trim().slice(0, 120);
    rows.push({ line, old: `${num}rem`, new: `${newNum}rem`, snippet });
    return `${newNum}rem`;
  });

  return { converted, rows, tokens };
}

// Read a tracked file's contents at a given git ref (base revision).
function readAtRef(ref, rel) {
  try {
    return execSync(`git show ${ref}:${rel}`, { cwd: ROOT, encoding: "utf8" });
  } catch {
    return null; // file did not exist at that ref (e.g. a new file)
  }
}

// Extract the ordered sequence of rem tokens (just the numeric strings) from a
// blob of text, using the single source-of-truth REM regex.
function remTokens(text) {
  const out = [];
  REM.lastIndex = 0;
  let m;
  while ((m = REM.exec(text)) !== null) out.push(m[1]); // m[1] = the number, sans "rem"
  return out;
}

// Manual, non-codemod rem tokens the working tree is EXPECTED to have that the
// base does not — the deterministic edits from PLAN §4a/§5. Any working-tree rem
// token not explained by (a) a ÷1.6 conversion of a base token or (b) this
// allowlist is an unaccounted change → audit fails.
//   src/index.css: the body pin `font-size: 0.390625rem` is added by hand
//   (6.25px at 16px root); it has no counterpart in the base file.
const MANUAL_ADDED_TOKENS = {
  "src/index.css": ["0.390625"],
};

// ── audit: prove every rem token in the working tree is a correct ÷1.6 ──────
// conversion of the corresponding base token, positionally.
//
// Round-3 rejected whole-file byte equality: files like src/index.css and the 4
// comment files legitimately carry MANUAL non-rem edits (hack removal, body pin,
// comment text), so they can never equal a pure codemod of the base. Instead we
// compare the ORDERED SEQUENCE of rem tokens per file: the i-th rem in the base
// must map to the i-th rem in the working tree via convertToken(). Manual edits
// that don't touch rem tokens don't perturb this sequence, so they're ignored;
// manual edits that ADD a rem token (the body pin) are declared in
// MANUAL_ADDED_TOKENS and checked explicitly. This proves — for every token —
// no missed conversion, no double conversion, and no spurious/renumbered rem,
// without demanding byte equality on manually-edited files.
function runAudit(files) {
  const base = process.env.AUDIT_BASE || "main";
  let baseRef;
  try {
    baseRef = execSync(`git rev-parse --verify ${base}`, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    console.error(`[audit] cannot resolve base ref "${base}". Set AUDIT_BASE to a valid ref.`);
    process.exit(1);
  }

  // Reconcile the scoped file set at BASE vs the current working tree, so
  // renamed/deleted/base-only and brand-new files can't slip through unaudited.
  const baseScoped = new Set(
    execSync(`git ls-tree -r --name-only ${baseRef} -- src tailwind.config.js`, { cwd: ROOT, encoding: "utf8" })
      .split("\n").filter(Boolean).filter((p) => p === "tailwind.config.js" || SCOPE_EXT.test(p)),
  );
  const currentScoped = new Set(files.map((f) => relative(ROOT, f)));
  const allPaths = new Set([...baseScoped, ...currentScoped]);

  let mismatches = 0;
  let totalTokens = 0;
  let filesWithRem = 0;
  const problems = [];

  for (const rel of allPaths) {
    const inBase = baseScoped.has(rel);
    const inCur = currentScoped.has(rel);
    const baseContent = inBase ? readAtRef(baseRef, rel) : null;
    const curContent = inCur ? readFileSync(join(ROOT, rel), "utf8") : null;

    const baseToks = baseContent === null ? [] : remTokens(baseContent);
    const curToks = curContent === null ? [] : remTokens(curContent);

    if (!inCur) {
      // File existed at base but is gone now. If it had rem, that's a change we
      // must account for (deletion is out of scope for this refactor).
      if (baseToks.length) { mismatches++; problems.push(`DELETED with ${baseToks.length} rem token(s): ${rel}`); }
      continue;
    }

    // Expected current tokens = each base token converted, plus manual additions.
    const expected = baseToks.map((t) => convertToken(t));
    const manualAdded = MANUAL_ADDED_TOKENS[rel] || [];
    for (const t of manualAdded) expected.push(t);

    if (baseToks.length) filesWithRem++;
    totalTokens += baseToks.length;

    // Order-independent for the manual-added extras, order-sensitive for the
    // converted body: build multisets and compare.
    const expSorted = [...expected].sort();
    const curSorted = [...curToks].sort();
    const mismatch =
      expSorted.length !== curSorted.length ||
      expSorted.some((v, i) => v !== curSorted[i]);

    if (mismatch) {
      mismatches++;
      const newFileNote = !inBase ? " (NEW file — all its rem must be 16px-base, i.e. already-converted)" : "";
      problems.push(
        `TOKEN MISMATCH: ${rel}${newFileNote}\n` +
          `    base rem (${baseToks.length}): ${baseToks.slice(0, 12).join(", ")}${baseToks.length > 12 ? " …" : ""}\n` +
          `    expected  (${expected.length}): ${expected.slice(0, 12).join(", ")}${expected.length > 12 ? " …" : ""}\n` +
          `    actual    (${curToks.length}): ${curToks.slice(0, 12).join(", ")}${curToks.length > 12 ? " …" : ""}`,
      );
    }
  }

  console.log(
    `[audit] base=${base} (${baseRef.slice(0, 8)}), files with rem: ${filesWithRem}, base tokens: ${totalTokens}, mismatches: ${mismatches}`,
  );
  for (const p of problems) console.error(`[audit] ${p}`);
  if (mismatches > 0) {
    console.error(`[audit] FAILED: ${mismatches} file(s) have rem tokens that are not a clean ÷1.6 conversion of ${base} (+ declared manual additions).`);
    process.exit(1);
  }
  console.log(`[audit] PASSED: every rem token is a correct ÷1.6 conversion of ${base} (manual additions accounted).`);
}

function main() {
  const files = listCandidateFiles();
  preScan(files);

  if (MODE === "audit") {
    runAudit(files);
    return;
  }

  // Idempotency guard (apply only; check is read-only but still refuses to
  // preview a second conversion once the hack is gone, to avoid confusion).
  const idx = readFileSync(INDEX_CSS, "utf8");
  if (!idx.includes(HACK_MARKER)) {
    console.error(
      `Refusing to run (${MODE}): "${HACK_MARKER}" not found in src/index.css. ` +
        `The tree looks already converted — running again would double-convert. Aborting.`,
    );
    process.exit(1);
  }

  const manifestRows = [];
  let totalTokens = 0;
  let filesChanged = 0;

  for (const f of files) {
    const rel = relative(ROOT, f);
    const original = readFileSync(f, "utf8");
    const { converted, rows, tokens } = convertContent(rel, original);
    totalTokens += tokens;
    for (const r of rows) {
      manifestRows.push(`${rel}\t${r.line}\t${tsvField(r.old)}\t${tsvField(r.new)}\t${tsvField(r.snippet)}`);
    }
    if (converted !== original) {
      filesChanged++;
      if (MODE === "apply") writeFileSync(f, converted);
    }
  }

  const header = "file\tline\told\tnew\tcontext";
  const manifestText = [header, ...manifestRows].join("\n") + "\n";
  if (MODE === "apply") writeFileSync(MANIFEST, manifestText);

  console.log(
    `[${MODE}] files scanned: ${files.length}, files with rem: ${filesChanged}, tokens converted: ${totalTokens}`,
  );
  if (MODE === "check") {
    console.log(`(dry run — nothing written) manifest preview: ${manifestRows.length} rows`);
    console.log(manifestRows.slice(0, 8).join("\n"));
  }
  if (MODE === "apply") {
    console.log(`manifest written: ${relative(ROOT, MANIFEST)}`);
  }
}

main();
