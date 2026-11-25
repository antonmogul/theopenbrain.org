/*
 * Chapter/Text/VideoEmbed — a YouTube video in the prose (OPENBRAIN-70 D2).
 * Nothing loads from YouTube until play is pressed, so the story makes no
 * outside requests.
 */
import VideoEmbed from "../VideoEmbed.vue";

export default {
  title: "Chapter/Text/VideoEmbed",
  component: VideoEmbed,
  args: {
    video: {
      youtubeId: "g4-6A8u8QBc",
      title: "A history of neuroscience in ten minutes",
    },
  },
  decorators: [
    () => ({
      template: '<div style="max-width:640px;padding:24px"><story/></div>',
    }),
  ],
};

export const Default = {};

/** No title: the card falls back to "Video". */
export const Untitled = { args: { video: { youtubeId: "g4-6A8u8QBc" } } };

/** Clean designer artwork filling the frame, with the reader's one play mark
 *  in the corner. */
export const CornerPoster = {
  args: {
    video: {
      youtubeId: "WgkAR-vrJpM",
      title: "Rita Levi-Montalcini",
      start: 2,
      poster:
        "/publicAssets/images/foundations/thumbs/rita-levi-montalcini.webp",
      posterPlay: "corner",
      // The poster fills the 16:9 frame, cropped from the top of her hair.
      focus: "50% 0%",
    },
  },
};
