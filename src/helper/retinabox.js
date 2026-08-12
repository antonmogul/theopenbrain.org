/**
 * retinabox.js — Pure model, presets, and challenge data for the RetINaBox
 * interactive retinal circuit simulator.
 *
 * Port of GUI/gpio_manager.py (GPIOWorker) and GUI/data_manager.py from the
 * desktop application. The web edition replaces the hardware GPIO chain with
 * writeChannels(): stimulus generator → writeChannels() → 9 channel values → RGCs.
 *
 * Everything here is framework-agnostic — no Vue, no DOM. The Vue SFC imports
 * these functions and data to drive the UI.
 */

/* ---------- constants ---------- */
export const DT_MS = 25;
export const DUR_S = 10;
export const NBUF = Math.round((DUR_S * 1000) / DT_MS); // 400
export const SPEED_MS = [500, 300, 100]; // Slow, Medium, Fast
export const DELAY_MS = { None: 0, short: 100, medium: 300, long: 500 };
export const DELAY_KEYS = ["None", "short", "medium", "long"];
export const STATES = ["off", "excitatory", "inhibitory"];
export const SPEED_NAMES = ["Slow", "Medium", "Fast"];

/* ---------- model helpers ---------- */
export function grid(v) {
  return [
    [v, v, v],
    [v, v, v],
    [v, v, v],
  ];
}

export function blankConn() {
  const a = [];
  for (let r = 0; r < 3; r++) {
    a.push([]);
    for (let c = 0; c < 3; c++) a[r].push({ state: "off", delay: "None" });
  }
  return a;
}

export function createModel() {
  return {
    selected: grid(false),
    activated: grid(false),
    mode: "Static",
    speed: 1,
    direction: "Right",
    running: false,
    rgc: [
      { polarity: "ON", threshold: 1, conn: blankConn() },
      { polarity: "ON", threshold: 1, conn: blankConn() },
    ],
    channels: new Float32Array(9),
    hist: new Float32Array(NBUF * 9),
    head: NBUF - 1,
    contrib: [new Float32Array(NBUF * 9), new Float32Array(NBUF * 9)],
    sum: [new Float32Array(NBUF), new Float32Array(NBUF)],
    spike: [new Uint8Array(NBUF), new Uint8Array(NBUF)],
    lit: new Uint8Array(NBUF * 9),
    motionAcc: 0,
  };
}

export function clearTraces(M) {
  M.hist.fill(0);
  M.lit.fill(0);
  M.head = NBUF - 1;
  M.motionAcc = 0;
  for (let k = 0; k < 2; k++) {
    M.contrib[k].fill(0);
    M.sum[k].fill(0);
    M.spike[k].fill(0);
  }
}

function nextCoord(r, c, dir) {
  if (dir === "Up") return [(r + 2) % 3, c];
  if (dir === "Down") return [(r + 1) % 3, c];
  if (dir === "Left") return [r, (c + 2) % 3];
  return [r, (c + 1) % 3];
}

export function armStimulus(M) {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      M.activated[r][c] = M.running ? M.selected[r][c] : false;
  M.motionAcc = 0;
}

function stepMotion(M) {
  const next = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      if (M.activated[r][c]) {
        M.activated[r][c] = false;
        next.push(nextCoord(r, c, M.direction));
      }
  for (const p of next) M.activated[p[0]][p[1]] = true;
}

function writeChannels(M) {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      M.channels[r * 3 + c] = M.activated[r][c] ? 1 : 0;
}

function channelAt(M, back, ch) {
  let i = (M.head - back) % NBUF;
  if (i < 0) i += NBUF;
  return M.hist[i * 9 + ch];
}

