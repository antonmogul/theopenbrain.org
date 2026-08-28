import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260828010000_harden_reading_progress_identity.sql"
);
const migration = readFileSync(migrationPath, "utf8");

describe("reading progress identity migration", () => {
  it("merges duplicate snapshots before enforcing null-safe uniqueness", () => {
    const mergeAt = migration.indexOf("UPDATE reading_progress AS progress");
    const deleteAt = migration.indexOf(
      "DELETE FROM reading_progress AS progress"
    );
    const constraintAt = migration.indexOf("UNIQUE NULLS NOT DISTINCT");

    expect(migration).toContain("LOCK TABLE reading_progress");
    expect(migration).toContain("MAX(COALESCE(time_spent_seconds, 0))");
    expect(migration).toContain("BOOL_OR(COALESCE(is_completed, FALSE))");
    expect(migration).toContain("course_id IS NOT DISTINCT FROM");
    expect(mergeAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(mergeAt);
    expect(constraintAt).toBeGreaterThan(deleteAt);
  });

  it("makes completion monotonic for all database writers", () => {
    expect(migration).toContain("preserve_reading_progress_completion");
    expect(migration).toContain("OLD.is_completed IS TRUE");
    expect(migration).toContain("BEFORE UPDATE ON reading_progress");
  });
});
