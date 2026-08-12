/**
 * Visual Pathway Lesions — pure data model and geometry helpers extracted
 * from Stuart Trenholm's visual-pathway-lesions-widget.html for the Vue 3
 * port (OPENBRAIN-14 #2).
 *
 * All functions are pure, stateless, and dependency-free (no DOM access).
 * The numerical model and wording are the author's pedagogy — only the
 * code structure changed (named exports, JSDoc, parameterised state).
 *
 * The pathway is modelled as eight "channels", one per combination of
 *   eye (L/R) × hemifield (L/R) × altitude (Superior/Inferior).
 * A lesion kills a named set of channels at a named stage along the
 * pathway (retina 1, nerve 2, chiasm 3, tract 4, LGN 5, radiation 6,
 * V1 7). Every drawn fibre segment declares which channels it carries
 * and at which stage, so fading fibres, computing field charts and
 * masking the scene all fall out of the same model.
 */

/* ================================================================
   Channel system constants
   ================================================================ */

/** @type {string[]} Eye identifiers */
export const EYES = ["L", "R"];

/** @type {string[]} Hemifield identifiers */
export const HEMI = ["L", "R"];

/** @type {string[]} Altitude identifiers — Superior / Inferior */
export const ALT = ["S", "I"];

/** Diagram midline x-coordinate (mirror: x → MID − x) */
export const MID = 460;

/* ================================================================
   Field primitive helpers
   ================================================================ */

/**
 * Whole quadrant primitive.
 * @param {string} h - hemifield ('L'|'R')
 * @param {string} a - altitude ('S'|'I')
 * @returns {{h:string, a:string, ri:number, ro:number}}
 */
export const q = (h, a) => ({ h, a, ri: 0, ro: 1 });

/**
 * Quadrant with macula spared (inner ring removed).
 * @param {string} h - hemifield
 * @param {string} a - altitude
 * @returns {{h:string, a:string, ri:number, ro:number}}
 */
export const qs = (h, a) => ({ h, a, ri: 0.19, ro: 1 });

/**
 * Macular island only (inner ring).
 * @param {string} h - hemifield
 * @param {string} a - altitude
 * @returns {{h:string, a:string, ri:number, ro:number}}
 */
export const qm = (h, a) => ({ h, a, ri: 0, ro: 0.19 });

/**
 * Both altitude quadrants for a hemifield.
 * @param {string} h - hemifield
 * @returns {Array<{h:string, a:string, ri:number, ro:number}>}
 */
export const bothQ = (h) => [q(h, "S"), q(h, "I")];

/**
 * All four channel IDs for one eye.
 * @param {string} e - eye ('L'|'R')
 * @returns {string[]}
 */
export const eyeAll = (e) => [e + "LS", e + "LI", e + "RS", e + "RI"];

/**
 * Channel IDs for a visual hemifield (both eyes, both altitudes).
 * @param {string} hemi - hemifield ('L'|'R')
 * @returns {string[]}
 */
export const fieldOf = (hemi) => [
  "L" + hemi + "S",
  "L" + hemi + "I",
  "R" + hemi + "S",
  "R" + hemi + "I",
];

/**
 * Superior-only channels for a visual hemifield.
 * @param {string} hemi - hemifield
 * @returns {string[]}
 */
export const fieldSup = (hemi) => ["L" + hemi + "S", "R" + hemi + "S"];

/**
 * Inferior-only channels for a visual hemifield.
 * @param {string} hemi - hemifield
 * @returns {string[]}
 */
export const fieldInf = (hemi) => ["L" + hemi + "I", "R" + hemi + "I"];

/* ================================================================
   Utility
   ================================================================ */

/**
 * Capitalise the first letter of a string.
 * @param {string} s
 * @returns {string}
 */
function capitalise(s) {
  return s[0].toUpperCase() + s.slice(1);
}

/* ================================================================
   Lesion definitions
   ================================================================ */

/**
 * Build the six lesion definitions for one side of the head.
 * @param {string} side - 'L' or 'R'
 * @returns {Array<Object>} array of lesion definition objects
 */
