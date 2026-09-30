/*
 * Foundations/Layout — the reader's layout grid (OPENBRAIN-114).
 *
 * The reader is not a 12-column grid: it is one text column whose margins
 * change with the screen, plus a pinned figure pane from 1024px. The global
 * layout tokens (--reader-prose-w, --reader-gutter-*, --reading-measure,
 * --reader-topbar-h) are read live from brand.css, including the 1280px
 * gutters inside their media block. The two narrow-screen margins live in
 * TextComp's scoped CSS (.ml-text), so they are quoted here with their
 * source; keep them in step with that file.
 *
 * The same grid is in the Figma design system file (Foundations → Layout
 * grid, and the Reader/* grid styles).
 */
import { figmaNode, FIGMA_NODES } from "../../../.storybook/figma";
import { READER_TWO_COLUMN_PX } from "@/helper/readerLayout";

const PHONE_MARGIN = 15; // TextComp .ml-text padding 0.9375rem
const TABLET_MARGIN_MIN = 40; // TextComp --narrow-gutter floor 2.5rem
const TABLET_PX = 768; // tailwind screens.md
const DESKTOP_PX = 1280;

/* Every :root custom property brand.css sets, keyed by media condition. */
function rootTokens() {
  const out = {};
  const visit = (rules, media) => {
    for (const r of rules) {
      if (r.cssRules && r.conditionText !== undefined) {
        visit(r.cssRules, r.conditionText.replace(/\s+/g, ""));
      } else if (r.selectorText === ":root" && r.style) {
        for (const name of r.style) {
          if (!name.startsWith("--")) continue;
          (out[media] = out[media] || {})[name] = r.style
            .getPropertyValue(name)
            .trim();
        }
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules, "");
    } catch {
      /* cross-origin sheet */
    }
  }
  return out;
}

const toPx = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return null;
  return v.trim().endsWith("rem") ? n * 16 : n;
};

/* Pull the floor and cap out of clamp(35rem, 50vw, calc(780px + 6.875rem)). */
function proseBounds(expr) {
  const m =
    /clamp\(\s*([\d.]+rem|[\d.]+px)\s*,\s*([\d.]+)vw\s*,\s*calc\(\s*([\d.]+)px\s*\+\s*([\d.]+)rem\s*\)\s*\)/.exec(
      expr || ""
    );
  if (!m) return null;
  return {
    min: toPx(m[1]),
    vw: parseFloat(m[2]),
    max: parseFloat(m[3]) + parseFloat(m[4]) * 16,
  };
}

function layout() {
  const t = rootTokens();
  const base = t[""] || {};
  const wide = t[`(min-width:${DESKTOP_PX}px)`] || {};
  const measure = toPx(base["--reading-measure"] || "780px");
  const prose = proseBounds(base["--reader-prose-w"]);
  const gl = toPx(base["--reader-gutter-l"] || "2rem");
  const gr = toPx(base["--reader-gutter-r"] || "2rem");
  const glW = toPx(wide["--reader-gutter-l"] || base["--reader-gutter-l"]);
  const grW = toPx(wide["--reader-gutter-r"] || base["--reader-gutter-r"]);
  const topbar = toPx(base["--reader-topbar-h"] || "4rem");
  const proseAt = (w) =>
    prose
      ? Math.min(prose.max, Math.max(prose.min, (w * prose.vw) / 100))
      : w / 2;
  const tabletMargin = (w) => Math.max(TABLET_MARGIN_MIN, (w - measure) / 2);
  const bands = [
    {
      name: "Phone",
      range: `up to ${TABLET_PX - 1}px`,
      w: 390,
      pane: 0,
      text: 390,
      gl: PHONE_MARGIN,
      gr: PHONE_MARGIN,
      note: "One column. Figures and widget bands run edge to edge; captions return to the margin.",
    },
    {
      name: "Tablet",
      range: `${TABLET_PX}–${READER_TWO_COLUMN_PX - 1}px`,
      w: TABLET_PX,
      pane: 0,
      text: TABLET_PX,
      gl: tabletMargin(TABLET_PX),
      gr: tabletMargin(TABLET_PX),
      note: `One column; margins max(${TABLET_MARGIN_MIN}px, (width − ${measure}) / 2), so the text centres at the ${measure}px reading measure.`,
    },
    {
      name: "Laptop",
      range: `${READER_TWO_COLUMN_PX}–${DESKTOP_PX - 1}px`,
      w: READER_TWO_COLUMN_PX,
      pane: READER_TWO_COLUMN_PX - proseAt(READER_TWO_COLUMN_PX),
      text: proseAt(READER_TWO_COLUMN_PX),
      gl,
      gr,
      note: `Figure pane pinned left; text column clamp(${prose?.min}px, ${prose?.vw}vw, ${prose?.max}px) pinned right.`,
    },
    {
      name: "Desktop",
      range: `${DESKTOP_PX}px and up`,
      w: 1440,
      pane: 1440 - proseAt(1440),
      text: proseAt(1440),
      gl: glW,
      gr: grW,
      note: `Same split, text column capped at ${prose?.max}px.`,
    },
  ];
  return { bands, topbar, measure, prose };
}

