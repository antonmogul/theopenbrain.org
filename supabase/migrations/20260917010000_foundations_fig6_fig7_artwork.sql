-- OPENBRAIN-41: real artwork for History Figures 6 and 7.
--
-- Both are sets the authors asked to cycle through (S. Trenholm, 5 Jun 2026):
-- Figure 6 is ten depictions of the medieval cell doctrine, each with its own
-- caption; Figure 7 is four plates from Vesalius's Fabrica under one legend.
-- The images are static files in public/publicAssets/images/foundations/.
--
-- A figure's artwork lives on its animations row: config.images is a list of
-- {src, caption?} and image_file_url is the first image, for anything that
-- only understands single images.
--
-- config.placeholder stays true on purpose. It is the flag that routes a
-- figure to the figure shell, and the shell shows artwork whenever images are
-- present (src/helper/figureCycle.js). Reader code that predates the image
-- viewer routes on that flag alone: with it removed, these rows would fall
-- through to the Lottie renderer and break. Keeping it means this file and
-- the code can ship in either order; old code just keeps showing
-- "Artwork pending".
--
-- Idempotent: each statement sets the same values on re-run. No BEGIN/COMMIT:
-- `supabase db push` already runs the file in one transaction.

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig06-01.jpg',
  config = config || jsonb_build_object(
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig06-01.jpg",
    "caption": "Medieval cell doctrine with five cells arranged in a linear sequence by the German Dominican friar and historian Johann Lindner (1440–1524), as part of notes for Albertus Magnus’s Parvulus philosophiae naturalis. Source: Lindner (1472–1474). Courtesy of the Wellcome Library, London. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-02.jpg",
    "caption": "Medieval cell doctrine with five cells arranged in a nonlinear sequence (ca. 1300), illumination on parchment by an unknown English miniaturist. The vermis (worm) guards the entrance of the posterior cell. Source: University Library, Cambridge, ms Gr.g.1.1; Web Gallery of Art. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-03.jpg",
    "caption": "The medieval cell doctrine according to Albertus Magnus, as presented in the first printed example of this doctrine, which appeared in Philosophia pauperum, sive Philosophia naturalis [Philosophy for the simple, or Natural philosophy] in 1490 (an earlier edition of this incunabulum from 1485 was not illustrated). In discussing the soul (De anima), Albertus Magnus partitioned cognitive abilities into three cells or ventricles, with the common sense (sensus communis) and imagination (imaginatio) in the first ventricle, the imaginative faculty (imaginativa) and extimativa (sic, judgment) in the second, and finally memory (memorativa) and the control of motion (membro motiva) in the third. Courtesy of the U.S. National Library of Medicine, Bethesda, Maryland, United States. Figure edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-04.jpg",
    "caption": "The medieval cell doctrine combined with elementary anatomy from Johannes Peyligk (1474–1522) from 1499. The woodcut shows a schematic layout of the ventricular system viewed from the side (although the head is actually only turned about 45 degrees), with both lateral ventricles, the third ventricle, and the fourth ventricle all depicted. Courtesy of the Herzog August Bibliothek in Wolfenbüttel, Germany. Figure edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-05.jpg",
    "caption": "Other depictions of the ventricular system from Peyligk (1499). (a) Top: Ventricular system from above, visualized through the skull and brain and (b) bottom: Ventricular system with drainage pathways to the pituitary. Courtesy of the Herzog August Bibliothek in Wolfenbüttel, Germany. Figures edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-06.jpg",
    "caption": "Anatomy of the head and brain as depicted in a woodcut by German physician, philosopher, and theologian Magnus Hundt (1449–1519) in 1501. Note the two round structures at the bridge of the nose. These represent the olfactory bulbs. They project and appear to join in a network at the base of the brain (the mythical rete mirabile). Also present are projections from the eyes, tongue, and body to three cavities in a band above the eyes and ears; this is a representation of the medieval cell doctrine showing the three cells or ventricles with functional divisions depicted schematically by divisional lines in each of the ventricles. Above this are schematic depictions of the cranial sutures and the sequential tissues external to the skull. Courtesy of the Wellcome Library, London. Figure edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-07.jpg",
    "caption": "The medieval cell doctrine according to Italian philosopher and physician Alessandro Achillini (1463/1461–1512) from Opusculum perutile de cognitione animae et eius potentiis Augustini de Anchona cum quadam questione Prosperi de Regio (1503). Courtesy of the Biblioteca Nazionale Centrale, Roma [National Central Library, Rome], Italy. Figure edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-08.jpg",
    "caption": "Illustration of the medieval cell doctrine from the encyclopedic compilation Margarita philosophica (The Pearl of Wisdom, or The Philosophical Pearl) by German Carthusian monk and humanist writer Gregor Reisch (ca. 1467–1525). The skull is cut away in a band to allow viewing of the brain and the ventricular system within it, along with the specific cognitive faculties localized to each of the ventricles. The curlicues around the ventricles are meant to portray the sulci of the cerebral cortex. The woodcut shown was used in the authorized editions in 1503, March 1504, February 1508, 1517, 1536, and 1583. Courtesy of the University of Iowa Libraries, Iowa City, Iowa (Reisch, 1504). Figure edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-09.jpg",
    "caption": "Anatomy of the head and brain as depicted in a woodcut by Johannes Dryander (1500–1560) in 1537. This image was clearly derived from the one by Magnus Hundt in 1501. It continues the same medieval fictions, while resolving some problems with Hundt’s figure and creating some new problems and misunderstandings. It is a striking example of the persistence of erroneous medieval ideas, despite the work of other pre-Vesalian anatomists, such as Jacopo Berengario da Carpi (1460–1530), in the intervening years. Nevertheless, this image also shows a dramatic improvement in realism (naturalism), representation of light and shadow, and single-point linear perspective represented in woodcuts over that period. Courtesy of the U.S. National Library of Medicine, Bethesda, Maryland, United States. Figure edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  },
  {
    "src": "/publicAssets/images/foundations/fig06-10.jpg",
    "caption": "English physician Robert Fludd’s scheme for the medieval cell doctrine (Fludd, 1619). See text for details. Courtesy of the Bibliothèque municipale de Lyon [Lyon Public Library], Lyon, France. Figure edited by Douglas J. Lanska. Figure legend from Lanska, 2024, Oxford Research Encyclopedia of Neuroscience."
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig6';

update public.animations
set
  image_file_url = '/publicAssets/images/foundations/fig07-01.jpg',
  config = config || jsonb_build_object(
    'caption', $fig$From A. Vesalius, De Humani Corporis Fabrica Libri Septem, Basle: Joannes Oporinus, 1543. Image source, The Wellcome Collection.$fig$,
    'images', $fig$[
  {
    "src": "/publicAssets/images/foundations/fig07-01.jpg"
  },
  {
    "src": "/publicAssets/images/foundations/fig07-02.jpg"
  },
  {
    "src": "/publicAssets/images/foundations/fig07-03.jpg"
  },
  {
    "src": "/publicAssets/images/foundations/fig07-04.jpg"
  }
]$fig$::jsonb
  )
where animation_key = 'animationFoundationsFig7';

do $$
declare
  n6 int; n7 int;
begin
  select jsonb_array_length(config -> 'images') into n6
    from public.animations where animation_key = 'animationFoundationsFig6';
  select jsonb_array_length(config -> 'images') into n7
    from public.animations where animation_key = 'animationFoundationsFig7';
  if n6 is distinct from 10 or n7 is distinct from 4 then
    raise exception 'foundations figures: expected 10 and 4 images, got % and %', n6, n7;
  end if;
end $$;
