-- OPENBRAIN-102: draft flashcard decks for History and the Retina.
--
-- Stuart, 24 Sep: "How are flashcards supposed to work?" The chapters had no
-- cards, so every flashcard button led to an empty screen. Anton chose draft
-- decks written from the chapter text: foundations-of-neuroscience: 24 cards; the-retina: 24 cards. Every card is
-- supported by a sentence of its chapter (the review sheet, with the source
-- quote for each card, is docs/content/flashcards-draft-2026-09.md) and is
-- tagged 'draft' until the authors have checked it; the reader says so.
--
-- Idempotent: a chapter that already has draft cards is left alone, so a
-- corrected deck means deleting the draft rows first. created_at is staggered
-- because the app plays a deck in created_at order.

begin;

do $$
begin
  if not exists (select 1 from public.profiles where role = 'creator') then
    raise exception 'OPENBRAIN-102: no creator profile to own the draft flashcards';
  end if;
end $$;

-- Foundations of Neuroscience (foundations-of-neuroscience): 24 cards
insert into public.flashcards
  (module_id, section_id, front_text, back_text, difficulty, tags, order_index, created_by, created_at)
select m.id, s.id, v.front, v.back, v.difficulty, v.tags, v.n, c.id,
       now() + v.n * interval '1 millisecond'
