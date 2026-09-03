#!/usr/bin/env node
/**
 * gen-chapter-from-markdown.mjs — emit an idempotent SQL migration that seeds
 * one chapter (module -> sections -> paragraphs) from chapter-template
 * markdown (public/templates/chapter-template.md).
 *
 *   node scripts/seed/gen-chapter-from-markdown.mjs \
 *     --in content/<chapter>.md --out supabase/migrations/<stamp>_seed_<x>.sql \
 *     --slug <module-slug> --title "<Chapter title>" --order <n> \
 *     [--status draft|published] [--author "<name>"] [--version 1.0] \
 *     [--description "…"] [--domain <scientific_domain>] \
 *     [--anim-prefix <Key>] [--placement-prefix <id>]
 *
 * Markdown -> rows (mirrors src/composables/useContentParser.js and the
 * nesting contract in src/composables/useChapter.js#reconstructNesting):
 *
 *   # H1                 ignored (title comes from --title)
 *   ## H2                section (slug from title; "References" is a section
 *                        like any other — a numbered list becomes one ordered
 *                        list block)
 *   ### H3               level-1 subsection header row
 *   #### H4              level-2 header row (demoted to level 1 with a warning
 *                        when no H3 is open — the reader drops orphans)
 *   ### BREAK OUT BOX: T widget block row (sdt / normalization-model …), then
 *                        the box's prose as ordinary rows at the same level;
 *                        "<!-- end breakout box -->" restores the level the
 *                        box was opened at
 *   Figure N. caption    figure_placeholder row + one animations row per
 *   (Figure N) / Figure: figure (key animation<Prefix>FigN, placeholder config
 *                        as the Foundations seed); unnumbered or duplicate
 *                        figures are numbered after the highest explicit one
 *   paragraph            text block(s); <sup>N</sup>, [^N] and [N] become
 *                        citation_ref blocks; **b**, *i*, _i_, `c`, [t](u)
 *                        become <strong>, <em>, <code>, <a>
 *   - / 1. lists         list block; > quote -> blockquote; ``` -> code
 *
 * content_text is the plain text (<= 200 chars) used by the search index; on
 * header rows it is the heading itself, which the reader uses as the
 * subsection title.
 *
 * SQL: one DO $$ … $$ block. If a module with --slug exists it RAISEs NOTICE
 * and returns; it never deletes. Ids come from gen_random_uuid(); every string
 * and JSONB literal is dollar-quoted ($ob$…$ob$) so no escaping is needed.
 *
 * The pure functions (parseChapterMarkdown, renderChapterSql,
 * generateChapterSql, toSlug) are exported for tests; the CLI only runs when
 * this file is the entry point.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// Widgets that a "BREAK OUT BOX" heading can resolve to. Mirrors the Attention
// entries in src/widgets/catalog.js (that module imports ?raw HTML, so it
// cannot be loaded from Node). route "" = no Vue route yet; the reader shows
// the card as "not available yet", which is the intended placeholder.
// ---------------------------------------------------------------------------
export const BREAKOUT_WIDGETS = [
  {
    match: /signal\s*detection/i,
    widgetId: "sdt",
    route: "/sdt",
    title: "Signal Detection Theory",
    blurb:
      "Drag the criterion, adjust d′, and watch the ROC curve respond. Demonstrates how sensitivity and bias are independent.",
  },
  {
    match: /normali[sz]ation/i,
    widgetId: "normalization-model",
    route: "",
    title: "Normalization model of attention",
    blurb:
      "Interactive normalization model showing how attention modulates neural responses through divisive normalisation — the unifying computation.",
  },
];

const BOX_HEADING_RE = /^BREAK\s*OUT\s*BOX\s*[:—–-]?\s*(.*)$/i;
const BOX_END_RE = /^<!--\s*end\s+breakout\s+box\s*-->$/i;
// "Figure 3. Caption" / "(Figure 3)" / "Figure: caption". The separator must
// be "." or ":" (or the line must end) so prose such as "Figure 4 shows…" or
// "Figure-ground…" stays prose.
const FIGURE_LINE_RE =
  /^\(?\s*Figure\s*(\d+)?\s*\)?\s*(?:[.:]\s*|(?=$))([\s\S]*)$/i;
const CONTENT_TEXT_MAX = 200;
const DOLLAR_TAG = "$ob$";

/** Same algorithm as src/helper/general.js#toSlug (which pulls in Pinia). */
export function toSlug(str) {
  let s = String(str).toLowerCase();
  const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaeeeeiiiioooouuuunc------";
  for (let i = 0; i < from.length; i++) {
    s = s.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }
  return s
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Inline markdown -> HTML + citation blocks
// ---------------------------------------------------------------------------

const ALLOWED_TAG_RE =
  /<\/?(?:sup|sub|em|strong|code|br)\s*\/?>|<a\s+href="[^"]*">|<\/a>/gi;

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape text but leave a small whitelist of inline tags untouched. */
function escapeOutsideTags(s) {
  let out = "";
  let last = 0;
  for (const m of s.matchAll(ALLOWED_TAG_RE)) {
    out += escapeHtml(s.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + escapeHtml(s.slice(last));
}

// Control char that never occurs in prose; brackets an escaped character's
// index while the emphasis passes run.
const ESC = "\u0001";

/** Inline markdown -> HTML string (citations still as <sup>N</sup>). */
export function inlineToHtml(md) {
  // Backslash escapes become opaque until the emphasis passes are done.
  const escaped = [];
  let s = md.replace(/\\([\\`*_{}[\]()#+\-.!<>|])/g, (_, ch) => {
    escaped.push(ch);
    return `${ESC}${escaped.length - 1}${ESC}`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    return `<a href="${escapeHtml(href)}">${text}</a>`;
  });
  s = escapeOutsideTags(s);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*(?!\s)([\s\S]+?)(?<!\s)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(?!\s)([\s\S]+?)(?<!\s)__/g, "<strong>$1</strong>");
  s = s.replace(/(?<![*\w])\*(?!\s)([^*]+?)(?<!\s)\*(?![*\w])/g, "<em>$1</em>");
  s = s.replace(
    /(?<![\p{L}\p{N}_])_(?!\s)([^_]+?)(?<!\s)_(?![\p{L}\p{N}_])/gu,
    "<em>$1</em>"
  );
  s = s.replace(new RegExp(`${ESC}(\\d+)${ESC}`, "g"), (_, i) =>
    escapeHtml(escaped[Number(i)])
  );
  return s.replace(/\s+/g, " ").trim();
}

// <sup>1</sup>, <sup>2,3</sup>, [^4], [5]  (a [5] followed by "(" is a link)
const CITATION_RE =
  /<sup>\s*(\d+(?:\s*,\s*\d+)*)\s*<\/sup>|\[\^(\d+)\]|(?<![\w\]])\[(\d+)\](?!\()/g;

/** Split an HTML string into text / citation_ref blocks. */
export function htmlToBlocks(html) {
  const blocks = [];
  let last = 0;
  for (const m of html.matchAll(CITATION_RE)) {
    const before = html.slice(last, m.index);
    if (before) blocks.push({ type: "text", content: before });
    const nums = (m[1] || m[2] || m[3]).split(/\s*,\s*/).map(Number);
    for (const n of nums) blocks.push({ type: "citation_ref", number: n });
    last = m.index + m[0].length;
  }
  const rest = html.slice(last);
  if (rest || blocks.length === 0) {
    blocks.push({ type: "text", content: rest });
  }
  return blocks;
}

/** Plain text of an HTML string: citation markers dropped, tags stripped. */
export function plainTextOf(html) {
  return html
    .replace(CITATION_RE, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text, max = CONTENT_TEXT_MAX) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > max / 2 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Block-level markdown -> chapter model
// ---------------------------------------------------------------------------

/** Split markdown into blank-line-separated blocks; comments are blocks. */
function splitBlocks(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let cur = [];
  let inFence = false;
  let inComment = false;
  const flush = () => {
    if (cur.length) blocks.push(cur.join("\n"));
    cur = [];
  };
  for (const line of lines) {
    if (inFence) {
      cur.push(line);
      if (/^```/.test(line)) {
        inFence = false;
        flush();
      }
      continue;
    }
    if (inComment) {
      cur.push(line);
      if (line.includes("-->")) {
        inComment = false;
        flush();
      }
      continue;
    }
    if (/^```/.test(line)) {
      flush();
      cur.push(line);
      inFence = true;
      continue;
    }
    if (/^<!--/.test(line.trim())) {
      flush();
      cur.push(line);
      if (!line.includes("-->")) inComment = true;
      else flush();
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      flush();
      cur.push(line);
      flush();
      continue;
    }
    cur.push(line);
  }
  flush();
  return blocks;
}

function resolveWidget(boxTitle, opts) {
  const hit = BREAKOUT_WIDGETS.find((w) => w.match.test(boxTitle));
  const widgetId = hit ? hit.widgetId : toSlug(boxTitle) || "breakout";
  return {
    type: "widget",
    widgetId,
    kind: "breakout",
    title: hit ? hit.title : boxTitle,
    blurb: hit ? hit.blurb : "",
    credit: opts.author || "",
    route: hit ? hit.route : "",
    placementId: `${opts.placementPrefix}-${widgetId}`,
  };
}

/**
 * Parse chapter markdown into { sections, figures, warnings }.
 * Each section: { title, slug, order_index, paragraphs: [row] }.
 * Each row: { blocks, content_text, order_index, is_subsection_header,
 *             subsection_level, figure: {number} | null, kind }.
 */
export function parseChapterMarkdown(md, options = {}) {
  const opts = {
    author: "",
    placementPrefix: "chapter",
    ...options,
  };
  const sections = [];
  const warnings = [];
  const usedSlugs = new Set();
  let section = null;
  let level = 0;
  let levelBeforeBox = null;
  const figureRows = []; // rows still needing a number

  const ensureSection = (title = "Content") => {
    if (!section) startSection(title);
    return section;
  };
  const startSection = (title) => {
    let slug = toSlug(title) || `section-${sections.length + 1}`;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${toSlug(title)}-${n++}`;
    usedSlugs.add(slug);
    section = { title, slug, order_index: sections.length, paragraphs: [] };
    sections.push(section);
    level = 0;
    levelBeforeBox = null;
  };
  /** Append a row to the open section; returns the stored object. */
  const push = (row) => {
    const s = ensureSection();
    const stored = {
      order_index: s.paragraphs.length,
      is_subsection_header: false,
      subsection_level: level,
      figure: null,
      ...row,
    };
    s.paragraphs.push(stored);
    return stored;
  };
  const pushProse = (kind, blocks, plain) => {
    push({ kind, blocks, content_text: truncate(plain) });
  };

  for (const raw of splitBlocks(md)) {
    const block = raw.trim();
    if (!block) continue;

    if (block.startsWith("<!--")) {
      if (BOX_END_RE.test(block) && levelBeforeBox !== null) {
        level = levelBeforeBox;
        levelBeforeBox = null;
      }
      continue;
    }

    const heading = block.match(/^(#{1,6})\s+(.*)$/s);
    if (heading) {
      const depth = heading[1].length;
      const text = heading[2].replace(/\s+#+$/, "").trim();
      if (depth === 1) continue;
      if (depth === 2) {
        startSection(text);
        continue;
      }
      const box = text.match(BOX_HEADING_RE);
      if (box) {
        const widget = resolveWidget(box[1].trim(), opts);
        levelBeforeBox = level;
        push({
          kind: "widget",
          blocks: [widget],
          content_text: truncate(`Interactive: ${widget.title}`),
        });
        continue;
      }
      let headerLevel = Math.min(depth - 2, 2);
      if (headerLevel === 2 && !hasOpenSubsection(section)) {
        warnings.push(
          `H4 "${text}" has no enclosing H3; demoted to a level-1 header`
        );
        headerLevel = 1;
      }
      level = headerLevel;
      const html = inlineToHtml(text);
      push({
        kind: "header",
        blocks: [{ type: "heading", level: depth, content: html }],
        content_text: plainTextOf(html),
        is_subsection_header: true,
        subsection_level: headerLevel,
      });
      continue;
    }

    if (/^```/.test(block)) {
      const m = block.match(/^```([^\n]*)\n([\s\S]*?)\n?```$/);
      const code = m ? m[2] : block.replace(/^```|```$/g, "");
      pushProse(
        "code",
        [{ type: "code", content: code, lang: m ? m[1].trim() : "" }],
        code
      );
      continue;
    }

    if (/^>/.test(block)) {
      const inner = block.replace(/^>\s?/gm, "").replace(/\n/g, " ");
      const html = inlineToHtml(inner);
      pushProse(
        "blockquote",
        [{ type: "blockquote", content: html }],
        plainTextOf(html)
      );
      continue;
    }

    const listItems = parseList(block);
    if (listItems) {
      const items = listItems.items.map((t) => inlineToHtml(t));
      pushProse(
        "list",
        [{ type: "list", ordered: listItems.ordered, items }],
        items.map(plainTextOf).join(" ")
      );
      continue;
    }

    const fig = block.replace(/\n/g, " ").match(FIGURE_LINE_RE);
    if (fig && block.length <= 300) {
      const captionHtml = inlineToHtml(fig[2] || "");
      const caption = plainTextOf(captionHtml);
      const number = fig[1] ? Number(fig[1]) : null;
      // Blocks and content_text are filled once every figure has a number.
      figureRows.push(
        push({
          kind: "figure",
          blocks: [],
          content_text: "",
          figure: { number, caption, captionHtml },
        })
      );
      continue;
    }

    const html = inlineToHtml(block.replace(/\n/g, " "));
    pushProse("text", htmlToBlocks(html), plainTextOf(html));
  }

  const figures = numberFigures(figureRows, warnings);
  return { sections, figures, warnings };
}

function hasOpenSubsection(section) {
  if (!section) return false;
  for (let i = section.paragraphs.length - 1; i >= 0; i--) {
    const p = section.paragraphs[i];
    if (p.is_subsection_header && p.subsection_level === 1) return true;
  }
  return false;
}

function parseList(block) {
  const lines = block.split("\n");
  const unordered = lines.every((l) => /^\s*[-*+]\s+/.test(l));
  const ordered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
  if (!unordered && !ordered) return null;
  return {
    ordered,
    items: lines.map((l) => l.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim()),
  };
}

/** Give every figure row a unique number and finish its blocks. */
function numberFigures(rows, warnings) {
  const taken = new Set();
  for (const r of rows) {
    const n = r.figure.number;
    if (n === null) continue;
    if (taken.has(n)) {
      warnings.push(`duplicate "Figure ${n}" — renumbered`);
      r.figure.number = null;
    } else {
      taken.add(n);
    }
  }
  // Unnumbered (or renumbered) figures continue after the highest explicit
  // number so they never masquerade as a figure the manuscript skipped.
  let next = Math.max(0, ...taken) + 1;
  const figures = [];
  for (const r of rows) {
    if (r.figure.number === null) {
      r.figure.number = next;
      taken.add(next);
      next++;
    }
    const { number, caption, captionHtml } = r.figure;
    r.figure = { number, caption };
    r.blocks = [{ type: "figure_placeholder", number, caption }];
    if (caption) {
      r.blocks.push({ type: "text", content: `. ${captionHtml}` });
    }
    r.content_text = truncate(`Figure ${number}. ${caption}`.trim());
    figures.push({ number, caption });
  }
  return figures;
}

// ---------------------------------------------------------------------------
// SQL rendering
// ---------------------------------------------------------------------------

function dq(value) {
  const s = String(value);
  if (s.includes(DOLLAR_TAG) || s.includes("$$")) {
    throw new Error(`content contains a dollar-quote tag: ${s.slice(0, 80)}`);
  }
  return `${DOLLAR_TAG}${s}${DOLLAR_TAG}`;
}

function jsonb(obj) {
  return `${dq(JSON.stringify(obj))}::jsonb`;
}

function sqlComment(text) {
  return `  -- ${String(text).replace(/\s+/g, " ").slice(0, 110)}`;
}

/** Render the migration SQL for a parsed chapter. */
export function renderChapterSql(chapter, options) {
  const opts = {
    status: "draft",
    version: "1.0",
    author: "",
    description: "",
    domain: "",
    animPrefix: "Chapter",
    layoutConfig: { defaultLayout: "split-screen", animationPosition: "left" },
    ...options,
  };
  for (const key of ["slug", "title", "order", "inPath"]) {
    if (opts[key] === undefined || opts[key] === "") {
      throw new Error(`renderChapterSql: --${key} is required`);
    }
  }
  if (!["draft", "published", "archived"].includes(opts.status)) {
    throw new Error(`invalid --status "${opts.status}"`);
  }
  const order = Number(opts.order);
  if (!Number.isInteger(order)) throw new Error("--order must be an integer");

  const { sections, figures } = chapter;
  const paragraphCount = sections.reduce((n, s) => n + s.paragraphs.length, 0);
  const widgets = sections.flatMap((s) =>
    s.paragraphs.filter((p) => p.kind === "widget").map((p) => p.blocks[0])
  );
  const figVar = (n) => `v_fig_${n}`;
  const animKey = (n) => `animation${opts.animPrefix}Fig${n}`;
  const description =
    opts.description ||
    `${opts.title}${opts.author ? ` — by ${opts.author}` : ""} (draft).`;

  const w = [];
  w.push(
    "-- =============================================================================",
    `-- Chapter ${order}: ${opts.title} — ${opts.status.toUpperCase()} seed`,
    opts.author ? `-- Author: ${opts.author}` : null,
    `-- Source markdown: ${opts.inPath}`,
    "-- Generated by scripts/seed/gen-chapter-from-markdown.mjs — regenerate rather",
    "-- than hand-edit:",
    `--   node scripts/seed/gen-chapter-from-markdown.mjs --in ${opts.inPath} \\`,
    `--     --out ${opts.outPath || "<out.sql>"} --slug ${opts.slug} \\`,
    `--     --title "${opts.title}" --order ${order} --status ${opts.status}${
      opts.author ? ` --author "${opts.author}"` : ""
    } --version ${opts.version}`,
    "--",
    `-- Idempotent: if a module with slug '${opts.slug}' already exists the block`,
    "-- RAISEs NOTICE and returns. Nothing is ever deleted. Figure placeholder",
    "-- animations upsert on animation_key so a re-seed after a manual module",
    "-- delete reuses them.",
    `-- Contents: ${sections.length} sections, ${paragraphCount} paragraphs, ${figures.length} figure placeholders, ${widgets.length} widget blocks.`,
    "-- =============================================================================",
    "",
    "BEGIN;",
    "",
    "DO $$",
    "DECLARE",
    "  v_creator_id          UUID;",
    "  v_content_version_id  UUID;",
    "  v_existing_module_id  UUID;",
    "  v_module_id           UUID;",
    "  v_section_id          UUID;"
  );
  for (const f of figures) w.push(`  ${figVar(f.number)} UUID;`);
  w.push(
    "BEGIN",
    "  -- ---------------------------------------------------------------------------",
    "  -- Guard: seed once",
    "  -- ---------------------------------------------------------------------------",
    `  SELECT id INTO v_existing_module_id FROM modules WHERE slug = ${dq(opts.slug)} LIMIT 1;`,
    "  IF v_existing_module_id IS NOT NULL THEN",
    `    RAISE NOTICE 'Module % already exists (%), skipping seed.', ${dq(opts.slug)}, v_existing_module_id;`,
    "    RETURN;",
    "  END IF;",
    "",
    "  -- ---------------------------------------------------------------------------",
    "  -- Creator (reuse an existing creator profile; fall back to any profile)",
    "  -- ---------------------------------------------------------------------------",
    "  SELECT id INTO v_creator_id FROM profiles WHERE role = 'creator' LIMIT 1;",
    "  IF v_creator_id IS NULL THEN",
    "    SELECT id INTO v_creator_id FROM profiles LIMIT 1;",
    "  END IF;",
    "  IF v_creator_id IS NULL THEN",
    "    RAISE EXCEPTION 'No profile found to own the module (modules.created_by is NOT NULL). Create a creator profile first.';",
    "  END IF;",
    "",
    "  -- ---------------------------------------------------------------------------",
    `  -- Content version: reuse the existing '${opts.version}' bundle`,
    "  -- ---------------------------------------------------------------------------",
    `  SELECT id INTO v_content_version_id FROM content_versions WHERE version_number = ${dq(opts.version)} LIMIT 1;`,
    "  IF v_content_version_id IS NULL THEN",
    "    INSERT INTO content_versions (version_number, status, created_by, release_notes)",
    `    VALUES (${dq(opts.version)}, 'published', v_creator_id, 'Initial content bundle')`,
    "    RETURNING id INTO v_content_version_id;",
    "  END IF;",
    "",
    `  IF EXISTS (SELECT 1 FROM modules WHERE content_version_id = v_content_version_id AND order_index = ${order}) THEN`,
    `    RAISE EXCEPTION 'order_index % is already used in content version %; regenerate with a different --order', ${order}, ${dq(opts.version)};`,
    "  END IF;",
    "",
    "  -- ---------------------------------------------------------------------------",
    `  -- Module (Chapter ${order}, ${opts.status})`,
    "  -- ---------------------------------------------------------------------------",
    "  v_module_id := gen_random_uuid();",
    "  INSERT INTO modules (",
    "    id, content_version_id, title, slug, description, order_index, status,",
    "    created_by, layout_config, key_takeaways",
    "  )",
    "  VALUES (",
    "    v_module_id, v_content_version_id,",
    `    ${dq(opts.title)},`,
    `    ${dq(opts.slug)},`,
    `    ${dq(description)},`,
    `    ${order}, ${dq(opts.status)}, v_creator_id,`,
    `    ${jsonb(opts.layoutConfig)},`,
    "    NULL",
    "  );",
    ""
  );

  if (figures.length) {
    w.push(
      "  -- ---------------------------------------------------------------------------",
      "  -- Figure placeholder animations (left column). media_type='image' +",
      "  -- interaction_type='static_image' + config.placeholder=true routes them to",
      "  -- IllustrationPlaceholder.vue, as in the Foundations seed.",
      "  -- ---------------------------------------------------------------------------"
    );
    for (const f of figures) {
      const title = f.caption ? truncate(f.caption, 120) : `Figure ${f.number}`;
      const cfg = {
        placeholder: true,
        figureNumber: f.number,
        diagramType: "diagram",
        draft: true,
        note: `Placeholder generated from the manuscript caption; the figure itself has not been supplied yet.`,
      };
      w.push(
        "  INSERT INTO animations (animation_key, title, description, media_type, interaction_type, component_name, config, scientific_domain, load_priority)",
        `  VALUES (${dq(animKey(f.number))}, ${dq(title)}, ${dq(
          `Figure ${f.number} of "${opts.title}" (${opts.status}).${f.caption ? ` ${f.caption}` : ""}`
        )},`,
        `          'image', 'static_image', 'IllustrationPlaceholder', ${jsonb(cfg)}, ${
          opts.domain ? dq(opts.domain) : "NULL"
        }, 'low')`,
        "  ON CONFLICT (animation_key) DO UPDATE",
        "    SET title = EXCLUDED.title, description = EXCLUDED.description, config = EXCLUDED.config, updated_at = NOW()",
        `  RETURNING id INTO ${figVar(f.number)};`
      );
    }
    w.push("");
  }

  w.push(
    "  -- ---------------------------------------------------------------------------",
    "  -- Sections & paragraphs",
    "  -- ---------------------------------------------------------------------------"
  );
  for (const s of sections) {
    w.push(
      "",
      `  -- Section ${s.order_index}: ${s.title.replace(/\s+/g, " ")}`,
      "  v_section_id := gen_random_uuid();",
      "  INSERT INTO sections (id, module_id, title, slug, order_index, introduction_text)",
      `  VALUES (v_section_id, v_module_id, ${dq(s.title)}, ${dq(s.slug)}, ${s.order_index}, NULL);`
    );
    for (const p of s.paragraphs) {
      const label = p.is_subsection_header
        ? `level-${p.subsection_level} header`
        : p.kind === "widget"
          ? `widget ${p.blocks[0].widgetId}`
          : p.kind === "figure"
            ? `figure ${p.figure.number}`
            : `${p.kind} L${p.subsection_level}`;
      w.push(
        sqlComment(`p${p.order_index} [${label}] ${p.content_text}`),
        "  INSERT INTO paragraphs (section_id, content, content_text, order_index, has_animation, animation_id, animation_trigger, is_subsection_header, subsection_level)",
        `  VALUES (v_section_id, ${jsonb({ blocks: p.blocks })}, ${dq(p.content_text)}, ${p.order_index}, ${
          p.figure
            ? `true, ${figVar(p.figure.number)}, 'auto'`
            : "false, NULL, NULL"
        }, ${p.is_subsection_header}, ${p.subsection_level});`
      );
    }
  }

  w.push(
    "",
    `  RAISE NOTICE 'Seeded % module % (%): ${sections.length} sections, ${paragraphCount} paragraphs, ${figures.length} figure placeholders, ${widgets.length} widget blocks.', ${dq(opts.status)}, ${dq(opts.slug)}, v_module_id;`,
    "END $$;",
    "",
    "COMMIT;",
    ""
  );
  return w.filter((line) => line !== null).join("\n");
}

/** markdown + options -> { sql, chapter } */
export function generateChapterSql(markdown, options) {
  const placementPrefix =
    options.placementPrefix || String(options.slug || "chapter").split("-")[0];
  const animPrefix =
    options.animPrefix ||
    placementPrefix.charAt(0).toUpperCase() + placementPrefix.slice(1);
  const chapter = parseChapterMarkdown(markdown, {
    author: options.author || "",
    placementPrefix,
  });
  const sql = renderChapterSql(chapter, {
    ...options,
    animPrefix,
    domain: options.domain === undefined ? placementPrefix : options.domain,
  });
  return { sql, chapter };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`unexpected argument ${a}`);
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    flags[key] = argv[i + 1];
    i++;
  }
  return flags;
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const required = ["in", "out", "slug", "title", "order"];
  const missing = required.filter((k) => !flags[k]);
  if (missing.length) {
    console.error(`missing flags: ${missing.map((k) => `--${k}`).join(" ")}`);
    console.error(
      "usage: gen-chapter-from-markdown.mjs --in <md> --out <sql> --slug <slug> --title <title> --order <n> [--status draft] [--author <name>] [--version 1.0] [--description <text>] [--domain <x>] [--anim-prefix <Key>] [--placement-prefix <id>]"
    );
    process.exit(2);
  }
  const markdown = readFileSync(flags.in, "utf8");
  const { sql, chapter } = generateChapterSql(markdown, {
    ...flags,
    inPath: flags.in,
    outPath: flags.out,
    status: flags.status || "draft",
    version: flags.version || "1.0",
  });
  mkdirSync(dirname(flags.out), { recursive: true });
  writeFileSync(flags.out, sql);

  for (const warning of chapter.warnings) console.warn(`warning: ${warning}`);
  console.log(`wrote ${flags.out}`);
  for (const s of chapter.sections) {
    const widgets = s.paragraphs
      .filter((p) => p.kind === "widget")
      .map((p) => p.blocks[0].widgetId);
    const figs = s.paragraphs.filter((p) => p.kind === "figure").length;
    console.log(
      `  ${String(s.order_index).padStart(2)}  ${s.slug.padEnd(48)} ${String(
        s.paragraphs.length
      ).padStart(3)} paragraphs${figs ? `, ${figs} figure(s)` : ""}${
        widgets.length ? `, widget: ${widgets.join(", ")}` : ""
      }`
    );
  }
  console.log(
    `  figures: ${chapter.figures.map((f) => f.number).join(", ") || "none"}`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
