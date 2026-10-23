// Public figure metadata with the unapplied G2 migration represented for review.
// Source media and figure captions retained; SQL tests independently execute the migration.
// Only Storybook posters are synthetic: gallery thumbnails load before Play,
// so remote YouTube posters would break the offline story contract. The actual
// video IDs, credits and deliberate player activation remain unchanged.
const OFFLINE_VIDEO_POSTER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#1c1c1c"/><text x="240" y="180" text-anchor="middle" fill="white" font-family="sans-serif" font-size="20">Offline video preview</text></svg>'
)}`;

export const FIG19 = {
  id: "animationFoundationsFig19",
  title: "Galvani's frog leg preparation",
  images: [
    {
      alt: "An engraving of Galvani's frog legs connected to a friction electrical machine.",
      src: "/publicAssets/images/foundations/fig19-01.jpg",
      caption:
        "Galvani’s frog leg electrical stimulation experiment using a friction machine. Source: Galvani, 1791.",
    },
    {
      alt: "An engraving of Galvani's frog legs wired to a lightning conductor on a terrace.",
      src: "/publicAssets/images/foundations/fig19-02.jpg",
      caption:
        "Galvani’s frog leg electrical stimulation experiment using atmospheric electricity. Source: Galvani, 1791.",
    },
    {
      alt: "Video: The squid and its giant nerve fibre, Part 2.",
      src: OFFLINE_VIDEO_POSTER,
      play: "player",
      caption:
        "The squid and its giant nerve fibre, Part 2. Film: The Physiological Society.",
      youtube: "ZSCUbYyrHug",
    },
  ],
  caption:
    "Plates outlining various versions of Galvani’s frog leg electrical stimulation experiment, using a friction machine (top) and atmospheric electricity (bottom). Source: Galvani, 1791.",
  diagramType: "illustration",
  placeholder: true,
  figureNumber: 19,
};
export const FIG21 = {
  id: "animationFoundationsFig21",
  title: "Eccles' stretch-reflex circuit",
  images: [
    {
      alt: "Video: an interview with Andrew Huxley.",
      src: OFFLINE_VIDEO_POSTER,
      play: "player",
      caption:
        "Andrew Huxley interviewed by Alan Macfarlane. Video: Alan Macfarlane.",
      youtube: "KbA3RLz3xUQ",
    },
    {
      alt: "A diagram of interneuron G inhibiting motor neuron M through pathway I.",
      src: "/publicAssets/images/foundations/fig21-01.jpg",
      caption:
        "A model, from Brooks and Eccles (Nature, 1947) proposing how interneuron ‘G’, as part of inhibitory pathway ‘I’, could theoretically inhibit motorneuron ‘M’ via an electric field effect when it receives subthreshold input.",
    },
  ],
  caption:
    "A model, from Brooks and Eccles (Nature, 1947) proposing how interneuron ‘G’, as part of inhibitory pathway ‘I’, could theoretically inhibit motorneuron ‘M’ via an electric field effect when it receives subthreshold input.",
  diagramType: "diagram",
  placeholder: true,
  figureNumber: 21,
};
export const FIG15 = {
  id: "animationFoundationsFig15",
  title: "Ramón y Cajal's growth cone",
  images: [
    {
      alt: "Cajal's drawings of growth cones beside photographs of his histological slides.",
      src: "/publicAssets/images/foundations/fig15-01.jpg",
    },
  ],
  caption:
    "Ramón y Cajal’s drawings of growth cones along with photographs from his original histological slides. A, Photograph of E3 chick embryo spinal cord showing commissural cells and their fibers ending in growth cones. B, Drawing summarizing spinal cord observations from several Golgi preparations. C, Photograph of E3 chick embryo spinal cord showing commissural neurons and their fibers with growth cones. Neuroepithelial cells are attached to the midline. D, Drawings of growth cones from the spinal cord of chick embryos. E, Photograph of growth cones from commissural fibers of E4 chick embryo spinal cord. Source: de Castro et al., Brain Research Reviews, 2007.",
  diagramType: "illustration",
  placeholder: true,
  figureNumber: 15,
};