function lesionsFor(side) {
  const S = side;
  const other = S === "L" ? "R" : "L";
  const hemi = other; // visual hemifield carried by hemisphere S
  const sideName = S === "L" ? "Left" : "Right";
  const fieldName = hemi === "L" ? "left" : "right";
  const X = (x) => (S === "L" ? x : MID - x);
  const mir = (a) => (S === "L" ? a : 180 - a);

  return [
    {
      id: "on-" + S,
      tag: "A",
      group: "Pre-chiasmal",
      side: S,
      name: sideName + " optic nerve",
      dx: "Blindness of the " + sideName.toLowerCase() + " eye",
      note:
        "Every fibre leaving that retina is cut, so the eye is blind. Because the other eye is untouched, the " +
        "binocular field is almost full — the patient may only notice loss of stereopsis and a shrunken field on that side.",
      x: X(187),
      y: 147,
      ang: mir(124),
      len: 30,
      kills: [{ ch: eyeAll(S), stage: 2 }],
      fields: {
        [S]: [q("L", "S"), q("L", "I"), q("R", "S"), q("R", "I")],
        [other]: [],
      },
    },

    {
      id: "tract-" + S,
      tag: "C",
      group: "Retro-chiasmal",
      side: S,
      name: sideName + " optic tract",
      dx: capitalise(fieldName) + " homonymous hemianopia",
      note:
        "Behind the chiasm each tract carries the whole opposite half of the world from both eyes, so one cut " +
        "removes the same half-field in each eye (homonymous). The vertical border falls exactly on fixation.",
      x: X(199),
      y: 255,
      ang: mir(52),
      len: 26,
      kills: [{ ch: fieldOf(hemi), stage: 4 }],
      fields: { L: bothQ(hemi), R: bothQ(hemi) },
    },

    {
      id: "lgn-" + S,
      tag: "",
      group: "Retro-chiasmal",
      side: S,
      name: sideName + " lateral geniculate nucleus",
      dx: capitalise(fieldName) + " homonymous hemianopia",
      note:
        "A complete geniculate lesion looks like a tract lesion. Partial lesions are more typical and give " +
        "wedge-shaped (sectoranopic) defects, because the LGN's blood supply splits the map between the " +
        "anterior and lateral choroidal arteries.",
      x: X(175),
      y: 299,
      ang: mir(20),
      len: 22,
      kills: [{ ch: fieldOf(hemi), stage: 5 }],
      fields: { L: bothQ(hemi), R: bothQ(hemi) },
    },

    {
      id: "mey-" + S,
      tag: "D",
      group: "Optic radiation",
      side: S,
      name: sideName + " optic radiation, inferior limb (Meyer's loop)",
      dx: capitalise(fieldName) + ' superior quadrantanopia — "pie in the sky"',
      note:
        "Fibres from the inferior retina — the SUPERIOR field — swing forward into the temporal lobe before " +
        "turning back to the lower bank of the calcarine sulcus. Temporal lobe surgery or an MCA infarct " +
        "clips them and takes out the upper quadrant on the opposite side.",
      x: X(59),
      y: 397,
      ang: mir(4),
      len: 32,
      kills: [{ ch: fieldSup(hemi), stage: 6.0 }],
      fields: { L: [q(hemi, "S")], R: [q(hemi, "S")] },
    },

    {
      id: "par-" + S,
      tag: "",
      group: "Optic radiation",
      side: S,
      name: sideName + " optic radiation, superior limb (parietal)",
      dx:
        capitalise(fieldName) + ' inferior quadrantanopia — "pie on the floor"',
      note:
        "The dorsal half of the radiation carries the superior retina — the INFERIOR field — straight back to " +
        "the upper bank (cuneus). Parietal lesions therefore drop the lower quadrant on the opposite side, " +
        "often with neglect for company.",
      x: X(166),
      y: 408,
      ang: mir(-16),
      len: 28,
      kills: [{ ch: fieldInf(hemi), stage: 6.0 }],
      fields: { L: [q(hemi, "I")], R: [q(hemi, "I")] },
    },

    {
      id: "post-" + S,
      tag: "E",
      group: "Primary visual cortex (V1)",
      side: S,
      name: sideName + " V1 — macular sparing",
      dx: capitalise(fieldName) + " homonymous hemianopia with macular sparing",
      note:
        "A posterior cerebral artery stroke destroys most of V1, but the occipital pole — which holds the " +
        "hugely magnified central few degrees — has a watershed supply from the middle cerebral artery. " +
        "That island of central vision often survives, and it is what lets these patients still read.",
      x: X(202),
      y: 544,
      ang: mir(22),
      len: 30,
      kills: [{ ch: fieldOf(hemi), stage: 6.5 }],
      fields: {
        L: [qs(hemi, "S"), qs(hemi, "I")],
        R: [qs(hemi, "S"), qs(hemi, "I")],
      },
    },
  ];
}

