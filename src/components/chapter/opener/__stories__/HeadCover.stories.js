/*
 * Chapter/Opener/HeadCover — the History opener (OPENBRAIN-171): a girl
 * writes in a loop; over the upper right the pointer becomes a hand with a
 * tool, and rubbing it back and forth over her head (four strokes) slides
 * the top off and lets the brain rise. Moving off the head closes it.
 * `Live` is the cover as the chapter has it. With the Motion toolbar set to
 * reduced, only the still shows. `Missing` points at a still that isn't
 * there and so renders nothing (the opener keeps its chapter cover).
 */
import { ref } from "vue";
import HeadCover from "../HeadCover.vue";
import { reactiveCoverForModule } from "@/helper/chapterCover";

const HISTORY = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });

export default {
  title: "Chapter/Opener/HeadCover",
  component: HeadCover,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { spec: HISTORY },
  render: (args) => ({
    components: { HeadCover },
    setup() {
      const state = ref("loading");
      return { args, state };
    },
    template: `
      <div style="position:relative;height:100vh;background:#1c1c1c" :data-reactive-cover="state">
        <HeadCover v-bind="args" @state="state = $event" />
        <p style="position:absolute;left:1rem;bottom:1rem;margin:0;color:#888;font:12px/1 monospace">{{ state }}</p>
      </div>`,
  }),
};

export const Live = {};

export const Missing = {
  args: {
    spec: {
      ...HISTORY,
      poster: "/publicAssets/images/covers/foundations-hero/head/nope.webp",
    },
  },
};
