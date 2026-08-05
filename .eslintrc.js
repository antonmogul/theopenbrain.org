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
  ],
  rules: {
    "no-unused-vars": "warn",
    /* Formatting is auto-fixed by `npm run format`; surfacing it as an error
       would fail CI on whitespace and train people to ignore the gate. */
    "prettier/prettier": "warn",
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
        /* The existing specs lean on cy.wait() for timing. Worth replacing with
           real assertions, but that's test-suite work, not a lint gate. */
        "cypress/no-unnecessary-waiting": "warn",
      },
    },
    {
      /* Vitest specs use the globals-injected describe/it/expect. */
      files: ["**/__tests__/**/*.{test,spec}.{js,ts}", "**/*.{test,spec}.{js,ts}"],
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
