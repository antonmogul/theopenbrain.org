/*
 * Dashboard/Sections/MediaSection — the media library grid + detail modal.
 *
 * `filteredMedia` decides between the grid and the empty state; `mediaByType`
 * drives the grouped grid. Both are props because the parent owns filtering.
 * `selectedMedia` is a defineModel: setting it opens the detail modal.
 */
import MediaSection from "../MediaSection.vue";

const MEDIA_BY_TYPE = {
  lottie: [
    {
      id: "m1",
      title: "Phototransduction cascade",
      animation_key: "phototransduction",
      media_type: "lottie",
      file_size_bytes: 284000,
    },
  ],
  video: [
    {
      id: "m2",
      title: "Retina dissection",
      media_type: "video",
      file_size_bytes: 18800000,
    },
  ],
  image: [
    {
      id: "m3",
      title: "Retinal layers",
      animation_key: "retinal-layers",
      media_type: "image",
      file_size_bytes: 920000,
      scientific_domain: "Retina",
      description: "Cross-section through the ten retinal layers.",
    },
  ],
  youtube: [],
  gsap: [],
  css: [],
};

const EMPTY_BY_TYPE = {
  lottie: [],
  video: [],
  image: [],
  youtube: [],
  gsap: [],
  css: [],
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
];

const formatFileSize = (bytes) => `${Math.round(bytes / 1000)} KB`;

export default {
  title: "Dashboard/Sections/MediaSection",
  component: MediaSection,
  tags: ["autodocs"],
  argTypes: {
    mediaFilter: {
      control: "select",
      options: FILTERS.map((option) => option.value),
    },
    mediaFilterOptions: { control: "object" },
    mediaLoading: { control: "boolean" },
    mediaError: { control: "text" },
    filteredMedia: {
      control: "object",
      description: "Flat list after filter + search; empty shows EmptyState.",
    },
    mediaByType: { control: "object" },
    formatFileSize: {
      control: false,
      description: "Function prop; no control.",
    },
    mediaSearch: { control: "text", description: "v-model:mediaSearch" },
    selectedMedia: {
      control: "object",
      description: "v-model:selectedMedia — non-null opens the detail modal.",
    },
  },
  args: {
    mediaFilter: "all",
    mediaFilterOptions: FILTERS,
    mediaLoading: false,
    mediaError: null,
    filteredMedia: Object.values(MEDIA_BY_TYPE).flat(),
    mediaByType: MEDIA_BY_TYPE,
    formatFileSize,
    mediaSearch: "",
    selectedMedia: null,
  },
  render: (args) => ({
    components: { MediaSection },
    setup: () => ({ args }),
    template: `
      <MediaSection
        v-bind="args"
        @update:mediaSearch="args.mediaSearch = $event"
        @update:selectedMedia="args.selectedMedia = $event"
        @select="args.selectedMedia = $event"
        @filter="args.mediaFilter = $event"
      />`,
  }),
};

export const Library = {};

export const Empty = {
  args: {
    mediaFilterOptions: [{ value: "all", label: "All" }],
    filteredMedia: [],
    mediaByType: EMPTY_BY_TYPE,
  },
};

export const Loading = { args: { mediaLoading: true } };

export const LoadError = {
  args: { mediaError: "The media bucket could not be listed." },
};

/** Detail modal open on the image asset. */
export const DetailOpen = { args: { selectedMedia: MEDIA_BY_TYPE.image[0] } };
