-- OPENBRAIN-43: History Figure 2, the trepanation methods, as five frames.
--
-- The artwork is the "Fig 2 Animation" component in Figma (Open-Brain-Chapters,
-- node 3:1929): the same skull five times, first alone, then with a hand
-- demonstrating each numbered method in turn. Exported from the section so the
-- numbered callouts (separate layers) come with it, and cropped to the skull
-- card so all five frames line up and only the hand moves as the figure
-- cycles. Files: public/publicAssets/images/foundations/fig02-0N.jpg.
--
-- The first frame shows the figure legend; each method frame carries the
-- legend's own words for its method. The viewer's pace scales with caption
-- length, so the legend gets time to be read and the method frames step on.
--
-- Same conventions as 20260917010000: config.placeholder stays true so reader
-- builds that predate the image viewer keep routing the row to the figure
-- shell; image_file_url is the first frame. Idempotent. No BEGIN/COMMIT.

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig02-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Different trepanation methods, including scraping (1), grooving (2), drilling a perimeter around the hole (3) and cutting a rectangular opening (4) (Lisowski, 1967).$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig02-01.jpg",
    "alt": "A trepanned skull in profile with four healed openings, numbered 1 to 4."
  },
  {
    "src": "/publicAssets/images/foundations/fig02-02.jpg",
    "caption": "Scraping (1).",
    "alt": "A hand scrapes the skull with a stone at opening 1."
  },
  {
    "src": "/publicAssets/images/foundations/fig02-03.jpg",
    "caption": "Grooving (2).",
    "alt": "A hand cuts a circular groove into the skull at opening 2."
  },
  {
    "src": "/publicAssets/images/foundations/fig02-04.jpg",
    "caption": "Drilling a perimeter around the hole (3).",
    "alt": "A hand holds a drill to the skull at opening 3."
  },
  {
    "src": "/publicAssets/images/foundations/fig02-05.jpg",
    "caption": "Cutting a rectangular opening (4).",
    "alt": "A hand cuts the skull with a stone blade at opening 4."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig2';

do $$
declare
  n int;
begin
  select jsonb_array_length(config -> 'images') into n
    from public.animations where animation_key = 'animationFoundationsFig2';
  if n is distinct from 5 then
    raise exception 'foundations figure 2: expected 5 frames, got %', n;
  end if;
end $$;
