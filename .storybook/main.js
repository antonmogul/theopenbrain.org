/*
 * Storybook config.
 *
 * JS, not TS: the repo has no typescript dependency and exactly one .ts file
 * (src/helper/perlin.ts), so the generated .ts config would have been the only
 * thing forcing a TS toolchain into the build.
 *
 * Storybook builds with its own Vite config, so the app's `@` → src/ alias is
 * re-declared in viteFinal. Without it every story importing @/components/...
 * fails to resolve.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@storybook/vue3-vite').StorybookConfig} */
const config = {
  // Stories live next to the components they document, in src/**/__stories__/.
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/vue3-vite",
  async viteFinal(cfg) {
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias || {}),
      "@": path.resolve(__dirname, "../src"),
    };
    return cfg;
  },
};

export default config;
