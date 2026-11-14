// node up.mjs <hashes.json> <id>=<file>@<url> ...   → posts files, merges {id: hash} into hashes.json, prints placed node ids
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
const [, , hashF, ...pairs] = process.argv;
const hashes = existsSync(hashF) ? JSON.parse(readFileSync(hashF, "utf8")) : {};
const placed = [];
await Promise.all(
  pairs.map(async (p) => {
    const [id, rest] = p.split("=");
    const at = rest.indexOf("@");
    const file = rest.slice(0, at),
      url = rest.slice(at + 1);
    const ext = path.extname(file).slice(1);
    const type =
      ext === "svg"
        ? "image/svg+xml"
        : ext === "jpg"
          ? "image/jpeg"
          : "image/" + ext;
    const fd = new FormData();
    fd.append(
      "file",
      new Blob([readFileSync(file)], { type }),
      path.basename(file)
    );
    const r = await fetch(url, { method: "POST", body: fd });
    const j = await r.json();
    if (!j.success) {
      console.error(id, JSON.stringify(j).slice(0, 300));
      return;
    }
    hashes[id] = j.imageHash;
    placed.push(j.placedOnNodeId);
  })
);
writeFileSync(hashF, JSON.stringify(hashes));
console.log("placed", placed.join(","));
