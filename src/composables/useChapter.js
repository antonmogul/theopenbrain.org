import { ref } from 'vue'
import { useModules } from './useModules'

/**
 * Generic composable to fetch and transform any chapter from Supabase
 * Transforms database structure to match Chapter 1's JSON format
 */
export function useChapter() {
  const { fetchModule, loading, error } = useModules()
  const chapterData = ref(null)
  const transformedData = ref(null)

  /**
   * Convert JSONB content blocks to HTML text
   * Returns an object with text (for paragraphs) and hasHeading flag
   */
  function contentBlocksToHTML(blocks) {
    if (!blocks || !Array.isArray(blocks)) return { text: '', hasHeading: false }
    
    let hasHeading = false
    const html = blocks.map(block => {
      if (block.type === 'heading') {
        hasHeading = true
        const level = block.level || 2
        return `<h${level} class="text-black">${block.content}</h${level}>`
      }
      if (block.type === 'text') {
        return block.content
      }
      if (block.type === 'code') {
        return `<pre><code>${block.content}</code></pre>`
      }
      return block.content || ''
    }).join('')
    
    return { text: html, hasHeading }
  }

  /**
   * Transform database module structure to Chapter 1 format
   */
  function transformModuleToChapterFormat(module) {
    if (!module || !module.sections) {
      return null
    }

    // Sort sections by order_index
    const sortedSections = [...module.sections].sort((a, b) => a.order_index - b.order_index)
    console.log('useChapter: Total sections found:', sortedSections.length);
    console.log('useChapter: Section titles:', sortedSections.map(s => `${s.order_index}: ${s.title}`));
    
    // Find introduction section (order_index 0 or slug 'introduction')
    const introSection = sortedSections.find(s => s.slug === 'introduction' || s.order_index === 0)
    const mainSections = sortedSections.filter(s => s.slug !== 'introduction' && s.order_index !== 0)
    console.log('useChapter: Intro section:', introSection?.title);
    console.log('useChapter: Main sections count:', mainSections.length);

    // Transform intro section
    const intro = introSection ? [{
      id: introSection.id,
      title: introSection.title,
      paragraphs: introSection.paragraphs
        ? introSection.paragraphs
            .sort((a, b) => a.order_index - b.order_index)
            .map(p => {
              const contentResult = contentBlocksToHTML(p.content?.blocks || [])
              return {
                id: p.id,
                text: contentResult.text,
                hasHeading: contentResult.hasHeading,
                ...(p.animation_id && {
                  animation: {
                    name: p.animation_trigger || 'default',
                    id: `animation${p.animation_trigger || 'default'}`
                  }
                })
              }
            })
        : []
    }] : []

    // Transform main sections
    const sections = mainSections.map(section => ({
      id: section.id,
      title: section.title,
      paragraphs: section.paragraphs
        ? section.paragraphs
            .sort((a, b) => a.order_index - b.order_index)
            .map(p => {
              const contentResult = contentBlocksToHTML(p.content?.blocks || [])
              const baseParagraph = {
                id: p.id,
                text: contentResult.text,
                hasHeading: contentResult.hasHeading
              }

              // Add animation if present
              if (p.animation_id) {
                baseParagraph.animation = {
                  name: p.animation_trigger || 'default',
                  id: `animation${p.animation_trigger || 'default'}`
                }
              }

              // Handle subsection headers
              if (p.is_subsection_header) {
                baseParagraph.subSection = [{
                  id: p.id,
                  title: p.content_text || '',
                  paragraphs: [] // Will be populated by subsequent paragraphs
                }]
              }

              return baseParagraph
            })
        : []
    }))

    const transformed = {
      intro,
      sections,
      // Add empty furtherReading and footNotes if not present in module
      // These are required by the TextComp component
      furtherReading: module.furtherReading || {
        id: 'default-further-reading',
        title: 'Further reading:',
        paragraphs: []
      },
      footNotes: module.footNotes || {
        id: 'default-footnotes',
        title: 'Footnotes',
        animation: { name: 'Placeholder' },
        notes: []
      }
    }
    
    console.log('useChapter: Transformed data - intro:', transformed.intro.length, 'sections:', transformed.sections.length);
    console.log('useChapter: Section titles in transformed:', transformed.sections.map(s => s.title));
    
    return transformed
  }

  /**
   * Fetch chapter by slug
   * @param {string} slug - The chapter slug (e.g., 'visual-perception-ux')
   */
  async function fetchChapter(slug) {
    try {
      if (!slug) {
        throw new Error('Chapter slug is required')
      }

      // First fetch all modules to find by slug
      const modulesComposable = useModules()
      const result = await modulesComposable.fetchModules(null, null) // Fetch all statuses
      
      if (result.error) throw result.error

      // Find chapter by slug
      const chapter = result.data?.find(m => m.slug === slug)
      
      if (!chapter) {
        const availableSlugs = result.data?.map(m => m.slug).join(', ') || 'none'
        throw new Error(`Chapter with slug "${slug}" not found. Available slugs: ${availableSlugs}`)
      }

      chapterData.value = chapter
      transformedData.value = transformModuleToChapterFormat(chapter)
      
      return { data: transformedData.value, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    }
  }

  /**
   * Fetch chapter by module ID
   * @param {string} moduleId - The module UUID
   */
  async function fetchChapterById(moduleId) {
    try {
      if (!moduleId) {
        throw new Error('Module ID is required')
      }

      const { data, error: fetchError } = await fetchModule(moduleId)
      
      if (fetchError) throw fetchError
      if (!data) {
        throw new Error('Chapter not found')
      }

      chapterData.value = data
      transformedData.value = transformModuleToChapterFormat(data)
      
      return { data: transformedData.value, error: null }
    } catch (err) {
      error.value = err.message
      return { data: null, error: err }
    }
  }

  return {
    chapterData,
    transformedData,
    loading,
    error,
    fetchChapter,
    fetchChapterById
  }
}
