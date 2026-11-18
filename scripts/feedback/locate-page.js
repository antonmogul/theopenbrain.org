/*
 * The page half of scripts/feedback/locate.mjs (OPENBRAIN-204), bundled by
 * esbuild into one script and added to the chapter page. It finds the
 * element an anchor names with the same helper the review widget built
 * the anchor with (src/helper/reviewAnchor.mjs), brings it on screen the
 * way the reader's own jumps do (railLandingY / revealInRail for a box's
 * track), outlines it and its point, and checks the place by pointing at
 * it again: the anchor that point gives must name the same thing.
 */
import {
  anchorFor,
  findAnchorElement,
  pageState,
  paneTriggerFor,
  sameAnchor,
  targetAt,
} from "../../src/helper/reviewAnchor.mjs";
import { railLandingY, revealInRail } from "../../src/helper/exploreRail.js";

const INSET = 80; // the top bar and a little room, as readerJump lands
const UI = "data-locate-ui";

const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
const scrollTop = (y) =>
  window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: "instant" });
const paneKey = () =>
  (
    document.querySelector(".figure-pane")?.getAttribute("data-figure-key") ||
    ""
  ).toLowerCase();

function find(anchor) {
  return findAnchorElement(anchor, document);
}

/** Scroll positions to try for a pane figure: down its trigger from where
 *  it starts (its top at the reading line). */
function paneStops(anchor) {
  const trigger = paneTriggerFor(anchor, document);
  if (!trigger) return [];
  const h = window.innerHeight;
  const start = docTop(trigger) - h / 2 + 40;
  const end = docTop(trigger) + trigger.offsetHeight - h / 2;
  const stops = [start];
  for (let y = start + 150; y < end; y += 150) stops.push(y);
  // A figure that waits for a box above to clear (figureStart) shows later.
  for (let y = start - 150; y > start - h; y -= 150) stops.push(y);
  return stops;
}

/**
 * Bring the anchor's element on screen. Returns { found, how, stops? }:
 * for the figure pane, the scroll positions to try until it shows the
 * figure (the node side waits between them).
 */
function place(anchor) {
  const el = find(anchor);
  if (!el) return { found: false };
  const h = window.innerHeight;
  if (anchor.kind === "chrome") {
    const ratio =
      anchor.docHeight > 0
        ? document.documentElement.scrollHeight / anchor.docHeight
        : 1;
    scrollTop((anchor.scrollY || 0) * ratio);
    return { found: true, how: "scrollY" };
  }
  if (anchor.kind === "figure-pane") {
    const stops = paneStops(anchor);
    if (stops.length) {
      scrollTop(stops[0]);
      return { found: true, how: "pane", stops };
    }
    scrollTop(anchor.scrollY || 0);
    return { found: true, how: "scrollY" };
  }
  if (anchor.kind === "opener") {
    scrollTop(docTop(el));
    return { found: true, how: "top" };
  }
  const onRail = railLandingY(el);
  if (onRail !== null) {
    scrollTop(onRail);
    return { found: true, how: "rail" };
  }
  if (revealInRail(el)) {
    // A track that scrolls by itself: the box on screen, the track moved.
    const box = el.closest("[data-rail-scroller]");
    scrollTop(docTop(box) - INSET);
    return { found: true, how: "swipe" };
  }
  const r = el.getBoundingClientRect();
  if (r.height >= h * 0.8) scrollTop(docTop(el) - (r.height > h ? INSET : 0));
  else if (r.top < INSET || r.bottom > h - 24)
    scrollTop(docTop(el) - Math.max(INSET, (h - r.height) / 2));
  return { found: true, how: "scroll" };
}

/** Put the anchor's point on screen when the element is taller than it. */
function revealPoint(anchor) {
  const el = find(anchor);
  if (!el || el.closest("[data-rail-scroller]")) return false;
  const r = el.getBoundingClientRect();
  const y = r.top + (anchor.point?.y ?? 0.5) * r.height;
  const h = window.innerHeight;
  if (y >= INSET && y <= h - 40) return false;
  window.scrollBy({ top: y - h / 2, behavior: "instant" });
  return true;
}

function clearMarks() {
  for (const n of document.querySelectorAll(`[${UI}]`)) n.remove();
}

function mark(style, text = "") {
  const n = document.createElement("div");
  n.setAttribute(UI, "");
  n.style.cssText = `position:fixed;pointer-events:none;z-index:2147483646;${style}`;
  if (text) n.textContent = text;
  document.body.appendChild(n);
  return n;
}

/**
 * Where the anchor is now, and whether pointing there again names the
 * same thing. Draws the outline, the point and a caption.
 */
function check(anchor, { recordsReady = false } = {}) {
  clearMarks();
  const el = find(anchor);
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const px = r.left + (anchor.point?.x ?? 0.5) * r.width;
  const py = r.top + (anchor.point?.y ?? 0.5) * r.height;
  const target = targetAt(px, py, document);
  const live = target
    ? anchorFor(
        target,
        { clientX: px, clientY: py },
        { page: pageState(window) }
      )
    : null;
  const same = sameAnchor(anchor, live);
  const onScreen =
    px >= 0 && py >= 0 && px <= window.innerWidth && py <= window.innerHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(1, r.left);
  const top = Math.max(1, r.top);
  const right = Math.min(vw - 1, r.right);
  const bottom = Math.min(vh - 1, r.bottom);
  const colour = same ? "#0a8f5a" : "#d0021b";
  mark(
    `left:${left}px;top:${top}px;width:${Math.max(0, right - left)}px;height:${Math.max(0, bottom - top)}px;border:3px solid ${colour};border-radius:4px;box-shadow:0 0 0 9999px rgba(0,0,0,.18)`
  );
  mark(
    `left:${px - 14}px;top:${py - 1}px;width:28px;height:2px;background:${colour}`
  );
  mark(
    `left:${px - 1}px;top:${py - 14}px;width:2px;height:28px;background:${colour}`
  );
  mark(
    `left:${px - 7}px;top:${py - 7}px;width:14px;height:14px;border-radius:50%;border:2px solid #fff;background:${colour}`
  );
  mark(
    `left:8px;right:8px;bottom:8px;padding:8px 12px;border-radius:8px;background:rgba(16,16,16,.92);color:#fff;font:13px/1.4 system-ui,sans-serif`,
    `${same ? "SAME PLACE" : "DIFFERS"} · ${anchor.label || anchor.kind}${same ? "" : ` → now: ${live?.label || "nothing"}`}`
  );
  return {
    found: true,
    same,
    onScreen,
    recordsReady,
    rect: {
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: Math.round(r.width),
      h: Math.round(r.height),
    },
    point: { x: Math.round(px), y: Math.round(py) },
    live: live && {
      kind: live.kind,
      label: live.label,
      paragraphId: live.paragraphId,
      figureKey: live.figureKey,
      widgetId: live.widgetId,
      plateIndex: live.plateIndex,
      railPart: live.railPart,
    },
    paneKey: paneKey(),
    scrollY: Math.round(window.scrollY),
  };
}

window.__obLocate = {
  find: (a) => !!find(a),
  place,
  revealPoint,
  check,
  paneKey,
  scrollTop,
};
