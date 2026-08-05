import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

const path = require("path");

import { createHtmlPlugin } from "vite-plugin-html";
import pkg from "./package.json";

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  // https://vitejs.dev/config/
  return defineConfig({
    build: {
      /** If you set esmExternals to true, this plugins assumes that 
     all external dependencies are ES modules */

      commonjsOptions: {
        esmExternals: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("lottie-web")) return "vendor-lottie";
            if (id.includes("gsap")) return "vendor-gsap";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (
              id.includes("/vue/") ||
              id.includes("@vue/") ||
              id.includes("vue-router") ||
              id.includes("pinia")
            )
              return "vendor-vue";
            // everything else keeps Rollup's default per-route splitting
            return undefined;
          },
        },
      },
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // <model-viewer> is a web component (Google), not a Vue component.
            isCustomElement: (tag) => tag === "model-viewer",
          },
        },
      }),
      createHtmlPlugin({
        inject: {
          data: {
            NODE_ENV: process.env.NODE_ENV,
            PAGE_TITLE: process.env.VITE_PAGE_TITLE,
            // OG_DESCRIPTION: process.env.VITE_OG_DESCRIPTION,
            // OG_IMAGE: process.env.VITE_OG_IMAGE,
            // GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID,
          },
          ejsOptions: {
            escape: false,
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src/"),
        ...(process.env.NODE_ENV === "development"
          ? {
              // "@azt": path.resolve(__dirname,"../MODULES/azt"),
              // "@3ms": path.resolve(__dirname,"../MODULES/3ms"),
            }
          : {}),
      },
    },
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
  });
};

// https://vitejs.dev/config/
