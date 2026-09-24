import { describe, expect, it } from "vitest";
import {
  contentChanges,
  fetchLottie,
  figureContent,
  prepareLottie,
  versionedUrl,
} from "../content.js";

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
      optional: true,
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

describe("figureContent, defensively", () => {
  it("resolves an optional part switched off to null", () => {
    expect(
      figureContent(schema, { content: { video: false } }).video
    ).toBeNull();
  });

  it("ignores values of the wrong type", () => {
    const out = figureContent(schema, {
      toggle: true,
      states: "ABC",
      content: { title: 42, states: [7, "Saved B"], video: "x" },
    });
    expect(out.title).toBe("Default title");
    expect(out.toggle).toBe("Fixed");
    expect(out.states).toEqual(["A", "Saved B", "C"]);
    expect(out.video).toEqual(schema.defaults.video);
  });
});

describe("contentChanges", () => {
  const inherited = figureContent(schema, {});
  const edit = (patch) => ({ ...structuredCloneSafe(inherited), ...patch });
  function structuredCloneSafe(v) {
    return JSON.parse(JSON.stringify(v));
  }

  it("saves nothing when nothing changed", () => {
    expect(contentChanges(schema, edit({}), inherited)).toEqual({});
  });

  it("keeps changed list items and nulls the rest", () => {
    const form = edit({ states: ["A", "b!", "C"] });
    expect(contentChanges(schema, form, inherited)).toEqual({
      states: [null, "b!"],
    });
  });

  it("keeps only changed group fields", () => {
    const form = edit({ video: { title: "Speaker", slug: "other" } });
    expect(contentChanges(schema, form, inherited)).toEqual({
      video: { slug: "other" },
    });
  });

  it("saves an optional part switched off as false", () => {
    expect(
      contentChanges(schema, edit({}), inherited, { video: true })
    ).toEqual({ video: false });
  });

  it("round-trips: what it saves resolves to the form", () => {
    const form = edit({ states: ["A", "b!", "C"], toggle: "Glasses" });
    const saved = contentChanges(schema, form, inherited);
    expect(figureContent(schema, { content: saved })).toEqual(form);
  });
});

describe("versionedUrl", () => {
  it("adds the artwork version as a query", () => {
    expect(versionedUrl("/a/fig.json", "v0.2.3")).toBe("/a/fig.json?v=v0.2.3");
    expect(versionedUrl("/a/fig.json?x=1", "v1")).toBe("/a/fig.json?x=1&v=v1");
    expect(versionedUrl("/a/fig.json", undefined)).toBe("/a/fig.json");
  });

  it("doesn't change where images resolve", () => {
    const out = prepareLottie(
      { assets: [{ id: "a", u: "images/", p: "x.jpg", e: 0 }] },
      "/publicAssets/animations/fig.json?v=v0.2.3"
    );
    expect(out.assets[0].u).toBe("/publicAssets/animations/images/");
  });
});

describe("fetchLottie", () => {
  const answer = (ok, type, status = 200) =>
    (global.fetch = () =>
      Promise.resolve({
        ok,
        status,
        headers: { get: () => type },
        json: () => Promise.resolve({ op: 10 }),
      }));

  it("returns the parsed file", async () => {
    answer(true, "application/json");
    expect(await fetchLottie("/f.json")).toEqual({ op: 10 });
  });

  it("treats the app page served for a missing file as not found", async () => {
    answer(true, "text/html; charset=utf-8");
    await expect(fetchLottie("/f.json")).rejects.toThrow(/not a Lottie file/);
  });

  it("reports an HTTP error", async () => {
    answer(false, "text/plain", 404);
    await expect(fetchLottie("/f.json")).rejects.toThrow(/HTTP 404/);
  });
});
