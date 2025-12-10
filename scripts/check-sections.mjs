// Quick script to check if sections were created
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

async function checkSections() {
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
  
  console.log('✅ Module:', module.title, `(${module.id})`);
  
  // Get sections
  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, title, slug, order_index, module_id')
    .eq('module_id', module.id)
    .order('order_index');
  
  if (sectionsError) {
    console.error('❌ Sections error:', sectionsError);
    return;
  }
  
  console.log(`\n📋 Found ${sections.length} sections:\n`);
  sections.forEach(s => {
    console.log(`  ${s.order_index}. ${s.title} (slug: ${s.slug})`);
  });
}

checkSections();

