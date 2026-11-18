-- OPENBRAIN-205, follow-up to 20261118140000: the same twelve paths in
-- animations.image_file_url, the single-image column the chapter editor's
-- media picker and figure settings read (the reader prefers config.images,
-- which 20261118140000 already changed). Four History records held an old
-- path there: Figs 2, 11, 12 and 15. Only where the column still equals the
-- old path. No BEGIN/COMMIT.
update public.animations as a
   set image_file_url = v.new_src, updated_at = now()
  from (values
    ('/publicAssets/images/foundations/fig01-skull-cutout.webp', '/publicAssets/images/foundations/fig01-skull-cutout-v2.webp'),
    ('/publicAssets/images/foundations/fig05-01-pig.jpg', '/publicAssets/images/foundations/fig05-01-pig-v2.webp'),
    ('/publicAssets/images/foundations/fig08-01.jpg', '/publicAssets/images/foundations/fig08-01-v2.webp'),
    ('/publicAssets/images/foundations/fig09-01.jpg', '/publicAssets/images/foundations/fig09-01-v2.webp'),
    ('/publicAssets/images/foundations/fig10-01.jpg', '/publicAssets/images/foundations/fig10-01-v2.webp'),
    ('/publicAssets/images/foundations/fig11-01-abc.jpg', '/publicAssets/images/foundations/fig11-01-abc-v2.webp'),
    ('/publicAssets/images/foundations/fig12-01.jpg', '/publicAssets/images/foundations/fig12-01-v2.webp'),
    ('/publicAssets/images/foundations/fig13-01.jpg', '/publicAssets/images/foundations/fig13-01-v2.webp'),
    ('/publicAssets/images/foundations/fig16-01.jpg?v=2', '/publicAssets/images/foundations/fig16-01-v2.webp'),
    ('/publicAssets/images/foundations/fig16-01.jpg', '/publicAssets/images/foundations/fig16-01-v2.webp'),
    ('/publicAssets/images/foundations/figg-01.jpg', '/publicAssets/images/foundations/figg-01-v2.webp'),
    ('/publicAssets/images/foundations/hm-brenda-milner.jpg', '/publicAssets/images/foundations/hm-brenda-milner-v2.webp')
  ) as v(old_src, new_src)
 where a.animation_key like 'animationFoundations%'
   and a.image_file_url = v.old_src;
