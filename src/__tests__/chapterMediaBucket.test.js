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

const noListing = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261007010200_chapter_media_no_listing.sql"
  ),
  "utf8"
);

describe("OPENBRAIN-129 chapter-media listing migration", () => {
  it("drops the anon read policy and lets only creators list the bucket", () => {
    expect(noListing).toContain(
      'drop policy if exists "Anyone reads chapter media" on storage.objects;'
    );
    const reads = noListing.match(/create policy[\s\S]*?;/g) || [];
    expect(reads).toHaveLength(1);
    expect(reads[0]).toContain("for select to authenticated");
    expect(reads[0]).toContain(
      "using (bucket_id = 'chapter-media' and public.is_creator())"
    );
    expect(reads[0]).not.toMatch(/\bto (anon|public)\b/);
  });

  it("keeps the bucket public and checks itself", () => {
    expect(noListing).not.toMatch(/update storage\.buckets/i);
    expect(noListing).toContain("where id = 'chapter-media' and public) then");
    expect(noListing).toMatch(
      /raise exception 'chapter media: % read policies let non-creators list the bucket'/
    );
    expect(noListing).not.toMatch(/^\s*(begin|commit)\s*;/im);
  });
});
