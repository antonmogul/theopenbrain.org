/*
 * Chapter/ReaderShell/ReaderTopBar — the reader's app bar, as Stuart asked
 * for it on 11 Nov (OPENBRAIN-197): the menu button, an open eye that
 * closes while the drawer is open (chapter list + this chapter's outline);
 * the book's logo, a link home (/chapters when signed in; OPENBRAIN-145);
 * the chapter search, where the chapter number and the section menu were
 * (Chapter/ReaderShell/ReaderSearch); one "?" for help, the animations
 * setting and, signed in, Info / Notebook / Chat
 * (Chapter/ReaderShell/ReaderHelp); and the account menu. Reading progress
 * is the chapter timeline docked at the bottom
 * (Chapter/ReaderShell/ChapterTimeline, OPENBRAIN-128). A draft chapter
 * carries a Draft badge after the logo.
 *
 * Signed in and signed out differ only in what the "?" offers and in the
 * account menu, so the bar is the same width in both.
 */
import { useGeneral, useText } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import ReaderTopBar from "../ReaderTopBar.vue";
import { SEARCH_CHAPTER, typeQuery } from "./searchFixtures";

export default {
  title: "Chapter/ReaderShell/ReaderTopBar",
  component: ReaderTopBar,
  tags: ["autodocs"],
  // Signed in, so the account menu is the reader's initials as in the app;
  // the signed-out stories turn it off.
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
  args: {
    isAuthenticated: true,
    isDraft: false,
    menuOpen: false,
  },
  argTypes: {
    isAuthenticated: { control: "boolean" },
    isDraft: {
      control: "boolean",
      description:
        "An unpublished chapter (only creators can open one): a Draft badge after the logo.",
    },
    menuOpen: {
      control: "boolean",
      description:
        "Story-only: the drawer is open (useGeneral.activeMenu), so the eye is closed.",
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
      <div style="min-height:36rem; background:rgb(var(--color-bg));">
        <ReaderTopBar
          :is-authenticated="args.isAuthenticated"
          :is-draft="args.isDraft"
        />
      </div>`,
  }),
};

/** Signed in, on a desktop. */
export const Desktop = {};

/** Signed out: the same bar; the "?" opens help alone. */
export const SignedOut = {
  args: { isAuthenticated: false },
  parameters: { auth: { authenticated: false } },
};

/** The drawer is open: the eye is closed (the drawer itself is App's). */
export const MenuOpen = {
  args: { menuOpen: true },
};

/**
 * A draft, as a creator sees it: the badge sits in the bar's row, so it
 * clears TextComp's Edit chapter toggle and edit bar under the bar.
 */
export const Draft = {
  args: { isDraft: true },
};

/**
 * The draft badge at phone width: below 400px the badge is an amber dot
 * (the word stays for screen readers), so the account menu stays on the bar.
 */
export const DraftMobile = {
  args: { isDraft: true },
  globals: { viewport: { value: "phone" } },
};

/** A phone: the eye, the book, then search, help and account together. */
export const Mobile = {
  globals: { viewport: { value: "phone" } },
};

/** A phone, signed out. */
export const MobileSignedOut = {
  args: { isAuthenticated: false },
  parameters: { auth: { authenticated: false } },
  globals: { viewport: { value: "phone" } },
};

/** Searching: results under the field, the words marked. */
export const Search = { play: typeQuery("brain") };

/** Searching on a phone: the field takes the whole bar. */
export const SearchMobile = {
  globals: { viewport: { value: "phone" } },
  play: typeQuery("descartes"),
};

/* Open the help panel the "?" opens (OPENBRAIN-189). */
const openHelp = async ({ canvasElement }) => {
  canvasElement.querySelector('[data-testid="reader-help-button"]')?.click();
  await new Promise((r) => setTimeout(r, 300));
};

/**
 * The "?" at the bar's right end opens the reader's help: how the book
 * reads and the animations setting (OPENBRAIN-189). It moved here from the
 * chapter cover, where it scrolled away.
 */
export const HelpOpen = {
  args: { isAuthenticated: false },
  parameters: { auth: { authenticated: false } },
  play: openHelp,
};

/**
 * Signed in, the same panel opens with Info, Notebook and Chat: they were
 * three words in the bar until 11 Nov (OPENBRAIN-197).
 */
export const HelpOpenSignedIn = {
  play: openHelp,
};

/** The help panel on a phone: the bar's width less 8px each side. */
export const HelpOpenMobile = {
  args: { isAuthenticated: false },
  parameters: { auth: { authenticated: false } },
  globals: { viewport: { value: "phone" } },
  play: openHelp,
};

/** Signed in, on a phone. */
export const HelpOpenSignedInMobile = {
  globals: { viewport: { value: "phone" } },
  play: openHelp,
};
