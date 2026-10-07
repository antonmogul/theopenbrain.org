/*
 * Deck entries against the layout schemas (OPENBRAIN-129): normalisation is
 * the identity on the bundled decks, every problem code can be raised, new
 * slides from defaultsFor validate cleanly, and the editor's helpers (ids,
 * clones, layout switches, eyebrow numbers, slugs, typography) do what the
 * editor relies on.
 */
import { describe, expect, it } from "vitest";
import { FUNDING_DECK } from "../funding.js";
import { DECK_TEMPLATES } from "../templates.js";
import { LAYOUT_SCHEMAS } from "../fields.js";
import { BUNDLED_DECKS, GALLERY, STARTERS } from "../index.js";
import {
  isReservedSlug,
  RESERVED_SLUGS,
  slugify,
  smartPunctuation,
  SLUG_RE,
} from "../text.js";
import {
  carryOver,
  cloneEntry,
  cspAllowed,
  cspLoads,
  deckByteLength,
  defaultsFor,
  fieldId,
  newSlideId,
  normalizeSlide,
  renumberEyebrows,
  SCHEMA_VERSION,
  summaryFromCounts,
  validateDeck,
  validateSlide,
} from "../validate.js";

const BUNDLED = [...FUNDING_DECK, ...DECK_TEMPLATES];
const entry = (layout, props, extra = {}) => ({
  id: "s-1",
  label: "Slide",
  layout,
  props: { ...defaultsFor(layout), ...props },
  ...extra,
});
const codes = (problems) => problems.map((p) => p.code);
const find = (problems, code) => problems.find((p) => p.code === code);
const errors = (problems) => problems.filter((p) => p.level === "error");

