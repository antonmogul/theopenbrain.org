import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
 * CSS ignores an @import that comes after any other rule. Vite's dev server
 * still applies it, so the mistake only shows in production builds, where a
 * whole section loses its shared styles (OPENBRAIN-57: Overview and
 * Chapters; again 24 Sep: Media and Quizzes). Every <style> block's
 * @imports must come before its first rule.
 */
const root = path.join(process.cwd(), "src");
function vueFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : vueFiles(p);
    return e.name.endsWith(".vue") ? [p] : [];
  });
}
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("CSS @import order in .vue styles", () => {
  it("puts every @import before the first rule of its <style> block", () => {
    const offenders = [];
    for (const file of vueFiles(root)) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
        const css = stripComments(m[1]).trim();
        const lastImport = css.lastIndexOf("@import");
        if (lastImport < 0) continue;
        const before = css.slice(0, lastImport);
        // Anything but other @imports (or @charset) before it is a rule.
        const rest = before.replace(/@(import|charset)[^;]*;/g, "").trim();
        if (rest) offenders.push(path.relative(process.cwd(), file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
