import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260923020000_creator_reads_and_trending.sql"
  ),
  "utf8"
);

describe("OPENBRAIN-55 creator reads + trending migration", () => {
  it("adds only SELECT policies", () => {
    const policies = migration.match(/CREATE POLICY[\s\S]*?;/g) || [];
    expect(policies).toHaveLength(3);
    for (const p of policies) expect(p).toMatch(/FOR SELECT/);
    expect(migration).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/);
  });

  it("scopes professors to students enrolled in their own courses", () => {
    expect(migration).toContain("c.professor_id = auth.uid()");
    expect(migration).toContain("e.student_id = quiz_attempts.student_id");
  });

  it("makes the trending trigger definer-run with a pinned search_path", () => {
    expect(migration).toContain(
      "ALTER FUNCTION public.update_trending_highlights() SECURITY DEFINER"
    );
    expect(migration).toContain("SET search_path = public");
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.update_trending_highlights\(\) FROM PUBLIC, anon, authenticated/
    );
  });
});
