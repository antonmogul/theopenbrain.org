// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WIDGET_PLACEMENTS } from "@/widgets/placements";

describe("chapter widgets have one placement source", () => {
  it("has no code placements and the reader never injects them", () => {
    expect(WIDGET_PLACEMENTS).toEqual([]);
    expect(readFileSync("src/composables/useChapter.js", "utf8")).not.toMatch(
      /applyWidgetPlacements|placementsForChapter/
    );
  });
  it("leaves widget-specific CSS in uploaded HTML", () => {
    const host = readFileSync("src/widgets/uploaded/widgetHost.js", "utf8");
    const style = host.match(/const HOST_STYLE = `([\s\S]*?)`;/)[1];
    expect(style).not.toMatch(
      /\.rb\b|\.rb-|\.tob\b|\.tob-|data-ob-author-credit/
    );
  });
  it("preserves the original colour explorer after reversing its documented token and fit edits", () => {
    let upload = readFileSync(
      "src/widgets/uploads/retina-color-vision.html",
      "utf8"
    );
    upload = upload.replace(
      /\/\* Open Brain rail parts \(OPENBRAIN-98\)[\s\S]*?(?=<\/style>)/,
      ""
    );
    upload = upload.replace(
      /<!-- Open Brain upload \(OPENBRAIN-62\)\.[^\r\n]+ -->\r\n/,
      ""
    );
    upload = upload.replace(
      /<!-- Open Brain book: a fitted band scrolls the original long explorer inside the frame\. -->\r\n<style>\r\n[\s\S]*?<\/style>\r\n(?=<\/head>)/,
      ""
    );
    upload = upload.replace(
      /(--(?:ink|panel|panel-2|well|rule|rule-hi|text|dim|faint|mono|sans):\s*)var\(--ob-[a-z0-9-]+, ([^;\r\n]+)\);/g,
      "$1$2;"
    );
    expect(upload).toBe(
      readFileSync("src/widgets/source/color-vision-widget.html", "utf8")
    );
  });
});
