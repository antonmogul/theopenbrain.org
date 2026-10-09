/*
 * Every widget file in src/widgets/uploads/ is listed, has a story, and
 * passes the Widget Studio's checks (OPENBRAIN-135), so a broken widget
 * fails here before anyone uploads it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { UPLOADED_WIDGETS } from "../widgets/uploads/index.js";
import { staticChecks, widgetSlug } from "../widgets/uploaded/widgetHost.js";

const dir = resolve(__dirname, "../widgets/uploads");
const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
const stories = readFileSync(
  resolve(dir, "__stories__/UploadedWidgets.stories.js"),
  "utf8"
);

describe("uploaded widget files", () => {
  it("lists every file once, and every entry has a file", () => {
    const slugs = UPLOADED_WIDGETS.map((w) => w.slug).sort();
    expect(slugs).toEqual(files.map((f) => f.replace(/\.html$/, "")).sort());
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every widget a story", () => {
    for (const { slug } of UPLOADED_WIDGETS)
      expect(stories, slug).toContain(`story("${slug}")`);
  });

  it.each(UPLOADED_WIDGETS.map((w) => [w.slug, w]))(
    "%s passes the Studio's checks",
    (slug, w) => {
      expect(widgetSlug(slug)).toBe(slug);
      expect(["fund", "perc", "move", "lear", "deve"]).toContain(w.ramp);
      const html = readFileSync(resolve(dir, `${slug}.html`), "utf8");
      const failed = staticChecks(html)
        .filter((c) => !c.ok)
        .map((c) => `${c.label}: ${c.detail}`);
      expect(failed).toEqual([]);
    }
  );
});
