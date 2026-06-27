import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// Standalone Vitest config. The app's vite.config.js exports a function
// (mode) => config, which Vitest can't merge directly, so we declare the few
// things unit tests need here: the Vue plugin (to parse .vue section
// components), the @/ alias (mirrors the app), and a DOM-capable environment
// (some composables touch document, e.g. the media Lottie preview).
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        globals: true,
        environment: "happy-dom",
        include: ["src/**/*.{test,spec}.{js,ts}"],
    },
});
