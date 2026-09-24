import { describe, expect, it } from "vitest";
import { figureContent, prepareLottie } from "../content.js";

const schema = {
  fields: [
    { key: "title", type: "text" },
    { key: "infoText", type: "textarea" },
    { key: "states", type: "list" },
    { key: "toggle", type: "text" },
    { key: "image", type: "image" },
    {
      key: "video",
      type: "group",
      fields: [
        { key: "title", type: "text" },
        { key: "slug", type: "text" },
      ],
    },
  ],
  defaults: {
    title: "Default title",
    infoText: "Default intro",
    states: ["A", "B", "C"],
    toggle: "Fixed",
    image: "",
    video: { title: "Speaker", slug: "talk" },
  },
};

describe("figureContent", () => {
  it("falls back to the schema's defaults", () => {
    expect(figureContent(schema, {})).toEqual(schema.defaults);
  });

  it("prefers the record's own values over the defaults", () => {
    const out = figureContent(schema, {
      title: "From the row",
      infoText: "From config",
      states: ["Row A", "Row B", "Row C"],
    });
    expect(out.title).toBe("From the row");
    expect(out.infoText).toBe("From config");
    expect(out.states).toEqual(["Row A", "Row B", "Row C"]);
  });

  it("prefers what the chapter page saved over everything", () => {
    const out = figureContent(schema, {
      title: "From the row",
      toggle: "Legacy",
      content: { toggle: "Saved", video: { slug: "other" } },
    });
    expect(out.title).toBe("From the row");
    expect(out.toggle).toBe("Saved");
    expect(out.video).toEqual({ title: "Speaker", slug: "other" });
  });

  it("merges list items one by one and keeps the schema's length", () => {
    const out = figureContent(schema, {
      states: ["Row A", "", "Row C", "Extra"],
      content: { states: [null, "Saved B"] },
    });
    expect(out.states).toEqual(["Row A", "Saved B", "Row C"]);
  });

  it("treats blank strings as unset", () => {
    const out = figureContent(schema, { title: "  ", content: { image: "" } });
    expect(out.title).toBe("Default title");
    expect(out.image).toBe("");
  });
});

describe("prepareLottie", () => {
  const data = {
    assets: [
      { id: "a", u: "images/", p: "motif-medium.jpg", e: 0 },
      { id: "b", u: "images/", p: "other.png", e: 0 },
      { id: "c", u: "", p: "data:image/png;base64,AAAA", e: 1 },
      { id: "d", u: "https://cdn.example/", p: "x.png", e: 0 },
      { id: "comp", layers: [] },
    ],
  };

  it("resolves relative images against the Lottie's folder", () => {
    const out = prepareLottie(data, "/publicAssets/animations/fig.json");
    expect(out.assets[0].u).toBe("/publicAssets/animations/images/");
    expect(out.assets[1].u).toBe("/publicAssets/animations/images/");
  });

  it("leaves embedded and absolute images alone", () => {
    const out = prepareLottie(data, "/publicAssets/animations/fig.json");
    expect(out.assets[2]).toEqual(data.assets[2]);
    expect(out.assets[3]).toEqual(data.assets[3]);
  });

  it("points a replaced image at its new URL", () => {
    const out = prepareLottie(data, "/publicAssets/animations/fig.json", {
      "motif-medium.jpg": "https://storage.example/new.jpg",
    });
    expect(out.assets[0]).toMatchObject({
      u: "",
      p: "https://storage.example/new.jpg",
      e: 1,
    });
  });

  it("doesn't change the data it was given", () => {
    prepareLottie(data, "/publicAssets/animations/fig.json", {
      "motif-medium.jpg": "x",
    });
    expect(data.assets[0].u).toBe("images/");
  });
});
