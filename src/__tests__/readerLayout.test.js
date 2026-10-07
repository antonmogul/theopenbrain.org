import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  READER_NARROW_QUERY,
  READER_TWO_COLUMN_PX,
  READER_WIDE_QUERY,
} from "../helper/readerLayout.js";

const root = join(__dirname, "..", "..");
const require = createRequire(import.meta.url);

// The reader's breakpoint lives in readerLayout.js, Tailwind's `reader`
// screen and a handful of CSS media queries (CSS can't read a JS constant).
// These keep them in step, and keep the old 1300px from creeping back.
describe("reader layout breakpoint (OPENBRAIN-89)", () => {
  it("builds its queries from the one constant", () => {
    expect(READER_WIDE_QUERY).toBe(`(min-width: ${READER_TWO_COLUMN_PX}px)`);
    expect(READER_NARROW_QUERY).toBe(
      `(max-width: ${READER_TWO_COLUMN_PX - 1}px)`
    );
  });

  it("matches Tailwind's `reader` screen", () => {
    const config = require(join(root, "tailwind.config.js"));
    expect(config.theme.screens.reader).toBe(`${READER_TWO_COLUMN_PX}px`);
  });

  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (!["__tests__", "__stories__", "source"].includes(name)) walk(p);
      } else if (/\.(vue|js|mjs|css)$/.test(p)) files.push(p);
    }
  })(join(root, "src", "components", "chapter"));
  files.push(
    join(root, "src", "index.css"),
    join(root, "src", "views", "ChapterView.vue"),
    join(root, "src", "helper", "stageLayer.js")
  );

  it.each(files.map((f) => [relative(root, f), f]))(
    "%s has no stray two-column breakpoint",
    (_, file) => {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/\b1300px\b|\b1299px\b/);
      // The reader's own layout switch is `reader:`, not the app-wide `xl:`.
      expect(src).not.toMatch(
        /(?<![\w-])xl:(?:w-text|w-illus|block|fixed|border-l)\b/
      );
    }
  );
});
