-- =============================================================================
-- Chapter 1: The Retina - Animation Seed Script
-- Migration: 20260406000000_seed_chapter1_animations.sql
-- Description: Seeds all Chapter 1 animations into the animations,
--   animation_states, and animation_variants tables.
--   These were previously hardcoded in src/assets/json_backend/animations.json
--
-- IMPORTANT: Run with service_role or superuser privileges to bypass RLS.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_anim_id UUID;
BEGIN

  -- =========================================================================
  -- 1. animationDragon — Auto-play loop (intro decoration)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationDragon', 'Dragon', 'Decorative intro animation',
    'lottie', 'auto_loop', 'IllustrationComp',
    '/publicAssets/animations/animationDragon.json',
    '{"loop": true, "loopSection": [82, 287], "fullscreen": false}'::jsonb,
    1126400, 'general', 'high'
  );

  -- =========================================================================
  -- 2. animationEyeStructurTransition — Scroll transition
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationEyeStructurTransition', 'Eye Structure', 'Scroll transition before eye structure section',
    'lottie', 'scroll_transition', 'IllustrationTransition',
    '/publicAssets/animations/animationEyeStructurTransition.json',
    '{"isTransition": true, "noBleed": true}'::jsonb,
    2355200, 'eye_anatomy', 'high'
  );

  -- =========================================================================
  -- 3. animationEyeStructur — Click-triggered state animation (11 states)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationEyeStructur', 'Eye structure', 'Interactive eye anatomy with clickable layers',
    'lottie', 'click_states', 'IllustrationComp',
    '/publicAssets/animations/animationEyeStructur.json',
    '{"clickTriggered": true, "highlight": true, "fullscreen": false}'::jsonb,
    29696, 'eye_anatomy', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Lens', 0, true, 'lensHighlight'),
    (v_anim_id, 'Iris', 1, true, 'irisHighlight'),
    (v_anim_id, 'Cornea', 2, true, 'corneaHighlight'),
    (v_anim_id, 'Choroid', 3, true, 'choroidHighlight'),
    (v_anim_id, 'Sclera', 4, true, 'scleraHighlight'),
    (v_anim_id, 'Fovea', 5, true, 'foveaHighlight'),
    (v_anim_id, 'Aqueous humour', 6, true, 'aqueousHumourHighlight'),
    (v_anim_id, 'Ciliary muscle', 7, true, 'ciliarymuscleHighlight'),
    (v_anim_id, 'Retina', 8, true, 'retinaHighlight'),
    (v_anim_id, 'Vitreous humour', 9, true, 'vitreousHumourHighlight'),
    (v_anim_id, 'Optic nerve', 10, true, 'opticNerveHighlight');

  -- =========================================================================
  -- 4. animationAccommodationVergence — Auto-play loop
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationAccommodationVergence', 'Accommodation & vergence',
    'Eye accommodation and vergence loop animation',
    'lottie', 'auto_loop', 'IllustrationComp',
    '/publicAssets/animations/animationAccommodationVergence.json',
    '{"loop": true, "loopSection": null, "fullscreen": false}'::jsonb,
    315392, 'eye_anatomy', 'high'
  );

  -- =========================================================================
  -- 5. animationPupillaryLightreflex — Fullscreen states (5 states + 4 highlights)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationPupillaryLightreflex', 'Pathway for the pupillary light reflex',
    'Step-through of pupillary light reflex pathway',
    'lottie', 'fullscreen_states', 'FullScreenIllustrationLoop',
    '/publicAssets/animations/animationPupillaryLightreflex.json',
    '{"fullscreen": true, "loop": true, "hasSpeedControl": true}'::jsonb,
    32768, 'eye_anatomy', 'high'
  ) RETURNING id INTO v_anim_id;

  -- States
  INSERT INTO animation_states (animation_id, state_label, state_description, order_index, is_highlight_state) VALUES
    (v_anim_id, 'Step 1', 'Light shines into an eye, activating the retina', 0, false),
    (v_anim_id, 'Step 2', 'Retinal ganglion cells project bilaterally to the pretectal olivary nucleus', 1, false),
    (v_anim_id, 'Step 3', 'Each pretectal nucleus projects bilaterally to the Edinger-Westphal Nucleus', 2, false),
    (v_anim_id, 'Step 4', 'The Edinger-Westphal nucleus projects ipsilaterally to the ciliary ganglion', 3, false),
    (v_anim_id, 'Step 5', 'Postganglionic parasympathetic neurons project ipsilaterally to the iris spinster muscle', 4, false);
  -- Highlights
  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Pretectal nucleus', 100, true, 'pretectalNucleusHighlight'),
    (v_anim_id, 'Edinger-Westphal nucleus', 101, true, 'edingerWestphalNucleusHighlight'),
    (v_anim_id, 'Ciliary ganglion', 102, true, 'ciliaryGanglionHighlight'),
    (v_anim_id, 'Iris muscle', 103, true, 'irisMusleHighlight');

  -- =========================================================================
  -- 6. animationImpairedVision — Fullscreen states with toggle (4 states)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationImpairedVision', 'Refraction errors',
    'Interactive refraction error demonstration with corrected toggle',
    'lottie', 'fullscreen_states', 'FullScreenIllustration',
    '/publicAssets/animations/animationImpairedVision.json',
    '{"fullscreen": true, "loop": false, "toggle": "Corrected", "infoText": "Despite our body''s best laid plans, a variety of developmental and age-related issues can cause our eyes to improperly focus incoming images onto the retina, resulting in impaired vision. Two common issues result from the image being focused either in front of (myopia) or behind (hyperopia) the retina. Myopia, also commonly referred to as nearsightedness, blurs images of far-away images. In contrast, hyperopia, commonly referred to as farsightedness, blurs images of nearby images. Another common refractive issue is astigmatism, which results in uneven focus of the incoming image on the retina, due to irregular curvature of the cornea, or lens abnormalities. Finally, as we age, the lens becomes less elastic and the ciliary muscles become less effective at accommodating different focal planes, leading to presbyopia, which tends to focus images behind the retina. In general, most types of refractive errors can be addressed with corrective lenses."}'::jsonb,
    403456, 'eye_anatomy', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state) VALUES
    (v_anim_id, 'Normal eye (emmetropia)', 0, false),
    (v_anim_id, 'Myopia', 1, false),
    (v_anim_id, 'Hyperopia', 2, false),
    (v_anim_id, 'Astigmatism', 3, false);

  -- =========================================================================
  -- 7. animationLatteralOrganization — Scroll-linked split-screen
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationLatteralOrganization', 'Lateral organization',
    'Split-screen scroll-linked retinal cell mosaic visualization',
    'lottie', 'scroll_linked', 'FullScreenIllustrationSplit',
    NULL,
    '{"fullscreen": true, "split": true, "multiple": false, "sources": ["Cone mosaic in the fovea. Source Wikipedia.", "Red, cone terminals; Green, horizontal cell mosaic; Blue, bipolar cell mosaic. Source Webvision (Luna, Fisher and Lewis).", "ON alpha ganglion cell mosaic from cat retina. Source Wässle et al., 1981, Nature."]}'::jsonb,
    4874240, 'cellular', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_variants (animation_id, variant_label, lottie_file_url, order_index) VALUES
    (v_anim_id, 'Left', '/publicAssets/animations/animationLatteralOrganizationLeft.json', 0),
    (v_anim_id, 'Right', '/publicAssets/animations/animationLatteralOrganizationRight.json', 1);

  -- =========================================================================
  -- 8. animationPhototransduction — Fullscreen states (8 states + 11 highlights)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationPhototransduction', 'Phototransduction',
    'Step-through of the phototransduction cascade',
    'lottie', 'fullscreen_states', 'FullScreenIllustrationLoop',
    '/publicAssets/animations/animationPhototransduction.json',
    '{"fullscreen": true, "loop": true, "hasSpeedControl": true, "infoText": "In the dark, the photoreceptor outer segment has a high concentration of the small molecule cGMP..."}'::jsonb,
    435200, 'molecular', 'high'
  ) RETURNING id INTO v_anim_id;

  -- States
  INSERT INTO animation_states (animation_id, state_label, state_description, order_index, is_highlight_state) VALUES
    (v_anim_id, 'Step 1', 'Rod is in the dark. Rhodopsin is inactive', 0, false),
    (v_anim_id, 'Step 2', 'A flash of light, and a photon activates rhodopsin', 1, false),
    (v_anim_id, 'Step 3', 'Retinal changes conformation', 2, false),
    (v_anim_id, 'Step 4', 'Activated rhodopsin in turn activates transducin', 3, false),
    (v_anim_id, 'Step 5', 'The alpha subunit of transducin activates phosphodiesterase (PDE)', 4, false),
    (v_anim_id, 'Step 6', 'PDE degrades cGMP into GMP, leading to a decrease in intracellular [cGMP]', 5, false),
    (v_anim_id, 'Step 7', 'cGMP-gated ion channels close', 6, false),
    (v_anim_id, 'Step 8', 'The rod membrane hyperpolarizes', 7, false);
  -- Highlights
  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Rhodopsin', 100, true, 'rhodopsinHighlight'),
    (v_anim_id, 'Retinal', 101, true, 'retinalHighlight'),
    (v_anim_id, 'Transducin', 102, true, 'transducinHighlight'),
    (v_anim_id, 'Phosphodiesterase (PDE)', 103, true, 'phosphodiesterasePdeHighlight'),
    (v_anim_id, 'cGMP', 104, true, 'cgmpHighlight'),
    (v_anim_id, 'GMP', 105, true, 'gmpHighlight'),
    (v_anim_id, 'α', 106, true, 'alphaHighlight'),
    (v_anim_id, 'γ', 107, true, 'betaHighlight'),
    (v_anim_id, 'β', 108, true, 'gammaHighlight'),
    (v_anim_id, 'GTP', 109, true, 'gtpHighlight'),
    (v_anim_id, 'NA+', 110, true, 'naHighlight');

  -- =========================================================================
  -- 9. animationTheVisualCycle — Fullscreen states (6 states + 5 highlights)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationTheVisualCycle', 'The visual cycle',
    'Step-through of the visual cycle (retinal recycling)',
    'lottie', 'fullscreen_states', 'FullScreenIllustrationLoop',
    '/publicAssets/animations/animationTheVisualCycle.json',
    '{"fullscreen": true, "loop": true, "hasSpeedControl": true, "infoText": "When rhodopsin absorbs a photon, its light-catching 11-cis retinal chromophore is isomerized into all-trans retinal..."}'::jsonb,
    28672, 'molecular', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, state_description, order_index, is_highlight_state) VALUES
    (v_anim_id, 'Step 1', 'Rhodopsin absorps a photon of light and retinal changes from 11-cis to all-trans', 0, false),
    (v_anim_id, 'Step 2', 'All-trans retinal exits the rod', 1, false),
    (v_anim_id, 'Step 3', 'All-trans retinal binds to IRBP, which transports it into the RPE', 2, false),
    (v_anim_id, 'Step 4', 'In the RPE, All-trans retinal undergoes further changes until restored to 11-cis', 3, false),
    (v_anim_id, 'Step 5', '11-cis retinal binds is shuttled out of the RPE', 4, false),
    (v_anim_id, 'Step 6', '11-cis retinal re-enters the rod where it can get activated by light again', 5, false);
  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Rhodopsin', 100, true, 'rhodopsinHighlight'),
    (v_anim_id, 'Retinal', 101, true, 'retinalHighlight'),
    (v_anim_id, 'Rod', 102, true, 'rodHighlight'),
    (v_anim_id, 'RPE', 103, true, 'rpeHighlight'),
    (v_anim_id, 'IRBP', 104, true, 'irbpHighlight');

  -- =========================================================================
  -- 10. animationSynapticArchitecture — Click-triggered block states (3 states)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationSynapticArchitecture', 'Synaptic architecture',
    'Toggle-able synaptic connection types',
    'lottie', 'click_states', 'IllustrationComp',
    '/publicAssets/animations/animationSynapticArchitecture.json',
    '{"clickTriggered": true, "blockStates": true, "hasTransition": true, "iconPraefix": "retinalCircuits", "fullscreen": false}'::jsonb,
    94208, 'cellular', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state) VALUES
    (v_anim_id, 'Inhibition', 0, false),
    (v_anim_id, 'Excitatation', 1, false),
    (v_anim_id, 'Gap junction', 2, false);

  -- =========================================================================
  -- 11. animationPhotoreceptors — Click-triggered highlight states (6 states)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationPhotoreceptors', 'Photoreceptors',
    'Interactive photoreceptor anatomy with clickable layers',
    'lottie', 'click_states', 'IllustrationComp',
    '/publicAssets/animations/animationPhotoreceptors.json',
    '{"clickTriggered": true, "highlight": true, "hasTransition": true, "speed": 0.7, "fullscreen": false}'::jsonb,
    101376, 'cellular', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Disks', 0, true, 'disksHighlight'),
    (v_anim_id, 'Opsins', 1, true, 'opsinsHighlight'),
    (v_anim_id, 'Outer segment', 2, true, 'outerSegmentHighlight'),
    (v_anim_id, 'Inner segment', 3, true, 'innerSegmentHighlight'),
    (v_anim_id, 'Mitocondria', 4, true, 'mitochondriaHighlight'),
    (v_anim_id, 'Nucleus', 5, true, 'nucleusHighlight');

  -- =========================================================================
  -- 12. animationLateralOrganization — Scroll-linked (simple, used in text flow)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationLateralOrganization', 'Lateral organization',
    'Scroll-linked lateral organization animation (text flow version)',
    'lottie', 'scroll_linked', 'IllustrationOnScroll',
    '/publicAssets/animations/animationLateralOrganization.json',
    '{"fullscreen": true, "scroll": true, "split": true}'::jsonb,
    8090, 'cellular', 'high'
  );

  -- =========================================================================
  -- 13. animationRetinalCellTypesTransition — Scroll transition
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationRetinalCellTypesTransition', 'Retinal cell types',
    'Scroll transition before retinal cell types section',
    'lottie', 'scroll_transition', 'IllustrationTransition',
    '/publicAssets/animations/animationRetinalCellTypesTransition.json',
    '{"isTransition": true, "noBleed": true}'::jsonb,
    69632, 'cellular', 'high'
  );

  -- =========================================================================
  -- 14. animationRetinalCellTypes — Click-triggered with icons (10 states)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationRetinalCellTypes', 'Retinal cell types',
    'Interactive retinal cell type anatomy (set 1)',
    'lottie', 'click_states', 'IllustrationComp',
    '/publicAssets/animations/animationRetinalCellTypes.json',
    '{"clickTriggered": true, "highlight": true, "iconPraefix": "retinalCellTypes", "icons": ["true","true","true","true","true"], "autoplay": true, "fullscreen": false}'::jsonb,
    44032, 'cellular', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Photoreceptors', 0, true, 'photoreceptorsHighlight'),
    (v_anim_id, 'Horizontal cells', 1, true, 'horizontalCellsHighlight'),
    (v_anim_id, 'Bipolar cells', 2, true, 'bipolarCellsHighlight'),
    (v_anim_id, 'Amacrine cells', 3, true, 'amacrineCellsHighlight'),
    (v_anim_id, 'Ganglion cells', 4, true, 'ganglionCellsHighlight'),
    (v_anim_id, 'Inner nuclear layer', 5, true, 'innerNuclearLayerHighlight'),
    (v_anim_id, 'Inner plexiform layer', 6, true, 'innerPlexiformLayerHighlight'),
    (v_anim_id, 'Outer nuclear layer', 7, true, 'outerNuclearLayerHighlight'),
    (v_anim_id, 'Outer plexiform layer', 8, true, 'outerPlexiformLayerHighlight'),
    (v_anim_id, 'Ganglion cell layer', 9, true, 'ganglionCellLayerHighlight');

  -- =========================================================================
  -- 15. animationRetinalCellTypes2 — Click-triggered with icons (10 states, set 2)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationRetinalCellTypes2', 'Retinal cell types',
    'Interactive retinal cell type anatomy (set 2)',
    'lottie', 'click_states', 'IllustrationComp',
    '/publicAssets/animations/animationRetinalCellTypes2.json',
    '{"clickTriggered": true, "highlight": true, "iconPraefix": "retinalCellTypes", "icons": ["true","true","true","true","true"], "autoplay": true, "set": 2, "fullscreen": false}'::jsonb,
    44032, 'cellular', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Photoreceptors', 0, true, 'photoreceptorsHighlight'),
    (v_anim_id, 'Horizontal cells', 1, true, 'horizontalCellsHighlight'),
    (v_anim_id, 'Bipolar cells', 2, true, 'bipolarCellsHighlight'),
    (v_anim_id, 'Amacrine cells', 3, true, 'amacrineCellsHighlight'),
    (v_anim_id, 'Ganglion cells', 4, true, 'ganglionCellsHighlight'),
    (v_anim_id, 'Inner nuclear layer', 5, true, 'innerNuclearLayerHighlight'),
    (v_anim_id, 'Inner plexiform layer', 6, true, 'innerPlexiformLayerHighlight'),
    (v_anim_id, 'Outer nuclear layer', 7, true, 'outerNuclearLayerHighlight'),
    (v_anim_id, 'Outer plexiform layer', 8, true, 'outerPlexiformLayerHighlight'),
    (v_anim_id, 'Ganglion cell layer', 9, true, 'ganglionCellLayerHighlight');

  -- =========================================================================
  -- 16. animationRetinalCellTypes3 — Click-triggered with icons (10 states, set 1)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationRetinalCellTypes3', 'Retinal cell types',
    'Interactive retinal cell type anatomy (set 3 / set value 1)',
    'lottie', 'click_states', 'IllustrationComp',
    '/publicAssets/animations/animationRetinalCellTypes.json',
    '{"clickTriggered": true, "highlight": true, "iconPraefix": "retinalCellTypes", "icons": ["true","true","true","true","true"], "autoplay": true, "set": 1, "fullscreen": false}'::jsonb,
    44032, 'cellular', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name) VALUES
    (v_anim_id, 'Photoreceptors', 0, true, 'photoreceptorsHighlight'),
    (v_anim_id, 'Horizontal cells', 1, true, 'horizontalCellsHighlight'),
    (v_anim_id, 'Bipolar cells', 2, true, 'bipolarCellsHighlight'),
    (v_anim_id, 'Amacrine cells', 3, true, 'amacrineCellsHighlight'),
    (v_anim_id, 'Ganglion cells', 4, true, 'ganglionCellsHighlight'),
    (v_anim_id, 'Inner nuclear layer', 5, true, 'innerNuclearLayerHighlight'),
    (v_anim_id, 'Inner plexiform layer', 6, true, 'innerPlexiformLayerHighlight'),
    (v_anim_id, 'Outer nuclear layer', 7, true, 'outerNuclearLayerHighlight'),
    (v_anim_id, 'Outer plexiform layer', 8, true, 'outerPlexiformLayerHighlight'),
    (v_anim_id, 'Ganglion cell layer', 9, true, 'ganglionCellLayerHighlight');

  -- =========================================================================
  -- 17. animationCenterSurroundReceptiveFields — Switch (2 variants)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationCenterSurroundReceptiveFields', 'Center surround receptive fields',
    'Switch between small light and wide light circuit diagrams',
    'lottie', 'switch', 'IllustrationSwitch',
    '{"loop": true, "blockSwitches": true, "fullscreen": false, "legend": ["Photoreceptors","Horizontal cells","Bipolar cells","Amacrine cells","Ganglion cells","Hyperpolarization","Depolarization","Spike train","special","Inhibition","Excitatation","Gap junction"]}'::jsonb,
    192512, 'circuits', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_variants (animation_id, variant_label, lottie_file_url, order_index) VALUES
    (v_anim_id, 'Small light', '/publicAssets/animations/animationCenterSurroundReceptiveFieldsSmalllight.json', 0),
    (v_anim_id, 'Wide light', '/publicAssets/animations/animationCenterSurroundReceptiveFieldsWidelight.json', 1);

  -- =========================================================================
  -- 18. animationColorOpponency — Static image
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, image_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationColorOpponency', 'Color Opponency',
    'Static color opponency illusion image',
    'image', 'static_image', 'IllustrationComp',
    '/publicAssets/images/illuImages/animationColorOpponency.png',
    '{"illuImage": true, "fullHeight": true}'::jsonb,
    30720, 'circuits', 'low'
  );

  -- =========================================================================
  -- 19. animationONOFFLamina — Static image
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, image_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationONOFFLamina', 'ON and OFF lamina',
    'Static ON/OFF cell layer diagram',
    'image', 'static_image', 'IllustrationComp',
    '/publicAssets/images/illuImages/animationONOFFLamina.png',
    '{"illuImage": true, "fullHeight": false}'::jsonb,
    NULL, 'circuits', 'low'
  );

  -- =========================================================================
  -- 20. animationDirectionSelectivity — Switch (2 variants)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationDirectionSelectivity', 'Direction selectivity',
    'Switch between preferred and null direction circuit diagrams',
    'lottie', 'switch', 'IllustrationSwitch',
    '{"loop": true, "blockSwitches": true, "fullscreen": false, "legend": ["Photoreceptors","Horizontal cells","Bipolar cells","Amacrine cells","Ganglion cells","Hyperpolarization","Depolarization","Spike train","special","Inhibition","Excitatation","Gap junction"]}'::jsonb,
    121856, 'circuits', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_variants (animation_id, variant_label, lottie_file_url, order_index) VALUES
    (v_anim_id, 'Prefered', '/publicAssets/animations/animationDirectionSelectivityPrefered.json', 0),
    (v_anim_id, 'Null', '/publicAssets/animations/animationDirectionSelectivityNull.json', 1);

  -- =========================================================================
  -- 21. animationObjectMotionSensitivity — Switch (2 variants)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationObjectMotionSensitivity', 'Object motion sensitivity',
    'Switch between symmetric and asymmetric center circuit diagrams',
    'lottie', 'switch', 'IllustrationSwitch',
    '{"loop": true, "blockSwitches": true, "fullscreen": false, "legend": ["Photoreceptors","Horizontal cells","Bipolar cells","Amacrine cells","Ganglion cells","Hyperpolarization","Depolarization","Spike train","special","Inhibition","Excitatation","Gap junction"]}'::jsonb,
    140288, 'circuits', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_variants (animation_id, variant_label, lottie_file_url, order_index) VALUES
    (v_anim_id, 'Symmetric center', '/publicAssets/animations/animationObjectMotionSensitivitySymmetricCenter.json', 0),
    (v_anim_id, 'Asymmetric center', '/publicAssets/animations/animationObjectMotionSensitivityAsymmetricCenter.json', 1);

  -- =========================================================================
  -- 22. animationRodVsConeCircuits — Switch (2 variants)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationRodVsConeCircuits', 'Rod vs. cone circuits',
    'Switch between day and night rod/cone circuit diagrams',
    'lottie', 'switch', 'IllustrationSwitch',
    '{"loop": true, "blockSwitches": true, "swicthSymboles": true, "iconPraefix": "retinalCircuits", "fullscreen": false, "legend": ["Photoreceptors","Horizontal cells","Bipolar cells","Amacrine cells","Ganglion cells","Hyperpolarization","Depolarization","Spike train","special","Inhibition","Excitatation","Gap junction"]}'::jsonb,
    67584, 'circuits', 'high'
  ) RETURNING id INTO v_anim_id;

  INSERT INTO animation_variants (animation_id, variant_label, lottie_file_url, order_index) VALUES
    (v_anim_id, 'Day', '/publicAssets/animations/animationRodVsConeCircuitsDay.json', 0),
    (v_anim_id, 'Night', '/publicAssets/animations/animationRodVsConeCircuitsNight.json', 1);

  -- =========================================================================
  -- 23. animationLightSensitiveGanglionCells — Auto-play loop with legend
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationLightSensitiveGanglionCells', 'Light sensitive ganglion cells',
    'Looping ipRGC circuit animation with legend',
    'lottie', 'auto_loop', 'IllustrationComp',
    '/publicAssets/animations/animationLightSensitiveGanglionCells.json',
    '{"loop": true, "fullscreen": false, "legend": ["Photoreceptors","Horizontal cells","Bipolar cells","Amacrine cells","Ganglion cells","Hyperpolarization","Depolarization","Spike train","special","Inhibition","Excitatation","Gap junction"]}'::jsonb,
    15360, 'circuits', 'low'
  );

  -- =========================================================================
  -- 24. animationWavesOfActivity — YouTube embed
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, youtube_id, config, scientific_domain, load_priority
  ) VALUES (
    'animationWavesOfActivity', 'Spontaneous waves of activity',
    'YouTube embed of spontaneous retinal waves',
    'youtube', 'youtube_embed', 'IllustrationComp',
    'k0_HXpcH4zI',
    '{"illuImage": true}'::jsonb,
    'development', 'lazy'
  );

  -- =========================================================================
  -- 25. animationNormalVision — Video flip
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, video_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationNormalVision', 'Normal vision',
    'Normal vision video for disease comparison',
    'video', 'video_flip', 'IllustrationComp',
    '/publicAssets/video/9-1-diseases/9-1-normal-vision.mp4',
    '{"flip": true, "video": "normal-vision", "fullscreen": false}'::jsonb,
    33792, 'disease', 'lazy'
  );

  -- =========================================================================
  -- 26-30. Disease video flips (Cataracts, Glaucoma, Diabetic Retinopathy, AMD, RP)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, video_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES
    ('animationCataracts', 'Cataracts', 'Cataracts disease visualization',
     'video', 'video_flip', 'IllustrationComp',
     '/publicAssets/video/9-1-diseases/9-1-cataracts.mp4',
     '{"flip": true, "video": "cataracts", "fullscreen": false, "source": "Xu et al., 2021, Biomed Eng Online"}'::jsonb,
     33792, 'disease', 'lazy'),

    ('animationGlaucoma', 'Glaucoma', 'Glaucoma disease visualization',
     'video', 'video_flip', 'IllustrationComp',
     '/publicAssets/video/9-1-diseases/9-1-glaucoma.mp4',
     '{"flip": true, "video": "glaucoma", "fullscreen": false, "source": "Viewpoint online"}'::jsonb,
     33792, 'disease', 'lazy'),

    ('animationDiabeticRetinopathy', 'Diabetic retinopathy', 'Diabetic retinopathy disease visualization',
     'video', 'video_flip', 'IllustrationComp',
     '/publicAssets/video/9-1-diseases/9-1-diabetic-retinopathy.mp4',
     '{"flip": true, "video": "diabetic-retinopathy", "fullscreen": false, "source": "Ramasy et al., 2021, PeerJ Computer Science"}'::jsonb,
     33792, 'disease', 'lazy'),

    ('animationAgeRelatedMacularDegeneration', 'Age related macular degeneration', 'AMD disease visualization',
     'video', 'video_flip', 'IllustrationComp',
     '/publicAssets/video/9-1-diseases/9-1-macular-degeneration.mp4',
     '{"flip": true, "video": "macular-degeneration", "fullscreen": false, "source": "Eyerounds.org"}'::jsonb,
     33792, 'disease', 'lazy'),

    ('animationRetinitisPigmentosa', 'Retinitis pigmentosa', 'RP disease visualization',
     'video', 'video_flip', 'IllustrationComp',
     '/publicAssets/video/9-1-diseases/9-1-retinitis-pigmentosa.mp4',
     '{"flip": true, "video": "retinitis-pigmentosa", "fullscreen": false, "source": "Hamel Orphanet Journal of Rare Diseases 2006 1:40 doi:10.1186/1750-1172-1-40)"}'::jsonb,
     33792, 'disease', 'lazy');

  -- =========================================================================
  -- 31. animationEyeMovements — Auto-play loop
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationEyeMovements', 'Eye Movements',
    'Eye movement animation loop',
    'lottie', 'auto_loop', 'IllustrationComp',
    '/publicAssets/animations/animationEyeMovements.json',
    '{"loop": true, "fullscreen": false, "source": "Artistic reinterpretaton"}'::jsonb,
    813056, 'movement', 'low'
  );

  -- =========================================================================
  -- 32. animationPlaceholder — Auto-play loop (decorative)
  -- =========================================================================
  INSERT INTO animations (
    animation_key, title, description, media_type, interaction_type,
    component_name, lottie_file_url, config, file_size_bytes,
    scientific_domain, load_priority
  ) VALUES (
    'animationPlaceholder', 'Placeholder', 'Decorative placeholder animation',
    'lottie', 'auto_loop', 'IllustrationComp',
    '/publicAssets/animations/animationPlaceholder.json',
    '{"loop": true, "fullParagraph": true}'::jsonb,
    30720, 'general', 'lazy'
  );

  RAISE NOTICE 'Successfully seeded 32 Chapter 1 animations with states and variants.';

END;
$$;

COMMIT;
