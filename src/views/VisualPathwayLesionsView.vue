<script setup>
/*
 * VisualPathwayLesionsView — Visual pathway lesions interactive widget.
 *
 * Ported from Stuart Trenholm's visual-pathway-lesions-widget.html.
 * Three tabs: Explore (pathway diagram + scene + field charts + lesion rail),
 * Field->Retina (projection panel + explanatory text), and Quiz.
 *
 * OPENBRAIN-14: second Stuart widget port.
 *
 * Design ownership: Sonia owns design. This is a token-swap only — the
 * widget's interaction and pedagogy are unchanged from the original.
 *
 * Design rule (Stuart's, preserved verbatim): "the interface is
 * achromatic. Every saturated colour on this page is a stimulus, never
 * chrome." Anatomical and hemifield colours are scientific data and are
 * NOT token-swapped.
 *
 * Colour mapping from original -> brand.css tokens (achromatic only):
 *   --bg      -> rgb(var(--color-bg))
 *   --card    -> rgb(var(--color-paper))
 *   --ink     -> rgb(var(--color-ink))
 *   --mut     -> rgb(var(--color-mute))
 *   --line    -> rgb(var(--color-line))
 *
 * All anatomical / stimulus colours are hardcoded (not token-swapped).
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import {
  LESIONS,
  BYID,
  SITES,
  GEO,
  MID,
  QANG,
  OV,
  UCR,
  XCR,
  ARC,
  EY,
  TH_CR,
  PTS,
  CRESCENT,
  NASALLIM,
  MACV,
  HEMI,
  ALT,
  lerp,
  splitCubic,
  cub,
  channelState,
  primsOf,
  sigOf,
  blindAt,
  runs,
  annSect,
  fieldSize,
  beanPath,
  thXY,
  ovX,
  ovBottomY,
  maskSummary,
  fieldOf,
  fieldSup,
  fieldInf,
} from "@/helper/visualPathway";

/* ================================================================
   THEME — canvas 2D context can't resolve CSS custom properties.
   Hardcoded hex values matching Stuart's palette.
   ================================================================ */
const THEME = {
  fieldSeen: "#b3c0dd",
  fieldBlind: "#221f1f",
  mask: "#000000",
  fixation: "#e51919",
  outline: "#a2957e",
  rgb: {
    plain: "255,255,255",
    fov: "255,236,150",
    nose: "255,140,140",
    pill: "12,12,14",
  },
  maskBothAlpha: 0.975,
  maskOneDim: 0.14,
  maskOneHatch: 0.68,
  maskBlurPx: 4,
};
const rgba = (triplet, a) => `rgba(${triplet},${a})`;

/* ================================================================
   Reactive state
   ================================================================ */
const active = ref(new Set());
const tab = ref("main");
const view = ref("both");
const playing = ref(true);
const videoOK = ref(true);

const quiz = ref({
  on: false,
  dir: "find",
  target: "chiasm",
  options: null,
  answered: false,
  picked: null,
  right: 0,
  total: 0,
});

/* ================================================================
   Template refs
   ================================================================ */
const diaSvg = ref(null);
const projSvg = ref(null);
const sceneCv = ref(null);
const fLCv = ref(null);
const fRCv = ref(null);
const vidEl = ref(null);

/* ================================================================
   Computed: which lesions drive what
   ================================================================ */
const pathSet = computed(() => {
  const qz = quiz.value;
  if (!qz.on) return active.value;
  if (qz.dir === "find") return qz.answered ? new Set([qz.target]) : new Set();
  return new Set([qz.target]);
});

const revealSet = computed(() => {
  const qz = quiz.value;
  if (!qz.on) return active.value;
  if (qz.dir === "find") return new Set([qz.target]);
  return qz.answered ? new Set([qz.target]) : new Set();
});

const primsL = computed(() => primsOf(revealSet.value, "L"));
const primsR = computed(() => primsOf(revealSet.value, "R"));

/* ================================================================
   SVG builder helper (same A(tag, attrs, inner) pattern as Stuart)
   ================================================================ */
function A(tag, attrs, inner = "") {
  let o = "<" + tag;
  for (const k in attrs) {
    if (attrs[k] !== undefined && attrs[k] !== null) o += ` ${k}="${attrs[k]}"`;
  }
  return o + (inner !== "" ? ">" + inner + "</" + tag + ">" : "/>");
}

function seg(d, ch, stage, color, w, extra = {}) {
  return A(
    "path",
    Object.assign(
      {
        class: "seg",
        d,
        fill: "none",
        stroke: color,
        "stroke-width": w,
        "stroke-linecap": "round",
        "data-ch": ch.join(","),
        "data-stage": stage,
      },
      extra
    )
  );
}

/* ================================================================
   Build the pathway diagram SVG (innerHTML string)
   ================================================================ */
