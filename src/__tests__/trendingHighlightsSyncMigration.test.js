import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Static guard for the migration; trendingHighlightsSync.sql.test.js runs it
// in PGlite when HISTORY_SQL_HARNESS is set.
const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261007000000_trending_highlights_sync.sql"
  ),
  "utf8"
);
const code = migration.replace(/^\s*--.*$/gm, "");

describe("OPENBRAIN-128 trending highlights sync migration", () => {
  it("drops every SELECT policy on highlights but the owner's and reads shared rows for creators only", () => {
    expect(code).toMatch(
      /tablename = 'highlights'\s+AND cmd = 'SELECT'[\s\S]*?NOT IN \('auth\.uid=user_id', 'user_id=auth\.uid'\)\s+LOOP\s+EXECUTE format\('DROP POLICY %I ON public\.highlights'/
    );
    // The self-check accepts any owner policy, not one exact qual text.
    expect(code).not.toMatch(/qual = '\(auth\.uid\(\) = user_id\)'/);
    expect(code).toMatch(
      /IN \('auth\.uid=user_id', 'user_id=auth\.uid'\) AS owner/
    );
    const policies = code.match(/CREATE POLICY[\s\S]*?;/g) || [];
    expect(policies).toHaveLength(2);
    for (const p of policies) expect(p).toMatch(/FOR SELECT/);
    expect(policies[0]).toMatch(
      /ON public\.highlights FOR SELECT TO authenticated\s+USING \(is_public IS TRUE AND \(SELECT public\.is_creator\(\)\)\)/
    );
  });

  it("shows trending passages of published chapters (or to creators), never USING (true)", () => {
    expect(code).toContain(
      'DROP POLICY IF EXISTS "Anyone reads trending highlights"'
    );
    const read = code.match(
      /CREATE POLICY "Read trending passages of published chapters"[\s\S]*?;/
    )[0];
    expect(read).toContain("m.status = 'published'");
    expect(read).toContain("(SELECT public.is_creator())");
    expect(read).not.toMatch(/USING \(true\)/i);
  });

  it("counts distinct readers of text that is in the paragraph", () => {
    expect(code).toContain("COUNT(DISTINCT h.user_id)");
    expect(code).not.toMatch(/highlight_count \+ 1|COUNT\(\*\)::integer/);
    expect(code).toMatch(
      /AND public\.trending_text_in_paragraph\(h\.selected_text, p\.content, p\.content_text\)/
    );
    // Shown text: most readers' choice, then text as long as the span,
    // never the earliest created_at.
    expect(code).toMatch(
      /ORDER BY COUNT\(DISTINCT user_id\) DESC,\s+\(length\(shown\) = p_end - p_start\) DESC,\s+length\(shown\), shown COLLATE "C"/
    );
    expect(code).not.toMatch(/ORDER BY h\.created_at/);
  });

  it("keeps the trigger definer-run and every helper off /rest/v1/rpc", () => {
    expect(code).toMatch(
      /FUNCTION public\.update_trending_highlights\(\)\s+RETURNS trigger\s+LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = public/
    );
    const functions = [
      ...code.matchAll(/CREATE OR REPLACE FUNCTION (public\.\w+)\(/g),
    ].map((m) => m[1]);
    expect(functions).toHaveLength(6);
    for (const fn of functions) {
      expect(code).toMatch(
        new RegExp(
          `FUNCTION ${fn.replace(".", "\\.")}\\([\\s\\S]*?SET search_path = public`
        )
      );
      if (fn === "public.trending_sharing_ready") continue;
      expect(code).toMatch(
        new RegExp(
          `REVOKE EXECUTE ON FUNCTION ${fn.replace(".", "\\.")}\\([^)]*\\) FROM PUBLIC, anon, authenticated`
        )
      );
    }
  });

  // The share switch stays hidden until this answers (useTrendingSharing).
  it("adds the share switch's probe for signed-in readers only", () => {
    expect(code).toMatch(
      /FUNCTION public\.trending_sharing_ready\(\)\s+RETURNS boolean\s+LANGUAGE sql\s+STABLE\s+SECURITY INVOKER\s+SET search_path = public\s+AS \$\$\s+SELECT true;\s+\$\$;/
    );
    expect(code).toContain(
      "REVOKE EXECUTE ON FUNCTION public.trending_sharing_ready() FROM PUBLIC, anon;"
    );
    expect(code).toContain(
      "GRANT EXECUTE ON FUNCTION public.trending_sharing_ready() TO authenticated;"
    );
  });
});
