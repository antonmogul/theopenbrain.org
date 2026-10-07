/*
 * VideoSlide (OPENBRAIN-129 review): an address the site's CSP refuses is
 * never requested, neither the video nor its poster. A refused request is
 * logged as a console error (and failed the /deck smoke check) for the same
 * placeholder funders see in the end.
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import VideoSlide from "../slides/VideoSlide.vue";

const mountVideo = (props) =>
  mount(VideoSlide, { props: { title: "Walkthrough", ...props } });

describe("VideoSlide", () => {
  it("plays an address the CSP allows", () => {
    const w = mountVideo({
      src: "/publicAssets/deck/walkthrough.mp4",
      poster: "/publicAssets/deck/poster.jpg",
    });
    expect(w.get("video").attributes("src")).toBe(
      "/publicAssets/deck/walkthrough.mp4"
    );
    expect(w.get("video").attributes("poster")).toBe(
      "/publicAssets/deck/poster.jpg"
    );
  });

  it("shows the placeholder for a video the CSP refuses, without a request", () => {
    const w = mountVideo({ src: "https://www.youtube.com/watch?v=x" });
    expect(w.find("video").exists()).toBe(false);
    expect(w.find(".video__empty").exists()).toBe(true);
  });

  it("drops a poster the CSP refuses", () => {
    const w = mountVideo({
      src: "/publicAssets/deck/walkthrough.mp4",
      poster: "https://example.com/poster.jpg",
    });
    expect(w.get("video").attributes("poster")).toBeUndefined();
  });
});
