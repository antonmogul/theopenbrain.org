import { afterEach, describe, expect, it } from "vitest";
import {
  FIGURE_BANDS,
  FIGURE_HOLD_OPTIONS,
  FIGURE_HOLDS,
  defaultFigureHold,
  figureEnd,
  figureHoldLabel,
  figureRecordFor,
  figureRecordOfMedia,
  historyFigureEnd,
  normalizeFigureHold,
  parseFigureHold,
  resolveFigureHold,
} from "../historyFigureTiming";
import { READER_WIDE_QUERY } from "../readerLayout";
import animationJSON from "@/assets/json_backend/animations.json";
const records = [
  { id: "animationFoundationsFig9", imageUrl: "/broca.jpg" },
  { id: "animationFoundationsFig10", imageUrl: "/fritsch.jpg" },
];
function fixture() {
  document.body.innerHTML = `<section id="s"><span id="triggerAnimationFoundationsFig9"></span><div class="prose"></div><span id="triggerAnimationFoundationsFig10"></span></section>`;
  const section = document.querySelector("section");
  section.getBoundingClientRect = () => ({ top: 0, bottom: 1800 });
  const [first, second] = section.querySelectorAll("span");
  first.getBoundingClientRect = () => ({ top: 300, bottom: 340 });
  second.getBoundingClientRect = () => ({ top: 1100, bottom: 1200 });
  return { section, first, second, triggers: [first, second] };
}
const viewport = { innerHeight: 800, scrollY: 200 };
afterEach(() => {
  document.body.innerHTML = "";
});
describe("History static-figure reading intervals", () => {
  it("keeps a short Broca paragraph's figure up to the next authored figure", () => {
    const { first, triggers } = fixture();
    expect(historyFigureEnd(first, triggers, records, viewport)).toBe(900);
  });
  it("holds the last figure only to the current section boundary", () => {
    const { second, triggers } = fixture();
    expect(historyFigureEnd(second, triggers, records, viewport)).toBe(1600);
  });
  it.each(["fb-slot", "wb"])(
    "stops at a %s boundary so figures cannot linger across a breakout",
    (className) => {
      const { section, first, triggers } = fixture();
      const barrier = document.createElement("div");
      barrier.className = className;
      barrier.getBoundingClientRect = () => ({ top: 750, bottom: 1000 });
      section.appendChild(barrier);
      expect(historyFigureEnd(first, triggers, records, viewport)).toBe(550);
    }
  );
  it("remeasures boundaries after viewport or chapter reflow", () => {
    const { first, second, triggers } = fixture();
    second.getBoundingClientRect = () => ({ top: 1500, bottom: 1600 });
    expect(
      historyFigureEnd(first, triggers, records, {
        innerHeight: 1000,
        scrollY: 200,
      })
    ).toBe(1200);
  });
  // (A Retina still with an image used to be listed here too: since
  // OPENBRAIN-131 every still image holds; see "the default by figure kind".)
  it.each([
    { id: "animationFoundationsFig9", scroll: true, imageUrl: "/broca.jpg" },
    {
      id: "animationFoundationsFig9",
      fullscreen: true,
      imageUrl: "/broca.jpg",
    },
    { id: "animationFoundationsFig9", placeholder: true },
  ])("leaves animation/non-image timing alone: $id", (record) => {
    const { first, triggers } = fixture();
    first.id = `trigger${record.id}`;
    expect(historyFigureEnd(first, triggers, [record], viewport)).toBe(
      "bottom 400"
    );
  });
  it("is figureEnd under its old name", () => {
    expect(historyFigureEnd).toBe(figureEnd);
  });
});

/* OPENBRAIN-131: History's rule by figure kind in every chapter, plus the
   author's "Stays" (content.animationFlags.hold → data-figure-hold). The
   fixture's two triggers as other figures: `a` at 300–340, `b` at
   1100–1200, in a section ending at 1800. Reading line 400 and scrollY 200,
   so a boundary at Y ends the figure at Y - 200; today `a` ends at
   "bottom 400". */
function figures(a, b = { id: "animationNext" }) {
  const set = fixture();
  set.first.id = `trigger${a.id}`;
  set.second.id = `trigger${b.id}`;
  return { ...set, list: [a, b] };
}
const lottie = { id: "animationEyeStructur", loop: true };
const image = {
  id: "animationAttentionV2Fig1",
  placeholder: true,
  imageUrl: "/publicAssets/images/attention/fig01.jpeg",
  images: [{ src: "/publicAssets/images/attention/fig01.jpeg" }],
};

