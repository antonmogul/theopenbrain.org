import { describe, expect, it } from "vitest";
import { figureGround, figurePaneGround } from "../figurePane";

// Records as useAnimations shapes them (animations.json / the animations
// table): the id, plus the config flags the renderers switch on.
const shellImage = {
  id: "animationFoundationsFig1",
  images: [{ src: "/skull.jpg" }],
};
const shellPlaceholder = { id: "animationAttentionV2Fig1", placeholder: true };
const uploadedWidget = {
  id: "widget-upload:retina-photoreceptors",
  widgetId: "upload:retina-photoreceptors",
};
const legacyLottie = { id: "animationEyeStructur", loop: true };
const legacyScroll = { id: "animationLateralOrganization", scroll: true };
const legacyTransition = {
  id: "animationRetinalCellTypesTransition",
  isTransition: true,
};
// Figure widgets registered in src/widgets/figures/registry.js.
const papyrus = { id: "animationFoundationsFig4" };
const stepThrough = { id: "animationPupillaryLightreflex" };
const switchFigure = { id: "animationRodVsConeCircuits" };
const transitionFigure = { id: "animationEyeStructurTransition" };

describe("figureGround", () => {
  it("puts the figure shell (images, galleries, placeholders) on the dark pane", () => {
    expect(figureGround(shellImage)).toBe("dark");
    expect(figureGround(shellPlaceholder)).toBe("dark");
  });

  it("puts widgets with a plate of their own on the dark pane", () => {
    expect(figureGround(uploadedWidget)).toBe("dark");
    expect(figureGround(papyrus)).toBe("dark");
    expect(figureGround(stepThrough)).toBe("dark");
  });

  it("keeps the 2023 Lottie line art on paper", () => {
    expect(figureGround(legacyLottie)).toBe("paper");
    expect(figureGround(legacyScroll)).toBe("paper");
    expect(figureGround(legacyTransition)).toBe("paper");
  });

  it("keeps the figure widgets drawn on the reader's own ground on paper", () => {
    expect(figureGround(switchFigure)).toBe("paper");
    expect(figureGround(transitionFigure)).toBe("paper");
  });

  it("treats nothing as the dark pane", () => {
    expect(figureGround(undefined)).toBe("dark");
    expect(figureGround(null)).toBe("dark");
  });
});

describe("figurePaneGround", () => {
  it("is dark for a chapter whose figures all sit on the dark pane", () => {
    expect(figurePaneGround([shellImage, papyrus, uploadedWidget])).toBe(
      "dark"
    );
  });

  it("is dark for an empty chapter", () => {
    expect(figurePaneGround([])).toBe("dark");
    expect(figurePaneGround()).toBe("dark");
  });

  it("is paper as soon as one figure's art was drawn for paper", () => {
    expect(figurePaneGround([shellImage, legacyLottie])).toBe("paper");
    expect(figurePaneGround([shellImage, switchFigure])).toBe("paper");
  });

  it("ignores triggers that matched no record", () => {
    expect(figurePaneGround([shellImage, undefined, null])).toBe("dark");
  });
});
