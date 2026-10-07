import { describe, expect, it } from "vitest";
import {
  dashboardLockReason,
  readerLockReason,
  withBlocks,
  withFigureHold,
} from "@/editor/editability.mjs";

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

describe("withFigureHold (OPENBRAIN-131)", () => {
  const content = {
    blocks: [{ type: "text", content: "Figure 1." }],
    animationFlags: { transition: true, start: true },
    note: "kept",
  };

  it("sets the hold beside the other flags, keeping every other key", () => {
    expect(withFigureHold(content, 0.5)).toEqual({
      ...content,
      animationFlags: { transition: true, start: true, hold: 0.5 },
    });
    // An authored 0 is a value, not Automatic.
    expect(withFigureHold(content, 0).animationFlags.hold).toBe(0);
    // The stored row is not touched.
    expect(content.animationFlags).not.toHaveProperty("hold");
  });

  it("removes it for Automatic, dropping animationFlags only if empty", () => {
    const held = withFigureHold(content, "next");
    expect(withFigureHold(held, null)).toEqual(content);
    expect(
      withFigureHold({ blocks: [], animationFlags: { hold: 1 } }, null)
    ).toEqual({ blocks: [] });
  });

  it("starts animationFlags on content without any", () => {
    expect(withFigureHold({ blocks: [] }, 2)).toEqual({
      blocks: [],
      animationFlags: { hold: 2 },
    });
    expect(withFigureHold(null, "next")).toEqual({
      animationFlags: { hold: "next" },
    });
  });

  it("survives a later blocks save (withBlocks)", () => {
    const held = withFigureHold(content, 1);
    expect(withBlocks(held, [{ type: "text", content: "New" }])).toEqual({
      ...held,
      blocks: [{ type: "text", content: "New" }],
    });
  });
});