export function tick(M) {
  if (M.running && M.mode === "Motion") {
    const iv = SPEED_MS[M.speed];
    M.motionAcc += DT_MS;
    while (M.motionAcc >= iv) {
      stepMotion(M);
      M.motionAcc -= iv;
    }
  }
  writeChannels(M);
  M.head = (M.head + 1) % NBUF;
  M.hist.set(M.channels, M.head * 9);
  for (let i = 0; i < 9; i++)
    M.lit[M.head * 9 + i] = M.channels[i] > 0.5 ? 1 : 0;

  for (let k = 0; k < 2; k++) {
    const g = M.rgc[k];
    let s = 0;
    const base = M.head * 9;
    for (let ch = 0; ch < 9; ch++) {
      const cell = g.conn[(ch / 3) | 0][ch % 3];
      let x = 0;
      if (cell.state !== "off") {
        let v = channelAt(M, Math.round(DELAY_MS[cell.delay] / DT_MS), ch);
        if (g.polarity === "OFF") v = 1 - v;
        x = (cell.state === "excitatory" ? 1 : -1) * v;
      }
      M.contrib[k][base + ch] = x;
      s += x;
    }
    M.sum[k][M.head] = s;
    M.spike[k][M.head] = s >= g.threshold ? 1 : 0;
  }
}

/* ---------- preset connectivity builder ---------- */
function conn(spec, d) {
  d = d || "000000000";
  const a = blankConn();
  for (let ch = 0; ch < 9; ch++) {
    const s = spec[ch];
    const st = s === "e" ? "excitatory" : s === "i" ? "inhibitory" : "off";
    a[(ch / 3) | 0][ch % 3] = {
      state: st,
      delay: st === "off" ? "None" : DELAY_KEYS[+d[ch]],
    };
  }
  return a;
}

/* ---------- presets ---------- */
export const PRESETS = [
  {
    id: "on-center",
    name: "ON cell",
    apply(M) {
      M.rgc[0] = { polarity: "ON", threshold: 1, conn: conn("....e....") };
      M.rgc[1] = { polarity: "ON", threshold: 1, conn: blankConn() };
      M.selected = grid(false);
      M.selected[1][1] = true;
      M.mode = "Static";
    },
  },
  {
    id: "off-center",
    name: "OFF cell",
    apply(M) {
      M.rgc[0] = { polarity: "OFF", threshold: 1, conn: conn("....e....") };
      M.rgc[1] = { polarity: "ON", threshold: 1, conn: blankConn() };
      M.selected = grid(false);
      M.selected[1][1] = true;
      M.mode = "Static";
    },
  },
  {
    id: "parallel",
    name: "ON and OFF in parallel",
    apply(M) {
      M.rgc[0] = { polarity: "ON", threshold: 1, conn: conn("....e....") };
      M.rgc[1] = { polarity: "OFF", threshold: 1, conn: conn("....e....") };
      M.selected = grid(false);
      M.selected[1][1] = true;
      M.mode = "Static";
    },
  },
  {
    id: "center-surround",
    name: "Centre–surround",
    apply(M) {
      M.rgc[0] = { polarity: "ON", threshold: 1, conn: conn("iiiieiiii") };
      M.rgc[1] = { polarity: "ON", threshold: 1, conn: blankConn() };
      M.selected = grid(false);
      M.selected[1][1] = true;
      M.mode = "Static";
    },
  },
  {
    id: "center-surround-sizes",
    name: "Centre–surround, small and large",
    apply(M) {
      M.rgc[0] = { polarity: "ON", threshold: 1, conn: conn("iiiieiiii") };
      M.rgc[1] = { polarity: "ON", threshold: 5, conn: conn("ieieeeiei") };
      M.selected = grid(false);
      M.selected[1][1] = true;
      M.mode = "Static";
    },
  },
  {
    id: "direction-selective",
    name: "Direction-selective cell",
    apply(M) {
      M.rgc[0] = {
        polarity: "ON",
        threshold: 1,
        conn: conn("ie.ie.ie.", "202202202"),
      };
      M.rgc[1] = { polarity: "ON", threshold: 1, conn: blankConn() };
      M.selected = grid(false);
      M.selected[0][0] = M.selected[1][0] = M.selected[2][0] = true;
      M.mode = "Motion";
      M.speed = 1;
      M.direction = "Right";
    },
  },
  {
    id: "ds-pair",
    name: "Direction-selective pair (left and right)",
    apply(M) {
      M.rgc[0] = {
        polarity: "ON",
        threshold: 6,
        conn: conn("ieeieeiee", "202202202"),
      };
      M.rgc[1] = {
        polarity: "ON",
        threshold: 6,
        conn: conn("eeieeieei", "202202202"),
      };
      M.selected = grid(false);
      M.selected[0][0] = M.selected[1][0] = M.selected[2][0] = true;
      M.mode = "Motion";
      M.speed = 1;
      M.direction = "Right";
    },
  },
];

