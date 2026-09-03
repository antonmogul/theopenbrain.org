/*
 * Chapter/ReaderShell/ReaderSidebar — the draggable "student tools" panel
 * with its Info / Notebook / Chat tabs. It teleports to <body> and opens from
 * the useReaderSidebar() singleton, so the story opens the requested tab in
 * setup. The tabs' data comes from chapterFrame's provideReaderData and the
 * API mock. The individual tabs have their own stories under ReaderShell.
 */
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import ReaderSidebar from "../ReaderSidebar.vue";
import { chapterFrame, trending } from "./chapterFixtures";

const TABS = ["info", "notebook", "chat"];

export default {
  title: "Chapter/ReaderShell/ReaderSidebar",
  component: ReaderSidebar,
  parameters: {
    layout: "fullscreen",
    auth: { role: "student" },
    api: { trending_highlights: trending, ai_conversations: [] },
  },
  args: { moduleId: "retina-module", isAuthenticated: true, tab: "info" },
  argTypes: {
    moduleId: { control: "text" },
    isAuthenticated: { control: "boolean" },
    tab: {
      control: "select",
      options: TABS,
      description: "Story-only: the tab useReaderSidebar() opens on mount.",
    },
  },
  render: chapterFrame(ReaderSidebar, {
    provideReaderData: true,
    setup(args) {
      useReaderSidebar().open(args.tab);
    },
    template: `<div style="min-height:680px;padding:24px;"><StoryComponent :module-id="args.moduleId" :is-authenticated="args.isAuthenticated" /></div>`,
  }),
};

/** Info tab. */
export const Default = {};

export const Notebook = { args: { tab: "notebook" } };

export const Chat = { args: { tab: "chat" } };

export const Mobile = {
  args: { tab: "notebook" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/** Signed out: the study-tool shortcuts that need a session are hidden. */
export const SignedOut = {
  args: { isAuthenticated: false },
  parameters: { auth: { authenticated: false } },
};
