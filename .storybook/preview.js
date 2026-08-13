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
import "@/index.css";

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
};

/**
 * Apply the prefs as data-* attributes, exactly as the app does. Components
 * style off these attributes rather than off any JS value, so setting them
 * here is sufficient to theme every story.
 */
const withDesignTokens = (story, context) => {
  const { theme, accent } = context.globals;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-accent", accent);
  // The app pins the legacy IBM Plex pairing; match it so type in Storybook
  // matches type in the app.
  root.setAttribute("data-fontpair", "ibm-plex-legacy");
  // Paint the Storybook canvas with the token background, otherwise stories
  // sit on Storybook's own white and dark-mode inspection is meaningless.
  document.body.style.background = "rgb(var(--color-bg))";
  document.body.style.color = "rgb(var(--color-ink))";
  return story();
};

/** @type {import('@storybook/vue3-vite').Preview} */
const preview = {
  decorators: [withDesignTokens],
  parameters: {
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
