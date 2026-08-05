// chapterDebug.js — gated, structured logging for the Chapter-1 animation/trigger
// pipeline. OFF by default. Turn ON in the browser console with:
//
//   localStorage.setItem('ob.debug.triggers', '1'); location.reload();
//   // or add ?debug=triggers to the URL
//
// Turn OFF: localStorage.removeItem('ob.debug.triggers'); location.reload();
//
// The pipeline it traces (stages, in order):
//   [1 DATA]  useAnimations.fetchAnimations — DB rows → states/statesHighlight/switches
//   [2 TREE]  useChapter transform — paragraphs → nested tree + transition flags
//   [3 SCROLL] IllustrationsComp — GSAP ScrollTrigger fires → activeAnimation
//   [4 MOUNT]  which renderer mounts per figure (Inline / FullScreen / Switch / placeholder)
//   [5 STATE]  state stepping / highlight sync / switch toggles (the seeded interactivity)

function enabled() {
  try {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem("ob.debug.triggers") === "1") return true;
    return new URLSearchParams(window.location.search).has("debug");
  } catch {
    return false;
  }
}

// Per-stage colour so the console is scannable at a glance.
const STYLE = {
  DATA: "background:#1d4ed8;color:#fff;padding:1px 5px;border-radius:3px",
  TREE: "background:#7c3aed;color:#fff;padding:1px 5px;border-radius:3px",
  SCROLL: "background:#059669;color:#fff;padding:1px 5px;border-radius:3px",
  MOUNT: "background:#d97706;color:#fff;padding:1px 5px;border-radius:3px",
  STATE: "background:#db2777;color:#fff;padding:1px 5px;border-radius:3px",
};
const ICON = { DATA: "📥", TREE: "🌳", SCROLL: "🎬", MOUNT: "🧩", STATE: "🎚️" };

/**
 * Log one event in the Chapter-1 pipeline.
 * @param {'DATA'|'TREE'|'SCROLL'|'MOUNT'|'STATE'} stage
 * @param {string} msg   short human message
 * @param {object} [data] optional structured payload (logged expandable)
 */
export function clog(stage, msg, data) {
  if (!enabled()) return;
  const style = STYLE[stage] || "";
  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.log(
      `%c${ICON[stage] || ""} ${stage}%c ${msg}`,
      style,
      "color:inherit",
      data
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `%c${ICON[stage] || ""} ${stage}%c ${msg}`,
      style,
      "color:inherit"
    );
  }
}

/** Collapsed group — use for a batch (e.g. the full animation list on load). */
export function cgroup(stage, title, fn) {
  if (!enabled()) return fn && fn();
  const style = STYLE[stage] || "";
  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `%c${ICON[stage] || ""} ${stage}%c ${title}`,
    style,
    "color:inherit"
  );
  try {
    fn && fn();
  } finally {
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
}

/** One-time banner so you know logging is live and how to turn it off. */
let announced = false;
export function announce() {
  if (!enabled() || announced) return;
  announced = true;
  // eslint-disable-next-line no-console
  console.log(
    "%c🧠 Chapter-1 trigger debug ON%c — stages: 📥DATA 🌳TREE 🎬SCROLL 🧩MOUNT 🎚️STATE. " +
      "Disable: localStorage.removeItem('ob.debug.triggers'); reload.",
    "background:#111;color:#0f0;padding:2px 6px;border-radius:3px",
    "color:#888"
  );
}

export function debugEnabled() {
  return enabled();
}
