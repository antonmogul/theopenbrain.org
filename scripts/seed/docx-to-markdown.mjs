#!/usr/bin/env node
/**
 * docx-to-markdown.mjs — turn a manuscript DOCX into the chapter-template
 * markdown (public/templates/chapter-template.md) that
 * scripts/seed/gen-chapter-from-markdown.mjs consumes.
 *
 *   node scripts/seed/docx-to-markdown.mjs <in.docx> <out.md> \
 *     [--title "Chapter title"] [--author "Name, Institution"]
 *
 * Author manuscripts rarely use Word heading styles — headings arrive from
 * mammoth as ordinary <p> elements whose runs happen to be bold or italic. The
 * conversion therefore works from a few visual heuristics, listed here so a
 * reviewer of the generated markdown knows what to look for:
 *
 *   real <h1>-<h6>                 -> "#" … "######" (kept as-is)
 *   paragraph that is entirely bold -> "##"  (H2, section)
 *                                     "####" when inside a breakout box
 *   paragraph entirely italic       -> "###" (H3, subsection)
 *                                     "####" when inside a breakout box
 *   "BREAK OUT BOX …" bold line     -> first sighting opens a box:
 *                                       "### BREAK OUT BOX: <title>"
 *                                     second sighting closes it:
 *                                       "<!-- end breakout box -->"
 *   "Figure N. caption" lines       -> "Figure N. caption" (figure placeholder)
 *                                     unnumbered captions -> "Figure: caption"
 *   <sup>N</sup>                    -> kept verbatim (citation reference)
 *   images, equations               -> dropped; "<!-- image omitted -->" is
 *                                     left where each one stood
 *   inline bold / italic            -> **bold** / *italic*
 *
 * Everything else is a body paragraph. Nothing here is chapter-specific.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(s) {
  return s.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
    (m) => ENTITIES[m] ?? m
  );
}

/** Plain text of an HTML fragment: tags stripped, entities decoded. */
export function plainText(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when every non-whitespace character of `inner` sits inside `tag`
 * (possibly across several runs — Word splits headings into runs freely).
 */
function isWrappedIn(inner, tag) {
  if (!inner.includes(`<${tag}>`)) return false;
  const outside = inner.replace(
    new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "g"),
    ""
  );
  return plainText(outside) === "";
}

/** Hug emphasis markers to the text: "<b> x </b>" -> " **x** ". */
function wrapEmphasis(html, tag, marker) {
  return html.replace(
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"),
    (_, body) => {
      const lead = body.match(/^\s*/)[0];
      const trail = body.match(/\s*$/)[0];
      const core = body.trim();
      if (!core) return lead + trail;
      return `${lead}${marker}${core}${marker}${trail}`;
    }
  );
}

