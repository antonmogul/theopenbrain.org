import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const w of [1280, 390])
  for (const r of process.argv.slice(2)) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto("http://localhost:5191" + r, { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    const i = await p.evaluate(() => {
      const e = document.querySelector(".widget-root");
      const rr = e.getBoundingClientRect();
      let deep = 0;
      e.querySelectorAll("*").forEach((x) => {
        if (
          x.scrollHeight > x.clientHeight + 20 &&
          /auto|scroll/.test(getComputedStyle(x).overflowY)
        )
          deep = Math.max(deep, x.scrollHeight);
      });
      return [
        Math.round(rr.width),
        Math.round(rr.height),
        e.scrollHeight,
        deep,
        getComputedStyle(e).overflowY,
        getComputedStyle(e).position,
      ];
    });
    console.log(w, r, JSON.stringify(i));
    await p.close();
  }
await b.close();
