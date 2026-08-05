import { describe, it, expect, vi, afterEach } from "vitest";
import { syncAppWidth, observeAppWidth } from "@/helper/appWidth";

/*
 * The regression these defend: --app-w must track documentElement.clientWidth
 * (scrollbar excluded), never window.innerWidth (scrollbar included). Using the
 * latter is what made 100vw-based full-bleed layout overflow — see OPENBRAIN-4.
 */

function fakeDoc(clientWidth) {
  const props = {};
  return {
    documentElement: {
      clientWidth,
      style: {
        setProperty: (k, v) => {
          props[k] = v;
        },
      },
      _props: props,
    },
  };
}

afterEach(() => {
  document.documentElement.style.removeProperty("--app-w");
});

describe("syncAppWidth", () => {
  it("writes clientWidth to --app-w in px", () => {
    const doc = fakeDoc(1425);
    expect(syncAppWidth(doc)).toBe(1425);
    expect(doc.documentElement._props["--app-w"]).toBe("1425px");
  });

  it("uses clientWidth, not the scrollbar-inclusive window width", () => {
    // 1440 viewport with a 15px classic scrollbar → 1425 usable.
    const doc = fakeDoc(1425);
    syncAppWidth(doc);
    expect(doc.documentElement._props["--app-w"]).toBe("1425px");
    expect(doc.documentElement._props["--app-w"]).not.toBe("1440px");
  });

  it("defaults to the real document", () => {
    expect(typeof syncAppWidth()).toBe("number");
    expect(
      document.documentElement.style.getPropertyValue("--app-w")
    ).toMatch(/px$/);
  });
});

describe("observeAppWidth", () => {
  it("syncs immediately and re-syncs on resize", () => {
    const listeners = {};
    const doc = fakeDoc(1000);
    const win = {
      document: doc,
      addEventListener: (t, fn) => {
        listeners[t] = fn;
      },
      removeEventListener: (t) => {
        delete listeners[t];
      },
    };

    observeAppWidth(win);
    expect(doc.documentElement._props["--app-w"]).toBe("1000px");

    doc.documentElement.clientWidth = 800;
    listeners.resize();
    expect(doc.documentElement._props["--app-w"]).toBe("800px");
  });

  it("observes the root element so a scrollbar appearing re-syncs", () => {
    // A scrollbar appearing changes clientWidth without firing resize, so the
    // ResizeObserver is the only thing that catches it.
    const observe = vi.fn();
    const disconnect = vi.fn();
    const doc = fakeDoc(1200);
    const win = {
      document: doc,
      addEventListener: () => {},
      removeEventListener: () => {},
      ResizeObserver: class {
        constructor(cb) {
          this.cb = cb;
        }
        observe(...a) {
          observe(...a);
        }
        disconnect() {
          disconnect();
        }
      },
    };

    const stop = observeAppWidth(win);
    expect(observe).toHaveBeenCalledWith(doc.documentElement);
    stop();
    expect(disconnect).toHaveBeenCalled();
  });

  it("works where ResizeObserver is unavailable", () => {
    const doc = fakeDoc(640);
    const win = {
      document: doc,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    expect(() => observeAppWidth(win)()).not.toThrow();
    expect(doc.documentElement._props["--app-w"]).toBe("640px");
  });
});