/* ---------- drawing constants ---------- */

/** Stimulus colours — these are ALWAYS saturated (never token-swapped). */
export const COL = {
  red: "#CD1916",
  blue: "#1A83C9",
  yellow: "#DEB33D",
  green: "#3D783F",
  gray: "#BDBFB6",
  lightGray: "#E0E0E0",
  black: "#000000",
  line: "#CCCCCC",
};

/** RGC trace colours follow the soma artwork: RGC 1 = green, RGC 2 = yellow. */
export const RGC_TRACE = [COL.green, COL.yellow];

/**
 * Connectivity dot positions in the SVG's 376×336 coordinate space.
 * From interaction_manager.py :: NeuronWidget.circle_positions.
 */
export const DOTS = [
  [12, 38],
  [127, 38],
  [241, 38],
  [65, 105],
  [179, 105],
  [295, 105],
  [120, 172],
  [239, 172],
  [353, 172],
];
export const DOT_R = 35 / 3;

/* ---------- scope layout constants ---------- */
export const SCOPE = {
  ROW: 13,
  RGC_GAP: 14,
  RGC_ROW: 15,
  AX: 44,
  TITLE: 18,
  PAD: 8,
  LEFT: 64,
  RIGHT: 74,
};
SCOPE.BLOCK =
  SCOPE.TITLE + 9 * SCOPE.ROW + SCOPE.RGC_GAP + SCOPE.RGC_ROW + SCOPE.AX;
SCOPE.CH = SCOPE.PAD + SCOPE.BLOCK * 2 + SCOPE.PAD;

/**
 * Draw one RGC's trace block on a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} M - model state
 * @param {number} k - RGC index (0 or 1)
 * @param {number} top - y offset for this block
 * @param {number} CW - canvas logical width
 * @param {string} font - CSS font string
 */