export default {
  title: "Foundations/Layout",
  tags: ["autodocs"],
  parameters: {
    design: { url: figmaNode(FIGMA_NODES.layoutGrid) },
    layout: "padded",
    docs: {
      description: {
        component:
          "The reader's layout grid: one text column whose margins change " +
          "with the screen, plus a pinned figure pane from " +
          `${READER_TWO_COLUMN_PX}px. Values are read live from brand.css ` +
          "(the phone and tablet margins from TextComp's .ml-text). Figma: " +
          "Foundations → Layout grid, and the Reader/* grid styles.",
      },
    },
  },
};

const px = (n) => `${Math.round(n)}px`;

export const Breakpoints = {
  render: () => ({
    data: () => layout(),
    methods: { px },
    template: `
      <table style="border-collapse:collapse; font-family:var(--font-mono); font-size:12px; color:rgb(var(--color-ink)); max-width:980px;">
        <thead>
          <tr style="text-align:left; color:rgb(var(--color-mute));">
            <th style="padding:6px 16px 6px 0;">Screen</th><th style="padding:6px 16px;">Width</th>
            <th style="padding:6px 16px;">Figure pane</th><th style="padding:6px 16px;">Text column</th>
            <th style="padding:6px 16px;">Margins</th><th style="padding:6px 16px;">Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in bands" :key="b.name" style="border-top:1px solid rgb(var(--color-line)); vertical-align:top;">
            <td style="padding:8px 16px 8px 0;">{{ b.name }}</td>
            <td style="padding:8px 16px;">{{ b.range }}</td>
            <td style="padding:8px 16px;">{{ b.pane ? px(b.pane) + ' at ' + b.w : '—' }}</td>
            <td style="padding:8px 16px;">{{ px(b.text) }} at {{ b.w }}</td>
            <td style="padding:8px 16px;">{{ px(b.gl) }} / {{ px(b.gr) }}</td>
            <td style="padding:8px 16px; font-family:var(--font-ui); max-width:320px;">{{ b.note }}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-family:var(--font-mono); font-size:11px; color:rgb(var(--color-mute)); margin-top:16px;">
        Top bar {{ px(topbar) }} (--reader-topbar-h) · reading measure {{ px(measure) }} (--reading-measure)
      </p>`,
  }),
};

/* Each breakpoint drawn to scale: figure pane, text column, margins. */
export const Diagrams = {
  render: () => ({
    data: () => ({ ...layout(), scale: 0.4 }),
    methods: { px },
    template: `
      <div style="display:flex; flex-wrap:wrap; gap:32px; align-items:flex-start; font-family:var(--font-mono); font-size:11px; color:rgb(var(--color-mute));">
        <figure v-for="b in bands" :key="b.name" style="margin:0;">
          <figcaption style="margin-bottom:8px; color:rgb(var(--color-ink));">{{ b.name }} · {{ b.w }}px</figcaption>
          <div :style="{ position:'relative', width: b.w * scale + 'px', height: '220px', background:'rgb(var(--color-paper))', border:'1px solid rgb(var(--color-line))', overflow:'hidden' }">
            <div :style="{ position:'absolute', left:0, top:0, right:0, height: topbar * scale + 'px', borderBottom:'1px solid rgb(var(--color-line))' }"></div>
            <div v-if="b.pane" :style="{ position:'absolute', left:0, top:0, bottom:0, width: b.pane * scale + 'px', background:'rgb(var(--color-chapter-pale, 220 205 249))' }"></div>
            <div :style="{ position:'absolute', top:0, bottom:0, left: (b.pane) * scale + 'px', width: b.gl * scale + 'px', background:'rgb(var(--color-accent) / 0.15)' }"></div>
            <div :style="{ position:'absolute', top:0, bottom:0, left: (b.pane + b.text - b.gr) * scale + 'px', width: b.gr * scale + 'px', background:'rgb(var(--color-accent) / 0.15)' }"></div>
            <div v-for="i in 7" :key="i" :style="{ position:'absolute', left: (b.pane + b.gl) * scale + 'px', width: (b.text - b.gl - b.gr) * scale * (i % 3 ? 1 : 0.7) + 'px', top: (topbar * scale + 14 + i * 20) + 'px', height:'6px', background:'rgb(var(--color-ink) / 0.18)' }"></div>
          </div>
          <div style="margin-top:6px;">text {{ px(b.text - b.gl - b.gr) }} wide · margins {{ px(b.gl) }}/{{ px(b.gr) }}</div>
        </figure>
      </div>`,
  }),
};
