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
 *
 * The flatten / row-building helpers are exported (pure, no I/O) so the
 * round-trip test, the parity checker and the repair-migration generator use
 * the exact same logic the importer writes with. The CLI only runs when this
 * file is the entry point (see the import.meta.url guard at the bottom).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEXT_JSON_PATH = path.join(
  __dirname,
  "../src/assets/json_backend/text.json"
);

/** Load the static Chapter 1 source (text.json). */
export function loadTextJson() {
  return JSON.parse(fs.readFileSync(TEXT_JSON_PATH, "utf-8"));
}

// ─── Animation key lookup ────────────────────────────────────────────
// Maps the animation "name" used in text.json to the animation_key in DB.
// text.json uses short names like "EyeStructur" while DB keys are "animationEyeStructur".
export function animationNameToKey(name) {
  if (!name) return null;
  // Some names already start with "animation"
  if (name.startsWith("animation")) return name;
  // Capitalize first letter and prepend "animation"
  return "animation" + name.charAt(0).toUpperCase() + name.slice(1);
}

// content_text is the plain-text search column: tags stripped, first 200 chars.
export function plainText(html) {
  return html ? html.replace(/<[^>]+>/g, "").slice(0, 200) : "";
}

// ─── Build content JSONB from a paragraph ────────────────────────────
// The paragraphs table stores content as JSONB with a { blocks: [...] } structure.
// For Chapter 1, the HTML text is stored as a single block.
export function buildContent(paragraph, opts = {}) {
  const blocks = [];

  // Title block (for subSections with titles)
  if (opts.title) {
    blocks.push({
      type: "heading",
      level: opts.headingLevel || 3,
      content: opts.title,
    });
  }

  // Main text content
  if (paragraph.text) {
    blocks.push({ type: "text", content: paragraph.text });
  }

  // Break section (with or without steps)
  if (paragraph.type === "breakSection") {
    blocks.push({
      type: "break_section",
      title: paragraph.title || "",
      ...(paragraph.steps ? { steps: paragraph.steps } : {}),
    });
  }

  // Break video — only when the type is explicitly "breakVideo" (the old
  // catch-all `type !== "breakSection"` minted break_video blocks for
  // unrelated typed paragraphs)
  if (paragraph.type === "breakVideo") {
    blocks.push({
      type: "break_video",
      title: paragraph.title || "",
      videoSlug: paragraph.videoSlug || null,
      // No text here: descriptive text already round-trips via the separate
      // "text" block pushed above — one source of truth on the read side.
    });
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

// Display flags stored in the content JSONB so useChapter.js can round-trip
// them onto the animation object (OPENBRAIN-10): start/middel/end drive
// StartEndIcon, transition marks scroll-transition figures. stage has no
// consumer yet — carried anyway so re-seeding is lossless.
export function animationFlagsOf(animation) {
  if (!animation) return null;
  const flags = {};
  if (animation.start) flags.start = true;
  if (animation.middel) flags.middel = true;
  if (animation.end) flags.end = true;
  if (animation.transition) flags.transition = true;
  if (animation.stage) flags.stage = animation.stage;
  return Object.keys(flags).length > 0 ? flags : null;
}

/** Build one flat row for a leaf paragraph-like object at the given level. */
function leafRow(item, level, opts = {}) {
  const content = buildContent(item, opts);
  const flags = animationFlagsOf(item.animation);
  if (flags) content.animationFlags = flags;
  return {
    id: item.id,
    is_subsection_header: false,
    subsection_level: level,
    content,
    content_text: plainText(item.text),
    animation: item.animation || null,
    animationFull: item.animationFull || false,
    animationId: item.animationId || null,
  };
}

/**
 * Flatten a subSubSection entry whose prose lives in `paragraphs[]`
 * (e.g. { animation?, title?, paragraphs: [{ text, animation?, img? }, …] }).
 *
 * Emits one level-2 row per nested paragraph via the regular paragraph path
 * (so text, animation, img, animationFull, break types and nested
 * { paragraphs } wrappers all round-trip exactly like top-level paragraphs).
 * The group's OWN attributes are folded into the FIRST row, because the
 * reader (reconstructNesting → SubSubSection.vue) renders level-2 rows as
 * sibling subSubSection items and has no separate slot for a group:
 *   - `animation` → the first row's animation (+ display flags), unless that
 *     paragraph carries its own. This is what puts the trigger id on the
 *     first paragraph's div, mirroring text.json where the group div is the
 *     trigger.
 *   - `title` (untyped group) → a level-4 `heading` block at the front of the
 *     first row. contentBlocksToHTML renders it inline as
 *     <h4 class="text-black">…</h4> before the paragraph text — the only
 *     heading representation the current reader renders at level 2.
 *   - `type`/`title`/`videoSlug`/`steps`/`img` (typed group) → the same
 *     break_video / break_section / image blocks buildContent emits for a
 *     single typed entry.
 */
function flattenSubSubGroup(subsub) {
  const rows = flattenParagraphs(subsub.paragraphs, 2);
  if (rows.length === 0) return rows;

  const first = rows[0];
  const own = buildContent(subsub, {
    title: subsub.type ? undefined : subsub.title,
    headingLevel: 4,
  });
  if (own.blocks.length > 0) {
    first.content.blocks = [...own.blocks, ...first.content.blocks];
  }
  if (!first.content_text) {
    first.content_text = plainText(subsub.text) || subsub.title || "";
  }
  if (subsub.animation && !first.animation) {
    first.animation = subsub.animation;
    const flags = animationFlagsOf(subsub.animation);
    if (flags) first.content.animationFlags = flags;
  }
  return rows;
}

export function flattenParagraphs(items, level = 0) {
  const result = [];

  for (const item of items) {
    // ── subSection array (level 1 nesting) ──
    if (item.subSection) {
      for (const sub of item.subSection) {
        // SubSection header — content carries the animation display flags
        const headerContent = buildContent(
          {},
          { title: sub.title, headingLevel: 3 }
        );
        const subFlags = animationFlagsOf(sub.animation);
        if (subFlags) headerContent.animationFlags = subFlags;
        result.push({
          id: sub.id,
          is_subsection_header: true,
          subsection_level: 1,
          content: headerContent,
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
        if (Array.isArray(subsub.paragraphs) && subsub.paragraphs.length > 0) {
          // Group entry: prose lives in nested paragraphs[] (OPENBRAIN-22).
          // The old code called buildContent(subsub) here, which only reads
          // subsub.text, and so wrote an EMPTY level-2 row and dropped every
          // nested paragraph.
          result.push(...flattenSubSubGroup(subsub));
          continue;
        }
        // Leaf entry: { id, text, animation?, img?, type? … }
        result.push(leafRow(subsub, 2));
      }
      continue;
    }

    // ── Nested paragraphs wrapper (rare: { paragraphs: [...] }) ──
    if (item.paragraphs && !item.id) {
      result.push(...flattenParagraphs(item.paragraphs, level));
      continue;
    }

    // ── Regular paragraph ──
    result.push(leafRow(item, level));
  }

  return result;
}

/**
 * Resolve the animation FK + trigger for one flat row, given the
 * animation_key → UUID lookup (both exact and lowercased keys are indexed).
 */
export function resolveRowAnimation(fp, animLookup) {
  let animationId = null;
  let animationTrigger = null;

  if (fp.animation?.name) {
    const key = animationNameToKey(fp.animation.name);
    animationId = animLookup[key] || animLookup[key?.toLowerCase()] || null;
    // Keep the real animation name here — the dashboard block editor uses
    // animation_trigger as a display-label fallback. The transition flag
    // travels in content.animationFlags instead (see animationFlagsOf).
    animationTrigger = fp.animation.name;
  }

  // For animationFull paragraphs, resolve via animationId field
  if (fp.animationFull && fp.animationId) {
    const key = fp.animationId;
    animationId = animLookup[key] || animLookup[key?.toLowerCase()] || null;
    animationTrigger = key.replace("animation", "");
  }

  return { animationId, animationTrigger };
}

/**
 * The `paragraphs` row payload for one flat row (everything except
 * section_id / order_index, which the caller owns).
 */
export function buildParagraphRow(fp, animLookup) {
  const { animationId, animationTrigger } = resolveRowAnimation(fp, animLookup);
  return {
    content: fp.content,
    content_text: fp.content_text || null,
    has_animation: !!(animationId || fp.animationFull),
    animation_id: animationId,
    animation_trigger: animationTrigger,
    is_subsection_header: fp.is_subsection_header || false,
    subsection_level: fp.subsection_level || 0,
  };
}

/** Build an animation_key → UUID lookup (exact + lowercase) from DB rows. */
export function buildAnimLookup(animRows) {
  const animLookup = {};
  for (const a of animRows || []) {
    animLookup[a.animation_key] = a.id;
    // Also index by lowercase for case-insensitive matching
    animLookup[a.animation_key.toLowerCase()] = a.id;
  }
  return animLookup;
}

// ─── Main migration ──────────────────────────────────────────────────
async function migrate(supabase, textData) {
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
    console.log("  SQL: DELETE FROM modules WHERE slug = 'the-retina';");
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

  const animLookup = buildAnimLookup(animRows);
  console.log(
    `Loaded ${Object.keys(animLookup).length / 2} animation records for linking.\n`
  );

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
      const row = buildParagraphRow(flatParas[pi], animLookup);
      if (row.animation_id) linkedAnimations++;

      const { error: pErr } = await supabase.from("paragraphs").insert({
        section_id: sectionRow.id,
        order_index: pi,
        ...row,
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
      console.log(
        `  Section ${allSections.length}: "Further reading" -> ${frSection.id}`
      );
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
            blocks: [
              { type: "footnote", number: i + 1, content: fn.notes[i].text },
            ],
          },
          content_text: plainText(fn.notes[i].text),
          order_index: i,
        });
        totalParagraphs++;
      }
      console.log(
        `  Section ${allSections.length + 1}: "Footnotes" -> ${fnSection.id} (${fn.notes.length} notes)`
      );
    }
  }

  console.log("\n--- Migration Complete ---");
  console.log(`Module: The Retina (${moduleId})`);
  console.log(`Sections: ${allSections.length + 2}`);
  console.log(`Paragraphs: ${totalParagraphs}`);
  console.log(`Animations linked: ${linkedAnimations}`);
}

// ─── CLI entry ───────────────────────────────────────────────────────
// Env + Supabase client are only set up when run directly, so importing the
// pure helpers above (tests, parity checker, repair generator) has no side
// effects and needs no credentials.
async function main() {
  const dotenv = await import("dotenv");
  const { createClient } = await import("@supabase/supabase-js");

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
  await migrate(supabase, loadTextJson());
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