const diagramSvg = computed(() => {
  let s = "";

  /* ---------- cerebrum, inferior view ---------- */
  const OL = GEO.outline;
  const halfL = "M 230 " + OL.top + " " + OL.half + " Z";
  const flipHalf = OL.half.replace(
    /(-?[\d.]+) (-?[\d.]+)/g,
    (m, x, y) => MID - parseFloat(x) + " " + y
  );
  const halfR = "M 230 " + OL.top + " " + flipHalf + " Z";
  [halfL, halfR].forEach((d) => {
    s += A("path", {
      d,
      fill: "var(--vpl-brain)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": GEO.stroke.outline,
    });
  });
  /* interhemispheric fissure */
  s += A("line", {
    x1: 230,
    y1: OL.top,
    x2: 230,
    y2: OL.bottom,
    stroke: "var(--vpl-brainline)",
    "stroke-width": 1,
    "stroke-dasharray": "3 4",
    opacity: 0.6,
  });
  /* occipitotemporal sulcus */
  ["L", "R"].forEach((sd) => {
    const d =
      sd === "L"
        ? OL.sulcus
        : OL.sulcus.replace(
            /(-?[\d.]+) (-?[\d.]+)/g,
            (m, x, y) => MID - parseFloat(x) + " " + y
          );
    s += A("path", {
      d,
      fill: "none",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 0.9,
      opacity: 0.5,
    });
  });

  /* ---------- midbrain and mammillary bodies ---------- */
  s += A("path", {
    d: GEO.midbrain,
    fill: "var(--vpl-cream)",
    stroke: "var(--vpl-brainline)",
    "stroke-width": 1.1,
  });
  GEO.mammillary.slice(0, 2).forEach(([mx, my]) => {
    s += A("circle", {
      cx: mx,
      cy: my,
      r: GEO.mammillary[2],
      fill: "var(--vpl-mammil)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 0.8,
    });
  });

  /* ---------- casings: nerves, chiasm, tracts ---------- */
  const casing = "var(--vpl-sheath)";
  ["L", "R"].forEach((E) => {
    const X = (x) => (E === "L" ? x : MID - x);
    const nd = `M ${X(161)} 107 C ${X(178)} 133, ${X(196)} 159, ${X(213)} 184`;
    s += A("path", {
      d: nd,
      fill: "none",
      stroke: casing,
      "stroke-width": GEO.stroke.nerveSheath,
      "stroke-linecap": "round",
    });
    s += A("path", {
      d: nd,
      fill: "none",
      stroke: "var(--vpl-brainline)",
      "stroke-width": GEO.stroke.nerveSheath + 1.4,
      "stroke-linecap": "round",
      opacity: 0.26,
    });
  });
  s += A("path", {
    d: "M 198 180 L 258 230",
    fill: "none",
    stroke: casing,
    "stroke-width": 18,
    "stroke-linecap": "round",
  });
  s += A("path", {
    d: "M 262 180 L 202 230",
    fill: "none",
    stroke: casing,
    "stroke-width": 18,
    "stroke-linecap": "round",
  });
  ["L", "R"].forEach((S) => {
    const X = (x) => (S === "L" ? x : MID - x);
    const d = `M ${X(207)} 233 C ${X(201)} 253, ${X(189)} 277, ${X(178)} 292`;
    s += A("path", {
      d,
      fill: "none",
      stroke: casing,
      "stroke-width": GEO.stroke.tractSheath,
      "stroke-linecap": "round",
    });
    s += A("path", {
      d,
      fill: "none",
      stroke: "var(--vpl-brainline)",
      "stroke-width": GEO.stroke.tractSheath + 1.4,
      "stroke-linecap": "round",
      opacity: 0.26,
    });
  });

  /* ---------- eyes ---------- */
  ["L", "R"].forEach((E) => {
    const cx = E === "L" ? GEO.eye.cx : MID - GEO.eye.cx;
    const cy = GEO.eye.cy;
    const r = GEO.eye.r;
    s += A("circle", {
      cx,
      cy,
      r,
      fill: "var(--vpl-sclera)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 1.3,
    });
    s += A("path", {
      d: `M ${cx - 23} ${cy - 22} Q ${cx} ${cy - 45}, ${cx + 23} ${cy - 22} Z`,
      fill: "var(--vpl-cornea)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 1,
    });
    s += A("ellipse", {
      cx,
      cy: cy - 13,
      rx: 14,
      ry: 6.5,
      fill: "var(--vpl-lens)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 0.9,
    });
    /* retina halves */
    s += seg(
      `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy + r}`,
      [E + "RS", E + "RI"],
      1,
      "var(--vpl-vfR)",
      5.5
    );
    s += seg(
      `M ${cx} ${cy + r} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`,
      [E + "LS", E + "LI"],
      1,
      "var(--vpl-vfL)",
      5.5
    );
    if (E === "L") {
      s += A(
        "text",
        { class: "lbl lh", x: cx - 33, y: 110, "text-anchor": "middle" },
        "Temporal"
      );
      s += A(
        "text",
        { class: "lbl lh", x: cx + 34, y: 110, "text-anchor": "middle" },
        "Nasal"
      );
    }
    /* optic disc */
    const X = (x) => (E === "L" ? x : MID - x);
    s += A("ellipse", {
      cx,
      cy: cy + r - 1,
      rx: 6,
      ry: 3,
      fill: "var(--vpl-disc)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 0.8,
    });
    /* nerve fibres */
    const nasalCh = E === "L" ? [E + "LS", E + "LI"] : [E + "RS", E + "RI"];
    const tempCh = E === "L" ? [E + "RS", E + "RI"] : [E + "LS", E + "LI"];
    const nasalCol = E === "L" ? "var(--vpl-vfL)" : "var(--vpl-vfR)";
    const tempCol = E === "L" ? "var(--vpl-vfR)" : "var(--vpl-vfL)";
    s += seg(
      `M ${X(159.3)} 108 C ${X(176)} 134, ${X(194)} 160, ${X(210.9)} 185`,
      tempCh,
      2,
      tempCol,
      GEO.stroke.fibre
    );
    s += seg(
      `M ${X(162.7)} 106 C ${X(180)} 132, ${X(198)} 158, ${X(215.1)} 183`,
      nasalCh,
      2,
      nasalCol,
      GEO.stroke.fibre
    );
  });

  /* ---------- chiasm strands ---------- */
  ["L", "R"].forEach((E) => {
    const X = (x) => (E === "L" ? x : MID - x);
    const nasalCh = E === "L" ? ["LLS", "LLI"] : ["RRS", "RRI"];
    const tempCh = E === "L" ? ["LRS", "LRI"] : ["RLS", "RLI"];
    const nasalCol = E === "L" ? "var(--vpl-vfL)" : "var(--vpl-vfR)";
    const tempCol = E === "L" ? "var(--vpl-vfR)" : "var(--vpl-vfL)";
    const O = (x) => (E === "L" ? MID - x : x);
    s += seg(
      `M ${X(210.9)} 185 C ${X(209)} 201, ${X(207)} 218, ${X(205.5)} 235`,
      tempCh,
      3,
      tempCol,
      GEO.stroke.fibre
    );
    s += seg(
      `M ${X(215.1)} 183 C ${X(228)} 197, ${O(212)} 220, ${O(208.5)} 237`,
      nasalCh,
      3,
      nasalCol,
      GEO.stroke.fibre
    );
  });

  /* ---------- tracts, LGN, radiation, V1 ---------- */
  ["L", "R"].forEach((S) => {
    const X = (x) => (S === "L" ? x : MID - x);
    const hemi = S === "L" ? "R" : "L";
    const col = hemi === "L" ? "var(--vpl-vfL)" : "var(--vpl-vfR)";
    const chAll = fieldOf(hemi);
    const chS = fieldSup(hemi);
    const chI = fieldInf(hemi);
    const oth = S === "L" ? "R" : "L";

    s += seg(
      `M ${X(205.5)} 235 C ${X(200)} 254, ${X(188)} 276, ${X(176.5)} 291`,
      [S + hemi + "S", S + hemi + "I"],
      4,
      col,
      GEO.stroke.tract
    );
    s += seg(
      `M ${X(208.5)} 237 C ${X(203)} 256, ${X(191)} 278, ${X(179.5)} 293`,
      [oth + hemi + "S", oth + hemi + "I"],
      4,
      col,
      GEO.stroke.tract
    );

    /* LGN */
    const LG = GEO.lgn;
    s += A("ellipse", {
      class: "seg",
      cx: X(LG.cx),
      cy: LG.cy,
      rx: LG.rx,
      ry: LG.ry,
      transform: `rotate(${S === "L" ? -LG.tilt : LG.tilt} ${X(LG.cx)} ${LG.cy})`,
      fill: "var(--vpl-lgn)",
      stroke: "var(--vpl-lgn-edge)",
      "stroke-width": 1.1,
      "data-ch": chAll.join(","),
      "data-stage": 5,
    });
    for (let k = -1; k <= 1; k++) {
      s += A("line", {
        class: "seg",
        x1: X(LG.cx) - 13,
        y1: LG.cy + k * 4.2,
        x2: X(LG.cx) + 13,
        y2: LG.cy + k * 4.2,
        transform: `rotate(${S === "L" ? -LG.tilt : LG.tilt} ${X(LG.cx)} ${LG.cy})`,
        stroke: "var(--vpl-lgn-lamina)",
        "stroke-width": 0.8,
        "data-ch": chAll.join(","),
        "data-stage": 5,
        opacity: 0.9,
      });
    }

    /* optic radiation fan */
    const F = GEO.fan;
    const V = GEO.v1;
    const N = F.n;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const p = [
        [X(lerp(162, 181, u)), lerp(307, 295, u)],
        [X(lerp(F.latC1, F.medC1, u)), lerp(291, 352, u)],
        [X(lerp(F.latC2, F.medC2, u)), lerp(472, 464, u)],
        [X(lerp(V.from[0], V.to[0], u)), lerp(V.from[1] + 1, V.to[1], u)],
      ];
      const ch = u < 0.5 ? chS : chI;
      const [a, rest] = splitCubic(p, 0.35);
      const [b, c] = splitCubic(rest, 0.538);
      s += seg(cub(a), ch, 5.6, col, GEO.stroke.fan);
      s += seg(cub(b), ch, 6.2, col, GEO.stroke.fan);
      s += seg(cub(c), ch, 6.6, col, GEO.stroke.fan);
    }
    /* V1 band */
    s += seg(
      `M ${X(V.from[0])} ${V.from[1]} C ${X(V.from[0] + 6)} ${V.from[1] - 24}, ` +
        `${X(V.to[0] - 9)} ${V.to[1] + 24}, ${X(V.to[0])} ${V.to[1]}`,
      chAll,
      7,
      col,
      GEO.stroke.v1,
      { "stroke-opacity": 0.55 }
    );
  });

  /* ---------- labels ---------- */
  s += A(
    "text",
    { class: "lbl b", x: 176, y: 26, "text-anchor": "middle" },
    "Left"
  );
  s += A(
    "text",
    { class: "lbl b", x: 284, y: 26, "text-anchor": "middle" },
    "Right"
  );
  const labels = [
    ["Optic nerve", 144, 118, [172, 138]],
    ["Optic chiasm", 196, 96, [208, 198]],
    ["Optic tract", 250, 76, [190, 258]],
    ["LGN", 300, 62, [157, 299]],
    ["Optic radiation", 368, null, null],
    ["(inferior)", 379, 20, [50, 390]],
    ["Primary visual", 562, 148, [192, 572]],
    ["cortex (V1)", 573, null, null],
  ];
  labels.forEach(([t, y, bend, target]) => {
    s += A("text", { class: "lbl", x: -6, y: y + 4, "text-anchor": "end" }, t);
    if (bend !== null)
      s += A("polyline", {
        class: "lead",
        points: `-2,${y + 2} ${bend},${y + 2} ${target[0]},${target[1]}`,
      });
  });
  [
    ["Optic radiation", 444],
    ["(superior)", 455],
  ].forEach(([t, y]) => {
    s += A("text", { class: "lbl lh", x: 200, y, "text-anchor": "middle" }, t);
  });
  s += A("polyline", { class: "lead", points: "186,440 170,428" });
  s += A(
    "text",
    {
      class: "lbl",
      x: 230,
      y: 322,
      "text-anchor": "middle",
      opacity: 0.8,
    },
    "midbrain"
  );

  /* ---------- lesion markers ---------- */
  LESIONS.forEach((l) => {
    const rad = (l.ang * Math.PI) / 180;
    const hx = Math.cos(rad) * (l.len / 2);
    const hy = -Math.sin(rad) * (l.len / 2);
    s += A("line", {
      class: "slash",
      id: "sl-" + l.id,
      x1: l.x - hx,
      y1: l.y - hy,
      x2: l.x + hx,
      y2: l.y + hy,
    });
  });
  LESIONS.forEach((l) => {
    s += A(
      "g",
      {
        class: "lz",
        id: "lz-" + l.id,
        "data-id": l.id,
        role: "button",
        tabindex: 0,
        "aria-label": l.name + " lesion",
        "aria-pressed": "false",
      },
      A("circle", { class: "halo", cx: l.x, cy: l.y, r: 16 }) +
        A("circle", { class: "hit", cx: l.x, cy: l.y, r: 19 }) +
        A("circle", { class: "dot", cx: l.x, cy: l.y, r: 8 }) +
        A("text", { class: "glyph", x: l.x, y: l.y }, l.tag || "✕") +
        A("title", {}, l.name + " — " + l.dx)
    );
  });

  return s;
});

/* ================================================================
   Build the projection panel SVG (innerHTML string)
   ================================================================ */
const BLACK = THEME.fieldBlind;
const HALF_COL = rgba("34,31,31", ".32");

