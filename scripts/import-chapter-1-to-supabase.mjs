/**
 * Import Chapter 1 "The Retina" from text.json into Supabase
 *
 * Reads src/assets/json_backend/text.json and inserts:
 *   - 1 content_version (if not exists)
 *   - 1 module (the-retina)
 *   - N sections (intro + main sections)
 *   - N paragraphs with animation_id links
 *
 * Handles nested subSection / subSubSection structures by flattening
 * them into paragraphs with subsection_level markers stored in content JSONB.
 *
 * Run: node scripts/import-chapter-1-to-supabase.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envLocalPath = path.join(__dirname, "../.env.local");
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error("No .env.local or .env file found");
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Load source data ────────────────────────────────────────────────
const textJsonPath = path.join(
  __dirname,
  "../src/assets/json_backend/text.json"
);
const textData = JSON.parse(fs.readFileSync(textJsonPath, "utf-8"));

// ─── Animation key lookup ────────────────────────────────────────────
// Maps the animation "name" used in text.json to the animation_key in DB.
// text.json uses short names like "EyeStructur" while DB keys are "animationEyeStructur".
function animationNameToKey(name) {
  if (!name) return null;
  // Some names already start with "animation"
  if (name.startsWith("animation")) return name;
  // Capitalize first letter and prepend "animation"
  return "animation" + name.charAt(0).toUpperCase() + name.slice(1);
}

// ─── Build content JSONB from a paragraph ────────────────────────────
// The paragraphs table stores content as JSONB with a { blocks: [...] } structure.
// For Chapter 1, the HTML text is stored as a single block.
function buildContent(paragraph, opts = {}) {
  const blocks = [];

  // Title block (for subSections with titles)
  if (opts.title) {
    blocks.push({ type: "heading", level: opts.headingLevel || 3, content: opts.title });
  }

  // Main text content
  if (paragraph.text) {
    blocks.push({ type: "text", content: paragraph.text });
  }

  // Break section steps
  if (paragraph.type === "breakSection" && paragraph.steps) {
    blocks.push({ type: "break_section", title: paragraph.title || "", steps: paragraph.steps });
  }

  // Break video
  if (paragraph.type === "breakVideo" || (paragraph.type && paragraph.type !== "breakSection")) {
    if (!paragraph.text && paragraph.title) {
      blocks.push({
        type: "break_video",
        title: paragraph.title,
        videoSlug: paragraph.videoSlug || null,
      });
    }
  }

  // Image
  if (paragraph.img) {
    blocks.push({
      type: "image",
      src: paragraph.img,
      caption: paragraph.imgCap || "",
      closed: paragraph.imgClosed || false,
    });
  }

  // Fullscreen animation marker
  if (paragraph.animationFull) {
    blocks.push({
      type: "animation_full",
      animationId: paragraph.animationId || null,
      scroll: paragraph.scroll || false,
    });
  }

  return { blocks };
}

// ─── Flatten nested paragraphs ───────────────────────────────────────
// text.json has deeply nested structures:
//   section.paragraphs[].subSection[].paragraphs[].subSubSection[]
// We flatten these into a single ordered list of paragraph rows,
// using subsection_level (0=top, 1=subSection, 2=subSubSection) and
// is_subsection_header to mark section boundaries.

function flattenParagraphs(items, level = 0) {
  const result = [];

  for (const item of items) {
    // ── subSection array (level 1 nesting) ──
    if (item.subSection) {
      for (const sub of item.subSection) {
        // SubSection header
        result.push({
          id: sub.id,
          is_subsection_header: true,
          subsection_level: 1,
          content: buildContent({}, { title: sub.title, headingLevel: 3 }),
          content_text: sub.title || "",
          animation: sub.animation || null,
        });
        // SubSection paragraphs
        if (sub.paragraphs) {
          result.push(...flattenParagraphs(sub.paragraphs, 1));
        }
      }
      continue;
    }

    // ── subSubSection array (level 2 nesting) ──
    if (item.subSubSection) {
      for (const subsub of item.subSubSection) {
        result.push({
          id: subsub.id,
          is_subsection_header: false,
          subsection_level: 2,
          content: buildContent(subsub),
          content_text: subsub.text ? subsub.text.replace(/<[^>]+>/g, "").slice(0, 200) : "",
          animation: subsub.animation || null,
        });
      }
      continue;
    }

    // ── Nested paragraphs wrapper (rare: { paragraphs: [...] }) ──
    if (item.paragraphs && !item.id) {
      result.push(...flattenParagraphs(item.paragraphs, level));
      continue;
    }

    // ── Regular paragraph ──
    result.push({
      id: item.id,
      is_subsection_header: false,
      subsection_level: level,
      content: buildContent(item),
      content_text: item.text ? item.text.replace(/<[^>]+>/g, "").slice(0, 200) : "",
      animation: item.animation || null,
      animationFull: item.animationFull || false,
      animationId: item.animationId || null,
    });
  }

  return result;
}

// ─── Main migration ──────────────────────────────────────────────────
async function migrate() {
  console.log("Starting Chapter 1 migration...\n");

  // 1. Get or create content version
  let { data: versions } = await supabase
    .from("content_versions")
    .select("id")
    .eq("version_number", "1.0")
    .limit(1);

  let contentVersionId;
  if (versions && versions.length > 0) {
    contentVersionId = versions[0].id;
    console.log("Using existing content version:", contentVersionId);
  } else {
    // Need a creator profile
    const { data: creators } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "creator")
      .limit(1);

    const creatorId = creators?.[0]?.id;
    if (!creatorId) {
      console.error("No creator profile found. Create one first.");
      process.exit(1);
    }

    const { data: newVersion, error: vErr } = await supabase
      .from("content_versions")
      .insert({
        version_number: "1.0",
        status: "published",
        created_by: creatorId,
        release_notes: "Initial Chapter 1 migration from JSON",
      })
      .select("id")
      .single();

    if (vErr) {
      console.error("Error creating version:", vErr);
      process.exit(1);
    }
    contentVersionId = newVersion.id;
    console.log("Created content version:", contentVersionId);
  }

  // 2. Get creator ID
  const { data: creators } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "creator")
    .limit(1);
  const creatorId = creators?.[0]?.id;
  if (!creatorId) {
    console.error("No creator profile found.");
    process.exit(1);
  }

  // 3. Check if module already exists
  const { data: existingModules } = await supabase
    .from("modules")
    .select("id")
    .eq("slug", "the-retina")
    .limit(1);

  if (existingModules && existingModules.length > 0) {
    console.log(
      "\nModule 'the-retina' already exists (id:",
      existingModules[0].id,
      ")"
    );
    console.log("Delete it first if you want to re-import.");
    console.log(
      "  SQL: DELETE FROM modules WHERE slug = 'the-retina';"
    );
    process.exit(0);
  }

  // 4. Create module
  const { data: moduleRow, error: mErr } = await supabase
    .from("modules")
    .insert({
      content_version_id: contentVersionId,
      title: "The Retina",
      slug: "the-retina",
      description:
        "An interactive exploration of retinal anatomy, photoreceptors, neural circuits, and visual processing.",
      order_index: 1,
      status: "published",
      created_by: creatorId,
    })
    .select("id")
    .single();

  if (mErr) {
    console.error("Error creating module:", mErr);
    process.exit(1);
  }
  const moduleId = moduleRow.id;
  console.log("Created module 'The Retina':", moduleId);

  // 5. Load animation lookup map (animation_key -> UUID)
  const { data: animRows } = await supabase
    .from("animations")
    .select("id, animation_key");

  const animLookup = {};
  for (const a of animRows || []) {
    animLookup[a.animation_key] = a.id;
    // Also index by lowercase for case-insensitive matching
    animLookup[a.animation_key.toLowerCase()] = a.id;
  }
  console.log(`Loaded ${Object.keys(animLookup).length / 2} animation records for linking.\n`);

  // 6. Build section list: intro + main sections
  const allSections = [];

  // Intro section
  if (textData.intro && textData.intro.length > 0) {
    const intro = textData.intro[0];
    allSections.push({
      title: intro.title || "Introduction",
      slug: "introduction",
      order_index: 0,
      introduction_text: null,
      animation: intro.animation || null,
      sourceParagraphs: intro.paragraphs || [],
    });
  }

  // Main sections
  for (let i = 0; i < textData.sections.length; i++) {
    const sec = textData.sections[i];
    allSections.push({
      title: sec.title,
      slug: sec.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      order_index: i + 1,
      introduction_text: null,
      animation: sec.animation || null,
      sourceParagraphs: sec.paragraphs || [],
    });
  }

  // 7. Insert sections and paragraphs
  let totalParagraphs = 0;
  let linkedAnimations = 0;

  for (const sec of allSections) {
    // Resolve section-level animation
    let sectionAnimId = null;
    if (sec.animation?.name) {
      const key = animationNameToKey(sec.animation.name);
      sectionAnimId = animLookup[key] || animLookup[key?.toLowerCase()] || null;
    }

    const { data: sectionRow, error: sErr } = await supabase
      .from("sections")
      .insert({
        module_id: moduleId,
        title: sec.title,
        slug: sec.slug,
        order_index: sec.order_index,
        introduction_text: sec.introduction_text,
        animation_id: sectionAnimId,
        animation_config: sec.animation || null,
      })
      .select("id")
      .single();

    if (sErr) {
      console.error(`Error creating section "${sec.title}":`, sErr);
      continue;
    }

    console.log(
      `  Section ${sec.order_index}: "${sec.title}" -> ${sectionRow.id}` +
        (sectionAnimId ? ` [anim: ${sec.animation.name}]` : "")
    );

    // Flatten and insert paragraphs
    const flatParas = flattenParagraphs(sec.sourceParagraphs);

    for (let pi = 0; pi < flatParas.length; pi++) {
      const fp = flatParas[pi];

      // Resolve animation_id for this paragraph
      let paraAnimId = null;
      let animTrigger = null;

      if (fp.animation?.name) {
        const key = animationNameToKey(fp.animation.name);
        paraAnimId = animLookup[key] || animLookup[key?.toLowerCase()] || null;
        animTrigger = fp.animation.name;
        if (paraAnimId) linkedAnimations++;
      }

      // For animationFull paragraphs, resolve via animationId field
      if (fp.animationFull && fp.animationId) {
        const key = fp.animationId;
        paraAnimId = animLookup[key] || animLookup[key?.toLowerCase()] || null;
        animTrigger = key.replace("animation", "");
        if (paraAnimId) linkedAnimations++;
      }

      const { error: pErr } = await supabase.from("paragraphs").insert({
        section_id: sectionRow.id,
        content: fp.content,
        content_text: fp.content_text || null,
        order_index: pi,
        has_animation: !!(paraAnimId || fp.animationFull),
        animation_id: paraAnimId,
        animation_trigger: animTrigger,
        is_subsection_header: fp.is_subsection_header || false,
        subsection_level: fp.subsection_level || 0,
      });

      if (pErr) {
        console.error(`    Error inserting paragraph ${pi}:`, pErr.message);
      }
      totalParagraphs++;
    }
  }

  // 8. Insert furtherReading as a section
  if (textData.furtherReading) {
    const fr = textData.furtherReading;
    const { data: frSection } = await supabase
      .from("sections")
      .insert({
        module_id: moduleId,
        title: fr.title || "Further reading",
        slug: "further-reading",
        order_index: allSections.length,
      })
      .select("id")
      .single();

    if (frSection && fr.paragraphs) {
      for (let i = 0; i < fr.paragraphs.length; i++) {
        const frp = fr.paragraphs[i];
        await supabase.from("paragraphs").insert({
          section_id: frSection.id,
          content: {
            blocks: [
              {
                type: "further_reading",
                title: frp.title || "",
                links: frp.links || [],
              },
            ],
          },
          content_text: frp.title || "",
          order_index: i,
        });
        totalParagraphs++;
      }
      console.log(`  Section ${allSections.length}: "Further reading" -> ${frSection.id}`);
    }
  }

  // 9. Insert footnotes as a section
  if (textData.footNotes) {
    const fn = textData.footNotes;
    const placeholderKey = animationNameToKey("Placeholder");
    const placeholderAnimId = animLookup[placeholderKey] || null;

    const { data: fnSection } = await supabase
      .from("sections")
      .insert({
        module_id: moduleId,
        title: fn.title || "Footnotes",
        slug: "footnotes",
        order_index: allSections.length + 1,
        animation_id: placeholderAnimId,
      })
      .select("id")
      .single();

    if (fnSection && fn.notes) {
      for (let i = 0; i < fn.notes.length; i++) {
        await supabase.from("paragraphs").insert({
          section_id: fnSection.id,
          content: {
            blocks: [{ type: "footnote", number: i + 1, content: fn.notes[i].text }],
          },
          content_text: fn.notes[i].text?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
          order_index: i,
        });
        totalParagraphs++;
      }
      console.log(`  Section ${allSections.length + 1}: "Footnotes" -> ${fnSection.id} (${fn.notes.length} notes)`);
    }
  }

  console.log("\n--- Migration Complete ---");
  console.log(`Module: The Retina (${moduleId})`);
  console.log(`Sections: ${allSections.length + 2}`);
  console.log(`Paragraphs: ${totalParagraphs}`);
  console.log(`Animations linked: ${linkedAnimations}`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