/** Inline HTML (from mammoth) -> inline markdown. */
export function inlineToMarkdown(html) {
  let md = html;
  md = md.replace(/<img\b[^>]*\/?>/gi, "");
  md = md.replace(/<br\s*\/?>/gi, " ");
  md = md.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `[${plainText(text)}](${href})`
  );
  md = wrapEmphasis(md, "strong", "**");
  md = wrapEmphasis(md, "b", "**");
  md = wrapEmphasis(md, "em", "*");
  md = wrapEmphasis(md, "i", "*");
  // <sup>/<sub> survive: the chapter parser reads <sup>N</sup> as a citation.
  md = md.replace(/<(?!\/?su[bp]\b)[^>]+>/g, "");
  md = decodeEntities(md).replace(/\s+/g, " ").trim();
  // A body line must not be mistaken for block syntax by a markdown parser.
  md = md.replace(/^([#>]|[-+*]\s|\d+\.\s)/, "\\$1");
  return md;
}

const BOX_RE = /BREAK\s*OUT\s*BOX/i;
// "Figure 3. Caption", "(Figure 3) Caption", "Figure: caption"
const FIGURE_RE = /^\(?\s*figure\s*(\d+)?\s*\)?\s*([.:–—-])?\s*([\s\S]*)$/i;

function sentenceCase(s) {
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters && letters === letters.toUpperCase()) {
    const lower = s.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return s;
}

function boxTitle(text) {
  return sentenceCase(
    text
      .replace(BOX_RE, "")
      .replace(/^[\s*:—–-]+|[\s*:—–-]+$/g, "")
      .trim()
  );
}

/**
 * Classify one paragraph. Returns markdown line(s) for it, or null to skip.
 * `state.inBox` toggles on BREAK OUT BOX markers.
 */
function paragraphToMarkdown(inner, state) {
  const imageCount = (inner.match(/<img\b/gi) || []).length;
  const notes = Array(imageCount).fill("<!-- image omitted -->");
  const body = inner.replace(/<img\b[^>]*\/?>/gi, "");
  const text = plainText(body);
  if (!text) return notes.length ? notes.join("\n") : null;

  const allBold = isWrappedIn(body, "strong") || isWrappedIn(body, "b");
  const allItalic = isWrappedIn(body, "em") || isWrappedIn(body, "i");

  let line;
  if (allBold && BOX_RE.test(text)) {
    if (!state.inBox) {
      state.inBox = true;
      line = `### BREAK OUT BOX: ${boxTitle(text)}`;
    } else {
      state.inBox = false;
      line = "<!-- end breakout box -->";
    }
  } else {
    const fig = text.match(FIGURE_RE);
    const isFigure =
      fig && (allBold || allItalic || (fig[1] !== undefined && fig[2]));
    if (isFigure) {
      // Caption keeps its inline emphasis; the "Figure N." label does not.
      const caption = inlineToMarkdown(body)
        .replace(/^\**\(?\s*figure\s*\d*\s*\)?\s*[.:–—-]?\**\s*/i, "")
        .replace(/^\*+|\*+$/g, "")
        .trim();
      line = fig[1] ? `Figure ${fig[1]}. ${caption}` : `Figure: ${caption}`;
    } else if (allBold) {
      line = `${state.inBox ? "####" : "##"} ${plainText(body)}`;
    } else if (allItalic) {
      line = `${state.inBox ? "####" : "###"} ${plainText(body)}`;
    } else {
      line = inlineToMarkdown(body);
    }
  }
  return [...notes, line].join("\n");
}

function listToMarkdown(inner, ordered) {
  const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) =>
    inlineToMarkdown(m[1])
  );
  return items
    .map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`))
    .join("\n");
}

/**
 * mammoth HTML -> chapter markdown body (no header, no H1).
 * Pure; exported for tests.
 */
export function htmlToMarkdown(html) {
  const state = { inBox: false };
  const out = [];
  const blockRe =
    /<(h[1-6]|p|ul|ol|table)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*\/?>/gi;
  for (const m of html.matchAll(blockRe)) {
    const tag = (m[1] || "img").toLowerCase();
    const inner = m[2] ?? "";
    let block = null;
    if (tag === "img") {
      block = "<!-- image omitted -->";
    } else if (/^h[1-6]$/.test(tag)) {
      block = `${"#".repeat(Number(tag[1]))} ${plainText(inner)}`;
    } else if (tag === "ul" || tag === "ol") {
      block = listToMarkdown(inner, tag === "ol");
    } else if (tag === "table") {
      block = "<!-- table omitted -->";
    } else {
      block = paragraphToMarkdown(inner, state);
    }
    if (block) out.push(block);
  }
  if (state.inBox) out.push("<!-- end breakout box -->");
  return out.join("\n\n") + "\n";
}

export function buildHeader({ source, author, date }) {
  const who = author ? ` (${author})` : "";
  return [
    "<!--",
    "  DRAFT — not final. Placeholder-quality seed text; the manuscript is",
    "  still being written and its last sections are thin.",
    `  Source: ${source}${who}`,
    `  Converted: ${date} by scripts/seed/docx-to-markdown.mjs`,
    "  Images and equations did not survive conversion; each is marked",
    '  "image omitted" where it stood. Review before publishing.',
    "-->",
  ].join("\n");
}

/** YYYY-MM-DD in the machine's local zone (toISOString would report UTC). */
function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      flags[a.slice(2)] = argv[i + 1];
      i++;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [inPath, outPath] = positional;
  if (!inPath || !outPath) {
    console.error(
      'usage: docx-to-markdown.mjs <in.docx> <out.md> [--title "…"] [--author "…"]'
    );
    process.exit(2);
  }
  const mammoth = (await import("mammoth")).default;
  const buffer = readFileSync(inPath);
  const result = await mammoth.convertToHtml(
    { buffer },
    { convertImage: mammoth.images.imgElement(() => ({ src: "" })) }
  );
  for (const msg of result.messages) {
    console.warn(`mammoth ${msg.type}: ${msg.message}`);
  }
  const body = htmlToMarkdown(result.value);
  const header = buildHeader({
    source: basename(inPath),
    author: flags.author || "",
    date: localDate(),
  });
  const title = flags.title ? `# ${flags.title}\n\n` : "";
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${header}\n\n${title}${body}`);
  const headings = (body.match(/^#{2,4} /gm) || []).length;
  const images = (body.match(/<!-- image omitted -->/g) || []).length;
  console.log(
    `wrote ${outPath}: ${headings} headings, ${images} images omitted`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
