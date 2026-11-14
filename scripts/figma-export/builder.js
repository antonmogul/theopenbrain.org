// Runs inside Figma (use_figma) via AsyncFunction("figma","D", code).
// D = { tree, images:{id:hash}, frameName, pageId, x, y, chapterMode, ds, map, scale }
const DS = D.ds;
const created = [];
const warn = [];

// ---------- design-system imports ----------
const varCache = {};
const importVar = async (key) => {
  if (!varCache[key])
    varCache[key] = await figma.variables.importVariableByKeyAsync(key);
  return varCache[key];
};
const styleCache = {};
const importStyle = async (key) => {
  if (!styleCache[key])
    styleCache[key] = await figma.importStyleByKeyAsync(key);
  return styleCache[key];
};
const setCache = {};
const importSet = async (key) => {
  if (!setCache[key])
    setCache[key] = await figma.importComponentSetByKeyAsync(key);
  return setCache[key];
};

const hexToRgb = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
const colOf = (c) =>
  Array.isArray(c) ? { hex: c[0], a: c[1] } : { hex: c, a: 1 };

// hex -> variable key, role-aware (fill vs text)
const varFor = (hex, role) => {
  hex = hex.toLowerCase();
  const list = DS.colors.filter((v) => v.hex === hex);
  if (!list.length) return null;
  const pref =
    role === "text"
      ? ["Theme/color/ink", "Theme/color/mute", "Theme/color/on-dark"]
      : ["Theme/color/paper", "Theme/color/bg", "Theme/color/line"];
  list.sort((a, b) => {
    const ia = pref.indexOf(a.name),
      ib = pref.indexOf(b.name);
    const sa =
      ia < 0
        ? a.name.startsWith("Theme")
          ? 10
          : a.name.startsWith("Chapter")
            ? 20
            : 30
        : ia;
    const sb =
      ib < 0
        ? b.name.startsWith("Theme")
          ? 10
          : b.name.startsWith("Chapter")
            ? 20
            : 30
        : ib;
    return sa - sb;
  });
  return list[0].key;
};
const paint = async (c, role) => {
  const { hex, a } = colOf(c);
  let p = { type: "SOLID", color: hexToRgb(hex), opacity: a };
  // Figma forces opacity 1 on a variable-bound paint, so translucent colours stay raw
  const key = a < 1 ? null : varFor(hex, role);
  if (key) {
    try {
      p = {
        ...figma.variables.setBoundVariableForPaint(
          p,
          "color",
          await importVar(key)
        ),
        opacity: a,
      };
    } catch (e) {
      warn.push("bind " + hex);
    }
  }
  return p;
};

// ---------- fonts ----------
const WEIGHT = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "Bold",
  900: "Bold",
};
const fontLoaded = {};
const fontName = async (f) => {
  let style = WEIGHT[Math.round(f.w / 100) * 100] || "Regular";
  if (f.i) style = style === "Regular" ? "Italic" : style + " Italic";
  const fam = f.f;
  const tryLoad = async (family, st) => {
    const k = family + "|" + st;
    if (fontLoaded[k] === undefined) {
      try {
        await figma.loadFontAsync({ family, style: st });
        fontLoaded[k] = true;
      } catch (e) {
        fontLoaded[k] = false;
      }
    }
    return fontLoaded[k] ? { family, style: st } : null;
  };
  return (
    (await tryLoad(fam, style)) ||
    (await tryLoad(fam, f.i ? "Italic" : "Regular")) ||
    (await tryLoad("IBM Plex Sans", "Regular")) ||
    (await tryLoad("Inter", "Regular"))
  );
};

const matchStyle = (f, fn) =>
  DS.text.find(
    (s) =>
      s.family === fn.family &&
      s.style === fn.style &&
      Math.abs(s.size - f.s) < 0.3 &&
      !!s.upper === !!f.u
  );

// ---------- local components (widget kit) ----------
const kitPage = D.kitPageId ? await figma.getNodeByIdAsync(D.kitPageId) : null;
let sliderSet = null;
const getSlider = async () => {
  if (sliderSet) return sliderSet;
  if (D.sliderSetId) sliderSet = await figma.getNodeByIdAsync(D.sliderSetId);
  return sliderSet;
};

// ---------- builders ----------
const place = (node, r, parent) => {
  parent.appendChild(node);
  node.x = r[0];
  node.y = r[1];
};

