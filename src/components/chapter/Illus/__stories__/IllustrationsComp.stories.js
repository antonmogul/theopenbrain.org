/*
 * Chapter/Illustrations/IllustrationsComp — the figure-pane orchestrator. It
 * has no props: it fetches the animation list (mocked empty here, so it falls
 * back to animations.json), watches the prose's scroll triggers and mounts
 * the matching renderer. With nothing scrolled, the pane is an empty canvas.
 */
import IllustrationsComp from "../IllustrationsComp.vue";
import { illustrationFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Illustrations/IllustrationsComp",
  component: IllustrationsComp,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  render: illustrationFrame(IllustrationsComp, {
    template: `<div id="bgGradient" style="position:relative;min-height:900px;overflow:hidden;background:rgb(var(--color-bg));"><div id="container"><StoryComponent /></div></div>`,
  }),
};

/** No trigger has fired yet. */
export const Default = { name: "Empty canvas" };
