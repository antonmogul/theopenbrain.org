/*
 * widgetHost — how the book runs an uploaded widget (OPENBRAIN-105).
 *
 * Stuart and Arjun build widgets in Claude as one self-contained .html file
 * (the Open Brain widget skill, public/widget-kit/). The book runs each one
 * in a sandboxed iframe (`sandbox="allow-scripts"`, no same-origin: it
 * cannot touch the reader's session or the page) from a srcdoc built here:
 *
 *   - a Content-Security-Policy that allows only the kit's outside
 *     resources (cdnjs and jsDelivr scripts, Google Fonts) and no network
 *     calls, so a widget cannot phone home;
 *   - the book's tokens as --ob-* variables, in the chapter's colour;
 *   - the bridge: window.OB for the widget, and messages back to the host
 *     with its size, horizontal overflow, errors and blocked requests,
 *     which the Studio's checks and the frame's auto-height read.
 */

/** Outside origins a widget may load from (SKILL.md says the same). */
export const ALLOWED_SCRIPT_ORIGINS = [
  "https://cdnjs.cloudflare.com",
  "https://cdn.jsdelivr.net",
];
export const ALLOWED_STYLE_ORIGINS = ["https://fonts.googleapis.com"];
export const ALLOWED_FONT_ORIGINS = ["https://fonts.gstatic.com"];
export const MAX_WIDGET_BYTES = 2 * 1024 * 1024;

export const CSP = [
  "default-src 'none'",
  `script-src 'unsafe-inline' 'unsafe-eval' blob: ${ALLOWED_SCRIPT_ORIGINS.join(" ")}`,
  `style-src 'unsafe-inline' ${ALLOWED_STYLE_ORIGINS.join(" ")}`,
  `font-src data: ${ALLOWED_FONT_ORIGINS.join(" ")}`,
  "img-src data: blob:",
  "media-src data: blob:",
  "worker-src blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
].join("; ");

/** The subject colours (design.md §2), as hex for widget authors. */
// `on` is the text colour on a fill of `main` (4.5:1 or better): white on
// the violet and blue, the plate's near-black on the light teal, red and
// yellow, where white is unreadable (1.9:1 on the Retina's teal).
export const RAMP_HEX = {
  fund: {
    main: "#8D4CF6",
    deep: "#7615F5",
    soft: "#BF97FC",
    pale: "#DCCDF9",
    on: "#ffffff",
  },
  perc: {
    main: "#39D8BA",
    deep: "#08AFA3",
    soft: "#4BEACC",
    pale: "#9BF9E7",
    on: "#1c1c1c",
  },
  move: {
    main: "#1A72F2",
    deep: "#0E61C4",
    soft: "#5EA7EF",
    pale: "#9AC0EF",
    on: "#ffffff",
  },
  lear: {
    main: "#FF3351",
    deep: "#C1062A",
    soft: "#FC708A",
    pale: "#FFC7D2",
    on: "#1c1c1c",
  },
  deve: {
    main: "#F2BB40",
    deep: "#C98F1B",
    soft: "#FFD788",
    pale: "#FFE6BB",
    on: "#1c1c1c",
  },
};

/** The --ob-* tokens for a subject ramp (design.md). */
export function widgetTokens(ramp) {
  const r = RAMP_HEX[ramp] || RAMP_HEX.fund;
  return {
    "--ob-accent": r.main,
    "--ob-accent-deep": r.deep,
    "--ob-accent-soft": r.soft,
    "--ob-accent-pale": r.pale,
    "--ob-on-accent": r.on,
    "--ob-series-2": "#FBEB00",
    "--ob-series-3": "#F200FF",
    "--ob-plate": "#1c1c1c",
    "--ob-plate-2": "#2a2a2a",
    "--ob-on-plate": "#ffffff",
    "--ob-on-plate-mute": "rgba(255,255,255,.62)",
    "--ob-line-plate": "rgba(255,255,255,.18)",
    "--ob-paper": "#ffffff",
    "--ob-bg": "#f7f5f0",
    "--ob-ink": "#0a0a0a",
    "--ob-mute": "#6b6b66",
    "--ob-line": "#e5e5e0",
    "--ob-font-sans": '"IBM Plex Sans", system-ui, sans-serif',
    "--ob-font-mono": '"IBM Plex Mono", ui-monospace, monospace',
    "--ob-radius": "0",
  };
}

