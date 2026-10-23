import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VideoEmbed from "../VideoEmbed.vue";
import BreakImages from "../BreakImages.vue";

describe("shared chapter video presentation", () => {
  it("preserves the authored label on legacy placeholder cards", () => {
    const w = mount(BreakImages, {
      props: {
        slug: "placeholder",
        title: "Tom Baden",
        text: "Is our retina really upside down?",
      },
    });
    expect(w.find("figcaption").text()).toBe(
      "Tom Baden — Is our retina really upside down?"
    );
    expect(w.find("source").attributes("src")).toBe(
      "/publicAssets/video/breakSections/placeholder.mp4"
    );
    w.unmount();
  });
  it("loads a privacy-enhanced YouTube player only after play and resets for a new source", async () => {
    const w = mount(VideoEmbed, {
      props: {
        video: {
          youtubeId: "KbA3RLz3xUQ",
          start: 2,
          title: "Huxley",
          caption: "Alan Macfarlane",
          poster: "/huxley.jpg",
        },
      },
    });
    expect(w.find("iframe").exists()).toBe(false);
    expect(w.find("img").attributes("src")).toBe("/huxley.jpg");
    await w.find("button").trigger("click");
    expect(w.find("iframe").attributes("src")).toBe(
      "https://www.youtube-nocookie.com/embed/KbA3RLz3xUQ?autoplay=1&rel=0&start=2"
    );
    expect(w.find("figcaption").text()).toBe("Alan Macfarlane");
    await w.setProps({ video: { youtubeId: "ZSCUbYyrHug", title: "Squid" } });
    expect(w.find("iframe").exists()).toBe(false);
    w.unmount();
  });
  it.each(["neitz-myopia", "dowling-and-werblin"])(
    "retains %s's original source, poster and caption with deliberate native playback",
    (slug) => {
      const w = mount(BreakImages, { props: { slug } });
      const v = w.find("video");
      expect(w.find("source").attributes("src")).toBe(
        `/publicAssets/video/breakSections/${slug}.mp4`
      );
      expect(v.attributes("poster")).toBe(
        `/publicAssets/images/breakVideos/${slug}.png`
      );
      expect(v.attributes("controls")).toBeDefined();
      expect(v.attributes("autoplay")).toBeUndefined();
      expect(v.attributes("muted")).toBeUndefined();
      expect(v.attributes("loop")).toBeUndefined();
      expect(w.find("figcaption").text()).toMatch(/Neitz|Dowling/);
      w.unmount();
    }
  );
});
