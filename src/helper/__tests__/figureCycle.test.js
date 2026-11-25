import { describe, it, expect } from "vitest";
import {
  figureFill,
  figureFocus,
  figureImages,
  figureLoop,
  usesFigureShell,
  stepIndex,
} from "../figureCycle";

describe("figureImages", () => {
  it("normalises objects and bare strings, dropping entries without a src", () => {
    expect(
      figureImages({
        images: ["/a.jpg", { src: "/b.jpg", caption: "B" }, {}, null, ""],
      })
    ).toEqual([
      { src: "/a.jpg", caption: "", alt: "" },
      { src: "/b.jpg", caption: "B", alt: "" },
    ]);
  });

  it("falls back to the row's single image_file_url (imageUrl)", () => {
    expect(figureImages({ imageUrl: "/one.jpg" })).toEqual([
      { src: "/one.jpg", caption: "", alt: "" },
    ]);
  });

  it("prefers config.images over imageUrl, and is empty for a bare slot", () => {
    expect(
      figureImages({ images: ["/set.jpg"], imageUrl: "/one.jpg" })[0].src
    ).toBe("/set.jpg");
    expect(figureImages({ placeholder: true })).toEqual([]);
    expect(figureImages({ images: [] })).toEqual([]);
    expect(figureImages(null)).toEqual([]);
  });
});

describe("usesFigureShell", () => {
  it("routes pending slots and image figures to the shell, and nothing else", () => {
    expect(usesFigureShell({ placeholder: true })).toBe(true);
    expect(usesFigureShell({ images: ["/a.jpg"] })).toBe(true);
    expect(usesFigureShell({ imageUrl: "/a.jpg" })).toBe(true);
    // A Chapter 1 Lottie figure must keep its own renderer.
    expect(usesFigureShell({ id: "animationEyeStructur", states: [] })).toBe(
      false
    );
    expect(usesFigureShell(undefined)).toBe(false);
  });
});

describe("stepIndex", () => {
  it("wraps in both directions and survives an empty set", () => {
    expect(stepIndex(0, 4, 1)).toBe(1);
    expect(stepIndex(3, 4, 1)).toBe(0);
    expect(stepIndex(0, 4, -1)).toBe(3);
    expect(stepIndex(0, 0, 1)).toBe(0);
  });
});

describe("gallery video items", () => {
  it("keeps a valid YouTube id on an item and drops an invalid one", async () => {
    const out = figureImages({
      images: [
        { src: "/still.jpg", youtube: "OmmH4Rp9-to" },
        { src: "/b.jpg", youtube: "not an id" },
      ],
    });
    expect(out[0].youtube).toBe("OmmH4Rp9-to");
    expect(out[1]).not.toHaveProperty("youtube");
  });

  it("builds a muted, looping, privacy-enhanced embed URL", async () => {
    const { youtubeLoopUrl } = await import("../figureCycle");
    const url = youtubeLoopUrl("OmmH4Rp9-to");
    expect(url).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/OmmH4Rp9-to\?/
    );
    expect(url).toContain("mute=1");
    expect(url).toContain("loop=1&playlist=OmmH4Rp9-to");
    expect(youtubeLoopUrl("x")).toBe("");
  });
});

