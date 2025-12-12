/**
 * Chapters Store
 *
 * Manages chapter/module state for the dashboard.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import chaptersApi from '@/services/api/chapters';
import { READING_SPEED_WPM, BLOCK_TYPES } from '@/constants/dashboard';

export const useChaptersStore = defineStore('dashboardChapters', () => {
  // State
  const chapters = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Expanded chapter state
  const expandedChapterId = ref(null);
  const sections = ref([]);
  const paragraphs = ref([]);
  const flatBlocks = ref([]);

  // Editor state
  const selectedBlock = ref(null);
  const saving = ref(false);
  const saveStatus = ref('');

  // Drag and drop state
  const draggedBlockId = ref(null);
  const dragOverBlockId = ref(null);

  // Scroll sync
  const highlightedBlockId = ref(null);

  // Getters
  const expandedChapter = computed(() =>
    chapters.value.find(c => c.id === expandedChapterId.value)
  );

  const chapterStats = computed(() => {
    if (!expandedChapter.value) return null;

    const sectionCount = sections.value.length;
    const paragraphCount = flatBlocks.value.filter(b => b.type === BLOCK_TYPES.PARAGRAPH).length;
    const wordCount = paragraphs.value.reduce((sum, p) => {
      const text = p.content_text || '';
      return sum + text.split(/\s+/).filter(Boolean).length;
    }, 0);

    return {
      sections: sectionCount,
      paragraphs: paragraphCount,
      words: wordCount,
      readingTime: Math.ceil(wordCount / READING_SPEED_WPM),
    };
  });

  // Actions
  async function fetchChapters() {
    loading.value = true;
    error.value = null;

    try {
      chapters.value = await chaptersApi.fetchChapters();
    } catch (err) {
      console.error('Error fetching chapters:', err);
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function toggleChapter(chapterId) {
    if (expandedChapterId.value === chapterId) {
      // Collapse
      expandedChapterId.value = null;
      sections.value = [];
      paragraphs.value = [];
      flatBlocks.value = [];
      selectedBlock.value = null;
      return;
    }

    // Expand new chapter
    expandedChapterId.value = chapterId;
    selectedBlock.value = null;
    await fetchChapterContent(chapterId);
  }

  async function fetchChapterContent(moduleId) {
    try {
      const content = await chaptersApi.fetchChapterContent(moduleId);
      sections.value = content.sections;
      paragraphs.value = content.paragraphs;
      buildFlatBlocks();
    } catch (err) {
      console.error('Error fetching chapter content:', err);
      error.value = err.message;
    }
  }

  function buildFlatBlocks() {
    const blocks = [];

    sections.value.forEach((section, sectionIndex) => {
      // Add section as a block
      blocks.push({
        type: BLOCK_TYPES.SECTION,
        id: section.id,
        title: section.title,
        slug: section.slug,
        depth: 0,
        sectionId: section.id,
        sectionIndex,
        orderIndex: section.order_index,
      });

      // Add paragraphs for this section
      const sectionParagraphs = paragraphs.value
        .filter(p => p.section_id === section.id)
        .sort((a, b) => a.order_index - b.order_index);

      sectionParagraphs.forEach((p, paraIndex) => {
        const wordCount = (p.content_text || '').split(/\s+/).filter(Boolean).length;
        const jsonBlocks = p.content?.blocks || [];
        const htmlContent = blocksToHtml(jsonBlocks);

        blocks.push({
          type: BLOCK_TYPES.PARAGRAPH,
          id: p.id,
          content: p.content,
          contentText: p.content_text,
          htmlContent,
          preview: getBlockPreview(p),
          depth: 1,
          sectionId: section.id,
          sectionTitle: section.title,
          orderIndex: p.order_index,
          paraIndex,
          isSubsectionHeader: p.is_subsection_header,
          wordCount,
        });
      });
    });

    flatBlocks.value = blocks;
  }

  function getBlockPreview(paragraph) {
    const text = paragraph.content_text || '';
    const stripped = text.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 60 ? stripped.slice(0, 60) + '...' : stripped;
  }

  function selectBlock(block) {
    if (block.type === BLOCK_TYPES.SECTION) return;

    selectedBlock.value = block;
    saveStatus.value = '';
  }

  function clearSelection() {
    selectedBlock.value = null;
    saveStatus.value = '';
  }

  async function saveBlock(content) {
    if (!selectedBlock.value) return;

    saving.value = true;
    saveStatus.value = '';

    try {
      const blocks = htmlToBlocks(content);
      const contentText = blocks
        .map(b => b.content || b.items?.join(' ') || '')
        .join(' ')
        .replace(/<[^>]*>/g, '');

      await chaptersApi.updateParagraph(selectedBlock.value.id, {
        content: { blocks },
        content_text: contentText,
      });

      saveStatus.value = 'Saved!';

      // Update local state
      selectedBlock.value.content = { blocks };
      selectedBlock.value.contentText = contentText;
      selectedBlock.value.preview = getBlockPreview({ content_text: contentText });

      // Refresh content
      await fetchChapterContent(expandedChapterId.value);

      // Re-select the block
      const updatedBlock = flatBlocks.value.find(b => b.id === selectedBlock.value.id);
      if (updatedBlock) {
        selectedBlock.value = updatedBlock;
      }

      // Refresh chapter stats
      await fetchChapters();
    } catch (err) {
      console.error('Error saving block:', err);
      saveStatus.value = 'Error: ' + err.message;
    } finally {
      saving.value = false;
    }
  }

  async function reorderBlocks(draggedBlock, targetBlock) {
    if (!draggedBlock || targetBlock.type === BLOCK_TYPES.SECTION) return;
    if (draggedBlock.sectionId !== targetBlock.sectionId) return;

    const sectionBlocks = flatBlocks.value
      .filter(b => b.type === BLOCK_TYPES.PARAGRAPH && b.sectionId === targetBlock.sectionId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const draggedIndex = sectionBlocks.findIndex(b => b.id === draggedBlock.id);
    const targetIndex = sectionBlocks.findIndex(b => b.id === targetBlock.id);

    if (draggedIndex === targetIndex) return;

    // Reorder in array
    sectionBlocks.splice(draggedIndex, 1);
    sectionBlocks.splice(targetIndex, 0, draggedBlock);

    // Build update list
    const updates = sectionBlocks
      .map((block, index) => ({ id: block.id, order_index: index }))
      .filter((update, index) => sectionBlocks[index].orderIndex !== index);

    try {
      await chaptersApi.reorderParagraphs(updates);
      await fetchChapterContent(expandedChapterId.value);
    } catch (err) {
      console.error('Error reordering blocks:', err);
    }
  }

  // Reset state
  function reset() {
    chapters.value = [];
    loading.value = false;
    error.value = null;
    expandedChapterId.value = null;
    sections.value = [];
    paragraphs.value = [];
    flatBlocks.value = [];
    selectedBlock.value = null;
    saving.value = false;
    saveStatus.value = '';
    draggedBlockId.value = null;
    dragOverBlockId.value = null;
    highlightedBlockId.value = null;
  }

  return {
    // State
    chapters,
    loading,
    error,
    expandedChapterId,
    sections,
    paragraphs,
    flatBlocks,
    selectedBlock,
    saving,
    saveStatus,
    draggedBlockId,
    dragOverBlockId,
    highlightedBlockId,

    // Getters
    expandedChapter,
    chapterStats,

    // Actions
    fetchChapters,
    toggleChapter,
    fetchChapterContent,
    buildFlatBlocks,
    selectBlock,
    clearSelection,
    saveBlock,
    reorderBlocks,
    reset,
  };
});

// Helper functions for HTML/JSONB conversion
export function blocksToHtml(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';

  return blocks.map(block => {
    switch (block.type) {
      case 'heading':
        const level = block.level || 2;
        return `<h${level}>${block.content || ''}</h${level}>`;
      case 'paragraph':
      case 'text':
        return `<p>${block.content || ''}</p>`;
      case 'list':
        const items = (block.items || []).map(item => `<li>${item}</li>`).join('');
        return block.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      case 'blockquote':
        return `<blockquote><p>${block.content || ''}</p></blockquote>`;
      case 'code':
        return `<pre><code>${block.content || ''}</code></pre>`;
      case 'image':
        return `<img src="${block.src || ''}" alt="${block.alt || ''}" />`;
      default:
        return `<p>${block.content || ''}</p>`;
    }
  }).join('\n');
}

export function htmlToBlocks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks = [];

  doc.body.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      if (tagName.match(/^h[1-6]$/)) {
        blocks.push({
          type: 'heading',
          level: parseInt(tagName[1]),
          content: node.textContent,
        });
      } else if (tagName === 'p') {
        blocks.push({
          type: 'paragraph',
          content: node.innerHTML,
        });
      } else if (tagName === 'ul') {
        blocks.push({
          type: 'list',
          ordered: false,
          items: Array.from(node.querySelectorAll('li')).map(li => li.textContent),
        });
      } else if (tagName === 'ol') {
        blocks.push({
          type: 'list',
          ordered: true,
          items: Array.from(node.querySelectorAll('li')).map(li => li.textContent),
        });
      } else if (tagName === 'blockquote') {
        blocks.push({
          type: 'blockquote',
          content: node.textContent,
        });
      } else if (tagName === 'pre') {
        blocks.push({
          type: 'code',
          content: node.textContent,
        });
      } else if (tagName === 'img') {
        blocks.push({
          type: 'image',
          src: node.getAttribute('src'),
          alt: node.getAttribute('alt') || '',
        });
      }
    }
  });

  return blocks;
}

export default useChaptersStore;
