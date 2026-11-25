// node run.mjs key1 key2 ...  → runs every extraction (3 at a time)
import { JOBS } from "./jobs.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { execFile } from "node:child_process";
mkdirSync("out/states", { recursive: true });
const q = [];
for (const k of process.argv.slice(2))
  for (const [name, w, js, settle] of JOBS[k].jobs) {
    if (process.env.ONLY && !process.env.ONLY.split(",").includes(name))
      continue;
    let sf = "";
    if (js) {
      sf = `out/states/${name}.js`;
      writeFileSync(sf, js);
    }
    q.push({
      name,
      args: [
        "extract.mjs",
        JOBS[k].route,
        JOBS[k].root || ".widget-root",
        "out",
        name,
        String(w),
        ...(sf ? [sf] : []),
      ],
      env: {
        ...process.env,
        CHAPTER: JOBS[k].ch,
        ...(JOBS[k].base ? { BASE: JOBS[k].base } : {}),
        SHOT: "1",
        SETTLE: String(settle ?? 1500),
      },
    });
  }
const runOne = (j) =>
  new Promise((res) =>
    execFile(
      "node",
      j.args,
      { env: j.env, timeout: 260000, maxBuffer: 1e8 },
      (e, so, se) => {
        console.log(
          e ? `FAIL ${j.name} ${String(se || e).slice(0, 300)}` : so.trim()
        );
        res();
      }
    )
  );
const workers = Array.from({ length: 3 }, async () => {
  while (q.length) await runOne(q.shift());
});
await Promise.all(workers);
