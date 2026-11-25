// node pack.mjs <extract.json> <frameName> <pageId> <x> <y> <chapterMode|-> <map.json|-> <hashes.json> <out.svg> [parentId]
import { readFileSync, writeFileSync } from "node:fs";
const [, , ex, frameName, pageId, x, y, mode, mapF, hashF, out, parentId] =
  process.argv;
const MODES = ["fund", "perc", "move", "lear", "deve"];
const colors = readFileSync(new URL("./ds-colors.txt", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .map((l) => {
    const [coll, name, key, hexes] = l.split(" ");
    const hs = hexes.split("|");
    const hex = hs.length > 1 ? hs[Math.max(0, MODES.indexOf(mode))] : hs[0];
    return { name: coll + "/" + name, key, hex };
  })
  .filter((c) => !(c.name.startsWith("Chapter") && mode === "-"));
const text = JSON.parse(
  readFileSync(new URL("./ds-text.json", import.meta.url), "utf8")
);
const data = JSON.parse(readFileSync(ex, "utf8"));
const fonts = [],
  fidx = new Map();
const dedupe = (n) => {
  if (n.txt)
    n.txt.segs = n.txt.segs.map(([t, f]) => {
      const k = JSON.stringify(f);
      if (!fidx.has(k)) {
        fidx.set(k, fonts.length);
        fonts.push(f);
      }
      return [t, fidx.get(k)];
    });
  (n.ch || []).forEach(dedupe);
};
dedupe(data.tree);
const D = {
  tree: data.tree,
  fonts,
  images: hashF === "-" ? {} : JSON.parse(readFileSync(hashF, "utf8")),
  frameName,
  pageId,
  x: +x,
  y: +y,
  chapterMode: mode === "-" ? null : mode,
  map: mapF === "-" ? {} : JSON.parse(readFileSync(mapF, "utf8")),
  kitPageId: "6:2",
  sliderSetId: "6:31",
  parentId: parentId || null,
  ds: {
    colors,
    text,
    components: {
      button: "21ab1174b23c7ab019346db02d0a91a26e409b93",
      chip: "440588a858bef50ef80722b2e61fbac705ae4b67",
      segmented: "b0fbe30b91199e8bd43b31930029782a1e9f1a61",
    },
    chapterCollectionKey: "8059705277d33d1e09a94102a87cb549f1f6df2e",
    chapterVarKey: "3feaad1d794a23aa195d501afafb1e28ba2da645",
  },
};
const payload = JSON.stringify({
  code: readFileSync(new URL("./builder.js", import.meta.url), "utf8"),
  D,
});
const esc = payload
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");
writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><text x="0" y="5" font-size="1" xml:space="preserve">${esc}</text></svg>`
);
console.log(out, payload.length);
