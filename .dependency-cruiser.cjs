// Validated against dependency-cruiser@16.10.4 on Node 20 (node ^18.17 || >=20).
// Use: npx -y dependency-cruiser@16.10.4 --config .dependency-cruiser.cjs --output-type json src/App.vue
const path = require("path");

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make the module graph impossible to reason about.",
      from: {},
      to: { circular: true },
    },
    {
      name: "stores-not-from-views",
      severity: "error",
      comment: "stores/ must not depend on views/ (inverted layering).",
      from: { path: "^src/stores" },
      to: { path: "^src/views" },
    },
    {
      name: "composables-not-from-views",
      severity: "error",
      comment: "composables/ must not depend on views/ (inverted layering).",
      from: { path: "^src/composables" },
      to: { path: "^src/views" },
    },
    {
      name: "components-not-from-views",
      severity: "error",
      comment: "components/ must not depend on views/ (inverted layering).",
      from: { path: "^src/components" },
      to: { path: "^src/views" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Unused module — candidate for removal. Entry points are allowlisted below.",
      from: {
        orphan: true,
        pathNot: [
          "^src/main\\.js$",
          "\\.config\\.(js|cjs|ts)$",
          "^src/router",
          "^src/App\\.vue$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(node_modules|dist)" },
    // dc does not support enhancedResolveOptions.alias (removed from schema); use tsConfig paths instead.
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".js", ".ts", ".vue", ".json"],
    },
    tsPreCompilationDeps: false,
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
    },
  },
};