describe("figureEnd: the default by figure kind", () => {
  it("holds an Attention still image until the next figure", () => {
    const { first, triggers, list } = figures(image);
    expect(figureEnd(first, triggers, list, viewport)).toBe(900);
  });
  it("holds a Retina still (image_file_url only) the same way", () => {
    const { first, triggers, list } = figures({
      id: "animationColorOpponency",
      illuImage: true,
      imageUrl: "/publicAssets/images/illuImages/animationColorOpponency.png",
    });
    expect(figureEnd(first, triggers, list, viewport)).toBe(900);
  });
  it("leaves a Lottie with its paragraph", () => {
    const { first, triggers, list } = figures(lottie);
    expect(figureEnd(first, triggers, list, viewport)).toBe("bottom 400");
  });
  it.each([
    ["an Artwork pending placeholder", { placeholder: true }],
    ["a widget figure", { widgetId: "sdt", imageUrl: "/thumb.png" }],
    ["a figure with no record", null],
  ])("leaves %s with its paragraph", (_, extra) => {
    const { first, triggers } = figures({ id: "animationThing" });
    const list = extra ? [{ id: "animationThing", ...extra }] : [];
    expect(figureEnd(first, triggers, list, viewport)).toBe("bottom 400");
  });
});

describe("figureEnd: an author's hold", () => {
  it("authored 0 keeps an image with its paragraph", () => {
    const { first, triggers, list } = figures(image);
    first.dataset.figureHold = "0";
    expect(figureEnd(first, triggers, list, viewport)).toBe("bottom 400");
  });
  it("authored ½ screen holds a Lottie half a screen past its paragraph", () => {
    const { first, triggers, list } = figures(lottie);
    first.dataset.figureHold = "0.5";
    // 340 + 0.5 × 800 = 740
    expect(figureEnd(first, triggers, list, viewport)).toBe(540);
  });
  it("caps ½ screen at the next figure's trigger", () => {
    const { first, second, triggers, list } = figures(lottie);
    second.getBoundingClientRect = () => ({ top: 600, bottom: 700 });
    first.dataset.figureHold = "0.5";
    // 740 would run past the next figure at 600.
    expect(figureEnd(first, triggers, list, viewport)).toBe(400);
  });
  it("caps 2 screens at the next figure, and at a band before it", () => {
    const { section, first, triggers, list } = figures(image);
    first.dataset.figureHold = "2";
    expect(figureEnd(first, triggers, list, viewport)).toBe(900);
    const band = document.createElement("aside");
    band.className = "wb";
    band.getBoundingClientRect = () => ({ top: 650, bottom: 900 });
    section.appendChild(band);
    expect(figureEnd(first, triggers, list, viewport)).toBe(450);
  });
  it("caps a hold at the section's end", () => {
    const { second, triggers, list } = figures(lottie, {
      ...lottie,
      id: "animationLast",
    });
    second.dataset.figureHold = "next";
    // The section's last figure: to the section's end (1800), never past.
    expect(figureEnd(second, triggers, list, viewport)).toBe(1600);
    second.dataset.figureHold = "2";
    expect(figureEnd(second, triggers, list, viewport)).toBe(1600);
  });
  it("authored 1 screen on an image stops short of the next figure", () => {
    const { first, second, triggers, list } = figures(image);
    second.getBoundingClientRect = () => ({ top: 1500, bottom: 1600 });
    first.dataset.figureHold = "1";
    // 340 + 800 = 1140, before the next figure at 1500.
    expect(figureEnd(first, triggers, list, viewport)).toBe(940);
  });
  it('authored "next" holds an Artwork pending placeholder too', () => {
    const { first, triggers } = figures({ id: "animationStressFig2" });
    first.dataset.figureHold = "next";
    const list = [{ id: "animationStressFig2", placeholder: true }];
    expect(figureEnd(first, triggers, list, viewport)).toBe(900);
  });
  it.each(["forever", "-1", "3", "", "true"])(
    "treats a malformed hold (%j) as Automatic",
    (raw) => {
      const held = figures(image);
      held.first.dataset.figureHold = raw;
      expect(figureEnd(held.first, held.triggers, held.list, viewport)).toBe(
        900
      );
      const kept = figures(lottie);
      kept.first.dataset.figureHold = raw;
      expect(figureEnd(kept.first, kept.triggers, kept.list, viewport)).toBe(
        "bottom 400"
      );
    }
  );
  it.each([
    ["scroll-scrubbed", { scroll: true }],
    ["full-screen", { fullscreen: true }],
    ["transition", { isTransition: true }],
  ])("ignores a hold on a %s figure", (_, kind) => {
    const { first, triggers, list } = figures({ ...image, ...kind });
    for (const raw of ["next", "2", "0.5"]) {
      first.dataset.figureHold = raw;
      expect(figureEnd(first, triggers, list, viewport)).toBe("bottom 400");
    }
  });
});

