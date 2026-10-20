/*
 * Chapter/Illustrations/IllustrationWidget — an interactive widget as a
 * paragraph's figure in the left panel (OPENBRAIN-70 B5).
 */
import IllustrationWidget from "../IllustrationWidget.vue";
import { loadWidgetHtml } from "@/widgets/uploads/index.js";

// Storybook's smoke test allows no outside requests: the widget runs
// without its Google Fonts links (the book allows them).
const offline = (html) => html.replace(/<link[^>]*fonts\.g[^>]*>/g, "");

export default {
  title: "Chapter/Illustrations/IllustrationWidget",
  component: IllustrationWidget,
  parameters: { layout: "fullscreen" },
  decorators: [
    () => ({
      template: '<div style="height:720px;width:760px"><story/></div>',
    }),
  ],
  args: {
    animation: {
      id: "widget-phrenology",
      title: "Phrenology — the skull that mapped the mind",
      widgetId: "phrenology",
    },
  },
};

/** History's phrenology skull in the figure panel. */
export const Phrenology = {};

/** A widget with no reader view yet says so instead of rendering nothing. */
export const Unavailable = {
  args: {
    animation: { id: "widget-x", title: "Not ported yet", widgetId: "nope" },
  },
};

/**
 * An uploaded widget as the pane figure: Loewi's animation beside the text
 * (OPENBRAIN-140, `20261013010000_history_loewi_beside_text.sql`), at a
 * 1440×900 screen. The pane is 900 − 64 (top bar) − 20 (timeline) = 816px
 * tall; the frame is told that height, so the drawing shrinks and the
 * caption, transport and step buttons stay in view (OPENBRAIN-148).
 */
export const LoewiInPane = {
  name: "Loewi in the pane (900 tall)",
  args: {
    animation: {
      id: "animationFoundationsLoewiWidget",
      title: "Loewi's Vagusstoff, 1921",
      widgetId: "upload:loewi-vagusstoff",
    },
  },
  parameters: {
    viewport: { defaultViewport: "wide" },
    api: {
      "widget_uploads?": async () => [
        {
          slug: "loewi-vagusstoff",
          title: "Loewi's Vagusstoff, 1921",
          ramp: "fund",
          status: "published",
          html: offline((await loadWidgetHtml("loewi-vagusstoff")) || ""),
        },
      ],
    },
  },
  decorators: [
    () => ({
      template:
        '<div data-chapter="fund" style="height:816px;width:640px;border-right:1px solid rgb(var(--color-line))"><story/></div>',
    }),
  ],
};
