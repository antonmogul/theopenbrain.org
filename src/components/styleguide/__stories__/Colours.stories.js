/*
 * Foundations/Colours — the token palette, read live from CSS custom
 * properties rather than hardcoded hex values.
 *
 * Reading getComputedStyle means these swatches cannot drift from brand.css:
 * change a token and the story follows. It also makes the accent and theme
 * toolbar switchers meaningful — flip either and the swatches re-resolve.
 */

/** Renders a labelled row of swatches for a set of token names. */
const swatchRow = (tokens) => ({
  props: { tokens: { type: Array, default: () => tokens } },
  template: `
    <div style="display:flex; flex-wrap:wrap; gap:16px;">
      <figure v-for="t in tokens" :key="t.name" style="margin:0; width:150px;">
        <div :style="{
          background: 'rgb(var(' + t.name + '))',
          height: '72px',
          borderRadius: '8px',
          border: '1px solid rgb(var(--color-line))',
        }" />
        <figcaption style="margin-top:8px; font-family:var(--font-mono); font-size:11px; line-height:1.5;">
          <div style="color:rgb(var(--color-ink));">{{ t.label }}</div>
          <div style="color:rgb(var(--color-mute));">{{ t.name }}</div>
          <div style="color:rgb(var(--color-mute));">{{ resolve(t.name) }}</div>
        </figcaption>
      </figure>
    </div>`,
  methods: {
    // Resolve the token to its actual rgb triplet at render time.
    resolve(name) {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      return v ? `rgb(${v})` : "—";
    },
  },
});

export default {
  title: "Foundations/Colours",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Colour tokens from `src/styles/brand.css`. Swatches read the live CSS " +
          "custom properties, so they follow the theme and accent switchers in the toolbar.",
      },
    },
  },
};

/** Surfaces and text — the neutral spine of the design system. */
export const Surfaces = {
  render: () =>
    swatchRow([
      { name: "--color-bg", label: "Background" },
      { name: "--color-paper", label: "Paper" },
      { name: "--color-ink", label: "Ink" },
      { name: "--color-mute", label: "Mute" },
      { name: "--color-line", label: "Line" },
    ]),
};

/**
 * Semantic colours. `--color-accent` is the one the accent switcher rewrites —
 * flip it in the toolbar and this swatch changes while the others hold.
 */
export const Semantic = {
  render: () =>
    swatchRow([
      { name: "--color-accent", label: "Accent" },
      { name: "--color-complete", label: "Complete" },
      { name: "--color-warn", label: "Warn" },
    ]),
};

/** Highlight pens available to readers when marking up chapter text. */
export const Highlighters = {
  render: () =>
    swatchRow([
      { name: "--color-mark1", label: "Mark 1 — yellow" },
      { name: "--color-mark2", label: "Mark 2 — pink" },
      { name: "--color-mark3", label: "Mark 3 — blue" },
      { name: "--color-mark4", label: "Mark 4 — green" },
    ]),
};

/**
 * The per-chapter ramp. `data-chapter` on a wrapper swaps these, which is how
 * each chapter gets its own identity colour without touching component CSS.
 */
export const ChapterRamp = {
  render: () =>
    swatchRow([
      { name: "--color-chapter", label: "Chapter" },
      { name: "--color-chapter-deep", label: "Chapter deep" },
      { name: "--color-chapter-soft", label: "Chapter soft" },
      { name: "--color-chapter-pale", label: "Chapter pale" },
    ]),
};