describe("figureEnd: nested triggers", () => {
  // A subsection header's figure wraps the whole subsection, its own
  // paragraphs' figures included (SubSection.vue).
  function nested() {
    document.body.innerHTML = `<section><span id="triggerAnimationHeader"><h3></h3><span id="triggerAnimationInner"></span></span><span id="triggerAnimationNext"></span></section>`;
    const section = document.querySelector("section");
    const [header, inner, next] = section.querySelectorAll("span");
    section.getBoundingClientRect = () => ({ top: 0, bottom: 1800 });
    header.getBoundingClientRect = () => ({ top: 300, bottom: 1000 });
    inner.getBoundingClientRect = () => ({ top: 500, bottom: 600 });
    next.getBoundingClientRect = () => ({ top: 1100, bottom: 1200 });
    return { header, inner, triggers: [header, inner, next] };
  }
  const list = [
    { ...image, id: "animationHeader" },
    { ...lottie, id: "animationInner" },
    { ...lottie, id: "animationNext" },
  ];
  it("doesn't cut a held container at the figures inside it", () => {
    const { header, triggers } = nested();
    // The next figure outside it (1100), not the one inside (500).
    expect(figureEnd(header, triggers, list, viewport)).toBe(900);
  });
  it("still caps a held inner figure at the next figure after it", () => {
    const { inner, triggers } = nested();
    inner.dataset.figureHold = "next";
    expect(figureEnd(inner, triggers, list, viewport)).toBe(900);
  });
});

describe("figureEnd: bands inside the held trigger", () => {
  // A paragraph whose own image sits inside its trigger span (InlineImages
  // is a FullBleed .fb-slot; SectionComp, SubSubSection), or a subsection
  // header's figure, whose span wraps the subsection's widgets and breaks.
  // Trigger 300–1300, the band inside it at 900, the next figure at 3000,
  // the section's end at 5000; reading line 400, scrollY 0.
  const flat = { innerHeight: 800, scrollY: 0 };
  function held(bandClass, record) {
    document.body.innerHTML = `<section><span id="triggerAnimationHeld"><p></p><div class="${bandClass}"></div></span><span id="triggerAnimationNext"></span></section>`;
    const section = document.querySelector("section");
    const [trigger, next] = section.querySelectorAll("span");
    const band = section.querySelector("div");
    section.getBoundingClientRect = () => ({ top: 0, bottom: 5000 });
    trigger.getBoundingClientRect = () => ({ top: 300, bottom: 1300 });
    band.getBoundingClientRect = () => ({ top: 900, bottom: 1250 });
    next.getBoundingClientRect = () => ({ top: 3000, bottom: 3100 });
    const list = [
      { ...record, id: "animationHeld" },
      { ...lottie, id: "animationNext" },
    ];
    return { trigger, triggers: [trigger, next], list };
  }
  // Its paragraph's window: the trigger's bottom (1300) at the reading line.
  const paragraphWindow = 1300 - 400;

  it.each(["fb-slot", "wb"])(
    "a longer hold never ends a figure sooner (%s inside it)",
    (bandClass) => {
      const { trigger, triggers, list } = held(bandClass, lottie);
      trigger.dataset.figureHold = "0";
      expect(figureEnd(trigger, triggers, list, flat)).toBe("bottom 400");
      // + 1 screen: 1300 + 800, not the band's top (900).
      trigger.dataset.figureHold = "1";
      expect(figureEnd(trigger, triggers, list, flat)).toBe(1700);
      trigger.dataset.figureHold = "next";
      expect(figureEnd(trigger, triggers, list, flat)).toBe(2600);
      for (const raw of ["0.5", "1", "2", "next"]) {
        trigger.dataset.figureHold = raw;
        expect(figureEnd(trigger, triggers, list, flat)).toBeGreaterThan(
          paragraphWindow
        );
      }
    }
  );

  it("holds a still on Automatic past its own image, to the next figure", () => {
    const { trigger, triggers, list } = held("fb-slot", image);
    expect(figureEnd(trigger, triggers, list, flat)).toBe(2600);
  });

  it("holds a subsection header's still across the widget in its subsection", () => {
    document.body.innerHTML = `<section><span id="triggerAnimationHeader"><h3></h3><aside class="wb"></aside><div class="fb-slot"></div></span><span id="triggerAnimationNext"></span></section>`;
    const section = document.querySelector("section");
    const [header, next] = section.querySelectorAll("span");
    section.getBoundingClientRect = () => ({ top: 0, bottom: 6000 });
    header.getBoundingClientRect = () => ({ top: 300, bottom: 4000 });
    section.querySelector(".wb").getBoundingClientRect = () => ({
      top: 1200,
      bottom: 1600,
    });
    section.querySelector(".fb-slot").getBoundingClientRect = () => ({
      top: 2500,
      bottom: 2900,
    });
    next.getBoundingClientRect = () => ({ top: 4500, bottom: 4600 });
    const list = [
      { ...image, id: "animationHeader" },
      { ...lottie, id: "animationNext" },
    ];
    expect(figureEnd(header, [header, next], list, flat)).toBe(4100);
  });

  it("never ends before its paragraph's window, whatever lies below its top", () => {
    // A band outside the trigger that measures above its bottom (an
    // overlapping layout): the hold still lasts to the trigger's bottom.
    const { trigger, triggers, list } = held("prose", image);
    const band = document.createElement("div");
    band.className = "wb";
    band.getBoundingClientRect = () => ({ top: 800, bottom: 1400 });
    trigger.parentNode.appendChild(band);
    expect(figureEnd(trigger, triggers, list, flat)).toBe(paragraphWindow);
  });
});