const projectionSvg = computed(() => {
  let s = "";

  s += `<defs>
    <clipPath id="cpOval"><ellipse cx="${OV.cx}" cy="${OV.cy}" rx="${OV.rx}" ry="${OV.ry}"/></clipPath>
    <clipPath id="cpBino"><rect x="${2 * OV.cx - XCR}" y="0" width="${2 * (XCR - OV.cx)}" height="200"/></clipPath>
    <clipPath id="cpMonoL"><rect x="0" y="0" width="${2 * OV.cx - XCR}" height="200"/></clipPath>
    <clipPath id="cpMonoR"><rect x="${XCR}" y="0" width="200" height="200"/></clipPath>
    <clipPath id="cpArcBino"><path d="${annSect(ARC.cx, ARC.cy, ARC.r0 - 2, ARC.r1 + 2, (-TH_CR * Math.PI) / 180, (-(180 - TH_CR) * Math.PI) / 180)}"/></clipPath>
  </defs>`;

  /* composite binocular field oval */
  s += A(
    "g",
    { "clip-path": "url(#cpOval)" },
    A("rect", {
      x: OV.cx - OV.rx,
      y: OV.cy - OV.ry,
      width: OV.rx,
      height: OV.ry,
      fill: "var(--vpl-ov-LU)",
    }) +
      A("rect", {
        x: OV.cx - OV.rx,
        y: OV.cy,
        width: OV.rx,
        height: OV.ry,
        fill: "var(--vpl-ov-LL)",
      }) +
      A("rect", {
        x: OV.cx,
        y: OV.cy - OV.ry,
        width: OV.rx,
        height: OV.ry,
        fill: "var(--vpl-ov-RU)",
      }) +
      A("rect", {
        x: OV.cx,
        y: OV.cy,
        width: OV.rx,
        height: OV.ry,
        fill: "var(--vpl-ov-RL)",
      }) +
      A("rect", {
        x: OV.cx - OV.rx,
        y: 0,
        width: OV.rx - UCR * OV.rx,
        height: 200,
        fill: "#fff",
        opacity: 0.44,
      }) +
      A("rect", {
        x: XCR,
        y: 0,
        width: OV.rx,
        height: 200,
        fill: "#fff",
        opacity: 0.44,
      }) +
      A("g", { id: "ovalFill" })
  );
  s += A("ellipse", {
    cx: OV.cx,
    cy: OV.cy,
    rx: OV.rx,
    ry: OV.ry,
    fill: "none",
    stroke: "#6b6459",
    "stroke-width": 1.2,
  });
  s += A("line", {
    x1: OV.cx,
    y1: OV.cy - OV.ry,
    x2: OV.cx,
    y2: OV.cy + OV.ry,
    stroke: "#fff",
    "stroke-width": 1.6,
  });
  s += A("line", {
    x1: OV.cx - OV.rx,
    y1: OV.cy,
    x2: OV.cx + OV.rx,
    y2: OV.cy,
    stroke: "#fff",
    "stroke-width": 1.4,
    opacity: 0.85,
  });
  [2 * OV.cx - XCR, XCR].forEach((x) => {
    s += A("line", {
      x1: x,
      y1: OV.cy - OV.ry * 0.97,
      x2: x,
      y2: OV.cy + OV.ry * 0.97,
      stroke: "#4b4640",
      "stroke-width": 0.9,
      "stroke-dasharray": "3 3",
      opacity: 0.7,
    });
  });
  /* bracket */
  s += A("path", {
    d: `M ${2 * OV.cx - XCR} 26 L ${2 * OV.cx - XCR} 19 L ${XCR} 19 L ${XCR} 26`,
    fill: "none",
    stroke: "#6b6459",
    "stroke-width": 1,
  });
  s += A(
    "text",
    { class: "lbl", x: OV.cx, y: 12, "text-anchor": "middle" },
    "Binocular visual field"
  );
  s += A(
    "text",
    { class: "lbl", x: OV.cx - OV.rx - 6, y: OV.cy - 4, "text-anchor": "end" },
    "Left visual"
  );
  s += A(
    "text",
    { class: "lbl", x: OV.cx - OV.rx - 6, y: OV.cy + 7, "text-anchor": "end" },
    "field"
  );
  s += A(
    "text",
    { class: "lbl", x: OV.cx + OV.rx + 6, y: OV.cy - 4 },
    "Right visual"
  );
  s += A("text", { class: "lbl", x: OV.cx + OV.rx + 6, y: OV.cy + 7 }, "field");

  /* dashed correspondence lines */
  PTS.forEach((p) => {
    const [ax, ay] = thXY(p.th, ARC.rm);
    s += A("line", {
      x1: ovX(p),
      y1: ovBottomY(p) + 1,
      x2: ax,
      y2: ay - 10,
      stroke: "#a8a29e",
      "stroke-width": 0.8,
      "stroke-dasharray": "4 4",
    });
  });

  /* field arc in front of the eyes */
  const halfArc = (t0, t1, fill, op) =>
    A("path", {
      d: annSect(
        ARC.cx,
        ARC.cy,
        ARC.r0,
        ARC.r1,
        (-t1 * Math.PI) / 180,
        (-t0 * Math.PI) / 180
      ),
      fill,
      opacity: op,
    });
  s += halfArc(90, 180, "var(--vpl-vfL)", 1);
  s += halfArc(0, 90, "var(--vpl-vfR)", 1);
  s += halfArc(TH_CR, 180, "#fff", 0.44);
  s += halfArc(0, 180 - TH_CR, "#fff", 0.44);
  s += A("g", { id: "arcFill" });
  s += A("path", {
    d: annSect(ARC.cx, ARC.cy, ARC.r0, ARC.r1, -Math.PI, 0),
    fill: "none",
    stroke: "#6b6459",
    "stroke-width": 1,
  });
  [TH_CR, 180 - TH_CR].forEach((t) => {
    const [x0, y0] = thXY(t, ARC.r0);
    const [x1, y1] = thXY(t, ARC.r1);
    s += A("line", {
      x1: x0,
      y1: y0,
      x2: x1,
      y2: y1,
      stroke: "#4b4640",
      "stroke-width": 0.9,
      "stroke-dasharray": "3 3",
      opacity: 0.7,
    });
  });
  s += A(
    "text",
    {
      class: "lbl lh",
      x: ARC.cx,
      y: ARC.cy - ARC.r1 - 14,
      "text-anchor": "middle",
    },
    "Fixation point"
  );
  s += A("text", { class: "lbl", x: 24, y: 398 }, "Left visual");
  s += A("text", { class: "lbl", x: 24, y: 409 }, "field");
  s += A(
    "text",
    { class: "lbl", x: 536, y: 398, "text-anchor": "end" },
    "Right visual"
  );
  s += A(
    "text",
    { class: "lbl", x: 536, y: 409, "text-anchor": "end" },
    "field"
  );

  /* rays */
  PTS.forEach((p) => {
    const [px, py] = thXY(p.th, ARC.rm);
    p.eyes.forEach((e) => {
      const E = EY[e];
      const dx = E.x - px;
      const dy = E.y - py;
      const L = Math.hypot(dx, dy);
      const sx = E.x + (dx / L) * E.r;
      const sy = E.y + (dy / L) * E.r;
      const col =
        p.hemi === "both"
          ? "#57534e"
          : p.hemi === "L"
            ? "var(--vpl-vfL)"
            : "var(--vpl-vfR)";
      s += A("line", {
        class: "ray",
        id: `ray-${p.id}-${e}`,
        x1: px,
        y1: py,
        x2: sx,
        y2: sy,
        stroke: col,
      });
      s += A("circle", {
        class: "rspot",
        id: `spot-${p.id}-${e}`,
        cx: sx,
        cy: sy,
        r: 2.6,
        fill: col,
        stroke: "#fff",
        "stroke-width": 0.8,
      });
    });
  });

  /* nose */
  s += A("path", {
    d: `M ${OV.cx} 544 L ${OV.cx + 13} 596 L ${OV.cx - 13} 596 Z`,
    fill: "var(--vpl-nose)",
    stroke: "#a2957e",
    "stroke-width": 1,
  });
  s += A(
    "text",
    {
      class: "lbl lh",
      x: OV.cx,
      y: 536,
      "text-anchor": "middle",
      opacity: 0.9,
    },
    "nose"
  );

  /* eyes */
  ["L", "R"].forEach((e) => {
    const E = EY[e];
    s += A("circle", {
      cx: E.x,
      cy: E.y,
      r: E.r,
      fill: "var(--vpl-sclera)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 1.2,
    });
    s += A("path", {
      d: `M ${E.x - 20} ${E.y - 19} Q ${E.x} ${E.y - 40}, ${E.x + 20} ${E.y - 19} Z`,
      fill: "var(--vpl-cornea)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 0.9,
    });
    s += A("ellipse", {
      cx: E.x,
      cy: E.y - 11,
      rx: 12,
      ry: 5.5,
      fill: "var(--vpl-lens)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 0.8,
    });
    s += seg(
      `M ${E.x - E.r} ${E.y} A ${E.r} ${E.r} 0 0 0 ${E.x} ${E.y + E.r}`,
      [e + "RS", e + "RI"],
      1,
      "var(--vpl-vfR)",
      5
    );
    s += seg(
      `M ${E.x} ${E.y + E.r} A ${E.r} ${E.r} 0 0 0 ${E.x + E.r} ${E.y}`,
      [e + "LS", e + "LI"],
      1,
      "var(--vpl-vfL)",
      5
    );
  });
  s += A(
    "text",
    { class: "lbl lh", x: 96, y: 676, "text-anchor": "middle" },
    "Temporal retina"
  );
  s += A("polyline", { class: "lead", points: "134,672 168,650 186,626" });
  s += A(
    "text",
    { class: "lbl lh", x: 464, y: 676, "text-anchor": "middle" },
    "Temporal retina"
  );
  s += A("polyline", { class: "lead", points: "426,672 392,650 374,626" });
  s += A(
    "text",
    { class: "lbl lh", x: OV.cx, y: 644, "text-anchor": "middle" },
    "Nasal retina"
  );
  s += A("polyline", { class: "lead", points: "254,643 240,634 234,626" });
  s += A("polyline", { class: "lead", points: "306,643 320,634 326,626" });

  /* nerves, chiasm, tracts */
  ["L", "R"].forEach((e) => {
    const X = (x) => (e === "L" ? x : 560 - x);
    const E = EY[e];
    s += A("path", {
      d: `M ${X(212)} 630 C ${X(230)} 652, ${X(254)} 663, ${X(272)} 670`,
      fill: "none",
      stroke: "var(--vpl-sheath)",
      "stroke-width": 13,
      "stroke-linecap": "round",
    });
    s += A("path", {
      d: `M ${X(212)} 630 C ${X(230)} 652, ${X(254)} 663, ${X(272)} 670`,
      fill: "none",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 14.4,
      "stroke-linecap": "round",
      opacity: 0.28,
    });
    s += A("ellipse", {
      cx: X(212),
      cy: E.y + E.r - 1,
      rx: 5.5,
      ry: 2.8,
      fill: "var(--vpl-disc)",
      stroke: "var(--vpl-brainline)",
      "stroke-width": 0.8,
    });
    const nasalCh = e === "L" ? ["LLS", "LLI"] : ["RRS", "RRI"];
    const tempCh = e === "L" ? ["LRS", "LRI"] : ["RLS", "RLI"];
    const nasalCol = e === "L" ? "var(--vpl-vfL)" : "var(--vpl-vfR)";
    const tempCol = e === "L" ? "var(--vpl-vfR)" : "var(--vpl-vfL)";
    s += seg(
      `M ${X(213.4)} 628 C ${X(231.4)} 650, ${X(255.4)} 661, ${X(273.4)} 668`,
      nasalCh,
      2,
      nasalCol,
      2.7
    );
    s += seg(
      `M ${X(210.6)} 632 C ${X(228.6)} 654, ${X(252.6)} 665, ${X(270.6)} 672`,
      tempCh,
      2,
      tempCol,
      2.7
    );
    s += seg(
      `M ${X(273.4)} 668 C ${X(279)} 680, ${X(286)} 694, ${X(290)} 706`,
      nasalCh,
      3,
      nasalCol,
      2.7
    );
    s += seg(
      `M ${X(270.6)} 672 C ${X(269)} 682, ${X(268)} 693, ${X(267)} 704`,
      tempCh,
      3,
      tempCol,
      2.7
    );
  });
  ["L", "R"].forEach((e) => {
    const X = (x) => (e === "L" ? x : 560 - x);
    const col = e === "L" ? "var(--vpl-vfR)" : "var(--vpl-vfL)";
    const own = e === "L" ? ["LRS", "LRI"] : ["RLS", "RLI"];
    const cro = e === "L" ? ["RRS", "RRI"] : ["LLS", "LLI"];
    s += A("path", {
      d: `M ${X(268.5)} 703 C ${X(258.5)} 721, ${X(238.5)} 737, ${X(221.5)} 747`,
      fill: "none",
      stroke: "var(--vpl-sheath)",
      "stroke-width": 11,
      "stroke-linecap": "round",
    });
    s += seg(
      `M ${X(267)} 704 C ${X(257)} 722, ${X(237)} 738, ${X(220)} 748`,
      own,
      4,
      col,
      2.7
    );
    s += seg(
      `M ${X(270)} 706 C ${X(260)} 724, ${X(240)} 740, ${X(223)} 750`,
      cro,
      4,
      col,
      2.7
    );
  });
  s += A("text", { class: "lbl lh", x: 340, y: 692 }, "Optic chiasm");
  s += A("polyline", { class: "lead", points: "338,689 308,687" });
  s += A(
    "text",
    { class: "lbl", x: 188, y: 768, "text-anchor": "middle" },
    "Left optic tract"
  );
  s += A(
    "text",
    { class: "lbl", x: 372, y: 768, "text-anchor": "middle" },
    "Right optic tract"
  );

  /* point markers */
  PTS.forEach((p) => {
    const [ax, ay] = thXY(p.th, ARC.rm);
    [
      [ovX(p), OV.cy, "o"],
      [ax, ay, "a"],
    ].forEach(([x, y, k]) => {
      s += A(
        "g",
        { class: "pt", id: `pt-${k}-${p.id}` },
        A("circle", {
          class: "ring",
          cx: x,
          cy: y,
          r: p.id === "FP" ? 10 : 8.5,
        }) + A("text", { class: "txt", x, y }, p.id)
      );
    });
  });

  return s;
});

/* ================================================================
   Presets (classic cases)
   ================================================================ */
const PRESETS = [
  { id: "on-R", label: "A · R optic nerve" },
  { id: "chiasm", label: "B · Chiasm" },
  { id: "tract-R", label: "C · R optic tract" },
  { id: "mey-R", label: "D · R Meyer’s loop" },
  { id: "post-R", label: "E · R V1 (macular sparing)" },
];

