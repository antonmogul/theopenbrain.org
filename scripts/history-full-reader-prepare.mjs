/** Local filesystem only: copy the complete reader's committed artwork. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
const fixture = JSON.parse(
  await readFile("src/views/__stories__/historyFullReaderData.json", "utf8")
);
const assets = new Map();
async function copy(relative) {
  assert(!relative.includes("..") && !path.isAbsolute(relative));
  const source = path.join("public", relative);
  const stat = await lstat(source);
  assert(!stat.isSymbolicLink(), `No symbolic-link fixture assets: ${source}`);
  if (stat.isDirectory()) {
    for (const name of (await readdir(source)).sort())
      await copy(path.join(relative, name));
    return;
  }
  assert(stat.isFile());
  const destination = path.join("storybook-static", relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  const bytes = await readFile(destination);
  assets.set(relative, {
    path: relative,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await readFile("storybook-static/index.json", "utf8");
for (const source of fixture.sources) {
  const bytes = await readFile(source.path);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    source.sha256,
    `Regenerate the fixture: ${source.path}`
  );
}
for (const root of [
  "publicAssets/fonts",
  "publicAssets/images/foundations",
  "publicAssets/images/phrenology",
  "publicAssets/images/case-cabinet",
  "publicAssets/images/attention-matisse-reader.jpg",
  "publicAssets/images/background.jpg",
])
  await copy(root);
for (const animation of fixture.animations) {
  for (const image of animation.config?.images || []) {
    const src = typeof image === "string" ? image : image.src;
    assert(
      src.startsWith("/publicAssets/"),
      `Only local figure images are permitted: ${src}`
    );
    await copy(src.slice(1));
  }
}
await writeFile(
  "storybook-static/history-full-reader-assets.json",
  `${JSON.stringify({ boundary: fixture.boundary, sources: fixture.sources, assets: [...assets.values()] }, null, 2)}\n`
);
console.log(
  `Prepared ${assets.size} complete-reader assets; migration fingerprints match.`
);
