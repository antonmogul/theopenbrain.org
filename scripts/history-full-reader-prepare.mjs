/** Local filesystem only: copy the artwork the published-chapter fixture names
 * into the Storybook build, and record what it copied and what it left out.
 * No network: a figure the fixture draws from outside the repository (a
 * YouTube poster) is recorded as skipped; the story draws a plain stand-in
 * for it, so the browser run still allows no outside request. */
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
  await readFile("src/stories/historyFullReaderData.json", "utf8")
);
assert.equal(
  fixture.header?.source,
  "published chapter export",
  "Refresh the fixture: npm run history:fixture:export"
);
const assets = new Map();
const skipped = new Map();
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
for (const root of [
  "publicAssets/fonts",
  "publicAssets/images/foundations",
  "publicAssets/images/phrenology",
  "publicAssets/images/case-cabinet",
  "publicAssets/images/attention-matisse-reader.jpg",
  "publicAssets/images/background.jpg",
])
  await copy(root);
// A published image may carry a cache-busting query (fig01-01.jpg?v=2): the
// file is the path before it.
const local = (src) => src.slice(1).split("?")[0];
for (const animation of fixture.animations) {
  for (const image of animation.config?.images || []) {
    const src = typeof image === "string" ? image : image.src;
    if (src.startsWith("/publicAssets/")) await copy(local(src));
    else {
      // The only artwork a figure may take from outside the repository is the
      // poster of the YouTube video it plays.
      assert(
        image.youtube &&
          src === `https://i.ytimg.com/vi/${image.youtube}/hqdefault.jpg`,
        `Only local figure images or a YouTube poster are permitted: ${src}`
      );
      skipped.set(src, {
        src,
        figure: animation.animation_key,
        reason:
          "YouTube poster, not committed artwork; the story draws a plain stand-in for it",
      });
    }
  }
}
for (const paragraph of fixture.paragraphs) {
  const src = paragraph.content?.explore?.image?.src;
  if (!src) continue;
  assert(
    src.startsWith("/publicAssets/"),
    `Only local Explore card images are permitted: ${src}`
  );
  await copy(local(src));
}
await writeFile(
  "storybook-static/history-full-reader-assets.json",
  `${JSON.stringify({ boundary: fixture.boundary, header: fixture.header, assets: [...assets.values()], skipped: [...skipped.values()] }, null, 2)}\n`
);
console.log(
  `Prepared ${assets.size} complete-reader assets for the fixture exported ${fixture.header.exportedAt}; ${skipped.size} YouTube posters recorded as skipped.`
);
