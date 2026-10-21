import { describe, expect, it, vi } from "vitest";
import {
  CSP,
  buildWidgetDoc,
  fitHeight,
  fitMessage,
  fitScale,
  staticChecks,
  themeMessage,
  widgetSlug,
  widgetTokens,
} from "../widgetHost.js";
import { uploadSlug } from "../useUploadedWidgets.js";
import { embedLoader, hasEmbed } from "../../embeds.js";

// Uploaded widgets run in a sandbox the book builds (OPENBRAIN-105).
describe("buildWidgetDoc", () => {
  it("waits for an authored Lottie and two paint opportunities before a prewarmed handoff", () => {
    const handlers = {},
      frames = [],
      postMessage = vi.fn();
    const anim = { isLoaded: false };
    const frameWindow = {
      tobWidget: { anim },
      addEventListener: (name, fn) => (handlers[name] = fn),
    };
    const frameDocument = {
      documentElement: document.createElement("html"),
      body: document.createElement("body"),
      addEventListener: vi.fn(),
      querySelector: vi.fn(() => (anim.isLoaded ? {} : null)),
    };
    const script = buildWidgetDoc("<p>widget</p>", {
      waitForArtwork: true,
    }).match(/<script>([\s\S]*?)<\/script>/)[1];
    new Function(
      "window",
      "document",
      "parent",
      "console",
      "setInterval",
      "requestAnimationFrame",
      script
    )(
      frameWindow,
      frameDocument,
      { postMessage },
      { error: vi.fn() },
      vi.fn(),
      (fn) => frames.push(fn)
    );
    const ready = () =>
      postMessage.mock.calls.some(([m]) => m.type === "ready");
    handlers.load();
    expect(ready()).toBe(false);
    frames.shift()();
    expect(ready()).toBe(false);
    anim.isLoaded = true;
    frames.shift()();
    frames.shift()();
    expect(ready()).toBe(false);
    frames.shift()();
    expect(ready()).toBe(true);
  });

  it("puts the policy, tokens and bridge first in <head>", () => {
    const doc = buildWidgetDoc(
      '<!doctype html><html><head><title>T</title><script src="https://cdnjs.cloudflare.com/x.js"></script></head><body>hi</body></html>',
      { ramp: "perc" }
    );
    const head = doc.slice(doc.indexOf("<head>"));
    expect(head.indexOf("Content-Security-Policy")).toBeLessThan(
      head.indexOf("<title>")
    );
    expect(head.indexOf("window.OB")).toBeLessThan(
      head.indexOf('src="https://cdnjs')
    );
    expect(doc).toContain("--ob-accent:#39D8BA");
  });

  it("wraps a bare fragment in a document", () => {
    const doc = buildWidgetDoc("<p>hi</p>");
    expect(doc).toMatch(/^<!doctype html><html><head>/);
    expect(doc).toContain("<body><p>hi</p></body>");
  });

  it("marks reduced motion on <html>", () => {
    expect(
      buildWidgetDoc("<html><head></head></html>", { reduceMotion: true })
    ).toMatch(/<html data-ob-reduce-motion>/);
  });

  it("allows no network calls and only the kit's origins", () => {
    expect(CSP).toContain("connect-src 'none'");
    expect(CSP).toContain("https://cdnjs.cloudflare.com");
    expect(CSP).not.toMatch(/script-src[^;]*\*/);
  });

  it.each([false, true])(
    "applies initial explanation preference %s only at load, preserving dismissal on fit/theme",
    (initialExplanation) => {
      const handlers = {};
      const setInfo = vi.fn();
      const frameWindow = {
        addEventListener: (name, handler) => (handlers[name] = handler),
        tobWidget: { setInfo },
      };
      const frameDocument = {
        documentElement: document.createElement("html"),
        body: document.createElement("body"),
        addEventListener: vi.fn(),
      };
      const script = buildWidgetDoc("<p>widget</p>", {
        initialExplanation,
      }).match(/<script>([\s\S]*?)<\/script>/)[1];
      new Function(
        "window",
        "document",
        "parent",
        "console",
        "setInterval",
        script
      )(
        frameWindow,
        frameDocument,
        { postMessage: vi.fn() },
        { error: vi.fn() },
        vi.fn()
      );
      expect(setInfo).not.toHaveBeenCalled();
      handlers.load();
      expect(setInfo).toHaveBeenCalledTimes(initialExplanation ? 1 : 0);
      if (initialExplanation) expect(setInfo).toHaveBeenCalledWith(true);
      setInfo.mockClear();
      handlers.message({ data: fitMessage(844) });
      handlers.message({ data: themeMessage("perc", true) });
      expect(setInfo).not.toHaveBeenCalled();
    }
  );
});

describe("staticChecks", () => {
  const byId = (checks) => Object.fromEntries(checks.map((c) => [c.id, c.ok]));

  it("passes a widget made to the kit", () => {
    const html = `<title>Field</title><style>:root{--a:var(--ob-accent,#39D8BA)}
      @media (prefers-reduced-motion: reduce){*{animation:none}}</style>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans">`;
    expect(byId(staticChecks(html))).toEqual({
      size: true,
      outside: true,
      network: true,
      tokens: true,
      motion: true,
      title: true,
    });
  });

  it("flags outside hosts, network calls and missing basics", () => {
    const html = `<script src="https://unpkg.com/d3"></script><script>fetch("/api")</script>`;
    const c = byId(staticChecks(html));
    expect(c.outside).toBe(false);
    expect(c.network).toBe(false);
    expect(c.tokens).toBe(false);
    expect(c.title).toBe(false);
  });
});

