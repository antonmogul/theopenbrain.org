/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,vue}"],
  theme: {
    fontFamily: {
      sans: [
        "IBM Plex Sans",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "Roboto",
        "Helvetica Neue",
        "Arial",
        "Noto Sans",
        "sans-serif",
        "Apple Color Emoji",
        "Segoe UI Emoji",
        "Segoe UI Symbol",
        "Noto Color Emoji",
      ],
      mono: [
        "IBM Plex Mono",
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Monaco",
        "Consolas",
        "Liberation Mono",
        "Courier New",
        "monospace",
      ],
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
        //   "1.1rem",
        //   { lineHeight: "1.4rem", letterSpacing: "-0.01rem" },
        // ],
        // small: ["1.35rem", { lineHeight: "1.9rem", letterSpacing: "0.02rem" }],
        // medium: ["1.6rem", { lineHeight: "2.65rem" }],
        // baseMono: ["1.8rem", "2.8rem"],
        // base: ["2rem", "3.1rem"],
        // h3: ["3.0rem", "3.8rem"],
        // h2: ["4.8rem", "5.8rem"],
        // blindness: ["11rem", "11rem"],
        // biggest: ["8rem", "12rem"],
        // big: ["8rem", "8rem"],
      },
      height: {
        header: "2.2rem",
        body: "calc(100vh - 2.2rem)",
      },
      width: {
        text: "min(50vw, calc(780px + 11rem))",
        illus: "max(50vw, calc(100vw - 780px - 11rem))",
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
        text: "max(50vw, calc(100vw - 780px - 11rem))",
      },
      margin: {
        body: "2.2rem",
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
