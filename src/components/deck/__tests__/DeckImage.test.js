/*
 * DeckImage: an image that fails to load falls back to the labelled
 * placeholder, and a new src gets another try (OPENBRAIN-129).
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DeckImage from "../DeckImage.vue";

const mountImage = (props) =>
  mount(DeckImage, {
    props: { alt: "Headshot", placeholder: "Stuart — headshot", ...props },
  });

describe("DeckImage", () => {
  it("shows the image while it loads", () => {
    const w = mountImage({ src: "/publicAssets/images/00-matisse-bg.jpg" });
    expect(w.find("img").attributes("alt")).toBe("Headshot");
    expect(w.find(".deck-image--empty").exists()).toBe(false);
  });

  it("shows the placeholder when there is no src", () => {
    const w = mountImage({ src: "" });
    expect(w.find("img").exists()).toBe(false);
    expect(w.get(".deck-image--empty").attributes("aria-label")).toBe(
      "Stuart — headshot"
    );
  });

  it("falls back to the placeholder when the image fails", async () => {
    const w = mountImage({ src: "/publicAssets/deck/missing.jpg" });
    await w.get("img").trigger("error");
    expect(w.find("img").exists()).toBe(false);
    expect(w.get(".deck-image--empty").text()).toContain("Stuart — headshot");
  });

  it("tries again when the src changes", async () => {
    const w = mountImage({ src: "/publicAssets/deck/missing.jpg" });
    await w.get("img").trigger("error");
    await w.setProps({ src: "/publicAssets/images/00-matisse-bg.jpg" });
    expect(w.get("img").attributes("src")).toBe(
      "/publicAssets/images/00-matisse-bg.jpg"
    );
  });

  it("never requests an address the site's CSP refuses", () => {
    for (const src of [
      "https://media.licdn.com/dms/image/x.jpg",
      "http://example.com/x.jpg",
    ]) {
      const w = mountImage({ src });
      expect(w.find("img").exists(), src).toBe(false);
      expect(w.get(".deck-image--empty").text()).toContain("Stuart — headshot");
    }
    // What the CSP lets through still loads: a Supabase upload, data: URIs.
    for (const src of [
      "https://abc.supabase.co/storage/v1/object/public/chapter-media/decks/x/a.jpg",
      "data:image/png;base64,AAAA",
    ])
      expect(mountImage({ src }).find("img").exists(), src).toBe(true);
  });
});
