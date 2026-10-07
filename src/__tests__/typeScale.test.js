import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const brand = readFileSync(join(root, "styles/brand.css"), "utf8");
const index = readFileSync(join(root, "index.css"), "utf8");

// The modular scale has phone and tablet steps, and the reader's headings
// and body use it (OPENBRAIN-93): fixed heading sizes set after the old
// breakpoint rules left a section title 48px on a phone.
describe("responsive type scale", () => {
  it("steps down below 1280px and again below 768px", () => {
    expect(brand).toMatch(
      /@media \(max-width: 1279px\)\s*\{\s*:root\s*\{[^}]*--type-body-size: clamp\(/
    );
    const phone = brand.match(
      /@media \(max-width: 767px\)\s*\{\s*:root\s*\{([^}]*)\}/
    )?.[1];
    expect(phone).toContain("--type-body-size: 1.0625rem"); // 17px
    expect(phone).toContain("--type-h3-size: 2.0625rem"); // 33px
    expect(phone).toContain("--type-body-lg-size: 1.3125rem"); // 21px
  });

  it("sizes the reader's headings and body from the scale", () => {
    const rule = (sel) =>
      index.match(new RegExp(`\\n${sel} \\{([^}]*)\\}`))?.[1] || "";
    expect(rule("h2")).toContain("var(--type-h3-size)");
    expect(rule("h2\\.TN")).toContain("var(--type-subhead-size)");
    expect(rule("h3")).toContain("var(--type-body-lg-size)");
    expect(rule("\\.text-base")).toContain("var(--type-body-size)");
    expect(rule("\\.text-small")).toContain("var(--type-caption-size)");
  });
});
