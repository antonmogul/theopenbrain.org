-- OPENBRAIN-97: Stuart's replacement pictures for the Retina section openers.
-- Anchors are the contents rows, not animation/figure records. Deploy assets first.
-- Guard only the four art keys replaced; keep any unrelated CMS metadata.
-- Idempotent: accepts the exact former placeholder or the replacement keys.
-- Any author edit to these keys aborts the entire block. No production writes here.
do $retina_art$
declare
  picture record;
  target record;
  current_keys jsonb;
  before_keys jsonb;
  after_keys jsonb;
begin
  for picture in select * from (values
    ('introduction', 'introduction', 'The Retina', '{"src":"/publicAssets/images/the-retina/sections/vesalius-eye.webp","alt":"An anatomical plate of eyes by Vesalius","position":"50% 50%"}'::jsonb),
    ('story-of-the-eye', 'story-of-the-eye', 'Story of the eye', '{"src":"/publicAssets/images/the-retina/sections/zinn-eye-plates.webp","alt":"Three anatomical plates of the eye by Johann Zinn","position":"50% 50%"}'::jsonb),
    ('organization-and-cell-types-in-the-retina', 'organization-and-cell-types-in-the-retina', 'Organization and cell types in the retina', '{"src":"/publicAssets/images/the-retina/sections/muller-retina.webp","alt":"Müller’s drawings of the layers of the retina","position":"50% 50%"}'::jsonb),
    ('photoreceptors-and-phototransduction', 'photoreceptors-and-phototransduction', 'Photoreceptors and phototransduction', '{"src":"/publicAssets/images/the-retina/sections/muller-photoreceptors.webp","alt":"Müller’s drawings of rod and cone photoreceptors","position":"50% 50%"}'::jsonb),
    ('horizontal-cells-and-feedback', 'horizontal-cells-and-feedback', 'Horizontal cells and feedback', '{"src":"/publicAssets/images/the-retina/sections/xin-bloomfield-horizontal-cells.webp","alt":"Horizontal cells in a retinal micrograph by Xin and Bloomfield","position":"50% 50%"}'::jsonb),
    ('amacrine-and-ganglion-cells-circuits-computations-and-output', 'amacrine-and-ganglion-cells-circuits-computations-and-output', 'Amacrine and ganglion cells – circuits, computations and output', '{"src":"/publicAssets/images/the-retina/sections/famiglietti-starburst-cell.webp","alt":"A starburst amacrine cell drawn by Famiglietti","position":"50% 50%"}'::jsonb),
    ('retinal-vision-in-the-real-world', 'retinal-vision-in-the-real-world', 'Retinal vision in the ‘real world’', '{"src":"/publicAssets/images/the-retina/sections/yarbus-eye-movements.webp","alt":"A portrait beside the eye movements recorded while viewing it, from Yarbus","position":"50% 50%"}'::jsonb),
    ('references', 'footnotes', 'Footnotes', '{"src":"/publicAssets/images/the-retina/sections/john-dowling.webp","alt":"A portrait of John Dowling","position":"50% 50%"}'::jsonb),
    ('retinal-development', 'retinal-development', 'Retinal development', '{"src":"/publicAssets/images/the-retina/sections/cajal-retinal-development.webp","alt":"Cajal’s drawings of developing retinal cells","position":"50% 50%"}'::jsonb),
    ('diseases-disorders-and-treatments', 'diseases-disorders-and-treatments', 'Diseases, disorders, and treatments', '{"src":"/publicAssets/images/the-retina/sections/fundus-left-eye.webp","alt":"A fundus photograph of the left eye supplied by Stuart Trenholm","position":"50% 50%"}'::jsonb),
    ('looking-forward', 'looking-forward', 'Looking forward', '{"src":"/publicAssets/images/the-retina/sections/book-of-ten-treatises.webp","alt":"An illustrated page from the Book of the Ten Treatises of the Eye","position":"50% 50%"}'::jsonb)
  ) as p(slug, old_slug, old_title, art) loop
    before_keys := jsonb_build_object(
      'src', '/publicAssets/images/the-retina/sections/placeholder-' || picture.old_slug || '.webp',
      'alt', 'Placeholder image for ' || picture.old_title || '; temporary chapter-colour artwork',
      'position', '50% 50%', 'placeholder', true);
    after_keys := picture.art || '{"placeholder":null}'::jsonb;
    for target in
      select s.id, s.art from public.sections s join public.modules m on m.id=s.module_id
      where m.slug='the-retina' and m.status in ('published','draft') and s.slug=picture.slug
    loop
      current_keys := jsonb_build_object('src', target.art->'src', 'alt', target.art->'alt',
        'position', target.art->'position', 'placeholder', target.art->'placeholder');
      if current_keys = before_keys then
        update public.sections set art=(art - 'placeholder') || picture.art, updated_at=now()
          where id=target.id;
      elsif current_keys is distinct from after_keys then
        raise exception 'OPENBRAIN-97: section art drift in %; preserve the author edit and reconcile first', picture.slug;
      end if;
    end loop;
  end loop;
end
$retina_art$;