/** Chiasm lesion — the only midline lesion in the set. */
export const CHIASM = {
  id: "chiasm",
  tag: "B",
  group: "Chiasm",
  side: "M",
  name: "Optic chiasm (midline)",
  dx: "Bitemporal hemianopia",
  note:
    "Only the crossing nasal-retinal fibres run through the middle of the chiasm, and those carry each eye’s " +
    "TEMPORAL field. A pituitary adenoma pressing up from below therefore takes the outer half of each eye’s " +
    "field — a heteronymous defect, and the one lesion where the two eyes lose opposite sides of the world.",
  x: 230,
  y: 206,
  ang: 90,
  len: 36,
  kills: [{ ch: ["LLS", "LLI", "RRS", "RRI"], stage: 3 }],
  fields: { L: bothQ("L"), R: bothQ("R") },
};

/** All 13 lesion definitions, left side first, chiasm in the middle, right side last. */
export const LESIONS = [...lesionsFor("L"), CHIASM, ...lesionsFor("R")];

/** Lookup table: lesion id → lesion object. */
export const BYID = {};
LESIONS.forEach((l) => {
  BYID[l.id] = l;
});

/* ================================================================
   Diagram geometry (GEO)
   ================================================================ */

/**
 * All spatial parameters for the inferior-view brain diagram.
 * GEO.outline.half is a single SVG path string for the LEFT cerebral
 * hemisphere — the right is produced by mirroring x → MID − x.
 */
export const GEO = {
  outline: {
    top: 126,
    bottom: 601,
    half:
      "C 204 127, 174 138, 154 158 " +
      "C 124 188,  86 212,  66 258 " +
      "C  48 300,  32 348,  33 396 " +
      "C  34 448,  48 500,  74 536 " +
      "C  98 570, 140 594, 178 599 " +
      "C 196 601, 216 601, 230 601",
    sulcus: "M 98 240 C 66 294, 54 356, 70 420",
  },
  midbrain:
    "M 230 232 C 260 232, 280 262, 280 302 C 280 350, 258 392, 230 402 " +
    "C 202 392, 180 350, 180 302 C 180 262, 200 232, 230 232 Z",
  mammillary: [[220, 241], [240, 241], 6],
  eye: { cx: 161, cy: 74, r: 35 },
  lgn: { cx: 175, cy: 299, rx: 19.5, ry: 12, tilt: 24 },
  v1: { from: [191, 584], to: [214, 510] },
  fan: { n: 15, latC1: 24, medC1: 150, latC2: 16, medC2: 159 },
  stroke: {
    outline: 1.3,
    fibre: 2.9,
    tract: 2.7,
    fan: 1.5,
    v1: 8,
    retina: 5.5,
    nerveSheath: 14,
    tractSheath: 11,
  },
};

/* ================================================================
   Monocular visual-field outline (BEAN)
   ================================================================ */

/**
 * Bean-shaped outline of a monocular visual field in eye-centred units.
 * +x = nasal, +y = inferior. A real field reaches ~95 deg temporally
 * but only ~60 deg nasally (the nose clips the inferonasal quadrant).
 * @type {Array<Array<string|number>>}
 */
export const BEAN = [
  ["M", -1.16, 0.0],
  ["C", -1.14, -0.54, -0.7, -0.82, -0.2, -0.83],
  ["C", 0.18, -0.84, 0.62, -0.62, 0.66, -0.18],
  ["C", 0.69, 0.06, 0.5, 0.14, 0.47, 0.38],
  ["C", 0.44, 0.72, 0.1, 0.94, -0.3, 0.94],
  ["C", -0.78, 0.94, -1.18, 0.52, -1.16, 0.0],
  ["Z"],
];

/* ================================================================
   Quadrant angle lookup
   ================================================================ */

/**
 * Maps quadrant keys (hemifield+altitude) to [startAngle, endAngle]
 * in radians for drawing arcs in screen-space (y-down).
 * @type {Object<string, [number, number]>}
 */
