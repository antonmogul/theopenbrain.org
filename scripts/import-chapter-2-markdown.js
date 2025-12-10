// Import Chapter 2 Markdown Content to Supabase
// This script reads markdown files and converts them to database format

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Markdown to JSONB content blocks converter
function markdownToContentBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  
  let currentParagraph = '';
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines (unless we're building a paragraph)
    if (!line && !currentParagraph) continue;
    
    // Code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    if (inCodeBlock) {
      currentParagraph += line + '\n';
      continue;
    }
    
    // Headings
    if (line.startsWith('#')) {
      if (currentParagraph) {
        blocks.push({ type: 'text', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      const level = (line.match(/^#+/) || [''])[0].length;
      const content = line.replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', level, content });
      continue;
    }
    
    // Animation markers [ANIMATION: ...]
    if (line.startsWith('[ANIMATION:')) {
      if (currentParagraph) {
        blocks.push({ type: 'text', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      const animationDesc = line.match(/\[ANIMATION:\s*(.+?)\]/)?.[1] || '';
      blocks.push({ type: 'animation', description: animationDesc });
      continue;
    }
    
    // Regular text
    if (line) {
      if (currentParagraph) {
        currentParagraph += ' ' + line;
      } else {
        currentParagraph = line;
      }
    } else {
      // Empty line ends current paragraph
      if (currentParagraph) {
        blocks.push({ type: 'text', content: currentParagraph.trim() });
        currentParagraph = '';
      }
    }
  }
  
  // Add final paragraph if exists
  if (currentParagraph) {
    blocks.push({ type: 'text', content: currentParagraph.trim() });
  }
  
  return blocks;
}

// Extract plain text for search
function extractPlainText(blocks) {
  return blocks
    .map(block => {
      if (block.type === 'text') return block.content;
      if (block.type === 'heading') return block.content;
      return '';
    })
    .join(' ')
    .trim();
}

// Map markdown files to sections
const sectionMapping = {
  '00-intro.md': { sectionSlug: 'introduction', order: 0 },
  '01-from-retina-to-recognition.md': { sectionSlug: 'from-retina-to-recognition', order: 1 },
  '02-attention-economy/02-1-selective-attention.md': { sectionSlug: 'attention-economy', subsection: '2.1', order: 0 },
  '02-attention-economy/02-2-inattentional-blindness.md': { sectionSlug: 'attention-economy', subsection: '2.2', order: 1 },
  '02-attention-economy/02-3-change-blindness.md': { sectionSlug: 'attention-economy', subsection: '2.3', order: 2 },
  '02-attention-economy/02-4-attentional-blink.md': { sectionSlug: 'attention-economy', subsection: '2.4', order: 3 },
  // Add more mappings as needed
};

async function importChapter2() {
  console.log('📚 Starting Chapter 2 import...\n');
  
  const chapter2Dir = path.join(__dirname, '../claude/Content/Chapter-2');
  
  // Get module ID
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id')
    .eq('slug', 'visual-perception-ux')
    .single();
  
  if (moduleError || !module) {
    console.error('❌ Module not found. Please run the seed script first.');
    return;
  }
  
  console.log(`✅ Found module: ${module.id}\n`);
  
  // Get all sections for this module
  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, slug, order_index')
    .eq('module_id', module.id)
    .order('order_index');
  
  if (sectionsError) {
    console.error('❌ Error fetching sections:', sectionsError);
    return;
  }
  
  console.log(`✅ Found ${sections.length} sections\n`);
  
  // Process each markdown file
  const files = fs.readdirSync(chapter2Dir, { recursive: true, withFileTypes: true });
  
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.md')) continue;
    
    const filePath = path.join(file.path || chapter2Dir, file.name);
    const relativePath = path.relative(chapter2Dir, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`📄 Processing: ${relativePath}`);
    
    // Find matching section
    const sectionSlug = relativePath.includes('00-intro') ? 'introduction' :
                       relativePath.includes('01-from-retina') ? 'from-retina-to-recognition' :
                       relativePath.includes('02-attention') ? 'attention-economy' :
                       relativePath.includes('03-foveal') ? 'foveal-peripheral-processing' :
                       relativePath.includes('04-saccades') ? 'saccades-fixations-scanning' :
                       relativePath.includes('05-gestalt') ? 'gestalt-principles' :
                       relativePath.includes('06-color') ? 'color-perception' :
                       relativePath.includes('07-cognitive') ? 'cognitive-load-working-memory' :
                       relativePath.includes('08-perceptual') ? 'perceptual-biases' :
                       relativePath.includes('09-motion') ? 'motion-animation-temporal' :
                       relativePath.includes('10-case') ? 'applied-case-studies' :
                       relativePath.includes('11-looking') ? 'looking-forward' :
                       relativePath.includes('appendix-glossary') ? 'appendix-glossary' :
                       relativePath.includes('appendix-resources') ? 'appendix-resources' : null;
    
    if (!sectionSlug) {
      console.log(`⚠️  Skipping ${relativePath} - no section mapping`);
      continue;
    }
    
    const section = sections.find(s => s.slug === sectionSlug);
    if (!section) {
      console.log(`⚠️  Section not found: ${sectionSlug}`);
      continue;
    }
    
    // Convert markdown to content blocks
    const blocks = markdownToContentBlocks(content);
    const contentText = extractPlainText(blocks);
    
    // Check if subsection (has subsection number in filename)
    const subsectionMatch = relativePath.match(/(\d+)-(\d+)/);
    const isSubsection = !!subsectionMatch;
    const subsectionLevel = isSubsection ? 1 : 0;
    
    // Check if heading (first block is heading)
    const isSubsectionHeader = blocks[0]?.type === 'heading' && blocks[0]?.level >= 2;
    
    // Get current paragraph count for this section
    const { count } = await supabase
      .from('paragraphs')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', section.id);
    
    const orderIndex = count || 0;
    
    // Insert paragraph
    const { data: paragraph, error: paraError } = await supabase
      .from('paragraphs')
      .insert({
        section_id: section.id,
        content: { blocks },
        content_text: contentText,
        order_index: orderIndex,
        is_subsection_header: isSubsectionHeader,
        subsection_level: subsectionLevel
      })
      .select()
      .single();
    
    if (paraError) {
      console.error(`❌ Error inserting paragraph:`, paraError);
    } else {
      console.log(`✅ Inserted paragraph ${orderIndex} into section "${section.slug}"`);
    }
  }
  
  console.log('\n🎉 Chapter 2 import complete!');
}

// Run the import
importChapter2().catch(console.error);