function isPresetActive(id) {
  return active.value.size === 1 && active.value.has(id);
}

function applyPreset(id) {
  const only = active.value.size === 1 && active.value.has(id);
  active.value = new Set();
  if (!only) active.value.add(id);
  triggerUpdate();
}

function clearAll() {
  active.value = new Set();
  triggerUpdate();
}

/* ================================================================
   Lesion toggle / hilite
   ================================================================ */
function toggle(id) {
  const qz = quiz.value;
  if (qz.on) {
    if (qz.dir === "find") answerFind(id);
    return;
  }
  const s = new Set(active.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  active.value = s;
  triggerUpdate();
}

function hilite(id, on) {
  const svg = diaSvg.value;
  if (!svg) return;
  const g = svg.querySelector("#lz-" + id);
  if (g) g.classList.toggle("hl", on);
}

/* ================================================================
   Field chart drawing
   ================================================================ */
function drawField(cv, eye, prims, size) {
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const W = size || 248;
  const H = size || 248;
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2;
  const R = W * 0.415;

  ctx.save();
  beanPath(ctx, eye, cx, cy, R);
  ctx.fillStyle = THEME.fieldSeen;
  ctx.fill();
  ctx.clip();

  /* blind regions */
  ctx.fillStyle = THEME.fieldBlind;
  prims.forEach((p) => {
    const [a0, a1] = QANG[p.h + p.a];
    const ro = (p.ro >= 1 ? 2.2 : p.ro) * R;
    const ri = p.ri * R;
    ctx.beginPath();
    if (ri <= 0.001) {
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, ro, a0, a1);
    } else {
      ctx.arc(cx, cy, ro, a0, a1);
      ctx.arc(cx, cy, ri, a1, a0, true);
    }
    ctx.closePath();
    ctx.fill();
  });
  /* meridians */
  ctx.strokeStyle = rgba(THEME.rgb.plain, 0.92);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy - R * 1.3);
  ctx.lineTo(cx, cy + R * 1.3);
  ctx.moveTo(cx - R * 1.3, cy);
  ctx.lineTo(cx + R * 1.3, cy);
  ctx.stroke();
  /* eccentricity rings */
  ctx.strokeStyle = rgba(THEME.rgb.plain, 0.42);
  ctx.lineWidth = 1;
  [0.34, 0.67].forEach((f) => {
    ctx.beginPath();
    ctx.arc(cx, cy, R * f, 0, 7);
    ctx.stroke();
  });
  ctx.restore();

  /* outline */
  beanPath(ctx, eye, cx, cy, R);
  ctx.strokeStyle = THEME.outline;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  /* fixation */
  ctx.fillStyle = THEME.fixation;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.6, W / 108), 0, 7);
  ctx.fill();
}

/* ================================================================
   Scene canvas (looping video with deficit overlay)
   ================================================================ */
let DK = 1;
let maskCv = null;
let hatchPat = null;
let hatchK = 0;
let rafId = null;

const rv = (r) => (r > 0.001 && r < 0.5 ? MACV : r);

function computeMaskPrims() {
  const out = [];
  const pL = primsL.value;
  const pR = primsR.value;
  if (view.value !== "both") {
    const prims = view.value === "L" ? pL : pR;
    prims.forEach((p) =>
      out.push({ h: p.h, a: p.a, ri: p.ri, ro: p.ro, lv: 2, zone: "all" })
    );
    return out;
  }
  HEMI.forEach((h) =>
    ALT.forEach((a) => {
      runs(72, (i) => {
        const r = i / 72;
        const l = blindAt(pL, h, a, r);
        const g = blindAt(pR, h, a, r);
        return l && g ? 2 : l || g ? 1 : 0;
      }).forEach((run) =>
        out.push({ h, a, ri: run.a, ro: run.b, lv: run.v, zone: "bino" })
      );
      const solo = h === "L" ? pL : pR;
      runs(72, (i) => (blindAt(solo, h, a, i / 72) ? 2 : 0)).forEach((run) =>
        out.push({
          h,
          a,
          ri: run.a,
          ro: run.b,
          lv: 2,
          zone: h === "L" ? "monoL" : "monoR",
        })
      );
    })
  );
  return out;
}

function drawOcclusion(g, W, H) {
  if (view.value === "both") return;
  const unit = W / 2;
  const cx = W / 2;
  const x = view.value === "L" ? cx + NASALLIM * unit : 0;
  const w =
    view.value === "L" ? W - (cx + NASALLIM * unit) : cx - NASALLIM * unit;
  g.save();
  g.globalAlpha = 0.96;
  g.fillStyle = THEME.mask;
  g.fillRect(x, 0, w, H);
  g.restore();
}

function pill(g, x, y, t, col, W, size) {
  const f = (size || 12) * DK;
  const pad = 8 * DK;
  const h = f * 1.7;
  g.font =
    "600 " +
    f.toFixed(1) +
    "px var(--font-body), ui-sans-serif, system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const w = g.measureText(t).width + pad * 2;
  if (W) x = Math.max(w / 2 + 4 * DK, Math.min(W - w / 2 - 4 * DK, x));
  g.fillStyle = rgba(THEME.rgb.pill, 0.66);
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.fill();
  g.fillStyle = col || "#fff";
  g.fillText(t, x, y + 0.5);
}

function drawContours(g, W, H) {
  const unit = W / 2;
  const cx = W / 2;
  const cy = H / 2;
  g.save();
  g.lineWidth = 1.5 * DK;
  g.setLineDash([6 * DK, 5 * DK]);
  g.strokeStyle = rgba(THEME.rgb.plain, 0.72);
  g.beginPath();
  g.moveTo(cx, 0);
  g.lineTo(cx, H);
  g.moveTo(0, cy);
  g.lineTo(W, cy);
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, MACV * unit, 0, 7);
  g.stroke();
  if (view.value === "both") {
    g.setLineDash([9 * DK, 6 * DK]);
    g.lineWidth = 2 * DK;
    g.strokeStyle = rgba(THEME.rgb.fov, 0.95);
    [-CRESCENT, CRESCENT].forEach((u) => {
      const x = cx + u * unit;
      g.beginPath();
      g.moveTo(x, 4);
      g.lineTo(x, H - 4);
      g.stroke();
    });
  }
  if (view.value !== "both") {
    const x = cx + (view.value === "L" ? NASALLIM : -NASALLIM) * unit;
    g.setLineDash([7 * DK, 5 * DK]);
    g.strokeStyle = rgba(THEME.rgb.nose, 0.95);
    g.beginPath();
    g.moveTo(x, 4);
    g.lineTo(x, H - 4);
    g.stroke();
  }
  g.setLineDash([]);
  const ty = 15 * DK;
  if (view.value === "both") {
    pill(g, cx - ((1 + CRESCENT) / 2) * unit, ty, "L only", "#ffec96", W);
    pill(g, cx, ty, "binocular field", "#ffec96", W);
    pill(g, cx + ((1 + CRESCENT) / 2) * unit, ty, "R only", "#ffec96", W);
  } else {
    pill(
      g,
      cx + (view.value === "L" ? -1 : 1) * 0.4 * unit,
      ty,
      (view.value === "L" ? "left" : "right") + " eye alone",
      "#ffec96",
      W
    );
    pill(
      g,
      cx + (view.value === "L" ? 1 : -1) * ((NASALLIM + 1) / 2) * unit,
      H / 2,
      "nose",
      "#ff9c9c",
      W
    );
  }
  g.restore();
}

function getHatch(m) {
  if (hatchPat && hatchK === DK) return hatchPat;
  const per = Math.max(9, Math.round(11 * DK));
  const th = Math.max(2, Math.round(3.2 * DK));
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = per;
  const h = c.getContext("2d");
  h.fillStyle = THEME.mask;
  h.fillRect(0, 0, 8, th);
  const pat = m.createPattern(c, "repeat");
  try {
    pat.setTransform(new DOMMatrix().rotate(-45));
  } catch (e) {
    /* older browsers */
  }
  hatchK = DK;
  hatchPat = pat;
  return hatchPat;
}

function applyMask(g, W, H, prims) {
  if (!prims.length) return false;
  const unit = W / 2;
  const cx = W / 2;
  const cy = H / 2;
  if (!maskCv) maskCv = document.createElement("canvas");
  maskCv.width = W;
  maskCv.height = H;
  const m = maskCv.getContext("2d");

  const clipTo = (z) => {
    m.beginPath();
    if (z === "bino") m.rect(cx - CRESCENT * unit, 0, 2 * CRESCENT * unit, H);
    else if (z === "monoL") m.rect(0, 0, cx - CRESCENT * unit, H);
    else if (z === "monoR") m.rect(cx + CRESCENT * unit, 0, W, H);
    else m.rect(0, 0, W, H);
    m.clip();
  };

  const paint = (set, fill, alpha, blur) => {
    m.clearRect(0, 0, W, H);
    ["all", "bino", "monoL", "monoR"].forEach((z) => {
      const zs = set.filter((p) => (p.zone || "all") === z);
      if (!zs.length) return;
      m.save();
      clipTo(z);
      m.fillStyle = fill;
      zs.forEach((p) => {
        const [a0, a1] = QANG[p.h + p.a];
        const ro = p.ro >= 0.999 ? unit * 4 : rv(p.ro) * unit;
        const ri = rv(p.ri) * unit;
        m.beginPath();
        if (ri <= 0.001) {
          m.moveTo(cx, cy);
          m.arc(cx, cy, ro, a0, a1);
        } else {
          m.arc(cx, cy, ro, a0, a1);
          m.arc(cx, cy, ri, a1, a0, true);
        }
        m.closePath();
        m.fill();
      });
      m.restore();
    });
    g.save();
    try {
      g.filter = blur ? `blur(${THEME.maskBlurPx}px)` : "none";
    } catch (e) {
      /* no filter support */
    }
    g.globalAlpha = alpha;
    g.drawImage(maskCv, 0, 0);
    g.restore();
  };

  const sum = maskSummary(prims);
  const both = prims.filter((p) => p.lv === 2);
  const one = prims.filter((p) => p.lv === 1);
  if (both.length) paint(both, THEME.mask, THEME.maskBothAlpha, true);
  if (sum.hatchOK) {
    paint(one, THEME.mask, THEME.maskOneDim, true);
    paint(one, getHatch(m), THEME.maskOneHatch, false);
  }
  return sum.any1 && !sum.hatchOK;
}

function drawCross(g, W, H) {
  const a = 9 * DK;
  const cross = (col, lw) => {
    g.strokeStyle = col;
    g.lineWidth = lw * DK;
    g.lineCap = "round";
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(W / 2 - a, H / 2);
    g.lineTo(W / 2 + a, H / 2);
    g.moveTo(W / 2, H / 2 - a);
    g.lineTo(W / 2, H / 2 + a);
    g.stroke();
  };
  cross(rgba(THEME.rgb.plain, 0.9), 4.6);
  cross(THEME.fixation, 2.2);
}

function drawVideoFrame(g, W, H) {
  const vid = vidEl.value;
  if (!vid) return false;
  const vw = vid.videoWidth;
  const vh = vid.videoHeight;
  if (!videoOK.value || !vw || !vh) return false;
  const k = Math.max(W / vw, H / vh);
  const dw = vw * k;
  const dh = vh * k;
  g.drawImage(vid, (W - dw) / 2, (H - dh) / 2, dw, dh);
  return true;
}

