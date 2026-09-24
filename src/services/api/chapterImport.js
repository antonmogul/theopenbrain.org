/**
 * Create a whole chapter from the Chapter Wizard's import (OPENBRAIN-78).
 *
 * The wizard used to write a chapter piece by piece (one request per
 * section and per paragraph), so a failure part-way left half a chapter
 * behind. This writes sections, paragraphs and references in a few bulk
 * inserts and, if anything fails, deletes what it created: removing the
 * module cascades to its sections, paragraphs and references, and a content
 * version it created for the chapter goes too. The error says whether the
 * clean-up worked.
 *
 * (A single database transaction would be stronger; that needs an RPC
 * migration. This is the client-side equivalent.)
 */
import { post, del } from "./client";
import { fetchVersions, createVersion } from "./versions";

const CHUNK = 200; // rows per bulk insert

async function insertAll(table, rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = await post(table, rows.slice(i, i + CHUNK));
    if (!Array.isArray(part) || part.length !== rows.slice(i, i + CHUNK).length)
      throw new Error(`Saving ${table} didn't return every row.`);
    out.push(...part);
  }
  return out;
}

/**
 * @param {{ meta: object, sections: Array, references?: Array, userId?: string }} input
 * @returns {Promise<object>} the created module row
 */
export async function importChapter({
  meta,
  sections,
  references = [],
  userId,
}) {
  const created = { moduleId: null, versionId: null };
  try {
    const versions = await fetchVersions();
    let versionId = versions.find((v) => v.status === "draft")?.id;
    if (!versionId) {
      const version = await createVersion(
        {
          version_number: `v${versions.length + 1}.0`,
          release_notes: `Created for chapter: ${meta.title}`,
        },
        userId
      );
      versionId = created.versionId = version.id;
    }

    const [chapter] = await post("modules", {
      title: meta.title,
      slug: meta.slug,
      description: meta.description || null,
      ramp: meta.ramp || null,
      order_index: meta.order_index || 0,
      status: "draft",
      content_version_id: versionId,
      created_by: userId,
    });
    if (!chapter?.id) throw new Error("The chapter couldn't be created.");
    created.moduleId = chapter.id;

    const sectionRows = await insertAll(
      "sections",
      sections.map((s) => ({
        module_id: chapter.id,
        title: s.title,
        slug: s.slug,
        order_index: s.order_index,
      }))
    );
    const paragraphs = sections.flatMap((s, i) =>
      (s.paragraphs || []).map((p) => ({
        section_id: sectionRows[i].id,
        content: p.content,
        content_text: p.content_text,
        order_index: p.order_index,
        is_subsection_header: !!p.is_subsection_header,
        subsection_level: p.subsection_level || 0,
      }))
    );
    if (paragraphs.length) await insertAll("paragraphs", paragraphs);
    if (references.length)
      await insertAll(
        "references",
        references.map((r) => ({
          module_id: chapter.id,
          number: r.number,
          authors: r.authors,
          title: r.title,
          journal: r.journal,
          year: r.year,
          volume: r.volume,
          pages: r.pages,
          doi: r.doi,
          url: r.url,
          pub_type: r.pub_type,
          raw_text: r.raw_text,
        }))
      );
    return chapter;
  } catch (err) {
    const cleanup = [];
    if (created.moduleId)
      await del(`modules?id=eq.${created.moduleId}`).catch((e) =>
        cleanup.push(e)
      );
    if (created.versionId)
      await del(`content_versions?id=eq.${created.versionId}`).catch((e) =>
        cleanup.push(e)
      );
    const what = err.message || "Saving the chapter failed.";
    if (!created.moduleId && !created.versionId) throw new Error(what);
    throw new Error(
      cleanup.length
        ? `${what} Part of the chapter may remain — delete “${meta.title}” from Chapters before trying again.`
        : `${what} Nothing was saved: the partly created chapter was removed, so you can try again.`
    );
  }
}
