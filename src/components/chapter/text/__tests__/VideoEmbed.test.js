import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VideoEmbed from "../VideoEmbed.vue";
import { breakVideos } from "@/stories/breakVideoFixtures";
import BreakImages from "../BreakImages.vue";

describe("shared chapter video presentation", () => {
  it("shows one corner play control on a clean poster and keeps keyboard playback", async () => {
    const w = mount(VideoEmbed, {
      props: {
        video: {
          youtubeId: "WgkAR-vrJpM",
          title: "Rita",
          poster: "/rita.webp",
          posterPlay: "corner",
          start: 2,
        },
      },
    });
    expect(w.find("button").classes()).toContain("ve-poster--corner");
    expect(w.find("button").attributes("aria-label")).toBe("Play video: Rita");
    expect(w.findAll(".ve-play")).toHaveLength(1);
    expect(w.find("iframe").exists()).toBe(false);
    await w.find("button").trigger("click");
    expect(w.find("iframe").attributes("src")).toContain(
      "WgkAR-vrJpM?autoplay=1&rel=0&start=2"
    );
    w.unmount();
  });
  it("fills the frame with the poster, around its focal point, under the one play mark", async () => {
    const video = {
      youtubeId: "g4-6A8u8QBc",
      title: "Brenda",
      poster: "/b.webp",
    };
    const w = mount(VideoEmbed, { props: { video } });
    const poster = w.get(".ve-poster-image");
    expect(poster.element.style.objectPosition).toBe("50% 50%");
    expect(w.get(".ve-play").classes()).toContain("play-mark");
    expect(w.text()).not.toContain("▶");
    await w.setProps({ video: { ...video, focus: "50% 30%" } });
    expect(poster.element.style.objectPosition).toBe("50% 30%");
    await w.setProps({ video: { ...video, focus: "top" } });
    expect(poster.element.style.objectPosition).toBe("50% 50%");
    await w.setProps({ video: { ...video, posterPlay: "corner" } });
    expect(w.get(".ve-play").classes()).toContain("play-mark");
    w.unmount();
  });
  it("keeps the active player when a gallery redraw supplies the same source", async () => {
    const video = { youtubeId: "KbA3RLz3xUQ", title: "Huxley", start: 2 };
    const w = mount(VideoEmbed, { props: { video } });
    await w.get("button").trigger("click");
    const iframe = w.get("iframe").element;
    await w.setProps({ video: { ...video, title: "Andrew Huxley" } });
    expect(w.get("iframe").element).toBe(iframe);
    expect(w.get("iframe").attributes("title")).toBe("Andrew Huxley");
    w.unmount();
  });
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
      const w = mount(BreakImages, { props: { video: breakVideos[slug] } });
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
