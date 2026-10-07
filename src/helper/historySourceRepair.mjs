/** Build the reviewable, portable SQL migration from its audited source fixture.
 * This helper never connects to a database. Keep the generated SQL in sync via
 * the contract test; running a migration against production requires approval.
 */
export function historySourceRepairSql(fixture) {
  const {
    chapterSlug,
    source,
    paragraphUpdates,
    titles,
    fragments,
    figures,
    referenceUpdates,
    furtherReading,
  } = fixture;
  const payload = JSON.stringify(
    {
      chapterSlug,
      source,
      paragraphUpdates,
      titles,
      fragments,
      figures,
      referenceUpdates,
      furtherReading,
    },
    null,
    2
  );
  if (payload.includes("$history_source$")) {
    throw new Error("Unsafe SQL payload delimiter");
  }
  return `-- History source-content restoration, audited 2026-10-05.
-- Generated from src/data/history/sourceContentRepairs.json by
-- src/helper/historySourceRepair.mjs. Do not edit the embedded snapshots.
-- Source: Foundations_ST7_NM3_LL.docx, SHA-256 ${source.sha256}.
-- CODE-ONLY: not applied to production. Applied state is unknown.
-- Exact content/text snapshots protect divergent author edits. Slugs, not
-- production UUIDs, resolve every target. Existing humoral Figure K is untouched.
-- Fragment deletion is limited to three exact importer artifacts; every inbound
-- paragraph FK is checked and ANY dependent row causes an observable skip.
-- No CASCADE, ordering compaction, schema change, credential or permission change.
-- Retain an operator backup before authorized application. Reverse only matching
-- after snapshots. Deleted fragments may be restored from fixture before fields
-- at an empty original section/order; no inbound dependency exists at deletion.
-- Supabase's migration runner owns the transaction; this single DO statement
-- must not COMMIT separately from its migration-history entry.

do $history_repair$
declare
  repair jsonb := $history_source$${payload}$history_source$::jsonb;
  item jsonb;
  chapter_ids uuid[];
  chapter_id uuid;
  section_id uuid;
  figure_id uuid;
  para public.paragraphs%rowtype;
  dep record;
  has_dependent boolean;
  blocked boolean;
  id_attnum smallint;
  affected integer;
begin
  -- A slug is unique only within a content version. Never pick an arbitrary
  -- version or silently change every version of the chapter.
  select array_agg(id) into chapter_ids from public.modules
  where slug = repair->>'chapterSlug';
  if cardinality(chapter_ids) > 1 then
    raise exception 'History source repair: ambiguous chapter slug across content versions; select an approved version before applying';
  end if;
  chapter_id := chapter_ids[1];
  if chapter_id is null then
    raise notice 'History source repair: chapter absent; nothing changed';
    return;
  end if;
  perform 1 from public.modules where id = chapter_id for update;

  for item in select value from jsonb_array_elements(repair->'paragraphUpdates') loop
    update public.paragraphs p
    set content = item->'after'->'content',
        content_text = item->'after'->>'content_text', updated_at = now()
    from public.sections s
    where p.section_id = s.id and s.module_id = chapter_id
      and s.slug = item->>'sectionSlug'
      and p.order_index = (item->>'orderIndex')::integer
      and p.content = item->'before'->'content'
      and p.content_text is not distinct from item->'before'->>'content_text';
    get diagnostics affected = row_count;
    raise notice 'History source repair: paragraph %/% updated % (zero means already repaired, missing, or divergent)',
      item->>'sectionSlug', item->>'orderIndex', affected;
  end loop;

  for item in select value from jsonb_array_elements(repair->'titles') loop
    if item->>'before' = item->>'after' then continue; end if;
    update public.sections s set title = item->>'after', updated_at = now()
    where s.module_id = chapter_id and s.slug = item->>'sectionSlug'
      and s.title = item->>'before';
    get diagnostics affected = row_count;
    raise notice 'History source repair: title % updated % (zero means already repaired, missing, or divergent)',
      item->>'sectionSlug', affected;
  end loop;

  select attnum into id_attnum from pg_attribute
    where attrelid = 'public.paragraphs'::regclass and attname = 'id';
  for item in select value from jsonb_array_elements(repair->'fragments') loop
    -- FOR UPDATE blocks new FK references while this transaction checks and
    -- deletes; existing references are preserved regardless of their FK action.
    select p.* into para from public.paragraphs p
    join public.sections s on s.id = p.section_id
    where s.module_id = chapter_id and s.slug = item->>'sectionSlug'
      and s.title = item->>'requiredTitle'
      and p.order_index = (item->>'orderIndex')::integer
      and p.content = item->'before'->'content'
      and p.content_text is not distinct from item->'before'->>'content_text'
      and p.has_animation is false and p.animation_id is null
      and p.animation_trigger is null and p.is_subsection_header is false
      and p.subsection_level = 0
    for update of p;
    if not found then
      raise notice 'History source repair: fragment % skipped (absent, changed, or noncanonical title)', item->>'sectionSlug';
      continue;
    end if;
    blocked := false;
    for dep in
      select c.conrelid, c.conname, c.conkey, c.confkey, a.attname
      from pg_constraint c
      left join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and c.confrelid = 'public.paragraphs'::regclass
    loop
      -- Fail closed for unexpected composite or non-id references.
      if array_length(dep.conkey, 1) <> 1 or dep.confkey <> array[id_attnum] then
        blocked := true;
        raise notice 'History source repair: fragment % retained; unsupported inbound FK %',
          item->>'sectionSlug', dep.conname;
        exit;
      end if;
      execute format('select exists (select 1 from %s where %I = $1)',
        dep.conrelid::regclass, dep.attname) into has_dependent using para.id;
      if has_dependent then
        blocked := true;
        raise notice 'History source repair: fragment % retained; dependent data in % (%)',
          item->>'sectionSlug', dep.conrelid::regclass, dep.conname;
        exit;
      end if;
    end loop;
    if not blocked then
      -- Original source snapshots are retained in the fixture. Log the runtime
      -- identity as an additional restoration aid; the operator backup is primary.
      raise notice 'History source repair: deleting exact fragment %; original row %',
        item->>'sectionSlug', to_jsonb(para);
      delete from public.paragraphs where id = para.id;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(repair->'referenceUpdates') loop
    update public."references" r set
      authors = item->'after'->>'authors', title = item->'after'->>'title',
      journal = item->'after'->>'journal', year = (item->'after'->>'year')::integer,
      volume = item->'after'->>'volume', pages = item->'after'->>'pages',
      doi = item->'after'->>'doi', url = item->'after'->>'url',
      pub_type = item->'after'->>'pub_type', raw_text = item->'after'->>'raw_text'
    where r.module_id = chapter_id and r.number = (item->>'number')::integer
      and to_jsonb(r) @> (item->'before');
    get diagnostics affected = row_count;
    raise notice 'History source repair: reference % updated % (zero means already repaired, missing, or divergent)',
      item->>'number', affected;
  end loop;

  for item in select value from jsonb_array_elements(repair->'figures') loop
    select p.* into para from public.paragraphs p
    join public.sections s on s.id = p.section_id
    where s.module_id = chapter_id and s.slug = item->>'sectionSlug'
      and p.order_index = (item->>'orderIndex')::integer
      and p.content = item->'before'->'content'
      and p.content_text is not distinct from item->'before'->>'content_text'
      and p.animation_id is null and p.has_animation is false
      and p.animation_trigger is null
    for update of p;
    if not found then
      raise notice 'History source repair: figure % attachment skipped (already attached, missing, or divergent)', item->>'animationKey';
      continue;
    end if;
    insert into public.animations
      (animation_key, title, media_type, interaction_type, component_name,
       config, image_file_url, scientific_domain, load_priority)
    values (item->>'animationKey', item->>'title', 'image', 'static_image',
      'IllustrationPlaceholder', item->'config', item->>'imageFileUrl', 'history', 'low')
    on conflict (animation_key) do nothing;
    select id into figure_id from public.animations
    where animation_key = item->>'animationKey' and title = item->>'title'
      and media_type = 'image' and interaction_type = 'static_image'
      and component_name = 'IllustrationPlaceholder' and config = item->'config'
      and image_file_url = item->>'imageFileUrl' and scientific_domain = 'history';
    if figure_id is null then
      raise notice 'History source repair: figure % retained existing divergent artwork; attachment skipped', item->>'animationKey';
      continue;
    end if;
    update public.paragraphs set animation_id = figure_id,
      has_animation = true, animation_trigger = 'auto', updated_at = now()
    where id = para.id;
    raise notice 'History source repair: figure % attached to %/%',
      item->>'animationKey', item->>'sectionSlug', item->>'orderIndex';
  end loop;

  item := repair->'furtherReading';
  select id into section_id from public.sections
    where module_id = chapter_id and slug = item->>'sectionSlug';
  if section_id is null then
    insert into public.sections (module_id, title, slug, order_index)
    select chapter_id, item->>'title', item->>'sectionSlug', coalesce(max(order_index), -1) + 1
    from public.sections where module_id = chapter_id
    returning id into section_id;
    insert into public.paragraphs (section_id, content, content_text, order_index)
    values (section_id, item->'paragraph'->'content', item->'paragraph'->>'content_text', 0);
    raise notice 'History source repair: restored source Further reading section';
  else
    raise notice 'History source repair: Further reading already exists; retained without changes';
  end if;
end
$history_repair$;
`;
}