export const QANG = {
  LS: [Math.PI, 1.5 * Math.PI],
  LI: [0.5 * Math.PI, Math.PI],
  RS: [1.5 * Math.PI, 2 * Math.PI],
  RI: [0, 0.5 * Math.PI],
};

/* ================================================================
   Lesion rail site definitions (SITES)
   ================================================================ */

/**
 * Groups and rows for the sidebar lesion selector.
 * Each entry: [groupLabel, [[key, tag, displayName], ...]].
 * Lesion IDs are formed by appending '-L' or '-R' to the key
 * (except 'chiasm' which is used as-is).
 * @type {Array<[string, Array<[string, string, string]>]>}
 */
export const SITES = [
  ["Pre-chiasmal", [["on", "A", "Optic nerve"]]],
  ["Chiasm", [["chiasm", "B", "Chiasm (midline)"]]],
  [
    "Retro-chiasmal",
    [
      ["tract", "C", "Optic tract"],
      ["lgn", "", "Lateral geniculate n."],
    ],
  ],
  [
    "Optic radiation",
    [
      ["mey", "D", "Optic radiation (inferior)"],
      ["par", "", "Optic radiation (superior)"],
    ],
  ],
  ["Primary visual cortex (V1)", [["post", "E", "V1, macular sparing"]]],
];

/* ================================================================
   Projection panel constants
   ================================================================ */

/** Composite binocular field oval geometry. */
export const OV = { cx: 280, cy: 92, rx: 150, ry: 62 };

/** Fractional start of the monocular crescent (0–1 of OV.rx). */
export const UCR = 0.78;

/** Absolute x-coordinate where the monocular crescent begins. */
export const XCR = OV.cx + UCR * OV.rx;

/** Field arc geometry in front of the two eyes. */
export const ARC = { cx: 280, cy: 596, r0: 232, r1: 252, rm: 242 };

/** Eye positions in the projection panel. */
export const EY = {
  L: { x: 212, y: 600, r: 30 },
  R: { x: 348, y: 600, r: 30 },
};

/** Angle in degrees corresponding to the monocular crescent boundary. */
export const TH_CR = 90 + UCR * 90;

/**
 * Five labelled sample points in the projection panel, used for
 * tracing rays from field → retina.
 * @type {Array<{id:string, th:number, r:number, hemi:string, eyes:string[], note:string}>}
 */
export const PTS = [
  {
    id: "A",
    th: 168,
    r: 0.867,
    hemi: "L",
    eyes: ["L"],
    note: "left monocular crescent — extreme nasal retina of the left eye only",
  },
  {
    id: "B",
    th: 131,
    r: 0.456,
    hemi: "L",
    eyes: ["L", "R"],
    note: "left binocular field — nasal retina (left eye) + temporal retina (right eye)",
  },
  {
    id: "FP",
    th: 90,
    r: 0.02,
    hemi: "both",
    eyes: ["L", "R"],
    note: "fixation — the fovea of both eyes, straddling the vertical meridian",
  },
  {
    id: "C",
    th: 49,
    r: 0.456,
    hemi: "R",
    eyes: ["L", "R"],
    note: "right binocular field — temporal retina (left eye) + nasal retina (right eye)",
  },
  {
    id: "D",
    th: 12,
    r: 0.867,
    hemi: "R",
    eyes: ["R"],
    note: "right monocular crescent — extreme nasal retina of the right eye only",
  },
];

/* ================================================================
   Mask / scene constants
   ================================================================ */

/**
 * Fractional eccentricity where the binocular overlap ends and the
 * monocular crescent begins — also the nasal field limit for each eye.
 * An eye reaches ~95 deg temporally but only ~60 deg nasally, so
 * beyond |u| = CRESCENT the world is seen by one eye only.
 */
export const CRESCENT = 0.63;

/** Alias — nasal field limit equals the crescent boundary. */
export const NASALLIM = CRESCENT;

/** How big the macular island looks on the video overlay. */
export const MACV = 0.115;

/* ================================================================
   Pure geometry / maths functions
   ================================================================ */

/**
 * Linear interpolation.
 * @param {number} a - start value
 * @param {number} b - end value
 * @param {number} t - interpolation parameter (0–1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * De Casteljau subdivision of a cubic Bézier at parameter t.
 * @param {Array<[number,number]>} p - four control points [p0, c1, c2, p3]
 * @param {number} t - split parameter (0–1)
 * @returns {[Array<[number,number]>, Array<[number,number]>]} two sub-curves
 */
