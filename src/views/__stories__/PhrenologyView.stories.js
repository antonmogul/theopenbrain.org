/*
 * Views/Widgets/PhrenologyView — the 2D SVG phrenology head at /phrenology
 * (History chapter). No props; hotspot data from src/mocks/phrenology.js.
 */
import WidgetBreakout from "@/components/chapter/text/WidgetBreakout.vue";
import { chapterFrame } from "@/components/chapter/__stories__/chapterFixtures";
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import PhrenologyView from "../PhrenologyView.vue";

export default {
  title: "Views/Widgets/PhrenologyView",
  component: PhrenologyView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { PhrenologyView, ViewStoryShell },
    template: `<ViewStoryShell label="PhrenologyView" path="/phrenology"><PhrenologyView /></ViewStoryShell>`,
  }),
};

export const Default = {};

// Below 760px the source text is a bottom sheet over the skull
// (OPENBRAIN-160): tap a region to raise it to half, drag the handle to
// full, drag it under half (or press Escape) to dismiss.
export const Phone = {
  globals: { viewport: { value: "phone" } },
};

// Real chapter host with a responsive prose wrapper. The shared desktop-reader
// story intentionally pins its prose column; it cannot prove mobile line width.
export const EmbeddedResponsive = {
  globals: { chapter: "fund" },
  render: (args) =>
    chapterFrame(WidgetBreakout, {
      template: `
        <div style="padding:40px 24px;background:rgb(var(--color-bg));">
          <div style="max-width:640px;margin:0 auto;">
            <StoryComponent v-bind="args" />
          </div>
        </div>`,
    })(args),
  args: {
    placement: {
      placementId: "foundations-phrenology",
      widgetId: "phrenology",
      kind: "inline",
      title: "Explore phrenology",
      blurb:
        "Click on different parts of the skull to explore Gall and Spurzheim's model of localization of brain function.",
      route: "/phrenology",
    },
  },
};
