/**
 * Content Parser Composable
 *
 * Converts markdown, plain text, or DOCX-derived HTML into the app's
 * section/paragraph JSONB block structure.
 *
 * Output matches the paragraphs.content format: { blocks: [...] }
 * where each block has a type (heading, text, list, blockquote, code, image, citation_ref).
 */

import { ref } from 'vue';
import { toSlug } from '@/helper/general';

// Citation patterns: [^1], <sup>1</sup>, [1]
const CITATION_PATTERNS = /\[\^(\d+)\]|<sup>(\d+)<\/sup>|\[(\d+)\]/g;

/**
 * Extract citation references from text and split into mixed blocks.
 * Returns an array of blocks: text segments interleaved with citation_ref blocks.
 */
function extractCitations(text) {
  const blocks = [];
  const refs = new Set();
  let lastIndex = 0;

  const matches = [...text.matchAll(CITATION_PATTERNS)];
  if (matches.length === 0) {
    return { blocks: [{ type: 'text', content: text }], refs: [] };
  }

  for (const match of matches) {
    const num = parseInt(match[1] || match[2] || match[3], 10);
    refs.add(num);

    // Text before citation
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    blocks.push({ type: 'citation_ref', number: num });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last citation
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return { blocks, refs: [...refs] };
}

/**
 * Convert a single text string (possibly with citations) into paragraph blocks.
 */
function textToBlocks(text) {
  const { blocks, refs } = extractCitations(text.trim());

  // If no citations, return a single text block
  if (refs.length === 0) {
    return { blocks: [{ type: 'text', content: text.trim() }], citationRefs: [] };
  }

  return { blocks, citationRefs: refs };
}

/**
 * Parse markdown using the `marked` lexer into app block format.
 */
function parseMarkdownTokens(tokens) {
  const sections = [];
  let currentSection = null;
  const allCitationRefs = new Set();

  function ensureSection(title = 'Content') {
    if (!currentSection) {
      currentSection = {
        title,
        slug: toSlug(title),
        order_index: sections.length,
        paragraphs: [],
      };
      sections.push(currentSection);
    }
    return currentSection;
  }

  function addParagraph(content, opts = {}) {
    const section = ensureSection();
    section.paragraphs.push({
      content,
      content_text: extractPlainText(content),
      order_index: section.paragraphs.length,
      is_subsection_header: opts.is_subsection_header || false,
      subsection_level: opts.subsection_level || 0,
    });
  }

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        if (token.depth === 1) {
          // H1 — ignored (chapter title handled in Step 1)
          break;
        }
        if (token.depth === 2) {
          // H2 — new section
          currentSection = {
            title: token.text,
            slug: toSlug(token.text),
            order_index: sections.length,
            paragraphs: [],
          };
          sections.push(currentSection);
          break;
        }
        // H3+ — subsection headers within current section
        const { blocks, citationRefs } = textToBlocks(token.text);
        citationRefs.forEach(r => allCitationRefs.add(r));
        addParagraph(
          { blocks: [{ type: 'heading', level: token.depth, content: token.text }] },
          {
            is_subsection_header: true,
            subsection_level: token.depth - 2,
          }
        );
        break;
      }

      case 'paragraph': {
        const { blocks, citationRefs } = textToBlocks(token.text);
        citationRefs.forEach(r => allCitationRefs.add(r));
        addParagraph({ blocks });
        break;
      }

      case 'list': {
        const items = token.items.map(item => item.text);
        addParagraph({
          blocks: [{ type: 'list', ordered: token.ordered, items }],
        });
        break;
      }

      case 'blockquote': {
        const innerText = token.tokens
          ? token.tokens.map(t => t.text || t.raw || '').join('\n')
          : token.text || token.raw || '';
        addParagraph({
          blocks: [{ type: 'blockquote', content: innerText }],
        });
        break;
      }

      case 'code': {
        addParagraph({
          blocks: [{ type: 'code', content: token.text, lang: token.lang || '' }],
        });
        break;
      }

      case 'space':
        // Skip empty lines
        break;

      case 'html': {
        // Check for images in HTML
        const imgMatch = token.text.match(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/);
        if (imgMatch) {
          addParagraph({
            blocks: [{ type: 'image', src: imgMatch[1], alt: imgMatch[2] }],
          });
        } else {
          // Treat other HTML as text
          addParagraph({ blocks: [{ type: 'text', content: token.text }] });
        }
        break;
      }

      default:
        // For any unrecognized token, try to extract text
        if (token.text || token.raw) {
          addParagraph({
            blocks: [{ type: 'text', content: token.text || token.raw }],
          });
        }
        break;
    }
  }

  return { sections, citationRefs: [...allCitationRefs] };
}

/**
 * Extract plain text from a content block structure (for content_text field).
 */
