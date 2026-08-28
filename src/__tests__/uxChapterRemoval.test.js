import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

describe("OPENBRAIN-17 temporary chapter retirement", () => {
  it("keeps the removal migration exact-slug and preserves content versions", () => {
    const migration = read(
      "supabase/migrations/20260828000000_remove_temporary_visual_perception_ux.sql"
    );

    expect(migration).toContain("WHERE slug = 'visual-perception-ux'");
    expect(migration).toContain("UPDATE flashcard_sessions");
    expect(migration).toContain("SET module_id = NULL");
    expect(migration).toContain("DELETE FROM modules");
    expect(migration).not.toMatch(/DELETE\s+FROM\s+content_versions/i);
    expect(migration).not.toContain("ILIKE");
    expect(migration).not.toMatch(/order_index\s*=\s*2/);
  });

  it("removes active import tooling and UX-specific UI exposure", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["import:chapter2"]).toBeUndefined();

    for (const path of [
      "scripts/check-chapter-2-data.mjs",
      "scripts/check-sections.mjs",
      "scripts/import-chapter-2-markdown.js",
      "scripts/import-chapter-2-to-supabase.mjs",
    ]) {
      expect(existsSync(resolve(root, path)), path).toBe(false);
    }

    expect(read("src/components/chapter/text/EyeStart.vue")).not.toContain(
      "visual-perception-ux"
    );
    expect(
      read("src/components/dashboard/chapters/WizardStepMeta.vue")
    ).not.toContain("Visual Perception and UX");
    expect(read("supabase/seed_dashboard_data.sql")).not.toContain(
      "visual-perception-ux"
    );
  });

  it("retains the authored Foundations chapter and its smoke route", () => {
    const foundations = read(
      "supabase/migrations/20260605000000_seed_chapter_foundations.sql"
    );
    expect(foundations).toContain("'foundations-of-neuroscience'");
    expect(foundations).toContain("WHERE version_number = '1.0'");
    expect(read("scripts/smoke.mjs")).toContain(
      'path: "/chapter/3/foundations-of-neuroscience"'
    );
  });
});
