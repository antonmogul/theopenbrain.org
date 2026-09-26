/*
 * Dashboard/Widgets/WidgetFrame — an uploaded widget running in the book's
 * sandbox (OPENBRAIN-105), here the kit's template. The frame takes the
 * chapter's colour and grows to the widget's height; ScaledFrame shows it
 * at a device width, shrunk to fit, as the Studio does.
 */
/* eslint-disable import/no-unresolved -- Vite ?raw suffix is valid but not resolvable by ESLint */
import templateFile from "../../../../public/widget-kit/open-brain-widget/template.html?raw";
/* eslint-enable import/no-unresolved */
// Without its Google Fonts links: Storybook's smoke test allows no outside
// requests (the book allows fonts.googleapis.com; the story doesn't need it).
const template = templateFile.replace(/<link[^>]*fonts\.g[^>]*>/g, "");
import WidgetFrame from "../WidgetFrame.vue";
import ScaledFrame from "../ScaledFrame.vue";

export default {
  title: "Dashboard/Widgets/WidgetFrame",
  component: WidgetFrame,
  tags: ["autodocs"],
  argTypes: {
    ramp: {
      control: "inline-radio",
      options: ["fund", "perc", "move", "lear", "deve"],
    },
  },
  args: { html: template, ramp: "perc", title: "ON-centre receptive field" },
  render: (args) => ({
    components: { WidgetFrame },
    setup: () => ({ args }),
    template: `<div style="max-width:960px;padding:24px;"><WidgetFrame v-bind="args" /></div>`,
  }),
};

export const Default = {};

/** The same file in the History chapter's colour. */
export const Fundamentals = { args: { ramp: "fund" } };

/** At a phone's width, shrunk into a narrow column (the Studio's preview). */
export const AtPhoneWidth = {
  render: (args) => ({
    components: { ScaledFrame },
    setup: () => ({ args }),
    template: `<div style="width:260px;padding:24px;"><ScaledFrame :html="args.html" :ramp="args.ramp" :width="390" label="Phone" /></div>`,
  }),
};
