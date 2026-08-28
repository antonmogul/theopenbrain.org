/*
 * Storybook preview — makes stories render in the real design system.
 *
 * The app's styling is token-driven: brand.css defines CSS custom properties,
 * and components read them via data-* attributes on <html> (see the "Design
 * System" section of CLAUDE.md). Storybook boots its own document with none of
 * that, so without this file every component renders unstyled and the catalog
 * is worthless.
 *
 * Two things happen here:
 *   1. index.css is imported, which pulls in brand.css, fonts.css and Tailwind.
 *   2. A decorator stamps data-theme / data-accent / data-fontpair onto
 *      <html>, mirroring what applyTheme() does in usePreferences.js.
 *
 * Theme defaults to light because the app pins it there (FORCE_LIGHT_THEME in
 * usePreferences.js — dark mode is retired but its machinery is kept for
 * revival). The toolbar toggle is still wired so component work can check dark
 * before that decision is ever revisited; it is a Storybook-only override and
 * does not imply dark is live in the app.
 */
import { createRouter, createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { setup } from "@storybook/vue3-vite";
import { configureApiMock } from "./mocks/api-client";
import { configureFetchMock, installSupabaseFetchMock } from "./mocks/fetch";
import { configureSupabaseMock } from "./mocks/supabase";
import { configureAuthMock } from "./mocks/auth";

import "@/index.css";

// CommentComp still reads its legacy Pinia store at module evaluation time,
// before Storybook creates the Vue app. Activate the catalog Pinia here so
// importing the full reader view is safe as well as installing it below.
/*
 * Many components call useRouter() or render <router-link> (the chapter
 * callouts, nav, anything with a CTA). Storybook has no router, so those
 * components throw on mount. Installing a memory-history router app-wide is
 * the one-time fix — otherwise every such story needs its own stub, which is
 * the per-component special-casing that made /styleguide hard to extend.
 *
 * Memory history keeps navigation in memory, so a story clicking a link cannot
 * navigate the Storybook shell away from itself. The catch-all route means any
 * `to` resolves rather than warning about an unmatched path.
 */
const storybookPinia = createPinia();
setActivePinia(storybookPinia);

setup((app) => {
  app.use(storybookPinia);
  app.use(
    createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/chapter/break/:video?",
          name: "chapter-break",
          component: { template: "<div />" },
        },
        {
          path: "/chapter/:number(\\d+)/:slug",
          name: "chapter",
          component: { template: "<div />" },
        },
        {
          path: "/chapter/:number",
          name: "chapter-overview",
          component: { template: "<div />" },
        },
        {
          path: "/quiz/:quizId",
          name: "quiz",
          component: { template: "<div />" },
        },
        {
          path: "/flashcards/:moduleId",
          name: "flashcards",
          component: { template: "<div />" },
        },
        {
          path: "/lab/:labId",
          name: "lab",
          component: { template: "<div />" },
        },
        {
          path: "/enroll/:courseId",
          name: "enroll",
          component: { template: "<div />" },
        },
        {
          path: "/:pathMatch(.*)*",
          name: "catch-all",
          component: { template: "<div />" },
        },
      ],
    })
  );
});

// Components that still call fetch directly get the same protection as those
// using the API/Supabase aliases. Only Supabase-shaped URLs are intercepted;
// fonts and Storybook's own assets continue through the browser normally.
installSupabaseFetchMock();

/** Mirrors the accent options in usePreferences.js. */
const ACCENTS = ["magenta", "teal", "amber", "mono"];

export const globalTypes = {
  theme: {
    description: "Colour theme (app pins light; dark is for inspection only)",
    defaultValue: "light",
    toolbar: {
      title: "Theme",
      icon: "circlehollow",
      items: [
        { value: "light", title: "Light (app default)" },
        { value: "dark", title: "Dark (retired)" },
      ],
      dynamicTitle: true,
    },
  },
  accent: {
    description: "Accent ramp",
    defaultValue: "magenta",
    toolbar: {
      title: "Accent",
      icon: "paintbrush",
      items: ACCENTS.map((a) => ({ value: a, title: a })),
      dynamicTitle: true,
    },
  },
  reduceMotion: {
    description: "Disable motion for deterministic review and screenshots",
    defaultValue: true,
    toolbar: {
      title: "Motion",
      icon: "accessibility",
      items: [
        { value: true, title: "Reduced (Storybook default)" },
        { value: false, title: "App motion" },
      ],
      dynamicTitle: true,
    },
  },
};

/**
 * Apply the prefs as data-* attributes, exactly as the app does. Components
 * style off these attributes rather than off any JS value, so setting them
 * here is sufficient to theme every story.
 */
const withDesignTokens = (story, context) => {
  const { theme, accent, reduceMotion } = context.globals;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme || "light");
  root.setAttribute("data-accent", accent || "magenta");
  // The app pins the legacy IBM Plex pairing; match it so type in Storybook
  // matches type in the app.
  root.setAttribute("data-fontpair", "ibm-plex-legacy");
  root.setAttribute("data-reduce-motion", reduceMotion === false ? "0" : "1");
  // Paint the Storybook canvas with the token background, otherwise stories
  // sit on Storybook's own white and dark-mode inspection is meaningless.
  document.body.style.background = "rgb(var(--color-bg))";
  document.body.style.color = "rgb(var(--color-ink))";
  return story();
};

/** Reset data fixtures for every story so navigation cannot leak state. */
const withDeterministicData = (story, context) => {
  configureApiMock(context.parameters.api ?? {});
  configureFetchMock({
    ...(context.parameters.api ?? {}),
    ...(context.parameters.fetch ?? {}),
  });
  configureSupabaseMock(context.parameters.supabase ?? {});
  const auth = context.parameters.auth;
  configureAuthMock(
    auth
      ? {
          ...auth,
          authenticated: auth.authenticated !== false,
          userId: auth.userId || auth.id,
        }
      : {}
  );
  return story();
};

/*
 * Sidebar order. Storybook sorts alphabetically by default, which would put
 * Admin first and bury Foundations — so the five top-level groups are pinned
 * in reading order: the shared vocabulary first, then the three audiences
 * (student, chapter, widgets), then the back-of-house dashboards.
 * See .storybook/taxonomy.md for what belongs in each.
 *
 * Written as a literal array, not a spread: Storybook statically parses this
 * file to extract story-sort config and cannot evaluate a SpreadElement — it
 * fails the build with "Unknown node type SpreadElement".
 */
/** @type {import('@storybook/vue3-vite').Preview} */
const preview = {
  decorators: [withDeterministicData, withDesignTokens],
  initialGlobals: {
    theme: "light",
    accent: "magenta",
    reduceMotion: true,
  },
  parameters: {
    options: {
      storySort: {
        order: ["Foundations", "Student", "Chapter", "Widgets", "Admin", "*"],
        method: "alphabetical",
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // The token background is applied by the decorator; Storybook's own
    // backgrounds addon would fight it.
    backgrounds: { disable: true },
  },
};

export default preview;
