/*
 * Chapter/Text/DownloadSection — the Chapter 1 "download the materials" strip
 * with its hover-swapping file icons. No props: the file list is hard-coded
 * inside the component, so there is nothing to control beyond the frame.
 */
import DownloadSection from "../DownloadSection.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/DownloadSection",
  component: DownloadSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  render: proseFrame(DownloadSection),
};

export const Default = {};