export function drawRGC(ctx, M, k, top, CW, font) {
  const { ROW, TITLE, RGC_GAP, RGC_ROW, LEFT, RIGHT } = SCOPE;
  const w = CW - LEFT - RIGHT;

  ctx.font = font;
  ctx.textBaseline = "middle";

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = "#333";
  ctx.fillText(`RGC ${k + 1}`, LEFT + w / 2, top + 8);

  const plotTop = top + TITLE;

  // Nine photoreceptor traces
  for (let j = 0; j < 9; j++) {
    const y = plotTop + j * ROW + ROW / 2;
    ctx.textAlign = "right";
    ctx.fillStyle = "#555";
    ctx.fillText(String(j + 1), LEFT - 6, y);

    // Baseline
    ctx.strokeStyle = COL.gray;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LEFT, y);
    ctx.lineTo(LEFT + w, y);
    ctx.stroke();

    // Excitatory (red) then inhibitory (blue) runs
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? COL.blue : COL.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      let run = false;
      for (let i = 0; i < NBUF; i++) {
        const v = M.contrib[k][((M.head + 1 + i) % NBUF) * 9 + j];
        const hit = pass ? v < -0.5 : v > 0.5;
        const x = LEFT + (i / (NBUF - 1)) * w;
        if (hit && !run) {
          ctx.moveTo(x, y);
          run = true;
        } else if (hit) {
          ctx.lineTo(x, y);
        } else {
          run = false;
        }
      }
      ctx.stroke();
    }

    // Photoreceptor input lamp
    const lit = M.lit[M.head * 9 + j] === 1;
    ctx.beginPath();
    ctx.arc(LEFT + w + 12, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = lit ? "#FDFF6E" : "#fff";
    ctx.fill();
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Rotated axis captions
  ctx.save();
  ctx.translate(14, plotTop + (9 * ROW) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillStyle = "#555";
  ctx.fillText("Photoreceptor Output", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(CW - 10, plotTop + (9 * ROW) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillStyle = "#555";
  ctx.fillText("Photoreceptor Input", 0, 0);
  ctx.restore();

  // RGC output row
  const ry = plotTop + 9 * ROW + RGC_GAP + RGC_ROW / 2;
  ctx.textAlign = "right";
  ctx.fillStyle = "#555";
  ctx.fillText(`RGC ${k + 1}`, LEFT - 6, ry);
  ctx.strokeStyle = COL.gray;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LEFT, ry);
  ctx.lineTo(LEFT + w, ry);
  ctx.stroke();

  ctx.strokeStyle = RGC_TRACE[k];
  ctx.lineWidth = 4;
  ctx.beginPath();
  let run2 = false;
  for (let i = 0; i < NBUF; i++) {
    const sp = M.spike[k][(M.head + 1 + i) % NBUF];
    const x = LEFT + (i / (NBUF - 1)) * w;
    if (sp && !run2) {
      ctx.moveTo(x, ry);
      run2 = true;
    } else if (sp) {
      ctx.lineTo(x, ry);
    } else {
      run2 = false;
    }
  }
  ctx.stroke();

  // Time axis with 1 s scale bar
  const ay = ry + RGC_ROW / 2 + 9;
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT, ay + 0.5);
  ctx.lineTo(LEFT + w, ay + 0.5);
  ctx.stroke();
  for (let i = 0; i <= DUR_S * 2; i++) {
    const tx = LEFT + (i / (DUR_S * 2)) * w;
    ctx.beginPath();
    ctx.moveTo(tx + 0.5, ay);
    ctx.lineTo(tx + 0.5, ay + (i % 2 ? 3 : 5));
    ctx.stroke();
  }
  ctx.fillStyle = "#555";
  ctx.textAlign = "center";
  ctx.fillText("Time", LEFT + w / 2, ay + 15);

  const sb = w / DUR_S;
  const sx = LEFT + w - sb;
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, ay + 13);
  ctx.lineTo(LEFT + w, ay + 13);
  ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText("1 sec", sx + sb / 2, ay + 21);
}

/**
 * Draw the full scope (both RGCs).
 */
export function drawScope(ctx, M, CW) {
  const { PAD, BLOCK } = SCOPE;
  const font = "10px sans-serif";
  ctx.clearRect(0, 0, CW, SCOPE.CH);
  drawRGC(ctx, M, 0, PAD, CW, font);
  drawRGC(ctx, M, 1, PAD + BLOCK, CW, font);
}

/**
 * Draw the discovery mode's single-trace RGC canvas.
 */
export function drawDmTrace(ctx, M, CW, DMH, font, active) {
  const L = 48;
  const w = CW - L - 10;
  const y = DMH / 2 + 4;
  ctx.clearRect(0, 0, CW, DMH);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillStyle = "#555";
  ctx.fillText("RGC 1", L - 5, y);
  ctx.strokeStyle = COL.gray;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, y);
  ctx.lineTo(L + w, y);
  ctx.stroke();

  if (active) {
    ctx.strokeStyle = COL.green;
    ctx.lineWidth = 6;
    ctx.beginPath();
    let run = false;
    for (let i = 0; i < NBUF; i++) {
      const sp = M.spike[0][(M.head + 1 + i) % NBUF];
      const x = L + (i / (NBUF - 1)) * w;
      if (sp && !run) {
        ctx.moveTo(x, y);
        run = true;
      } else if (sp) {
        ctx.lineTo(x, y);
      } else {
        run = false;
      }
    }
    ctx.stroke();
  }

  ctx.strokeStyle = "#999";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L, DMH - 12.5);
  ctx.lineTo(L + w, DMH - 12.5);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#555";
  ctx.fillText("10 s", L + w / 2, DMH - 5);
}

/* ---------- Code Breaker helpers ---------- */

/**
 * Tokenize a solution string against the available letter set.
 * Longest tokens first so multi-character letters win.
 */