describe("normalizeSlide", () => {
  it.each(BUNDLED.map((e) => [e.id, e]))(
    "is the identity on bundled entry %s",
    (_, e) => {
      expect(normalizeSlide(e)).toStrictEqual(e);
    }
  );

  it("is idempotent and never changes its input", () => {
    const messy = {
      id: "x",
      label: 7,
      layout: "trajectory",
      props: {
        title: "T",
        chapters: { live: "3", inProgress: 2.7, funded: "nope", extra: 1 },
        milestones: [{ when: 2025, heading: "H", highlight: "yes" }, "bad"],
        legend: { live: "On" },
        unknown: "dropped",
      },
      junk: true,
    };
    const before = JSON.stringify(messy);
    const once = normalizeSlide(messy);
    expect(normalizeSlide(once)).toStrictEqual(once);
    expect(JSON.stringify(messy)).toBe(before);
  });

  it("keeps only declared props and entry keys", () => {
    const n = normalizeSlide({
      ...FUNDING_DECK[0],
      junk: 1,
      props: {
        ...FUNDING_DECK[0].props,
        unknown: "x",
        image: { src: "/a.jpg", alt: "A", figure: "fig1", width: 400 },
      },
    });
    expect(n).not.toHaveProperty("junk");
    expect(n.props).not.toHaveProperty("unknown");
    expect(n.props.image).toEqual({ src: "/a.jpg", alt: "A", figure: "fig1" });
  });

  it("coerces each type", () => {
    const n = normalizeSlide({
      id: "x",
      label: "L",
      layout: "trajectory",
      hidden: "yes",
      props: {
        title: 42,
        eyebrow: null,
        chapters: { live: "3", inProgress: 2.7, funded: "nope", unfunded: 4 },
        milestones: [
          { when: 2025, heading: "H", highlight: "yes", later: true },
        ],
      },
    });
    expect(n).not.toHaveProperty("hidden");
    expect(n.props.title).toBe("42");
    expect(n.props).not.toHaveProperty("eyebrow");
    expect(n.props.chapters).toEqual({
      live: 3,
      inProgress: 2,
      funded: 0,
      unfunded: 4,
    });
    expect(n.props.milestones).toEqual([
      { when: "2025", heading: "H", later: true },
    ]);
  });

  it("turns non-arrays into empty lists and fills missing required containers", () => {
    const team = normalizeSlide({
      id: "x",
      label: "L",
      layout: "team",
      props: {},
    });
    expect(team.props).toEqual({ people: [] });
    const audience = normalizeSlide({
      id: "x",
      label: "L",
      layout: "audience",
      props: { title: "T", roles: "nope" },
    });
    expect(audience.props.roles).toEqual([]);
    const traj = normalizeSlide({ id: "x", label: "L", layout: "trajectory" });
    expect(traj.props).toEqual({ milestones: [], chapters: {} });
    // Counts are clamped to their range, so a stored typo (or a row edited
    // in SQL) can't ask the slide for millions of bars.
    const huge = normalizeSlide(
      entry("trajectory", {
        chapters: { live: 5e7, inProgress: -3, funded: "7", unfunded: 2 },
      })
    );
    expect(huge.props.chapters).toEqual({
      live: 200,
      inProgress: 0,
      funded: 7,
      unfunded: 2,
    });
    // Optional lists stay absent.
    const text = normalizeSlide({
      id: "x",
      label: "L",
      layout: "text",
      props: { title: "T" },
    });
    expect(text.props).not.toHaveProperty("paragraphs");
  });

  it("stores an optional that is off as null or not at all", () => {
    const hero = normalizeSlide(entry("hero", { person: false }));
    expect(hero.props.person).toBeNull();
    const heroMissing = normalizeSlide(entry("hero", {}));
    expect(heroMissing.props).not.toHaveProperty("person");
    const note = normalizeSlide(entry("text", { note: "x" }));
    expect(note.props.note).toBeNull();

    const off = normalizeSlide(entry("trajectory", { legend: null }));
    expect(off.props).not.toHaveProperty("legend");
    // Switched on, the legend keeps all four labels.
    const on = normalizeSlide(entry("trajectory", { legend: { live: "Now" } }));
    expect(on.props.legend).toEqual({
      live: "Now",
      inProgress: "By end of 2026",
      funded: "Funded · 2027",
      unfunded: "Unfunded",
    });
  });

  it("keeps a phone screen's alt and placeholder with its src", () => {
    const n = normalizeSlide(
      entry("phones", {
        screens: [
          { heading: "H", src: "/a.png", alt: "A", placeholder: "P", x: 1 },
        ],
      })
    );
    expect(n.props.screens).toEqual([
      { heading: "H", src: "/a.png", alt: "A", placeholder: "P" },
    ]);
  });

  it("drops an empty headshot crop and keeps source and hidden", () => {
    const n = normalizeSlide(
      entry(
        "team",
        { people: [{ name: "A", photo: "", photoPosition: "" }] },
        { hidden: true, source: { chapter: "the-retina" } }
      )
    );
    expect(n.props.people).toEqual([{ name: "A", photo: "" }]);
    expect(n.hidden).toBe(true);
    expect(n.source).toEqual({ chapter: "the-retina" });
  });

  it("returns an unknown layout unchanged", () => {
    const odd = { id: "x", label: "L", layout: "nope", props: { a: 1 } };
    expect(normalizeSlide(odd)).toEqual(odd);
    expect(normalizeSlide(odd)).not.toBe(odd);
  });
});

describe("validateDeck", () => {
  it.each([
    ["funding", FUNDING_DECK],
    ["templates", DECK_TEMPLATES],
  ])("finds no errors in the %s deck", (_, deck) => {
    expect(errors(validateDeck(deck))).toEqual([]);
  });

  it("warns about the funding deck's empty headshots and video", () => {
    const warnings = validateDeck(FUNDING_DECK);
    expect(warnings.every((p) => p.code === "W_PLACEHOLDER")).toBe(true);
    expect(warnings.map((p) => p.path)).toContain("props.people.0.photo");
    expect(warnings.map((p) => p.path)).toContain("props.src");
  });

  it.each(Object.keys(LAYOUT_SCHEMAS))(
    "accepts a new %s slide from defaultsFor",
    (layout) => {
      const problems = validateDeck([
        { id: "s-1", label: "New", layout, props: defaultsFor(layout) },
      ]);
      expect(errors(problems)).toEqual([]);
    }
  );

  it("gives each problem a slide, a path, a level, a code and a message", () => {
    for (const p of validateDeck([entry("team", { people: [] })])) {
      expect(p).toEqual({
        slideId: "s-1",
        path: expect.any(String),
        level: expect.stringMatching(/^(error|warn)$/),
        code: expect.stringMatching(/^[EW]_[A-Z_]+$/),
        message: expect.any(String),
      });
    }
  });
});

