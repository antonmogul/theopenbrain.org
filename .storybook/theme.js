/*
 * The Open Brain theme for Storybook's own chrome (OPENBRAIN-115).
 *
 * The sidebar and toolbar take the book's dark surface (--color-dark-surface,
 * like the chapter opener), IBM Plex and square corners (--radius-control: 0);
 * the selection is the interaction accent (--color-accent, magenta). The docs
 * pages use the book's paper-warm background and ink. Values are the
 * brand.css tokens as hex, because Storybook's theming API takes plain
 * colours, not CSS variables; keep them in step with brand.css.
 */
import { create } from "storybook/theming/create";

const DARK_SURFACE = "#1C1C1C"; // --color-dark-surface
const ACCENT = "#E91E8C"; // --color-accent
const INK = "#0A0A0A"; // --color-ink
const MUTE = "#6B6B66"; // --color-mute
const LINE = "#E5E5E0"; // --color-line
const PAPER_WARM = "#F7F5F0"; // --color-bg
const WHITE = "#FFFFFF"; // --color-paper

const fontBase = '"IBM Plex Sans", system-ui, sans-serif';
const fontCode = '"IBM Plex Mono", ui-monospace, monospace';

const brand = {
  brandTitle: "The Open Brain · design system",
  brandUrl: "/",
  brandImage: "./logo-white.svg",
  brandTarget: "_self",
};

/** The manager: dark sidebar and toolbar, like the chapter opener. */
export const managerTheme = create({
  base: "dark",
  ...brand,
  colorPrimary: ACCENT,
  colorSecondary: ACCENT,
  appBg: DARK_SURFACE,
  // Panels (controls, actions) stay dark so their light text reads; only
  // the story canvas is the book's paper.
  appContentBg: "#161C1C",
  appPreviewBg: PAPER_WARM,
  appBorderColor: "#313838",
  appBorderRadius: 0,
  fontBase,
  fontCode,
  textColor: "#F3EFE6",
  textInverseColor: INK,
  textMutedColor: "#9A9890",
  barBg: DARK_SURFACE,
  barTextColor: "#9A9890",
  // Toolbar values in the light text colour; magenta only on hover and on
  // the selected sidebar item, so the toolbar isn't a row of accents.
  barSelectedColor: "#F3EFE6",
  barHoverColor: ACCENT,
  inputBg: "#161C1C",
  inputBorder: "#313838",
  inputTextColor: "#F3EFE6",
  inputBorderRadius: 0,
  buttonBg: "#161C1C",
  buttonBorder: "#313838",
  booleanBg: "#161C1C",
  booleanSelectedBg: ACCENT,
});

/** Docs pages: the book's paper and ink. */
export const docsTheme = create({
  base: "light",
  ...brand,
  brandImage: undefined,
  colorPrimary: ACCENT,
  colorSecondary: ACCENT,
  appBg: PAPER_WARM,
  appContentBg: WHITE,
  appPreviewBg: PAPER_WARM,
  appBorderColor: LINE,
  appBorderRadius: 0,
  fontBase,
  fontCode,
  textColor: INK,
  textInverseColor: WHITE,
  textMutedColor: MUTE,
  barBg: WHITE,
  barTextColor: MUTE,
  barSelectedColor: ACCENT,
  inputBorderRadius: 0,
});