const makeText = async (txt, parentNode, offX, offY, name) => {
  const segs = txt.segs.map(([t, f]) => [
    t,
    typeof f === "number" ? D.fonts[f] : f,
  ]);
  if (!segs.length) return null;
  const t = figma.createText();
  const fn0 = await fontName(segs[0][1]);
  t.fontName = fn0;
  t.characters = segs.map((s) => s[0]).join("");
  let i = 0;
  for (const [s, f] of segs) {
    const fn = await fontName(f);
    const end = i + s.length;
    if (end > i) {
      t.setRangeFontName(i, end, fn);
      t.setRangeFontSize(i, end, f.sup || f.sub ? Math.max(6, f.s) : f.s);
      if (f.c) t.setRangeFills(i, end, [await paint(f.c, "text")]);
      if (f.lh) t.setRangeLineHeight(i, end, { unit: "PIXELS", value: f.lh });
      if (f.ls)
        t.setRangeLetterSpacing(i, end, { unit: "PIXELS", value: f.ls });
      if (f.dec) t.setRangeTextDecoration(i, end, "UNDERLINE");
    }
    i = end;
  }
  const f0 = segs[0][1];
  // single-style text that matches a DS text style: apply the style, keep colour
  if (segs.length === 1) {
    const st = matchStyle(f0, fn0);
    if (st) {
      try {
        const style = await importStyle(st.key);
        await t.setTextStyleIdAsync(style.id);
        if (f0.lh) t.lineHeight = { unit: "PIXELS", value: f0.lh };
      } catch (e) {
        warn.push("style " + st.name);
      }
    }
  }
  t.name = name || t.characters.slice(0, 40);
  const [x, y, w, h] = txt.r;
  parentNode.appendChild(t);
  const lineH = f0.lh || f0.s * 1.3;
  const multi = h > lineH * 1.5 || txt.pre;
  // pre-line / pre-wrap still wrap: if its hard breaks don't explain the height, it wrapped
  const wraps =
    !txt.pre || t.characters.split("\n").length * lineH < h - lineH * 0.5;
  t.textAlignHorizontal =
    f0.al === "center"
      ? "CENTER"
      : f0.al === "right" || f0.al === "end"
        ? "RIGHT"
        : "LEFT";
  if (multi && wraps) {
    t.textAutoResize = "HEIGHT";
    t.resize(Math.max(w + 2, 4), t.height);
  } else {
    t.textAutoResize = "WIDTH_AND_HEIGHT";
  }
  // keep centred/right single lines anchored
  t.x =
    offX +
    x +
    (t.textAlignHorizontal === "CENTER" && !multi
      ? (w - t.width) / 2
      : t.textAlignHorizontal === "RIGHT" && !multi
        ? w - t.width
        : 0);
  t.y = offY + y + (h - t.height) / 2;
  created.push(t.id);
  return t;
};

const applyBox = async (f, n) => {
  const fills = [];
  if (n.grad) {
    const stops = [...n.grad.matchAll(/rgba?\([^)]+\)|#[0-9a-f]{3,6}/gi)].map(
      (m) => m[0]
    );
    const toRGB = (s) => {
      if (s.startsWith("#"))
        return {
          ...hexToRgb(
            s.length === 4 ? "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] : s
          ),
          a: 1,
        };
      const v = s.match(/[\d.]+/g).map(Number);
      return {
        r: v[0] / 255,
        g: v[1] / 255,
        b: v[2] / 255,
        a: v[3] === undefined ? 1 : v[3],
      };
    };
    if (stops.length >= 2) {
      const vertical = /to bottom|180deg/.test(n.grad);
      fills.push({
        type: "GRADIENT_LINEAR",
        gradientTransform: vertical
          ? [
              [0, 1, 0],
              [-1, 0, 1],
            ]
          : [
              [1, 0, 0],
              [0, 1, 0],
            ],
        gradientStops: stops.map((s, k) => ({
          position: k / (stops.length - 1),
          color: toRGB(s),
        })),
      });
    }
  }
  if (n.bg) fills.unshift(await paint(n.bg, "fill"));
  f.fills = fills;
  if (n.bd) {
    const [w, c, dashed] = n.bd;
    f.strokes = [await paint(c, "stroke")];
    f.strokeAlign = "INSIDE";
    if (w.every((v) => v === w[0])) f.strokeWeight = w[0];
    else {
      f.strokeTopWeight = w[0];
      f.strokeRightWeight = w[1];
      f.strokeBottomWeight = w[2];
      f.strokeLeftWeight = w[3];
    }
    if (dashed) f.dashPattern = [4, 4];
  }
  if (n.rad) f.cornerRadius = Math.min(n.rad, Math.min(n.r[2], n.r[3]) / 2);
  if (n.op) f.opacity = n.op;
  f.clipsContent = !!n.clip;
  if (n.sh)
    f.effects = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 2 },
        radius: 8,
        spread: 0,
        visible: true,
        blendMode: "NORMAL",
      },
    ];
};

