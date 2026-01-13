<script setup>
import { computed } from "vue";

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  highlights: {
    type: Array,
    default: () => [],
  },
  paragraphId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["highlight-click"]);

// Get color class for a highlight
function getColorClass(color) {
  const colors = {
    yellow: "bg-yellow-200 hover:bg-yellow-300",
    green: "bg-green-200 hover:bg-green-300",
    blue: "bg-blue-200 hover:bg-blue-300",
    pink: "bg-pink-200 hover:bg-pink-300",
    purple: "bg-purple-200 hover:bg-purple-300",
  };
  return colors[color] || colors.yellow;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Generate highlighted HTML
const highlightedHtml = computed(() => {
  if (!props.text) return "";

  if (!props.highlights || props.highlights.length === 0) {
    return escapeHtml(props.text);
  }

  // Filter out invalid highlights and sort by start_offset
  const validHighlights = props.highlights
    .filter(
      (h) =>
        h.start_offset >= 0 &&
        h.end_offset <= props.text.length &&
        h.start_offset < h.end_offset
    )
    .sort((a, b) => a.start_offset - b.start_offset);

  if (validHighlights.length === 0) {
    return escapeHtml(props.text);
  }

  // Handle overlapping highlights by merging or prioritizing
  const mergedHighlights = [];
  for (const h of validHighlights) {
    const last = mergedHighlights[mergedHighlights.length - 1];

    if (last && h.start_offset < last.end_offset) {
      // Overlapping - extend the previous highlight if needed
      if (h.end_offset > last.end_offset) {
        last.end_offset = h.end_offset;
      }
    } else {
      mergedHighlights.push({ ...h });
    }
  }

  let result = "";
  let lastEnd = 0;

  for (const highlight of mergedHighlights) {
    // Add text before highlight
    if (highlight.start_offset > lastEnd) {
      result += escapeHtml(props.text.slice(lastEnd, highlight.start_offset));
    }

    // Add highlighted text
    const colorClass = getColorClass(highlight.color);
    const highlightedText = escapeHtml(
      props.text.slice(highlight.start_offset, highlight.end_offset)
    );

    result += `<mark class="${colorClass} cursor-pointer rounded-sm px-0.5 transition-colors" data-highlight-id="${highlight.id}">${highlightedText}</mark>`;

    lastEnd = highlight.end_offset;
  }

  // Add remaining text after last highlight
  if (lastEnd < props.text.length) {
    result += escapeHtml(props.text.slice(lastEnd));
  }

  return result;
});

// Handle click on highlighted text
function handleClick(event) {
  const highlightId = event.target.dataset?.highlightId;
  if (highlightId) {
    const highlight = props.highlights.find((h) => h.id === highlightId);
    if (highlight) {
      emit("highlight-click", highlight);
    }
  }
}
</script>

<template>
  <span
    class="highlight-renderer"
    v-html="highlightedHtml"
    @click="handleClick"
  ></span>
</template>

<style>
/* Mark styles - using global styles since they're in v-html */
.highlight-renderer mark {
  background-color: inherit;
  padding: 0.125rem 0.25rem;
  border-radius: 0.125rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.highlight-renderer mark:hover {
  opacity: 0.85;
}

.highlight-renderer mark.bg-yellow-200 {
  background-color: #fef08a;
}
.highlight-renderer mark.bg-yellow-200:hover,
.highlight-renderer mark.hover\:bg-yellow-300:hover {
  background-color: #fde047;
}

.highlight-renderer mark.bg-green-200 {
  background-color: #bbf7d0;
}
.highlight-renderer mark.bg-green-200:hover,
.highlight-renderer mark.hover\:bg-green-300:hover {
  background-color: #86efac;
}

.highlight-renderer mark.bg-blue-200 {
  background-color: #bfdbfe;
}
.highlight-renderer mark.bg-blue-200:hover,
.highlight-renderer mark.hover\:bg-blue-300:hover {
  background-color: #93c5fd;
}

.highlight-renderer mark.bg-pink-200 {
  background-color: #fbcfe8;
}
.highlight-renderer mark.bg-pink-200:hover,
.highlight-renderer mark.hover\:bg-pink-300:hover {
  background-color: #f9a8d4;
}

.highlight-renderer mark.bg-purple-200 {
  background-color: #ddd6fe;
}
.highlight-renderer mark.bg-purple-200:hover,
.highlight-renderer mark.hover\:bg-purple-300:hover {
  background-color: #c4b5fd;
}
</style>
