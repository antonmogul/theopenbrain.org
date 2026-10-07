/*
 * The decks migration and its generated seed (OPENBRAIN-129), read as text.
 * src/__tests__/decks.sql.test.js runs them on PGlite; this checks the
 * guarantees the frontend relies on are written down: creators-only tables,
 * two public read functions that strip notes, hidden slides and the slug,
 * invoker write functions (publish, discard, pin), the table's own limits,
 * and a seed that is the bundled
 * funding deck, valid and not mis-encoded.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { validateDeck } from "@/data/decks/validate.js";

const read = (name) =>
  readFileSync(resolve(process.cwd(), `supabase/migrations/${name}`), "utf8");
const migration = read("20261007010000_decks.sql");
const seed = read("20261007010100_seed_funding_deck.sql");

// The statement that defines function `name`, up to its closing $$;.
const fn = (name) => {
  const m = migration.match(
    new RegExp(
      `create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`
    )
  );
  expect(m, name).not.toBeNull();
  return m[0];
};
const policies = migration.match(/create policy[\s\S]*?;/g) || [];

describe("20261007010000_decks.sql", () => {
  it("enables RLS on both tables and keeps anon off them", () => {
    expect(migration).toContain(
      "alter table public.decks enable row level security;"
    );
    expect(migration).toContain(
      "alter table public.deck_revisions enable row level security;"
    );
    expect(migration).toContain("revoke all on public.decks from anon;");
    expect(migration).toContain(
      "revoke all on public.deck_revisions from anon;"
    );
    expect(migration).not.toMatch(
      /grant [^;]* on public\.decks[^;]* to [^;]*anon/
    );
  });

  it("writes every policy for authenticated creators only", () => {
    expect(policies.length).toBe(5);
    for (const p of policies) {
      expect(p).toMatch(/\bto authenticated\b/);
      expect(p).not.toMatch(/\bto (anon|public)\b/);
      expect(p).toContain("public.is_creator()");
    }
    // Revisions are immutable.
    expect(
      policies.filter((p) => /deck_revisions/.test(p) && /for update/.test(p))
    ).toEqual([]);
  });

  it.each(["get_shared_deck", "get_pinned_deck"])(
    "%s is a definer read function anon and authenticated can call",
    (name) => {
      const body = fn(name);
      expect(body).toMatch(/\bstable\b/);
      expect(body).toMatch(/\bsecurity definer\b/);
      expect(body).toContain("set search_path = public");
      expect(body).toContain("d.status = 'published'");
      expect(body).toContain(
        "public.deck_public_slides(d.published_slides, public.is_creator())"
      );
      // The slug is a creator's name for the deck: funders never get it.
      expect(body).toContain(
        "'slug', case when public.is_creator() then d.slug end"
      );
      expect(body).not.toContain("'slug', d.slug");
      expect(migration).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\) to anon, authenticated;`
        )
      );
    }
  );

  it("checks the share token's shape before looking it up", () => {
    expect(fn("get_shared_deck")).toContain("p_token ~ '^[0-9a-f]{32}$'");
    expect(fn("get_pinned_deck")).toContain("d.pinned");
  });

  it.each(["publish_deck", "discard_deck_changes", "set_pinned_deck"])(
    "%s runs as the caller (RLS applies) and only authenticated may call it",
    (name) => {
      const body = fn(name);
      expect(body).toMatch(/\bsecurity invoker\b/);
      expect(body).not.toMatch(/security definer/);
      expect(body).toContain("if not public.is_creator() then");
      expect(migration).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated;`
        )
      );
      expect(migration).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\) to authenticated;`
        )
      );
      expect(migration).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^)]*\\) to anon`
        )
      );
    }
  );

  it("publishes with a version check and a revision row", () => {
    const body = fn("publish_deck");
    expect(body).toContain("where id = p_id and version = p_version");
    expect(body).toContain("raise exception 'deck_conflict'");
    expect(body).toContain("insert into public.deck_revisions");
  });

  it("discards from the row's own snapshot, with a version check", () => {
    const body = fn("discard_deck_changes");
    expect(body).toContain("set slides = published_slides");
    expect(body).toContain("title = coalesce(published_title, title)");
    expect(body).toContain("published_version = version + 1");
    expect(body).toContain(
      "where id = p_id and version = p_version and published_slides is not null"
    );
    expect(body).toContain("raise exception 'deck_conflict'");
    // The self-check covers it like the other write functions.
    expect(migration).toContain(
      "'public.discard_deck_changes(uuid, integer)'::regprocedure and prosecdef"
    );
    expect(migration).toContain(
      "has_function_privilege('anon', 'public.discard_deck_changes(uuid, integer)', 'execute')"
    );
  });

  it("strips notes and hidden slides in a helper nobody else can call", () => {
    const body = fn("deck_public_slides");
    expect(body).toContain("e - 'notes'");
    expect(body).toContain(
      "where coalesce(e -> 'hidden', 'false'::jsonb) <> 'true'::jsonb"
    );
    expect(migration).toContain(
      "revoke all on function public.deck_public_slides(jsonb, boolean) from public, anon, authenticated;"
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.deck_public_slides/
    );
  });

  it("has the table's own limits: array, 100 slides, 1 MB, slug and token", () => {
    expect(migration).toContain("when jsonb_typeof(slides) = 'array'");
    expect(migration).toContain("jsonb_array_length(slides) <= 100");
    expect(migration).toContain("octet_length(slides::text) <= 1048576");
    expect(migration).toContain("slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'");
    expect(migration).toContain(
      "slug not in ('new', 'present', 's', 'templates')"
    );
    expect(migration).toContain("check (share_token ~ '^[0-9a-f]{32}$')");
    expect(migration).toContain(
      "create unique index if not exists decks_one_pinned_idx on public.decks ((true)) where pinned;"
    );
  });

  it("follows house style: no transaction statements, a self-check at the end", () => {
    expect(migration).not.toMatch(/^\s*begin\s*;/im);
    expect(migration).not.toMatch(/^\s*commit\s*;/im);
    expect(migration).toMatch(
      /do \$\$[\s\S]*raise exception 'decks: [\s\S]*end \$\$;\s*$/
    );
    // Lowercase SQL.
    expect(migration).not.toMatch(/\b(CREATE|SELECT|ALTER|GRANT)\b/);
  });
});

describe("20261007010100_seed_funding_deck.sql", () => {
  const json = seed.match(/\$deck\$([\s\S]*)\$deck\$::jsonb/)?.[1];

  it("never overwrites a deck edited in the dashboard", () => {
    expect(seed).toContain("on conflict (slug) do nothing");
    expect(seed).toMatch(/GENERATED by scripts\/decks\/gen-deck-seed\.mjs/);
    expect(seed).toContain("'funding', 'The Open Brain — Funding deck'");
  });

  it("holds the bundled funding deck, valid", () => {
    expect(json).toBeTruthy();
    const slides = JSON.parse(json);
    expect(slides.length).toBeGreaterThanOrEqual(9);
    expect(slides).toEqual(FUNDING_DECK);
    expect(validateDeck(slides).filter((p) => p.level === "error")).toEqual([]);
  });

  it("is UTF-8 without mojibake", () => {
    expect(seed).not.toMatch(/â€|‚Ä|Ã/);
    expect(seed).toContain("—");
    expect(seed).toContain("·");
  });
});
