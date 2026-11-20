-- OPENBRAIN-63: copy the rollout maps as they read on 20 Nov 2026.
-- Only missing keys are filled; authored values and unrelated JSON survive.
-- No prose, review_feedback, status, order or placement changes.
-- Deploy the DB-first reader first, then apply 066300 followed by 066301.

update public.modules set cover = coalesce(cover, '{}'::jsonb) ||
  case when not coalesce(cover, '{}'::jsonb) ? 'image' then jsonb_build_object('image', coalesce(nullif(btrim(cover_image_url), ''), '/publicAssets/images/attention-matisse-reader.jpg')) else '{}'::jsonb end ||
  case when not coalesce(cover, '{}'::jsonb) ? 'reactive' then $settings${
  "reactive": {
    "kind": "head",
    "paper": "#F8F2E4",
    "ink": "#1c1c1c",
    "size": [
      2680,
      1732
    ],
    "fit": [
      470,
      40,
      1540,
      1660
    ],
    "poster": "/publicAssets/images/covers/foundations-hero/head/poster.webp",
    "oval": {
      "src": "/publicAssets/images/covers/foundations-hero/head/oval.webp",
      "at": [
        1106,
        345
      ]
    },
    "brain": {
      "src": "/publicAssets/images/covers/foundations-hero/head/brain.webp",
      "at": [
        1100,
        321
      ]
    },
    "body": {
      "frames": [
        "/publicAssets/images/covers/foundations-hero/head/body/00.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/01.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/02.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/03.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/04.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/05.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/06.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/07.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/08.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/09.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/10.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/11.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/12.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/13.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/14.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/15.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/16.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/17.webp",
        "/publicAssets/images/covers/foundations-hero/head/body/18.webp"
      ],
      "fps": 12,
      "at": [
        783,
        354
      ]
    },
    "lid": {
      "src": "/publicAssets/images/covers/foundations-hero/head/lid.webp",
      "outline": "/publicAssets/images/covers/foundations-hero/head/lidS.webp",
      "at": [
        991,
        305
      ],
      "pivot": [
        1264.6,
        459.3
      ]
    },
    "hand": {
      "src": "/publicAssets/images/covers/foundations-hero/head/hand.webp",
      "tip": [
        20,
        874
      ],
      "scale": 1.2,
      "size": [
        1102,
        998
      ]
    },
    "work": {
      "x": 1470,
      "y": 400,
      "rx": 2,
      "ry": 1
    },
    "keys": {
      "first": 5,
      "open": 16,
      "keys": [
        [
          0,
          0,
          0,
          46,
          74
        ],
        [
          -1.1,
          -1,
          0,
          44,
          72
        ],
        [
          -5.5,
          -5.6,
          0.16,
          41,
          71
        ],
        [
          -14.1,
          -13.8,
          0.85,
          37,
          70
        ],
        [
          -35.2,
          -34.8,
          2.6,
          29,
          63
        ],
        [
          -112.3,
          -106.1,
          6.5,
          8,
          28
        ],
        [
          -195.1,
          -178.3,
          4.7,
          -13,
          -7
        ],
        [
          -218.9,
          -200.1,
          3.9,
          -20,
          -17
        ],
        [
          -229.4,
          -209.9,
          3.7,
          -22,
          -21
        ],
        [
          -234.1,
          -214.2,
          3.8,
          -24,
          -23
        ],
        [
          -235,
          -215.3,
          3.75,
          -24,
          -24
        ],
        [
          -235,
          -215.3,
          3.75,
          -24,
          -24
        ]
      ]
    }
  }
}$settings$::jsonb else '{}'::jsonb end
where slug = 'foundations-of-neuroscience' and (cover is null or jsonb_typeof(cover) = 'object')
  and (not coalesce(cover, '{}'::jsonb) ? 'image' or not coalesce(cover, '{}'::jsonb) ? 'reactive');

update public.modules set cover = coalesce(cover, '{}'::jsonb) ||
  case when not coalesce(cover, '{}'::jsonb) ? 'image' then jsonb_build_object('image', coalesce(nullif(btrim(cover_image_url), ''), '/publicAssets/images/00-matisse-bg.jpg')) else '{}'::jsonb end ||
  case when not coalesce(cover, '{}'::jsonb) ? 'reactive' then $settings${
  "reactive": {
    "lottie": "/publicAssets/animations/covers/matisse-eyes.json",
    "axis": "x",
    "fit": "slice",
    "kind": "lottie"
  }
}$settings$::jsonb else '{}'::jsonb end
where slug = 'the-retina' and (cover is null or jsonb_typeof(cover) = 'object')
  and (not coalesce(cover, '{}'::jsonb) ? 'image' or not coalesce(cover, '{}'::jsonb) ? 'reactive');

