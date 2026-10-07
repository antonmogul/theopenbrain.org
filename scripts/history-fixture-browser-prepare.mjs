import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  lstat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

// No browser or network here. The normal Storybook build intentionally excludes
// public/. Supply only this fixture's local images/model/fonts, never .env or
// application configuration, and record byte hashes for artifact reviewers.
const root = process.cwd();
const target = path.join(root, "storybook-static");
const fixture = JSON.parse(
  await readFile("src/views/__stories__/historyFixtureData.json", "utf8")
);
const sql = await readFile(fixture.gallerySource, "utf8");
const sourceImages = JSON.parse(
  sql.match(/'images', \$fig\$(\[[\s\S]*?\])\$fig\$/)[1]
);
assert.deepEqual(
  fixture.images,
  sourceImages,
  "Figure 6 fixture drifted from the committed artwork migration"
);
assert.equal(
  sourceImages.length,
  10,
  "Exercise the entire ten-image Figure 6 gallery"
);
const repairs = JSON.parse(await readFile(fixture.paragraphSource, "utf8"));
const paragraph = repairs.paragraphUpdates.find(
  (entry) =>
    entry.sectionSlug === fixture.paragraph.sectionSlug &&
    entry.orderIndex === fixture.paragraph.orderIndex
);
assert.deepEqual(
  fixture.paragraph.blocks,
  paragraph.after.content.blocks,
  "Reader excerpt drifted from its proposed source repair"
);

const inputs = [
  "publicAssets/fonts",
  "publicAssets/images/phrenology",
  "publicAssets/images/foundations/appendix",
  "publicAssets/images/case-cabinet/paper-clip.png",
  "publicAssets/models/skull.glb",
  ...fixture.images.map((image) => image.src.slice(1)),
];
const assets = [];
async function copyAsset(relative) {
  const source = path.join(root, "public", relative);
  const info = await lstat(source);
  assert(
    !info.isSymbolicLink(),
    `Fixture asset must not be a symlink: ${relative}`
  );
  if (info.isDirectory()) {
    for (const name of (await readdir(source)).sort())
      await copyAsset(path.join(relative, name));
    return;
  }
  assert(info.isFile(), `Fixture asset is not a regular file: ${relative}`);
  const destination = path.join(target, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  const bytes = await readFile(destination);
  assets.push({
    path: relative,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

await readFile(path.join(target, "index.json"), "utf8");
for (const input of inputs) await copyAsset(input);
for (const filename of ["penfieldAppendix.json", "phrenologyAppendix.json"]) {
  const data = JSON.parse(
    await readFile(`src/data/history/${filename}`, "utf8")
  );
  const images = data.cases
    ? data.cases.map((item) => item.image)
    : data.faculties.flatMap((item) => item.images);
  for (const sourceImage of images) {
    const copied = assets.find((item) => `/${item.path}` === sourceImage.src);
    assert.equal(
      copied?.sha256,
      sourceImage.sha256,
      `Source image hash mismatch: ${sourceImage.src}`
    );
  }
}
await writeFile(
  path.join(target, "history-fixture-assets.json"),
  `${JSON.stringify({ boundary: fixture.boundary, assets }, null, 2)}\n`
);
console.log(
  `Prepared ${assets.length} local History assets; all 35 appendix image hashes and the Figure 6/prose fixtures match their authoritative local sources.`
);
