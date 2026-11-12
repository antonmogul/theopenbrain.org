// @vitest-environment node
/**
 * OPENBRAIN-192: the reader's "Turn animations on" (html[data-reduce-motion="0"],
 * usePreferences) must win over the device's prefers-reduced-motion. A bare
 * `@media (prefers-reduced-motion: reduce) { .x { … } }` in a component only
 * hears the device, so every selector inside one is scoped with
 * `:root:not([data-reduce-motion="0"])` (or names data-reduce-motion itself).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKIP = /__stories__|__tests__|widgets\/source|widgets\/uploads/;
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (SKIP.test(path)) return [];
    if (statSync(path).isDirectory()) return files(path);
    return /\.(vue|css)$/.test(name) ? [path] : [];
  });

const blockEnd = (text, i) => {
  for (let depth = 1; depth; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
  }
  return i;
};

/** Selectors inside reduced-motion media blocks that ignore the reader. */
function unscoped(text) {
  const out = [];
  const media = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g;
  for (let m; (m = media.exec(text));) {
    const start = m.index + m[0].length;
    const body = text.slice(start, blockEnd(text, start) - 1);
    for (let j = 0; j < body.length;) {
      const k = body.indexOf("{", j);
      if (k === -1) break;
      const selector = body
        .slice(j, k)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();
      const end = blockEnd(body, k + 1);
      if (!selector.startsWith("@"))
        for (const one of selector.split(","))
          if (!one.includes("data-reduce-motion")) out.push(one.trim());
      j = end;
    }
  }
  return out;
}

describe("reduced-motion rules hear the reader's choice", () => {
  it("finds an unscoped rule", () => {
    expect(
      unscoped(
        `@media (prefers-reduced-motion: reduce) { .a, :root:not([data-reduce-motion="0"]) .b { x: 0 } }`
      )
    ).toEqual([".a"]);
  });

  it("has none in the book's components and styles", () => {
    const found = files("src").flatMap((path) =>
      unscoped(readFileSync(path, "utf8")).map((s) => `${path}: ${s}`)
    );
    expect(found).toEqual([]);
  });
});