function drawUnavailable(g, W, H) {
  g.fillStyle = "#cbd9e8";
  g.fillRect(0, 0, W, H);
  pill(g, W / 2, H / 2, "video unavailable in this browser", "#fff", W, 13);
}

function frame() {
  const cv = sceneCv.value;
  if (!cv) {
    rafId = requestAnimationFrame(frame);
    return;
  }
  const W = cv.width;
  const H = cv.height;
  const rect = cv.getBoundingClientRect();
  DK = rect.width ? cv.width / rect.width : 1;
  const sctx = cv.getContext("2d");
  if (!drawVideoFrame(sctx, W, H)) drawUnavailable(sctx, W, H);
  drawOcclusion(sctx, W, H);
  applyMask(sctx, W, H, computeMaskPrims());
  drawContours(sctx, W, H);
  drawCross(sctx, W, H);
  rafId = requestAnimationFrame(frame);
}

/* ================================================================
   Projection panel update
   ================================================================ */
function ptStatus(p, eye, prims) {
  if (!p.eyes.includes(eye)) return -1;
  const hs = p.hemi === "both" ? ["L", "R"] : [p.hemi];
  let n = 0;
  let b = 0;
  hs.forEach((h) =>
    ALT.forEach((a) => {
      n++;
      if (blindAt(prims, h, a, p.r)) b++;
    })
  );
  return b === 0 ? 0 : b === n ? 2 : 1;
}

function updateProjection() {
  const svg = projSvg.value;
  if (!svg || !svg.firstChild) return;
  const pL = primsL.value;
  const pR = primsR.value;
  const bL = (h, a, r) => blindAt(pL, h, a, r);
  const bR = (h, a, r) => blindAt(pR, h, a, r);

  /* oval blackout */
  const sc = `translate(${OV.cx} ${OV.cy}) scale(1 ${OV.ry / OV.rx})`;
  const zones = [
    [
      "cpBino",
      (h, a, r) => {
        const l = bL(h, a, r);
        const g = bR(h, a, r);
        return l && g ? 2 : l || g ? 1 : 0;
      },
    ],
    ["cpMonoL", (h, a, r) => (h === "L" && bL(h, a, r) ? 2 : 0)],
    ["cpMonoR", (h, a, r) => (h === "R" && bR(h, a, r) ? 2 : 0)],
  ];
  let o = "";
  zones.forEach(([clip, fn]) => {
    let inner = "";
    HEMI.forEach((h) =>
      ALT.forEach((a) => {
        const [a0, a1] = QANG[h + a];
        runs(90, (i) => fn(h, a, i / 90)).forEach((run) => {
          inner += `<path d="${annSect(0, 0, run.a * OV.rx, Math.min(run.b, 1) * OV.rx, a0, a1)}" fill="${run.v === 2 ? BLACK : HALF_COL}"/>`;
        });
      })
    );
    if (inner)
      o += `<g clip-path="url(#${clip})"><g transform="${sc}">${inner}</g></g>`;
  });
  const ovalFill = svg.querySelector("#ovalFill");
  if (ovalFill) ovalFill.innerHTML = o;

  /* arc blackout */
  const arcState = (t) => {
    const h = t > 90 ? "L" : "R";
    const r = Math.min(1, Math.abs(90 - t) / 90);
    const mono = r > UCR;
    const cnt = (e) =>
      ALT.reduce((k, a) => k + ((e === "L" ? bL : bR)(h, a, r) ? 1 : 0), 0);
    if (mono) {
      const c = cnt(h === "L" ? "L" : "R");
      return c === 2 ? 2 : c === 1 ? 1 : 0;
    }
    const cl = cnt("L");
    const cr = cnt("R");
    if (cl === 2 && cr === 2) return 2;
    return cl > 0 || cr > 0 ? 1 : 0;
  };
  let af = "";
  runs(180, (i) => arcState(180 - i)).forEach((run) => {
    const t1 = 180 - run.a * 180;
    const t0 = 180 - run.b * 180;
    af += `<path d="${annSect(ARC.cx, ARC.cy, ARC.r0, ARC.r1, (-t1 * Math.PI) / 180, (-t0 * Math.PI) / 180)}" fill="${run.v === 2 ? BLACK : HALF_COL}"/>`;
  });
  const arcFill = svg.querySelector("#arcFill");
  if (arcFill) arcFill.innerHTML = af;

  /* rays + point markers */
  PTS.forEach((p) => {
    const st = { L: ptStatus(p, "L", pL), R: ptStatus(p, "R", pR) };
    ["L", "R"].forEach((e) => {
      const ray = svg.querySelector(`#ray-${p.id}-${e}`);
      if (!ray) return;
      const op = st[e] === 2 ? 0.1 : st[e] === 1 ? 0.45 : 1;
      ray.style.opacity = op;
      const spot = svg.querySelector(`#spot-${p.id}-${e}`);
      if (spot) spot.style.opacity = op;
    });
    const seen = p.eyes.map((e) => st[e]);
    const cls = seen.every((v) => v === 2)
      ? "lost"
      : seen.some((v) => v > 0)
        ? "half"
        : "";
    ["o", "a"].forEach((k) => {
      const g = svg.querySelector(`#pt-${k}-${p.id}`);
      if (g) {
        g.classList.remove("half", "lost");
        if (cls) g.classList.add(cls);
      }
    });
  });

  /* update projection table */
  updateProjectionTable(pL, pR);
}

/* projection table rows */
const projTableRows = ref("");

function updateProjectionTable(pL, pR) {
  const SYM = {
    0: ["✓", "ok"],
    1: ["◐", "half"],
    2: ["✕", "no"],
    "-1": ["–", "na"],
  };
  let rows = "";
  PTS.forEach((p) => {
    const st = { L: ptStatus(p, "L", pL), R: ptStatus(p, "R", pR) };
    const seen = p.eyes.map((e) => st[e]);
    const verdict = seen.every((v) => v === 2)
      ? '<span class="no">lost</span>'
      : seen.some((v) => v > 0)
        ? '<span class="half">partly</span>'
        : '<span class="ok">seen</span>';
    rows +=
      `<tr><td>${p.id}</td>` +
      ["L", "R"]
        .map((e) => `<td class="sym ${SYM[st[e]][1]}">${SYM[st[e]][0]}</td>`)
        .join("") +
      `<td>${verdict}</td></tr>` +
      `<tr><td></td><td colspan="3" style="font-size:11px;color:var(--vpl-mut);padding-top:0">${p.note}</td></tr>`;
  });
  projTableRows.value = rows;
}

/* ================================================================
   Diagnosis readout (computed)
   ================================================================ */
const dxName = computed(() => {
  const qz = quiz.value;
  if (qz.on) {
    if (qz.answered) {
      const t = BYID[qz.target];
      return t ? t.dx : "";
    }
    return qz.dir === "find"
      ? "Which lesion produces this?"
      : "Which fields result?";
  }
  const names = [...active.value].map((id) => BYID[id]).filter(Boolean);
  if (names.length === 0) return "Normal visual fields";
  if (names.length === 1) return names[0].dx;
  return "Combined deficit (" + names.length + " lesions)";
});

const dxNote = computed(() => {
  const qz = quiz.value;
  if (qz.on) {
    if (qz.answered) {
      const t = BYID[qz.target];
      const p = BYID[qz.picked];
      if (!t || !p) return "";
      const ok = sigOf(qz.picked) === sigOf(qz.target);
      if (ok && qz.picked === qz.target)
        return "<strong>Correct.</strong> " + t.name + " — " + t.dx + ".";
      if (ok)
        return (
          "<strong>Correct.</strong> " +
          p.name +
          " gives exactly the same defect as the key (" +
          t.name +
          "). Both are right."
        );
      return (
        "<strong>Not quite.</strong> " +
        p.name +
        " would give " +
        p.dx.toLowerCase() +
        ". The answer was <strong>" +
        t.name +
        "</strong>."
      );
    }
    return qz.dir === "find"
      ? "Click a site on the pathway diagram, or use the list on the left."
      : "The lesion is marked in red on the pathway.";
  }
  const names = [...active.value].map((id) => BYID[id]).filter(Boolean);
  if (names.length === 0) return "No lesion placed.";
  if (names.length === 1)
    return "<strong>" + names[0].name + ".</strong> " + names[0].note;
  return names
    .map((l) => "<strong>" + l.name + ":</strong> " + l.dx)
    .join("<br>");
});

const dxClass = computed(() => {
  const qz = quiz.value;
  if (!qz.on || !qz.answered) return "";
  return sigOf(qz.picked) === sigOf(qz.target) ? "good" : "bad";
});

/* ================================================================
   Quiz
   ================================================================ */