// Runs inside the frame before the widget's own scripts. Kept small and
// dependency-free; it only talks to its parent.
const BRIDGE = `(function(){
  var post=function(m){try{m.__ob=1;parent.postMessage(m,"*")}catch(e){}};
  var rm=document.documentElement.hasAttribute("data-ob-reduce-motion")||!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
  var subs=[];
  window.OB={reducedMotion:rm,
    onTheme:function(fn){subs.push(fn);try{fn(window.OB.theme||{reduceMotion:rm})}catch(e){}},
    resize:function(){report()},theme:null};
  var last="";
  function report(){var d=document.documentElement,b=document.body;
    var h=Math.ceil(Math.max(d.scrollHeight,b?b.scrollHeight:0));
    var w=Math.ceil(d.scrollWidth),v=d.clientWidth;
    var k=h+"x"+w+"x"+v;if(k===last)return;last=k;
    post({type:"size",height:h,scrollWidth:w,viewport:v});}
  window.addEventListener("error",function(e){post({type:"error",message:String(e.message||e)})});
  window.addEventListener("unhandledrejection",function(e){post({type:"error",message:String(e.reason&&e.reason.message||e.reason)})});
  var ce=console.error;console.error=function(){post({type:"error",message:[].slice.call(arguments).join(" ").slice(0,300)});return ce.apply(console,arguments)};
  document.addEventListener("securitypolicyviolation",function(e){post({type:"blocked",url:e.blockedURI,directive:e.violatedDirective})});
  window.addEventListener("message",function(e){var m=e.data;if(!m||!m.__ob||m.type!=="theme")return;
    var s=document.documentElement.style;for(var k in m.tokens)s.setProperty(k,m.tokens[k]);
    if(m.reduceMotion)document.documentElement.setAttribute("data-ob-reduce-motion","");
    else document.documentElement.removeAttribute("data-ob-reduce-motion");
    window.OB.reducedMotion=!!m.reduceMotion||!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);window.OB.theme={accent:m.tokens["--ob-accent"],reduceMotion:window.OB.reducedMotion,ramp:m.ramp};
    subs.forEach(function(fn){try{fn(window.OB.theme)}catch(err){post({type:"error",message:String(err.message||err)})}});report();});
  window.addEventListener("load",function(){report();post({type:"ready"});
    if(window.ResizeObserver){new ResizeObserver(report).observe(document.documentElement)}});
  setInterval(report,1000);
})();`;

const escapeAttr = (s) => String(s).replace(/"/g, "&quot;");

/**
 * The document an uploaded widget runs in: the author's HTML with the
 * policy, tokens and bridge first in <head>.
 */
export function buildWidgetDoc(
  html,
  { ramp = "fund", reduceMotion = false } = {}
) {
  const tokens = widgetTokens(ramp);
  const vars = Object.entries(tokens)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const head =
    `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(CSP)}">` +
    `<style>:root{${vars}}html,body{overflow-x:hidden}</style>` +
    `<script>${BRIDGE}</scr` +
    `ipt>`;
  let doc = String(html || "");
  const attrs = reduceMotion ? " data-ob-reduce-motion" : "";
  if (/<head[^>]*>/i.test(doc)) {
    doc = doc.replace(/<head([^>]*)>/i, (m, a) => `<head${a}>${head}`);
  } else if (/<html[^>]*>/i.test(doc)) {
    doc = doc.replace(
      /<html([^>]*)>/i,
      (m, a) => `<html${a}><head>${head}</head>`
    );
  } else {
    doc = `<!doctype html><html><head>${head}</head><body>${doc}</body></html>`;
  }
  if (reduceMotion)
    doc = doc.replace(/<html([^>]*)>/i, (m, a) => `<html${a}${attrs}>`);
  return doc;
}

/** The message the host sends the frame with the theme. */
export function themeMessage(ramp, reduceMotion) {
  return {
    __ob: 1,
    type: "theme",
    tokens: widgetTokens(ramp),
    ramp,
    reduceMotion: !!reduceMotion,
  };
}

/**
 * Checks we can make from the file alone (the Studio adds the ones that
 * need it running: errors, fit at 390 px, blocked requests).
 * @returns {Array<{id, label, ok, detail}>}
 */
export function staticChecks(html, bytes = new Blob([html || ""]).size) {
  const src = String(html || "");
  const outside = [
    ...src.matchAll(
      /<(?:script|link|img|iframe|source|video|audio)\b[^>]*?(?:src|href)\s*=\s*["'](https?:)?\/\/([^"'/]+)[^"']*["']/gi
    ),
  ]
    .map((m) => m[2].toLowerCase())
    .filter((h) => h);
  const allowedHosts = [
    ...ALLOWED_SCRIPT_ORIGINS,
    ...ALLOWED_STYLE_ORIGINS,
    ...ALLOWED_FONT_ORIGINS,
  ].map((o) => new URL(o).host);
  const bad = [...new Set(outside.filter((h) => !allowedHosts.includes(h)))];
  const title = /<title>\s*([^<]+?)\s*<\/title>/i.exec(src)?.[1] || "";
  return [
    {
      id: "size",
      label: "Under 2 MB",
      ok: bytes <= MAX_WIDGET_BYTES,
      detail: `${(bytes / 1024).toFixed(0)} KB`,
    },
    {
      id: "outside",
      label: "Only the kit's outside resources",
      ok: bad.length === 0,
      detail: bad.length
        ? `Loads from ${bad.join(", ")}`
        : "cdnjs, jsDelivr, Google Fonts only",
    },
    {
      id: "network",
      label: "No network calls",
      ok: !/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(
        src.replace(/new\s+XMLHttpRequest/g, "XMLHttpRequest(")
      ),
      detail: "fetch, XHR and sockets are blocked in the book",
    },
    {
      id: "tokens",
      label: "Uses the book's tokens",
      ok: /var\(\s*--ob-/.test(src),
      detail: "var(--ob-accent) and friends (design.md)",
    },
    {
      id: "motion",
      label: "Handles reduced motion",
      ok: /prefers-reduced-motion|data-ob-reduce-motion|OB\.reducedMotion/.test(
        src
      ),
      detail: "prefers-reduced-motion or data-ob-reduce-motion",
    },
    {
      id: "title",
      label: "Has a title",
      ok: !!title,
      detail: title || "Add a <title>",
    },
  ];
}

/** A slug for a widget title: "ON-centre field" → "on-centre-field". */
export function widgetSlug(title) {
  return (
    String(title || "widget")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "widget"
  );
}
