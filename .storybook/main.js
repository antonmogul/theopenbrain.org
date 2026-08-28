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
    const currentAliases = Array.isArray(cfg.resolve.alias)
      ? cfg.resolve.alias
      : Object.entries(cfg.resolve.alias || {}).map(([find, replacement]) => ({
          find,
          replacement,
        }));

    // Storybook must never initialize a real Supabase client or send writes.
    // Exact aliases come before the broad @ alias and provide configurable,
    // deterministic seams for stories that mount data-aware components.
    cfg.resolve.alias = [
      {
        find: "@/services/api/client",
        replacement: path.resolve(__dirname, "./mocks/api-client.js"),
      },
      {
        find: "@/lib/supabase",
        replacement: path.resolve(__dirname, "./mocks/supabase.js"),
      },
      {
        find: "@/composables/useAuth",
        replacement: path.resolve(__dirname, "./mocks/auth.js"),
      },
      { find: "@", replacement: path.resolve(__dirname, "../src") },
      ...currentAliases.filter(({ find }) => find !== "@"),
    ];
    return cfg;
  },
};

export default config;
