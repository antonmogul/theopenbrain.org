import { describe, expect, it } from "vitest";
import {
  dashboardLockReason,
  readerLockReason,
  withBlocks,
} from "@/editor/editability";

describe("readerLockReason (OPENBRAIN-58)", () => {
  it("lets plain text through", () => {
    expect(
      readerLockReason({ blocks: [{ type: "text", content: "Hi" }] })
    ).toBeNull();
    expect(readerLockReason({ blocks: [] })).toBeNull();
    expect(readerLockReason(null)).toBeNull();
  });

  it("locks paragraphs with blocks the inline editor would flatten", () => {
    const reason = readerLockReason({
      blocks: [
        { type: "text", content: "Rods" },
        { type: "citation_ref", number: 3 },
        { type: "citation_ref", number: 4 },
        { type: "image", src: "x.png" },
      ],
    });
    expect(reason).toContain("citations and an image");
    expect(reason).toContain("new chapter editor");
  });
});

describe("dashboardLockReason", () => {
  it("allows what its converter keeps", () => {
    expect(
      dashboardLockReason({
        blocks: [
          { type: "heading", level: 2, content: "A" },
          { type: "list", items: ["a"] },
          { type: "image", src: "a.png", alt: "a" },
        ],
      })
    ).toBeNull();
  });

  it("locks citations, widgets and captioned images", () => {
    expect(
      dashboardLockReason({ blocks: [{ type: "citation_ref", number: 1 }] })
    ).toContain("citations");
    expect(
      dashboardLockReason({ blocks: [{ type: "widget", widgetId: "sdt" }] })
    ).toContain("a widget");
    expect(
      dashboardLockReason({
        blocks: [{ type: "image", src: "a.png", caption: "Fig" }],
      })
    ).toContain("an image");
  });
});

describe("withBlocks", () => {
  it("replaces blocks and keeps every other key", () => {
    const next = withBlocks(
      { blocks: [{ type: "text" }], animationFlags: { transition: true } },
      [{ type: "text", content: "New" }]
    );
    expect(next).toEqual({
      blocks: [{ type: "text", content: "New" }],
      animationFlags: { transition: true },
    });
  });
});
