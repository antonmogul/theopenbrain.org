require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  /*
   * No `env` was declared before, so every browser and Node global read as
   * undefined — `process`, `__dirname`, `window`, `document` and friends
   * produced 66 no-undef errors that were pure config noise. Lint was broken
   * outright (prettier was never installed as a peer dep) so none of this was
   * ever visible.
   */
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    "plugin:vue/vue3-essential",
    "eslint:recommended",
    "@vue/eslint-config-prettier",
    "plugin:import/recommended",
    "plugin:storybook/recommended",
  ],
  rules: {
    /* 15 today (OPENBRAIN-23 paid 92 down): 12 in src/components/chapter/text/,
       which is under active rework and was left alone, and 3 in
       ConeExplorerPanel where an unused `wavelengthToRGB` result marks an
       unfinished "true colour" weighting — a design call, not a lint fix. */
    "no-unused-vars": "warn",
    /* Formatting is auto-fixed by `npm run format`; surfacing it as an error
       would fail CI on whitespace and train people to ignore the gate. */
    "prettier/prettier": "warn",

    /*
     * Below: pre-existing violations demoted to warnings so the CI gate can go
     * green today and start catching NEW problems. Each is real and tracked in
     * OPENBRAIN-9 — this is a paydown list, not a permanent exemption.
     * `lint:ci` allows 21 warnings against 16 actual (2026-09-02); lower the
     * ceiling in package.json as the rest are paid off.
     */

    /* 5 single-word components (Button, Switch, Question, Pagination,
       Specimen) carry a file-level disable with the import count that a rename
       would touch. Kept at warn so any NEW single-word component still shows
       up in `lint:ci` output. */
    "vue/multi-word-component-names": "warn",

    /* Phrenology3DView uses the `slot` attribute for <model-viewer> hotspots —
       that is the web component's documented API (a native slot, not Vue 2
       slot syntax), so the file carries a template-level disable. Kept at warn
       so any other use of the removed Vue 2 syntax still surfaces. */
    "vue/no-deprecated-slot-attribute": "warn",

    /* One <transition> without v-if/v-show in AITutorSidebar. The parent
       mounts the whole component, so the <Transition> never animates today;
       the real fix (toggle inside, or `appear`) changes how the sidebar
       enters and wants a visual check, not a drive-by. */
    "vue/require-toggle-inside-transition": "warn",
  },
  settings: {
    "import/resolver": {
      alias: {
        map: [["@", "./src/"]],
      },
      node: {
        extensions: [".js", ".mjs", ".cjs", ".json", ".vue"],
      },
    },
    /* `node:`-prefixed builtins (node:url, node:fs) aren't resolvable by
       eslint-plugin-import's default resolver. */
    "import/core-modules": [],
    "import/ignore": ["node_modules"],
  },
  overrides: [
    {
      files: ["cypress/**/*.{js,ts,jsx,tsx}"],
      extends: ["plugin:cypress/recommended"],
      env: { "cypress/globals": true },
      rules: {
        /* 0 today — the eight cy.wait(500) sleeps in student-dashboard.cy.js
           became assertion-based waits in OPENBRAIN-23. Kept at warn so a new
           sleep is visible in lint output without failing the gate; the specs
           themselves are not run in CI (see ci.yml). */
        "cypress/no-unnecessary-waiting": "warn",
      },
    },
    {
      /* Vitest specs use the globals-injected describe/it/expect. */
      files: [
        "**/__tests__/**/*.{test,spec}.{js,ts}",
        "**/*.{test,spec}.{js,ts}",
      ],
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    {
      /* Build/tooling scripts are Node-only and may use node: imports. */
      files: ["*.config.{js,cjs,mjs}", "scripts/**/*.{js,mjs}", "*.cjs"],
      /* browser stays on: Playwright scripts pass callbacks to page.evaluate()
         that run in the page, where window/document are real. */
      env: { node: true, browser: true },
      rules: { "import/no-unresolved": ["error", { ignore: ["^node:"] }] },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
};
