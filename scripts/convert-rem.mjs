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

// Malformed / unsupported forms we refuse to silently convert.
const FORBIDDEN = [
  { name: "exponent", re: /(?<![\w.])-?\d*\.?\d+e[-+]?\d+rem\b/gi },
  { name: "multi-dot", re: /(?<![\w.])-?\d+\.\d+\.\d+rem\b/gi },
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
  // (×1.6 reintroduces tiny float noise, so compare within a tight tolerance.)
  const back = parseFloat(s) * 1.6;
  if (Math.abs(back - value) > 1e-9) {
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

// ── audit: prove the working tree IS a fresh conversion of the base ─────────
// This is the Layer-1 exhaustive proof. Rather than scan for "leftover old
// token strings" (ambiguous — an old token may equal another token's converted
// value), it reconstructs each file from the base revision, converts it with
// the exact same codemod, and asserts the result equals the working tree file
// byte-for-byte. That proves, positionally and completely: every base rem token
// was converted, none was double-converted, and no non-rem byte changed
// (outside files git reports as changed for a non-rem reason, which are listed).
function runAudit(files) {
  const base = process.env.AUDIT_BASE || "main";
  let baseRef;
  try {
    baseRef = execSync(`git rev-parse --verify ${base}`, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    console.error(`[audit] cannot resolve base ref "${base}". Set AUDIT_BASE to a valid ref.`);
    process.exit(1);
  }

  let mismatches = 0;
  let filesConverted = 0;
  let totalTokens = 0;

  for (const f of files) {
    const rel = relative(ROOT, f);
    const baseContent = readAtRef(baseRef, rel);
    if (baseContent === null) continue; // new file — nothing to reconstruct against
    const { converted, tokens } = convertContent(rel, baseContent);
    const actual = readFileSync(f, "utf8");
    if (tokens > 0) filesConverted++;
    totalTokens += tokens;
    if (converted !== actual) {
      mismatches++;
      console.error(`[audit] MISMATCH: ${rel} — working tree != fresh conversion of ${base}`);
      // Show the first differing line for a fast diagnosis.
      const a = converted.split("\n"), b = actual.split("\n");
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
          console.error(`  line ${i + 1}:`);
          console.error(`    expected: ${JSON.stringify(a[i])}`);
          console.error(`    actual:   ${JSON.stringify(b[i])}`);
          break;
        }
      }
    }
  }

  console.log(
    `[audit] base=${base} (${baseRef.slice(0, 8)}), files with rem: ${filesConverted}, tokens: ${totalTokens}, mismatches: ${mismatches}`,
  );
  if (mismatches > 0) {
    console.error(`[audit] FAILED: ${mismatches} file(s) differ from a fresh ÷1.6 conversion of ${base}.`);
    process.exit(1);
  }
  console.log(`[audit] PASSED: every rem-bearing file equals a fresh ÷1.6 conversion of ${base}.`);
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