describe("error codes", () => {
  const one = (e) => validateSlide(e, { position: 1, visiblePosition: 1 });

  it("E_LAYOUT: unknown layout", () => {
    const p = find(
      one({ id: "a", label: "A", layout: "nope", props: {} }),
      "E_LAYOUT"
    );
    expect(p).toMatchObject({ level: "error", path: "layout" });
  });

  it("E_REQUIRED: label, required props and required item fields", () => {
    const problems = one(
      entry("team", { title: "  ", people: [{ name: "" }] }, { label: "" })
    );
    const paths = problems
      .filter((p) => p.code === "E_REQUIRED")
      .map((p) => p.path);
    expect(paths).toEqual(
      expect.arrayContaining(["label", "props.title", "props.people.0.name"])
    );
  });

  it("E_ENUM: an enum, icon or role colour outside its options", () => {
    const paths = one(
      entry("role", {
        role: "admin",
        icon: "rocket",
        features: [{ icon: "book", name: "A" }],
      })
    )
      .filter((p) => p.code === "E_ENUM")
      .map((p) => p.path);
    expect(paths).toEqual(["props.role", "props.icon"]);
    expect(codes(one(entry("hero", { size: "huge" })))).toContain("E_ENUM");
  });

  it("E_COUNT: a list outside its bounds", () => {
    const item = { heading: "H" };
    expect(
      find(one(entry("columns", { items: [item] })), "E_COUNT").message
    ).toMatch(/2 to 4/);
    expect(
      codes(one(entry("columns", { items: Array(5).fill(item) })))
    ).toContain("E_COUNT");
    expect(
      codes(one(entry("columns", { items: Array(3).fill(item) })))
    ).not.toContain("E_COUNT");
  });

  it("E_DUPLICATE: a repeated key in a list or string list", () => {
    const team = one(entry("team", { people: [{ name: "A" }, { name: "A" }] }));
    expect(find(team, "E_DUPLICATE").path).toBe("props.people.1.name");
    const audience = one(
      entry("audience", {
        roles: [
          {
            role: "creator",
            icon: "book",
            name: "C",
            features: ["x", "y", "x"],
          },
        ],
      })
    );
    expect(find(audience, "E_DUPLICATE").path).toBe("props.roles.0.features.2");
  });

  it("E_INT: a chapter count that isn't a whole number from 0", () => {
    const problems = one(
      entry("trajectory", {
        chapters: { live: -1, inProgress: 1.5, funded: "2", unfunded: 3 },
      })
    );
    expect(
      problems.filter((p) => p.code === "E_INT").map((p) => p.path)
    ).toEqual([
      "props.chapters.live",
      "props.chapters.inProgress",
      "props.chapters.funded",
    ]);
  });

  it("E_INT: a chapter count over the cap (a typo that would draw millions of bars)", () => {
    const problems = one(
      entry("trajectory", {
        chapters: { live: 200, inProgress: 201, funded: 5e7, unfunded: 0 },
      })
    );
    const ints = problems.filter((p) => p.code === "E_INT");
    expect(ints.map((p) => p.path)).toEqual([
      "props.chapters.inProgress",
      "props.chapters.funded",
    ]);
    expect(ints[0].message).toBe(
      "Chapters · In progress must be a whole number from 0 to 200."
    );
  });

  it("E_URL: a source that isn't a path or an http(s) address", () => {
    for (const src of [
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "img.png",
    ])
      expect(
        find(one(entry("hero", { image: { src, alt: "A" } })), "E_URL").path
      ).toBe("props.image.src");
    expect(codes(one(entry("video", { src: "ftp://x/v.mp4" })))).toContain(
      "E_URL"
    );
    expect(
      codes(one(entry("hero", { image: { src: "/a.jpg", alt: "A" } })))
    ).not.toContain("E_URL");
  });

  it("E_ID: missing, malformed or repeated slide ids", () => {
    expect(codes(one(entry("section", {}, { id: "" })))).toContain("E_ID");
    expect(codes(one(entry("section", {}, { id: "Has Spaces" })))).toContain(
      "E_ID"
    );
    const deck = validateDeck([entry("section", {}), entry("section", {})]);
    expect(find(deck, "E_ID")).toMatchObject({ slideId: "s-1", path: "id" });
  });

  it("E_DECK_SIZE: over 100 slides or 1 MB", () => {
    const many = Array.from({ length: 101 }, (_, i) =>
      entry("section", {}, { id: `s-${i}` })
    );
    expect(find(validateDeck(many), "E_DECK_SIZE")).toMatchObject({
      slideId: null,
      level: "error",
    });
    const big = [entry("section", {}, { notes: "x".repeat(1048576) })];
    expect(codes(validateDeck(big))).toContain("E_DECK_SIZE");
    expect(codes(validateDeck(FUNDING_DECK))).not.toContain("E_DECK_SIZE");
  });

  it("measures size the way Postgres prints jsonb", () => {
    expect(deckByteLength([{ a: 1, b: "é" }])).toBe(
      '[{"a": 1, "b": "é"}]'.length + 1
    );
  });

  it("E_EMPTY_DECK: no slides to show", () => {
    expect(codes(validateDeck([]))).toContain("E_EMPTY_DECK");
    expect(
      codes(validateDeck([entry("section", {}, { hidden: true })]))
    ).toContain("E_EMPTY_DECK");
  });
});

