import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import report from "../../../../.storybook/reports/chapter-components.json";

const root = process.cwd();
const chapterRoot = path.join(root, "src/components/chapter");

function vueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["__stories__", "__tests__"].includes(entry.name)) return [];
      return vueFiles(absolute);
    }
    return entry.name.endsWith(".vue")
      ? [path.relative(root, absolute).split(path.sep).join("/")]
      : [];
  });
}

describe("chapter Storybook coverage report", () => {
  it("accounts for every chapter Vue component with no silent exclusions", () => {
    const sourceFiles = vueFiles(chapterRoot).sort();
    const reportedFiles = report.components.map(({ source }) => source).sort();

    expect(sourceFiles).toHaveLength(53);
    expect(report.sourceCount).toBe(sourceFiles.length);
    expect(report.coveredCount).toBe(report.components.length);
    expect(report.excludedCount).toBe(report.excluded.length);
    expect(report.excluded).toEqual([]);
    expect(reportedFiles).toEqual(sourceFiles);
  });

  it("points each component at an existing direct named story", () => {
    for (const entry of report.components) {
      const storyPath = path.join(root, entry.storyFile);
      expect(existsSync(storyPath), entry.storyFile).toBe(true);

      const storySource = readFileSync(storyPath, "utf8");
      const componentName = path.basename(entry.source, ".vue");
      expect(storySource, `${entry.source} direct import`).toContain(
        `${componentName}.vue`
      );
      expect(storySource, `${entry.source} named story`).toMatch(
        new RegExp(`export const ${entry.story}\\s*=`)
      );
    }
  });
});