describe("gallery video players", () => {
  it("carries the corner treatment only on a valid video item", () => {
    const images = figureImages({
      images: [
        {
          src: "/rita.webp",
          youtube: "WgkAR-vrJpM",
          play: "player",
          posterPlay: "corner",
        },
        { src: "/plain.jpg", posterPlay: "corner" },
        { src: "/video.jpg", youtube: "WgkAR-vrJpM", posterPlay: "unknown" },
      ],
    });
    expect(images[0].posterPlay).toBe("corner");
    expect(images[1]).not.toHaveProperty("posterPlay");
    expect(images[2]).not.toHaveProperty("posterPlay");
  });
  it("keeps play: player and a start time; defaults to loop", async () => {
    const out = figureImages({
      images: [
        { src: "/a.jpg", youtube: "WgkAR-vrJpM", play: "player", start: 2 },
        { src: "/b.jpg", youtube: "OmmH4Rp9-to" },
        { src: "/c.jpg", youtube: "OmmH4Rp9-to", play: "weird", start: -5 },
      ],
    });
    expect(out[0]).toMatchObject({ play: "player", start: 2 });
    expect(out[1].play).toBe("loop");
    expect(out[2].play).toBe("loop");
    expect(out[2]).not.toHaveProperty("start");
  });

  it("builds a player URL with sound and controls, from a start time", async () => {
    const { youtubePlayerUrl } = await import("../figureCycle");
    const url = youtubePlayerUrl("WgkAR-vrJpM", 2);
    expect(url).toBe(
      "https://www.youtube-nocookie.com/embed/WgkAR-vrJpM?rel=0&playsinline=1&start=2"
    );
    expect(url).not.toContain("mute=1");
    expect(url).not.toContain("autoplay");
    expect(youtubePlayerUrl("bad")).toBe("");
  });
});

describe("gallery views (OPENBRAIN-177)", () => {
  it("opens every set on its first image, unless the row asks for the grid", async () => {
    const { galleryStartView } = await import("../figureCycle");
    // Every set opens on its first image, however many it has.
    expect(galleryStartView(10)).toBe("single");
    expect(galleryStartView(4)).toBe("single");
    expect(galleryStartView(2)).toBe("single");
    // The row's own say (config.galleryStart)...
    expect(galleryStartView(10, "single")).toBe("single");
    expect(galleryStartView(10, "grid")).toBe("grid");
    expect(galleryStartView(2, "grid")).toBe("grid");
    // ...which is ignored when it is not a view, or there is no set.
    expect(galleryStartView(10, "mosaic")).toBe("single");
    expect(galleryStartView(1, "grid")).toBe("single");
    expect(galleryStartView(0)).toBe("single");
  });

  it("lays a grid out in columns that suit the count, three at most on a phone", async () => {
    const { gridColumns } = await import("../figureCycle");
    expect(gridColumns(2)).toEqual({ wide: 2, narrow: 2 });
    expect(gridColumns(3)).toEqual({ wide: 3, narrow: 2 });
    expect(gridColumns(4)).toEqual({ wide: 2, narrow: 2 });
    expect(gridColumns(5)).toEqual({ wide: 3, narrow: 3 });
    expect(gridColumns(6)).toEqual({ wide: 3, narrow: 3 });
    expect(gridColumns(10)).toEqual({ wide: 4, narrow: 3 });
    expect(gridColumns(12)).toEqual({ wide: 4, narrow: 3 });
    expect(gridColumns(20)).toEqual({ wide: 5, narrow: 3 });
  });
});

describe("figure loops (OPENBRAIN-201)", () => {
  const LOOP = {
    webm: "/publicAssets/video/foundations/plato-aristotle-loop.webm",
    mp4: "/publicAssets/video/foundations/plato-aristotle-loop.mp4",
    width: 960,
    height: 1280,
  };

  it("keeps a film of our own on its image, poster in src", () => {
    const [img] = figureImages({
      images: [{ src: "/poster.webp", alt: "Plato", loop: LOOP }],
    });
    expect(img).toEqual({
      src: "/poster.webp",
      caption: "",
      alt: "Plato",
      loop: LOOP,
    });
  });

  it("takes one source, and drops a shape it can't use", () => {
    expect(figureLoop({ mp4: "/a.mp4", width: 0, height: 10 })).toEqual({
      mp4: "/a.mp4",
    });
    expect(figureLoop({ webm: "/a.webm" })).toEqual({ webm: "/a.webm" });
  });

  it("refuses anything that isn't a same-origin path", () => {
    expect(figureLoop(null)).toBeNull();
    expect(figureLoop("/a.mp4")).toBeNull();
    expect(figureLoop({})).toBeNull();
    expect(figureLoop({ mp4: "https://example.com/a.mp4" })).toBeNull();
    expect(figureLoop({ mp4: "//example.com/a.mp4" })).toBeNull();
    expect(figureLoop({ mp4: "javascript:alert(1)" })).toBeNull();
  });

  it("leaves a YouTube item alone", () => {
    const [img] = figureImages({
      images: [{ src: "/p.jpg", youtube: "abcdefghijk", loop: LOOP }],
    });
    expect(img.youtube).toBe("abcdefghijk");
    expect(img.loop).toBeUndefined();
  });
});