from public.modules m
cross join (select id from public.profiles where role = 'creator' order by created_at limit 1) c
cross join (values
  (1, '2fbfad0f-aae0-4427-881b-b16f63e6d17a'::uuid, $c$Which four debates does this chapter use to trace the history of our understanding of the brain?$c$, $c$1) Where is the mind? 2) Is there localization of function in the brain? 3) What is the fundamental functional unit of the brain? 4) How do neurons communicate with one another?$c$, 1, array[$c$overview$c$,$c$draft$c$]::text[]),
  (2, '3ee91a2c-1a60-4a4d-8fc1-9fb19d56aa49'::uuid, $c$What did Paul Broca conclude about the Incan skull with a square hole that Squier sent him, and what did his report spark?$c$, $c$That the person had survived at least a few days after the procedure. His published findings sparked immediate interest in studying trepanation (surgically putting a hole in the skull) in ancient burial sites.$c$, 2, array[$c$broca$c$,$c$trepanation$c$,$c$draft$c$]::text[]),
  (3, '3ee91a2c-1a60-4a4d-8fc1-9fb19d56aa49'::uuid, $c$What role did Hippocrates of Cos and his followers assign to the brain?$c$, $c$They considered it the seat of intelligence and consciousness, believed it controlled many bodily functions, and saw it as the root of what we now call neurological disorders and mental illnesses.$c$, 1, array[$c$hippocrates$c$,$c$seat-of-mind$c$,$c$draft$c$]::text[]),
  (4, '3ee91a2c-1a60-4a4d-8fc1-9fb19d56aa49'::uuid, $c$How did Plato divide the tripartite soul across the body?$c$, $c$The head/brain held an immortal, rational soul; the chest held a mortal soul that was the source of our feelings; the gut held the soul of nourishment and passions.$c$, 2, array[$c$plato$c$,$c$seat-of-mind$c$,$c$draft$c$]::text[]),
  (5, '3ee91a2c-1a60-4a4d-8fc1-9fb19d56aa49'::uuid, $c$Why did Aristotle hold a cardiocentric view, and what function did he give the brain?$c$, $c$He considered the heart warm and therefore vital, and thought the brain was cold; he argued the brain served to cool down the heart. (Galen later tested this and found the brain was warm.)$c$, 2, array[$c$aristotle$c$,$c$seat-of-mind$c$,$c$draft$c$]::text[]),
  (6, '3ee91a2c-1a60-4a4d-8fc1-9fb19d56aa49'::uuid, $c$By dissecting human bodies in Alexandria, which brain structures did Herophilus and Erasistratus describe for the first time?$c$, $c$The cerebrum, the cerebellum and the cerebral ventricles of the human brain. Dissecting executed criminals, they pioneered the field of human anatomy.$c$, 2, array[$c$anatomy$c$,$c$dissection$c$,$c$draft$c$]::text[]),
  (7, '3ee91a2c-1a60-4a4d-8fc1-9fb19d56aa49'::uuid, $c$In Flourens's lesion experiments, what did removing the cerebrum versus the cerebellum appear to impair?$c$, $c$Removing the cerebrum appeared to impair sensory perception and judgement; removing the cerebellum seemed to impair equilibrium and coordination.$c$, 2, array[$c$flourens$c$,$c$lesions$c$,$c$draft$c$]::text[]),
  (8, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$In the cell doctrine (ventricular theory), who first assigned Galen's three mental faculties to brain locations, and where?$c$, $c$Christian Church Fathers of the 4th century CE took Galen's three mental faculties (imagination, reasoning and memory) and assigned each to a different ventricle of the brain.$c$, 2, array[$c$localization$c$,$c$ventricles$c$,$c$draft$c$]::text[]),
  (9, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$What role did Descartes give the pineal gland?$c$, $c$He argued it acted like a puppet master, directing the flow of spirits through the brain to control distinct functions and acting as the interface between the physical and ethereal worlds.$c$, 1, array[$c$descartes$c$,$c$dualism$c$,$c$draft$c$]::text[]),
  (10, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$What were Franz Joseph Gall's three core beliefs about the brain and individual disposition?$c$, $c$Different parts of the brain serve different functions; the relative size of each functional area differs across individuals; and these anatomical differences account for differences in disposition.$c$, 2, array[$c$localization$c$,$c$phrenology$c$,$c$draft$c$]::text[]),
  (11, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$On what grounds did Flourens reject Gall's phrenology?$c$, $c$In contrast to Gall, he considered the cerebrum to be equipotential: all sensations, all perceptions and all volition occupy the same seat in it.$c$, 2, array[$c$equipotentiality$c$,$c$phrenology$c$,$c$draft$c$]::text[]),
  (12, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$From the patient Leborgne ('Tan') and later patients with aphasia, which region did Broca identify as the locus of speech generation?$c$, $c$The left frontal cortex; a follow-up paper with several additional people with aphasia solidified this claim.$c$, 1, array[$c$broca$c$,$c$localization$c$,$c$speech$c$,$c$draft$c$]::text[]),
  (13, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$What did Fritsch and Hitzig find when they electrically stimulated the cortex of dogs?$c$, $c$A specific portion of cortex (motor cortex) reliably drove contralateral body movements, and stimulating different parts of it moved different parts of the body.$c$, 2, array[$c$localization$c$,$c$motor-cortex$c$,$c$draft$c$]::text[]),
  (14, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$What did Karl Lashley conclude from lesioning rat brains in his search for engrams?$c$, $c$That memories were stored everywhere (equipotentiality) and that the impact of a lesion scaled directly with its size (mass action).$c$, 2, array[$c$equipotentiality$c$,$c$memory$c$,$c$draft$c$]::text[]),
  (15, '72104e64-d3f9-4425-99e1-7978a8909b25'::uuid, $c$What two conclusions did Brenda Milner draw from studying patient H.M. (Henry Molaison)?$c$, $c$The hippocampus is critical for encoding new memories, and different types of memory (episodic vs. procedural) are stored in different brain regions.$c$, 2, array[$c$hippocampus$c$,$c$memory$c$,$c$draft$c$]::text[]),
  (16, 'dc2040bb-35a7-4d7a-a6ec-4f10a32facc3'::uuid, $c$What did the reticular theory, formalized by Joseph von Gerlach in 1871, propose about how the brain is built?$c$, $c$That the brain is built from specialized cells whose extended fibers fuse with one another, forming a giant nerve net or syncytium.$c$, 2, array[$c$neuron-doctrine$c$,$c$reticular-theory$c$,$c$draft$c$]::text[]),
  (17, 'dc2040bb-35a7-4d7a-a6ec-4f10a32facc3'::uuid, $c$What was the main advantage of Camillo Golgi's 'black reaction' silver stain?$c$, $c$Random cells in nervous tissue are stained very darkly and in their entirety.$c$, 1, array[$c$golgi$c$,$c$histology$c$,$c$draft$c$]::text[]),
  (18, 'dc2040bb-35a7-4d7a-a6ec-4f10a32facc3'::uuid, $c$What did Ramón y Cajal conclude about how neuronal processes meet other cells, and what was this contact later called?$c$, $c$Neuronal processes end in close apposition to other cell bodies or processes but never fuse with them. Charles Sherrington later (1897) named this close apposition a synapse.$c$, 2, array[$c$cajal$c$,$c$neuron-doctrine$c$,$c$synapse$c$,$c$draft$c$]::text[]),
  (19, 'dc2040bb-35a7-4d7a-a6ec-4f10a32facc3'::uuid, $c$What does Ramón y Cajal's law of dynamic polarization describe?$c$, $c$The direction of information flow within a neuron: from dendrites to cell body to axon.$c$, 1, array[$c$cajal$c$,$c$neuron-doctrine$c$,$c$draft$c$]::text[]),
  (20, 'b1638893-61ae-49fa-9cf9-1db0b0511079'::uuid, $c$What were the two sides of the 'Soups vs. Sparks' debate?$c$, $c$'Soups': chemical components must mediate neurotransmission. 'Sparks': electricity was the only medium that could reasonably carry fast messages between neurons.$c$, 1, array[$c$neurotransmission$c$,$c$draft$c$]::text[]),
  (21, 'b1638893-61ae-49fa-9cf9-1db0b0511079'::uuid, $c$In Loewi's frog-heart experiment, what did fluid from the vagus-stimulated heart do to a second heart, and what did this show?$c$, $c$The second (denervated) heart began beating more slowly, showing that the stimulated vagus nerve releases a molecule that affects heart rate.$c$, 2, array[$c$loewi$c$,$c$neurotransmission$c$,$c$draft$c$]::text[]),
  (22, 'b1638893-61ae-49fa-9cf9-1db0b0511079'::uuid, $c$What did Henry Dale and colleagues show Loewi's 'Vagusstoff' to be?$c$, $c$Acetylcholine, which made it the first neurotransmitter to be identified.$c$, 1, array[$c$acetylcholine$c$,$c$neurotransmission$c$,$c$draft$c$]::text[]),
  (23, 'b1638893-61ae-49fa-9cf9-1db0b0511079'::uuid, $c$In Eccles's spinal-cord experiment, what result would indicate chemical inhibition, and what did he actually record?$c$, $c$If the interneuron released an inhibitory neurotransmitter, the motor neuron would hyperpolarize. To his surprise, Eccles recorded a hyperpolarization.$c$, 3, array[$c$eccles$c$,$c$inhibition$c$,$c$neurotransmission$c$,$c$draft$c$]::text[]),
  (24, 'b1638893-61ae-49fa-9cf9-1db0b0511079'::uuid, $c$How do electrical synapses arise, what role do they often play, and what does this mean for 'soups vs. sparks'?$c$, $c$They arise via gap junctions and often synchronize neuronal activity. So soups and sparks work together in the brain.$c$, 2, array[$c$electrical-synapses$c$,$c$gap-junctions$c$,$c$draft$c$]::text[])
) as v(n, section_id, front, back, difficulty, tags)
left join public.sections s on s.id = v.section_id and s.module_id = m.id
where m.slug = 'foundations-of-neuroscience'
  and not exists (
    select 1 from public.flashcards f
    where f.module_id = m.id and 'draft' = any (f.tags)
  );

-- The Retina (the-retina): 24 cards
insert into public.flashcards
  (module_id, section_id, front_text, back_text, difficulty, tags, order_index, created_by, created_at)
select m.id, s.id, v.front, v.back, v.difficulty, v.tags, v.n, c.id,
       now() + v.n * interval '1 millisecond'
from public.modules m
cross join (select id from public.profiles where role = 'creator' order by created_at limit 1) c
cross join (values
  (1, '36adafd0-bc6a-4ebc-acc7-8270ea0c083b'::uuid, $c$What is the difference between the intromission and extramission theories of vision?$c$, $c$Intromission: vision works by light passing into the eyes. Extramission: vision works by energy passing out of the eyes. Many of the earliest theories favoured extramission.$c$, 1, array[$c$history$c$,$c$vision-theories$c$,$c$draft$c$]::text[]),
  (2, '44abc9e0-eda6-4eca-b335-0d2301e26b14'::uuid, $c$Which provides more refractive power to the eye, the cornea or the lens, and how can you notice this?$c$, $c$The cornea. You can see this if you open your eyes under water, because water and the cornea have similar refractive indices.$c$, 2, array[$c$cornea$c$,$c$optics$c$,$c$draft$c$]::text[]),
  (3, 'af170006-e4c6-441a-af6b-37cb9200f4da'::uuid, $c$What are the five neuronal classes of the retina?$c$, $c$Photoreceptors, horizontal cells, bipolar cells, amacrine cells and ganglion cells.$c$, 1, array[$c$cell-classes$c$,$c$draft$c$]::text[]),
  (4, 'af170006-e4c6-441a-af6b-37cb9200f4da'::uuid, $c$Why does each eye have a small blind spot?$c$, $c$Ganglion cell axons bundle into the optic nerve, which passes back through the retina to leave the eye; the optic nerve head contains no photoreceptors.$c$, 1, array[$c$anatomy$c$,$c$blind-spot$c$,$c$draft$c$]::text[]),
  (5, 'af170006-e4c6-441a-af6b-37cb9200f4da'::uuid, $c$What is a retinal 'mosaic'?$c$, $c$A pattern of laterally tiled cells: each ganglion cell and its upstream microcircuitry is replicated across the retinal surface, so visual information is extracted from every part of the visual field.$c$, 2, array[$c$lateral-organization$c$,$c$mosaics$c$,$c$draft$c$]::text[]),
  (6, 'af170006-e4c6-441a-af6b-37cb9200f4da'::uuid, $c$Which neurotransmitters do almost all amacrine cells release, and how does transmitter type relate to dendritic tree size?$c$, $c$GABA or glycine (they are inhibitory). Glycinergic amacrine cells tend to have narrow dendritic trees and small receptive fields; GABAergic ones tend to have broader trees and larger receptive fields.$c$, 2, array[$c$amacrine-cells$c$,$c$draft$c$]::text[]),
  (7, '24c4fe32-8a58-461b-b9f1-a1c58e19f6e2'::uuid, $c$How many cone types do humans have, and roughly where do their peak sensitivities lie?$c$, $c$Three: blue (~420 nm), green (~534 nm) and red (~564 nm).$c$, 1, array[$c$cones$c$,$c$photoreceptors$c$,$c$draft$c$]::text[]),
  (8, '24c4fe32-8a58-461b-b9f1-a1c58e19f6e2'::uuid, $c$What shape are rod outer segments, what light conditions are rods specialized for, and which pigment do their discs contain?$c$, $c$Long, rod-shaped outer segments; specialized for detecting photons in dim environments; their discs contain rhodopsin, tuned to blue-green light (peak ~498 nm).$c$, 1, array[$c$photoreceptors$c$,$c$rods$c$,$c$draft$c$]::text[]),
  (9, '24c4fe32-8a58-461b-b9f1-a1c58e19f6e2'::uuid, $c$What molecular event underlies rhodopsin 'bleaching', and what does it trigger?$c$, $c$Retinal photoisomerizes from the 11-cis to the all-trans form. This changes rhodopsin's conformation, which starts a signal transduction cascade.$c$, 2, array[$c$phototransduction$c$,$c$rhodopsin$c$,$c$draft$c$]::text[]),
  (10, '24c4fe32-8a58-461b-b9f1-a1c58e19f6e2'::uuid, $c$Why does spreading thermal noise across many tiny-current cGMP channels help photoreceptors detect light?$c$, $c$Each channel's noise is independent, so it averages out, while the photon signal is synchronized across channels and photoreceptors, so it averages in.$c$, 3, array[$c$phototransduction$c$,$c$signal-and-noise$c$,$c$draft$c$]::text[]),
  (11, '6af621e4-6ff0-4f27-8146-6aa72835c8f8'::uuid, $c$Where in the visual pathway does center-surround antagonism begin, and which cells implement it there?$c$, $c$At the first synapse of the visual pathway, where it is implemented by horizontal cells.$c$, 1, array[$c$center-surround$c$,$c$horizontal-cells$c$,$c$draft$c$]::text[]),
  (12, '6af621e4-6ff0-4f27-8146-6aa72835c8f8'::uuid, $c$Why does a star in the night sky evoke little horizontal cell feedback, while a cloudless blue sky evokes a lot?$c$, $c$A small stimulus like a star activates only a few cones, whereas a large stimulus like a blue sky activates many adjacent cones and evokes significant horizontal cell feedback.$c$, 2, array[$c$feedback$c$,$c$horizontal-cells$c$,$c$draft$c$]::text[]),
  (13, '9497f217-b3e2-4688-a7cd-5360e2e779ca'::uuid, $c$How does an increase in light depolarize ON bipolar cells?$c$, $c$Light lowers glutamate in the synaptic cleft, which releases mGluR6's inhibition of the TRPM1 channel; this drives an inward current and depolarizes the ON bipolar cell.$c$, 3, array[$c$bipolar-cells$c$,$c$on-off$c$,$c$draft$c$]::text[]),
  (14, '9497f217-b3e2-4688-a7cd-5360e2e779ca'::uuid, $c$Why do bipolar cells signal mean luminance rather than the spatial pattern of a stimulus?$c$, $c$Their responses are linear at this stage of the circuit, so they signal the mean luminance over all connected photoreceptors, not the stimulus's spatial organization.$c$, 3, array[$c$bipolar-cells$c$,$c$linearity$c$,$c$draft$c$]::text[]),
  (15, 'fa9a9189-d188-47cf-978a-092813998bbc'::uuid, $c$Which inputs drive the center and the surround of a ganglion cell's receptive field?$c$, $c$Center: excitatory bipolar cell input collected over the ganglion cell's dendritic tree. Surround: mainly GABAergic amacrine cells located laterally further away.$c$, 2, array[$c$center-surround$c$,$c$ganglion-cells$c$,$c$draft$c$]::text[]),
  (16, 'fa9a9189-d188-47cf-978a-092813998bbc'::uuid, $c$Which ganglion cells are thought to compute red-green and blue-yellow color opponency in the primate retina?$c$, $c$Red-green: midget ganglion cells (some sample mainly red or green cones in their centers). Blue-yellow: small bistratified ganglion cells.$c$, 3, array[$c$color-opponency$c$,$c$ganglion-cells$c$,$c$draft$c$]::text[]),
  (17, 'fa9a9189-d188-47cf-978a-092813998bbc'::uuid, $c$Why does null-direction motion evoke little response in a direction-selective ganglion cell, despite symmetrical bipolar excitation?$c$, $c$Null-direction motion drives strong GABAergic inhibition that vetoes the bipolar excitation; preferred-direction motion drives very little inhibition.$c$, 3, array[$c$direction-selectivity$c$,$c$starburst-amacrine$c$,$c$draft$c$]::text[]),
  (18, 'fa9a9189-d188-47cf-978a-092813998bbc'::uuid, $c$Rod bipolar cells do not synapse onto ganglion cells. How do rod signals reach the ON and OFF pathways?$c$, $c$Rod bipolar cells make glutamatergic synapses onto AII amacrine cells, which pass rod signals to ON bipolar cells via electrical synapses and to OFF bipolar cells via glycinergic synapses.$c$, 3, array[$c$amacrine-cells$c$,$c$rod-pathway$c$,$c$draft$c$]::text[]),
  (19, 'fa9a9189-d188-47cf-978a-092813998bbc'::uuid, $c$What makes intrinsically photosensitive retinal ganglion cells (ipRGCs) special, and what do their inputs control?$c$, $c$They contain melanopsin and turn light into spikes without rod or cone input. They project to 'non-image forming' centers, where they help control circadian rhythm and the pupillary light reflex.$c$, 2, array[$c$iprgcs$c$,$c$melanopsin$c$,$c$draft$c$]::text[]),
  (20, '9929c0a4-3574-470e-b8fc-4d5f65b4d763'::uuid, $c$How does the retina let us see over roughly 10 orders of magnitude of light intensity?$c$, $c$The retina as a whole adapts to the mean luminance of the environment, so a ganglion cell's luminance response curve shifts with mean luminance.$c$, 2, array[$c$light-adaptation$c$,$c$draft$c$]::text[]),
  (21, '0a7c7c97-2cdf-41df-b869-c0bdbc1201d3'::uuid, $c$Why are spontaneous retinal waves in the developing retina important for the brain?$c$, $c$They spread to retino-recipient areas of the brain, where the patterned activity is important for developing retinotopic maps; disrupting the waves impairs proper map development.$c$, 2, array[$c$development$c$,$c$retinal-waves$c$,$c$draft$c$]::text[]),
  (22, 'b996e1c4-d6b4-4542-bfe3-f4f92ffbbedc'::uuid, $c$In age-related macular degeneration (AMD), which cells are damaged and what visual deficit results?$c$, $c$Photoreceptors in the macula, specifically cones (dominant there), leading to a blind spot (scotoma) in the high-acuity central visual field.$c$, 2, array[$c$amd$c$,$c$disease$c$,$c$draft$c$]::text[]),
  (23, 'b996e1c4-d6b4-4542-bfe3-f4f92ffbbedc'::uuid, $c$Why does retinitis pigmentosa lead to 'tunnel vision' and night-blindness?$c$, $c$RP is a group of genetic diseases causing loss of rod photoreceptors, and rods dominate the peripheral retina (outside the fovea/macula).$c$, 2, array[$c$disease$c$,$c$retinitis-pigmentosa$c$,$c$draft$c$]::text[]),
  (24, '8a4f70b1-0a50-4f7e-808c-58ef00b0438f'::uuid, $c$Why does the chapter call for more retinal research in foveated animal models rather than mice?$c$, $c$Mice lack a fovea, a crucial part of the human visual system. Foveated models are needed to examine differences in cell types and circuit computations between foveal and peripheral retina.$c$, 2, array[$c$fovea$c$,$c$future-research$c$,$c$draft$c$]::text[])
) as v(n, section_id, front, back, difficulty, tags)
left join public.sections s on s.id = v.section_id and s.module_id = m.id
where m.slug = 'the-retina'
  and not exists (
    select 1 from public.flashcards f
    where f.module_id = m.id and 'draft' = any (f.tags)
  );

commit;
