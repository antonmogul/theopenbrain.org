import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(`http://localhost:5193/${process.argv[2]}.html`);
await p.waitForTimeout(2500);
console.log(
  await p.evaluate((sel) => {
    const out = [];
    const w = (e, d) => {
      if (d > 5) return;
      const cs = getComputedStyle(e),
        r = e.getBoundingClientRect();
      out.push(
        "  ".repeat(d) +
          e.tagName +
          "." +
          [...e.classList].join(".") +
          ` ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} d=${cs.display} v=${cs.visibility} o=${cs.opacity}`
      );
      if (e.tagName !== "svg") [...e.children].forEach((c) => w(c, d + 1));
    };
    w(document.querySelector(sel), 0);
    return out.join("\n");
  }, process.argv[3])
);
await b.close();
