/*
 * Chapter/Opener/CutawayCover — the History hero's skull cutaway
 * (OPENBRAIN-156): a hand reaches in from the top right and the crown of
 * the girl's head hinges open to show the brain along the cut. `Live`
 * follows the pointer across the canvas and eases shut when it leaves; the
 * pinned stories hold the reveal at a position so the registration can be
 * judged without moving anything — the face, collar and writing hand must
 * not move between Resting and Revealed. `Missing` points at a file that
 * isn't there and so renders nothing (the opener keeps its still).
 */
import { ref } from "vue";
import CutawayCover from "../CutawayCover.vue";
import { reactiveCoverForModule } from "@/helper/chapterCover";

const HISTORY = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });

export default {
  title: "Chapter/Opener/CutawayCover",
  component: CutawayCover,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    reveal: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
  args: { spec: HISTORY, reveal: null },
  render: (args) => ({
    components: { CutawayCover },
    setup() {
      const state = ref("loading");
      return { args, state, poster: HISTORY.poster };
    },
    template: `
      <div :style="'position:relative;height:100vh;background:#1c1c1c url(' + poster + ') center 20%/cover no-repeat'" :data-reactive-cover="state">
        <CutawayCover v-bind="args" @state="state = $event" />
        <p style="position:absolute;left:1rem;bottom:1rem;margin:0;color:#444;font:12px/1 monospace">{{ state }}</p>
      </div>`,
  }),
};

export const Live = {};

export const Resting = { args: { reveal: 0 } };
export const Quarter = { name: "Reveal 0.25", args: { reveal: 0.25 } };
export const Half = { name: "Reveal 0.5", args: { reveal: 0.5 } };
export const ThreeQuarters = { name: "Reveal 0.75", args: { reveal: 0.75 } };
export const Revealed = { args: { reveal: 1 } };

export const Missing = {
  args: {
    spec: {
      ...HISTORY,
      hand: "/publicAssets/images/covers/foundations-hero/nope.png",
    },
  },
};