const textOf = (n) =>
  n.txt
    ? n.txt.segs.map((s) => s[0]).join("")
    : (n.ch || []).map(textOf).join(" ").trim();

// map a DOM node onto a DS component, per the widget's map
const dsInstance = async (n, kind0) => {
  let kind = kind0;
  if (kind === "button" && n.pr) kind = "chip";
  if (kind === "button") {
    const set = await importSet(DS.components.button);
    const t = textOf(n);
    const f0 = n.txt ? n.txt.segs[0][1] : null;
    const sz = f0 === null ? 11 : (typeof f0 === "number" ? D.fonts[f0] : f0).s;
    const size = sz <= 10 ? "sm" : sz >= 13 ? "lg" : "md";
    const dark =
      n.bg &&
      (colOf(n.bg).hex === "#0a0a0a" ||
        colOf(n.bg).hex === "#131417" ||
        colOf(n.bg).hex === "#111111" ||
        colOf(n.bg).hex === "#000000");
    const variant = dark ? "solid" : n.bd ? "outline" : "ghost";
    const comp =
      set.children.find(
        (c) => c.name === `Variant=${variant}, Size=${size}, State=default`
      ) || set.defaultVariant;
    const inst = comp.createInstance();
    const props = inst.componentProperties;
    const tk = Object.keys(props).find((k) => props[k].type === "TEXT");
    if (tk) inst.setProperties({ [tk]: t });
    else {
      const tn = inst.findOne((x) => x.type === "TEXT");
      if (tn) {
        await figma.loadFontAsync(tn.fontName);
        tn.characters = t;
      }
    }
    return inst;
  }
  if (kind === "chip") {
    const set = await importSet(DS.components.chip);
    const comp =
      set.children.find(
        (c) => c.name === `State=${n.on ? "on" : "off"}, Count=false`
      ) || set.defaultVariant;
    const inst = comp.createInstance();
    const props = inst.componentProperties;
    const tk = Object.keys(props).find((k) => props[k].type === "TEXT");
    if (tk) inst.setProperties({ [tk]: textOf(n) });
    else {
      const tn = inst.findOne((x) => x.type === "TEXT");
      if (tn) {
        await figma.loadFontAsync(tn.fontName);
        tn.characters = textOf(n);
      }
    }
    return inst;
  }
  if (kind === "segmented") {
    const set = await importSet(DS.components.segmented);
    const kids = n.ch || [];
    const sel =
      Math.max(
        0,
        kids.findIndex((k) => k.on)
      ) + 1;
    const comp =
      set.children.find((c) => c.name === `Selected=${sel}`) ||
      set.defaultVariant;
    const inst = comp.createInstance();
    const labels = kids.map(textOf);
    const props = inst.componentProperties;
    const tks = Object.keys(props).filter((k) => props[k].type === "TEXT");
    if (tks.length >= labels.length) {
      const o = {};
      labels.forEach((l, k) => (o[tks[k]] = l));
      inst.setProperties(o);
    } else {
      const tns = inst.findAll((x) => x.type === "TEXT");
      for (let k = 0; k < Math.min(tns.length, labels.length); k++) {
        await figma.loadFontAsync(tns[k].fontName);
        tns[k].characters = labels[k];
      }
    }
    return inst;
  }
  return null;
};

const mapKind = (n) => {
  for (const [sel, kind] of Object.entries(D.map || {})) {
    if (n.n === sel || n.n.startsWith(sel + " ")) return kind;
  }
  return null;
};

