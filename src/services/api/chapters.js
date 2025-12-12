/**
 * Chapters API Service
 *
 * Handles all chapter/module related API operations.
 */

import { get, post, patch, del, buildInFilter } from './client';
import { READING_SPEED_WPM } from '@/constants/dashboard';

/**
 * Fetch all modules (chapters) with stats
 * @returns {Promise<Array>} Chapters with section/paragraph counts
 */
export async function fetchChapters() {
  const modules = await get('modules?select=id,title,slug,order_index,status,updated_at&order=order_index.asc');

  // Fetch stats for each module
  const chaptersWithStats = await Promise.all(
    modules.map(async (mod) => {
      const sections = await get(`sections?module_id=eq.${mod.id}&select=id`);
      const sectionIds = sections.map(s => s.id);

      let paragraphCount = 0;
      let wordCount = 0;

      if (sectionIds.length > 0) {
        const paragraphs = await get(
          `paragraphs?section_id=in.${buildInFilter(sectionIds)}&select=id,content_text`
        );
        paragraphCount = paragraphs.length;
        wordCount = paragraphs.reduce((sum, p) => {
          const text = p.content_text || '';
          return sum + text.split(/\s+/).filter(Boolean).length;
        }, 0);
      }

      return {
        ...mod,
        sectionCount: sections.length,
        paragraphCount,
        wordCount,
        readingTime: Math.ceil(wordCount / READING_SPEED_WPM),
      };
    })
  );

  return chaptersWithStats;
}

/**
 * Fetch a single chapter by ID
 * @param {string} chapterId - Chapter/module ID
 * @returns {Promise<Object>} Chapter data
 */
export async function fetchChapter(chapterId) {
  const [module] = await get(`modules?id=eq.${chapterId}&select=*`);
  return module;
}

/**
 * Fetch sections for a chapter
 * @param {string} moduleId - Module ID
 * @returns {Promise<Array>} Sections
 */
export async function fetchSections(moduleId) {
  return get(`sections?module_id=eq.${moduleId}&select=id,title,slug,order_index&order=order_index.asc`);
}

/**
 * Fetch paragraphs for given section IDs
 * @param {string[]} sectionIds - Array of section IDs
 * @returns {Promise<Array>} Paragraphs
 */
export async function fetchParagraphs(sectionIds) {
  if (!sectionIds.length) return [];

  return get(
    `paragraphs?section_id=in.${buildInFilter(sectionIds)}&select=id,order_index,content,content_text,section_id,is_subsection_header&order=order_index.asc`
  );
}

/**
 * Fetch full chapter content (sections + paragraphs)
 * @param {string} moduleId - Module ID
 * @returns {Promise<Object>} { sections, paragraphs }
 */
export async function fetchChapterContent(moduleId) {
  const sections = await fetchSections(moduleId);
  const sectionIds = sections.map(s => s.id);
  const paragraphs = await fetchParagraphs(sectionIds);

  return { sections, paragraphs };
}

/**
 * Create a new chapter/module
 * @param {Object} data - Chapter data
 * @returns {Promise<Object>} Created chapter
 */
export async function createChapter(data) {
  const [created] = await post('modules', {
    title: data.title,
    slug: data.slug,
    order_index: data.order_index || 0,
    status: data.status || 'draft',
    content_version_id: data.content_version_id,
  });
  return created;
}

/**
 * Update a chapter/module
 * @param {string} chapterId - Chapter ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateChapter(chapterId, data) {
  return patch(`modules?id=eq.${chapterId}`, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Delete a chapter/module
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<Object>} Success indicator
 */
export async function deleteChapter(chapterId) {
  return del(`modules?id=eq.${chapterId}`);
}

/**
 * Update a paragraph
 * @param {string} paragraphId - Paragraph ID
 * @param {Object} data - Updated data (content, content_text, etc.)
 * @returns {Promise<Object>} Success indicator
 */
export async function updateParagraph(paragraphId, data) {
  return patch(`paragraphs?id=eq.${paragraphId}`, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Reorder paragraphs within a section
 * @param {Array<{id: string, order_index: number}>} updates - Array of paragraph updates
 * @returns {Promise<void>}
 */
export async function reorderParagraphs(updates) {
  await Promise.all(
    updates.map(({ id, order_index }) =>
      patch(`paragraphs?id=eq.${id}`, {
        order_index,
        updated_at: new Date().toISOString(),
      })
    )
  );
}

/**
 * Update a section
 * @param {string} sectionId - Section ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateSection(sectionId, data) {
  return patch(`sections?id=eq.${sectionId}`, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

export default {
  fetchChapters,
  fetchChapter,
  fetchSections,
  fetchParagraphs,
  fetchChapterContent,
  createChapter,
  updateChapter,
  deleteChapter,
  updateParagraph,
  reorderParagraphs,
  updateSection,
};