describe("figureEnd: what counts as a full-width band", () => {
  it.each([
    ["a wide image, break or full-screen figure", "fb-slot", 450],
    ["a widget band", "wb", 450],
    ["an image in the text column", "fb-slot fb-slot--column", 900],
  ])("%s", (_, className, end) => {
    const { section, first, triggers, list } = figures(image);
    const band = document.createElement("div");
    band.className = className;
    band.getBoundingClientRect = () => ({ top: 650, bottom: 900 });
    section.appendChild(band);
    expect(figureEnd(first, triggers, list, viewport)).toBe(end);
  });

  it("matches FullBleed's slot only when it is full width", () => {
    const slot = (className) => {
      const el = document.createElement("div");
      el.className = className;
      return el.matches(FIGURE_BANDS);
    };
    expect(slot("fb-slot")).toBe(true);
    expect(slot("fb-slot fb-slot--vacated")).toBe(true);
    expect(slot("fb-slot fb-slot--column")).toBe(false);
    expect(slot("wb wb--breakout")).toBe(true);
  });
});

describe("figureEnd: the Retina's stills from animations.json", () => {
  // IllustrationsComp falls back to animations.json when the animations
  // fetch is empty or fails: `illuImage` is a PNG the pane draws, with no
  // imageUrl. They hold as they do from the database.
  const json = (id) => animationJSON.animations.find((a) => a.id === id);

  it.each(["animationColorOpponency", "animationONOFFLamina"])(
    "holds %s until the next figure",
    (id) => {
      expect(json(id)).toMatchObject({ illuImage: true });
      expect(json(id)).not.toHaveProperty("imageUrl");
      expect(defaultFigureHold(json(id))).toBe(Infinity);
      const { first, triggers, list } = figures(json(id));
      expect(figureEnd(first, triggers, list, viewport)).toBe(900);
    }
  );

  it("leaves a video with a poster (illuImage + youtubeID) with its paragraph", () => {
    const waves = json("animationWavesOfActivity");
    expect(waves).toMatchObject({
      illuImage: true,
      youtubeID: expect.any(String),
    });
    expect(defaultFigureHold(waves)).toBe(0);
    expect(
      defaultFigureHold({ ...waves, youtubeID: undefined, videoUrl: "/v.mp4" })
    ).toBe(0);
  });
});

