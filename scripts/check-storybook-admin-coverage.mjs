import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scopes = [
  "src/components/dashboard",
  "src/components/settings",
  "src/components/UI",
  "src/components/Navigation",
  "src/components/Editor",
  "src/components/dev",
];
const exclusions = new Map([
  [
    "src/components/UI/SegmentedControl.vue",
    "Re-export-only SFC; Storybook docgen cannot parse export-default shims. Canonical dashboard/shared/SegmentedControl.vue is directly covered.",
  ],
  [
    "src/components/UI/Switch.vue",
    "Re-export-only SFC; Storybook docgen cannot parse export-default shims. Canonical dashboard/shared/Switch.vue is directly covered.",
  ],
]);

function walk(directory, predicate) {
  const results = [];
  for (const name of readdirSync(directory)) {
    const entry = path.join(directory, name);
    if (statSync(entry).isDirectory()) results.push(...walk(entry, predicate));
    else if (predicate(entry)) results.push(entry);
  }
  return results;
}

const components = scopes.flatMap((scope) =>
  walk(path.join(root, scope), (file) => file.endsWith(".vue"))
);
const stories = walk(path.join(root, "src"), (file) =>
  /\.stories\.(js|jsx|mjs)$/.test(file)
);
const importedBy = new Map(
  components.map((file) => [path.normalize(file), []])
);

for (const story of stories) {
  const source = readFileSync(story, "utf8");
  const imports = source.matchAll(
    /import\s+[\w$]+\s+from\s+["']([^"']+\.vue)["']/g
  );
  for (const match of imports) {
    const specifier = match[1];
    const resolved = path.normalize(
      specifier.startsWith("@/")
        ? path.join(root, "src", specifier.slice(2))
        : path.resolve(path.dirname(story), specifier)
    );
    if (importedBy.has(resolved) && existsSync(resolved)) {
      importedBy.get(resolved).push(path.relative(root, story));
    }
  }
}

const covered = [];
const excluded = [];
const uncovered = [];
for (const component of components.sort()) {
  const relativeComponent = path.relative(root, component);
  const record = {
    component: relativeComponent,
    stories: [...new Set(importedBy.get(path.normalize(component)))].sort(),
  };
  if (record.stories.length) covered.push(record);
  else if (exclusions.has(relativeComponent)) {
    excluded.push({
      component: relativeComponent,
      reason: exclusions.get(relativeComponent),
    });
  } else uncovered.push(record);
}

const report = {
  scope: scopes,
  total: components.length,
  covered: covered.length,
  excluded: excluded.length,
  uncovered: uncovered.length,
  exclusions: excluded,
  components: [...covered, ...uncovered],
};

console.log(JSON.stringify(report, null, 2));
if (uncovered.length) process.exitCode = 1;