describe("tokens and ids", () => {
  it("colours the accent by subject, defaulting to Fundamentals", () => {
    expect(widgetTokens("lear")["--ob-accent"]).toBe("#FF3351");
    expect(widgetTokens("nope")["--ob-accent"]).toBe("#8D4CF6");
    // readable text on the accent: dark on the light teal, white on violet
    expect(widgetTokens("perc")["--ob-on-accent"]).toBe("#1c1c1c");
    expect(widgetTokens("fund")["--ob-on-accent"]).toBe("#ffffff");
    expect(themeMessage("perc", true)).toMatchObject({
      __ob: 1,
      type: "theme",
      ramp: "perc",
      reduceMotion: true,
    });
  });

  it("slugs titles and reads upload ids", () => {
    expect(widgetSlug("ON-centre receptive field!")).toBe(
      "on-centre-receptive-field"
    );
    expect(widgetSlug("")).toBe("widget");
    expect(uploadSlug("upload:lateral-inhibition")).toBe("lateral-inhibition");
    expect(uploadSlug("retinabox")).toBeNull();
  });

  it("embeds an upload by id, alongside the built-in views", () => {
    expect(hasEmbed("upload:lateral-inhibition")).toBe(true);
    expect(hasEmbed("upload:")).toBe(false);
    expect(hasEmbed("retinabox")).toBe(true);
    expect(typeof embedLoader("upload:x")).toBe("function");
    expect(embedLoader("nope")).toBeNull();
  });
});

// In the figure pane the frame is told its height (OPENBRAIN-148): the
// Loewi widget's controls were cut off on a 900px-tall screen because the
// widget sized its scene to the frame, which it could then grow past.
describe("fitHeight", () => {
  it("follows the widget between 80 and 6000 px when nothing is fixed", () => {
    expect(fitHeight(700)).toBe(700);
    expect(fitHeight(10)).toBe(80);
    expect(fitHeight(9000)).toBe(6000);
    expect(fitHeight(0)).toBe(240);
    expect(fitHeight(0, { minHeight: 300 })).toBe(300);
  });

  it("fills the measured host even when an older widget reports a shorter height", () => {
    expect(fitHeight(1200, { maxHeight: 776 })).toBe(776);
    expect(fitHeight(500, { maxHeight: 776 })).toBe(776);
    expect(fitHeight(1000.4, { maxHeight: 676.6 })).toBe(677);
  });

  it("starts at the pane's height, not minHeight, so the box doesn't jump", () => {
    expect(fitHeight(0, { minHeight: 240, maxHeight: 776 })).toBe(776);
    expect(fitHeight(0, { minHeight: 240, maxHeight: 0 })).toBe(240);
    expect(fitHeight(0, { minHeight: 240, maxHeight: null })).toBe(240);
  });
});

describe("fitMessage and the bridge's fit handling", () => {
  it("sends a rounded height, or null to release the frame", () => {
    expect(fitMessage(776.4)).toEqual({ __ob: 1, type: "fit", maxHeight: 776 });
    expect(fitMessage(null).maxHeight).toBeNull();
    expect(fitMessage(0).maxHeight).toBeNull();
    expect(fitMessage("abc").maxHeight).toBeNull();
  });

  it("gives the widget OB.maxHeight, --ob-max-height and html[data-ob-fit]", () => {
    const doc = buildWidgetDoc("<p>hi</p>");
    expect(doc).toContain('m.type==="fit"');
    expect(doc).toContain("--ob-max-height");
    expect(doc).toContain("data-ob-fit");
    expect(doc).toContain("onFit:");
    expect(doc).toContain("maxHeight:window.__obFit||null");
  });
});

describe("fitScale", () => {
  it("is 1 when the widget fits or nothing is fixed", () => {
    expect(fitScale(700, 776)).toBe(1);
    expect(fitScale(776, 776)).toBe(1);
    expect(fitScale(900, null)).toBe(1);
    expect(fitScale(0, 776)).toBe(1);
  });

  it("shrinks a taller widget to the box, never under a half", () => {
    expect(fitScale(910, 764)).toBe(0.84);
    expect(fitScale(1552, 776)).toBe(0.5);
    expect(fitScale(4000, 776)).toBe(0.5);
  });
});

describe("buildWidgetDoc with a fixed height", () => {
  it("lays the widget out for the box from its first paint", () => {
    const doc = buildWidgetDoc("<html><head></head><body>x</body></html>", {
      maxHeight: 776.4,
    });
    expect(doc).toMatch(/<html data-ob-fit>/);
    expect(doc).toContain("--ob-max-height:776px");
    expect(doc).toContain("window.__obFit=776;");
  });

  it("leaves a free frame alone", () => {
    const doc = buildWidgetDoc("<html><head></head><body>x</body></html>");
    expect(doc).not.toMatch(/<html[^>]*data-ob-fit/);
    expect(doc).not.toContain("--ob-max-height:");
    expect(doc).not.toContain("__obFit=");
  });

  it("keeps reduced motion beside it", () => {
    expect(
      buildWidgetDoc("<html><head></head></html>", {
        reduceMotion: true,
        maxHeight: 500,
      })
    ).toMatch(/<html data-ob-reduce-motion data-ob-fit>/);
  });
});
