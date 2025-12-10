// Import Chapter 2 Markdown Content to Supabase
// Run: node scripts/import-chapter-2-to-supabase.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (try .env.local first, then .env)
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ No .env.local or .env file found');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Convert markdown to JSONB content blocks
function markdownToContentBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  
  let currentParagraph = '';
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines (unless we're building a paragraph)
    if (!trimmed && !currentParagraph) continue;
    
    // Code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    if (inCodeBlock) {
      currentParagraph += line + '\n';
      continue;
    }
    
    // Headings
    if (trimmed.startsWith('#')) {
      if (currentParagraph) {
        blocks.push({ type: 'text', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      const level = (trimmed.match(/^#+/) || [''])[0].length;
      const content = trimmed.replace(/^#+\s*/, '').trim();
      if (content) {
        blocks.push({ type: 'heading', level, content });
      }
      continue;
    }
    
    // Animation markers [ANIMATION: ...]
    if (trimmed.startsWith('[ANIMATION:')) {
      if (currentParagraph) {
        blocks.push({ type: 'text', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      const animationDesc = trimmed.match(/\[ANIMATION:\s*(.+?)\]/)?.[1] || '';
      blocks.push({ type: 'animation', description: animationDesc });
      continue;
    }
    
    // Bold text **text**
    if (trimmed.includes('**')) {
      // Simple handling - convert **text** to <strong>text</strong>
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }
    
    // Regular text
    if (trimmed) {
      if (currentParagraph) {
        currentParagraph += ' ' + line.trim();
      } else {
        currentParagraph = line.trim();
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
      if (block.type === 'text') return block.content.replace(/<[^>]*>/g, '');
      if (block.type === 'heading') return block.content;
      return '';
    })
    .join(' ')
    .trim()
    .substring(0, 5000); // Limit length
}

// Map file paths to section slugs
function getSectionSlug(filePath) {
  const filename = path.basename(filePath);
  const dirname = path.dirname(filePath).split(path.sep).pop();
  
  if (filename === '00-intro.md') return 'introduction';
  if (filename === '01-from-retina-to-recognition.md') return 'from-retina-to-recognition';
  if (dirname === '02-attention-economy') return 'attention-economy';
  if (dirname === '03-foveal-peripheral') return 'foveal-peripheral-processing';
  if (dirname === '04-saccades-scanning') return 'saccades-fixations-scanning';
  if (dirname === '05-gestalt-principles') return 'gestalt-principles';
  if (dirname === '06-color-perception') return 'color-perception';
  if (dirname === '07-cognitive-load') return 'cognitive-load-working-memory';
  if (dirname === '08-perceptual-biases') return 'perceptual-biases';
  if (dirname === '09-motion-animation') return 'motion-animation-temporal';
  if (dirname === '10-case-studies') return 'applied-case-studies';
  if (filename === '11-looking-forward.md') return 'looking-forward';
  if (filename === 'appendix-glossary.md') return 'appendix-glossary';
  if (filename === 'appendix-resources.md') return 'appendix-resources';
  
  return null;
}

async function importChapter2() {
  console.log('📚 Starting Chapter 2 import from markdown files...\n');
  
  const chapter2Dir = path.join(__dirname, '../claude/Content/Chapter-2');
  
  if (!fs.existsSync(chapter2Dir)) {
    console.error('❌ Chapter-2 directory not found:', chapter2Dir);
    return;
  }
  
  // Get module ID
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id')
    .eq('slug', 'visual-perception-ux')
    .single();
  
  if (moduleError || !module) {
    console.error('❌ Module not found. Please run the seed script first:');
    console.error('   supabase/migrations/20250109000000_seed_chapter_2.sql');
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
  
  // Create section lookup
  const sectionMap = new Map(sections.map(s => [s.slug, s]));
  
  // Process all markdown files
  function getAllMarkdownFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        getAllMarkdownFiles(filePath, fileList);
      } else if (file.endsWith('.md')) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }
  
  const markdownFiles = getAllMarkdownFiles(chapter2Dir);
  console.log(`📄 Found ${markdownFiles.length} markdown files\n`);
  
  let totalInserted = 0;
  let totalErrors = 0;
  
  // Process each file
  for (const filePath of markdownFiles.sort()) {
    const relativePath = path.relative(chapter2Dir, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const sectionSlug = getSectionSlug(relativePath);
    if (!sectionSlug) {
      console.log(`⚠️  Skipping ${relativePath} - no section mapping`);
      continue;
    }
    
    const section = sectionMap.get(sectionSlug);
    if (!section) {
      console.log(`⚠️  Section not found: ${sectionSlug}`);
      continue;
    }
    
    console.log(`📄 Processing: ${relativePath} → ${sectionSlug}`);
    
    // Convert markdown to content blocks
    const blocks = markdownToContentBlocks(content);
    const contentText = extractPlainText(blocks);
    
    // Determine if this is a subsection header
    const isSubsectionHeader = blocks[0]?.type === 'heading' && blocks[0]?.level >= 2;
    
    // Check subsection level (if filename has pattern like 02-1, 02-2, etc.)
    const subsectionMatch = relativePath.match(/(\d+)-(\d+)/);
    const subsectionLevel = subsectionMatch ? 1 : 0;
    
    // Get current paragraph count for ordering
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
      console.error(`❌ Error: ${paraError.message}`);
      totalErrors++;
    } else {
      console.log(`   ✅ Inserted paragraph ${orderIndex} (${blocks.length} blocks)`);
      totalInserted++;
    }
  }
  
  console.log(`\n🎉 Import complete!`);
  console.log(`   ✅ Inserted: ${totalInserted} paragraphs`);
  if (totalErrors > 0) {
    console.log(`   ❌ Errors: ${totalErrors}`);
  }
}

// Run the import
importChapter2().catch(console.error);