export function splitCubic(p, t) {
  const L = (a, b) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const a = L(p[0], p[1]);
  const b = L(p[1], p[2]);
  const c = L(p[2], p[3]);
  const d = L(a, b);
  const e = L(b, c);
  const f = L(d, e);
  return [
    [p[0], a, d, f],
    [f, e, c, p[3]],
  ];
}

/**
 * Convert four control points to an SVG cubic Bézier path string.
 * @param {Array<[number,number]>} p - [p0, c1, c2, p3]
 * @returns {string} SVG path data
 */
export function cub(p) {
  return `M ${p[0][0]} ${p[0][1]} C ${p[1][0]} ${p[1][1]}, ${p[2][0]} ${p[2][1]}, ${p[3][0]} ${p[3][1]}`;
}

/**
 * Test whether a point (hemifield, altitude, eccentricity) falls
 * inside any blind region described by a set of field primitives.
 * @param {Array<{h:string, a:string, ri:number, ro:number}>} prims
 * @param {string} h - hemifield
 * @param {string} a - altitude
 * @param {number} r - normalised eccentricity (0–1)
 * @returns {boolean}
 */
export function blindAt(prims, h, a, r) {
  for (const p of prims) {
    if (p.h === h && p.a === a && r >= p.ri && r <= p.ro) return true;
  }
  return false;
}

/**
 * Compute channel liveness for a pathway segment at a given stage.
 * @param {number} stage - stage number along the pathway
 * @param {Set<string>} pathSet - Set of active lesion IDs
 * @returns {Object<string, number>} channel → status (0 alive, 1 partial, 2 dead)
 */
export function channelState(stage, pathSet) {
  const st = {};
  pathSet.forEach((id) => {
    if (!BYID[id]) return;
    BYID[id].kills.forEach((k) => {
      if (k.stage <= stage) {
        k.ch.forEach((c) => {
          const v = k.partial ? 1 : 2;
          st[c] = Math.max(st[c] || 0, v);
        });
      }
    });
  });
  return st;
}

/**
 * Extract field primitives for a set of lesion IDs and a given eye.
 * @param {Set<string>} set - lesion IDs
 * @param {string} eye - 'L' or 'R'
 * @returns {Array<{h:string, a:string, ri:number, ro:number}>}
 */
export function primsOf(set, eye) {
  const out = [];
  set.forEach((id) => {
    if (BYID[id]) {
      (BYID[id].fields[eye] || []).forEach((p) => out.push(p));
    }
  });
  return out;
}

/**
 * Lesion field-pattern signature for equivalent-answer checking.
 * Two lesions with identical signatures produce the same visual
 * field deficit.  Results are memoised.
 * @param {string} id - lesion ID
 * @returns {string}
 */
const _sigCache = {};
export function sigOf(id) {
  if (_sigCache[id]) return _sigCache[id];
  const l = BYID[id];
  if (!l) return "";
  return (_sigCache[id] = ["L", "R"]
    .map((e) =>
      (l.fields[e] || [])
        .map((p) => p.h + p.a + p.ri.toFixed(2) + p.ro.toFixed(2))
        .sort()
        .join("|")
    )
    .join(" / "));
}

/**
 * Group a 0..n sampling into runs of equal non-zero state.
 * Each run is { v, a, b } where a..b are normalised (0–1).
 * @param {number} n - number of samples
 * @param {function(number): number} f - state function for each sample index
 * @returns {Array<{v:number, a:number, b:number}>}
 */
export function runs(n, f) {
  const out = [];
  let cur = f(0);
  let st = 0;
  for (let i = 1; i <= n; i++) {
    const v = i < n ? f(i) : Symbol("end");
    if (v !== cur) {
      out.push({ v: cur, a: st / n, b: i / n });
      cur = v;
      st = i;
    }
  }
  return out.filter((o) => typeof o.v === "number" && o.v > 0);
}

/**
 * SVG path for an annular sector (ring segment).
 * Angles are in radians, y-down screen convention.
 * @param {number} cx - centre x
 * @param {number} cy - centre y
 * @param {number} r0 - inner radius (0 produces a pie wedge)
 * @param {number} r1 - outer radius
 * @param {number} a0 - start angle (radians)
 * @param {number} a1 - end angle (radians)
 * @returns {string} SVG path data
 */
