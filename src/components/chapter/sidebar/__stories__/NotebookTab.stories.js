/*
 * Chapter/ReaderShell/NotebookTab — the sidebar's highlights / notes /
 * trending views with colour filters. Highlights and notes are injected by
 * ChapterView (chapterFrame's provideReaderData); trending passages come from
 * the (mocked) API client.
 */
import NotebookTab from "../NotebookTab.vue";
import { sidebarFrame, trending } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/ReaderShell/NotebookTab",
  component: NotebookTab,
  tags: ["autodocs"],
  parameters: { layout: "padded", api: { trending_highlights: trending } },
  args: { moduleId: "retina-module" },
  argTypes: {
    moduleId: {
      control: "text",
      description: "Scopes the notebook to a module.",
    },
  },
  render: sidebarFrame(NotebookTab, { provideReaderData: true }),
};

/** Highlights, notes, and trending passages present. */
export const Default = {};

/** A fresh reader: no highlights, no notes, no trending passages. */
export const Empty = {
  render: sidebarFrame(NotebookTab, {
    provideReaderData: true,
    highlights: [],
    notes: [],
  }),
  parameters: { api: { trending_highlights: [] } },
};
