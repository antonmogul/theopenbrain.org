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
  const html =
    ref.html ||
    (ref.raw_text && linkifyReference(ref.raw_text)) ||
    [
      esc(ref.authors),
      ref.year ? `(${ref.year})` : "",
      esc(ref.title),
      ref.journal ? `<em>${esc(ref.journal)}</em>` : "",
    ]
      .filter(Boolean)
      .join(" ");
  const href = ref.doi
    ? `https://doi.org/${ref.doi}`
    : ref.url && /^https?:\/\//.test(ref.url)
      ? ref.url
      : null;
  return {
    html,
    href,
    hrefLabel: ref.doi ? `doi:${ref.doi}` : href ? "Source" : "",
  };
}
