import { describe, it, expect } from "vitest";
/* eslint-disable import/no-unresolved */
import originalHtml from "@/widgets/source/normalization_model_widget_v2.html?raw";
/* eslint-enable import/no-unresolved */
import {
  DEFAULT_STATE,
  GW,
  GH,
  RX,
  RT,
  computeGrids,
  crfCurves,
  effectiveGamma,
  featureDegrees,
  heightDegrees,
  markedResponse,
  panelPixels,
  panelSpecs,
  schematic,
  toPath,
} from "../normalizationModel";

/*
 * Parity harness: run the author's own <script> against a stub document
 * and compare what it writes (readout, chart paths, schematic attributes,
 * panel pixels) with the helper, across every mode and control.
 */
function runOriginal() {
  const script = originalHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
  const els = {};
  const el = (id) =>
    (els[id] ||= {
      id,
      style: {},
      attrs: {},
      handlers: {},
      textContent: "",
      value: "",
      checked: false,
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      setAttributeNS() {},
      addEventListener(type, fn) {
        this.handlers[type] = fn;
      },
    });
  const pixels = []; // one entry per small-canvas putImageData, in order
  const doc = {
    getElementById: el,
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (img) => pixels.push(img.data),
        drawImage() {},
      }),
      toDataURL: () => "data:",
    }),
  };
  new Function("document", script)(doc);
  const fire = (id, type, props = {}) => {
    const e = el(id);
    Object.assign(e, props);
    pixels.length = 0;
    e.handlers[type].call(e);
  };
  return { el, fire, pixels };
}

function expectParity(orig, state) {
  const grids = computeGrids(state);
  expect(orig.el("readout-r").textContent).toBe(
    "Response at marked neuron: R = " + markedResponse(grids).toFixed(3)
  );
  const { att, ign, maxVal } = crfCurves(state);
  expect(orig.el("chart-attended").attrs.d).toBe(toPath(att, maxVal));
  expect(orig.el("chart-ignored").attrs.d).toBe(toPath(ign, maxVal));
  const s = schematic(state);
  expect(orig.el("attn-circle").attrs.cx).toBe(s.attnX);
  expect(orig.el("attn-circle").attrs.r).toBe(s.attnR);
  expect(orig.el("rf-circle").attrs.cx).toBe(s.rfCx);
  expect(orig.el("rf-circle").attrs.r).toBe(s.rfR);
  expect(orig.el("grating-left-ticks").attrs.transform).toBe(
    `rotate(${s.rotAngle} 162 87)`
  );
  expect(orig.el("grating-left").style.display).toBe(
    s.showLeftGrating ? "" : "none"
  );
  const specs = panelSpecs(grids);
  const ours = ["stimdrive", "attnfield", "suppdrive", "popresp"].map((k) =>
    panelPixels(specs[k].fn, specs[k].lo, specs[k].hi)
  );
  expect(orig.pixels).toHaveLength(4);
  ours.forEach((p, i) =>
    expect(Array.from(p)).toEqual(Array.from(orig.pixels[i]))
  );
}

describe("normalization model — parity with the author's v2 script", () => {
  it("matches at the default state (two stimuli in the RF)", () => {
    const orig = runOriginal();
    orig.fire("s-pos", "input", { value: "70" }); // re-render, capture pixels
    expectParity(orig, { ...DEFAULT_STATE });
  });

  it("matches through a sequence of mode, preset and slider changes", () => {
    const orig = runOriginal();
    const state = { ...DEFAULT_STATE };
    const steps = [
      ["s-pos", "input", { value: "35" }, { pos: 35 }],
      ["s-width", "input", { value: "62" }, { width: 62 }],
      ["s-height", "input", { value: "15" }, { height: 15 }],
      ["s-feature", "input", { value: "80" }, { feature: 80 }],
      ["chk-isolate", "change", { checked: true }, { isolateNonpref: true }],
      ["btn-one", "click", {}, { mode: "one", isolateNonpref: false }],
      ["btn-preset-response", "click", {}, { width: 0 }],
      ["btn-preset-contrast", "click", {}, { width: 100 }],
      ["btn-feat", "click", {}, { mode: "feature" }],
      [
        "btn-orient-orth",
        "click",
        {},
        { outsideOrient: "orthogonal", feature: 0 },
      ],
      [
        "btn-orient-diag",
        "click",
        {},
        { outsideOrient: "diagonal", feature: 25 },
      ],
      ["btn-orient-same", "click", {}, { outsideOrient: "same", feature: 50 }],
      ["s-feature", "input", { value: "12" }, { feature: 12 }],
      ["btn-two", "click", {}, { mode: "two" }],
    ];
    for (const [id, type, props, patch] of steps) {
      orig.fire(id, type, props);
      Object.assign(state, patch);
      expectParity(orig, state);
    }
  });
});

describe("normalization model maths", () => {
  it("marks the neuron at the right stimulus, preferred orientation", () => {
    expect(RX).toBe(43);
    expect(RT).toBe(20);
    expect(GW).toBe(60);
    expect(GH).toBe(40);
  });

  it("slider readouts match the original's initial labels", () => {
    expect(heightDegrees(80)).toBe(100);
    expect(featureDegrees(50)).toBe(90);
  });

  it("attending the RF raises the marked neuron's response", () => {
    const away = markedResponse(computeGrids({ ...DEFAULT_STATE, pos: 0 }));
    const on = markedResponse(computeGrids({ ...DEFAULT_STATE, pos: 72 }));
    expect(on).toBeGreaterThan(away);
  });

  it("γ_eff is full gain at the preferred feature and falls off away from it", () => {
    expect(effectiveGamma(50)).toBeCloseTo(2.5, 10);
    expect(effectiveGamma(0)).toBeLessThan(effectiveGamma(25));
    expect(effectiveGamma(25)).toBeLessThan(effectiveGamma(50));
    expect(effectiveGamma(0)).toBeGreaterThan(1);
  });

  it("one-stimulus presets: narrow field = response gain, wide = contrast gain", () => {
    const narrow = crfCurves({ ...DEFAULT_STATE, mode: "one", width: 0 });
    const wide = crfCurves({ ...DEFAULT_STATE, mode: "one", width: 100 });
    const last = narrow.att.length - 1;
    // Response gain lifts the saturated end; contrast gain converges to 1.
    expect(narrow.att[last] / narrow.ign[last]).toBeGreaterThan(2);
    expect(wide.att[last] / wide.ign[last]).toBeLessThan(1.1);
  });

  it("panel pixels are opaque greys inside the requested range", () => {
    const px = panelPixels(() => 0.5, 20, 220);
    expect(px).toHaveLength(GW * GH * 4);
    expect([px[0], px[1], px[2], px[3]]).toEqual([120, 120, 120, 255]);
  });
});
