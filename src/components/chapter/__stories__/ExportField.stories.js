/*
 * Chapter/ReaderShell/ExportField — the legacy Chapter 1 "import chapter
 * JSON" overlay. No props: it is shown while useGeneral().activeImportMenu is
 * true (chapterFrame sets it) and writes the chosen file into useText().
 */
import ExportField from "../ExportField.vue";
import { chapterFrame } from "./chapterFixtures";

export default {
  title: "Chapter/ReaderShell/ExportField",
  component: ExportField,
  parameters: { layout: "fullscreen" },
  render: chapterFrame(ExportField, {
    template: `<div style="min-height:520px;"><StoryComponent /></div>`,
  }),
};

export const Default = { name: "Import JSON overlay" };
