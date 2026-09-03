import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const manifest = JSON.parse(
  await readFile(join(root, "storybook-coverage.student-views.json"), "utf8")
);

async function filesUnder(directory, predicate) {
  const found = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (predicate(path)) found.push(path);
    }
  }
  await walk(join(root, directory));
  return found;
}

const componentFiles = (
  await Promise.all(
    manifest.componentRoots.map((directory) =>
      filesUnder(directory, (path) => path.endsWith(".vue"))
    )
  )
).flat();
const viewFiles = await filesUnder(manifest.viewRoot, (path) =>
  path.endsWith(".vue")
);
const storyFiles = (
  await Promise.all(
    manifest.storyRoots.map((directory) =>
      filesUnder(directory, (path) => path.endsWith(".stories.js"))
    )
  )
).flat();
const stories = await Promise.all(
  storyFiles.map(async (path) => {
    const source = await readFile(path, "utf8");
    const imports = new Set();
    for (const match of source.matchAll(/from\s+["']([^"']+\.vue)["']/g)) {
      const specifier = match[1];
      imports.add(
        specifier.startsWith("@/")
          ? join(root, "src", specifier.slice(2))
          : resolve(dirname(path), specifier)
      );
    }
    return { path, imports };
  })
);

function reportFor(files) {
  return files.map((path) => {
    const matches = stories
      .filter(({ imports }) => imports.has(path))
      .map(({ path: storyPath }) => relative(root, storyPath));
    return { source: relative(root, path), stories: matches };
  });
}

const components = reportFor(componentFiles);
const views = reportFor(viewFiles);
const uncovered = [...components, ...views].filter(
  ({ stories: matches }) => matches.length === 0
);
const counts = {
  components: components.length,
  views: views.length,
  total: components.length + views.length,
  excluded: manifest.excluded.length,
};
const expected = manifest.expected;
const countMismatch = Object.keys(counts).filter(
  (key) => counts[key] !== expected[key]
);

const report = { counts, uncovered, components, views };
console.log(JSON.stringify(report, null, 2));

if (uncovered.length || countMismatch.length) {
  if (countMismatch.length) {
    console.error(`Coverage count mismatch: ${countMismatch.join(", ")}`);
  }
  process.exitCode = 1;
}
