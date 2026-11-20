-- OPENBRAIN-61. Deploy reader first; no production writes from local tooling.
-- Defaults are merged underneath each block: creator-authored media fields win.
-- The catalog preserves standalone URLs, including the two unplaced films.
create table if not exists public.break_videos (
  module_id uuid not null references public.modules(id) on delete cascade,
  slug text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  primary key (module_id, slug)
);
alter table public.break_videos enable row level security;
grant select on public.break_videos to anon, authenticated;
grant insert, update, delete on public.break_videos to authenticated;
drop policy if exists break_videos_read on public.break_videos;
create policy break_videos_read on public.break_videos for select using (
  exists (select 1 from public.modules m where m.id = module_id and m.status = 'published')
  or public.is_creator()
);
drop policy if exists break_videos_create on public.break_videos;
create policy break_videos_create on public.break_videos for all to authenticated
  using (public.is_creator()) with check (public.is_creator());

insert into public.break_videos(module_id, slug, data)
select id, 'placeholder', $ob61${"title": "This is a Placeholder", "text": "Here you will be able to see people talking about things", "videoSlug": "placeholder", "src": "/publicAssets/video/breakSections/placeholder.mp4", "poster": "/publicAssets/images/placeholders/monaLisa.webp", "speaker": ""}$ob61$::jsonb from public.modules where slug = 'the-retina'
on conflict (module_id, slug) do nothing;

insert into public.break_videos(module_id, slug, data)
select id, 'dowling-and-werblin', $ob61${"title": "John Dowling", "text": "Retinal cell types, connectivity and responses.", "videoSlug": "dowling-and-werblin", "src": "/publicAssets/video/breakSections/dowling-and-werblin.mp4", "poster": "/publicAssets/images/breakVideos/dowling-and-werblin.png", "speaker": "John Dowling"}$ob61$::jsonb from public.modules where slug = 'the-retina'
on conflict (module_id, slug) do nothing;

insert into public.break_videos(module_id, slug, data)
select id, 'baden', $ob61${"title": "Tom Baden", "text": "Is our retina really upside down?", "src": "/publicAssets/videos/baden.mp4", "poster": "/publicAssets/videos/baden.webp", "videoSlug": "baden", "speaker": "Tom Baden"}$ob61$::jsonb from public.modules where slug = 'the-retina'
on conflict (module_id, slug) do nothing;

insert into public.break_videos(module_id, slug, data)
select id, 'neitz-myopia', $ob61${"title": "Maureen and Jay Neitz", "text": "Possible causes and cures for myopia", "videoSlug": "neitz-myopia", "src": "/publicAssets/video/breakSections/neitz-myopia.mp4", "poster": "/publicAssets/images/breakVideos/neitz-myopia.png", "speaker": "Maureen and Jay Neitz"}$ob61$::jsonb from public.modules where slug = 'the-retina'
on conflict (module_id, slug) do nothing;

with media_updates as (
  select p.id, jsonb_set(p.content, '{blocks}', (
  select jsonb_agg(case when b->>'type' = 'break_video' then
    coalesce((select v.data from public.break_videos v
      where v.module_id = s.module_id and v.slug = b->>'videoSlug'), '{}'::jsonb) || b
    when b->>'type' = 'break_section' and jsonb_typeof(b->'video') = 'object' then
      jsonb_set(b, '{video}', coalesce((select v.data from public.break_videos v
        where v.module_id = s.module_id and v.slug = b->'video'->>'videoSlug'), '{}'::jsonb) || (b->'video'))
    else b end order by ord)
  from jsonb_array_elements(p.content->'blocks') with ordinality as items(b, ord)
)) as content
  from public.paragraphs p, public.sections  s join public.modules m on m.id = s.module_id
where p.section_id = s.id and m.slug = 'the-retina'
  and exists (select 1 from jsonb_array_elements(p.content->'blocks') b
    where b->>'type' in ('break_video', 'break_section'))
)
update public.paragraphs p set content = u.content, updated_at = now()
from media_updates u where p.id = u.id and p.content is distinct from u.content;

