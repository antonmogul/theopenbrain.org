/*
 * BlockPreview's figure card says when the figure shows and how long it
 * stays in the left pane (OPENBRAIN-131): the author's "Stays", else what
 * Automatic resolves to for that kind of figure.
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BlockPreview from "../BlockPreview.vue";
import {
  editorMedia,
  editorParagraphs,
} from "../__stories__/chapterEditorFixtures";

const mediaById = new Map(editorMedia.map((m) => [m.id, m]));
const byId = Object.fromEntries(editorParagraphs.map((p) => [p.id, p]));
const label = (paragraph, extra = {}) =>
  mount(BlockPreview, {
    props: { paragraph, mediaById, ...extra },
    global: { stubs: { WidgetBreakout: true, VideoEmbed: true } },
  })
    .find(".bp-figure-trigger")
    .text();

describe("BlockPreview: the figure's timing", () => {
  it("shows the author's hold (the held fixture: + 1 screen)", () => {
    expect(label(byId["p-7"])).toBe("shows when reached · stays 1 screen more");
  });

  it("shows what Automatic means for the figure", () => {
    const { animationFlags, ...content } = byId["p-7"].content;
    expect(animationFlags.hold).toBe(1);
    expect(label({ ...byId["p-7"], content })).toBe(
      "shows when reached · stays until the next figure"
    );
    expect(
      label({ ...byId["p-7"], animation_id: "anim-lateral", content })
    ).toBe("shows when reached · stays with its paragraph");
  });

  it("decides by the figure, as the reader does, whatever the trigger", () => {
    // A 'scroll' row's own trigger holds like any other (figureEnd).
    expect(label(byId["p-1"])).toBe(
      "shows on scroll · stays with its paragraph"
    );
    const { animationFlags, ...content } = byId["p-7"].content;
    expect(animationFlags.hold).toBe(1);
    expect(
      label({ ...byId["p-7"], animation_trigger: "scroll", content })
    ).toBe("shows on scroll · stays until the next figure");
  });

  it("says nothing about a hold for a figure scroll drives", () => {
    const full = {
      id: "full",
      animation_key: "animationFull",
      config: { fullscreen: true },
    };
    const preview = mount(BlockPreview, {
      props: {
        paragraph: { ...byId["p-7"], animation_id: "full" },
        mediaById: new Map([...mediaById, ["full", full]]),
      },
      global: { stubs: { WidgetBreakout: true, VideoEmbed: true } },
    });
    expect(preview.find(".bp-figure-trigger").text()).toBe(
      "shows when reached"
    );
  });

  it("says nothing about a hold in a breakout box, which draws its figures itself", () => {
    expect(label(byId["p-7"], { inPane: false })).toBe("shows when reached");
  });
});
