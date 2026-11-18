/* Read the prose DOM, never the surrounding reader/figure UI. No mutations,
 * layout reads or speech side effects: callers choose the starting passage. */
const OMIT =
  'script, style, button, input, select, textarea, nav, figure, figcaption, [hidden], [aria-hidden="true"], .sr-only, [data-reader-end], .chapter-front-credits, .reference-list, .ref-list-box, [data-section-slug="references"], .footnotes, .illustration-inline, [data-listen-skip]';
const HEADING = "h1, h2.subChapter, h3.subT, .bx-title, .rp-title";

function proseText(element) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll(OMIT).forEach((node) => node.remove());
  // Citation superscripts only: keep scientific powers such as x².
  copy.querySelectorAll("sup").forEach((node) => {
    if (/^[\s\d,;[\]()–—-]+$/.test(node.textContent)) node.remove();
  });
  copy.querySelectorAll("br").forEach((node) => node.replaceWith(" "));
  copy.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6").forEach((node) => {
    node.append(" ");
  });
  return (copy.textContent || "").replace(/\s+/g, " ").trim();
}

/** Entries retain their source element for highlighting and readerJump. A
 * desktop box is teleported out of #text: visit it at its in-flow slot. */
export function extractChapterSpeech(root, { includeBoxes = true } = {}) {
  if (!root) return [];
  const entries = [];
  const visited = new Set();
  const walk = (element) => {
    if (visited.has(element) || element.matches(OMIT)) return;
    visited.add(element);
    const boxId = element.getAttribute("data-listen-box-slot");
    if (boxId !== null) {
      if (!includeBoxes) return;
      const box = [
        ...root.ownerDocument.querySelectorAll("[data-breakout-box]"),
      ].find((node) => node.getAttribute("data-breakout-box") === boxId);
      if (box) {
        walk(box);
        return;
      }
    }
    if (!includeBoxes && element.matches("[data-breakout-box], .bx")) return;
    if (element.matches("[data-paragraph-id], " + HEADING)) {
      const text = proseText(element);
      if (text)
        entries.push({
          element,
          text,
          kind: element.matches(HEADING) ? "heading" : "paragraph",
        });
      return;
    }
    for (const child of element.children) walk(child);
  };
  walk(root);
  return entries;
}

/** First passage intersecting the reading line, otherwise the next one.
 * Rects are supplied so this choice stays pure and testable. */
export function speechStartIndex(rects, line) {
  const index = rects.findIndex((rect) => rect.bottom > line);
  return index < 0 ? Math.max(0, rects.length - 1) : index;
}

/** Sentence-sized utterances, bounded even for long unpunctuated prose.
 * Keep a strong reference to each one in the player until it ends (Safari). */
export function speechChunks(text, limit = 220) {
  const sentences = text.match(/[\s\S]+?(?:[.!?]+(?=\s|$)|$)/g) || [text];
  return sentences.flatMap((sentence) => {
    const chunks = [];
    let rest = sentence.trim();
    while (rest.length > limit) {
      const space = rest.lastIndexOf(" ", limit);
      const cut = space > limit / 2 ? space : limit;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
  });
}
