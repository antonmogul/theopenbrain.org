/**
 * Bibliography Parser Composable
 *
 * Parses BibTeX (.bib) and RIS (.ris) bibliography files into
 * structured reference objects for the `references` table.
 */

import { ref } from 'vue';

/**
 * Parse a BibTeX file string into reference objects.
 * Handles standard @article, @book, @inproceedings, @misc, etc.
 */
function parseBibTeX(content) {
  const references = [];
  // Match each entry: @type{key, ... }
  const entryRegex = /@(\w+)\s*\{([^,]*),\s*([\s\S]*?)(?=\n@|\n*$)/g;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const entryType = match[1].toLowerCase();
    if (entryType === 'comment' || entryType === 'string' || entryType === 'preamble') continue;

    const fieldsStr = match[3];
    const fields = parseBibTeXFields(fieldsStr);

    const pubType = mapBibTeXType(entryType);
    const authors = formatBibTeXAuthors(fields.author || '');

    references.push({
      authors: authors || 'Unknown',
      title: cleanBibTeXValue(fields.title || ''),
      journal: cleanBibTeXValue(fields.journal || fields.booktitle || ''),
      year: parseInt(fields.year, 10) || null,
      volume: cleanBibTeXValue(fields.volume || ''),
      pages: cleanBibTeXValue(fields.pages || '').replace('--', '–'),
      doi: cleanBibTeXValue(fields.doi || ''),
      url: cleanBibTeXValue(fields.url || ''),
      pub_type: pubType,
      raw_text: buildRawText({ authors, ...fields }),
    });
  }

  return references;
}

/**
 * Parse BibTeX field key-value pairs from the body of an entry.
 */
function parseBibTeXFields(fieldsStr) {
  const fields = {};
  // Match: key = {value} or key = "value" or key = number
  const fieldRegex = /(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\d+))/g;
  let m;
  while ((m = fieldRegex.exec(fieldsStr)) !== null) {
    const key = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    fields[key] = value;
  }
  return fields;
}

/**
 * Clean BibTeX values: remove braces, trim whitespace.
 */
function cleanBibTeXValue(val) {
  return val.replace(/[{}]/g, '').trim();
}

/**
 * Format BibTeX author strings: "Last, First and Last2, First2" → "Last, F. & Last2, F2."
 */
function formatBibTeXAuthors(authorStr) {
  if (!authorStr) return '';
  const cleaned = cleanBibTeXValue(authorStr);
  const authors = cleaned.split(/\s+and\s+/i);
  return authors
    .map(a => a.trim())
    .filter(Boolean)
    .join(' & ');
}

/**
 * Map BibTeX entry types to our pub_type enum.
 */
function mapBibTeXType(type) {
  const map = {
    article: 'article',
    book: 'book',
    inbook: 'chapter',
    incollection: 'chapter',
    inproceedings: 'article',
    conference: 'article',
    phdthesis: 'article',
    mastersthesis: 'article',
    misc: 'web',
    online: 'web',
    techreport: 'article',
    unpublished: 'article',
  };
  return map[type] || 'article';
}

/**
 * Parse a RIS file string into reference objects.
 * RIS uses tag-value pairs: TY, AU, TI, JO, PY, VL, SP, EP, DO, UR, ER.
 */
function parseRIS(content) {
  const references = [];
  // Split into entries by "ER  -"
  const entries = content.split(/^ER\s*-/m);

  for (const entry of entries) {
    if (!entry.trim()) continue;

    const fields = {};
    const authors = [];
    const lines = entry.split('\n');

    for (const line of lines) {
      const m = line.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)/);
      if (!m) continue;

      const tag = m[1].trim();
      const value = m[2].trim();

      if (tag === 'AU' || tag === 'A1') {
        authors.push(value);
      } else {
        fields[tag] = value;
      }
    }

    // Skip entries without a type tag
    if (!fields.TY && authors.length === 0 && !fields.TI) continue;

    const pubType = mapRISType(fields.TY || '');
    const pages = [fields.SP, fields.EP].filter(Boolean).join('–');
    const authorStr = authors.join(' & ');

    references.push({
      authors: authorStr || 'Unknown',
      title: fields.TI || fields.T1 || '',
      journal: fields.JO || fields.JF || fields.T2 || '',
      year: parseInt(fields.PY || fields.Y1 || '', 10) || null,
      volume: fields.VL || '',
      pages,
      doi: fields.DO || '',
      url: fields.UR || '',
      pub_type: pubType,
      raw_text: buildRawText({ authors: authorStr, title: fields.TI, journal: fields.JO, year: fields.PY }),
    });
  }

  return references;
}

/**
 * Map RIS type tags to our pub_type enum.
 */
function mapRISType(type) {
  const map = {
    JOUR: 'article',
    BOOK: 'book',
    CHAP: 'chapter',
    CONF: 'article',
    THES: 'article',
    ELEC: 'web',
    GEN: 'article',
    RPRT: 'article',
  };
  return map[type] || 'article';
}

/**
 * Build a raw formatted citation string for fallback display.
 */
function buildRawText(fields) {
  const parts = [];
  if (fields.authors) parts.push(fields.authors);
  if (fields.year) parts.push(`(${fields.year})`);
  if (fields.title) parts.push(cleanBibTeXValue(fields.title));
  if (fields.journal) parts.push(cleanBibTeXValue(fields.journal));
  return parts.join('. ').replace(/\.\./g, '.') || '';
}

/**
 * Detect file format from content or extension.
 */
function detectFormat(content, filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'bib') return 'bibtex';
  if (ext === 'ris') return 'ris';

  // Heuristic: BibTeX starts with @
  if (content.trim().startsWith('@')) return 'bibtex';
  // RIS has TY  - as the first tag
  if (/^TY\s*-/m.test(content)) return 'ris';

  return null;
}

/**
 * Main composable for bibliography parsing.
 */
export function useBibParser() {
  const parsedReferences = ref([]);
  const parseError = ref(null);

  /**
   * Parse a bibliography file.
   * @param {string} content - File content as string
   * @param {string} filename - Original filename (for format detection)
   * @returns {Array} Parsed reference objects
   */
  function parseBibliography(content, filename = '') {
    parseError.value = null;
    try {
      const format = detectFormat(content, filename);

      if (format === 'bibtex') {
        parsedReferences.value = parseBibTeX(content);
      } else if (format === 'ris') {
        parsedReferences.value = parseRIS(content);
      } else {
        throw new Error('Unrecognized bibliography format. Please use .bib (BibTeX) or .ris (RIS) files.');
      }

      // Number references sequentially
      parsedReferences.value.forEach((ref, i) => {
        ref.number = i + 1;
      });

      return parsedReferences.value;
    } catch (err) {
      parseError.value = err.message;
      throw err;
    }
  }

  /**
   * Parse a bibliography from a File object.
   * @param {File} file - Bibliography file
   * @returns {Promise<Array>} Parsed references
   */
  async function parseBibFile(file) {
    const content = await file.text();
    return parseBibliography(content, file.name);
  }

  return {
    parsedReferences,
    parseError,
    parseBibliography,
    parseBibFile,
  };
}

export default useBibParser;
