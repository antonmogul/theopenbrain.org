/*
 * Chapter/Figure widgets/FigureBar — the toolbar row of a figure widget that
 * draws its own (History's trepanation and papyrus): label, title, and the
 * legend folded behind its "Legend" control, as the image shell has it
 * (OPENBRAIN-195). Rest the pointer on the heading or focus the control for
 * a look; click to keep the legend under the title.
 */
import { ref } from "vue";
import FigureBar from "../shared/FigureBar.vue";
import { FIGURE_WIDGET_FIT } from "../shared/figureFit.js";

const LEGEND =
  "Different trepanation methods, including scraping (1), grooving (2), drilling a perimeter around the hole (3) and cutting a rectangular opening (4) (Lisowski, 1967).";

/* A widget's box: the dark plate, some artwork to float over, the row. */
const stage = (fit, width = "100%") => ({
  components: { FigureBar },
  provide: { [FIGURE_WIDGET_FIT]: ref(fit) },
  template: `
    <div data-chapter="fund" class="figure-widget" style="width: ${width}; height: ${fit ? "auto" : "420px"}; container: figure / inline-size; display: flex; flex-direction: column; background: rgb(28 28 28); color: #fff;">
      <div style="flex: 1 1 auto; min-height: 220px; display: grid; place-items: center; font: 12px var(--font-mono); opacity: 0.5;">artwork</div>
      <story />
    </div>`,
});

export default {
  title: "Chapter/Figure widgets/FigureBar",
  component: FigureBar,
  args: { label: "Fig 02", title: "Methods of trepanation", legend: LEGEND },
};

/** In the pane: folded; a look floats over the artwork, a click keeps it. */
export const InThePane = { decorators: [() => stage(false)] };

/** With a control leading the row (the papyrus's expand button). */
export const WithLead = {
  decorators: [() => stage(false)],
  render: (args) => ({
    components: { FigureBar },
    setup: () => ({ args }),
    template: `<FigureBar v-bind="args"><template #lead><button type="button" aria-label="Expand to full screen" style="width: 28px; height: 28px; margin: -7px; border: 0; background: transparent; color: rgb(var(--color-chapter-soft)); cursor: pointer;">⛶</button></template></FigureBar>`,
  }),
};

/** Inline on a phone: a tap opens the legend under the title. */
export const InlineOnAPhone = { decorators: [() => stage(true, "360px")] };

/** Nothing to fold: no control. */
export const NoLegend = {
  decorators: [() => stage(false)],
  args: { legend: "" },
};
