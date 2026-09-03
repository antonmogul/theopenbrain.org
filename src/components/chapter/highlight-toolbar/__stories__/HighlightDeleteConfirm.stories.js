/*
 * Chapter/Highlighting/HighlightDeleteConfirm — the "Delete this highlight?"
 * panel. No props: it only emits `cancel` and `confirm`; the parent owns the
 * delete and the panel's visibility.
 */
import HighlightDeleteConfirm from "../HighlightDeleteConfirm.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Highlighting/HighlightDeleteConfirm",
  component: HighlightDeleteConfirm,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  render: chapterFrame(HighlightDeleteConfirm),
};

export const Default = {};