describe("warning codes", () => {
  const one = (e, at = 1) =>
    validateSlide(e, { position: at, visiblePosition: at });
  const warn = (e, code, at) => {
    const p = find(one(e, at), code);
    expect(p, code).toBeTruthy();
    expect(p.level).toBe("warn");
    return p;
  };

  it("W_LENGTH: over maxChars, and a long label", () => {
    expect(
      warn(entry("team", { title: "x".repeat(41) }), "W_LENGTH").path
    ).toBe("props.title");
    expect(
      warn(entry("section", {}, { label: "x".repeat(41) }), "W_LENGTH").path
    ).toBe("label");
  });

  it("W_CSP: an address the site's CSP blocks", () => {
    expect(
      warn(
        entry("hero", {
          image: { src: "https://example.com/a.jpg", alt: "A" },
        }),
        "W_CSP"
      ).path
    ).toBe("props.image.src");
    expect(
      warn(entry("video", { src: "https://i.ytimg.com/v.mp4" }), "W_CSP").path
    ).toBe("props.src");
  });

  it("W_ALT: an image without alt text", () => {
    expect(
      warn(entry("hero", { image: { src: "/a.jpg", alt: "" } }), "W_ALT").path
    ).toBe("props.image.alt");
    expect(
      warn(
        entry("phones", { screens: [{ heading: "H", src: "/a.png" }] }),
        "W_ALT"
      ).path
    ).toBe("props.screens.0.alt");
    // The team photo's alt is the person's name.
    expect(
      codes(one(entry("team", { people: [{ name: "A", photo: "/a.jpg" }] })))
    ).not.toContain("W_ALT");
  });

  it("W_PLACEHOLDER: an empty image or video, not an empty poster", () => {
    expect(warn(entry("hero", {}), "W_PLACEHOLDER").path).toBe(
      "props.image.src"
    );
    const video = one(entry("video", { src: "/v.mp4" }));
    expect(codes(video)).not.toContain("W_PLACEHOLDER");
  });

  it("W_NEWLINE: a line break in a text field", () => {
    expect(
      warn(entry("section", { title: "Two\nlines" }), "W_NEWLINE").path
    ).toBe("props.title");
  });

  it("W_EYEBROW: a hand number that isn't the slide's place", () => {
    expect(
      warn(entry("section", { eyebrow: "03 · Part" }), "W_EYEBROW", 2).path
    ).toBe("props.eyebrow");
    expect(
      codes(one(entry("section", { eyebrow: "02 · Part" }), 2))
    ).not.toContain("W_EYEBROW");
    // Hidden slides don't count.
    const deck = validateDeck([
      entry("section", {}, { id: "a" }),
      entry("section", {}, { id: "b", hidden: true }),
      entry("section", { eyebrow: "02 · Part" }, { id: "c" }),
    ]);
    expect(codes(deck)).not.toContain("W_EYEBROW");
  });

  it("W_DESIGN_COUNT: a list off its designed count", () => {
    const f = { value: "1", label: "L" };
    expect(
      warn(entry("figures", { figures: [f, f] }), "W_DESIGN_COUNT").path
    ).toBe("props.figures");
  });

  it("W_SUMMARY: a trajectory summary that disagrees with the counts", () => {
    const p = warn(
      entry("trajectory", {
        summary: "Half the book needs funding",
        chapters: { live: 1, inProgress: 1, funded: 1, unfunded: 1 },
      }),
      "W_SUMMARY"
    );
    expect(p.path).toBe("props.summary");
    expect(p.message).toContain("1 of 4 chapters still need funding");
  });

  it("W_EMPTY_STRIP: chapter counts adding up to 0", () => {
    expect(warn(entry("trajectory", {}), "W_EMPTY_STRIP").path).toBe(
      "props.chapters"
    );
  });

  it("W_HIDDEN_FIELD: a value a setting hides", () => {
    expect(
      warn(
        entry("hero", { brand: true, eyebrow: "01 · Intro" }),
        "W_HIDDEN_FIELD"
      ).path
    ).toBe("props.eyebrow");
    expect(
      warn(
        entry("hero", { footnote: "F", person: { name: "A" } }),
        "W_HIDDEN_FIELD"
      ).path
    ).toBe("props.footnote");
    expect(
      warn(
        entry("team", { people: [{ name: "A", photoPosition: "center top" }] }),
        "W_HIDDEN_FIELD"
      ).path
    ).toBe("props.people.0.photoPosition");
  });

  it("W_QUOTE_MARKS: a quote in quote marks (the slide adds them)", () => {
    expect(
      warn(entry("statement", { quote: "“Quoted”" }), "W_QUOTE_MARKS").path
    ).toBe("props.quote");
    expect(codes(one(entry("quote", { quote: '"Quoted"' })))).toContain(
      "W_QUOTE_MARKS"
    );
    expect(codes(one(entry("quote", { quote: 'He said "no"' })))).not.toContain(
      "W_QUOTE_MARKS"
    );
  });

  it("W_HERO_TITLE: a display title over 24 characters", () => {
    expect(
      warn(
        entry("hero", { size: "display", title: "x".repeat(25) }),
        "W_HERO_TITLE"
      ).path
    ).toBe("props.title");
    expect(codes(one(entry("hero", { title: "x".repeat(25) })))).not.toContain(
      "W_HERO_TITLE"
    );
  });

  it("W_HIGHLIGHT_LATER: a milestone both highlighted and muted", () => {
    const m = { when: "2026", heading: "H", highlight: true, later: true };
    expect(
      warn(entry("trajectory", { milestones: [m] }), "W_HIGHLIGHT_LATER").path
    ).toBe("props.milestones.0.later");
  });
});

