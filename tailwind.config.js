/** @type {import('tailwindcss').Config} */
// Phase 2 of the `font-size: 62.5%` removal (docs/font-refactor/PLAN.md §Phase 2).
// Tailwind's DEFAULT utility scale (spacing/fontSize/lineHeight/borderRadius/
// maxWidth/columns) is defined in rem in Tailwind core — out of the Phase-1
// codemod's `src/` scope. Removing the 62.5% hack (10px→16px base) would make
// every default utility render 1.6× larger. `rebasedScales` divides each of
// those default rem literals by 1.6, so utilities emit the SAME PIXELS at the
// new 16px base as they did at the old 10px base. These are HARD OVERRIDES
// (under `theme`, not `theme.extend`) so they replace the defaults rather than
// merge with them. Regenerate/verify: `node scripts/tailwind-rebase.cjs --audit`.
const { buildRebasedScales } = require("./scripts/tailwind-rebase.cjs");
const rebasedScales = buildRebasedScales();

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,vue}"],
  theme: {
    // Hard overrides — rebased Tailwind default scales (÷1.6). See note above.
    spacing: rebasedScales.spacing,
    fontSize: rebasedScales.fontSize,
    lineHeight: rebasedScales.lineHeight,
    borderRadius: rebasedScales.borderRadius,
    maxWidth: rebasedScales.maxWidth,
    columns: rebasedScales.columns,
    fontFamily: {
      // font-sans / font-serif / font-mono respond to active [data-fontpair]
      // because the CSS variables are themselves bound per pair in brand.css.
      sans: ["var(--font-ui)", "system-ui", "sans-serif"],
      serif: ["var(--font-body)", "Georgia", "serif"],
      mono: ["var(--font-mono)", "ui-monospace", "monospace"],
    },
    screens: {
      xs: "480px",
      // => @media (min-width: 480px) { ... }

      sm: "640px",
      // => @media (min-width: 640px) { ... }

      md: "768px",
      // => @media (min-width: 768px) { ... }

      lg: "1024px",
      // => @media (min-width: 1024px) { ... }

      xl: "1300px",
      // => @media (min-width: 1300px) { ... }

      "2xl": "1500px",
      // => @media (min-width: 1500px) { ... }
    },
    extend: {
      blur: {
        xs: "1px",
      },
      fontSize: {
        // smaller: [
        //   "0.6875rem",
        //   { lineHeight: "0.875rem", letterSpacing: "-0.00625rem" },
        // ],
        // small: ["0.84375rem", { lineHeight: "1.1875rem", letterSpacing: "0.0125rem" }],
        // medium: ["1rem", { lineHeight: "1.65625rem" }],
        // baseMono: ["1.125rem", "1.75rem"],
        // base: ["1.25rem", "1.9375rem"],
        // h3: ["1.875rem", "2.375rem"],
        // h2: ["3rem", "3.625rem"],
        // blindness: ["6.875rem", "6.875rem"],
        // biggest: ["5rem", "7.5rem"],
        // big: ["5rem", "5rem"],
      },
      height: {
        header: "1.375rem",
        body: "calc(100vh - 1.375rem)",
      },
      width: {
        // Reader split (Track 3 D1): figure pane is the protagonist at ~1.5:1
        // on wide screens. Both widths derive from --reader-prose-w (brand.css,
        // = 40vw prose) so the figure pane fills the remaining ~60vw and the two
        // can never drift. Fallback keeps the old 50vw if the var is absent.
        /* Fallbacks mirror --reader-prose-w exactly (40vw). They used to say
           50vw, so if the var failed to resolve the split silently shifted by
           10vw and the two panes overlapped. See OPENBRAIN-4. */
        text: "var(--reader-prose-w, min(40vw, calc(780px + 6.875rem)))",
        illus:
          "calc(100% - var(--reader-prose-w, min(40vw, calc(780px + 6.875rem))))",
        menu: "35vw",
        "1/8": " calc(100% / 8 * 1)",
        "2/8": " calc(100% / 8 * 2)",
        "3/8": " calc(100% / 8 * 3)",
        "4/8": " calc(100% / 8 * 4)",
        "5/8": " calc(100% / 8 * 5)",
        "6/8": " calc(100% / 8 * 6)",
        "7/8": " calc(100% / 8 * 7)",
      },
      spacing: {
        text: "max(50vw, calc(100vw - 780px - 6.875rem))",
      },
      maxWidth: {
        /* Prose-block maxima, clamped to the containing column.
           These replace hardcoded max-w-[800px] / [780px] / [850px] in the
           chapter text components. Those pixel caps never bound — the prose
           column is --reader-prose-w (40vw) minus 110px padding, i.e. 466px at
           1440px — so blocks overflowed their column rather than wrapping, and
           captions/paragraphs/footnotes disagreed with each other. The min()
           means a preference can only ever narrow the block. See OPENBRAIN-4. */
        measure: "min(var(--reading-measure, 780px), 100%)",
        "measure-wide": "min(calc(var(--reading-measure, 780px) + 70px), 100%)",
        "measure-narrow": "min(400px, 100%)",
      },
      margin: {
        body: "1.375rem",
      },
      colors: {
        // Token-backed semantic names — Track 1 design system
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        mute: "rgb(var(--color-mute) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        complete: "rgb(var(--color-complete) / <alpha-value>)",
        warn: "rgb(var(--color-warn) / <alpha-value>)",

        // Legacy aliases — keep existing classes working through the migration
        lightest: "rgb(var(--color-bg) / <alpha-value>)",
        lighter: "rgb(var(--color-line) / <alpha-value>)",
        light: "rgb(var(--color-mute) / <alpha-value>)",
        med: "rgb(var(--color-mute) / <alpha-value>)",
        dark: "rgb(var(--color-ink) / <alpha-value>)",
        darker: "rgb(var(--color-ink) / <alpha-value>)",
        lightDark: "rgb(var(--color-mute) / <alpha-value>)",
        magenta: "rgb(var(--color-accent) / <alpha-value>)",
        violet: "rgb(var(--color-accent) / <alpha-value>)",
        green: "rgb(var(--color-complete) / <alpha-value>)",

        // Highlighter marks — token-backed but values fixed across themes
        mark1: "rgb(var(--color-mark1) / <alpha-value>)",
        mark2: "rgb(var(--color-mark2) / <alpha-value>)",
        mark3: "rgb(var(--color-mark3) / <alpha-value>)",
        mark4: "rgb(var(--color-mark4) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
