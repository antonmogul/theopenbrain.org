import { ref, onMounted, onUnmounted } from "vue";

export function useTextSelection(containerSelector = "[data-paragraph-id]") {
  const selection = ref(null);
  const toolbarPosition = ref({ x: 0, y: 0 });
  const showToolbar = ref(false);

  // Get character offset within a container element
  function getTextOffset(container, node, offset) {
    // If the node is not inside the container, return 0
    if (!container.contains(node)) {
      return 0;
    }

    // Walk the DOM to calculate character offset
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let charCount = 0;

    while (walker.nextNode()) {
      if (walker.currentNode === node) {
        return charCount + offset;
      }
      charCount += walker.currentNode.textContent.length;
    }

    // If node not found, try parent approach
    if (node.nodeType === Node.ELEMENT_NODE) {
      // For element nodes, count all preceding text
      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(node, offset);
      return range.toString().length;
    }

    return offset;
  }

  // Find the paragraph element containing the selection
  function findParagraphElement(node) {
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    while (element && !element.dataset?.paragraphId) {
      element = element.parentElement;
    }

    return element;
  }

  // Handle mouse up event for text selection
  function handleMouseUp(event) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const sel = window.getSelection();

      if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        // No valid selection
        hideToolbar();
        return;
      }

      try {
        const range = sel.getRangeAt(0);
        const text = sel.toString().trim();

        if (text.length === 0) {
          hideToolbar();
          return;
        }

        // Find the paragraph element for start of selection
        const paragraphEl = findParagraphElement(range.startContainer);
        const endParagraphEl = findParagraphElement(range.endContainer);

        // Only allow selection within a single paragraph
        if (!paragraphEl || paragraphEl !== endParagraphEl) {
          hideToolbar();
          return;
        }

        // Calculate offsets relative to paragraph text content
        const startOffset = getTextOffset(
          paragraphEl,
          range.startContainer,
          range.startOffset
        );
        const endOffset = startOffset + text.length;

        // Validate offsets
        const paragraphText = paragraphEl.textContent;
        if (startOffset < 0 || endOffset > paragraphText.length) {
          console.warn("useTextSelection: Invalid offsets", {
            startOffset,
            endOffset,
            textLength: paragraphText.length,
          });
          hideToolbar();
          return;
        }

        selection.value = {
          text,
          paragraphId: paragraphEl.dataset.paragraphId,
          paragraphElement: paragraphEl,
          startOffset,
          endOffset,
          range,
        };

        // Position toolbar above selection
        const rect = range.getBoundingClientRect();
        const toolbarWidth = 220; // Approximate width of toolbar

        // Center horizontally, but keep within viewport
        let x = rect.left + rect.width / 2 - toolbarWidth / 2;
        x = Math.max(10, Math.min(x, window.innerWidth - toolbarWidth - 10));

        // Position above selection with some padding
        let y = rect.top - 50 + window.scrollY;
        // If too close to top, position below
        if (rect.top < 60) {
          y = rect.bottom + 10 + window.scrollY;
        }

        toolbarPosition.value = { x, y };
        showToolbar.value = true;
      } catch (e) {
        console.error("useTextSelection: Error processing selection:", e);
        hideToolbar();
      }
    }, 10);
  }

  // Handle click outside to close toolbar
  function handleClickOutside(event) {
    // Check if click is on the toolbar itself
    const toolbar = document.querySelector("[data-highlight-toolbar]");
    if (toolbar && toolbar.contains(event.target)) {
      return;
    }

    // Check if clicking on a highlight (mark element)
    if (event.target.tagName === "MARK" && event.target.dataset?.highlightId) {
      return;
    }

    // Hide if clicking outside selection area
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      hideToolbar();
    }
  }

  // Clear selection and hide toolbar
  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    hideToolbar();
  }

  // Hide toolbar without clearing selection
  function hideToolbar() {
    showToolbar.value = false;
    selection.value = null;
  }

  // Setup event listeners
  onMounted(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleClickOutside);
    // Also handle keyboard selection
    document.addEventListener("keyup", (e) => {
      if (e.shiftKey) {
        handleMouseUp(e);
      }
    });
  });

  // Cleanup event listeners
  onUnmounted(() => {
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("mousedown", handleClickOutside);
  });

  return {
    selection,
    toolbarPosition,
    showToolbar,
    clearSelection,
    hideToolbar,
  };
}
