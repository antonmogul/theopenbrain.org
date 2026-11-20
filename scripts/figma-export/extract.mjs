// Walk a rendered widget and write a compact layout tree for the Figma builder.
// usage: node extract.mjs <route> <rootSelector> <outDir> <name> [width] [stateScript.js]
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [, , route, rootSel, outDir, name, width = "1280", stateFile] =
  process.argv;
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: +width, height: 900 },
  deviceScaleFactor: 2,
});
await p.goto((process.env.BASE ?? "http://localhost:5191") + route, {
  waitUntil: "networkidle",
});
if (process.env.CHAPTER)
  await p.evaluate(
    (c) => document.documentElement.setAttribute("data-chapter", c),
    process.env.CHAPTER
  );
await p.waitForTimeout(2500);
if (process.env.WAIT_SEL)
  await p.waitForSelector(process.env.WAIT_SEL, { timeout: 90000 });
if (process.env.WAIT_SEL) await p.waitForTimeout(1500);
if (stateFile) {
  const js = readFileSync(stateFile, "utf8");
  await p.evaluate(js);
  await p.waitForTimeout(+(process.env.SETTLE || 1500));
}

if (process.env.SHOT)
  await p
    .locator(rootSel)
    .first()
    .screenshot({ path: path.join(outDir, name + ".shot.png"), scale: "css" })
    .catch((e) => console.error("shot", String(e).slice(0, 80)));