const POOL = LESIONS.map((l) => l.id);
const rnd = (n) => Math.floor(Math.random() * n);
function shuffled(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

function newQuestion() {
  const qz = quiz.value;
  qz.answered = false;
  qz.picked = null;
  let t;
  do {
    t = POOL[rnd(POOL.length)];
  } while (POOL.length > 1 && t === qz.target);
  qz.target = t;
  if (qz.dir === "predict") {
    const seen = new Set([sigOf(t)]);
    const opts = [t];
    shuffled(POOL).forEach((id) => {
      if (opts.length < 4) {
        const g = sigOf(id);
        if (!seen.has(g)) {
          seen.add(g);
          opts.push(id);
        }
      }
    });
    qz.options = shuffled(opts);
  } else {
    qz.options = null;
  }
  triggerUpdate();
}

function answerFind(id) {
  const qz = quiz.value;
  if (qz.answered) return;
  qz.picked = id;
  qz.answered = true;
  qz.total++;
  if (sigOf(id) === sigOf(qz.target)) qz.right++;
  triggerUpdate();
}

function answerPredict(id) {
  const qz = quiz.value;
  if (qz.answered) return;
  qz.picked = id;
  qz.answered = true;
  qz.total++;
  if (sigOf(id) === sigOf(qz.target)) qz.right++;
  triggerUpdate();
}

const quizBannerClass = computed(() => {
  const qz = quiz.value;
  if (!qz.answered) return "qbanner";
  const ok = sigOf(qz.picked) === sigOf(qz.target);
  return "qbanner " + (ok ? "good" : "bad");
});

const quizBannerHtml = computed(() => {
  const qz = quiz.value;
  if (!qz.answered) {
    return qz.dir === "predict"
      ? "<b>Q. A lesion is marked in red on the pathway diagram.</b> Work out which half of the world, and which quadrants, each eye loses — then click the matching pair of visual fields in the panel on the right."
      : "<b>Q. Look at the two visual field charts on the right (Left eye / Right eye).</b> Then click the lesion site on the pathway diagram — or an <b>L</b>/<b>R</b> button in the list — that would produce that deficit.";
  }
  const ok = sigOf(qz.picked) === sigOf(qz.target);
  const t = BYID[qz.target];
  return (
    (ok ? "<b>Correct — " : "<b>Not quite — the answer was ") +
    t.name +
    ".</b> " +
    t.dx +
    ". Press <em>Next question</em> to continue."
  );
});

/* ================================================================
   Quiz option thumbnails (predict mode)
   ================================================================ */
const quizOptionCvRefs = ref({});

function setQuizOptionCvRef(el, oid, eye) {
  if (el) {
    if (!quizOptionCvRefs.value[oid]) quizOptionCvRefs.value[oid] = {};
    quizOptionCvRefs.value[oid][eye] = el;
  }
}

function drawQuizOptions() {
  const qz = quiz.value;
  if (!qz.options) return;
  nextTick(() => {
    const thumbSize = Math.min(96, Math.round(fieldSize() * 0.62));
    qz.options.forEach((id) => {
      ["L", "R"].forEach((eye) => {
        const cv =
          quizOptionCvRefs.value[id] && quizOptionCvRefs.value[id][eye];
        if (cv) {
          drawField(cv, eye, primsOf(new Set([id]), eye), thumbSize);
        }
      });
    });
  });
}

function quizOptClass(id) {
  const qz = quiz.value;
  let cls = "qopt";
  if (qz.answered) {
    cls += " locked";
    if (sigOf(id) === sigOf(qz.target)) cls += " good";
    else if (id === qz.picked) cls += " bad";
  }
  return cls;
}

/* ================================================================
   Tab switching
   ================================================================ */
function setTab(which) {
  tab.value = which;
  const qz = quiz.value;
  const wasQuiz = qz.on;
  qz.on = which === "quiz";
  if (qz.on && !wasQuiz) {
    qz.right = 0;
    qz.total = 0;
    active.value = new Set();
    newQuestion();
  }
  if (which === "map") {
    nextTick(() => updateProjection());
  }
  triggerUpdate();
}

/* ================================================================
   View switching (eye)
   ================================================================ */
function setView(v) {
  view.value = v;
}

/* ================================================================
   Play/pause
   ================================================================ */
function togglePlay() {
  playing.value = !playing.value;
  const vid = vidEl.value;
  if (!vid) return;
  if (playing.value) vid.play().catch(() => {});
  else vid.pause();
}

/* ================================================================
   Quiz direction switching
   ================================================================ */
function setQuizDir(dir) {
  const qz = quiz.value;
  qz.dir = dir;
  qz.right = 0;
  qz.total = 0;
  newQuestion();
}

/* ================================================================
   Master update: markers, fibre fading, fields, projection, quiz
   ================================================================ */
function triggerUpdate() {
  const svg = diaSvg.value;
  if (!svg) return;

  const shown = pathSet.value;

  /* markers + list buttons */
  LESIONS.forEach((l) => {
    const on = shown.has(l.id);
    const g = svg.querySelector("#lz-" + l.id);
    if (g) {
      g.classList.toggle("act", on);
      g.setAttribute("aria-pressed", on ? "true" : "false");
    }
    const sl = svg.querySelector("#sl-" + l.id);
    if (sl) sl.classList.toggle("act", on);
  });

  /* fade segments downstream of lesion */
  svg.querySelectorAll("[data-ch]").forEach((el) => {
    const stage = parseFloat(el.dataset.stage);
    const st = channelState(stage, shown);
    const chs = el.dataset.ch.split(",");
    let dead = 0;
    let hurt = 0;
    chs.forEach((c) => {
      const v = st[c] || 0;
      if (v === 2) dead++;
      if (v > 0) hurt++;
    });
    let op = 1;
    if (dead === chs.length) op = 0.13;
    else if (hurt > 0) op = 0.4;
    el.style.opacity = op;
  });

  /* fields */
  const fs = fieldSize();
  drawField(fLCv.value, "L", primsL.value, fs);
  drawField(fRCv.value, "R", primsR.value, fs);

  /* projection */
  updateProjection();

  /* quiz thumbnails */
  if (quiz.value.on && quiz.value.dir === "predict") {
    drawQuizOptions();
  }
}

/* ================================================================
   Attach event listeners to SVG lesion zones after v-html inject
   ================================================================ */
function attachDiagramListeners() {
  const svg = diaSvg.value;
  if (!svg) return;
  svg.querySelectorAll(".lz").forEach((g) => {
    const id = g.dataset.id;
    g.addEventListener("click", () => toggle(id));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(id);
      }
    });
    g.addEventListener("mouseenter", () => hilite(id, true));
    g.addEventListener("mouseleave", () => hilite(id, false));
  });
}

/* ================================================================
   prefers-reduced-motion
   ================================================================ */
let reducedMotionQuery = null;

function checkReducedMotion() {
  if (reducedMotionQuery && reducedMotionQuery.matches) {
    playing.value = false;
    const vid = vidEl.value;
    if (vid) vid.pause();
  }
}

/* ================================================================
   Lifecycle
   ================================================================ */
onMounted(() => {
  /* reduced motion */
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotionQuery.addEventListener("change", checkReducedMotion);
  checkReducedMotion();

  /* video setup */
  const vid = vidEl.value;
  if (vid) {
    vid.addEventListener("canplay", () => {
      if (playing.value) vid.play().catch(() => {});
    });
    vid.addEventListener("error", () => {
      videoOK.value = false;
    });
    vid.load();
  }

  /* inject SVGs and attach listeners */
  nextTick(() => {
    attachDiagramListeners();
    triggerUpdate();
  });

  /* start scene rAF loop */
  rafId = requestAnimationFrame(frame);

  /* resize handler */
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener("resize", onResize);
  if (reducedMotionQuery) {
    reducedMotionQuery.removeEventListener("change", checkReducedMotion);
  }
});

let resizeT = null;
function onResize() {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    triggerUpdate();
  }, 120);
}

/* Watch for diagram SVG innerHTML changes and re-attach listeners */
watch(diagramSvg, () => {
  nextTick(() => {
    attachDiagramListeners();
    triggerUpdate();
  });
});

/* Watch for projection SVG innerHTML changes */
watch(projectionSvg, () => {
  nextTick(() => {
    updateProjection();
  });
});
</script>

<template>
  <div class="vpl">
    <h1 class="vpl-title">
      Visual field deficits along the primary visual pathway
    </h1>

    <!-- Tab bar -->
    <div class="vpl-tabs">
      <button
        class="tab"
        :class="{ on: tab === 'main' }"
        @click="setTab('main')"
      >
        Explore
      </button>
      <button class="tab" :class="{ on: tab === 'map' }" @click="setTab('map')">
        Field&nbsp;&rarr;&nbsp;retina
      </button>
      <button
        class="tab"
        :class="{ on: tab === 'quiz' }"
        @click="setTab('quiz')"
      >
        Quiz
      </button>
    </div>

    <!-- Context bar: explore mode -->
    <div v-if="tab !== 'quiz'" class="ctx">
      <span class="lbl2">Classic cases</span>
      <button
        v-for="p in PRESETS"
        :key="p.id"
        :class="{ on: isPresetActive(p.id) }"
        @click="applyPreset(p.id)"
      >
        {{ p.label }}
      </button>
      <span class="sep"></span>
      <button @click="clearAll">Clear all</button>
      <span class="grow"></span>
      <span v-if="tab === 'main'" class="lbl2 ctx-hint">
        Click any &#x2297; on the pathway, or use the list on the left
      </span>
      <span v-if="tab === 'map'" class="lbl2 ctx-hint">
        Place lesions with the list on the left
      </span>
    </div>

    <!-- Context bar: quiz mode -->
    <div v-if="tab === 'quiz'" class="ctx">
      <div class="qrow">
        <span class="lbl2">Quiz</span>
        <button
          class="qm"
          :class="{ on: quiz.dir === 'find' }"
          @click="setQuizDir('find')"
        >
          Field&nbsp;&rarr;&nbsp;lesion
        </button>
        <button
          class="qm"
          :class="{ on: quiz.dir === 'predict' }"
          @click="setQuizDir('predict')"
        >
          Lesion&nbsp;&rarr;&nbsp;field
        </button>
        <span class="sep"></span>
        <button @click="newQuestion">Next question &rarr;</button>
        <span class="grow"></span>
        <span class="qscore"
          >score <b>{{ quiz.right }} / {{ quiz.total }}</b></span
        >
      </div>
      <div :class="quizBannerClass" v-html="quizBannerHtml"></div>
    </div>

    <!-- Main layout -->
    <div class="main">
      <!-- Lesion rail (always visible) -->
      <aside class="pane">
        <p class="ct">Lesion sites</p>
        <div class="sites">
          <template v-for="([group, rows], gi) in SITES" :key="gi">
            <div class="grp">{{ group }}</div>
            <div v-for="[key, tag, name] in rows" :key="key" class="site">
              <span class="nm">
                <b v-if="tag">{{ tag }}</b
                >{{ name }}
              </span>
              <span class="sd">
                <template v-if="key === 'chiasm'">
                  <button
                    class="mid"
                    :class="{ on: active.has('chiasm') }"
                    title="Midline chiasm lesion"
                    @click="toggle('chiasm')"
                    @mouseenter="hilite('chiasm', true)"
                    @mouseleave="hilite('chiasm', false)"
                  >
                    mid
                  </button>
                </template>
                <template v-else>
                  <button
                    :class="{ on: active.has(key + '-L') }"
                    :title="'Left ' + name"
                    @click="toggle(key + '-L')"
                    @mouseenter="hilite(key + '-L', true)"
                    @mouseleave="hilite(key + '-L', false)"
                  >
                    L
                  </button>
                  <button
                    :class="{ on: active.has(key + '-R') }"
                    :title="'Right ' + name"
                    @click="toggle(key + '-R')"
                    @mouseenter="hilite(key + '-R', true)"
                    @mouseleave="hilite(key + '-R', false)"
                  >
                    R
                  </button>
                </template>
              </span>
            </div>
          </template>
        </div>
        <div class="legend">
          <span><i class="leg-vfL"></i>left visual field</span>
          <span><i class="leg-vfR"></i>right visual field</span>
          <span><i class="leg-les"></i>lesion</span>
        </div>
      </aside>

      <!-- Stage: Explore / Quiz -->
      <div
        v-show="tab !== 'map'"
        class="stage"
        :class="tab === 'quiz' ? 'stage-quiz' : 'stage-main'"
      >
        <section class="pane">
          <p class="ct">The primary visual pathway &mdash; inferior view</p>
          <div class="fit">
            <svg
              ref="diaSvg"
              class="diagram"
              viewBox="-86 6 546 628"
              preserveAspectRatio="xMidYMid meet"
              role="group"
              aria-label="Visual pathway diagram with clickable lesion sites"
              v-html="diagramSvg"
            ></svg>
          </div>
        </section>

        <div class="rcol">
          <!-- Scene pane (explore + quiz find mode) -->
          <section v-show="!(quiz.on && quiz.dir === 'predict')" class="pane">
            <p class="ct">What the patient sees</p>
            <div class="fit">
              <canvas ref="sceneCv" width="880" height="660"></canvas>
            </div>
            <div class="sbar">
              <span class="lbl2">Eye</span>
              <button
                v-for="v in ['both', 'L', 'R']"
                :key="v"
                class="vw"
                :class="{ on: view === v }"
                @click="setView(v)"
              >
                {{ v === "both" ? "Both" : v === "L" ? "Left" : "Right" }}
              </button>
              <span class="sep"></span>
              <button @click="togglePlay">
                {{ playing ? "Pause" : "Play" }}
              </button>
            </div>
          </section>

          <!-- Quiz predict options pane -->
          <section
            v-if="quiz.on && quiz.dir === 'predict'"
            class="pane"
            :class="{ ask: !quiz.answered }"
          >
            <p class="ct">Which fields result?</p>
            <div class="qopts">
              <div
                v-for="(oid, oi) in quiz.options || []"
                :key="oid"
                :class="quizOptClass(oid)"
                @click="!quiz.answered && answerPredict(oid)"
              >
                <span class="kk">{{ ["①", "②", "③", "④"][oi] }}</span>
                <div class="pair">
                  <canvas
                    :ref="(el) => setQuizOptionCvRef(el, oid, 'L')"
                    :data-oeye="'L'"
                    :data-oid="oid"
                  ></canvas>
                  <canvas
                    :ref="(el) => setQuizOptionCvRef(el, oid, 'R')"
                    :data-oeye="'R'"
                    :data-oid="oid"
                  ></canvas>
                </div>
                <span class="eyes"><em>L</em><em>R</em></span>
              </div>
            </div>
          </section>

          <!-- Field charts (hidden in predict mode before answer) -->
          <section
            v-show="!(quiz.on && quiz.dir === 'predict' && !quiz.answered)"
            class="pane"
            :class="{ ask: quiz.on && quiz.dir === 'find' && !quiz.answered }"
          >
            <p class="ct">Visual fields</p>
            <div class="frow">
              <div class="fields">
                <div class="fw">
                  <div class="eye">Left eye</div>
                  <canvas ref="fLCv" width="172" height="172"></canvas>
                  <div class="tn"><span>Temporal</span><span>Nasal</span></div>
                </div>
                <div class="fw">
                  <div class="eye">Right eye</div>
                  <canvas ref="fRCv" width="172" height="172"></canvas>
                  <div class="tn"><span>Nasal</span><span>Temporal</span></div>
                </div>
              </div>
              <div class="dx" :class="dxClass">
                <div class="dxname" v-text="dxName"></div>
                <div class="dxnote" v-html="dxNote"></div>
              </div>
            </div>
          </section>

          <!-- Quiz placeholder (predict mode, not yet answered) -->
          <section
            v-if="quiz.on && quiz.dir === 'predict' && !quiz.answered"
            class="pane"
          >
            <div class="qph">
              <div class="qm-mark">?</div>
              <p style="margin: 8px 0 0">
                Choose a pair of visual fields above.<br />
                The charts and the patient's view are revealed once you answer.
              </p>
            </div>
          </section>
        </div>
      </div>

      <!-- Stage: Field -> retina map -->
      <div v-show="tab === 'map'" class="stage stage-map">
        <section class="pane">
          <p class="ct">From the world to the two retinas</p>
          <div class="fit">
            <svg
              ref="projSvg"
              class="proj"
              viewBox="0 0 560 782"
              preserveAspectRatio="xMidYMid meet"
              role="group"
              aria-label="Projection of the visual field onto the two retinas"
              v-html="projectionSvg"
            ></svg>
          </div>
        </section>
        <section class="pane">
          <p class="ct">Reading the map</p>
          <div class="pinfo">
            <p class="ptext">
              Every point in space belongs to the <strong>left</strong> half of
              the world or the <strong>right</strong>, and each half lands on
              the <em>nasal</em> retina of one eye and the
              <em>temporal</em> retina of the other. Those two sheets meet at
              the chiasm and travel together from there &mdash; which is why a
              lesion behind the chiasm never respects the boundary between the
              eyes.
            </p>
            <p class="ptext">
              The far edges of each half-field (<strong>A</strong> and
              <strong>D</strong>) are the <strong>monocular crescents</strong>:
              the nose blocks them from the other eye. Blind one optic nerve and
              that crescent is gone outright, even though the rest of the field
              is still covered.
            </p>
            <table class="ptbl">
              <thead>
                <tr>
                  <th>Point</th>
                  <th>Left eye</th>
                  <th>Right eye</th>
                  <th>Seen?</th>
                </tr>
              </thead>
              <tbody v-html="projTableRows"></tbody>
            </table>
            <p class="pkey">
              &#x2713; reaches cortex &nbsp; &#x25D0; half the quadrant lost
              &nbsp; &#x2715; blind &nbsp; &#x2013; this eye cannot see that
              point
            </p>
            <div class="legend">
              <span
                ><i class="leg-blind"></i>blind in
                <strong>both</strong> eyes</span
              >
              <span
                ><i class="leg-half"></i>blind in <strong>one</strong> eye</span
              >
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Hidden video element -->
    <video
      ref="vidEl"
      muted
      loop
      playsinline
      preload="auto"
      style="display: none"
    >
      <source type="video/webm" src="/assets/lesions-scene.webm" />
      <source type="video/mp4" src="/assets/lesions-scene.mp4" />
    </video>
  </div>
