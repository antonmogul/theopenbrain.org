-- OPENBRAIN-66: the History chapter's remaining figures, from the manuscript.
--
-- 26 of the chapter's figures were placeholder cards; only 2, 6 and 7 had
-- artwork. The images and captions here come from the authors' manuscript
-- (Foundations_ST7_NM3_LL.docx), matched to each figure by the "Figure N."
-- caption that follows it. Files: public/publicAssets/images/foundations/
-- figNN-0M.jpg (numbers) and figx-0M.jpg (letters), max 1600px, lowercase
-- because `serve` is case-sensitive.
--
-- The manuscript's letters differ from the database's in two places: its two
-- Penfield figures (H, I) and the Hippocrates bust (its first "Figure K") have
-- no rows here, so they are not added. The database's K is the four humors.
-- Figures 4 and B get artwork but are still not attached to a paragraph.
--
-- Same conventions as 20260922000000 (Figure 2): config.placeholder stays true
-- so older reader builds keep routing the row to the figure shell;
-- image_file_url is the first image. Idempotent. No BEGIN/COMMIT.

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig01-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$An Incan skull, acquired by Squier and studied by Broca. It is now housed at the American Museum of Natural History (Squier, 1877).$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig01-01.jpg",
    "alt": "An Incan skull with a square trepanation opening in the forehead."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig1';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig03-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Plates 6 and 7 of the Edwin Smith Papyrus, which is housed at the New York Academy of Medicine. Source: Wikipedia.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig03-01.jpg",
    "alt": "Two columns of hieratic script on aged papyrus."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig3';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig04-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Case 20 of the Edwin Smith Papyrus. Adapted from Minagar et al., 2003.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig04-01.jpg",
    "alt": "Case 20 of the papyrus in hieroglyphs, with an English translation under each part."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig4';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig05-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Galen dissecting a pig. From Opera omnia latine in septem classes digesta, published in 1565. Source: Wellcome Collection.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig05-01.jpg",
    "alt": "A woodcut of Galen dissecting a pig on a table before a crowd of onlookers."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig5';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig08-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Gall’s organology. Source: Gall and Spurzheim, Anatomie et Physiologie, 1810-1819.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig08-01.jpg",
    "alt": "A skull in profile covered with numbered regions, each an organ of a mental faculty."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig8';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig09-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$A photograph of the left side of Louis Victor Leborgne’s (aka Tan) brain. MRI analysis of Leborgne’s brain in 2007 revealed additional damage not visible from the brain surface that may have contributed to his aphasia. Source: Dronkers et al., Brain, 2007.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig09-01.jpg",
    "alt": "The left side of Leborgne's preserved brain, with a lesion in the frontal lobe."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig9';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig10-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Top-down drawing of a dog’s brain from Fritsch and Hitzig’s 1870 paper. Symbols indicate locations of electrical brain stimulation in motor cortex. The region marked ∆ activated neck muscles. Areas marked + moved the forepaw. Areas marked # activated the hindpaw. Facial muscles were activated when the areas marked O were stimulated. Image source: Wellcome Collection.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig10-01.jpg",
    "alt": "A top-down drawing of a dog's brain marked with symbols where stimulation moved muscles."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig10';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig11-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Anatomical drawings of Goltz’s dog (left, Figs. 14 and 15) and Ferrier’s monkey that were presented at the Seventh International Medical Congress in 1881. Image source: Gowers WR, Klein E, Schaefer AE, Langley JN. Preliminary report. Transactions of the International Medical Congress 1881. Volume 1.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig11-01.jpg",
    "alt": "Drawings of Goltz's dog brain and Ferrier's monkey brain after lesions."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig11';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig12-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Replica van Leeuwenhoek microscope. Source: Wikipedia.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig12-01.jpg",
    "alt": "A replica of van Leeuwenhoek's microscope: a small brass plate with a lens and a specimen pin."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig12';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig13-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Deiters’ neuron drawings. (1) A large neuron in the ventral horn of the spinal cord. (2) A medium-sized neuron cell from the dorsal horn of the spinal cord. (3) Part of another cell. (4) A smaller neuron (Dieters, 1865).$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig13-01.jpg",
    "alt": "Deiters' drawings of four spinal cord neurons, showing the axon and branching dendrites."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig13';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig14-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$The first-ever complete view of a brain region (dog olfactory bulb) stained by the Golgi method. Various distinct cell types are present, in different layers, as are their extensive dendritic trees. For more information, see Shepherd et al., Brain Research Reviews, 2011. Original source: Golgi, 1875.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig14-01.jpg",
    "alt": "A Golgi-stained dog olfactory bulb, with layers of darkly stained neurons and their dendrites."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig14';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig15-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Ramón y Cajal’s drawings of growth cones along with photographs from his original histological slides. A, Photograph of E3 chick embryo spinal cord showing commissural cells and their fibers ending in growth cones. B, Drawing summarizing spinal cord observations from several Golgi preparations. C, Photograph of E3 chick embryo spinal cord showing commissural neurons and their fibers with growth cones. Neuroepithelial cells are attached to the midline. D, Drawings of growth cones from the spinal cord of chick embryos. E, Photograph of growth cones from commissural fibers of E4 chick embryo spinal cord. Source: de Castro et al., Brain Research Reviews, 2007.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig15-01.jpg",
    "alt": "Cajal's drawings of growth cones beside photographs of his histological slides."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig15';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig16-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$A Ramón y Cajal drawing from 1902 showing from showing retinal circuitry (A) retinal projections (B) to lateral geniculate nucleus (D) and superior colliculus (E) from a rodent. Thalamic neurons project (K) onward to visual cortex (G), which then projects to higher cortical areas (N). Note the arrows indicating Ramon Y Cajal’s suggestions for the directional flow of signals in the brain. Source: The Cajal Institute, Cajal Legacy, Spanish National Research Council (CSIC), Madrid, Spain.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig16-01.jpg",
    "alt": "Cajal's drawing of the visual pathway from retina to thalamus and cortex, with lettered parts."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig16';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig17-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$A photograph of Golgi’s lab in Pavia, featured in the magazine “Il Secolo XX, Rivista Popolare Illustrata”, VI, no. 1, January 1907.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig17-01.jpg",
    "alt": "A black-and-white photograph of researchers at benches in Golgi's laboratory."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig17';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig18-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$An electron microscope image of a dendrite and its surrounding region, from rat nucleus acumbens. The dendrite is the region with thing elongated lines aligned bottom left to top right. T1-T4 are end-feet from presynaptic axons, with a dark band between the axon terminal and the postsynaptic dendrite. The presynaptic end-feet are surround by small circular synaptic vesicles. Source: Sanford, J. Biophys Biochem Cytol., 1956.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig18-01.jpg",
    "alt": "An electron micrograph of a dendrite with presynaptic end-feet labelled T1 to T4."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig18';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig19-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Plates outlining various versions of Galvani’s frog leg electrical stimulation experiment, using a friction machine (top) and atmospheric electricity (bottom). Source: Galvani, 1791.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig19-01.jpg",
    "alt": "An engraving of Galvani's frog legs connected to a friction electrical machine."
  },
  {
    "src": "/publicAssets/images/foundations/fig19-02.jpg",
    "alt": "An engraving of Galvani's frog legs wired to a lightning conductor on a terrace."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig19';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig20-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Effect of Vagusstoff on frog heart contractions. Perfusion with (1) Ringer solution, (2) Ringer solution obtained from a period of vagus stimulation, (3) control Ringer solution, (4) Ringer solution plus atropine. Source: Loewi, Pflügers Arch Ges Physiol,1921.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig20-01.jpg",
    "alt": "A recording strip of frog heart contractions in four numbered phases."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig20';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig21-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$A model, from Brooks and Eccles (Nature, 1947) proposing how interneuron ‘G’, as part of inhibitory pathway ‘I’, could theoretically inhibit motorneuron ‘M’ via an electric field effect when it receives subthreshold input.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig21-01.jpg",
    "alt": "A diagram of interneuron G inhibiting motor neuron M through pathway I."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig21';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figa-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$A skull, with writing all over it, purported to be Descartes’. There is controversy over whether this skull, which is housed at the Musée de l’homme in Paris is really Descartes’ skull, as another museum in Lund claims to have a piece of Descartes’ real skull.  Source: Musée de l’homme.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figa-01.jpg",
    "alt": "A skull covered in handwritten inscriptions, said to be Descartes'."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigA';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figb-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$A piece of skull, purported to be Descartes’, on display at Lund’s Historical Museum. Source: Johann SWE/Atlas Obscura.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figb-01.jpg",
    "alt": "A piece of skull on display, said to be part of Descartes'."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigB';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figc-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Galen’s physiology in The evolution of anatomy: a short history of anatomical and physiological discovery to Harvey (Singer, 1925). The rete mirabile can be seen at the base of the brain, where it was thought to convert vital spirits into animal spirits. Source: Wellcome Collection.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figc-01.jpg",
    "alt": "A diagram of Galen's physiology, with the rete mirabile at the base of the brain."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigC';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figd-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Top-down views of a human and chimpanzee brain. On the right side a transverse section is shown, revealing the ventricles. The hippocampus minor is indicated in both brains with an ‘x.’ Source: Huxley, 1863.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figd-01.jpg",
    "alt": "Top-down views of a human and a chimpanzee brain, with the hippocampus minor marked x."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigD';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fige-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Trepanation tools belonging to Gottlieb Burckhardt (left), and one of his patients (right) with two cortical resections. Source: Mueller, 1960.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fige-01.jpg",
    "alt": "Burckhardt's trepanation tools in their case."
  },
  {
    "src": "/publicAssets/images/foundations/fige-02.jpg",
    "alt": "A patient of Burckhardt's."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigE';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figf-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Walter Freeman performing a lobotomy. Source: public domain.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figf-01.jpg",
    "alt": "Walter Freeman performing a transorbital lobotomy while onlookers watch."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigF';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figg-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$A drawing of Mary Rafferty’s cranial erosion. Source: Bartholow, 1874.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figg-01.jpg",
    "alt": "A drawing of Mary Rafferty's head showing the erosion of her skull."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigG';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figj-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$Penfield’s homunculus, for somatosensory (left) and motor (right) cortex. Adapted from Penfield and Rasmussen, 1950.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figj-01.jpg",
    "alt": "Penfield's somatosensory and motor homunculi drawn over sections of the cortex."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigJ';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/figk-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$The link between the four humors and the four elements. Source: Stellmack and Stalikis, 1991.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/figk-01.jpg",
    "alt": "A diamond diagram linking the four humors to the four elements and their qualities."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFigK';

do $$
declare
  n int;
begin
  select count(*) into n from public.animations
   where animation_key in ('animationFoundationsFig1', 'animationFoundationsFig3', 'animationFoundationsFig4', 'animationFoundationsFig5', 'animationFoundationsFig8', 'animationFoundationsFig9', 'animationFoundationsFig10', 'animationFoundationsFig11', 'animationFoundationsFig12', 'animationFoundationsFig13', 'animationFoundationsFig14', 'animationFoundationsFig15', 'animationFoundationsFig16', 'animationFoundationsFig17', 'animationFoundationsFig18', 'animationFoundationsFig19', 'animationFoundationsFig20', 'animationFoundationsFig21', 'animationFoundationsFigA', 'animationFoundationsFigB', 'animationFoundationsFigC', 'animationFoundationsFigD', 'animationFoundationsFigE', 'animationFoundationsFigF', 'animationFoundationsFigG', 'animationFoundationsFigJ', 'animationFoundationsFigK')
     and jsonb_array_length(config -> 'images') > 0
     and image_file_url is not null;
  if n is distinct from 27 then
    raise exception 'foundations figures: expected 27 with images, got %', n;
  end if;
end $$;