// try to express children as auto-layout; returns true if applied
const inferAutoLayout = (f, n, kids) => {
  if (kids.length < 2 || !n.ch) return false;
  const rs = kids.map((k) => ({ k, x: k.x, y: k.y, w: k.width, h: k.height }));
  const W = f.width,
    H = f.height;
  for (const axis of n.lay === "H" ? ["H", "V"] : ["V", "H"]) {
    const P = axis === "V" ? "y" : "x",
      S = axis === "V" ? "h" : "w",
      C = axis === "V" ? "x" : "y",
      CS = axis === "V" ? "w" : "h";
    const sorted = [...rs].sort((a, b) => a[P] - b[P]);
    let ok = true;
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const g = sorted[i][P] - (sorted[i - 1][P] + sorted[i - 1][S]);
      if (g < -0.5) {
        ok = false;
        break;
      }
      gaps.push(g);
    }
    if (!ok) continue;
    const between =
      n.jc &&
      n.jc.includes("space-between") &&
      axis === (n.lay === "H" ? "H" : "V");
    const uniform = Math.max(...gaps) - Math.min(...gaps) <= 1.5;
    if (!uniform && !between) continue;
    // cross alignment
    const starts = sorted.map((r) => r[C]);
    const centers = sorted.map((r) => r[C] + r[CS] / 2);
    const ends = sorted.map((r) => r[C] + r[CS]);
    const same = (a) => Math.max(...a) - Math.min(...a) <= 1.5;
    let cross = same(starts)
      ? "MIN"
      : same(centers)
        ? "CENTER"
        : same(ends)
          ? "MAX"
          : null;
    if (!cross) continue;
    const order = sorted.map((r) => r.k);
    // apply
    const first = sorted[0],
      last = sorted[sorted.length - 1];
    const crossStart = Math.min(...starts),
      crossEnd = Math.max(...ends);
    f.layoutMode = axis === "V" ? "VERTICAL" : "HORIZONTAL";
    order.forEach((k, idx) => f.insertChild(idx, k));
    f.primaryAxisSizingMode = "FIXED";
    f.counterAxisSizingMode = "FIXED";
    f.resize(W, H);
    const lead = first[P],
      trail = (axis === "V" ? H : W) - (last[P] + last[S]);
    const cLead = crossStart,
      cTrail = (axis === "V" ? W : H) - crossEnd;
    if (axis === "V") {
      f.paddingTop = Math.max(0, lead);
      f.paddingBottom = Math.max(0, trail);
      f.paddingLeft = cross === "MAX" ? 0 : Math.max(0, cLead);
      f.paddingRight = cross === "MIN" ? 0 : Math.max(0, cTrail);
    } else {
      f.paddingLeft = Math.max(0, lead);
      f.paddingRight = Math.max(0, trail);
      f.paddingTop = cross === "MAX" ? 0 : Math.max(0, cLead);
      f.paddingBottom = cross === "MIN" ? 0 : Math.max(0, cTrail);
    }
    if (cross === "CENTER") {
      if (axis === "V") {
        f.paddingLeft = f.paddingRight = 0;
      } else {
        f.paddingTop = f.paddingBottom = 0;
      }
    }
    if (between && !uniform) f.primaryAxisAlignItems = "SPACE_BETWEEN";
    else {
      f.itemSpacing = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      f.primaryAxisAlignItems = "MIN";
    }
    f.counterAxisAlignItems = cross;
    // children that span the cross axis fill it
    const inner =
      axis === "V"
        ? W - f.paddingLeft - f.paddingRight
        : H - f.paddingTop - f.paddingBottom;
    for (const r of sorted) {
      if (Math.abs(r[CS] - inner) <= 1.5 && r.k.type !== "TEXT") {
        try {
          if (axis === "V") r.k.layoutSizingHorizontal = "FILL";
          else r.k.layoutSizingVertical = "FILL";
        } catch (e) {}
      }
    }
    return true;
  }
  return false;
};