describe("new slides", () => {
  it("fills required text with its label and lists to their designed count", () => {
    const traj = defaultsFor("trajectory");
    expect(traj.title).toBe("Title");
    expect(traj.milestones).toHaveLength(3);
    expect(new Set(traj.milestones.map((m) => m.when)).size).toBe(3);
    expect(traj.chapters).toEqual({
      live: 0,
      inProgress: 0,
      funded: 0,
      unfunded: 0,
    });
    expect(defaultsFor("columns").items).toHaveLength(2);
    expect(defaultsFor("role")).toMatchObject({
      role: "creator",
      icon: "book",
    });
    expect(defaultsFor("hero")).toMatchObject({
      size: "large",
      image: { src: "", alt: "" },
    });
    expect(defaultsFor("nope")).toEqual({});
  });

  it("makes ids that don't collide", () => {
    const taken = new Set();
    for (let i = 0; i < 200; i++) {
      const id = newSlideId(taken);
      expect(id).toMatch(/^s-[0-9a-f]{8}$/);
      expect(taken.has(id)).toBe(false);
      taken.add(id);
    }
  });

  it("clones with a fresh id and without a template's number", () => {
    const t7 = DECK_TEMPLATES.find((e) => e.id === "t7-image-text");
    const copy = cloneEntry(t7, ["t7-image-text"]);
    expect(copy.id).toMatch(/^s-[0-9a-f]{8}$/);
    expect(copy.label).toBe("Image and text");
    expect(copy.props).toEqual(t7.props);
    copy.props.image.src = "/changed.jpg";
    expect(t7.props.image.src).toBe("");
  });
});