</template>

<style scoped>
/* ================================================================
   LOCAL VARS — prefixed --vpl-* (Visual Pathway Lesions)
   Achromatic chrome uses brand tokens; anatomical colours are hardcoded.
   ================================================================ */
.vpl {
  /* ---- achromatic chrome (token-swapped) ---- */
  --vpl-bg: rgb(var(--color-bg));
  --vpl-card: rgb(var(--color-paper));
  --vpl-ink: rgb(var(--color-ink));
  --vpl-mut: rgb(var(--color-mute));
  --vpl-line: rgb(var(--color-line));
  --vpl-accent: rgb(var(--color-accent));

  /* ---- hemifield colours (NOT token-swapped) ---- */
  --vpl-vfL: #7b7bc4;
  --vpl-vfR: #dd9b4e;
  --vpl-les: #d81e1e;

  /* ---- anatomy fills (NOT token-swapped) ---- */
  --vpl-brain: #efe6d6;
  --vpl-brainline: #a2957e;
  --vpl-cream: #f7f1e2;
  --vpl-sheath: #f0e4cf;
  --vpl-disc: #f6ead3;
  --vpl-mammil: #e9dfc8;
  --vpl-sclera: #fdf8ee;
  --vpl-cornea: #cfe4f2;
  --vpl-lens: #e8f2fb;
  --vpl-lgn: #3f80c0;
  --vpl-lgn-edge: #25507a;
  --vpl-lgn-lamina: #a9c8e6;
  --vpl-nose: #e7e2d8;

  /* ---- field charts ---- */
  --vpl-seen: #b3c0dd;
  --vpl-blind: #221f1f;

  /* ---- composite field oval ---- */
  --vpl-ov-LU: #7cc08c;
  --vpl-ov-LL: #8f6cbb;
  --vpl-ov-RU: #e5c65f;
  --vpl-ov-RL: #d5813c;

  /* ---- quiz ---- */
  --vpl-quiz-tint: #f4f2fc;
  --vpl-quiz-edge: #ddd8f0;
  --vpl-quiz-accent: #6b63b5;
  --vpl-ok: #2f8f4f;
  --vpl-ok-tint: #f1faf3;
  --vpl-ok-edge: #cfe9d7;
  --vpl-bad: #d81e1e;
  --vpl-bad-tint: #fdf1f1;
  --vpl-bad-edge: #f3cccc;

  font-family:
    var(--font-body),
    ui-sans-serif,
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: var(--vpl-ink);
  -webkit-font-smoothing: antialiased;
  padding: 8px 10px 16px;
}

.vpl-title {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 0 0 8px;
}

/* ---- tabs ---- */
.vpl-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.tab {
  font: inherit;
  font-size: 12px;
  padding: 5px 12px;
  border: 1px solid var(--vpl-line);
  background: var(--vpl-card);
  border-radius: 8px;
  cursor: pointer;
  color: var(--vpl-ink);
}
.tab:hover {
  background: var(--vpl-bg);
  border-color: var(--vpl-mut);
}
.tab.on {
  background: var(--vpl-ink);
  border-color: var(--vpl-ink);
  color: var(--vpl-card);
}

/* ---- context bar ---- */
.ctx {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  min-height: 30px;
  margin-bottom: 8px;
}
button {
  font: inherit;
  font-size: 12px;
  background: var(--vpl-card);
  color: var(--vpl-ink);
  border: 1px solid var(--vpl-line);
  border-radius: 7px;
  padding: 4px 9px;
  cursor: pointer;
}
button:hover {
  border-color: var(--vpl-mut);
  background: var(--vpl-bg);
}
button.on {
  background: var(--vpl-ink);
  border-color: var(--vpl-ink);
  color: var(--vpl-card);
}
.lbl2 {
  font-size: 10.5px;
  color: var(--vpl-mut);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-right: 2px;
}
.sep {
  width: 1px;
  height: 18px;
  background: var(--vpl-line);
  margin: 0 4px;
}
.grow {
  flex: 1;
}

