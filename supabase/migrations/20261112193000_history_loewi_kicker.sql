-- OPENBRAIN-190: Loewi's band names Otto's dream (Stuart, 12 Nov, on his
-- phone: "Otto loewi animation. Remove words 'breakout box'. Replace with
-- 'Otto's dream experiment'").
--
-- Below 1024px the pane figure animationFoundationsLoewiWidget draws in the
-- text as a full-width band (IllustrationInline → WidgetBreakout), whose
-- kicker read "Breakout box". The figure record now names its own kicker,
-- config.kicker, which the band shows over the upload's title. The reader
-- no longer says "Breakout box" over a band outside a breakout box, so
-- before this is pushed the band simply has no kicker; before the code is
-- deployed the old reader ignores the key. Either order is safe.
--
-- One row, by animation_key, changed only while its kicker differs. No
-- BEGIN/COMMIT.

update public.animations
   set config = coalesce(config, '{}'::jsonb)
                || jsonb_build_object('kicker', 'Otto’s dream experiment'),
       updated_at = now()
 where animation_key = 'animationFoundationsLoewiWidget'
   and config->>'kicker' is distinct from 'Otto’s dream experiment';