export function cbTokenize(str, letters) {
  const sorted = letters.slice().sort((a, b) => b.length - a.length);
  const out = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === " ") {
      out.push(" ");
      i++;
      continue;
    }
    let matched = false;
    for (const L of sorted) {
      if (
        L.length > 1 &&
        str.substr(i, L.length).toUpperCase() === L.toUpperCase()
      ) {
        out.push(L.toUpperCase());
        i += L.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const up = str[i].toUpperCase();
      out.push(letters.some((L) => L.toUpperCase() === up) ? up : str[i]);
      i++;
    }
  }
  return out;
}

/* ---------- Challenge data ---------- */

/**
 * Code Breaker default challenges.
 * From "Lesson 1 Solutions: Codebreaking" in RetINaBox_LessonPlans.pdf.
 */
export const CB_DEFAULT = {
  "Challenge 1": {
    RetinaBox_output: ["E", "R", "D", "A"],
    RGC_1_pref_stim: [0, 1, 1, 0, 1, 1, 0, 0, 0],
    RGC_2_pref_stim: [0, 0, 0, 0, 0, 0, 1, 0, 0],
    Solution_string: "Dear reader, dread red area.",
    stim_codes: {
      E: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0],
      ],
      R: [
        [0, 1, 1, 0, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 1, 1, 0, 0, 0],
      ],
      D: [
        [0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0],
      ],
      A: [
        [0, 1, 1, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 1, 1, 1, 0, 0],
      ],
    },
  },
  "Challenge 2": {
    RetinaBox_output: ["A", "E", "R", "T"],
    RGC_1_pref_stim: [0, 0, 1, 0, 0, 0, 0, 0, 0],
    RGC_2_pref_stim: [0, 0, 0, 0, 1, 1, 0, 1, 1],
    Solution_string: "A rare rat ate a tree.",
    stim_codes: {
      A: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0],
      ],
      E: [
        [0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 1],
        [0, 0, 1, 0, 0, 0, 0, 1, 0],
        [0, 0, 1, 0, 0, 1, 0, 0, 0],
      ],
      R: [
        [0, 0, 0, 0, 1, 1, 0, 1, 1],
        [0, 0, 0, 0, 1, 1, 0, 1, 1],
        [0, 0, 0, 0, 1, 1, 0, 1, 1],
        [0, 0, 0, 0, 1, 1, 0, 1, 1],
      ],
      T: [
        [0, 0, 1, 0, 1, 1, 0, 1, 1],
        [0, 0, 1, 0, 1, 1, 0, 1, 1],
        [0, 0, 1, 0, 1, 1, 0, 1, 1],
      ],
    },
  },
  "Challenge 3": {
    RetinaBox_output: ["A", "I", "D", "M"],
    RGC_1_pref_stim: [0, 0, 0, 1, 1, 0, 1, 1, 0],
    RGC_2_pref_stim: [0, 0, 0, 0, 1, 1, 0, 1, 1],
    Solution_string: "Mamma Mia! I am mad.",
    stim_codes: {
      A: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0],
      ],
      I: [
        [0, 0, 0, 1, 1, 0, 1, 1, 0],
        [0, 0, 0, 1, 1, 0, 1, 1, 1],
      ],
      D: [[0, 0, 0, 0, 1, 1, 0, 1, 1]],
      M: [
        [0, 0, 0, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 1, 1, 1, 1, 1],
      ],
    },
  },
  "Challenge 4": {
    RetinaBox_output: ["H", "T", "E", "A"],
    RGC_1_pref_stim: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    RGC_2_pref_stim: [0, 0, 0, 0, 0, 1, 0, 0, 0],
    Solution_string: "He ate the hat.",
    stim_codes: {
      H: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
      ],
      T: [
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
      ],
      E: [
        [0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0],
      ],
      A: [
        [0, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0],
      ],
    },
  },
  "Challenge 5": {
    RetinaBox_output: ["A", "B", "C", "KE"],
    RGC_1_pref_stim: [0, 0, 0, 0, 1, 1, 0, 1, 1],
    RGC_2_pref_stim: [0, 1, 0, 0, 0, 0, 0, 0, 0],
    Solution_string: "Bake a cake.",
    stim_codes: {
      A: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
      ],
      B: [[0, 0, 0, 0, 1, 1, 0, 1, 1]],
      C: [[0, 1, 0, 0, 0, 0, 0, 0, 0]],
      KE: [
        [0, 1, 0, 0, 1, 1, 0, 1, 1],
        [0, 1, 0, 0, 1, 1, 0, 1, 1],
      ],
    },
  },
  "Challenge 6": {
    RetinaBox_output: ["A", "P", "C", "K"],
    RGC_1_pref_stim: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    RGC_2_pref_stim: [0, 0, 0, 0, 0, 0, 0, 0, 1],
    Solution_string: "Pack a cap.",
    stim_codes: {
      A: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0],
      ],
      P: [
        [1, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0, 0],
      ],
      C: [
        [0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 1],
      ],
      K: [[1, 0, 0, 0, 0, 0, 0, 0, 1]],
    },
  },
};

