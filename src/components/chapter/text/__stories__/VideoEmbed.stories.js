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
