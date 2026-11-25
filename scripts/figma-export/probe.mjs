import { chromium } from "@playwright/test";
const routes = process.argv.slice(2);
const b = await chromium.launch();
for (const r of routes) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
  await p
    .goto("http://localhost:5191" + r, { waitUntil: "networkidle" })
    .catch((e) => errs.push(String(e).slice(0, 80)));
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const app = document.querySelector("#app");
    let el = app;
    while (el && el.children.length === 1) el = el.children[0];
    const root = el;
    const cls = (e) =>
      e.tagName.toLowerCase() +
      (e.className && typeof e.className === "string"
        ? "." + e.className.trim().split(/\s+/).join(".")
        : "");
    const ctl = [
      ...root.querySelectorAll("button,input,select,[role=tab],[aria-pressed]"),
    ]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map(
        (e) =>
          (e.tagName === "INPUT"
            ? e.type + ":"
            : e.tagName.toLowerCase() + ":") +
          (
            e.getAttribute("aria-label") ||
            e.textContent.trim() ||
            e.name ||
            ""
          ).slice(0, 28)
      );
    return {
      root: cls(root),
      kids: [...root.children].map(cls).slice(0, 8),
      h: document.documentElement.scrollHeight,
      canvas: root.querySelectorAll("canvas").length,
      svg: root.querySelectorAll("svg").length,
      ctl: [...new Set(ctl)].slice(0, 40),
    };
  });
  console.log(
    "\n##",
    r,
    JSON.stringify(info),
    errs.length ? "ERR " + errs.join(" | ") : ""
  );
  await p.close();
}
await b.close();
