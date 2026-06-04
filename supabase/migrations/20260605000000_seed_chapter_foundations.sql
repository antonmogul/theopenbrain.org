-- =============================================================================
-- Chapter 3: Foundations of Neuroscience — Database Seed (PILOT)
-- Migration: 20260605000000_seed_chapter_foundations.sql
--
-- Source: ~/Downloads/Foundations_ST7_NM3_LL.odt
--         "Foundations of Neuroscience: Debates that framed our understanding
--          of the brain" — Naguib Mechawar & Stuart Trenholm.
--
-- PILOT SCOPE: module + Introduction + Debate 0 ("Where is my mind?") only,
-- plus typed figure PLACEHOLDER animations (Figures 1-4) that render in the
-- left split-screen column via IllustrationPlaceholder.vue. Debates 1-3,
-- closing, the 8 breakout boxes, and References follow in a later migration
-- once this pilot is verified in-browser.
--
-- Model: mirrors 20250109000000_seed_chapter_2.sql (BEGIN / DO $$ / COMMIT,
-- creator looked up from profiles). Joins the existing '1.0' content version
-- (where The Retina = order_index 1, Visual Perception = order_index 2), so
-- Foundations = order_index 3. Published so it appears in the chapter catalog.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_creator_id          UUID;
  v_content_version_id  UUID;
  v_module_id           UUID;

  v_section_intro_id    UUID;
  v_section_mind_id     UUID;

  -- Figure placeholder animation ids (Debate 0)
  v_fig1_id  UUID;
  v_fig2_id  UUID;
  v_fig3_id  UUID;
  v_fig4_id  UUID;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Creator (reuse an existing creator profile; fall back to any profile)
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_creator_id FROM profiles WHERE role = 'creator' LIMIT 1;
  IF v_creator_id IS NULL THEN
    SELECT id INTO v_creator_id FROM profiles LIMIT 1;
  END IF;
  IF v_creator_id IS NULL THEN
    v_creator_id := '00000000-0000-0000-0000-000000000000';
    RAISE NOTICE 'WARNING: no profile found; using placeholder creator UUID.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Content version: reuse the existing '1.0' bundle (Ch1 + Ch2 live here)
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_content_version_id
  FROM content_versions
  WHERE version_number = '1.0'
  LIMIT 1;

  IF v_content_version_id IS NULL THEN
    INSERT INTO content_versions (version_number, status, created_by, release_notes)
    VALUES ('1.0', 'published', v_creator_id, 'Initial content bundle')
    RETURNING id INTO v_content_version_id;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Module (Chapter 3)
  -- ---------------------------------------------------------------------------
  INSERT INTO modules (
    content_version_id, title, slug, description, order_index, status,
    created_by, layout_config, key_takeaways
  )
  VALUES (
    v_content_version_id,
    'Foundations of Neuroscience',
    'foundations-of-neuroscience',
    'A brief survey of the ideas surrounding the brain, told through four debates that helped frame our modern understanding: where the mind resides, whether brain function is localized, what the brain''s fundamental functional unit is, and how neurons communicate.',
    3,
    'published',
    v_creator_id,
    '{"defaultLayout": "split-screen", "animationPosition": "left"}'::JSONB,
    ARRAY[
      'The history of neuroscience advances through debates where both sides were often partly right and partly wrong.',
      'Where the mind resides shifted over millennia between heart (cardiocentric) and brain (encephalocentric) views.',
      'Settled questions can reopen when new evidence emerges — progress is incremental and self-correcting.'
    ]
  )
  RETURNING id INTO v_module_id;

  RAISE NOTICE 'Created module Foundations of Neuroscience: %', v_module_id;

  -- ===========================================================================
  -- Figure placeholder animations (left column) for Debate 0
  -- media_type='image' + interaction_type='static_image' so they DON'T match
  -- the fullscreen/scroll/transition branches; config.placeholder=true routes
  -- them to IllustrationPlaceholder.vue. No states/variants needed.
  -- ===========================================================================
  INSERT INTO animations (animation_key, title, description, media_type, interaction_type, component_name, config, scientific_domain, load_priority)
  VALUES
  ('animationFoundationsFig1', 'Trepanned Incan skull',
   'The Peruvian skull with a square hole that Broca examined — evidence of survived prehistoric trepanation.',
   'image', 'static_image', 'IllustrationPlaceholder',
   '{"placeholder": true, "figureNumber": 1, "diagramType": "photo", "note": "Source: photo of the Squier/Broca Incan trepanned skull."}'::JSONB,
   'history', 'low')
  RETURNING id INTO v_fig1_id;

  INSERT INTO animations (animation_key, title, description, media_type, interaction_type, component_name, config, scientific_domain, load_priority)
  VALUES
  ('animationFoundationsFig2', 'Methods of trepanation',
   'Illustration of the various techniques used to perform trepanation across the prehistoric world.',
   'image', 'static_image', 'IllustrationPlaceholder',
   '{"placeholder": true, "figureNumber": 2, "diagramType": "diagram", "note": "Source: diagram of prehistoric trepanation methods."}'::JSONB,
   'history', 'low')
  RETURNING id INTO v_fig2_id;

  INSERT INTO animations (animation_key, title, description, media_type, interaction_type, component_name, config, scientific_domain, load_priority)
  VALUES
  ('animationFoundationsFig3', 'The Edwin Smith papyrus',
   'The ~1,600 BCE surgical treatise — the most ancient text mentioning the brain.',
   'image', 'static_image', 'IllustrationPlaceholder',
   '{"placeholder": true, "figureNumber": 3, "diagramType": "manuscript", "note": "Source: image of the Edwin Smith surgical papyrus."}'::JSONB,
   'history', 'low')
  RETURNING id INTO v_fig3_id;

  INSERT INTO animations (animation_key, title, description, media_type, interaction_type, component_name, config, scientific_domain, load_priority)
  VALUES
  ('animationFoundationsFig4', 'Edwin Smith papyrus, case 20',
   'Case n. 20: a man with a skull wound exposing the cortical surface of the brain.',
   'image', 'static_image', 'IllustrationPlaceholder',
   '{"placeholder": true, "figureNumber": 4, "diagramType": "manuscript", "note": "Source: image of Edwin Smith papyrus case 20."}'::JSONB,
   'history', 'low')
  RETURNING id INTO v_fig4_id;

  -- ===========================================================================
  -- Section 0: Introduction
  -- ===========================================================================
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (v_module_id, 'Introduction', 'introduction', 0,
          'A survey of ideas about the brain, told through four framing debates.')
  RETURNING id INTO v_section_intro_id;

  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES
  (v_section_intro_id,
   '{"blocks": [{"type": "text", "content": "Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered, “I became a neurologist rather than, say, a cardiologist, because there’s nothing for an intelligent man to be interested in in cardiology. The heart, I suppose, is an interesting pump, but it’s just a pump. Neurology is the only branch of medicine that could sustain a thinking man.”"}, {"type": "citation_ref", "number": 1}, {"type": "text", "content": " In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through debates that helped frame our modern understanding of the brain."}]}'::JSONB,
   'Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered that neurology is the only branch of medicine that could sustain a thinking man. In this chapter, we provide a brief survey of ideas surrounding the brain, told through debates that helped frame our modern understanding of it.',
   0, false, 0),

  (v_section_intro_id,
   '{"blocks": [{"type": "text", "content": "Here, we’ll focus on four debates surrounding questions that lead to our current understanding of brain function: 1) Where is the mind? 2) Is there localization of function in the brain? 3) What is the fundamental functional unit of the brain? 4) How do neurons communicate with one another?"}]}'::JSONB,
   'Here, we will focus on four debates: 1) Where is the mind? 2) Is there localization of function in the brain? 3) What is the fundamental functional unit of the brain? 4) How do neurons communicate with one another?',
   1, false, 0);

  -- ===========================================================================
  -- Section 1: Debate 0 — "Where is my mind?"
  -- ===========================================================================
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (v_module_id, 'Where is my mind?', 'where-is-my-mind', 1,
          'From prehistoric trepanation to the ancient cardiocentric vs. encephalocentric debate.')
  RETURNING id INTO v_section_mind_id;

  INSERT INTO paragraphs (section_id, content, content_text, order_index, has_animation, animation_id, animation_trigger, is_subsection_header, subsection_level)
  VALUES
  -- p0 — Broca / the Incan skull (Figure 1)
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "What did prehistorical humans know about the brain? In the mid-1860s, Paul Broca—a renowned French neurologist and anthropologist—received a skull. It was sent to him by Ephraim George Squier, an American anthropologist who had acquired the skull in Peru from a Señora Zentino, a collector of antiquities"}, {"type": "citation_ref", "number": 2}, {"type": "text", "content": ". The skull came from an Incan burial site and had a square hole cut in it ("}, {"type": "figure_placeholder", "number": 1}, {"type": "text", "content": "). To Squier, the nature of the hole suggested it had been cut while the individual was alive. He presented it to the New York Academy of Medicine, but they were unconvinced. In the western world at that time, cranial opening surgeries were rare and had very high mortality rates. Squier forwarded the skull to Broca for a second opinion. This was not the first skull recovered from an ancient site with an apparently man-made hole, but the previously observed holes had generally been attributed to traumatic injuries or posthumous rituals"}, {"type": "citation_ref", "number": 3}, {"type": "text", "content": ". However, upon examination, Broca was convinced that this was the skull of a person who had survived at least for a few days after the procedure. Broca published his findings"}, {"type": "citation_ref", "number": 4}, {"type": "text", "content": ", which generated immediate interest in studying trepanation—the surgical procedure of putting a hole in the skull—in ancient burial sites. For instance, Broca and his friend P. Barthélemy Prunières re-examined many skulls with holes that had previously been attributed to injuries or postmortem rituals, and concluded that many had actually been caused by trepanations in living individuals"}, {"type": "citation_ref", "number": 3}, {"type": "text", "content": "."}]}'::JSONB,
   'What did prehistorical humans know about the brain? In the mid-1860s, Paul Broca received a trepanned Incan skull from Peru (Figure 1) and concluded the individual had survived the procedure, sparking interest in studying trepanation in ancient burial sites.',
   0, true, v_fig1_id, 'auto', false, 0),

  -- p1 — Trepanation across the prehistoric world (Figure 2)
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "Subsequent examinations of ancient sites revealed that trepanations were relatively common throughout the prehistoric world, that they were performed in various different ways ("}, {"type": "figure_placeholder", "number": 2}, {"type": "text", "content": "), and that they were often non-lethal"}, {"type": "citation_ref", "number": 2}, {"type": "text", "content": ". For instance, in some Peruvian burial sites, up to 30% of skulls exhibit trepanation, with a survival rate—as evidenced by osteoclastic activity, remodeling, and healing around the trepanned site—of over 80%"}, {"type": "citation_ref", "number": 5}, {"type": "text", "content": ". Why were such holes made? Without a written record it’s impossible to say with certainty, but it’s likely the reasons were either superstitious, ritualistic, or medical. Possible evidence for a superstitious or ritualistic basis for trepanations comes from a Copper Age burial site in what is now Southern Russia"}, {"type": "citation_ref", "number": 6}, {"type": "text", "content": ". In contrast to all other trepanned skulls found in prehistorical sites throughout the world, skulls from these sites predominantly exhibit trepanned holes located over the midline, near the obelion. The consistency of the hole location, and the fact that this location is considered to be a very dangerous spot to open (even the Hippocratic writings warn to avoid trepanation over sutures"}, {"type": "citation_ref", "number": 2}, {"type": "text", "content": "), suggests such procedures were possibly performed in service of some type of ritual"}, {"type": "citation_ref", "number": 6}, {"type": "text", "content": ". As possible evidence for medical-related trepanations, some trepanation sites appear to be adjacent to trauma sites, suggesting the trauma precipitated the trepanation"}, {"type": "citation_ref", "number": 5}, {"type": "text", "content": ". Nowadays, the vast majority of trepanations are performed in hospitals as part of modern medical procedures, though certain, albeit rare occult trepanation rituals persist"}, {"type": "citation_ref", "number": 7}, {"type": "text", "content": "."}]}'::JSONB,
   'Trepanations were relatively common throughout the prehistoric world (Figure 2), performed in various ways and often non-lethal, with survival rates over 80% at some Peruvian sites. The reasons were likely superstitious, ritualistic, or medical.',
   1, true, v_fig2_id, 'auto', false, 0),

  -- p2 — Egyptian beliefs / the heart
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "Writing arose over 5,000 years ago in Sumeria and Egypt. From these early texts we gain an understanding about ancient ideas surrounding the brain. For instance, Egyptians believed that Thoth, a bird-like god—who is said to have created writing—revealed all medical knowledge via a secret book visible only to magician-priests. Healing temples arose that were named after Imhotep, a chancellor and high priest who was believed to have written numerous medical wisdom texts. The Egyptians believed that the heart was the most important organ and was connected to other parts of the body by various channels (e.g., veins, arteries, tendons)"}, {"type": "citation_ref", "number": 8}, {"type": "text", "content": ". The heart was believed to record good and evil deeds (perhaps an early analogy of memory), and after death it was thought to be weighed, assigning the deceased to either heaven or fated to a crocodile-like creature called the Devourer. For those wealthy or fortunate enough to be embalmed or mummified after death, the brain was removed via the nostrils and discarded, unlike other organs that were stored in jars"}, {"type": "citation_ref", "number": 8}, {"type": "text", "content": "."}]}'::JSONB,
   'Writing arose over 5,000 years ago in Sumeria and Egypt. The Egyptians believed the heart was the most important organ, recording good and evil deeds, while the brain was removed and discarded during mummification.',
   2, false, NULL, NULL, false, 0),

  -- p3 — The Edwin Smith papyrus (Figures 3 & 4)
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "The most ancient text mentioning the brain dates to about 1,600 BCE and is written in hieroglyphs. It’s a copy of a surgical treatise originally written some 1,400 years earlier"}, {"type": "citation_ref", "number": 9}, {"type": "text", "content": " and is known as the Edwin Smith papyrus ("}, {"type": "figure_placeholder", "number": 3}, {"type": "text", "content": "), named after the American Egyptologist who purchased it in 1862 from an antiquities dealer near Luxor. This papyrus describes 48 cases, mostly of severe physical traumas, along with treatment recommendations. Many of the cases involve head injuries, including the now famous case n. 20 which describes a man with a hole in his skull—likely the result of a blow to the head sustained on the battlefield—that exposed the cortical surface of his brain ("}, {"type": "figure_placeholder", "number": 4}, {"type": "text", "content": "). The case description, titled <em>Instructions concerning a wound in his temple, penetrating to the bone, (and) perforating his temporal bone</em>, recounts the effects of applying pressure on the exposed brain: “… if thou puttest thy finger on the mouth of the wound… he shudder exceedingly.” However, instead of recommending a surgical procedure, the suggested treatment was, “Now when thou findest that man speechless, his [relief] shall be sitting; soften his head with grease, (and) pour [milk] into both his ears.”"}]}'::JSONB,
   'The most ancient text mentioning the brain (~1,600 BCE) is the Edwin Smith papyrus (Figure 3), a surgical treatise describing 48 cases. Case 20 (Figure 4) describes a skull wound exposing the brain, noting that pressure on it made the patient shudder.',
   3, true, v_fig3_id, 'auto', false, 0),

  -- p4 — Other early texts / brain functions noted
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "Other early texts indicate that, like the Egyptians, ancient Mesopotamian, Indian and Chinese thinkers also tended to consider the heart as the principle organ of the mind"}, {"type": "citation_ref", "number": 8}, {"type": "text", "content": ". That being said, some relatively correct functions were assigned to the brain early on: the Edwin Smith Papyrus relates damage to one side of the head leading to hemiplegia"}, {"type": "citation_ref", "number": 12}, {"type": "text", "content": " (paralysis on the other side of the body); the Indian Charaka Samhita indicates that head issues can lead to facial paralysis and muteness"}, {"type": "citation_ref", "number": 8}, {"type": "text", "content": "."}]}'::JSONB,
   'Like the Egyptians, ancient Mesopotamian, Indian and Chinese thinkers tended to consider the heart the principal organ of the mind, though some correct brain functions were noted early, such as head damage leading to contralateral paralysis.',
   4, false, NULL, NULL, false, 0),

  -- p5 — Ancient Greece: diverse views on the seat of the mind
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "It wasn’t until ancient Greece that a serious debate arose about whether the heart was truly the seat of the mind, or if instead it was the brain"}, {"type": "citation_ref", "number": 13}, {"type": "text", "content": ". In fact, ideas about the seat of the mind were diverse in ancient Greece: “Whereas Empedocles placed the seat of the soul in the blood, Parmenides and Epicurus in the chest, Strato between the eyebrows, Democritus and Plato in the head as a whole, others placed it in the meninges and Herophilus in the ventricles of the brain.”"}, {"type": "citation_ref", "number": 12}, {"type": "text", "content": " Alcmaeon, an early proponent of animal dissections for gaining anatomical insights, wrote that “a man smelled with his nostrils as he drew breath up to the brain.”"}, {"type": "citation_ref", "number": 12}]}'::JSONB,
   'It was not until ancient Greece that a serious debate arose about whether the heart or the brain was the seat of the mind. Views were diverse, with thinkers placing the soul in the blood, chest, head, meninges, or ventricles.',
   5, false, NULL, NULL, false, 0),

  -- p6 — Hippocrates: encephalocentric
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "In 5<sup>th</sup> century BCE, Hippocrates of Cos and his followers considered the brain to be the seat of intelligence and consciousness, believed the brain controlled many bodily functions, and thought the brain was at the root of what are now considered neurological disorders and mental illnesses"}, {"type": "citation_ref", "number": 14}, {"type": "text", "content": ". For example, the Hippocratic writings instructed that it is “the brain which permits the perception of hearing, vision and smell; from those memory and intuition arise.”"}, {"type": "citation_ref", "number": 12}, {"type": "text", "content": " Hippocratic medicine was based on observation, with little room for the magical or the sacred in guiding understanding of the body’s functions and dysfunctions, though they were heavily influenced by humoral theory. However, neuroanatomy, beyond some basic knowledge derived from a small number of animal dissections, was not viewed as important by Hippocrates."}]}'::JSONB,
   'In the 5th century BCE, Hippocrates of Cos and his followers considered the brain the seat of intelligence and consciousness and the root of neurological and mental disorders, basing their medicine on observation rather than the magical or sacred.',
   6, false, NULL, NULL, false, 0),

  -- p7 — Plato: encephalocentric, tripartite soul
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "Plato was another influential Greek thinker who held an encephalocentric view. For example, he relays this from Socrates: “…[I]t is the brain that conveys sensations like hearing, seeing and smelling, so that memory and opinion are produced and, once they had firmly settled [in our mind], knowledge is generated in such way.”"}, {"type": "citation_ref", "number": 13}, {"type": "text", "content": " Much like Democritus before him, Plato argued for a triune, or tripartite, soul"}, {"type": "citation_ref", "number": 13}, {"type": "text", "content": ": the head or brain contained an immortal, rational soul; the chest contained a mortal soul that was the source of our feelings; the gut region contained the soul of nourishment and passions. One reason Plato favoured the head as the seat of the mind was for idealistic reasons: the cosmos was a sphere, and the earth was a sphere at the center of the cosmos, and so it made sense that our most divine part, our mind/soul, would be located in our most spherical structure, our head"}, {"type": "citation_ref", "number": 15}, {"type": "text", "content": "."}]}'::JSONB,
   'Plato held an encephalocentric view, relaying from Socrates that the brain conveys sensation and generates knowledge. He argued for a tripartite soul, favouring the head partly for idealistic reasons: it was our most spherical, and thus most divine, structure.',
   7, false, NULL, NULL, false, 0),

  -- p8 — Aristotle: cardiocentric (with blockquote)
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "In contrast to Plato, his pupil Aristotle held a cardiocentric point of view. Aristotle, who performed comparative anatomical analyses in several animal species, also split the soul into three components, but he used these to separate man from plants and other animals. He argued that all organisms have a vegetative/nourishing soul, all animals possess a sensitive, motor soul, but only humans possess an immaterial intellectual soul (Alcmaeon had argued earlier that understanding is what separated humans from other animals)"}, {"type": "citation_ref", "number": 13}, {"type": "text", "content": ". Aristotle placed the seat of these souls in the heart"}, {"type": "citation_ref", "number": 8}, {"type": "text", "content": ". In part, he argued for a cardiocentric view because he considered the heart to be warm, and thus vital, whereas he thought the brain was cold—Galen would test this a few hundred years later and find that the brain was warm. Aristotle argued that the brain served to cool down the heart, going so far as to posit that we sleep at the end of the day since the brain’s cooling abilities were insufficient:"}, {"type": "blockquote", "content": "“For, as has been observed elsewhere, sleep comes on when the corporeal element [in the ‘evaporation’] conveyed upwards by the hot, along the veins, to the head. But when that which has been thus carried up can no longer ascend, but is too great in quantity [to do so], it forces the hot back again and flows downwards. Hence it is that men sink down [as they do in sleep] when the heat which tends to keep them erect (man alone, among animals, being naturally erect) is withdrawn; and this, when it befalls them, causes unconsciousness, and afterwards phantasy.”"}]}'::JSONB,
   'In contrast to Plato, his pupil Aristotle held a cardiocentric view, placing the seat of the soul in the heart, which he considered warm and vital, while thinking the brain was cold and served only to cool the heart — even attributing sleep to the brain’s insufficient cooling.',
   8, false, NULL, NULL, false, 0),

  -- p9 — Herophilus & Erasistratus: human dissection at Alexandria
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "Dissections of the human brain and body only truly began with Herophilus (335-280 BCE) and Erasistratus (304-250 BCE), when, for a brief period of time, studying human cadavers was permitted at the Alexandria School of Medicine in Egypt"}, {"type": "citation_ref", "number": 17}, {"type": "text", "content": ". By dissecting bodies of criminals executed at the Ptolemean court, these Greek physicians pioneered the field of human anatomy and provided the first descriptions of the cerebrum, the cerebellum, and the cerebral ventricles in the human brain. Herophilus and Erasistratus were the first to define nerves, and showed that they could be traced back to the brain and the spinal cord"}, {"type": "citation_ref", "number": 8}, {"type": "text", "content": ". At one point, Erasistratus argued that the meninges housed the mind"}, {"type": "citation_ref", "number": 13}, {"type": "text", "content": "."}]}'::JSONB,
   'Human dissection truly began with Herophilus and Erasistratus at the Alexandria School of Medicine, who pioneered human anatomy, gave the first descriptions of the cerebrum, cerebellum, and ventricles, and were the first to define nerves and trace them to the brain and spinal cord.',
   9, false, NULL, NULL, false, 0),

  -- p10 — Galen: brain as seat of the mind
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "The works of Herophilus and Erasistratus are not extant, but were passed down by the works of others, including Galen (129-216 CE), who in turn argued strongly in favour of the brain as the seat of the mind. After Hippocrates, Galen, a Greek physician working in Rome, had the most significant impact on medicine. This was in part because, like Hippocrates, he advocated for direct observation and against superstition. He served as the personal physician to several emperors, including Marcus Aurelius"}, {"type": "citation_ref", "number": 18}, {"type": "text", "content": ". Based on animal dissections, he described cranial and peripheral nerves, and showed that the brain and spinal cord were the source of nerves"}, {"type": "citation_ref", "number": 8}, {"type": "text", "content": ". Additionally, he explored subcortical structures and described cerebral ventricles more extensively than his predecessors. However, by Galen’s time dissections on human cadavers were no longer allowed, which limited his insights into human neuroanatomy."}]}'::JSONB,
   'Galen (129-216 CE) argued strongly for the brain as the seat of the mind and, after Hippocrates, had the greatest impact on medicine. Based on animal dissections, he described cranial and peripheral nerves and the ventricles, though a ban on human dissection limited his neuroanatomy.',
   10, false, NULL, NULL, false, 0),

  -- p11 — Flourens: placing the mind in the brain
  (v_section_mind_id,
   '{"blocks": [{"type": "text", "content": "Despite Galen arguing that the mind arose in the parenchyma, or brain tissue, much attention would subsequently be given to the ventricles as possible nodes of the mind (as will be described in detail in the next section). However, it wasn’t until the 1800s that Marie Pierre Jean Flourens, in his efforts to disprove phrenology (see more on this below as well), resected various brain regions, largely from rabbits and pigeons, and showed somewhat specific behavioral impacts. He found that removing the cerebrum appeared to impair sensory perception and judgement, while removing the cerebellum seemed to impair equilibrium and coordination. Thus Flourens, despite remaining adamant that there was no localization of function within the cerebrum, firmly placed the mind in the brain"}, {"type": "citation_ref", "number": 19}, {"type": "text", "content": "."}]}'::JSONB,
   'After Galen, attention turned to the ventricles as possible seats of the mind. In the 1800s, Flourens resected brain regions in rabbits and pigeons, showing the cerebrum affected perception and judgement and the cerebellum affected coordination — firmly placing the mind in the brain.',
   11, false, NULL, NULL, false, 0);

  RAISE NOTICE 'Foundations pilot seed complete: Introduction + Debate 0 + 4 figure placeholders.';
END $$;

COMMIT;
