/*
 * Parse one reference as the chapters print it (Nature style, the authors'
 * own HTML): "Authors. Title. <em>Journal</em> <strong>Vol</strong>,
 * pages (Year)." or a book, "Authors. <em>Title</em>. (Publisher, Year)."
 * Best effort: the reader shows the authors' own text (raw_text), so these
 * fields only feed search, the DOI lookup and the structured tooltip.
 * OPENBRAIN-92.
 */

const strip = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const URL_RE = /https?:\/\/[^\s<>"')]+[^\s<>"').,;]/;
const DOI_RE = /\b(10\.\d{4,9}\/[^\s<>"')]+[^\s<>"').,;])/i;

/**
 * Where the author list ends: the first ". " after something that is not a
 * lone initial ("J.", "M.-A."), so "Hubel, D. H. & Wiesel, T. N. Receptive
 * fields…" splits after "N.".
 */
function splitAuthors(text) {
  const re = /\.\s+/g;
  let m;
  while ((m = re.exec(text))) {
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    const word = before.split(/[\s,&]+/).pop() || "";
    const initial = /^(?:[A-Z]|[A-Z][a-z]?-[A-Z]|[A-Z]\.-[A-Z]|[A-Z]{2})$/.test(
      word
    );
    const nextIsInitial = /^[A-Z]\.(\s|,|$)/.test(after);
    if (initial && nextIsInitial) continue;
    // The list goes on: "… B. E. & Galli-Resta, L." or "… J. L. et al."
    if (initial && /^(?:&\s|et al\b)/.test(after)) continue;
    if (initial && /,\s*[A-Z]$|&\s*[A-Z]$|\s[A-Z]$/.test(before)) {
      // "Surname, J." at the end of the list: split if what follows reads
      // like a title (a word, not another "Surname,").
      if (/^[A-Z][\p{L}'’-]+,\s[A-Z]\./u.test(after)) continue;
    }
    return { authors: before.trim(), rest: text.slice(m.index + m[0].length) };
  }
  return { authors: "", rest: text };
}

/** @returns {{authors,title,journal,year,volume,pages,doi,url,pub_type}} */
export function parseReference(html) {
  const raw = String(html || "");
  const text = strip(raw);
  const doi = (raw.match(DOI_RE) || [])[1] || null;
  const url = doi ? null : (raw.match(URL_RE) || [])[0] || null;
  const yearM =
    text.match(/\((?:[^()]*?,\s*)?((?:1[5-9]|20)\d{2})[a-z]?\)\.?\s*$/) ||
    text.match(/\b((?:1[5-9]|20)\d{2})\b(?!.*\b(?:1[5-9]|20)\d{2}\b)/);
  const year = yearM ? Number(yearM[1]) : null;

  // Journal article: the first <em>…</em> followed by a <strong> volume.
  const art = raw.match(
    /<em>([^<]+)<\/em>\s*<strong>([^<]+)<\/strong>\s*,?\s*([\w–-]+)?/
  );
  // A book: the title is the first <em>.
  const em = raw.match(/<em>([^<]+)<\/em>/);

  let authors = "";
  let title = "";
  let journal = null;
  let volume = null;
  let pages = null;
  let pub_type = "article";

  if (art) {
    journal = strip(art[1]);
    volume = strip(art[2]);
    pages = art[3] ? strip(art[3]).replace(/-{1,2}/g, "–") : null;
    const before = strip(raw.slice(0, raw.indexOf(art[0])));
    const s = splitAuthors(before);
    authors = s.authors;
    title = s.rest.replace(/\.\s*$/, "");
  } else if (em) {
    pub_type = / in <em>/.test(raw) ? "chapter" : "book";
    const before = strip(raw.slice(0, raw.indexOf(em[0])));
    const split = splitAuthors(before);
    if (pub_type === "chapter") {
      authors = split.authors;
      title = split.rest.replace(/\.?\s*in\s*$/i, "");
      journal = strip(em[1]);
    } else if (split.authors && split.rest.trim()) {
      // "Authors. Title. <em>Venue</em>": a magazine piece, or a book whose
      // publisher is in italics.
      authors = split.authors;
      title = split.rest.replace(/[.\s]+$/, "");
      journal = strip(em[1]);
      if (url) pub_type = "web";
    } else {
      authors = before.replace(/\.\s*$/, "");
      title = strip(em[1]);
    }
  } else {
    const s = splitAuthors(text);
    authors = s.authors;
    title = s.rest
      .replace(URL_RE, "")
      .replace(/\(\d{4}\)\.?\s*$/, "")
      .replace(/[.\s]+$/, "");
    pub_type = url ? "web" : "other";
  }
  return {
    authors: authors || "",
    title: title || text,
    journal,
    year,
    volume,
    pages,
    doi,
    url,
    pub_type,
  };
}