export function annSect(cx, cy, r0, r1, a0, a1) {
  const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const lg = a1 - a0 > Math.PI ? 1 : 0;
  const [x1, y1] = P(r1, a0);
  const [x2, y2] = P(r1, a1);
  const [x3, y3] = P(r0, a1);
  const [x4, y4] = P(r0, a0);
  if (r0 <= 0.0005) {
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r1} ${r1} 0 ${lg} 1 ${x2} ${y2} Z`;
  }
  return `M ${x1} ${y1} A ${r1} ${r1} 0 ${lg} 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 ${lg} 0 ${x4} ${y4} Z`;
}

/**
 * Determine field chart pixel size based on viewport dimensions.
 * @param {number} [innerW] - viewport width (defaults assume desktop)
 * @param {number} [innerH] - viewport height
 * @returns {number} pixel size for the field chart canvas
 */
export function fieldSize(innerW = 1400, innerH = 900) {
  if (innerH <= 700 || innerW <= 820) return 128;
  if (innerW < 1200) return 150;
  return 172;
}

/**
 * Draw the bean-shaped monocular field outline onto a Canvas 2D context.
 * Does NOT stroke or fill — just builds the path so the caller can
 * clip, fill, or stroke as needed.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} eye - 'L' or 'R'
 * @param {number} cx - centre x
 * @param {number} cy - centre y
 * @param {number} R - radius scale
 */
export function beanPath(ctx, eye, cx, cy, R) {
  const sx = eye === "L" ? 1 : -1;
  ctx.beginPath();
  BEAN.forEach((seg) => {
    if (seg[0] === "M") {
      ctx.moveTo(cx + sx * seg[1] * R, cy + seg[2] * R);
    } else if (seg[0] === "C") {
      ctx.bezierCurveTo(
        cx + sx * seg[1] * R,
        cy + seg[2] * R,
        cx + sx * seg[3] * R,
        cy + seg[4] * R,
        cx + sx * seg[5] * R,
        cy + seg[6] * R
      );
    } else {
      ctx.closePath();
    }
  });
}

/**
 * Convert polar coordinates (angle in degrees, radius) to cartesian,
 * relative to the projection arc centre.
 * @param {number} th - angle in degrees
 * @param {number} R - radius
 * @returns {[number, number]} [x, y]
 */
export function thXY(th, R) {
  return [
    ARC.cx + R * Math.cos((th * Math.PI) / 180),
    ARC.cy - R * Math.sin((th * Math.PI) / 180),
  ];
}

/**
 * X-coordinate of a sample point on the composite field oval.
 * @param {{hemi:string, r:number}} p - point descriptor
 * @returns {number}
 */
export function ovX(p) {
  return OV.cx + (p.hemi === "both" ? 0 : p.hemi === "L" ? -p.r : p.r) * OV.rx;
}

/**
 * Y-coordinate on the bottom edge of the field oval for a sample point.
 * @param {{hemi:string, r:number}} p - point descriptor
 * @returns {number}
 */
export function ovBottomY(p) {
  return (
    OV.cy +
    OV.ry * Math.sqrt(Math.max(0, Math.pow((ovX(p) - OV.cx) / OV.rx, 2)))
  );
}

/* ================================================================
   Mask summary
   ================================================================ */

/**
 * Summarise a set of mask primitives (as returned by a maskPrims-style
 * function) to decide rendering strategy for the scene overlay.
 *
 * Each primitive must have { h, a, ri, ro, lv, zone } where:
 *   lv 2 = truly blind (both eyes), lv 1 = lost to one eye in binocular zone.
 *
 * @param {Array<{h:string, a:string, ri:number, ro:number, lv:number, zone:string}>} prims
 * @returns {{any1:boolean, any2:boolean, hatchOK:boolean}}
 */
export function maskSummary(prims) {
  const any2 = prims.some((p) => p.lv === 2);
  const any1 = prims.some((p) => p.lv === 1);
  let hatchOK = false;
  HEMI.forEach((h) =>
    ALT.forEach((a) => {
      const cov = prims
        .filter(
          (p) => p.lv === 1 && p.h === h && p.a === a && p.zone === "bino"
        )
        .reduce((t, p) => t + (p.ro - p.ri), 0);
      if (cov < 0.9) hatchOK = true;
    })
  );
  return { any1, any2, hatchOK: hatchOK && any1 && any2 };
}
