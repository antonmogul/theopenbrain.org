-- OPENBRAIN-87: the History chapter's figures and widgets put together.
--
-- 1. Figure 4 (case 20 of the Edwin Smith papyrus, now the tabs widget) goes
--    on the paragraph that tells case 20; Figure 3 (the papyrus itself), which
--    held that paragraph, moves to the one before it, which introduces
--    Egyptian writing. Both paragraphs cite their figure; the left pane shows
--    the figure of the paragraph being read.
-- 2. Figure B (Descartes' skull at Lund) joins Figure A's pane as its second
--    image: the one paragraph citing them cites both.
-- 3. The case cabinet and the phrenology widget sit on the page instead of
--    behind an "Open interactive" card (kind 'inline'). Either can be put
--    back on a card from the chapter editor ("On the page").
--
-- Figure 2 (trepanation) needs no change here: the reader hands its row to
-- the new widget by its animation key. Each step is guarded by the state it
-- expects, so a re-run, or a creator's own change since, is left alone.
-- The paragraphs are production's own rows (the seed gave them random ids),
-- so on any other database the steps match nothing and the check steps
-- aside.

begin;

-- 1. Figures 3 and 4.
update public.paragraphs
set animation_id = (select id from public.animations where animation_key = 'animationFoundationsFig3'),
    animation_trigger = 'auto'
where id = '806e2b05-05d4-4302-9805-848e8231848b'
  and animation_id is null;

update public.paragraphs
set animation_id = (select id from public.animations where animation_key = 'animationFoundationsFig4')
where id = 'd8cca9b1-8463-41eb-a7d9-096fc42b7d7b'
  and animation_id = (select id from public.animations where animation_key = 'animationFoundationsFig3')
  and exists (select 1 from public.animations where animation_key = 'animationFoundationsFig4');

-- 2. Figure B as Figure A's second image.
update public.animations a
set config = jsonb_set(
  a.config,
  '{images}',
  (a.config -> 'images') || jsonb_build_array(
    (b.config -> 'images' -> 0) || jsonb_build_object('caption', b.config ->> 'caption')
  )
)
from public.animations b
where a.animation_key = 'animationFoundationsFigA'
  and b.animation_key = 'animationFoundationsFigB'
  and jsonb_array_length(a.config -> 'images') = 1
  and jsonb_array_length(b.config -> 'images') >= 1
  and not (a.config -> 'images') @> jsonb_build_array(jsonb_build_object('src', b.config -> 'images' -> 0 ->> 'src'));

-- 3. The two widgets on the page.
update public.paragraphs p
set content = jsonb_set(
  p.content,
  '{blocks}',
  (
    select jsonb_agg(
      case
        when blk ->> 'type' = 'widget'
         and blk ->> 'widgetId' in ('case-cabinet', 'phrenology')
         and blk ->> 'kind' = 'breakout'
        then blk || '{"kind": "inline"}'::jsonb
        else blk
      end
      order by ord
    )
    from jsonb_array_elements(p.content -> 'blocks') with ordinality as t(blk, ord)
  )
)
from public.sections s, public.modules m
where s.id = p.section_id
  and m.id = s.module_id
  and m.slug = 'foundations-of-neuroscience'
  and exists (
    select 1 from jsonb_array_elements(p.content -> 'blocks') blk
    where blk ->> 'type' = 'widget'
      and blk ->> 'widgetId' in ('case-cabinet', 'phrenology')
      and blk ->> 'kind' = 'breakout'
  );

-- Check the result; any failure rolls the whole migration back.
do $$
declare
  fig3 uuid := (select id from public.animations where animation_key = 'animationFoundationsFig3');
  fig4 uuid := (select id from public.animations where animation_key = 'animationFoundationsFig4');
  n int;
begin
  if not exists (select 1 from public.paragraphs where id = '806e2b05-05d4-4302-9805-848e8231848b') then
    raise notice 'history: not production''s History rows, nothing to check';
    return;
  end if;
  if fig3 is null or fig4 is null then
    raise exception 'history: the figure 3 or figure 4 row is missing';
  end if;
  if (select animation_id from public.paragraphs where id = '806e2b05-05d4-4302-9805-848e8231848b') is distinct from fig3 then
    raise exception 'history: figure 3 is not on the Egyptian-writing paragraph';
  end if;
  if (select animation_id from public.paragraphs where id = 'd8cca9b1-8463-41eb-a7d9-096fc42b7d7b') is distinct from fig4 then
    raise exception 'history: figure 4 is not on the case 20 paragraph';
  end if;
  if not exists (
    select 1 from public.animations a, public.animations b
    where a.animation_key = 'animationFoundationsFigA'
      and b.animation_key = 'animationFoundationsFigB'
      and (a.config -> 'images') @> jsonb_build_array(jsonb_build_object('src', b.config -> 'images' -> 0 ->> 'src'))
  ) then
    raise exception 'history: figure B is not in figure A''s pane';
  end if;
  select count(*) into n
    from public.paragraphs p
    join public.sections s on s.id = p.section_id
    join public.modules m on m.id = s.module_id,
    jsonb_array_elements(p.content -> 'blocks') blk
   where m.slug = 'foundations-of-neuroscience'
     and blk ->> 'type' = 'widget'
     and blk ->> 'widgetId' in ('case-cabinet', 'phrenology')
     and blk ->> 'kind' = 'inline';
  if n is distinct from 2 then
    raise exception 'history: % of the 2 widgets are on the page', n;
  end if;
end $$;

commit;
