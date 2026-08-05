import fs from "fs";
const load = (f) => JSON.parse(fs.readFileSync("/tmp/dbcap/" + f, "utf8"));
const sections = load("sections.json");
const paragraphs = load("paragraphs.json");
const animKeys = load("anim_keys.json");
const animFull = load("animations_full.json");
const animStates = load("animation_states.json");
const animVariants = load("animation_variants.json");

// ---- attach animation_key/title to paragraphs (mirrors fetchChapter step 3b) ----
const animById = new Map(animKeys.map((a) => [a.id, a]));
for (const p of paragraphs) {
  const a = p.animation_id && animById.get(p.animation_id);
  if (a) {
    p.animation_key = a.animation_key;
    p.animation_title = a.title || "";
  }
}

// ===== useChapter.js transform (verbatim logic) =====
function extractChapter1Meta(blocks) {
  const meta = {};
  if (!blocks || !Array.isArray(blocks)) return meta;
  for (const block of blocks) {
    if (!block) continue;
    if (block.type === "animation_full") {
      meta.animationFull = true;
      meta.animationId = block.animationId || null;
      if (block.scroll) meta.scroll = true;
    }
    if (block.type === "break_section") {
      meta.type = "breakSection";
      meta.title = block.title;
      meta.steps = block.steps;
    }
    if (block.type === "break_video") {
      meta.type = "breakVideo";
      meta.title = block.title;
      if (block.videoSlug) meta.videoSlug = block.videoSlug;
    }
    if (block.type === "image") {
      meta.img = block.src;
      if (block.caption) meta.imgCap = block.caption;
      if (block.closed) meta.imgClosed = block.closed;
    }
    if (block.type === "further_reading") {
      meta._isFurtherReading = true;
      meta.title = block.title;
      meta.links = block.links;
    }
    if (block.type === "footnote") {
      meta._isFootnote = true;
      meta.footnoteNumber = block.number;
      meta.footnoteContent = block.content;
    }
  }
  return meta;
}
function contentBlocksToHTML(blocks) {
  if (!blocks || !Array.isArray(blocks)) return { text: "", hasHeading: false };
  let hasHeading = false;
  const html = blocks
    .map((block) => {
      if (!block) return "";
      if (block.type === "heading") {
        hasHeading = true;
        const level = block.level || 2;
        return `<h${level}>${block.content || ""}</h${level}>`;
      }
      if (block.type === "text" || block.type === "paragraph")
        return block.content || "";
      if (block.type === "code") return `<pre>${block.content || ""}</pre>`;
      if (block.type === "list") {
        const items = (block.items || []).map((i) => `<li>${i}</li>`).join("");
        return block.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      if (block.type === "blockquote")
        return `<blockquote>${block.content || ""}</blockquote>`;
      if (block.type === "image") return `<img/>`;
      if (block.type === "citation_ref") return `<sup>${block.number}</sup>`;
      if (block.type === "figure_placeholder") {
        const n = block.number;
        return `<span class="figure-ref">${n}</span>`;
      }
      if (
        [
          "animation",
          "animation_full",
          "break_section",
          "break_video",
          "further_reading",
          "footnote",
        ].includes(block.type)
      )
        return "";
      return block.content || "";
    })
    .join("");
  return { text: html, hasHeading };
}
function transformParagraph(p) {
  const blocks = p.content?.blocks || [];
  const cr = contentBlocksToHTML(blocks);
  const meta = extractChapter1Meta(blocks);
  const para = { id: p.id, text: cr.text, hasHeading: cr.hasHeading, ...meta };
  if (p.animation_id && p.animation_key) {
    para.animation = {
      name: p.animation_key.replace(/^animation/, ""),
      id: p.animation_key,
      title: p.animation_title || "",
      transition: p.animation_trigger === "scroll",
    };
  }
  return para;
}
function reconstructNesting(flat) {
  const result = [];
  let cur = null,
    grp = null;
  for (const p of flat) {
    const level = p.subsection_level || 0;
    if (p.is_subsection_header && level === 1) {
      if (cur) {
        if (grp) {
          cur.paragraphs.push({ subSubSection: grp });
          grp = null;
        }
      }
      cur = { id: p.id, title: p.content_text || "", paragraphs: [] };
      if (p.animation_id && p.animation_key) {
        cur.animation = {
          name: p.animation_key.replace(/^animation/, ""),
          id: p.animation_key,
          title: p.animation_title || "",
          transition: p.animation_trigger === "scroll",
        };
      }
      continue;
    }
    if (level === 2) {
      if (!grp) grp = [];
      grp.push(transformParagraph(p));
      continue;
    }
    if (level === 1 && cur) {
      if (grp) {
        cur.paragraphs.push({ subSubSection: grp });
        grp = null;
      }
      cur.paragraphs.push(transformParagraph(p));
      continue;
    }
    if (cur) {
      if (grp) {
        cur.paragraphs.push({ subSubSection: grp });
        grp = null;
      }
      result.push({ subSection: [cur] });
      cur = null;
    }
    result.push(transformParagraph(p));
  }
  if (cur) {
    if (grp) cur.paragraphs.push({ subSubSection: grp });
    result.push({ subSection: [cur] });
  }
  return result;
}
function mergeConsecutiveSubSections(paras) {
  const merged = [];
  let buf = [];
  for (const p of paras) {
    if (p.subSection) {
      buf.push(...p.subSection);
    } else {
      if (buf.length) {
        merged.push({ subSection: buf });
        buf = [];
      }
      merged.push(p);
    }
  }
  if (buf.length) merged.push({ subSection: buf });
  return merged;
}
function transformModule(module) {
  const sorted = [...module.sections].sort(
    (a, b) => a.order_index - b.order_index
  );
  const introSection = sorted.find(
    (s) => s.slug === "introduction" || s.order_index === 0
  );
  const fr = sorted.find((s) => s.slug === "further-reading");
  const fn = sorted.find((s) => s.slug === "footnotes");
  const main = sorted.filter((s) => s !== introSection && s !== fr && s !== fn);
  const intro = introSection
    ? [
        {
          id: introSection.id,
          title: introSection.title,
          animation: introSection.animation_config || undefined,
          paragraphs: introSection.paragraphs
            ? introSection.paragraphs
                .sort((a, b) => a.order_index - b.order_index)
                .map(transformParagraph)
            : [],
        },
      ]
    : [];
  const sections = main.map((section) => {
    const s = section.paragraphs
      ? [...section.paragraphs].sort((a, b) => a.order_index - b.order_index)
      : [];
    const hasNesting = s.some(
      (p) => (p.subsection_level || 0) > 0 || p.is_subsection_header
    );
    let paragraphs = hasNesting
      ? mergeConsecutiveSubSections(reconstructNesting(s))
      : s.map(transformParagraph);
    const obj = { id: section.id, title: section.title, paragraphs };
    if (section.animation_config) obj.animation = section.animation_config;
    return obj;
  });
  return { moduleId: module.id, intro, sections };
}

const chapter = {
  id: "x",
  sections: sections.map((s) => ({
    ...s,
    paragraphs: paragraphs.filter((p) => p.section_id === s.id),
  })),
};
const T = transformModule(chapter);

// ===== useAnimations.js transform (verbatim) =====
const statesByAnim = {};
for (const s of animStates) {
  (statesByAnim[s.animation_id] = statesByAnim[s.animation_id] || []).push(s);
}
const variantsByAnim = {};
for (const v of animVariants) {
  (variantsByAnim[v.animation_id] = variantsByAnim[v.animation_id] || []).push(
    v
  );
}
const transformedAnims = animFull.map((row) => {
  const config = row.config || {};
  const states = statesByAnim[row.id] || [];
  const variants = variantsByAnim[row.id] || [];
  const anim = { id: row.animation_key, title: row.title || "", ...config };
  const reg = states.filter((s) => !s.is_highlight_state);
  if (reg.length)
    anim.states = reg.map((s) => s.state_description || s.state_label);
  const hl = states.filter((s) => s.is_highlight_state);
  if (hl.length) anim.statesHighlight = hl.map((s) => s.state_label);
  if (variants.length && row.interaction_type === "switch")
    anim.switches = variants.map((v) => v.variant_label);
  if (row.video_file_url) anim.videoUrl = row.video_file_url;
  if (row.image_file_url) anim.imageUrl = row.image_file_url;
  if (row.youtube_id) anim.youtubeID = row.youtube_id;
  return anim;
});

fs.writeFileSync(
  "/tmp/dbcap/TRANSFORMED_TEXT.json",
  JSON.stringify(T, null, 1)
);
fs.writeFileSync(
  "/tmp/dbcap/TRANSFORMED_ANIMS.json",
  JSON.stringify(transformedAnims, null, 1)
);
console.log("TEXT: intro", T.intro.length, "sections", T.sections.length);
console.log("ANIMS transformed:", transformedAnims.length);
const withStates = transformedAnims.filter(
  (a) => a.states || a.statesHighlight || a.switches
);
console.log("anims WITH states/statesHighlight/switches:", withStates.length);
