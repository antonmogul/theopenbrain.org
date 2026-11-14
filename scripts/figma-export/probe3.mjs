import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const s of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await p.goto(`http://localhost:5193/${s}.html`, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const body = document.body;
    const kids = [...body.children]
      .filter((e) => e.tagName !== "SCRIPT")
      .map(
        (e) =>
          `${e.tagName}#${e.id}.${[...e.classList].join(".")} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`
      );
    const btns = [...document.querySelectorAll("button,[role=tab]")]
      .filter((b) => b.offsetParent)
      .map((b) =>
        (
          b.textContent.trim().replace(/\s+/g, " ") ||
          b.getAttribute("aria-label") ||
          "?"
        ).slice(0, 30)
      );
    const svgs = document.querySelectorAll("svg").length,
      imgs = document.querySelectorAll("svg image").length,
      cv = document.querySelectorAll("canvas").length;
    return {
      kids,
      btns,
      svgs,
      imgs,
      cv,
      h: document.documentElement.scrollHeight,
    };
  });
  console.log(s, JSON.stringify(info), errs.join("|"));
  await p.screenshot({ path: `out/probe-${s}.png` });
  await p.close();
}
await b.close();