-- Rewrite only matching hover start tags, never the paragraph's prose.
update public.paragraphs p set content = jsonb_set(p.content, '{blocks}', (
  select jsonb_agg(case when b->>'type' in ('text', 'paragraph') and b->>'content' like '%<span id=''alcmeon'' class=''hoverImg''>%' then
    jsonb_set(b, '{content}', to_jsonb(replace(b->>'content', $tag$<span id='alcmeon' class='hoverImg'>$tag$, $tag$<span id='alcmeon' class='hoverImg' tabindex="0" data-hover-src="/publicAssets/hoverImges/alcmeon.jpg" data-hover-alt="alcmeon" data-hover-text="Alcmaeon of Croton (/ælkˈmiːɒn/; Greek: Ἀλκμαίων ὁ Κροτωνιάτης, Alkmaiōn, gen.: Ἀλκμαίωνος; fl. 5th century BC) was an early Greek medical writer and philosopher-scientist. He has been described as one of the most eminent natural philosophers and medical theorists of antiquity and he has also been referred to as &#x27;a thinker of considerable originality and one of the greatest philosophers, naturalists, and neuroscientists of all time.&#x27;[2] His work in biology has been described as remarkable, and his originality made him likely a pioneer. Because of difficulties dating Alcmaeon&#x27;s birth, his importance has been neglected.">$tag$))) else b end order by ord)
  from jsonb_array_elements(p.content->'blocks') with ordinality as items(b, ord)
)), updated_at = now()
from public.sections s join public.modules m on m.id = s.module_id
where p.section_id = s.id and m.slug = 'the-retina'
  and exists (select 1 from jsonb_array_elements(p.content->'blocks') b
    where b->>'type' in ('text', 'paragraph') and position($tag$<span id='alcmeon' class='hoverImg'>$tag$ in b->>'content') > 0);
update public.paragraphs p set content = jsonb_set(p.content, '{blocks}', (
  select jsonb_agg(case when b->>'type' in ('text', 'paragraph') and b->>'content' like '%<span id=''islamicGoldenAge'' class=''hoverImg''>%' then
    jsonb_set(b, '{content}', to_jsonb(replace(b->>'content', $tag$<span id='islamicGoldenAge' class='hoverImg'>$tag$, $tag$<span id='islamicGoldenAge' class='hoverImg' tabindex="0" data-hover-src="/publicAssets/hoverImges/islamicGoldenAge.jpg" data-hover-alt="islamicGoldenAge" data-hover-text="The Islamic Golden Age was a period of cultural, economic, and scientific flourishing in the history of Islam, traditionally dated from the 8th century to the 14th century. This period is traditionally understood to have begun during the reign of the Abbasid caliph Harun al-Rashid (786 to 809) with the inauguration of the House of Wisdom in Baghdad, the world&#x27;s largest city by then, where Muslim scholars and polymaths from various parts of the world with different cultural backgrounds were mandated to gather and translate all of the known world&#x27;s classical knowledge into Aramaic and Arabic.">$tag$))) else b end order by ord)
  from jsonb_array_elements(p.content->'blocks') with ordinality as items(b, ord)
)), updated_at = now()
from public.sections s join public.modules m on m.id = s.module_id
where p.section_id = s.id and m.slug = 'the-retina'
  and exists (select 1 from jsonb_array_elements(p.content->'blocks') b
    where b->>'type' in ('text', 'paragraph') and position($tag$<span id='islamicGoldenAge' class='hoverImg'>$tag$ in b->>'content') > 0);

-- Keep the section UUID, all 106 paragraph UUIDs, content and reference numbers.
-- Fail closed on unexpected shape/count/numbering or an existing references section.
do $$
declare target uuid;
begin
  select s.id into target from public.sections s join public.modules m on m.id = s.module_id
  where m.slug = 'the-retina' and s.slug = 'footnotes' and s.title = 'Footnotes'
    and not exists (select 1 from public.sections r where r.module_id = s.module_id and r.slug = 'references');
  if target is null then return; end if;
  if (select count(*) from public.paragraphs where section_id = target) <> 106
    or exists (select 1 from public.paragraphs p where p.section_id = target and (
      jsonb_array_length(p.content->'blocks') <> 1
      or p.content->'blocks'->0->>'type' is distinct from 'footnote'
      or p.content->'blocks'->0->>'number' is distinct from (p.order_index + 1)::text
      or jsonb_typeof(p.content->'blocks'->0->'content') is distinct from 'string'
    )) then raise exception 'OPENBRAIN-61: footnote shape changed; inspect before retrying'; end if;
  update public.paragraphs p set content = jsonb_set(p.content, '{blocks,0,type}', '"reference"'::jsonb), updated_at = now()
    where p.section_id = target;
  update public.sections set slug = 'references', title = 'References', updated_at = now() where id = target;
end $$;
