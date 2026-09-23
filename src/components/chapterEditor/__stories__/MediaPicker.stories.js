/*
 * Dashboard/ChapterEditor/MediaPicker — pick an image to insert, or a
 * paragraph's figure, from the media library (OPENBRAIN-61).
 */
import MediaPicker from "../MediaPicker.vue";

const media = [
  {
    id: "img-1",
    title: "Starburst amacrine cell",
    media_type: "image",
    image_file_url: "GABAergic",
  },
  {
    id: "anim-1",
    title: "Lateral organization",
    media_type: "lottie",
    animation_key: "animationLatteralOrganization",
  },
  { id: "vid-1", title: "Glaucoma", media_type: "video" },
];

export default {
  title: "Dashboard/ChapterEditor/MediaPicker",
  component: MediaPicker,
  args: { open: true, media },
};

export const Images = { args: { types: ["image"], title: "Add an image" } };

/** Choosing a figure, with the current one marked and removable. */
export const Figure = {
  args: {
    types: ["lottie", "video", "youtube"],
    title: "Choose this paragraph's figure",
    currentId: "anim-1",
  },
};
