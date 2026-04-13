import { watch, nextTick } from "vue";

/**
 * useHighlightRenderer
 *
 * Applies visual highlight <mark> overlays to paragraph DOM elements
 * based on character offsets stored in highlightsByParagraph.
 *
 * Works with HTML content (bold, italic, links, etc.) by walking
 * text nodes in the DOM — the same way useTextSelection computes offsets.
 */

const COLOR_MAP = {
  yellow: "#fef08a",
  green: "#bbf7d0",
  blue: "#bfdbfe",
  pink: "#fbcfe8",
  purple: "#ddd6fe",
};

const COLOR_HOVER_MAP = {
  yellow: "#fde047",
  green: "#86efac",
  blue: "#93c5fd",
  pink: "#f9a8d4",
  purple: "#c4b5fd",
};

/**
 * Given a container element and a character offset, find the text node
 * and local offset within that node.
 */
function findTextNodeAtOffset(container, targetOffset) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );

  let charCount = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nodeLength = node.textContent.length;

    if (charCount + nodeLength >= targetOffset) {
      return { node, offset: targetOffset - charCount };
    }
    charCount += nodeLength;
  }

  // Fallback: return last text node at its end
  const lastNode = walker.currentNode || container;
  return { node: lastNode, offset: lastNode.textContent?.length || 0 };
}

/**
 * Remove all existing highlight marks from a paragraph element.
 */
function clearHighlightMarks(paragraphEl) {
  const marks = paragraphEl.querySelectorAll("mark[data-hl-id]");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize(); // Merge adjacent text nodes
  });
}

/**
 * Collect all text nodes within a container that fall within the given
 * character offset range, along with their local start/end slice positions.
 */
function getTextNodesInRange(container, startOffset, endOffset) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );

  const result = [];
  let charCount = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nodeLen = node.textContent.length;
    const nodeStart = charCount;
    const nodeEnd = charCount + nodeLen;

    // Check if this text node overlaps with the highlight range
    if (nodeEnd > startOffset && nodeStart < endOffset) {
      result.push({
        node,
        // Clamp to the portion of this node that falls in range
        sliceStart: Math.max(0, startOffset - nodeStart),
        sliceEnd: Math.min(nodeLen, endOffset - nodeStart),
      });
    }

    charCount += nodeLen;
    if (charCount >= endOffset) break;
  }

  return result;
}

/**
 * Apply a single highlight to a paragraph element.
 * Wraps each affected text node individually so block elements
 * (h2, p, etc.) are never reparented inside an inline <mark>.
 */
function applyHighlightToDOM(paragraphEl, highlight) {
  const { start_offset, end_offset, color, id } = highlight;
  const bgColor = COLOR_MAP[color] || COLOR_MAP.yellow;
  const hoverColor = COLOR_HOVER_MAP[color] || COLOR_HOVER_MAP.yellow;

  try {
    const textNodes = getTextNodesInRange(paragraphEl, start_offset, end_offset);

    for (const { node, sliceStart, sliceEnd } of textNodes) {
      // Split the text node to isolate the highlighted portion
      // Work backwards so offsets stay valid: split end first, then start
      let targetNode = node;

      if (sliceEnd < targetNode.textContent.length) {
        targetNode.splitText(sliceEnd);
      }
      if (sliceStart > 0) {
        targetNode = targetNode.splitText(sliceStart);
      }

      // Wrap the isolated text node in a <mark>
      const mark = createMarkElement(id, bgColor, hoverColor, highlight);
      targetNode.parentNode.insertBefore(mark, targetNode);
      mark.appendChild(targetNode);
    }
  } catch (e) {
    console.warn("useHighlightRenderer: Could not apply highlight", id, e.message);
  }
}

function createMarkElement(id, bgColor, hoverColor, highlight) {
  const mark = document.createElement("mark");
  mark.setAttribute("data-hl-id", id);
  mark.setAttribute("data-hl-color", highlight.color || "yellow");
  mark.style.backgroundColor = bgColor;
  mark.style.borderRadius = "2px";
  mark.style.padding = "0 1px";
  mark.style.cursor = "pointer";
  mark.style.transition = "background-color 0.15s ease";

  // Hover effect via event listeners
  mark.addEventListener("mouseenter", () => {
    mark.style.backgroundColor = hoverColor;
  });
  mark.addEventListener("mouseleave", () => {
    mark.style.backgroundColor = bgColor;
  });

  // Click handler — dispatches custom event for edit toolbar
  mark.addEventListener("click", (e) => {
    e.stopPropagation();

    // Get bounding rect of the first mark segment with this ID
    const allSegments = document.querySelectorAll(`mark[data-hl-id="${id}"]`);
    const firstSegment = allSegments[0] || mark;
    const rect = firstSegment.getBoundingClientRect();

    document.dispatchEvent(
      new CustomEvent("highlight-click", {
        detail: {
          id: highlight.id,
          color: highlight.color,
          note: highlight.note,
          tags: highlight.tags || [],
          selected_text: highlight.selected_text,
          paragraph_id: highlight.paragraph_id,
          is_public: highlight.is_public,
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          },
        },
      }),
    );
  });

  return mark;
}

/**
 * Apply all highlights for a single paragraph element.
 * Highlights must be sorted by start_offset ascending.
 * Applied in reverse order to preserve earlier offsets.
 */
function applyHighlightsToParagraph(paragraphEl, highlights) {
  // Clear any previously rendered highlight marks first
  clearHighlightMarks(paragraphEl);

  if (!highlights || highlights.length === 0) return;

  // Sort by start_offset and apply in reverse so offsets stay valid
  const sorted = [...highlights].sort((a, b) => a.start_offset - b.start_offset);
  const reversed = sorted.reverse();

  for (const highlight of reversed) {
    applyHighlightToDOM(paragraphEl, highlight);
  }
}

/**
 * Main composable: watches highlightsByParagraph and applies marks to the DOM.
 *
 * @param {import('vue').ComputedRef<Object>} highlightsByParagraph - { [paragraphId]: Highlight[] }
 */
export function useHighlightRenderer(highlightsByParagraph) {
  function renderAllHighlights() {
    const grouped = highlightsByParagraph.value;
    if (!grouped) return;

    // Find all paragraph elements in the page
    const paragraphEls = document.querySelectorAll("[data-paragraph-id]");

    paragraphEls.forEach((el) => {
      const pId = el.dataset.paragraphId;
      const highlights = grouped[pId];

      if (highlights && highlights.length > 0) {
        applyHighlightsToParagraph(el, highlights);
      } else {
        // Clear any stale marks
        clearHighlightMarks(el);
      }
    });
  }

  // Watch for changes and re-render after DOM updates
  watch(
    highlightsByParagraph,
    () => {
      nextTick(() => {
        renderAllHighlights();
      });
    },
    { deep: true },
  );

  return {
    renderAllHighlights,
    clearHighlightMarks,
  };
}
