// node batch.mjs <outDir> <urls.txt> name1 name2 ...  → uploads every image of each extract, writes <name>-hashes.json
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const [, , O, urlsF, ...names] = process.argv;
const urls = readFileSync(urlsF, "utf8").trim().split(/\s+/);
let u = 0;
const jobs = [];
for (const name of names) {
  const ex = JSON.parse(readFileSync(path.join(O, name + ".json"), "utf8"));
  const hashes = {};
  for (const im of ex.images) {
    if (!im.file) continue;
    const url = urls[u++];
    if (!url) throw new Error("not enough urls");
    const file = path.join(O, im.file);
    const ext = path.extname(file).slice(1);
    const type =
      ext === "svg"
        ? "image/svg+xml"
        : ext === "jpg"
          ? "image/jpeg"
          : "image/" + ext;
    jobs.push(
      (async () => {
        const fd = new FormData();
        fd.append(
          "file",
          new Blob([readFileSync(file)], { type }),
          path.basename(file)
        );
        const j = await (await fetch(url, { method: "POST", body: fd })).json();
        if (!j.success)
          throw new Error(name + " " + JSON.stringify(j).slice(0, 200));
        hashes[im.id] = j.imageHash;
        return j.placedOnNodeId;
      })().then((id) => {
        writeFileSync(
          path.join(O, name + "-hashes.json"),
          JSON.stringify(hashes)
        );
        return id;
      })
    );
  }
  if (!ex.images.length)
    writeFileSync(path.join(O, name + "-hashes.json"), "{}");
}
const placed = await Promise.all(jobs);
console.log("used", u, "of", urls.length, "placed", placed.join(","));
