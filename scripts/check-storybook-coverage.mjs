import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.join(root, "src");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(absolute) : absolute;
    })
  );
  return files.flat();
}

function normalize(file) {
  return path.normalize(file);
}

function resolveVueImport(storyFile, specifier) {
  if (specifier.startsWith("@/")) {
    return normalize(path.join(sourceRoot, specifier.slice(2)));
  }
  if (specifier.startsWith("/src/")) {
    return normalize(path.join(root, specifier.slice(1)));
  }
  if (specifier.startsWith(".")) {
    return normalize(path.resolve(path.dirname(storyFile), specifier));
  }
  return null;
}

const files = await walk(sourceRoot);
const components = files
  .filter((file) => file.endsWith(".vue"))
  .map(normalize)
  .sort();
const stories = files.filter((file) => /\.stories\.[cm]?[jt]sx?$/.test(file));
const covered = new Set();

for (const story of stories) {
  const source = await readFile(story, "utf8");
  const importPatterns = [
    /from\s+["']([^"']+\.vue)["']/g,
    /import\(\s*["']([^"']+\.vue)["']\s*\)/g,
  ];
  for (const pattern of importPatterns) {
    for (const match of source.matchAll(pattern)) {
      const resolved = resolveVueImport(story, match[1]);
      if (resolved) covered.add(resolved);
    }
  }
}

const missing = components.filter((component) => !covered.has(component));
const relative = (file) => path.relative(root, file);

console.log(
  `Storybook Vue coverage: ${components.length - missing.length}/${components.length}`
);
console.log(`Story files: ${stories.length}`);

if (missing.length) {
  console.error(
    `\n${missing.length} Vue file(s) have no direct or grouped story import:`
  );
  for (const file of missing) console.error(`- ${relative(file)}`);
  process.exitCode = 1;
} else {
  console.log("Every Vue component/view is represented in Storybook.");
}
