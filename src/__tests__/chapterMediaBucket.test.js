import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260924000000_chapter_media_bucket.sql"
  ),
  "utf8"
);

describe("OPENBRAIN-63 chapter-media bucket migration", () => {
  it("is public, images only, 10 MB, and no SVG", () => {
    expect(sql).toMatch(
      /'chapter-media',\s*'chapter-media',\s*true,\s*10485760/
    );
    expect(sql).toContain(
      "ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']"
    );
    expect(sql).not.toContain("image/svg+xml");
  });

  it("lets only creators write, for this bucket only", () => {
    const writes = sql.match(/FOR (INSERT|UPDATE|DELETE)[\s\S]*?;/g) || [];
    expect(writes).toHaveLength(3);
    for (const w of writes) {
      expect(w).toContain("bucket_id = 'chapter-media'");
      expect(w).toContain("public.is_creator()");
      expect(w).toContain("TO authenticated");
    }
  });
});
