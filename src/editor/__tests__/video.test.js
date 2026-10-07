import { describe, expect, it } from "vitest";
import {
  parseYouTube,
  youTubeStart,
  youTubeEmbedUrl,
} from "@/editor/video.mjs";

describe("parseYouTube (OPENBRAIN-70 D2)", () => {
  it("reads the links authors paste", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=g4-6A8u8QBc",
      "https://youtube.com/watch?v=g4-6A8u8QBc&t=2s",
      "https://m.youtube.com/watch?v=g4-6A8u8QBc",
      "https://youtu.be/g4-6A8u8QBc?t=10",
      "https://www.youtube.com/embed/g4-6A8u8QBc",
      "https://www.youtube.com/shorts/g4-6A8u8QBc",
      "https://www.youtube-nocookie.com/embed/g4-6A8u8QBc",
      "g4-6A8u8QBc",
    ])
      expect(parseYouTube(url)).toBe("g4-6A8u8QBc");
  });

  it("rejects everything else", () => {
    for (const url of [
      "",
      "not a url",
      "https://vimeo.com/123456789",
      "https://www.youtube.com/watch?v=short",
      "https://www.youtube.com/channel/UC123",
    ])
      expect(parseYouTube(url)).toBeNull();
  });

  it("keeps a start time", () => {
    expect(youTubeStart("https://youtu.be/g4-6A8u8QBc?t=90")).toBe(90);
    expect(youTubeStart("https://youtube.com/watch?v=x&t=1m30s")).toBe(90);
    expect(youTubeStart("g4-6A8u8QBc")).toBe(0);
    expect(youTubeEmbedUrl("g4-6A8u8QBc", 90)).toBe(
      "https://www.youtube-nocookie.com/embed/g4-6A8u8QBc?autoplay=1&rel=0&start=90"
    );
  });
});
