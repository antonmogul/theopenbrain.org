// Check Chapter 2 data structure
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  // Get module
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id, title, slug')
    .eq('slug', 'visual-perception-ux')
    .single();
  
  if (moduleError || !module) {
    console.error('❌ Module error:', moduleError);
    return;
  }
  
  console.log('✅ Module:', module.title, `(${module.id})\n`);
  
  // Get sections with paragraph counts
  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, title, slug, order_index')
    .eq('module_id', module.id)
    .order('order_index');
  
  if (sectionsError) {
    console.error('❌ Sections error:', sectionsError);
    return;
  }
  
  console.log(`📋 Found ${sections.length} sections:\n`);
  
  // Get paragraph counts per section
  for (const section of sections) {
    const { count } = await supabase
      .from('paragraphs')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', section.id);
    
    console.log(`  ${section.order_index}. ${section.title} (${count || 0} paragraphs)`);
  }
  
  // Total paragraphs
  const { count: totalParagraphs } = await supabase
    .from('paragraphs')
    .select('*', { count: 'exact', head: true })
    .in('section_id', sections.map(s => s.id));
  
  console.log(`\n📊 Total: ${sections.length} sections, ${totalParagraphs || 0} paragraphs`);
}

checkData();

