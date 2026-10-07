/*
 * Dashboard/ChapterEditor/ImageUpload — drop or choose an image, add alt text
 * (required) and a caption, and upload it to the chapter-media bucket
 * (OPENBRAIN-63). Used in the chapter page's image picker and in Media.
 */
import ImageUpload from "../ImageUpload.vue";

export default {
  title: "Dashboard/ChapterEditor/ImageUpload",
  component: ImageUpload,
  args: { slug: "attention-and-working-memory" },
  render: (args) => ({
    components: { ImageUpload },
    setup: () => ({ args }),
    template: `<div style="max-width: 36rem; padding: 24px"><ImageUpload v-bind="args" /></div>`,
  }),
};

/** For a chapter image: alt text and caption. */
export const ForAChapter = {};

/** In the media library: alt text only. */
export const ForTheLibrary = { args: { withCaption: false, slug: "library" } };
