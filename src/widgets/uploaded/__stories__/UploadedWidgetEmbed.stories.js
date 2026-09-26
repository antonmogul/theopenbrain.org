/*
 * Chapter/UploadedWidgetEmbed — an uploaded widget placed in a chapter
 * (widgetId "upload:<slug>", OPENBRAIN-105), loaded by slug from the mocked
 * API. An unknown slug says the interactive isn't available.
 */
/* eslint-disable import/no-unresolved -- Vite ?raw suffix is valid but not resolvable by ESLint */
import templateFile from "../../../../public/widget-kit/open-brain-widget/template.html?raw";
/* eslint-enable import/no-unresolved */
// Without its Google Fonts links: Storybook's smoke test allows no outside
// requests (the book allows fonts.googleapis.com; the story doesn't need it).
const template = templateFile.replace(/<link[^>]*fonts\.g[^>]*>/g, "");
import UploadedWidgetEmbed from "../UploadedWidgetEmbed.vue";

export default {
  title: "Chapter/UploadedWidgetEmbed",
  component: UploadedWidgetEmbed,
  tags: ["autodocs"],
  args: { slug: "on-centre-receptive-field" },
  parameters: {
    api: {
      "widget_uploads?": [
        {
          slug: "on-centre-receptive-field",
          title: "ON-centre receptive field",
          ramp: "perc",
          status: "published",
          html: template,
        },
      ],
    },
  },
  render: (args) => ({
    components: { UploadedWidgetEmbed },
    setup: () => ({ args }),
    template: `<div style="max-width:900px;padding:24px;"><UploadedWidgetEmbed v-bind="args" /></div>`,
  }),
};

export const Default = {};

export const Missing = { parameters: { api: { "widget_uploads?": [] } } };