function extractPlainText(content) {
  if (!content || !content.blocks) return '';
  return content.blocks
    .map(block => {
      if (block.type === 'citation_ref') return '';
      if (block.type === 'list') return (block.items || []).join(' ');
      return block.content || '';
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse plain text (no markdown headings) into sections.
 * Uses heuristics: ALL CAPS lines or underlined lines become section titles.
 * Double newlines separate paragraphs.
 */
function parsePlainText(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;
  let currentParagraph = '';
  const allCitationRefs = new Set();

  function ensureSection(title = 'Content') {
    if (!currentSection) {
      currentSection = {
        title,
        slug: toSlug(title),
        order_index: sections.length,
        paragraphs: [],
      };
      sections.push(currentSection);
    }
    return currentSection;
  }

  function flushParagraph() {
    if (currentParagraph.trim()) {
      const section = ensureSection();
      const { blocks, citationRefs } = textToBlocks(currentParagraph.trim());
      citationRefs.forEach(r => allCitationRefs.add(r));
      section.paragraphs.push({
        content: { blocks },
        content_text: currentParagraph.trim().replace(CITATION_PATTERNS, '').replace(/\s+/g, ' ').trim(),
        order_index: section.paragraphs.length,
        is_subsection_header: false,
        subsection_level: 0,
      });
    }
    currentParagraph = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    const trimmed = line.trim();

    // Check for underline-style headings (=== or ---)
    if (nextLine.match(/^={3,}\s*$/) || nextLine.match(/^-{3,}\s*$/)) {
      flushParagraph();
      currentSection = {
        title: trimmed,
        slug: toSlug(trimmed),
        order_index: sections.length,
        paragraphs: [],
      };
      sections.push(currentSection);
      i++; // skip the underline
      continue;
    }

    // Check for ALL CAPS lines (likely section headers)
    if (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      flushParagraph();
      currentSection = {
        title: trimmed.charAt(0) + trimmed.slice(1).toLowerCase(),
        slug: toSlug(trimmed),
        order_index: sections.length,
        paragraphs: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Empty line — paragraph break
    if (trimmed === '') {
      flushParagraph();
      continue;
    }

    // Normal line — accumulate
    currentParagraph += (currentParagraph ? '\n' : '') + line;
  }

  flushParagraph();

  // If no sections were created, wrap everything in a single section
  if (sections.length === 0) {
    return { sections: [{ title: 'Content', slug: 'content', order_index: 0, paragraphs: [] }], citationRefs: [] };
  }

  return { sections, citationRefs: [...allCitationRefs] };
}

/**
 * Main composable: provides reactive parsing functions.
 */
export function useContentParser() {
  const parsedSections = ref([]);
  const citationRefs = ref([]);
  const parseError = ref(null);

  /**
   * Parse markdown content into sections and paragraphs.
   * @param {string} markdown - Raw markdown string
   * @returns {{ sections: Array, citationRefs: number[] }}
   */
  async function parseMarkdown(markdown) {
    parseError.value = null;
    try {
      const { marked } = await import('marked');
      const tokens = marked.lexer(markdown);
      const result = parseMarkdownTokens(tokens);
      parsedSections.value = result.sections;
      citationRefs.value = result.citationRefs;
      return result;
    } catch (err) {
      parseError.value = err.message;
      throw err;
    }
  }

  /**
   * Parse plain text content.
   * @param {string} text - Raw plain text
   * @returns {{ sections: Array, citationRefs: number[] }}
   */
  function parseText(text) {
    parseError.value = null;
    try {
      const result = parsePlainText(text);
      parsedSections.value = result.sections;
      citationRefs.value = result.citationRefs;
      return result;
    } catch (err) {
      parseError.value = err.message;
      throw err;
    }
  }

  /**
   * Parse DOCX file via mammoth → HTML → markdown path.
   * @param {File} file - DOCX File object
   * @returns {{ sections: Array, citationRefs: number[] }}
   */
  async function parseDocx(file) {
    parseError.value = null;
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      // Convert mammoth HTML output to a simple markdown-like structure
      const html = result.value;
      const markdown = htmlToSimpleMarkdown(html);
      return parseMarkdown(markdown);
    } catch (err) {
      parseError.value = err.message;
      throw err;
    }
  }

  /**
   * Auto-detect content type and parse accordingly.
   * If content contains markdown heading syntax (## ), parse as markdown.
   * Otherwise parse as plain text.
   */
  async function autoParse(content) {
    const hasMarkdownHeadings = /^#{1,6}\s/m.test(content);
    if (hasMarkdownHeadings) {
      return parseMarkdown(content);
    }
    return parseText(content);
  }

  return {
    parsedSections,
    citationRefs,
    parseError,
    parseMarkdown,
    parseText,
    parseDocx,
    autoParse,
    extractPlainText,
  };
}

/**
 * Convert HTML (from mammoth) to simple markdown for re-parsing.
 */
function htmlToSimpleMarkdown(html) {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');

  // Bold/italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');

  // Links
  md = md.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Images
  md = md.replace(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');

  // Superscript (citations)
  // Keep <sup> tags — the parser detects them

  // Strip remaining HTML tags except <sup>
  md = md.replace(/<(?!\/?sup)[^>]+>/g, '');

  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

export default useContentParser;
