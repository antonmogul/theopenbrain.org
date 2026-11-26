-- OPENBRAIN-94: per-box title artwork. Deploy reader/assets before this seed.
-- Idempotent, preserving every already-authored box_card. No BEGIN/COMMIT.
-- Existing sections RLS stays in force: anon reads published modules only;
-- public.is_creator() gates writes (20260923000000 lockdown migration).
alter table public.sections add column if not exists box_card jsonb;
alter table public.sections drop constraint if exists sections_box_card_object;
alter table public.sections add constraint sections_box_card_object
  check (box_card is null or jsonb_typeof(box_card) = 'object');
comment on column public.sections.box_card is
  'Title card: {enabled?: boolean, image?: {src, alt, position?}, layers?: [{src, depth, alt?}], quote?: string}. Layers back-to-front, aligned canvases; depth 0..1. Flat image or static composite on phones/reduced motion. Null derives the current lead image.';

update public.sections s set box_card = '{"image": {"src": "/publicAssets/images/foundations/figa-01.jpg", "alt": "A skull covered in handwritten inscriptions, said to be Descartes''."}, "enabled": false}'::jsonb
from public.modules m where s.module_id=m.id
  and m.slug='foundations-of-neuroscience' and s.slug='box-descartes'
  and s.box_card is null;

update public.sections s set box_card = '{"image": {"alt": "A diagram of Galen''s physiology, with the rete mirabile at the base of the brain.", "src": "/publicAssets/images/foundations/figc-01.jpg"}}'::jsonb
from public.modules m where s.module_id=m.id
  and m.slug='foundations-of-neuroscience' and s.slug='box-rete-mirabile'
  and s.box_card is null;

update public.sections s set box_card = '{"image": {"src": "/publicAssets/images/foundations/fige-01.jpg", "alt": "Burckhardt''s trepanation tools in their case."}}'::jsonb
from public.modules m where s.module_id=m.id
  and m.slug='foundations-of-neuroscience' and s.slug='box-psychosurgery'
  and s.box_card is null;

update public.sections s set box_card = '{"image": {"src": "/publicAssets/images/foundations/figg-01-v2.webp", "alt": "A drawing of Mary Rafferty''s head showing the erosion of her skull."}}'::jsonb
from public.modules m where s.module_id=m.id
  and m.slug='foundations-of-neuroscience' and s.slug='box-electrical-stim'
  and s.box_card is null;

update public.sections s set box_card = '{"image": {"src": "/publicAssets/images/foundations/narrative/penfield-operative-h.jpg", "alt": "Operative photograph of patient M.B.’s exposed cortex, with lettered paper markers at electrical stimulation sites."}}'::jsonb
from public.modules m where s.module_id=m.id
  and m.slug='foundations-of-neuroscience' and s.slug='box-penfield'
  and s.box_card is null;

update public.sections s set box_card = '{"image": {"src": "/publicAssets/images/foundations/thumbs/rita-levi-montalcini.webp", "alt": "Video: History of Neuroscience, Rita Levi-Montalcini."}, "enabled": false}'::jsonb
from public.modules m where s.module_id=m.id
  and m.slug='foundations-of-neuroscience' and s.slug='box-ngf'
  and s.box_card is null;

update public.sections s set box_card = '{"image": {"src": "/publicAssets/images/foundations/boxes/hippocrates/original.webp", "alt": "Hippocrates refuses the gifts of Artaxerxes", "position": "50% 30%"}, "layers": [{"src": "/publicAssets/images/foundations/boxes/hippocrates/layer1.webp", "depth": 0.12, "alt": "Room and background"}, {"src": "/publicAssets/images/foundations/boxes/hippocrates/layer2.webp", "depth": 0.4, "alt": "Crowd"}, {"src": "/publicAssets/images/foundations/boxes/hippocrates/layer3.webp", "depth": 0.65, "alt": "Soft shadow"}, {"src": "/publicAssets/images/foundations/boxes/hippocrates/layer4.webp", "depth": 1, "alt": "Hippocrates"}]}'::jsonb
from public.modules m where s.module_id=m.id
  and m.slug='foundations-of-neuroscience' and s.slug='box-sacred-disease'
  and s.box_card is null;
