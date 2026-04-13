import { ref, computed, onMounted, onUnmounted } from "vue";

export function useTextSelection(containerSelector = "[data-paragraph-id]") {
  const selection = ref(null);
  const toolbarPosition = ref({ x: 0, y: 0 });
  const showToolbar = ref(false);

  // Edit mode: the existing highlight being edited (null = create mode)
  const activeHighlight = ref(null);

  // Derived mode for the toolbar
  const toolbarMode = computed(() =>
    activeHighlight.value ? "edit" : "create",
  );

  // Get character offset within a container element
  function getTextOffset(container, node, offset) {
    if (!container.contains(node)) {
      return 0;
    }

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );

    let charCount = 0;

    while (walker.nextNode()) {
      if (walker.currentNode === node) {
        return charCount + offset;
      }
      charCount += walker.currentNode.textContent.length;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
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

  // Position the toolbar given a bounding rect
  function positionToolbar(rect) {
    const toolbarWidth = 300;

    let x = rect.left + rect.width / 2 - toolbarWidth / 2;
    x = Math.max(10, Math.min(x, window.innerWidth - toolbarWidth - 10));

    // Position below the element for edit mode (Readwise-style)
    let y = rect.bottom + 8 + window.scrollY;

    // If not enough room below, position above
    if (rect.bottom + 200 > window.innerHeight) {
      y = rect.top - 50 + window.scrollY;
    }

    toolbarPosition.value = { x, y };
  }

  // Handle click on an existing highlight <mark>
  function handleHighlightClick(event) {
    const detail = event.detail;
    if (!detail?.id) return;

    // Clear any text selection (mutually exclusive with edit mode)
    window.getSelection()?.removeAllRanges();
    selection.value = null;

    activeHighlight.value = {
      id: detail.id,
      color: detail.color,
      note: detail.note,
      tags: detail.tags || [],
      selected_text: detail.selected_text,
      paragraph_id: detail.paragraph_id,
      is_public: detail.is_public,
    };

    positionToolbar(detail.rect);
    showToolbar.value = true;
  }

  // Handle mouse up event for text selection
  function handleMouseUp(event) {
    // Ignore mouse up on the highlight toolbar or its children
    const toolbar = document.querySelector("[data-highlight-toolbar]");
    if (toolbar && toolbar.contains(event.target)) {
      return;
    }

    // If clicking on a <mark>, let the highlight-click handler deal with it
    const markEl = event.target.closest("mark[data-hl-id]");
    if (markEl) {
      return;
    }

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const sel = window.getSelection();

      if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        // No valid selection — don't hide if edit toolbar is showing
        if (!activeHighlight.value) {
          hideToolbar();
        }
        return;
      }

      try {
        const range = sel.getRangeAt(0);
        const text = sel.toString().trim();

        if (text.length === 0) {
          hideToolbar();
          return;
        }

        const paragraphEl = findParagraphElement(range.startContainer);
        const endParagraphEl = findParagraphElement(range.endContainer);

        if (!paragraphEl || paragraphEl !== endParagraphEl) {
          hideToolbar();
          return;
        }

        const startOffset = getTextOffset(
          paragraphEl,
          range.startContainer,
          range.startOffset,
        );
        const endOffset = startOffset + text.length;

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

        // Clear edit mode (mutually exclusive with create mode)
        activeHighlight.value = null;

        selection.value = {
          text,
          paragraphId: paragraphEl.dataset.paragraphId,
          paragraphElement: paragraphEl,
          startOffset,
          endOffset,
          range,
        };

        // Position toolbar above selection for create mode
        const rect = range.getBoundingClientRect();
        const toolbarWidth = 300;

        let x = rect.left + rect.width / 2 - toolbarWidth / 2;
        x = Math.max(10, Math.min(x, window.innerWidth - toolbarWidth - 10));

        let y = rect.top - 50 + window.scrollY;
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
    const toolbar = document.querySelector("[data-highlight-toolbar]");
    if (toolbar && toolbar.contains(event.target)) {
      return;
    }

    // If clicking on a highlight mark, don't dismiss — the click handler will open edit mode
    const markEl = event.target.closest("mark[data-hl-id]");
    if (markEl) {
      return;
    }

    // Hide toolbar on any click outside
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
    activeHighlight.value = null;
  }

  // Setup event listeners
  onMounted(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("highlight-click", handleHighlightClick);
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
    document.removeEventListener("highlight-click", handleHighlightClick);
  });

  return {
    selection,
    toolbarPosition,
    showToolbar,
    activeHighlight,
    toolbarMode,
    clearSelection,
    hideToolbar,
  };
}
