import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260923010000_beta_data_cleanup.sql"
  ),
  "utf8"
);

describe("OPENBRAIN-52 beta data clean-up migration", () => {
  it("deletes only by exact id, re-checking the row is unused", () => {
    expect(migration).not.toMatch(/ILIKE|LIKE\s+'%/i);
    expect(migration).toMatch(
      /NOT EXISTS \(SELECT 1 FROM quiz_attempts x WHERE x.quiz_id = q.id\)/
    );
    expect(migration).toMatch(
      /NOT EXISTS \(SELECT 1 FROM modules m WHERE m.content_version_id = v.id\)/
    );
  });

  it("never deletes chapters, media or version 1.0", () => {
    expect(migration).not.toMatch(
      /DELETE\s+FROM\s+(modules|sections|paragraphs|animations)/i
    );
    const versionDelete = migration.slice(
      migration.indexOf("DELETE FROM content_versions"),
      migration.indexOf(
        "GET DIAGNOSTICS",
        migration.indexOf("DELETE FROM content_versions")
      )
    );
    expect(versionDelete).not.toContain("3899a199-ac71-4438-8dcd-313aa7f20130");
  });

  it("checks afterwards that the Retina quiz, v1.0 and 3 chapters survive", () => {
    expect(migration).toContain("the Retina quiz is missing");
    expect(migration).toContain("version 1.0 is missing");
    expect(migration).toContain("fewer than 3 chapters remain");
  });
});