describe("carryOver", () => {
  it("keeps shared fields and lists what is dropped", () => {
    const finishing = FUNDING_DECK.find((e) => e.id === "finishing");
    const { entry: next, dropped } = carryOver(finishing, "section");
    expect(next.layout).toBe("section");
    expect(next.id).toBe("finishing");
    expect(next.notes).toBe(finishing.notes);
    expect(next.props).toEqual({
      eyebrow: "06 · Next steps",
      title: "Finishing the Book",
      lead: finishing.props.lead,
    });
    expect(dropped.sort()).toEqual(["image", "person"]);
  });

  it("doesn't carry a value the new field can't take", () => {
    const statement = entry("statement", {
      role: "Role · Institution",
      name: "N",
    });
    const { entry: next, dropped } = carryOver(statement, "role");
    expect(next.props.role).toBe("creator");
    expect(next.props.name).toBe("N");
    expect(dropped).toEqual(expect.arrayContaining(["role", "quote"]));
    expect(errors(validateDeck([next]))).toEqual([]);
  });

  it("carries a list only into a list of the same shape", () => {
    const phones = entry("phones", { screens: [{ heading: "A" }] });
    const { entry: next, dropped } = carryOver(phones, "devices");
    expect(next.props).not.toHaveProperty("screens");
    expect(dropped).toContain("screens");
  });
});

describe("renumberEyebrows", () => {
  it("numbers eyebrows by place among shown slides, leaving others alone", () => {
    const deck = [
      entry("section", { eyebrow: "05 · One" }, { id: "a" }),
      entry("section", { eyebrow: "01 · Hidden" }, { id: "b", hidden: true }),
      entry("section", { eyebrow: "Appendix" }, { id: "c" }),
      entry("section", { eyebrow: "03 · Three" }, { id: "d" }),
    ];
    const next = renumberEyebrows(deck);
    expect(next.map((e) => e.props.eyebrow)).toEqual([
      "01 · One",
      "01 · Hidden",
      "Appendix",
      "03 · Three",
    ]);
    expect(next[1]).toBe(deck[1]);
    expect(next[3]).toBe(deck[3]);
    expect(deck[0].props.eyebrow).toBe("05 · One");
    expect(renumberEyebrows(FUNDING_DECK)).toEqual(FUNDING_DECK);
  });
});