describe("figureEnd: figures the chapter editor made", () => {
  // Uploads and conversions make keys with no "animation" prefix
  // (`image-<id>`, `widget-<id>`, `youtube-<id>`). Sections and subsections
  // still build the trigger as `triggerAnimation` + the key, so it reads
  // `triggerAnimationimage-ab12`; sub-subsections as `trigger` + the key.
  const upload = { id: "image-ab12", imageUrl: "/uploads/ab12.jpg" };

  it("finds the record by its key, with or without the prefix", () => {
    const list = [upload, ...records];
    expect(figureRecordFor("Animationimage-ab12", list)).toBe(upload);
    expect(figureRecordFor("image-ab12", list)).toBe(upload);
    expect(figureRecordFor("AnimationFoundationsFig9", list)).toBe(records[0]);
    expect(figureRecordFor("animationFoundationsFig9", list)).toBe(records[0]);
    // A transition spacer names no record of its own.
    expect(figureRecordFor("AnimationFoundationsFig9Transition", list)).toBe(
      undefined
    );
    expect(figureRecordFor("", list)).toBe(undefined);
  });

  it("holds an uploaded still and applies an authored hold to it", () => {
    const { first, triggers, list } = figures(upload);
    first.id = "triggerAnimationimage-ab12";
    expect(figureEnd(first, triggers, list, viewport)).toBe(900);
    first.dataset.figureHold = "0";
    expect(figureEnd(first, triggers, list, viewport)).toBe("bottom 400");
    first.id = "triggerimage-ab12";
    first.dataset.figureHold = "next";
    expect(figureEnd(first, triggers, list, viewport)).toBe(900);
  });
});

describe("figureEnd: wide screens only", () => {
  const media = (wide) => ({
    ...viewport,
    matchMedia: (query) => ({
      matches: query === READER_WIDE_QUERY ? wide : !wide,
    }),
  });
  it("holds from 1024px, where the pane shows", () => {
    const { first, triggers } = fixture();
    expect(figureEnd(first, triggers, records, media(true))).toBe(900);
  });
  it("keeps every figure with its paragraph below 1024px", () => {
    const { first, triggers } = fixture();
    first.dataset.figureHold = "2";
    expect(figureEnd(first, triggers, records, media(false))).toBe(
      "bottom 400"
    );
  });
});

describe("figure hold values", () => {
  it("stores 0, ½, 1, 2 screens or next, in the editor's order", () => {
    expect(FIGURE_HOLDS).toEqual([0, 0.5, 1, 2, "next"]);
    expect(FIGURE_HOLD_OPTIONS.map((o) => o.value)).toEqual(FIGURE_HOLDS);
  });
  it("normalizes stored and attribute values; anything else is Automatic", () => {
    expect(normalizeFigureHold(0)).toBe(0);
    expect(normalizeFigureHold("0")).toBe(0);
    expect(normalizeFigureHold("0.5")).toBe(0.5);
    expect(normalizeFigureHold(2)).toBe(2);
    expect(normalizeFigureHold("next")).toBe("next");
    for (const raw of [undefined, null, "", " ", "3", 3, -1, NaN, true, {}])
      expect(normalizeFigureHold(raw)).toBeNull();
  });
  it("parses to screens, next as Infinity, Automatic as undefined", () => {
    expect(parseFigureHold("next")).toBe(Infinity);
    expect(parseFigureHold("1")).toBe(1);
    expect(parseFigureHold(0)).toBe(0);
    expect(parseFigureHold("nope")).toBeUndefined();
  });
  it("resolves Automatic to the kind default, and words it", () => {
    expect(defaultFigureHold(image)).toBe(Infinity);
    expect(defaultFigureHold(lottie)).toBe(0);
    expect(resolveFigureHold(image, undefined)).toBe(Infinity);
    expect(resolveFigureHold(lottie, "1")).toBe(1);
    expect(resolveFigureHold({ ...image, scroll: true }, "next")).toBe(0);
    expect(figureHoldLabel(Infinity)).toBe("until the next figure");
    expect(figureHoldLabel(0)).toBe("with its paragraph");
    expect(figureHoldLabel(0.5)).toBe("½ screen more");
    expect(figureHoldLabel(1)).toBe("1 screen more");
    expect(figureHoldLabel(2)).toBe("2 screens more");
  });
  it("reads a media library row as the reader's record", () => {
    const row = {
      animation_key: "animationFoundationsFig1",
      image_file_url: "/skull.jpg",
      config: { caption: "A skull" },
    };
    expect(figureRecordOfMedia(row)).toEqual({
      id: "animationFoundationsFig1",
      caption: "A skull",
      imageUrl: "/skull.jpg",
    });
    expect(defaultFigureHold(figureRecordOfMedia(row))).toBe(Infinity);
    expect(
      defaultFigureHold(
        figureRecordOfMedia({
          animation_key: "widget-sdt",
          config: { widgetId: "sdt" },
        })
      )
    ).toBe(0);
    expect(figureRecordOfMedia(undefined)).toBeNull();
  });
});
