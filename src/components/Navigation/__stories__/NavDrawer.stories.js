/*
 * Foundations/Navigation/NavDrawer — the contents drawer (OPENBRAIN-78;
 * Maura's sketch of 23 Nov). The book's mark in the reader's top bar opens
 * it: "See full table of contents" and a home icon, the numbered chapters
 * (the one being read opens to its sections in the reader), and the
 * account at the foot, or Sign in. Its ✕ sits over the mark.
 *
 * "See full table of contents" shows the chapter library
 * (Chapter/ChaptersLibrary) beside the drawer from 768px; below that it
 * goes to /chapters.
 *
 * In the reader the chapter being read is open to its sections, with a
 * chevron on its row that folds them away (OPENBRAIN-81): the two
 * "In a chapter" stories.
 *
 * No props: open state is useGeneral.activeMenu, the chapter list comes
 * from useChapterCatalog (mocked through `parameters.api`), and the foot
 * follows useAuth. `open` is a story-only control written into the store.
 */
import { onBeforeUnmount, onMounted, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useGeneral, useText } from "@/stores";
import NavDrawer from "../NavDrawer.vue";
import { apiFixtures, moduleFixture } from "@/stories/openBrainFixtures";

/*
 * A chapter open in the reader, which is what gives the drawer an outline:
 * the route names the chapter and useText holds its sections. Both are
 * shared with every other story (one router, one Pinia), so the story puts
 * them back when it leaves.
 */
const CHAPTER_TEXT = {
  slug: moduleFixture.slug,
  intro: [
    { id: "s-intro", title: moduleFixture.title, sectionTitle: "Introduction" },
  ],
  sections: [
    {
      id: "s-mind",
      title: "Where is my mind?",
      paragraphs: [
        {
          subSection: [
            {
              id: "s-hippocrates",
              title: "Hippocrates: the sacred disease and the four humours",
              paragraphs: [],
            },
          ],
        },
      ],
    },
    {
      id: "s-parts",
      title: "Do different parts of the brain do different things?",
      paragraphs: [
        {
          subSection: [
            {
              id: "s-descartes",
              title: "Separating mind from body: Descartes and dualism",
              paragraphs: [],
            },
            {
              id: "s-penfield",
              title: "Wilder Penfield and the Montreal Procedure",
              paragraphs: [],
            },
          ],
        },
      ],
    },
    {
      id: "s-unit",
      title: "What's the basic functional unit of the brain?",
      paragraphs: [],
    },
    { id: "s-talk", title: "How do neurons communicate?", paragraphs: [] },
    { id: "s-closing", title: "Closing words", paragraphs: [] },
  ],
};
const BOOK = [
  moduleFixture,
  { id: "module-retina", title: "The Retina", slug: "the-retina" },
  {
    id: "module-attention",
    title: "Attention and Working Memory",
    slug: "attention-and-working-memory",
  },
  { id: "module-stress", title: "Stress", slug: "stress" },
].map((m, i) => ({ status: "published", ...m, order_index: i + 1 }));

const inChapter = (args) => ({
  components: { NavDrawer },
  setup() {
    const store = useGeneral();
    const textStore = useText();
    const router = useRouter();
    const before = {
      text: textStore.text,
      reading: store.currentSubChapter,
      path: router.currentRoute.value.fullPath,
    };
    textStore.text = CHAPTER_TEXT;
    store.currentSubChapter =
      "do-different-parts-of-the-brain-do-different-things";
    // The route first: a route change closes the drawer.
    onMounted(async () => {
      await router.push(`/chapter/1/${moduleFixture.slug}`);
      store.activeMenu = args.open;
    });
    onBeforeUnmount(() => {
      store.activeMenu = false;
      textStore.text = before.text;
      store.currentSubChapter = before.reading;
      router.push(before.path);
    });
  },
  template: `<div style="min-height:720px; padding:6rem 2rem 2rem 24rem; background:rgb(var(--color-paper)); color:rgb(var(--color-ink));">The chapter behind the drawer.<NavDrawer /></div>`,
});
const waitFor = async (selector, ms = 3000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
};

export default {
  title: "Foundations/Navigation/NavDrawer",
  component: NavDrawer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    api: apiFixtures,
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "Story-only: useGeneral.activeMenu.",
    },
  },
  args: { open: true },
  render: (args) => ({
    components: { NavDrawer },
    setup() {
      const store = useGeneral();
      watchEffect(() => {
        store.activeMenu = args.open;
      });
    },
    template: `<div style="min-height:720px; padding:6rem 2rem 2rem 24rem; background:rgb(var(--color-paper)); color:rgb(var(--color-ink));">The page behind the drawer dims; it does not blur or move.<NavDrawer /></div>`,
  }),
};

/** Signed out: Sign in at the foot. */
export const Anonymous = {};

/** Signed in: the account at the foot, with dashboard, settings and log out. */
export const SignedIn = {
  parameters: {
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
};

/** "See full table of contents": the library beside the drawer. */
export const WithChapters = {
  parameters: {
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
  play: async () => {
    document.querySelector('[data-testid="drawer-contents-link"]')?.click();
    await new Promise((r) => setTimeout(r, 600));
  },
};

/** A phone: the drawer leaves a strip of the page to tap. */
export const Mobile = {
  globals: { viewport: { value: "phone" } },
};

export const Closed = { args: { open: false } };

/**
 * In a chapter: the chapter being read is open to its sections, the section
 * being read marked, and its row has a chevron that folds them away.
 */
export const InAChapter = {
  name: "In a chapter",
  globals: { chapter: "fund" },
  parameters: { api: { ...apiFixtures, "modules?": BOOK } },
  render: inChapter,
  play: async () => {
    await waitFor('[data-testid="drawer-outline-toggle"]');
  },
};

/**
 * The chevron pressed: the sections fold away and the book's chapters are
 * all in view. The drawer opens with them showing again next time.
 */
export const InAChapterFolded = {
  ...InAChapter,
  name: "In a chapter, sections folded",
  play: async () => {
    (await waitFor('[data-testid="drawer-outline-toggle"]'))?.click();
    await new Promise((r) => setTimeout(r, 100));
  },
};
