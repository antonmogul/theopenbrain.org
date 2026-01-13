// Check if paragraphs exist and what sections they reference
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

async function checkParagraphs() {
  // Try to get all paragraphs (might be blocked by RLS)
  const { data: paragraphs, error: paraError } = await supabase
    .from('paragraphs')
    .select('id, section_id, content')
    .limit(5);
  
  if (paraError) {
    console.error('❌ Error fetching paragraphs:', paraError.message);
    console.log('\n💡 This is likely an RLS issue. The data exists but the anon key cannot read it.');
    console.log('   The dashboard uses service_role key, so you can see the data there.');
    return;
  }
  
  console.log(`✅ Found ${paragraphs?.length || 0} paragraphs (showing first 5):\n`);
  paragraphs?.forEach((p, i) => {
    console.log(`${i + 1}. Paragraph ID: ${p.id}`);
    console.log(`   Section ID: ${p.section_id}`);
    console.log(`   Content preview: ${JSON.stringify(p.content).substring(0, 50)}...\n`);
  });
  
  // Get unique section IDs
  const sectionIds = [...new Set(paragraphs?.map(p => p.section_id) || [])];
  console.log(`📋 Unique section IDs referenced: ${sectionIds.length}`);
  
  // Try to get sections
  if (sectionIds.length > 0) {
    const { data: sections, error: secError } = await supabase
      .from('sections')
      .select('id, title, slug')
      .in('id', sectionIds);
    
    if (secError) {
      console.error('❌ Error fetching sections:', secError.message);
    } else {
      console.log(`✅ Found ${sections?.length || 0} matching sections:`);
      sections?.forEach(s => {
        console.log(`   - ${s.title} (${s.slug})`);
      });
    }
  }
}

checkParagraphs();


