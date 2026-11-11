/*
 * References from the chapter itself (OPENBRAIN-90). The `references` table
 * is empty for every chapter today, so a click on a superscript found
 * nothing (Stuart, 24 Sep: "clicking on references doesn't do anything").
 * The chapters do carry their reference lists: the Retina as its Footnotes
 * section (one footnote per number), History as the ordered list in its
 * References section. This finds reference N there, so the tooltip always
 * has something to show; a structured row, once imported, still wins.
 */

/** The <li> contents of an HTML list, in order. */
function listItems(html) {
  const out = [];
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html || ""))) out.push(m[1]);
  return out;
}

/**
 * Bare URLs and DOIs in a reference become links (they open the source).
 * Text already inside an <a> is left alone.
 */
export function linkifyReference(html) {
  if (!html || /<a\s/i.test(html)) return html || "";
  return html
    .replace(
      /(^|[\s(])(https?:\/\/(?:[^\s<>"'&()]|\([^\s<>"'&()]*\))+(?:[^\s<>"'&().,;]|\([^\s<>"'&()]*\)))/g,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
    )
    .replace(
      /(^|[\s(])(?:doi:\s*)?(10\.\d{4,9}\/[^\s<>"'&)]+[^\s<>"'&).,;])/gi,
      (all, pre, doi) =>
        `${pre}<a href="https://doi.org/${doi}" target="_blank" rel="noopener noreferrer">doi:${doi}</a>`
    );
}

/**
 * Reference `number` from a transformed chapter (useText's shape), or null.
 * @returns {{ number: number, html: string } | null}
 */
export function referenceFromChapter(chapter, number) {
  if (!chapter || !Number.isInteger(number) || number < 1) return null;
  const note = chapter.footNotes?.notes?.[number - 1]?.text;
  if (note) return { number, html: linkifyReference(note) };
  const section = (chapter.sections || []).find((s) => s.slug === "references");
  if (section) {
    const items = (section.paragraphs || []).flatMap((p) => listItems(p.text));
    const item = items[number - 1];
    if (item) return { number, html: linkifyReference(item) };
  }
  return null;
}

/**
 * How a reference shows (OPENBRAIN-92): the authors' own text (raw_text, or
 * the chapter's list entry), linkified, and a link to its source (its DOI,
 * else its URL). A row with neither falls back to its structured fields.
 * @returns {{ html: string, href: string|null, hrefLabel: string }}
 */
export function referenceDisplay(ref) {
  if (!ref) return { html: "", href: null, hrefLabel: "" };
  const esc = (s) =>
    String(s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
  const html = (
    ref.html ||
    (ref.raw_text && linkifyReference(ref.raw_text)) ||
    [
      esc(ref.authors),
      ref.year ? `(${ref.year})` : "",
      esc(ref.title),
      ref.journal ? `<em>${esc(ref.journal)}</em>` : "",
    ]
      .filter(Boolean)
      .join(" ")
  )
    // The Retina's entries write page ranges with "--".
    .replace(/(\d)--(\d)/g, "$1–$2");
  const linked = ref.doi
    ? `https://doi.org/${ref.doi}`
    : ref.url && /^https?:\/\//.test(ref.url)
      ? ref.url
      : null;
  // No second link when the text already links the source.
  const inText =
    linked &&
    (html.includes(`href="${linked}"`) ||
      (ref.doi &&
        html.toLowerCase().includes(`doi.org/${ref.doi.toLowerCase()}`)));
  const href = inText ? null : linked;
  return {
    html,
    href,
    hrefLabel: ref.doi ? `doi:${ref.doi}` : href ? "Source" : "",
  };
}

/** Retina's legacy Footnotes are its bibliography, not explanatory notes. */
export function retinaLegacyReferences(chapter) {
  if (chapter?.slug !== "the-retina") return [];
  return (chapter.footNotes?.notes || []).flatMap((note, index) =>
    note.text ? [{ number: index + 1, html: linkifyReference(note.text) }] : []
  );
}

/** One ordered bibliography, retaining legacy entries absent from the table. */
export function chapterEndReferences(chapter, rows = []) {
  if ((chapter?.sections || []).some((s) => s.slug === "references")) return [];
  const byNumber = new Map(
    retinaLegacyReferences(chapter).map((entry) => [entry.number, entry])
  );
  for (const row of rows) byNumber.set(Number(row.number), row);
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

/* ---- The full-width reference list (OPENBRAIN-179) --------------------- */

const BARE_URL =
  /https?:\/\/(?:[^\s<>"'&()]|\([^\s<>"'&()]*\))+(?:[^\s<>"'&().,;]|\([^\s<>"'&()]*\))/g;
const BARE_DOI = /(?:doi:\s*)?(10\.\d{4,9}\/[^\s<>"'&)]+[^\s<>"'&).,;])/gi;
const ANCHOR = /<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
const DOI_HREF = /^https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i;

/** A link out of a reference: its DOI as written, or the site's name. */
function sourceLink(href) {
  const doi = DOI_HREF.exec(href);
  if (doi) return { href, kind: "doi", label: `doi:${doi[1]}` };
  let host = "";
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  return host ? { href, kind: "url", label: host } : null;
}

/** Does an anchor's own text only repeat where the anchor goes? */
function isBareLinkText(text, href) {
  const t = text.replace(/<[^>]*>/g, "").trim();
  return !t || t === href || /^https?:\/\//i.test(t) || /^doi:\s*10\./i.test(t);
}

/**
 * A reference as the full-width list sets it (OPENBRAIN-179): the authors'
 * own text with its parts told apart, and its links taken out of the
 * sentence. Nothing of the text is dropped except the bare addresses, which
 * come back as `links`.
 *
 * - `html`: the text (a chapter entry's html, raw_text, or the structured
 *   fields), with the authors wrapped in `.ref-authors` and the title in
 *   `.ref-title` where the row's fields are found in it word for word. Bare
 *   URLs and DOIs, and links whose text is only their address, are removed;
 *   a link with words of its own stays where it is.
 * - `links`: [{ href, kind: "doi" | "url", label }], the DOI first: the
 *   row's own doi, any address found in the text, then the row's url, each
 *   once.
 */
export function referenceParts(ref) {
  if (!ref) return { html: "", links: [] };
  const links = [];
  const seen = new Set();
  const add = (href) => {
    if (!/^https?:\/\//i.test(href || "")) return;
    const key = href.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) return;
    const link = sourceLink(href);
    if (!link) return;
    seen.add(key);
    links.push(link);
  };
  if (ref.doi) add(`https://doi.org/${ref.doi}`);

  let html = ref.html || ref.raw_text || referenceDisplay(ref).html || "";
  // Links already in the text: an address-only one becomes a chip.
  html = html.replace(ANCHOR, (all, href, text) => {
    if (!isBareLinkText(text, href)) return all;
    add(href);
    return "";
  });
  if (!/<a\s/i.test(html)) {
    html = html
      .replace(BARE_URL, (url) => {
        add(url);
        return "";
      })
      .replace(BARE_DOI, (all, doi) => {
        add(`https://doi.org/${doi}`);
        return "";
      });
  }
  if (ref.url) add(ref.url);
  links.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "doi" ? -1 : 1));

  html = html
    .replace(/(\d)--(\d)/g, "$1–$2")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/([.,;])[\s.,;]*\.\s*$/, ".")
    .trim();

  // The row's own fields, where the text carries them word for word.
  // ("Gresky, J. et al" is written "Gresky, J. <em>et al.</em>".)
  const authors = String(ref.authors || "").trim();
  const lead = [
    authors,
    authors.replace(/ et al\.?$/, " <em>et al.</em>"),
  ].find((a) => a && html.startsWith(a));
  if (lead) {
    const end = lead.length + (html[lead.length] === "." ? 1 : 0);
    html = `<span class="ref-authors">${html.slice(0, end)}</span>${html.slice(end)}`;
  }
  const title = String(ref.title || "").trim();
  const at = title.length > 3 ? html.indexOf(title) : -1;
  // Not inside a tag (an attribute that happens to hold the title).
  if (at > -1 && !/<[^>]*$/.test(html.slice(0, at)))
    html = `${html.slice(0, at)}<span class="ref-title">${title}</span>${html.slice(at + title.length)}`;

  return { html, links };
}

/** A reference's words only, lower case: what the list's filter searches. */
export function referenceSearchText(ref) {
  const parts = referenceParts(ref);
  return [
    parts.html.replace(/<[^>]*>/g, " "),
    ref?.year,
    ...parts.links.map((l) => l.label),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * The chapter's reference list for the full-width back matter
 * (OPENBRAIN-179), or null when it has none.
 *
 * - A chapter with a References section (History): that section, its title,
 *   and the references table's rows; until those arrive, or for a chapter
 *   whose table is empty, the section's own list, entry by entry.
 * - A chapter without one (the Retina): the table's rows over its legacy
 *   footnotes (chapterEndReferences).
 * @returns {{ section: object|null, title: string, entries: object[] } | null}
 */
export function chapterBackReferences(chapter, rows = []) {
  const section = (chapter?.sections || []).find(
    (s) => s.slug === "references" && !s.anchored
  );
  if (!section) {
    const entries = chapterEndReferences(chapter, rows);
    return entries.length
      ? { section: null, title: "References", entries }
      : null;
  }
  const entries = rows.length
    ? rows
    : (section.paragraphs || [])
        .flatMap((p) => listItems(p.text))
        .map((raw_text, i) => ({ number: i + 1, raw_text }));
  return entries.length
    ? { section, title: section.title || "References", entries }
    : null;
}
