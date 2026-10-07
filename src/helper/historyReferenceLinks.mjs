/** Generate a data-only, reviewable migration. This never connects to a server. */
export function historyReferenceLinksSql(manifest) {
  const metadataRepairs = manifest.metadataRepairs;
  const links = manifest.entries
    .filter((entry) => entry.status === "verified")
    .map((entry) => {
      const metadata = metadataRepairs.find(
        (repair) =>
          repair.chapterSlug === entry.chapterSlug &&
          repair.number === entry.number
      );
      return {
        chapterSlug: entry.chapterSlug,
        number: entry.number,
        // The narrow metadata repair runs first. All other snapshot fields,
        // including the original raw citation and publication date, stay exact.
        before: { ...entry.before, ...metadata?.after },
        doi: entry.doi,
        url: entry.url,
      };
    });
  const payload = JSON.stringify({ metadataRepairs, links }, null, 2);
  if (
    payload.includes("$reference_payload$") ||
    payload.includes("$reference_links$")
  )
    throw new Error("Unsafe SQL payload delimiter");
  return `-- History/Retina missing source links, verified 2026-10-05.
-- Generated from src/data/history/referenceLinks.json by
-- src/helper/historyReferenceLinks.mjs. Evidence and unresolved cases live there.
-- CODE-ONLY: no production reads or application have been performed.
-- Requires the preceding History source-content repair for reference 79.
-- Adds only verified links to exact snapshots with BOTH link fields still NULL.
-- Preserves all raw citations, dates, existing links, author-edited divergence,
-- unrelated chapters and unresolved references. No inserts or deletions.
-- Slugs are version-scoped: both updates fail closed on ambiguous chapter slugs.
-- One separately documented importer repair restores History 59 author/title.
-- Supabase owns the transaction; this DO statement never commits independently.
-- Before authorized application, retain a snapshot for rollback. Reverse a link
-- only if its complete after-snapshot still matches; restore prior NULL fields.
-- Reverse the metadata repair only if its complete after-snapshot still matches.

do $reference_links$
declare
  repair jsonb := $reference_payload$${payload}$reference_payload$::jsonb;
  item jsonb;
  changed integer;
  updated_links integer := 0;
  updated_metadata integer := 0;
begin
  for item in select value from jsonb_array_elements(repair->'metadataRepairs')
  loop
    update public."references" as r
    set authors = item->'after'->>'authors',
        title = item->'after'->>'title'
    from public.modules as m
    where r.module_id = m.id
      and m.slug = item->>'chapterSlug'
      and (select count(*) from public.modules as candidate
           where candidate.slug = item->>'chapterSlug') = 1
      and r.number = (item->>'number')::integer
      and to_jsonb(r) @> (item->'before');
    get diagnostics changed = row_count;
    updated_metadata := updated_metadata + changed;
    if changed = 0 then
      raise notice 'Reference metadata %/% skipped: ambiguous chapter, absent, already repaired or divergent snapshot',
        item->>'chapterSlug', item->>'number';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(repair->'links')
  loop
    update public."references" as r
    set doi = item->>'doi', url = item->>'url'
    from public.modules as m
    where r.module_id = m.id
      and m.slug = item->>'chapterSlug'
      and (select count(*) from public.modules as candidate
           where candidate.slug = item->>'chapterSlug') = 1
      and r.number = (item->>'number')::integer
      and r.doi is null and r.url is null
      and to_jsonb(r) @> (item->'before');
    get diagnostics changed = row_count;
    updated_links := updated_links + changed;
    if changed = 0 then
      raise notice 'Reference links %/% skipped: ambiguous chapter, absent, already linked or divergent snapshot',
        item->>'chapterSlug', item->>'number';
    end if;
  end loop;
  raise notice 'Reference repair: % link rows, % metadata rows updated',
    updated_links, updated_metadata;
end;
$reference_links$;
`;
}