update public.modules set cover = coalesce(cover, '{}'::jsonb) ||
  case when not coalesce(cover, '{}'::jsonb) ? 'image' then jsonb_build_object('image', coalesce(nullif(btrim(cover_image_url), ''), '/publicAssets/images/attention-matisse-reader.jpg')) else '{}'::jsonb end ||
  case when not coalesce(cover, '{}'::jsonb) ? 'reactive' then $settings${
  "reactive": null
}$settings$::jsonb else '{}'::jsonb end
where slug = 'attention-and-working-memory' and (cover is null or jsonb_typeof(cover) = 'object')
  and (not coalesce(cover, '{}'::jsonb) ? 'image' or not coalesce(cover, '{}'::jsonb) ? 'reactive');

update public.modules set credits = coalesce(credits, '{}'::jsonb) || $settings${
  "funding": {
    "text": "This chapter was funded by the Vision Science Research Network.",
    "url": "https://visionnetwork.ca/",
    "logo": {
      "src": "/publicAssets/images/funders/vision-science-research-network.webp",
      "alt": "Vision Science Research Network",
      "width": 758,
      "height": 229
    }
  }
}$settings$::jsonb
where slug = 'the-retina' and (credits is null or jsonb_typeof(credits) = 'object')
  and not coalesce(credits, '{}'::jsonb) ? 'funding';

update public.modules set credits = coalesce(credits, '{}'::jsonb) || $settings${
  "acknowledgements": []
}$settings$::jsonb
where slug = 'the-retina' and (credits is null or jsonb_typeof(credits) = 'object')
  and not coalesce(credits, '{}'::jsonb) ? 'acknowledgements';

update public.modules set credits = coalesce(credits, '{}'::jsonb) || $settings${
  "funding": {
    "text": "This chapter was funded by The Montreal Neurological Institute (The Neuro).",
    "url": "https://www.mcgill.ca/neuro/",
    "logo": {
      "src": "/publicAssets/images/funders/the-neuro.webp",
      "alt": "The Neuro, Montreal Neurological Institute-Hospital",
      "width": 640,
      "height": 219
    }
  }
}$settings$::jsonb
where slug = 'foundations-of-neuroscience' and (credits is null or jsonb_typeof(credits) = 'object')
  and not coalesce(credits, '{}'::jsonb) ? 'funding';

update public.modules set credits = coalesce(credits, '{}'::jsonb) || $settings${
  "acknowledgements": [
    "Web development by Mogul (Anton Morrison). Graphic design by Studio Malpeso (Sonia, Maura, Karen and Naz). We thank Dr. Joseph Rochford for peer review. ST acknowledges funding from the Canada Research Chairs program."
  ]
}$settings$::jsonb
where slug = 'foundations-of-neuroscience' and (credits is null or jsonb_typeof(credits) = 'object')
  and not coalesce(credits, '{}'::jsonb) ? 'acknowledgements';

update public.sections s set art = $settings${
  "src": "/publicAssets/images/foundations/sections/introduction.webp",
  "alt": "A 1519 woodcut of the body's organs, with the brain's cells drawn around it"
}$settings$::jsonb
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'introduction' and s.art is null;

update public.sections s set art = $settings${
  "src": "/publicAssets/images/foundations/sections/where-is-my-mind.webp",
  "alt": "An engraving of a skull with a square opening cut into its brow"
}$settings$::jsonb
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'where-is-my-mind' and s.art is null;

update public.sections s set art = $settings${
  "src": "/publicAssets/images/foundations/sections/do-different-parts.webp",
  "alt": "The surface of a brain exposed during an operation, with numbered tags on it"
}$settings$::jsonb
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'do-different-parts' and s.art is null;

update public.sections s set art = $settings${
  "src": "/publicAssets/images/foundations/sections/basic-functional-unit.webp",
  "alt": "A drawing of layers of neurons and their branching fibres"
}$settings$::jsonb
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'basic-functional-unit' and s.art is null;

update public.sections s set art = $settings${
  "src": "/publicAssets/images/foundations/sections/how-neurons-communicate.webp",
  "alt": "An engraving of a frog's legs wired to an electrical machine on a table"
}$settings$::jsonb
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'how-neurons-communicate' and s.art is null;

update public.sections s set art = $settings${
  "src": "/publicAssets/images/foundations/sections/closing-words.webp",
  "alt": "A human brain seen from the side"
}$settings$::jsonb
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'closing-words' and s.art is null;

update public.sections s set art = $settings${
  "src": "/publicAssets/images/foundations/sections/references-milner.webp",
  "alt": "Brenda Milner, a portrait photograph",
  "position": "50% 67%"
}$settings$::jsonb
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'references' and s.art is null;

