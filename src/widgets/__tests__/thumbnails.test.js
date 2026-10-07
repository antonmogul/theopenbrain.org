/*
 * Widget thumbnails (OPENBRAIN-128): the generated map in thumbnails.js and
 * the capture script's pure helpers. The map must point at stills that are
 * really in public/ (a stale map after a re-capture shows up as a hash
 * mismatch), and the script's text parse of catalog.js must agree with the
 * real module, since it cannot import it.
 */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WIDGET_THUMBS, widgetThumb } from "@/widgets/thumbnails";
import { WIDGETS } from "@/widgets/catalog";
import {
  THUMB_URL,
  frameFor,
  parseCatalogWidgets,
  parseUploadsSql,
  renderThumbsModule,
  thumbName,
} from "../../../scripts/timeline/capture-widget-thumbs.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
const fileFor = (url) => path.join(ROOT, "public", url.split("?")[0]);

describe("widgetThumb", () => {
  it("returns a still that exists under public/ for a known widget", () => {
    const url = widgetThumb("sdt");
    expect(url).toMatch(new RegExp(`^${THUMB_URL}/sdt\\.jpg\\?v=[0-9a-f]{8}$`));
    expect(existsSync(fileFor(url))).toBe(true);
  });

  it("maps uploaded widgets by their placed id", () => {
    const url = widgetThumb("upload:attn-sdt");
    expect(url).toContain("/upload-attn-sdt.jpg");
    expect(existsSync(fileFor(url))).toBe(true);
  });

  it("gives catalog rows that share a route the same still", () => {
    expect(widgetThumb("retinabox-app")).toBe(widgetThumb("retinabox"));
  });

  it("returns null for unknown ids, non-strings and prototype keys", () => {
    expect(widgetThumb("no-such-widget")).toBeNull();
    expect(widgetThumb("upload:never-uploaded")).toBeNull();
    expect(widgetThumb(undefined)).toBeNull();
    expect(widgetThumb(null)).toBeNull();
    expect(widgetThumb("constructor")).toBeNull();
    expect(widgetThumb("__proto__")).toBeNull();
  });
});

describe("WIDGET_THUMBS", () => {
  const entries = Object.entries(WIDGET_THUMBS);

  it("only names widgets the book knows", () => {
    const catalog = new Set(WIDGETS.map((w) => w.id));
    for (const [id] of entries)
      expect(id.startsWith("upload:") || catalog.has(id), id).toBe(true);
  });

  it("points at JPEGs on disk whose hash matches the ?v= suffix", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, url] of entries) {
      const file = fileFor(url);
      expect(existsSync(file), `${id}: ${file}`).toBe(true);
      const bytes = readFileSync(file);
      expect(bytes.subarray(0, 3).toString("hex"), id).toBe("ffd8ff");
      const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
      expect(url.endsWith(`?v=${hash}`), `${id} is stale: re-run`).toBe(true);
    }
  });

  it("stays within the weight budget", () => {
    const files = new Set(entries.map(([, url]) => fileFor(url)));
    const total = [...files].reduce((n, f) => n + statSync(f).size, 0);
    expect(total).toBeLessThan(900 * 1024);
  });
});

describe("capture script helpers", () => {
  it("parses the same vuePath widgets as the real catalog", () => {
    const src = readFileSync(path.join(ROOT, "src/widgets/catalog.js"), "utf8");
    const parsed = parseCatalogWidgets(src);
    expect(parsed.map((w) => [w.id, w.vuePath])).toEqual(
      WIDGETS.map((w) => [w.id, w.vuePath ?? null])
    );
  });

  it("reads uploaded widgets from a widget_uploads seed", () => {
    const sql = `insert into public.widget_uploads (slug, title, description, author, ramp, html, status)
values
  ('attn-demo', $t$Demo$t$,
   $t$A description, with commas$t$,
   $t$Design: Someone$t$, 'lear', $w$<!doctype html><main class="w"></main>$w$, 'published'),
  ('attn-wip', $t$WIP$t$, $t$x$t$, $t$y$t$, 'fund', $w$<p>draft</p>$w$, 'draft')
on conflict (slug) do update set html = excluded.html;`;
    expect(parseUploadsSql(sql)).toEqual([
      {
        slug: "attn-demo",
        ramp: "lear",
        html: '<!doctype html><main class="w"></main>',
        status: "published",
      },
      {
        slug: "attn-wip",
        ramp: "fund",
        html: "<p>draft</p>",
        status: "draft",
      },
    ]);
    expect(parseUploadsSql("select 1;")).toEqual([]);
  });

  it("names files safely", () => {
    expect(thumbName("upload:attn-sdt")).toBe("upload-attn-sdt");
    expect(thumbName("sdt")).toBe("sdt");
  });

  describe("frameFor", () => {
    const page = { width: 1280, height: 2000, viewportH: 800 };
    const ratio = (f) => f.w / f.h;

    it("contains a wide box, centred, at 16:10", () => {
      const f = frameFor({ x: 100, y: 300, w: 1000, h: 400 }, { pad: 0 }, page);
      expect(f.w).toBe(1000);
      expect(ratio(f)).toBeCloseTo(1.6, 1);
      expect(f.y + f.h / 2).toBeCloseTo(500, -1);
    });

    it("covers inside a tall box from the top when aligned there", () => {
      const f = frameFor(
        { x: 300, y: 200, w: 700, h: 900 },
        { fit: "cover", align: [0.5, 0], pad: 0 },
        page
      );
      expect(f).toEqual({ x: 300, y: 200, w: 700, h: 438 });
    });

    it("widens small boxes to minWidth and keeps the frame on the page", () => {
      const f = frameFor({ x: 0, y: 0, w: 200, h: 100 }, {}, page);
      expect(f.w).toBe(640);
      expect(f.x).toBe(0);
      expect(f.y).toBe(0);
    });

    it("never exceeds the page width or the viewport height", () => {
      const f = frameFor({ x: 0, y: 0, w: 1280, h: 1800 }, {}, page);
      expect(f.w).toBeLessThanOrEqual(1280);
      expect(f.h).toBeLessThanOrEqual(800);
      expect(ratio(f)).toBeCloseTo(1.6, 1);
    });
  });

  it("renders a module whose lookup works", async () => {
    const src = renderThumbsModule([
      ["b", "/t/b.jpg?v=1"],
      ["a", "/t/a.jpg?v=2"],
    ]);
    expect(src.indexOf('"a"')).toBeLessThan(src.indexOf('"b"'));
    const mod = await import(
      /* @vite-ignore */ `data:text/javascript,${encodeURIComponent(src)}`
    );
    expect(mod.widgetThumb("a")).toBe("/t/a.jpg?v=2");
    expect(mod.widgetThumb("c")).toBeNull();
  });
});