/* ---- main layout ---- */
.main {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  gap: 8px;
  min-height: 0;
}
.stage {
  display: grid;
  gap: 8px;
  min-height: 0;
}
.stage-main {
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
}
.stage-map {
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
}
.stage-quiz {
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
}
.pane {
  background: var(--vpl-card);
  border: 1px solid var(--vpl-line);
  border-radius: 11px;
  padding: 9px 10px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ct {
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--vpl-mut);
  margin: 0 0 6px;
  flex: none;
}
.rcol {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  min-height: 0;
}
.fit {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.diagram,
.proj {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: manipulation;
}

/* ---- diagram SVG styles ---- */
:deep(.lz) {
  cursor: pointer;
}
:deep(.lz .hit) {
  fill: transparent;
}
:deep(.lz .dot) {
  fill: #fff;
  stroke: #57534e;
  stroke-width: 1.4;
}
:deep(.lz .glyph) {
  font:
    600 8.5px var(--font-body),
    ui-sans-serif,
    system-ui,
    sans-serif;
  fill: #57534e;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
}
:deep(.lz:hover .dot) {
  stroke: var(--vpl-les);
  stroke-width: 2;
}
:deep(.lz:hover .glyph) {
  fill: var(--vpl-les);
}
:deep(.lz.act .dot) {
  fill: var(--vpl-les);
  stroke: #7f1010;
}
:deep(.lz.act .glyph) {
  fill: #fff;
}
:deep(.lz.hl .dot) {
  stroke: var(--vpl-les);
  stroke-width: 2.6;
}
:deep(.lz .halo) {
  fill: var(--vpl-les);
  opacity: 0;
  transition: opacity 0.12s;
}
:deep(.lz.act .halo) {
  opacity: 0.14;
}
:deep(.slash) {
  stroke: var(--vpl-les);
  stroke-width: 5.5;
  stroke-linecap: round;
  opacity: 0;
  pointer-events: none;
}
:deep(.slash.act) {
  opacity: 1;
}
:deep(.lbl) {
  font:
    400 9px var(--font-body),
    ui-sans-serif,
    system-ui,
    sans-serif;
  fill: #4b4640;
}
:deep(.lbl.b) {
  font-weight: 650;
}
:deep(.lbl.lh) {
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 3px;
  stroke-linejoin: round;
}
:deep(.lead) {
  stroke: #8b8378;
  stroke-width: 0.8;
  fill: none;
}
:deep(.seg) {
  transition: opacity 0.18s;
}

/* ---- legend ---- */
.legend {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 10px;
  color: #57534e;
  margin-top: 6px;
  flex: none;
}
.legend i {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: -1px;
}
.leg-vfL {
  background: var(--vpl-vfL);
}
.leg-vfR {
  background: var(--vpl-vfR);
}
.leg-les {
  background: var(--vpl-les);
}
.leg-blind {
  background: #221f1f;
}
.leg-half {
  background: #9c968e;
}

/* ---- scene ---- */
canvas {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  border-radius: 8px;
  background: #c9dced;
  display: block;
}
.sbar {
  display: flex;
  gap: 5px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 7px;
  flex: none;
}

/* ---- fields ---- */
.frow {
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex: none;
  height: 206px;
}
.fields {
  display: flex;
  gap: 10px;
  flex: none;
}
.fw {
  text-align: center;
}
.fw canvas {
  display: block;
  border-radius: 7px;
}
.fw .eye {
  font-size: 11px;
  font-weight: 650;
  margin-bottom: 2px;
}
.tn {
  display: flex;
  justify-content: space-between;
  font-size: 9.5px;
  color: var(--vpl-mut);
  padding: 1px 3px 0;
}
.dx {
  margin: 0;
  padding: 8px 10px;
  background: var(--vpl-bg);
  border: 1px solid var(--vpl-line);
  border-radius: 8px;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dx.good {
  background: var(--vpl-ok-tint);
  border-color: var(--vpl-ok-edge);
}
.dx.bad {
  background: var(--vpl-bad-tint);
  border-color: var(--vpl-bad-edge);
}
.dxname {
  font-weight: 650;
  font-size: 12px;
  line-height: 1.25;
  flex: none;
  max-height: 3.8em;
  overflow: hidden;
}
.dxnote {
  font-size: 11px;
  line-height: 1.35;
  color: #57534e;
  margin-top: 2px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}
.dxnote::-webkit-scrollbar {
  width: 6px;
}
.dxnote::-webkit-scrollbar-thumb {
  background: #dad5cc;
  border-radius: 3px;
}

/* ---- lesion rail ---- */
.sites {
  overflow: auto;
  flex: 1;
  min-height: 0;
  margin: -2px -2px 0;
}
.grp {
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vpl-mut);
  margin: 8px 0 3px 2px;
}
.grp:first-child {
  margin-top: 0;
}
.site {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 2px 2px 3px;
  border-radius: 6px;
}
.site:hover {
  background: var(--vpl-bg);
}
.site .nm {
  flex: 1;
  font-size: 11.5px;
  line-height: 1.25;
}
.site .nm b {
  display: inline-block;
  font-size: 9px;
  background: var(--vpl-line);
  color: #57534e;
  border-radius: 3px;
  padding: 0 3px;
  margin-right: 3px;
  vertical-align: 1px;
}
.sd {
  display: flex;
  gap: 3px;
  flex: none;
}
.sd button {
  padding: 1px 0;
  width: 22px;
  text-align: center;
  font-size: 11px;
  border-radius: 5px;
  line-height: 1.5;
}
.sd button.on {
  background: var(--vpl-les);
  border-color: var(--vpl-les);
  color: #fff;
}
.sd button.mid {
  width: 32px;
  font-size: 10px;
}

/* ---- quiz ---- */
.qrow {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.qbanner {
  margin-top: 5px;
  font-size: 12.5px;
  line-height: 1.35;
  background: var(--vpl-quiz-tint);
  border: 1px solid var(--vpl-quiz-edge);
  border-left: 3px solid var(--vpl-quiz-accent);
  border-radius: 7px;
  padding: 4px 11px;
  color: #2c2a3a;
  min-height: 44px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.qbanner.good {
  background: var(--vpl-ok-tint);
  border-color: var(--vpl-ok-edge);
  border-left-color: var(--vpl-ok);
}
.qbanner.bad {
  background: var(--vpl-bad-tint);
  border-color: var(--vpl-bad-edge);
  border-left-color: var(--vpl-bad);
}
.pane.ask {
  border-color: #8f8bbd;
  box-shadow: 0 0 0 3px #eceafa;
}
.qscore {
  font-size: 11.5px;
  color: var(--vpl-mut);
}
.qscore b {
  color: var(--vpl-ink);
  font-size: 13px;
}
.qopts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.qopt {
  border: 1.5px solid var(--vpl-line);
  border-radius: 9px;
  padding: 5px;
  background: var(--vpl-card);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.qopt canvas {
  max-width: 100%;
  height: auto;
  background: transparent;
}
.qopt:hover {
  border-color: #8f8bbd;
  background: #fbfaff;
}
.qopt .pair {
  display: flex;
  gap: 6px;
}
.qopt .kk {
  font:
    650 10px var(--font-body),
    ui-sans-serif,
    system-ui,
    sans-serif;
  color: var(--vpl-mut);
}
.qopt .eyes {
  display: flex;
  gap: 6px;
}
.qopt .eyes em {
  font-style: normal;
  font-size: 9.5px;
  color: var(--vpl-mut);
  width: 96px;
  text-align: center;
}
.qopt.good {
  border-color: var(--vpl-ok);
  background: var(--vpl-ok-tint);
}
.qopt.bad {
  border-color: var(--vpl-bad);
  background: var(--vpl-bad-tint);
}
.qopt.locked {
  cursor: default;
}
.qph {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--vpl-line);
  border-radius: 9px;
  color: var(--vpl-mut);
  font-size: 11.5px;
  text-align: center;
  padding: 12px;
}
.qm-mark {
  font-size: 30px;
  color: var(--vpl-line);
  line-height: 1;
}
.ctx-hint {
  font-size: 10.5px;
}

/* ---- projection panel ---- */
.pinfo {
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.ptext {
  font-size: 11.5px;
  color: #44403c;
  margin: 0 0 8px;
}
.ptbl {
  border-collapse: collapse;
  width: 100%;
  font-size: 11.5px;
}
.ptbl th {
  text-align: left;
  font-weight: 650;
  color: var(--vpl-mut);
  font-size: 9.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--vpl-line);
  padding: 0 6px 3px 0;
}
.ptbl td {
  padding: 3px 6px 3px 0;
  border-bottom: 1px solid var(--vpl-bg);
}
.ptbl td:first-child {
  font-weight: 650;
  width: 2.4em;
}
:deep(.ptbl .sym) {
  font-size: 12.5px;
  text-align: center;
  width: 3.2em;
}
:deep(.ptbl .ok) {
  color: #3f8f52;
}
:deep(.ptbl .half) {
  color: #c07a12;
}
:deep(.ptbl .no) {
  color: var(--vpl-les);
}
:deep(.ptbl .na) {
  color: #c3bdb4;
}
.pkey {
  font-size: 10px;
  color: var(--vpl-mut);
  margin: 6px 0 0;
}
:deep(.pt .ring) {
  fill: #fff;
  stroke: #57534e;
  stroke-width: 1.3;
}
:deep(.pt .txt) {
  font:
    650 9px var(--font-body),
    ui-sans-serif,
    system-ui,
    sans-serif;
  fill: #292524;
  text-anchor: middle;
  dominant-baseline: central;
}
:deep(.pt.half .ring) {
  fill: #f6b9b9;
  stroke: #b33;
}
:deep(.pt.lost .ring) {
  fill: #221f1f;
  stroke: #000;
}
:deep(.pt.lost .txt) {
  fill: #fff;
}
:deep(.ray) {
  stroke-width: 1.2;
  stroke-dasharray: 5 4;
  fill: none;
  transition: opacity 0.18s;
}
:deep(.dimmed) {
  opacity: 0.34;
  pointer-events: none;
}

/* ================================================================
   RESPONSIVE — three regimes
   ================================================================ */

/* ---- short viewports ---- */
@media (max-height: 700px) {
  .vpl {
    font-size: 12px;
  }
  .vpl-title {
    font-size: 13px;
  }
  .tab {
    font-size: 11.5px;
    padding: 4px 10px;
  }
  .main {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .pane {
    padding: 7px 9px;
    border-radius: 9px;
    overflow: visible;
  }
  .ct {
    font-size: 9.5px;
    margin-bottom: 4px;
  }
  .sites {
    overflow: visible;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
  }
  .grp {
    display: none;
  }
  .site {
    width: auto;
    gap: 5px;
    padding: 1px 2px;
  }
  .site .nm {
    flex: 0 0 auto;
    font-size: 11px;
  }
  .legend {
    font-size: 9.5px;
    gap: 12px;
  }
  .ctx-hint {
    display: none;
  }
  .stage-main {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    align-items: start;
  }
  .stage-map {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .rcol {
    grid-template-rows: auto auto;
  }
  .diagram,
  .proj {
    height: auto;
  }
  canvas {
    max-height: none;
  }
  .frow {
    height: auto;
    flex-direction: column;
  }
  .dx {
    height: auto;
    min-height: 64px;
  }
  .qbanner {
    height: auto;
    min-height: 32px;
    font-size: 11.5px;
  }
  .qopts {
    grid-template-columns: 1fr 1fr;
  }
}

/* ---- narrow viewports (portrait) ---- */
@media (max-width: 820px) {
  .vpl-title {
    font-size: 13px;
  }
  .main,
  .stage-main,
  .stage-map,
  .stage-quiz {
    grid-template-columns: 1fr;
  }
  .stage-main,
  .stage-map,
  .stage-quiz {
    align-items: start;
  }
  .rcol {
    grid-template-rows: auto auto;
  }
  .ctx-hint {
    display: none;
  }
  .pane {
    overflow: visible;
  }
  .diagram,
  .proj {
    height: auto;
    max-height: none;
  }
  .sites {
    overflow: visible;
    display: block;
  }
  .grp {
    display: block;
  }
  .site {
    width: auto;
  }
  .frow {
    flex-direction: column;
    height: auto;
  }
  .dx {
    height: auto;
    min-height: 90px;
  }
  .fields {
    justify-content: center;
  }
  .qopts {
    grid-template-columns: 1fr 1fr;
  }
  .qbanner {
    height: auto;
    min-height: 40px;
  }
}

/* ---- touch devices ---- */
@media (pointer: coarse) {
  button {
    padding: 7px 12px;
    font-size: 13px;
    touch-action: manipulation;
  }
  .tab {
    padding: 7px 14px;
    font-size: 13px;
  }
  .sd button {
    width: 34px;
    padding: 6px 0;
    font-size: 13px;
  }
  .sd button.mid {
    width: 44px;
  }
  .site {
    padding: 4px 3px;
  }
  .site .nm {
    font-size: 12.5px;
  }
  .ctx,
  .sbar,
  .qrow {
    gap: 8px;
  }
  :deep(.lz .dot) {
    stroke-width: 1.8;
  }
}

/* ---- prefers-reduced-motion ---- */
@media (prefers-reduced-motion: reduce) {
  :deep(.seg) {
    transition: none;
  }
  :deep(.lz .halo) {
    transition: none;
  }
  :deep(.ray) {
    transition: none;
  }
}
</style>
