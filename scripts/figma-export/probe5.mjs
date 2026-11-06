import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(`http://localhost:5193/retina-pupillary-light-reflex.html`);
await p.waitForTimeout(2500);
console.log(
  await p.evaluate(() => {
    const o = [];
    const k = [...document.querySelectorAll("button")]
      .filter((b) => b.textContent.includes("Pretectal"))
      .slice(0, 1)
      .flatMap((b) => [b, ...b.querySelectorAll("*")]);
    for (const e of k) {
      const cs = getComputedStyle(e);
      o.push(
        e.outerHTML.slice(0, 400).replace(/data:[^"]+/g, "DATA"),
        "bg=" +
          cs.backgroundColor +
          " color=" +
          cs.color +
          " border=" +
          cs.borderColor +
          " op=" +
          cs.opacity +
          " filter=" +
          cs.filter +
          " mix=" +
          cs.mixBlendMode
      );
    }
    for (const e of document.querySelectorAll(
      ".tob-prev svg, .tob-next svg, .tob-prev, .tob-next"
    )) {
      const cs = getComputedStyle(e);
      o.push(
        e.tagName +
          " " +
          e.className.baseVal +
          e.className +
          " transform=" +
          cs.transform +
          " " +
          (e.tagName === "svg" ? e.outerHTML.slice(0, 200) : "")
      );
    }
    return o.join("\n");
  })
);
await b.close();
