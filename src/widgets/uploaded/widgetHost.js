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
 *
 * A widget normally sets its own height and the frame follows it. In the
 * figure pane the box is fixed (OPENBRAIN-148): the host then sends a `fit`
 * message with the height it has, the frame never grows past it, and the
 * bridge gives the widget OB.maxHeight, `--ob-max-height` and
 * `html[data-ob-fit]` so it can size its picture to what is left.
 */

/** Outside origins a widget may load from (SKILL.md says the same). */
export const ALLOWED_SCRIPT_ORIGINS = [
  "https://cdnjs.cloudflare.com",
  "https://cdn.jsdelivr.net",
];
export const ALLOWED_STYLE_ORIGINS = ["https://fonts.googleapis.com"];
export const ALLOWED_FONT_ORIGINS = ["https://fonts.gstatic.com"];
// 4 MB since OPENBRAIN-141 (RetINaBox v3 carries 61 narration clips);
// widget_uploads.html has the same check (20261020230000_widget_uploads_4mb).
export const MAX_WIDGET_BYTES = 4 * 1024 * 1024;

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
  var subs=[],fits=[];
  window.OB={reducedMotion:rm,maxHeight:window.__obFit||null,
    onTheme:function(fn){subs.push(fn);try{fn(window.OB.theme||{reduceMotion:rm})}catch(e){}},
    onFit:function(fn){fits.push(fn);try{fn(window.OB.maxHeight)}catch(e){}},
    resize:function(){report()},theme:null};
  function fit(h){var d=document.documentElement;h=h>0?Math.round(h):null;window.OB.maxHeight=h;
    if(h){d.style.setProperty("--ob-max-height",h+"px");d.setAttribute("data-ob-fit","")}
    else{d.style.removeProperty("--ob-max-height");d.removeAttribute("data-ob-fit")}
    fits.forEach(function(fn){try{fn(h)}catch(err){post({type:"error",message:String(err.message||err)})}});}
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
  window.addEventListener("message",function(e){var m=e.data;if(!m||!m.__ob)return;
    if(m.type==="fit"){fit(m.maxHeight);report();return}
    if(m.type!=="theme")return;
    var s=document.documentElement.style;for(var k in m.tokens)s.setProperty(k,m.tokens[k]);
    if(m.reduceMotion)document.documentElement.setAttribute("data-ob-reduce-motion","");
    else document.documentElement.removeAttribute("data-ob-reduce-motion");
    window.OB.reducedMotion=!!m.reduceMotion||!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);window.OB.theme={accent:m.tokens["--ob-accent"],reduceMotion:window.OB.reducedMotion,ramp:m.ramp};
    subs.forEach(function(fn){try{fn(window.OB.theme)}catch(err){post({type:"error",message:String(err.message||err)})}});report();});
  window.addEventListener("load",function(){
    // Apply the host's first-view preference through the widget's own
    // controller, once. Later fit/theme reports never reopen dismissed info.
    if(window.__obInitialExplanation&&window.tobWidget&&typeof window.tobWidget.setInfo==="function")window.tobWidget.setInfo(true);
    report();
    function ready(){
      if(window.__obWaitForArtwork){
        var a=window.tobWidget&&window.tobWidget.anim;
        if(!a||!a.isLoaded||!document.querySelector('.tob-canvas svg path')){requestAnimationFrame(ready);return;}
        requestAnimationFrame(function(){requestAnimationFrame(function(){post({type:"ready"})})});
      }else post({type:"ready"});
    }
    ready();
    if(window.ResizeObserver){new ResizeObserver(report).observe(document.documentElement)}});
  setInterval(report,1000);
})();`;

// Host presentation lives here so already-published uploads receive the
// same treatment without rewriting their scripts or database content.
// Only controls are squared; scientific circles and slider/radio handles
// keep their authored geometry. The .tob rules adapt the legacy Retina
// template's fixed 700px canvas to the measured host box using flex/grid.
const HOST_STYLE = `
button, [role="button"], input[type="button"], input[type="submit"],
input[type="reset"], select, .tob-seg { border-radius: 0 !important; }
.tob-info-open .tob-info-btn { transform: none !important; }
.tob-info-open .tob-info-btn > svg { transform: rotate(45deg); }
[data-ob-author-credit], .rb-foot { display: none !important; }
html[data-ob-fit] body { margin: 0 !important; padding: 0 !important; }
html[data-ob-fit] .rb { max-width: none; margin: 0; border-radius: 0; min-height: var(--ob-max-height); }
html[data-ob-fit] .rb-tabs { flex-wrap: wrap; }
@media (min-width: 1024px) {
  html[data-ob-fit] .rb-bar { padding-right: 64px; }
}
html[data-ob-fit] .tob { height: var(--ob-max-height); min-height: var(--ob-max-height); }
html[data-ob-fit] .tob-stage { height: 100%; min-height: 0; }
html[data-ob-fit] .tob-body { min-height: 0; }
html[data-ob-fit] .tob-head, html[data-ob-fit] .tob-caption,
html[data-ob-fit] .tob-legend, html[data-ob-fit] .tob-dots { flex-shrink: 0; }
html[data-ob-fit] .tob-view { flex: 1; min-height: 120px; display: flex; }
html[data-ob-fit] .tob-canvas { height: 100% !important; min-height: 120px; flex: 1; }
html[data-ob-fit] .tob-steps { max-height: var(--ob-max-height); overflow-y: auto; }
html[data-ob-fit].tob-choices .tob-stage { align-content: stretch; }
html[data-ob-fit].tob-choices .tob-view { align-self: stretch; }
`;

const escapeAttr = (s) => String(s).replace(/"/g, "&quot;");

/**
 * The document an uploaded widget runs in: the author's HTML with the
 * policy, tokens and bridge first in <head>.
 */
export function buildWidgetDoc(
  html,
  {
    ramp = "fund",
    reduceMotion = false,
    maxHeight = null,
    initialExplanation = false,
    waitForArtwork = false,
  } = {}
) {
  const tokens = widgetTokens(ramp);
  const fit = Number(maxHeight) > 0 ? Math.round(maxHeight) : 0;
  if (fit) tokens["--ob-max-height"] = `${fit}px`;
  const vars = Object.entries(tokens)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const head =
    `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(CSP)}">` +
    `<style>:root{${vars}}html,body{overflow-x:hidden}${HOST_STYLE}</style>` +
    `<script>${fit ? `window.__obFit=${fit};` : ""}${initialExplanation ? "window.__obInitialExplanation=true;" : ""}${waitForArtwork ? "window.__obWaitForArtwork=true;" : ""}${BRIDGE}</scr` +
    `ipt>`;
  let doc = String(html || "");
  const attrs =
    (reduceMotion ? " data-ob-reduce-motion" : "") +
    (fit ? " data-ob-fit" : "");
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
  if (attrs)
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
 * The message the host sends the frame with the height it must fit, or
 * null when it may grow again (an inline band, a breakout).
 */