describe("a figure that fills its pane (OPENBRAIN-84)", () => {
  const LOOP = { mp4: "/a.mp4", width: 960, height: 1280 };
  const film = { images: [{ src: "/poster.webp", loop: LOOP }] };

  it("reads a focal point as two percentages, the centre otherwise", () => {
    expect(figureFocus("50% 15%")).toBe("50% 15%");
    expect(figureFocus("  0%   100% ")).toBe("0% 100%");
    expect(figureFocus("33.5% 7%")).toBe("33.5% 7%");
    for (const bad of [
      undefined,
      null,
      "",
      "top",
      "50%",
      "50 15",
      "50% 150%",
      "-5% 10%",
      "50% 15%; background: url(x)",
      { x: 50, y: 15 },
    ])
      expect(figureFocus(bad), String(bad)).toBe("50% 50%");
  });

  it("is off unless the row says fill: true", () => {
    expect(figureFill(film)).toBe("");
    expect(figureFill({ ...film, focus: "50% 15%" })).toBe("");
    expect(figureFill({ ...film, fill: "true" })).toBe("");
    expect(figureFill({ ...film, fill: 1 })).toBe("");
    expect(figureFill(null)).toBe("");
  });

  it("gives a single picture or film its focal point, the centre by default", () => {
    expect(figureFill({ ...film, fill: true, focus: "50% 15%" })).toBe(
      "50% 15%"
    );
    expect(figureFill({ ...film, fill: true })).toBe("50% 50%");
    expect(figureFill({ imageUrl: "/still.jpg", fill: true })).toBe("50% 50%");
  });

  it("leaves galleries, YouTube items and rows without artwork whole", () => {
    expect(
      figureFill({ images: [{ src: "/a.jpg" }, { src: "/b.jpg" }], fill: true })
    ).toBe("");
    expect(
      figureFill({
        images: [{ src: "/p.jpg", youtube: "abcdefghijk" }],
        fill: true,
      })
    ).toBe("");
    expect(figureFill({ placeholder: true, fill: true })).toBe("");
  });
});

describe("an image's own focal point (OPENBRAIN-87)", () => {
  it("keeps focus on an image that has one, written as two percentages", () => {
    const [video, plate, bad, bare] = figureImages({
      images: [
        { src: "/a.webp", youtube: "g4-6A8u8QBc", focus: " 50% 30% " },
        { src: "/b.jpg", focus: "20% 0%" },
        { src: "/c.jpg", focus: "top" },
        "/d.jpg",
      ],
    });
    expect(video.focus).toBe("50% 30%");
    expect(plate.focus).toBe("20% 0%");
    expect(bad).not.toHaveProperty("focus");
    expect(bare).not.toHaveProperty("focus");
  });

  it("is not the figure's fill: an image's focus alone fills nothing", () => {
    expect(figureFill({ images: [{ src: "/a.jpg", focus: "20% 0%" }] })).toBe(
      ""
    );
  });
});

describe("an image's own figure number (OPENBRAIN-202)", () => {
  it("keeps figureNumber and title on an image that has one", () => {
    expect(
      figureImages({
        images: [
          { src: "/a.jpg", figureNumber: "D", title: " Paris " },
          { src: "/b.jpg", title: "Lund" },
        ],
      })
    ).toEqual([
      {
        src: "/a.jpg",
        caption: "",
        alt: "",
        figureNumber: "D",
        title: "Paris",
      },
      { src: "/b.jpg", caption: "", alt: "" },
    ]);
  });
});