const result = await p.evaluate(async (rootSel) => {
  const root = document.querySelector(rootSel);
  const R0 = root.getBoundingClientRect();
  const sx = window.scrollX,
    sy = window.scrollY;
  const images = [];
  let uid = 0;
  const INLINE = new Set([
    "SPAN",
    "SUP",
    "SUB",
    "EM",
    "STRONG",
    "B",
    "I",
    "A",
    "CODE",
    "SMALL",
    "ABBR",
    "CITE",
    "Q",
    "BR",
    "MARK",
    "U",
    "S",
  ]);
  const rgb = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, bl, a = 1] = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    if (+a === 0) return null;
    const h =
      "#" +
      [r, g, bl]
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("");
    return +a < 1 ? [h, +(+a).toFixed(3)] : h;
  };
  const rect = (el, par) => {
    const r = el.getBoundingClientRect();
    return [
      Math.round(r.left - par.left),
      Math.round(r.top - par.top),
      Math.round(r.width),
      Math.round(r.height),
    ];
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      +cs.opacity === 0
    )
      return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const font = (cs) => {
    const fam = cs.fontFamily.toLowerCase().includes("mono")
      ? "IBM Plex Mono"
      : cs.fontFamily.toLowerCase().includes("serif") &&
          !cs.fontFamily.toLowerCase().includes("sans")
        ? "IBM Plex Serif"
        : "IBM Plex Sans";
    return {
      f: fam,
      w: +cs.fontWeight,
      s: +parseFloat(cs.fontSize).toFixed(2),
      i: cs.fontStyle === "italic" ? 1 : 0,
      c: rgb(cs.color),
      lh:
        cs.lineHeight === "normal" ? 0 : +parseFloat(cs.lineHeight).toFixed(2),
      ls:
        cs.letterSpacing === "normal"
          ? 0
          : +parseFloat(cs.letterSpacing).toFixed(2),
      u: cs.textTransform === "uppercase" ? 1 : 0,
      al: cs.textAlign,
      dec: cs.textDecorationLine === "underline" ? 1 : 0,
    };
  };
  const isTextLeaf = (el) => {
    let hasText = false;
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
      if (n.nodeType === 1 && !INLINE.has(n.tagName)) return false;
      if (n.nodeType === 1 && INLINE.has(n.tagName)) {
        const cs = getComputedStyle(n);
        if (cs.display !== "inline" && n.tagName !== "BR") return false;
        if (n.querySelector("svg,canvas,img,input,select,button")) return false;
        if (n.textContent.trim()) hasText = true;
      }
    }
    return hasText;
  };
  const segments = (el) => {
    const segs = [];
    const walk = (node, cs) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) segs.push([n.textContent, font(cs)]);
        else if (n.tagName === "BR") segs.push(["\n", font(cs)]);
        else if (n.nodeType === 1) {
          const c2 = getComputedStyle(n);
          if (c2.display === "none") continue;
          const f = font(c2);
          if (n.tagName === "SUP") f.sup = 1;
          if (n.tagName === "SUB") f.sub = 1;
          walk(n, c2);
          // tag sup/sub on the last pushed seg(s) of this node
          if (f.sup || f.sub)
            for (let k = segs.length - 1; k >= 0 && segs[k][2] !== "x"; k--) {
              segs[k][1].sup = f.sup;
              segs[k][1].sub = f.sub;
              break;
            }
        }
      }
    };
    walk(el, getComputedStyle(el));
    // collapse whitespace like the browser does (pre keeps it)
    const pre = getComputedStyle(el).whiteSpace.startsWith("pre");
    let out = [];
    for (const [t, f] of segs) {
      let s = pre ? t : t.replace(/\s+/g, " ");
      if (f.u) s = s.toUpperCase();
      const last = out[out.length - 1];
      if (last && JSON.stringify(last[1]) === JSON.stringify(f)) last[0] += s;
      else out.push([s, f]);
    }
    if (!pre && out.length) {
      out[0][0] = out[0][0].replace(/^\s+/, "");
      out[out.length - 1][0] = out[out.length - 1][0].replace(/\s+$/, "");
    }
    out = out.filter((s) => s[0].length);
    return out;
  };
  const textRect = (el, par) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return [
      Math.round(r.left - par.left),
      Math.round(r.top - par.top),
      Math.ceil(r.width) + 1,
      Math.ceil(r.height),
    ];
  };
  const SVG_PROPS = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-dasharray",
    "stroke-linecap",
    "stroke-linejoin",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
    "letter-spacing",
  ];
  const svgMarkup = (svg) => {
    const clone = svg.cloneNode(true);
    const src = svg.querySelectorAll("*"),
      dst = clone.querySelectorAll("*");
    src.forEach((s, k) => {
      const cs = getComputedStyle(s);
      if (cs.display === "none") {
        dst[k].remove();
        return;
      }
      const pcs = s.parentElement ? getComputedStyle(s.parentElement) : null;
      SVG_PROPS.forEach((pName) => {
        let v = cs.getPropertyValue(pName);
        if (
          !v ||
          v === "normal" ||
          (v === "none" && pName === "stroke-dasharray")
        )
          return;
        if (pcs && pcs.getPropertyValue(pName) === v && s.parentElement !== svg)
          return;
        if ((pName === "opacity" || pName.endsWith("-opacity")) && v === "1")
          return;
        if (pName === "font-family")
          v = v.toLowerCase().includes("mono")
            ? "IBM Plex Mono"
            : "IBM Plex Sans";
        dst[k].setAttribute(pName, v);
      });
      dst[k].removeAttribute("class");
      dst[k].removeAttribute("style");
    });
    // <use href="#x"> pointing outside this svg (shared sprite defs): inline the target
    clone.querySelectorAll("use").forEach((u) => {
      const id = (
        u.getAttribute("href") ||
        u.getAttribute("xlink:href") ||
        ""
      ).replace(/^#/, "");
      const tgt = id && document.getElementById(id);
      if (!tgt || svg.contains(tgt)) return;
      const ucs = getComputedStyle(
        svg.querySelector(`use[href="#${id}"],use[*|href="#${id}"]`) || svg
      );
      const col = ucs.color;
      const copy = tgt.cloneNode(true);
      const tsrc = [tgt, ...tgt.querySelectorAll("*")],
        tdst = [copy, ...copy.querySelectorAll("*")];
      tsrc.forEach((s, k) => {
        const scs = getComputedStyle(s);
        SVG_PROPS.forEach((pName) => {
          const v = scs.getPropertyValue(pName);
          if (
            !v ||
            v === "normal" ||
            (v === "none" && pName === "stroke-dasharray")
          )
            return;
          if ((pName === "opacity" || pName.endsWith("-opacity")) && v === "1")
            return;
          if (pName === "font-family") return;
          if (
            !s.getAttribute(pName) &&
            !(s.getAttribute("class") || s.getAttribute("style"))
          )
            return;
          tdst[k].setAttribute(pName, v);
        });
        tdst[k].removeAttribute("class");
        tdst[k].removeAttribute("style");
        tdst[k].removeAttribute("id");
      });
      let rep;
      if (tgt.tagName.toLowerCase() === "symbol") {
        rep = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        ["viewBox", "preserveAspectRatio"].forEach(
          (a) => tgt.hasAttribute(a) && rep.setAttribute(a, tgt.getAttribute(a))
        );
        ["x", "y"].forEach((a) =>
          rep.setAttribute(a, u.getAttribute(a) || "0")
        );
        const vb =
          svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width
            ? svg.viewBox.baseVal
            : { width: svg.clientWidth, height: svg.clientHeight };
        rep.setAttribute("width", u.getAttribute("width") || vb.width);
        rep.setAttribute("height", u.getAttribute("height") || vb.height);
        SVG_PROPS.forEach(
          (a) =>
            copy.hasAttribute(a) && rep.setAttribute(a, copy.getAttribute(a))
        );
        [...copy.childNodes].forEach((c) => rep.appendChild(c));
      } else {
        rep = document.createElementNS("http://www.w3.org/2000/svg", "g");
        rep.setAttribute(
          "transform",
          `translate(${u.getAttribute("x") || 0} ${u.getAttribute("y") || 0})`
        );
        rep.appendChild(copy);
      }
      ["fill", "stroke", "stroke-width", "opacity"].forEach(
        (a) =>
          u.hasAttribute(a) &&
          !rep.hasAttribute(a) &&
          rep.setAttribute(a, u.getAttribute(a))
      );
      rep.innerHTML = rep.innerHTML.replace(/currentColor/g, col);
      u.replaceWith(rep);
    });
    const r = svg.getBoundingClientRect();
    // An ancestor's CSS scale() shrinks the on-screen rect but not the user space; without a
    // viewBox the paths would be drawn unscaled. Pin the layout size as the viewBox.
    if (
      !svg.hasAttribute("viewBox") &&
      svg.clientWidth &&
      Math.abs(svg.clientWidth - r.width) > 1
    )
      clone.setAttribute(
        "viewBox",
        `0 0 ${svg.clientWidth} ${svg.clientHeight}`
      );
    clone.setAttribute("width", Math.round(r.width));
    clone.setAttribute("height", Math.round(r.height));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const cs = getComputedStyle(svg);
    // inherited paint goes on a wrapper <g>: on the root <svg> Figma reads it as the frame's own fill
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    ["fill", "stroke"].forEach((pn) => {
      const v = cs.getPropertyValue(pn);
      if (v) g.setAttribute(pn, v);
    });
    // a CSS transform on the <svg> (rotated/flipped icons) applies about its centre
    const mt = cs.transform && cs.transform.match(/^matrix\(([^)]+)\)/);
    if (mt) {
      const [a, b, c, d] = mt[1].split(",").map(Number);
      const vb =
        clone.viewBox && clone.viewBox.baseVal && clone.viewBox.baseVal.width
          ? clone.viewBox.baseVal
          : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };
      const cx = vb.x + vb.width / 2,
        cy = vb.y + vb.height / 2;
      g.setAttribute(
        "transform",
        `translate(${cx} ${cy}) matrix(${a} ${b} ${c} ${d} 0 0) translate(${-cx} ${-cy})`
      );
    }
    while (clone.firstChild) g.appendChild(clone.firstChild);
    clone.appendChild(g);
    ["fill", "stroke", "color"].forEach((pn) => clone.removeAttribute(pn));
    clone.removeAttribute("class");
    clone.removeAttribute("style");
    return clone.outerHTML.replace(/currentColor/g, cs.color);
  };
  const box = (el, cs) => {
    const o = {};
    const bg = rgb(cs.backgroundColor);
    if (bg) o.bg = bg;
    if (cs.backgroundImage && cs.backgroundImage.includes("gradient"))
      o.grad = cs.backgroundImage;
    const bw = ["Top", "Right", "Bottom", "Left"].map(
      (s) =>
        parseFloat(cs["border" + s + "Width"]) *
        (cs["border" + s + "Style"] === "none" ? 0 : 1)
    );
    if (bw.some((w) => w > 0)) {
      const sides = ["Top", "Right", "Bottom", "Left"].map((s, k) =>
        bw[k] > 0 ? rgb(cs["border" + s + "Color"]) : null
      );
      const col = sides.find(Boolean);
      if (col)
        o.bd = [
          bw,
          col,
          cs.borderTopStyle === "dashed" || cs.borderBottomStyle === "dashed"
            ? 1
            : 0,
        ];
    }
    const rad = parseFloat(cs.borderTopLeftRadius);
    if (rad) o.rad = Math.min(rad, 999);
    if (cs.boxShadow && cs.boxShadow !== "none") o.sh = 1;
    if (+cs.opacity < 1) o.op = +cs.opacity;
    if (
      /hidden|auto|scroll|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)
    )
      o.clip = 1;
    return o;
  };
  const nameOf = (el) => {
    const cls = (typeof el.className === "string" ? el.className : "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0];
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };

  const walk = (el, parR) => {
    if (!visible(el)) return null;
    const cs = getComputedStyle(el);
    const R = el.getBoundingClientRect();
    const tag = el.tagName;
    const n = { u: ++uid, n: nameOf(el), r: rect(el, parR) };
    if (
      tag === "svg" &&
      (el.querySelector("image") || el.querySelectorAll("*").length > 4000)
    ) {
      const id = "img" + images.length;
      el.setAttribute("data-fg-shot", id);
      images.push({
        id,
        sel: el,
        shot: 1,
        r: [R.left + sx, R.top + sy, R.width, R.height],
      });
      return { ...n, k: "img", img: id, ...box(el, cs) };
    }
    if (tag === "svg") return { ...n, k: "svg", svg: svgMarkup(el) };
    if (tag === "CANVAS" || tag === "IMG" || tag === "VIDEO") {
      const id = "img" + images.length;
      images.push({
        id,
        sel: el,
        r: [R.left + sx, R.top + sy, R.width, R.height],
      });
      return { ...n, k: "img", img: id, ...box(el, cs), fit: cs.objectFit };
    }
    if (tag === "INPUT" && el.type === "range") {
      const v = (+el.value - +el.min) / (+el.max - +el.min || 1);
      return {
        ...n,
        k: "range",
        v: +v.toFixed(4),
        spectrum: el.className.includes("spectrum") ? 1 : 0,
        accent: rgb(cs.accentColor),
      };
    }
    if (tag === "SELECT") {
      const t = el.options[el.selectedIndex]?.text || "";
      return { ...n, k: "select", t, ft: font(cs), ...box(el, cs) };
    }
    if ((tag === "INPUT" || tag === "TEXTAREA") && !rgb(cs.color)) return null;
    if (tag === "INPUT" && (el.type === "radio" || el.type === "checkbox")) {
      // native control: draw it as markup, never its value text
      const on = el.checked,
        sz = Math.max(10, Math.round(Math.min(R.width, R.height)));
      const acc =
        cs.accentColor && cs.accentColor !== "auto"
          ? cs.accentColor
          : "#1f6fd1";
      const svg =
        el.type === "radio"
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#fff" stroke="${on ? acc : "#767676"}" stroke-width="1.2"/>${on ? `<circle cx="8" cy="8" r="4" fill="${acc}"/>` : ""}</svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2.5" fill="${on ? acc : "#fff"}" stroke="${on ? acc : "#767676"}" stroke-width="1.2"/>${on ? '<path d="M4 8.2l2.6 2.6L12 5.4" fill="none" stroke="#fff" stroke-width="1.8"/>' : ""}</svg>`;
      return { ...n, k: "svg", svg, on: on ? 1 : undefined };
    }
    if (tag === "INPUT" || tag === "TEXTAREA") {
      return {
        ...n,
        k: "input",
        t: el.value || el.placeholder || "",
        ph: !el.value,
        ft: font(cs),
        ...box(el, cs),
      };
    }
    const o = { ...n, k: "box", ...box(el, cs) };
    if (tag === "BUTTON") o.btn = 1;
    if (el.hasAttribute("aria-pressed")) o.pr = 1;
    if (
      el.getAttribute("aria-pressed") === "true" ||
      el.getAttribute("aria-selected") === "true" ||
      /(--on|active|is-on|selected)\b/.test(el.className)
    )
      o.on = 1;
    if (isTextLeaf(el)) {
      const pad = ["Top", "Right", "Bottom", "Left"].map((s) =>
        parseFloat(cs["padding" + s])
      );
      o.txt = {
        r: textRect(el, R),
        segs: segments(el),
        pre: cs.whiteSpace.startsWith("pre") ? 1 : 0,
      };
      if (o.txt.pre) {
        // keep only the lines a scrolling ancestor actually shows
        let sc = el.parentElement;
        while (sc && !/auto|scroll|hidden/.test(getComputedStyle(sc).overflowY))
          sc = sc.parentElement;
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
        const vis = sc ? Math.min(sc.clientHeight, R.height) : R.height;
        let maxLines = Math.ceil(vis / lh) + 1,
          kept = [],
          lines = 0;
        for (const [t, f] of o.txt.segs) {
          if (lines >= maxLines) break;
          const parts = t.split("\n");
          let acc = "";
          for (let k = 0; k < parts.length; k++) {
            if (k > 0) {
              lines++;
              if (lines >= maxLines) break;
              acc += "\n";
            }
            acc += parts[k];
          }
          kept.push([acc, f]);
        }
        o.txt.segs = kept;
        o.txt.r[3] = Math.min(o.txt.r[3], Math.ceil(maxLines * lh));
      }
      o.pad = pad;
      return o;
    }
    // pseudo-element dots etc. are ignored; children:
    const kids = [];
    for (const n2 of el.childNodes) {
      if (n2.nodeType === 3 && n2.textContent.trim()) {
        // stray text beside block children: wrap via range
        const range = document.createRange();
        range.selectNodeContents(n2);
        const rr = range.getBoundingClientRect();
        if (rr.width > 0)
          kids.push({
            u: ++uid,
            n: "text",
            k: "box",
            r: [
              Math.round(rr.left - R.left),
              Math.round(rr.top - R.top),
              Math.ceil(rr.width) + 1,
              Math.ceil(rr.height),
            ],
            txt: {
              r: [0, 0, Math.ceil(rr.width) + 1, Math.ceil(rr.height)],
              segs: [[n2.textContent.replace(/\s+/g, " ").trim(), font(cs)]],
            },
          });
      } else if (n2.nodeType === 1) {
        if (getComputedStyle(n2).display === "contents") {
          // no box of its own: lift its children into this parent
          for (const g of n2.children) {
            const c = walk(g, R);
            if (c) kids.push(c);
          }
          continue;
        }
        const c = walk(n2, R);
        if (c) kids.push(c);
      }
    }
    if (kids.length) o.ch = kids;
    o.lay = cs.display.includes("flex")
      ? cs.flexDirection.startsWith("column")
        ? "V"
        : "H"
      : cs.display.includes("grid")
        ? "G"
        : "B";
    if (o.lay !== "B")
      o.gap = [parseFloat(cs.rowGap) || 0, parseFloat(cs.columnGap) || 0];
    o.pad = ["Top", "Right", "Bottom", "Left"].map((s) =>
      parseFloat(cs["padding" + s])
    );
    o.ai = cs.alignItems;
    o.jc = cs.justifyContent;
    return o;
  };
  const tree = walk(root, { left: R0.left, top: R0.top });
  tree.r = [0, 0, Math.round(R0.width), Math.round(R0.height)];
  // a root with no background of its own sits on its page's: take the nearest painted ancestor's
  if (!tree.bg) {
    let a = root.parentElement;
    while (a && !rgb(getComputedStyle(a).backgroundColor)) a = a.parentElement;
    if (a) tree.bg = rgb(getComputedStyle(a).backgroundColor);
  }
  const out = [];
  for (const im of images) {
    let data = null;
    if (im.shot) {
      out.push({ id: im.id, shot: 1 });
      continue;
    }
    try {
      if (im.sel.tagName === "CANVAS") data = im.sel.toDataURL("image/png");
      else if (im.sel.tagName === "IMG") {
        const blob = await (
          await fetch(im.sel.currentSrc || im.sel.src)
        ).blob();
        data = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.readAsDataURL(blob);
        });
      }
    } catch (e) {
      data = null;
    }
    out.push({ id: im.id, data });
  }
  return { tree, images: out };
}, rootSel);

for (const im of result.images) {
  if (im.shot) {
    im.file = `${name}-${im.id}.png`;
    await p
      .addStyleTag({
        content: `*{visibility:hidden!important} [data-fg-shot="${im.id}"],[data-fg-shot="${im.id}"] *{visibility:visible!important}`,
      })
      .then(async (h) => {
        await p.locator(`[data-fg-shot="${im.id}"]`).screenshot({
          path: path.join(outDir, im.file),
          omitBackground: true,
        });
        await h.evaluate((n) => n.remove());
      });
    delete im.shot;
    continue;
  }
  if (!im.data) {
    console.error("no data", im.id);
    continue;
  }
  const [meta, b64] = im.data.split(",");
  const ext = meta.includes("svg")
    ? "svg"
    : meta.includes("webp")
      ? "webp"
      : meta.includes("jpeg")
        ? "jpg"
        : "png";
  im.file = `${name}-${im.id}.${ext}`;
  writeFileSync(path.join(outDir, im.file), Buffer.from(b64, "base64"));
  delete im.data;
}
writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(result));
console.log(
  name,
  JSON.stringify(result).length,
  "bytes,",
  result.images.length,
  "images"
);
await b.close();
