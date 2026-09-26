import { describe, expect, it } from "vitest";
import {
  CSP,
  buildWidgetDoc,
  staticChecks,
  themeMessage,
  widgetSlug,
  widgetTokens,
} from "../widgetHost.js";
import { uploadSlug } from "../useUploadedWidgets.js";
import { embedLoader, hasEmbed } from "../../embeds.js";

// Uploaded widgets run in a sandbox the book builds (OPENBRAIN-105).
describe("buildWidgetDoc", () => {
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
