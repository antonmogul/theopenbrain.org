import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSheetDetents } from "../useSheetDetents";

/** A pointer event on a 400px-tall container's handle. */
function ev(clientY, extra = {}) {
  return {
    pointerId: 1,
    button: 0,
    clientY,
    currentTarget: { setPointerCapture: vi.fn() },
    preventDefault: vi.fn(),
    ...extra,
  };
}

function make(opts = {}) {
  const onDismiss = vi.fn();
  const sheet = useSheetDetents({
    containerHeight: () => 400,
    onDismiss,
    ...opts,
  });
  return { sheet, onDismiss };
}

let clock = 0;
beforeEach(() => {
  clock = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.stubGlobal("requestAnimationFrame", (fn) => {
    fn();
    return 1;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useSheetDetents (OPENBRAIN-160)", () => {
  it("opens at half, then rests at full or half from a slow drag", () => {
    const { sheet } = make();
    expect(sheet.detent.value).toBe("closed");
    sheet.open();
    expect(sheet.detent.value).toBe("half");
    expect(sheet.fraction.value).toBe(0.5);

    const down = ev(300);
    sheet.onPointerDown(down);
    expect(down.currentTarget.setPointerCapture).toHaveBeenCalledWith(1);
    expect(sheet.dragging.value).toBe(true);
    for (const y of [280, 240, 200, 160]) {
      clock += 100;
      sheet.onPointerMove(ev(y));
    }
    expect(sheet.fraction.value).toBeCloseTo(0.85);
    clock += 300; // rests before letting go: no flick
    sheet.onPointerUp(ev(160));
    expect(sheet.dragging.value).toBe(false);
    expect(sheet.detent.value).toBe("full");
    expect(sheet.fraction.value).toBe(0.9);
  });

  it("dismisses below half and reports it once", () => {
    const { sheet, onDismiss } = make();
    sheet.open();
    sheet.onPointerDown(ev(300));
    clock += 100;
    sheet.onPointerMove(ev(360));
    clock += 100;
    sheet.onPointerMove(ev(400)); // 0.5 - 100/400 = 0.25
    clock += 300;
    sheet.onPointerUp(ev(400));
    expect(sheet.detent.value).toBe("closed");
    expect(sheet.fraction.value).toBe(0);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("flicks: a quick short pull up opens full, a quick push down dismisses", () => {
    const { sheet, onDismiss } = make();
    sheet.open();
    sheet.onPointerDown(ev(300));
    clock += 20;
    sheet.onPointerMove(ev(290));
    clock += 20;
    sheet.onPointerMove(ev(280)); // 20px in 40ms: 1.25 fractions/s
    sheet.onPointerUp(ev(280));
    expect(sheet.detent.value).toBe("full");

    sheet.onPointerDown(ev(100));
    clock += 20;
    sheet.onPointerMove(ev(110));
    clock += 20;
    sheet.onPointerMove(ev(120));
    sheet.onPointerUp(ev(120));
    expect(sheet.detent.value).toBe("half"); // one detent down from full
    expect(onDismiss).not.toHaveBeenCalled();

    sheet.onPointerDown(ev(300));
    clock += 20;
    sheet.onPointerMove(ev(310));
    clock += 20;
    sheet.onPointerMove(ev(320));
    sheet.onPointerUp(ev(320));
    expect(sheet.detent.value).toBe("closed");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("treats a tap on the handle as a toggle and a cancel as a return", () => {
    const { sheet } = make();
    sheet.open();
    sheet.onPointerDown(ev(300));
    sheet.onPointerMove(ev(302));
    sheet.onPointerUp(ev(302));
    expect(sheet.detent.value).toBe("full");
    sheet.onPointerDown(ev(100));
    sheet.onPointerMove(ev(200));
    expect(sheet.fraction.value).toBeCloseTo(0.65);
    sheet.onPointerCancel();
    expect(sheet.fraction.value).toBe(0.9);
    expect(sheet.detent.value).toBe("full");
  });

  it("ignores stray pointers and buttons, and moves without a drag", () => {
    const { sheet } = make();
    sheet.onPointerDown(ev(300)); // closed: nothing to drag
    expect(sheet.dragging.value).toBe(false);
    sheet.open();
    sheet.onPointerDown(ev(300, { button: 2 }));
    expect(sheet.dragging.value).toBe(false);
    sheet.onPointerDown(ev(300));
    sheet.onPointerMove(ev(100, { pointerId: 2 }));
    expect(sheet.fraction.value).toBe(0.5);
    sheet.onPointerUp(ev(100, { pointerId: 2 }));
    expect(sheet.dragging.value).toBe(true);
    sheet.onPointerCancel();
  });

  it("resizes from the keyboard and reads the detents live", () => {
    const detents = { half: 0.5, full: 0.9 };
    const { sheet, onDismiss } = make({ detents: () => detents });
    sheet.open();
    const key = (k) => {
      const e = { key: k, preventDefault: vi.fn() };
      sheet.onKeydown(e);
      return e.preventDefault.mock.calls.length;
    };
    expect(key("ArrowUp")).toBe(1);
    expect(sheet.detent.value).toBe("full");
    expect(key("Tab")).toBe(0);
    detents.half = 0.35; // a lower region was picked meanwhile
    key("ArrowDown");
    expect(sheet.fraction.value).toBe(0.35);
    key("ArrowDown");
    expect(sheet.detent.value).toBe("closed");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("rises from closed over a frame, or jumps when told not to animate", () => {
    let frame = null;
    vi.stubGlobal("requestAnimationFrame", (fn) => {
      frame = fn;
      return 1;
    });
    const { sheet, onDismiss } = make();
    sheet.open();
    expect(sheet.fraction.value).toBe(0);
    expect(sheet.detent.value).toBe("half");
    frame();
    expect(sheet.fraction.value).toBe(0.5);
    sheet.close();
    expect(onDismiss).not.toHaveBeenCalled();
    sheet.open("half", { animate: false });
    expect(sheet.fraction.value).toBe(0.5);
    // Already open: a new region just refits, no rise.
    sheet.snapTo("full");
    sheet.open("half");
    expect(sheet.fraction.value).toBe(0.5);
  });
});
