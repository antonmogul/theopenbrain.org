/*
 * Views/Student/BreakView — the break-video interstitial at
 * /chapter/break/:video.
 *
 * No props: the video key comes from the route and is looked up in the
 * legacy breakVideos.json (`dowling-and-werblin`, `placeholder`). The old
 * catalog mounted it at /chapter/break/introduction, which matches no key and
 * only ever showed ViewStoryShell's error boundary; these use the real keys.
 * The <video> source is a same-origin publicAssets path, so no request leaves
 * localhost.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import BreakView from "../BreakView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

const mount = (path) => ({
  components: { BreakView, ViewStoryShell },
  data: () => ({ path }),
  template: `<ViewStoryShell label="BreakView" :path="path"><BreakView /></ViewStoryShell>`,
});

export default {
  title: "Views/Student/BreakView",
  component: BreakView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
};

/** John Dowling on retinal cell types. */
export const Default = {
  render: () => mount("/chapter/break/dowling-and-werblin"),
};

/** The placeholder entry used while a break has no video yet. */
export const Placeholder = {
  render: () => mount("/chapter/break/placeholder"),
};