export function fitMessage(maxHeight) {
  const h = Number(maxHeight);
  return { __ob: 1, type: "fit", maxHeight: h > 0 ? Math.round(h) : null };
}

/** The frame's floor and ceiling, whatever a widget reports. */
export const FRAME_MIN_HEIGHT = 80;
export const FRAME_MAX_HEIGHT = 6000;

/**
 * The height the frame takes for the height a widget reports: never under
 * 80 px or over 6000 px. A measured host supplies its exact height, so
 * old uploads cannot leave a short fixed-height frame inside a viewport.
 * Before the first report a free frame is `minHeight` tall,
 * or, in a pane, the pane's height, so the box doesn't jump when the widget
 * fills it.
 */
export function fitHeight(
  reported,
  { minHeight = 240, maxHeight = null } = {}
) {
  const fixed = Number(maxHeight) > 0;
  const cap = fixed
    ? Math.min(FRAME_MAX_HEIGHT, Math.round(maxHeight))
    : FRAME_MAX_HEIGHT;
  const want = fixed ? cap : Number(reported) > 0 ? reported : minHeight;
  return Math.max(FRAME_MIN_HEIGHT, Math.min(Math.round(want), cap));
}

/**
 * How much to shrink a frame that must fit `maxHeight` but whose widget
 * still reports taller (a file uploaded before the kit had `fit`, or one
 * that ignores it): 1 when it fits, else the ratio, never under 0.5 (a
 * widget twice as tall as the pane is better scrolled than unreadable).
 */
export function fitScale(reported, maxHeight) {
  const max = Number(maxHeight);
  const h = Number(reported);
  if (!(max > 0) || !(h > max)) return 1;
  return Math.max(0.5, Math.round((max / h) * 1000) / 1000);
}

/** The provide/inject key for the height a widget must fit (IllustrationWidget → UploadedWidgetEmbed). */
export const WIDGET_FIT = Symbol("widgetFit");
/** Viewport stages keep full width and allow tall tools to scroll naturally. */
export const WIDGET_SCROLLABLE = Symbol("widgetScrollable");

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
      label: "Under 4 MB",
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