/**
 * Discovery Mode default challenges.
 * From "Lesson 4 Solutions: Discovery Mode" in RetINaBox_LessonPlans.pdf.
 * Each challenge has two accepted answers (ON circuit and OFF circuit);
 * direction-selective challenges have one per speed/delay pairing.
 */
/* eslint-disable object-curly-spacing */
const e = "excitatory",
  i = "inhibitory",
  N = "None";
const c = (s, d) => ({ state: s, delay: d || N });
export const DM_DEFAULT = {
  "Easy 1": [
    {
      stim_array: [0, 0, 0, 1, 0, 0, 0, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 1,
      polarity: "ON",
      connectivity: [c(i), c(i), c(i), c(e), c(i), c(i), c(i), c(i), c(i)],
    },
    {
      stim_array: [0, 0, 0, 1, 0, 0, 0, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 8,
      polarity: "OFF",
      connectivity: [c(e), c(e), c(e), c(i), c(e), c(e), c(e), c(e), c(e)],
    },
  ],
  "Easy 2": [
    {
      stim_array: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 3,
      polarity: "ON",
      connectivity: [c(e), c(i), c(i), c(i), c(e), c(i), c(i), c(i), c(e)],
    },
    {
      stim_array: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 6,
      polarity: "OFF",
      connectivity: [c(i), c(e), c(e), c(e), c(i), c(e), c(e), c(e), c(i)],
    },
  ],
  "Easy 3": [
    {
      stim_array: [0, 0, 0, 1, 1, 1, 0, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 3,
      polarity: "ON",
      connectivity: [c(i), c(i), c(i), c(e), c(e), c(e), c(i), c(i), c(i)],
    },
    {
      stim_array: [0, 0, 0, 1, 1, 1, 0, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 6,
      polarity: "OFF",
      connectivity: [c(e), c(e), c(e), c(i), c(i), c(i), c(e), c(e), c(e)],
    },
  ],
  "Easy 4": [
    {
      stim_array: [0, 0, 1, 0, 0, 0, 0, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 1,
      polarity: "ON",
      connectivity: [c(i), c(i), c(e), c(i), c(i), c(i), c(i), c(i), c(i)],
    },
    {
      stim_array: [0, 0, 1, 0, 0, 0, 0, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 8,
      polarity: "OFF",
      connectivity: [c(e), c(e), c(i), c(e), c(e), c(e), c(e), c(e), c(e)],
    },
  ],
  "Easy 5": [
    {
      stim_array: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 3,
      polarity: "ON",
      connectivity: [c(i), c(i), c(e), c(i), c(i), c(e), c(i), c(i), c(e)],
    },
    {
      stim_array: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 6,
      polarity: "OFF",
      connectivity: [c(e), c(e), c(i), c(e), c(e), c(i), c(e), c(e), c(i)],
    },
  ],
  "Easy 6": [
    {
      stim_array: [0, 0, 1, 0, 1, 0, 1, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 3,
      polarity: "ON",
      connectivity: [c(i), c(i), c(e), c(i), c(e), c(i), c(e), c(i), c(i)],
    },
    {
      stim_array: [0, 0, 1, 0, 1, 0, 1, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 6,
      polarity: "OFF",
      connectivity: [c(e), c(e), c(i), c(e), c(i), c(e), c(i), c(e), c(e)],
    },
  ],
  "Easy 7": [
    {
      stim_array: [1, 0, 0, 1, 0, 0, 1, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 3,
      polarity: "ON",
      connectivity: [c(e), c(i), c(i), c(e), c(i), c(i), c(e), c(i), c(i)],
    },
    {
      stim_array: [1, 0, 0, 1, 0, 0, 1, 0, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 6,
      polarity: "OFF",
      connectivity: [c(i), c(e), c(e), c(i), c(e), c(e), c(i), c(e), c(e)],
    },
  ],
  "Medium 1": [
    {
      stim_array: [1, 1, 1, 1, 0, 1, 1, 1, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 8,
      polarity: "ON",
      connectivity: [c(e), c(e), c(e), c(e), c(i), c(e), c(e), c(e), c(e)],
    },
    {
      stim_array: [1, 1, 1, 1, 0, 1, 1, 1, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 1,
      polarity: "OFF",
      connectivity: [c(i), c(i), c(i), c(i), c(e), c(i), c(i), c(i), c(i)],
    },
  ],
  "Medium 2": [
    {
      stim_array: [1, 1, 1, 0, 1, 0, 0, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 5,
      polarity: "ON",
      connectivity: [c(e), c(e), c(e), c(i), c(e), c(i), c(i), c(e), c(i)],
    },
    {
      stim_array: [1, 1, 1, 0, 1, 0, 0, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 4,
      polarity: "OFF",
      connectivity: [c(i), c(i), c(i), c(e), c(i), c(e), c(e), c(i), c(e)],
    },
  ],
  "Medium 3": [
    {
      stim_array: [1, 0, 1, 0, 1, 0, 1, 0, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 5,
      polarity: "ON",
      connectivity: [c(e), c(i), c(e), c(i), c(e), c(i), c(e), c(i), c(e)],
    },
    {
      stim_array: [1, 0, 1, 0, 1, 0, 1, 0, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 4,
      polarity: "OFF",
      connectivity: [c(i), c(e), c(i), c(e), c(i), c(e), c(i), c(e), c(i)],
    },
  ],
  "Medium 4": [
    {
      stim_array: [0, 1, 0, 1, 1, 1, 0, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 5,
      polarity: "ON",
      connectivity: [c(i), c(e), c(i), c(e), c(e), c(e), c(i), c(e), c(i)],
    },
    {
      stim_array: [0, 1, 0, 1, 1, 1, 0, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 4,
      polarity: "OFF",
      connectivity: [c(e), c(i), c(e), c(i), c(i), c(i), c(e), c(i), c(e)],
    },
  ],
  "Medium 5": [
    {
      stim_array: [0, 0, 0, 1, 1, 0, 1, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 4,
      polarity: "ON",
      connectivity: [c(i), c(i), c(i), c(e), c(e), c(i), c(e), c(e), c(i)],
    },
    {
      stim_array: [0, 0, 0, 1, 1, 0, 1, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 5,
      polarity: "OFF",
      connectivity: [c(e), c(e), c(e), c(i), c(i), c(e), c(i), c(i), c(e)],
    },
  ],
  "Medium 6": [
    {
      stim_array: [1, 1, 1, 1, 0, 0, 1, 1, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 7,
      polarity: "ON",
      connectivity: [c(e), c(e), c(e), c(e), c(i), c(i), c(e), c(e), c(e)],
    },
    {
      stim_array: [1, 1, 1, 1, 0, 0, 1, 1, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 2,
      polarity: "OFF",
      connectivity: [c(i), c(i), c(i), c(i), c(e), c(e), c(i), c(i), c(i)],
    },
  ],
  "Hard 1": [
    {
      stim_array: [1, 0, 0, 1, 1, 0, 1, 1, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 6,
      polarity: "ON",
      connectivity: [c(e), c(i), c(i), c(e), c(e), c(i), c(e), c(e), c(e)],
    },
    {
      stim_array: [1, 0, 0, 1, 1, 0, 1, 1, 1],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 3,
      polarity: "OFF",
      connectivity: [c(i), c(e), c(e), c(i), c(i), c(e), c(i), c(i), c(i)],
    },
  ],
  "Hard 2": [
    {
      stim_array: [1, 0, 0, 1, 0, 0, 1, 0, 0],
      motion_type: "Moving",
      direction: "Right",
      speed: "Slow",
      threshold: 6,
      polarity: "ON",
      connectivity: [
        c(e, "long"),
        c(e),
        c(i, "long"),
        c(e, "long"),
        c(e),
        c(i, "long"),
        c(e, "long"),
        c(e),
        c(i, "long"),
      ],
    },
    {
      stim_array: [1, 0, 0, 1, 0, 0, 1, 0, 0],
      motion_type: "Moving",
      direction: "Right",
      speed: "Medium",
      threshold: 6,
      polarity: "ON",
      connectivity: [
        c(e, "medium"),
        c(e),
        c(i, "medium"),
        c(e, "medium"),
        c(e),
        c(i, "medium"),
        c(e, "medium"),
        c(e),
        c(i, "medium"),
      ],
    },
    {
      stim_array: [1, 0, 0, 1, 0, 0, 1, 0, 0],
      motion_type: "Moving",
      direction: "Right",
      speed: "Fast",
      threshold: 6,
      polarity: "ON",
      connectivity: [
        c(e, "short"),
        c(e),
        c(i, "short"),
        c(e, "short"),
        c(e),
        c(i, "short"),
        c(e, "short"),
        c(e),
        c(i, "short"),
      ],
    },
  ],
  "Hard 3": [
    {
      stim_array: [0, 1, 0, 1, 0, 1, 0, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 4,
      polarity: "ON",
      connectivity: [c(i), c(e), c(i), c(e), c(i), c(e), c(i), c(e), c(i)],
    },
    {
      stim_array: [0, 1, 0, 1, 0, 1, 0, 1, 0],
      motion_type: "Static",
      direction: "",
      speed: "",
      threshold: 5,
      polarity: "OFF",
      connectivity: [c(e), c(i), c(e), c(i), c(e), c(i), c(e), c(i), c(e)],
    },
  ],
  "Hard 4": [
    {
      stim_array: [0, 1, 0, 0, 1, 0, 0, 1, 0],
      motion_type: "Moving",
      direction: "Left",
      speed: "Slow",
      threshold: 6,
      polarity: "ON",
      connectivity: [
        c(i, "long"),
        c(e),
        c(e, "long"),
        c(i, "long"),
        c(e),
        c(e, "long"),
        c(i, "long"),
        c(e),
        c(e, "long"),
      ],
    },
    {
      stim_array: [0, 1, 0, 0, 1, 0, 0, 1, 0],
      motion_type: "Moving",
      direction: "Left",
      speed: "Medium",
      threshold: 6,
      polarity: "ON",
      connectivity: [
        c(i, "medium"),
        c(e),
        c(e, "medium"),
        c(i, "medium"),
        c(e),
        c(e, "medium"),
        c(i, "medium"),
        c(e),
        c(e, "medium"),
      ],
    },
    {
      stim_array: [0, 1, 0, 0, 1, 0, 0, 1, 0],
      motion_type: "Moving",
      direction: "Left",
      speed: "Fast",
      threshold: 6,
      polarity: "ON",
      connectivity: [
        c(i, "short"),
        c(e),
        c(e, "short"),
        c(i, "short"),
        c(e),
        c(e, "short"),
        c(i, "short"),
        c(e),
        c(e, "short"),
      ],
    },
  ],
};
/* eslint-enable object-curly-spacing */

/** Document references for Lesson Plans and Teaching Slides tabs. */
export const REPO = "Trenholm-Lab/RetINaBox";
export const BRANCH = "main";
export function cdnURL(file) {
  return (
    `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/` +
    file.split("/").map(encodeURIComponent).join("/")
  );
}
export function ghURL(file) {
  return (
    `https://github.com/${REPO}/blob/${BRANCH}/` +
    file.split("/").map(encodeURIComponent).join("/")
  );
}

export const DOC_FILES = {
  lp: "Lesson Plans/RetINaBox_LessonPlans.pdf",
  sl: "Lesson Plans/RetINaBox_TeachingSlides.pdf",
};