update public.sections s set box_treatment = 'dark'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-sacred-disease' and s.box_treatment is null;

update public.sections s set box_treatment = 'dark'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-rete-mirabile' and s.box_treatment is null;

update public.sections s set box_treatment = 'dark'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-penfield' and s.box_treatment is null;

update public.sections s set box_treatment = 'chapter'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-humoral-theory' and s.box_treatment is null;

update public.sections s set box_treatment = 'dark'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-descartes' and s.box_treatment is null;

update public.sections s set box_treatment = 'dark'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-psychosurgery' and s.box_treatment is null;

update public.sections s set box_treatment = 'dark'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-electrical-stim' and s.box_treatment is null;

update public.sections s set box_treatment = 'dark'
from public.modules m where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-ngf' and s.box_treatment is null;

update public.sections s set rail = true from public.modules m
where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-sacred-disease' and s.rail is null;
update public.sections s set rail = true from public.modules m
where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-rete-mirabile' and s.rail is null;
update public.sections s set rail = true from public.modules m
where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-descartes' and s.rail is null;
update public.sections s set rail = true from public.modules m
where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-electrical-stim' and s.rail is null;
update public.sections s set rail = true from public.modules m
where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-psychosurgery' and s.rail is null;
update public.sections s set rail = true from public.modules m
where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-penfield' and s.rail is null;
update public.sections s set rail = true from public.modules m
where m.id = s.module_id and m.slug = 'foundations-of-neuroscience' and s.slug = 'box-ngf' and s.rail is null;

update public.modules set ramp = 'fund' where slug = 'foundations-of-neuroscience' and ramp is null;

update public.modules set ramp = 'perc' where slug = 'the-retina' and ramp is null;

update public.modules set ramp = 'lear' where slug = 'attention-and-working-memory' and ramp is null;

update public.modules set authors = $settings$[
  {
    "name": "Arjun Krishnaswamy",
    "affiliation": "Department of Physiology, McGill University, Montreal, Canada"
  },
  {
    "name": "Stuart Trenholm",
    "affiliation": "Montreal Neurological Institute, McGill University, Montreal, Canada"
  }
]$settings$::jsonb where slug = 'the-retina' and authors is null;

update public.modules set authors = $settings$[
  {
    "name": "Arjun Krishnaswamy",
    "affiliation": "Department of Physiology, McGill University, Montreal, Canada"
  },
  {
    "name": "Erik Cook",
    "affiliation": "Department of Physiology, McGill University, Montreal, Canada"
  }
]$settings$::jsonb where slug = 'attention-and-working-memory' and authors is null;

update public.modules set authors = $settings$[
  {
    "url": "https://douglas.research.mcgill.ca/naguib-mechawar",
    "name": "Naguib Mechawar",
    "affiliation": "Douglas Mental Health University Institute; Department of Psychiatry, McGill University"
  },
  {
    "url": "https://www.trenholmlab.com",
    "name": "Stuart Trenholm",
    "affiliation": "Montreal Neurological Institute, McGill University"
  }
]$settings$::jsonb where slug = 'foundations-of-neuroscience' and authors is null;

-- Enrich each existing author independently; preserve order and custom keys.
with profiles(name, profile) as (values ('Stuart Trenholm', $settings${
  "url": "https://www.trenholmlab.com",
  "photo": null
}$settings$::jsonb),
('Naguib Mechawar', $settings${
  "url": "https://douglas.research.mcgill.ca/naguib-mechawar",
  "photo": null
}$settings$::jsonb),
('Arjun Krishnaswamy', $settings${
  "url": "https://www.swamylab.com/",
  "photo": null
}$settings$::jsonb),
('Erik Cook', $settings${
  "url": "https://www.mcgill.ca/physiology/directory/core-faculty/erik-cook",
  "photo": null
}$settings$::jsonb)),
next as (
 select m.id, jsonb_agg(
  case when p.name is null or jsonb_typeof(a.author) <> 'object' then a.author
   else a.author ||
    case when not a.author ? 'url' then jsonb_build_object('url', p.profile->'url') else '{}'::jsonb end ||
    case when not a.author ? 'photo' then jsonb_build_object('photo', p.profile->'photo') else '{}'::jsonb end
  end order by a.position) as authors
 from public.modules m
 cross join lateral jsonb_array_elements(case when jsonb_typeof(m.authors) = 'array' then m.authors else '[]'::jsonb end) with ordinality a(author, position)
 left join profiles p on p.name = a.author->>'name'
 where m.slug in ('foundations-of-neuroscience', 'the-retina', 'attention-and-working-memory', 'stress')
 group by m.id
)
update public.modules m set authors = n.authors from next n
where m.id = n.id and m.authors is distinct from n.authors;