describe("URLs and ids", () => {
  it.each([
    ["", "img", true],
    ["/publicAssets/a.jpg", "img", true],
    ["//evil.example/a.jpg", "img", false],
    ["https://abc.supabase.co/storage/v1/object/public/a.jpg", "img", true],
    ["https://abc.supabase.co/v.mp4", "media", true],
    ["https://i.ytimg.com/vi/x/0.jpg", "img", true],
    ["https://i.ytimg.com/vi/x/0.jpg", "media", false],
    ["http://abc.supabase.co/a.jpg", "img", false],
    ["https://supabase.co.evil.example/a.jpg", "img", false],
    ["https://example.com/a.jpg", "img", false],
    ["not a url", "img", false],
  ])("cspAllowed(%j, %s) is %s", (url, kind, ok) => {
    expect(cspAllowed(url, kind)).toBe(ok);
  });

  it.each([
    ["/publicAssets/a.jpg", "img", "", true],
    ["https://example.com/a.jpg", "img", "", false],
    ["data:image/png;base64,AAAA", "img", "", true],
    ["data:video/mp4;base64,AAAA", "media", "", false],
    ["blob:https://site/x", "media", "", true],
    ["https://site.example/a.jpg", "img", "https://site.example", true],
    ["https://site.example.evil/a.jpg", "img", "https://site.example", false],
    ["https://example.com/a.jpg", "img", "null", false],
  ])("cspLoads(%j, %s, %j) is %s", (url, kind, origin, ok) => {
    expect(cspLoads(url, kind, origin)).toBe(ok);
  });

  it("builds field ids from slide id and path", () => {
    expect(fieldId("team", "props.people.2.name")).toBe(
      "deck-field-team-props-people-2-name"
    );
    expect(fieldId("s-1", "label")).toBe("deck-field-s-1-label");
  });

  it("is at schema version 1", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

describe("text helpers", () => {
  it("writes the trajectory sentence layouts.test.js checks", () => {
    const { chapters, summary } = FUNDING_DECK.find(
      (e) => e.id === "trajectory"
    ).props;
    expect(summaryFromCounts(chapters)).toBe(summary);
    expect(
      summaryFromCounts({ live: 1, inProgress: 0, funded: 0, unfunded: 2 })
    ).toBe("2 of 3 chapters still need funding");
  });

  it("slugifies titles into link names the table accepts", () => {
    expect(slugify("The Open Brain — Funding deck")).toBe(
      "the-open-brain-funding-deck"
    );
    expect(slugify("  Montréal: Café & Neurones!  ")).toBe(
      "montreal-cafe-neurones"
    );
    expect(slugify("")).toBe("deck");
    expect(slugify("!!!", { fallback: "untitled" })).toBe("untitled");
    const long = slugify("word ".repeat(40), { max: 20 });
    expect(long.length).toBeLessThanOrEqual(20);
    expect(long).toMatch(SLUG_RE);
    expect(long.endsWith("-")).toBe(false);
  });

  it("knows the reserved slugs", () => {
    expect(RESERVED_SLUGS).toEqual(["new", "present", "s", "templates"]);
    for (const s of RESERVED_SLUGS) expect(isReservedSlug(s)).toBe(true);
    expect(isReservedSlug("funding")).toBe(false);
    expect(SLUG_RE.test("funding-2026")).toBe(true);
    expect(SLUG_RE.test("-funding")).toBe(false);
    expect(SLUG_RE.test("Funding")).toBe(false);
  });

  it("sets smart punctuation, once", () => {
    const cases = [
      ['"Open" access', "“Open” access"],
      ["it's the book's", "it’s the book’s"],
      ["'90s and 'quoted'", "’90s and ‘quoted’"],
      ["Free - forever", "Free — forever"],
      ["Wait...", "Wait…"],
      ['She said "it\'s free..."', "She said “it’s free…”"],
    ];
    for (const [input, output] of cases) {
      expect(smartPunctuation(input)).toBe(output);
      expect(smartPunctuation(output)).toBe(output);
    }
    expect(smartPunctuation("")).toBe("");
    expect(smartPunctuation(undefined)).toBe("");
  });
});

describe("bundled decks, starters and the gallery", () => {
  it("bundles the funding deck and the templates", () => {
    expect(BUNDLED_DECKS.funding.entries).toBe(FUNDING_DECK);
    expect(BUNDLED_DECKS.templates.entries).toBe(DECK_TEMPLATES);
    expect(BUNDLED_DECKS.funding.title).toBe("The Open Brain — Funding deck");
  });

  it("starts a deck from blank, the funding deck or every template", () => {
    expect(Object.keys(STARTERS)).toEqual(["blank", "funding", "templates"]);
    for (const starter of Object.values(STARTERS)) {
      expect(starter).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        description: expect.any(String),
      });
      const entries = starter.entries();
      expect(errors(validateDeck(entries))).toEqual([]);
      // Fresh copies every time.
      expect(starter.entries()[0]).not.toBe(entries[0]);
    }
    const [blank] = STARTERS.blank.entries();
    expect(blank).toMatchObject({
      layout: "hero",
      props: { brand: true, size: "display", title: "Deck title" },
    });
    expect(STARTERS.funding.entries()).toEqual(FUNDING_DECK);
    const templates = STARTERS.templates.entries();
    expect(templates.map((e) => e.id)).toEqual(DECK_TEMPLATES.map((e) => e.id));
    expect(templates[6].label).toBe("Image and text");
  });

  it("offers a blank slide per layout, the templates and the funding slides", () => {
    expect(GALLERY.map((t) => t.id)).toEqual([
      "layouts",
      "templates",
      "funding",
    ]);
    const [layouts, templates, funding] = GALLERY;
    expect(layouts.entries).toHaveLength(16);
    expect(layouts.groups.map((g) => g.label)).toEqual([
      "Funding",
      "Templates",
    ]);
    expect(errors(validateDeck(layouts.entries))).toEqual([]);
    expect(templates.entries).toBe(DECK_TEMPLATES);
    expect(funding.entries).toBe(FUNDING_DECK);
  });
});
