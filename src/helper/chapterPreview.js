// These previews only rearrange already loaded source text. There is no model,
// prompt submission, retrieval, persistence or network boundary here.
export function sourcePlainText(value) {
  if (typeof value !== "string" || typeof document === "undefined") return "";
  const template = document.createElement("template");
  template.innerHTML = value;
  template.content
    .querySelectorAll("script, style, iframe, object, template")
    .forEach((node) => node.remove());
  template.content
    .querySelectorAll(
      "br, hr, p, div, li, ul, ol, h1, h2, h3, h4, h5, h6, blockquote, pre, table, thead, tbody, tfoot, tr, th, td"
    )
    .forEach((node) => {
      node.before(document.createTextNode(" "));
      node.after(document.createTextNode(" "));
    });
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

function sourceBoundary(text, limit) {
  const space = text.lastIndexOf(" ", limit);
  if (space > 0) return space;
  let end = Math.min(limit, text.length);
  // A hard cut in a no-space passage must not create a lone UTF-16 surrogate.
  const previous = text.charCodeAt(end - 1);
  const next = text.charCodeAt(end);
  if (
    previous >= 0xd800 &&
    previous <= 0xdbff &&
    next >= 0xdc00 &&
    next <= 0xdfff
  )
    end -= 1;
  return end || Math.min(2, text.length);
}

function openingExcerpt(text, limit = 560) {
  if (text.length <= limit) return { text, shortened: false };
  const boundary = sourceBoundary(text, limit);
  return {
    text: text.slice(0, boundary),
    shortened: true,
  };
}

// The real transformer keeps `references` in chapter.sections, unlike its
// separately returned furtherReading/footNotes. Exclude back matter by exact
// section slug, never by title or substring (which could be narrative prose).
const NON_NARRATED_SECTION_SLUGS = new Set([
  "references",
  "bibliography",
  "further-reading",
  "footnotes",
]);

export function buildChapterPreview(chapter) {
  const title =
    sourcePlainText(chapter?.title || chapter?.intro?.[0]?.title) ||
    "Current chapter";
  const sections = [];
  const passages = [];
  const seen = new WeakSet();
  function visit(node, section = null) {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (NON_NARRATED_SECTION_SLUGS.has(node.slug)) return;
    if (["widget", "breakVideo", "breakSection"].includes(node.type)) return;
    const heading = sourcePlainText(node.title);
    if (heading) {
      section = {
        id: `source-section-${sections.length}`,
        heading,
        paragraphs: [],
      };
      sections.push(section);
      passages.push(heading);
    }
    const text = sourcePlainText(node.text);
    if (text) {
      if (!section) {
        section = {
          id: `source-section-${sections.length}`,
          heading: title,
          paragraphs: [],
        };
        sections.push(section);
      }
      section.paragraphs.push(text);
      passages.push(text);
    }
    for (const key of ["paragraphs", "subSection", "subSubSection"]) {
      if (Array.isArray(node[key]))
        node[key].forEach((child) => visit(child, section));
    }
  }
  for (const node of [
    ...(Array.isArray(chapter?.intro) ? chapter.intro : []),
    ...(Array.isArray(chapter?.sections) ? chapter.sections : []),
  ])
    visit(node);
  const readableSections = sections
    .filter((section) => section.paragraphs.length)
    .map((section) => ({
      ...section,
      excerpt: openingExcerpt(section.paragraphs[0]),
    }));
  const podcastSections = readableSections.slice(0, 4);
  const podcastLines = podcastSections.length
    ? [
        "SCRIPTED PODCAST-FORMAT PREVIEW — NOT AI-GENERATED",
        "Source: the currently loaded chapter. Formatting and whitespace are normalized; excerpts are not rewritten. This is a short source-reading preview, not a full episode.",
        `HOST: ${title}`,
        ...podcastSections.flatMap((section) => [
          `HOST: ${section.heading}`,
          `READER (${section.excerpt.shortened ? "shortened opening excerpt" : "opening excerpt"}): ${section.excerpt.text}`,
        ]),
        "HOST: End of this scripted preview.",
      ]
    : [];
  return {
    title,
    sections: readableSections,
    passages: readableSections.length ? passages : [],
    podcastLines,
    podcastTranscript: podcastLines.join("\n\n"),
  };
}

// Keep native utterances short without rewriting the source passage. Queue one
// at a time so Stop, navigation and mode changes cannot leave queued chapters.
export function speechChunks(passages, limit = 600) {
  const result = [];
  for (const passage of passages) {
    let remaining = passage.trim();
    while (remaining.length > limit) {
      const end = sourceBoundary(remaining, limit);
      result.push(remaining.slice(0, end));
      remaining = remaining.slice(end).trimStart();
    }
    if (remaining) result.push(remaining);
  }
  return result;
}
