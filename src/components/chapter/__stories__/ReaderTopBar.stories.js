/*
 * Chapter/ReaderShell/ReaderTopBar — the reader's top bar (OPENBRAIN-78;
 * Maura's sketch of 23 Nov): a slim dark bar. Left, the book's mark, which
 * opens the contents drawer (Foundations/Navigation/NavDrawer) and is a ✕
 * while it is open, then the chapter search behind its icon
 * (Chapter/ReaderShell/ReaderSearch). Right, TOOLS: pointing at it or
 * reaching it with the keyboard opens a row to its left, a tap toggles it
 * on touch. The row is Listen, then Info / Notebook / Chat for a signed-in
 * reader, then "?" (Chapter/ReaderShell/ReaderHelp). A draft chapter
 * carries a Draft badge after the mark. The account is in the drawer.
 *
 * In the reader (`hideOnCover`) the bar is not shown while the chapter's
 * cover is at the top; keyboard focus shows it there.
 */
import { useGeneral, useText } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import ReaderTopBar from "../ReaderTopBar.vue";
import { SEARCH_CHAPTER, typeQuery } from "./searchFixtures";

export default {
  title: "Chapter/ReaderShell/ReaderTopBar",
  component: ReaderTopBar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
  args: {
    isAuthenticated: true,
    isDraft: false,
    hideOnCover: false,
    menuOpen: false,
  },
  argTypes: {
    isAuthenticated: {
      control: "boolean",
      description: "Signed in: Info, Notebook and Chat join the Tools row.",
    },
    isDraft: {
      control: "boolean",
      description:
        "An unpublished chapter (only creators can open one): a Draft badge after the mark.",
    },
    hideOnCover: {
      control: "boolean",
      description:
        "The reader's setting: the full cover logo shrinks into the bar over 56px; focus in the bar shows it immediately.",
    },
    menuOpen: {
      control: "boolean",
      description:
        "Story-only: the drawer is open (useGeneral.activeMenu), so the mark is a ✕.",
    },
  },
  render: (args) => ({
    components: { ReaderTopBar },
    setup() {
      const store = useGeneral();
      store.$patch({ activeMenu: args.menuOpen });
      useText().$patch({ text: SEARCH_CHAPTER });
      useReaderSidebar().close();
      return { args };
    },
    template: `
      <div :style="{ minHeight: args.hideOnCover ? '180vh' : '36rem', background: args.hideOnCover ? '#202020' : 'rgb(var(--color-bg))' }">
        <ReaderTopBar
          :is-authenticated="args.isAuthenticated"
          :is-draft="args.isDraft"
          :hide-on-cover="args.hideOnCover"
        />
      </div>`,
  }),
};

const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));
/* A press on TOOLS pins the row open (a tap, on touch). */
const openTools = async ({ canvasElement }) => {
  canvasElement.querySelector('[data-testid="reader-tools-button"]')?.click();
  await settle();
};
/* The "?" at the row's end opens the help panel (OPENBRAIN-189). */
const openHelp = async (context) => {
  await openTools(context);
  context.canvasElement
    .querySelector('[data-testid="reader-help-button"]')
    ?.click();
  await settle();
};

/** At rest, signed in: the mark, the search icon, TOOLS. */
export const Desktop = {};

/** Tools open, signed in: Listen, Info, Notebook, Chat, "?"; TOOLS in the accent. */
export const ToolsOpen = { play: openTools };

/** Tools open, signed out: Listen and "?" only. */
export const ToolsOpenSignedOut = {
  args: { isAuthenticated: false },
  parameters: { auth: { authenticated: false } },
  play: openTools,
};

/** The drawer is open: the mark is a ✕ (the drawer itself is App's). */
export const MenuOpen = {
  args: { menuOpen: true },
};

/** A draft, as a creator sees it: the badge after the mark. */
export const Draft = {
  args: { isDraft: true },
};

/** On the chapter's cover: nothing, until the page scrolls or Tab reaches the bar. */
export const OnCover = {
  args: { hideOnCover: true },
};

/** On the cover with keyboard focus in the bar: shown. */
export const OnCoverFocused = {
  args: { hideOnCover: true },
  play: async ({ canvasElement }) => {
    canvasElement.querySelector(".reader-menu-btn")?.focus();
    await settle();
  },
};

/** A phone: the mark, the search icon and TOOLS fit at 375. */
export const Mobile = {
  globals: { viewport: { value: "phone" } },
};

/** A phone, Tools open: the row is a sheet under the bar. */
export const ToolsOpenMobile = {
  globals: { viewport: { value: "phone" } },
  play: openTools,
};

/** The draft badge at phone width: below 400px it is an amber dot. */
export const DraftMobile = {
  args: { isDraft: true },
  globals: { viewport: { value: "phone" } },
};

/** Search open: the field inline beside its icon, results under it. */
export const Search = { play: typeQuery("brain") };

/** Search on a phone: the field takes the whole bar. */
export const SearchMobile = {
  globals: { viewport: { value: "phone" } },
  play: typeQuery("descartes"),
};

/** Help, from the "?" in the row: how the book reads, and animations. */
export const HelpOpen = { play: openHelp };

/** The help panel on a phone: the bar's width less 8px each side. */
export const HelpOpenMobile = {
  globals: { viewport: { value: "phone" } },
  play: openHelp,
};