const build = async (n, parent, depth) => {
  const [x, y, w, h] = n.r;
  if (n.k === "svg") {
    let node;
    try {
      node = figma.createNodeFromSvg(n.svg);
    } catch (e) {
      node = figma.createRectangle();
      node.fills = [
        { type: "SOLID", color: { r: 1, g: 0, b: 0 }, opacity: 0.2 },
      ];
      warn.push("svg fail " + n.n);
    }
    node.name = n.n === "svg" ? "figure" : n.n;
    if (node.type === "FRAME") node.fills = [];
    place(node, n.r, parent);
    if (node.width && h) node.resize(Math.max(w, 1), Math.max(h, 1));
    created.push(node.id);
    return node;
  }
  if (n.k === "img") {
    const r = figma.createRectangle();
    r.name = n.n + " (raster)";
    r.resize(Math.max(w, 1), Math.max(h, 1));
    const hash = D.images[n.img];
    r.fills = hash
      ? [
          {
            type: "IMAGE",
            imageHash: hash,
            scaleMode: n.fit === "contain" ? "FIT" : "FILL",
          },
        ]
      : [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
    if (n.rad) r.cornerRadius = n.rad;
    place(r, n.r, parent);
    created.push(r.id);
    return r;
  }
  if (n.k === "range") {
    const set = await getSlider();
    let inst;
    if (set) {
      const comp =
        set.children.find(
          (c) => c.name === `Type=${n.spectrum ? "spectrum" : "default"}`
        ) || set.defaultVariant;
      inst = comp.createInstance();
      inst.resize(Math.max(w, 40), inst.height);
      const row = inst.findOne((c) => c.name === "Handle row");
      const thumb = inst.findOne((c) => c.name === "Thumb");
      if (row && thumb)
        row.paddingLeft = Math.max(
          0,
          Math.round((inst.width - thumb.width) * n.v)
        );
    } else {
      inst = figma.createRectangle();
      inst.resize(w, 4);
    }
    inst.name = n.n;
    parent.appendChild(inst);
    inst.x = x;
    inst.y = y + (h - inst.height) / 2;
    created.push(inst.id);
    return inst;
  }
  const kind = mapKind(n);
  if (kind) {
    try {
      const inst = await dsInstance(n, kind);
      if (inst) {
        inst.name = n.n;
        parent.appendChild(inst);
        inst.x = x;
        inst.y = y + (h - inst.height) / 2;
        if (kind === "segmented") {
          inst.resize(Math.max(w, inst.width), inst.height);
        }
        created.push(inst.id);
        return inst;
      }
    } catch (e) {
      warn.push("ds " + kind + " " + String(e).slice(0, 80));
    }
  }
  const visual =
    n.bg ||
    n.bd ||
    n.grad ||
    n.sh ||
    n.k === "select" ||
    n.k === "input" ||
    n.btn;
  // bare text leaf → text node only
  if (n.txt && !visual && depth > 0) {
    const t = await makeText(n.txt, parent, x, y, null);
    return t;
  }
  const f = figma.createFrame();
  f.name = n.n;
  f.resize(Math.max(w, 1), Math.max(h, 1));
  place(f, n.r, parent);
  await applyBox(f, n);
  created.push(f.id);
  if (n.txt) await makeText(n.txt, f, 0, 0, null);
  if (n.k === "select" || n.k === "input") {
    const ft = n.ft || { f: "IBM Plex Sans", w: 400, s: 14 };
    await makeText(
      { r: [12, 0, w - 36, h], segs: [[n.t, ft]] },
      f,
      0,
      0,
      "value"
    );
    if (n.k === "select") {
      const chev = figma.createNodeFromSvg(
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m6 9 6 6 6-6" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      );
      chev.name = "icon/chevron-down";
      f.appendChild(chev);
      chev.x = w - 24;
      chev.y = (h - 12) / 2;
    }
  }
  const kids = [];
  for (const c of n.ch || []) {
    const node = await build(c, f, depth + 1);
    if (node) kids.push(node);
  }
  // collapse invisible single-child wrappers
  if (
    !visual &&
    kids.length === 1 &&
    depth > 0 &&
    !n.txt &&
    kids[0].type !== "TEXT"
  ) {
    const only = kids[0];
    const ox = f.x + only.x,
      oy = f.y + only.y;
    const idx = parent.children.indexOf(f);
    parent.insertChild(idx, only);
    only.x = ox;
    only.y = oy;
    if (only.name === "figure" || only.name.startsWith("div")) only.name = n.n;
    f.remove();
    return only;
  }
  if (!n.txt && kids.length >= 2) {
    try {
      inferAutoLayout(f, n, kids);
    } catch (e) {
      warn.push("al " + n.n + " " + String(e).slice(0, 60));
    }
  }
  return f;
};

// ---------- go ----------
const page = await figma.getNodeByIdAsync(D.pageId);
await figma.setCurrentPageAsync(page);
const host = D.parentId ? await figma.getNodeByIdAsync(D.parentId) : page;
const root = await build(D.tree, host, 0);
root.name = D.frameName;
if (!D.parentId) {
  root.x = D.x;
  root.y = D.y;
} else if (host.layoutMode && host.layoutMode !== "NONE") {
  /* auto-layout host places it */
}
if (D.chapterMode && DS.chapterCollectionKey) {
  try {
    const anyChapter = await importVar(DS.chapterVarKey);
    const coll = await figma.variables.getVariableCollectionByIdAsync(
      anyChapter.variableCollectionId
    );
    const mode = coll.modes.find((m) => m.name === D.chapterMode);
    if (mode) root.setExplicitVariableModeForCollection(coll, mode.modeId);
  } catch (e) {
    warn.push("mode " + String(e).slice(0, 80));
  }
}
return {
  rootId: root.id,
  count: created.length,
  warn: warn.slice(0, 30),
  w: root.width,
  h: root.height,
};
