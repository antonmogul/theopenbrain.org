/*
 * useExploreRail — drives a breakout box's side-scrolling track
 * (OPENBRAIN-163, 187; the format, its two modes and its DOM contract are
 * in helper/exploreRail.js).
 *
 * "track" (from the two-column breakpoint): two scroll positions, one
 * truth. While the box is pinned, the page's scroll through the pause
 * spacer sets the track's scrollLeft (drive). When the track moves any
 * other way (a sideways swipe, the arrow keys on the focused track, focus
 * landing on a link in a later part), the page is scrolled to the matching
 * position at once (onTrackScroll), so the next wheel tick carries on from
 * there instead of snapping back. `expected` tells the two apart: it is
 * what drive last wrote. Under reduced motion nothing is pinned
 * (BreakoutBox's CSS already drops the pause) and the page does not drive
 * the track: it is a plain horizontal scroller with Previous and Next.
 *
 * "swipe" (below it): the page never drives the track and the track never
 * moves the page. It is a native swipe with scroll snapping, a page at a
 * time; this only sizes the columns, counts the pages (BreakoutBox draws a
 * snap point for each) and turns them for the buttons.
 *
 * The title card (OPENBRAIN-77, helper/boxTitleCard.js). A box that opens
 * on its lead picture spends the first stretch of its pin on that card:
 * `intro` px of page scroll, which is simply more lead-in. Everything that
 * maps between the page and the track (drive, onTrackScroll, goTo, and
 * railLandingY through data-rail-lead) uses the lead-in with the card's
 * stretch in it, so every landing on the track is past the card, and the
 * pause spacer is longer by the same amount. `onDrive` hears how far past
 * its pin the box is on every scroll, which is what moves the card.
 */
import { computed, nextTick, onBeforeUnmount, ref, toValue, watch } from "vue";
import { CARD_READ, CARD_SCREENS } from "@/helper/boxTitleCard";
import { followBoxMotion } from "@/helper/boxCard.mjs";
import {
  RAIL_LEAD,
  clearRailColumns,
  fitRailColumns,
  fitRailFigures,
  railActivePart,
  railMax,
  railNextStop,
  railPageStops,
  railRoom,
  railScrolledForX,
  railStopIndex,
  railStops,
  railXForScrolled,
  railXOf,
} from "@/helper/exploreRail";
import { reducedMotionPreferred, scrollToY } from "@/helper/readerJump";
import { videoFullscreenHeld } from "@/helper/videoFullscreen";
import { readerScrollLocked } from "@/helper/readerScrollLock";

/**
 * @param {{
 *   mode: import("vue").MaybeRefOrGetter<"track"|"swipe"|null>, // how the rail is laid out
 *   pauseEl: import("vue").Ref<HTMLElement|null>,      // .bx-pause
 *   boxEl: import("vue").Ref<HTMLElement|null>,        // the sticky box
 *   scrollerEl: import("vue").Ref<HTMLElement|null>,   // the track
 *   card?: import("vue").MaybeRefOrGetter<boolean>,    // opens on a title card
 *   onDrive?: (scrolled: number, intro: number) => void, // px past the pin
 * }} opts
 */
export function useExploreRail({
  mode,
  pauseEl,
  boxEl,
  scrollerEl,
  card = false,
  onDrive = null,
}) {
  const max = ref(0);
  const lead = ref(0);
  /** Px of the pin's scroll the title card takes, before the lead-in. */
  const intro = ref(0);
  const stickyTop = ref(0);
  const reduced = ref(false);
  const active = ref(0);
  const atStart = ref(true);
  const atEnd = ref(false);
  /** Where Previous / Next stop, how many there are, and which one this is. */
  const stop = ref(0);
  const stopCount = ref(1);

  let starts = [];
  let stops = [0];
  let view = 0;
  let expected = null;
  let listening = false;
  let bound = null; // the track the listeners are on
  let resizeObserver = null;
  let mutationObserver = null;
  let motionObserver = null;
  let motionQuery = null;
  let measureQueued = false;
  let disposed = false;
  let frame = 0;
  let previousTime = 0;
  let visual = null;
  let velocity = 0;
  let target = 0;

  function paint(scrolled) {
    const scroller = scrollerEl.value;
    if (!scroller) return;
    const offset =
      railXForScrolled(target, geometry()) -
      railXForScrolled(scrolled, geometry());
    scroller.dataset.railVisualOffset = String(offset);
    scroller.style.setProperty("--rail-visual-offset", `${offset}px`);
    onDrive?.(scrolled, intro.value);
  }
  function follow(time) {
    frame = 0;
    if (!pinned.value || disposed) return;
    if (videoFullscreenHeld() || readerScrollLocked()) {
      previousTime = 0;
      return;
    }
    const next = followBoxMotion(
      visual ?? target,
      velocity,
      target,
      previousTime ? (time - previousTime) / 1000 : 1 / 60
    );
    previousTime = time;
    visual = next.position;
    velocity = next.velocity;
    if (Math.abs(visual - target) < 0.1 && Math.abs(velocity) < 0.5) {
      visual = target;
      velocity = 0;
      previousTime = 0;
    } else frame = requestAnimationFrame(follow);
    paint(visual);
  }
  function settle() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    velocity = 0;
    visual = target;
    paint(target);
  }

  const how = computed(() => toValue(mode) || null);
  const on = computed(() => !!how.value);
  const swipe = computed(() => how.value === "swipe");
  /** The page's scroll drives the track. */
  const pinned = computed(
    () =>
      how.value === "track" &&
      !reduced.value &&
      (max.value > 0 || intro.value > 0)
  );
  /** Px of page scroll before the track moves: the card, then the lead-in. */
  const runIn = computed(() => lead.value + intro.value);
  /** The pause spacer's height in px (0: leave it to the box's CSS). */
  const room = computed(() => {
    if (!pinned.value) return 0;
    if (!intro.value) return railRoom({ lead: lead.value, max: max.value });
    return Math.round(intro.value + 2 * lead.value + max.value);
  });

  const scrollY = () => window.scrollY || window.pageYOffset || 0;
  const geometry = () => ({ lead: runIn.value, max: max.value });
  /** The page scrollY at which the box pins. */
  const pinY = () =>
    (pauseEl.value?.getBoundingClientRect().top || 0) +
    scrollY() -
    stickyTop.value;

  /* What the nav shows, written only when it changes: the track scrolls on
     every frame, the nav re-renders a few times per pass. The progress line
     is a custom property, so it costs no render at all. */
  function report(x) {
    const part = railActivePart(starts, x, view, max.value);
    if (part !== active.value) active.value = part;
    const start = x <= 1;
    const end = x >= max.value - 1;
    if (start !== atStart.value) atStart.value = start;
    if (end !== atEnd.value) atEnd.value = end;
    const index = railStopIndex(stops, x);
    if (index !== stop.value) stop.value = index;
    pauseEl.value?.style.setProperty(
      "--rail-progress",
      max.value > 0 ? String(Math.min(1, Math.max(0, x / max.value))) : "0"
    );
  }

  /** The page moved: put the track where the page says. */
  function drive() {
    if (videoFullscreenHeld() || readerScrollLocked()) return;
    const scroller = scrollerEl.value;
    const pause = pauseEl.value;
    if (!pinned.value || !scroller || !pause) return;
    const scrolled = stickyTop.value - pause.getBoundingClientRect().top;
    const previous = target;
    target = scrolled;
    const x = railXForScrolled(scrolled, geometry());
    expected = x;
    if (Math.abs(scroller.scrollLeft - x) > 0.5) scroller.scrollLeft = x;
    // Native page/track coordinates remain 1:1. Only the child artwork and
    // text transform follows behind; big jumps and off-stage boxes snap.
    if (
      visual === null ||
      Math.abs(target - previous) > window.innerHeight * 0.75 ||
      target < 0 ||
      target > runIn.value + max.value
    )
      settle();
    else {
      paint(visual);
      if (!frame) frame = requestAnimationFrame(follow);
    }
    report(x);
  }

  /** The track moved: if the page did not move it, the page follows. */
  function onTrackScroll() {
    if (videoFullscreenHeld() || readerScrollLocked()) return;
    const scroller = scrollerEl.value;
    if (!on.value || !scroller) return;
    const x = Math.min(max.value, scroller.scrollLeft);
    if (scroller.scrollLeft > max.value) scroller.scrollLeft = x;
    if (pinned.value && (expected === null || Math.abs(x - expected) > 1.5)) {
      expected = x;
      target = railScrolledForX(x, geometry());
      settle();
      // "instant": the document's scroll-behavior is smooth (index.css).
      window.scrollTo({
        top: Math.round(pinY() + railScrolledForX(x, geometry())),
        behavior: "instant",
      });
    }
    report(x);
  }

  function measure() {
    const scroller = scrollerEl.value;
    if (!on.value || !scroller || disposed) return;
    reduced.value = reducedMotionPreferred();
    // Re-fitting the columns lets the track shrink for a moment, which
    // clamps its scrollLeft; a track the page does not drive keeps where
    // the reader left it.
    const keep = scroller.scrollLeft;
    // Transform overflow must not inflate native travel on the next measure.
    scroller.style.setProperty("--rail-visual-offset", "0px");
    scroller.dataset.railVisualOffset = "0";
    delete scroller.dataset.railMax;
    fitRailFigures(scroller);
    fitRailColumns(scroller);
    if (!pinned.value && scroller.scrollLeft !== keep)
      scroller.scrollLeft = keep;
    view = scroller.clientWidth;
    max.value = railMax(scroller);
    scroller.dataset.railMax = String(max.value);
    lead.value = Math.round((window.innerHeight || 0) * RAIL_LEAD);
    intro.value =
      how.value === "track" && !reduced.value && toValue(card)
        ? Math.round((window.innerHeight || 0) * CARD_SCREENS)
        : 0;
    scroller.dataset.railCardRead = String(Math.round(intro.value * CARD_READ));
    stickyTop.value = parseFloat(getComputedStyle(boxEl.value).top) || 0;
    // Each part's start at scrollLeft 0, whatever the track is at now.
    starts = [...scroller.querySelectorAll("[data-rail-part]")].map((part) => {
      const pad = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
      const x =
        part.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left +
        scroller.scrollLeft -
        pad -
        Number(scroller.dataset.railVisualOffset || 0);
      return Math.min(max.value, Math.max(0, Math.round(x)));
    });
    stops = swipe.value
      ? railPageStops(view, max.value)
      : railStops(starts, view, max.value);
    if (stops.length !== stopCount.value) stopCount.value = stops.length;
    // The spacer's new height reaches the DOM on the next tick; the page's
    // position then decides the track's.
    nextTick(() => {
      if (disposed) return;
      if (pinned.value) drive();
      else report(scroller.scrollLeft);
    });
  }

  /* One measurement per burst of observer callbacks. A timer, not
     requestAnimationFrame, which never fires in a background tab
     (FullBleed makes the same choice). */
  /* A phone fires resize whenever its address bar slides in or out; a
     swipe track only cares about a change of width. */
  let lastWidth = 0;
  function onResize() {
    const width = window.innerWidth || 0;
    if (swipe.value && width === lastWidth) return;
    lastWidth = width;
    queueMeasure();
  }
  function queueMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    setTimeout(() => {
      measureQueued = false;
      measure();
    }, 0);
  }

  function goTo(x) {
    const scroller = scrollerEl.value;
    if (!scroller) return;
    const target = Math.min(max.value, Math.max(0, x));
    if (pinned.value)
      scrollToY(() => pinY() + railScrolledForX(target, geometry()));
    else
      scroller.scrollTo({
        left: target,
        behavior: reducedMotionPreferred() ? "instant" : "smooth",
      });
  }
  const step = (dir) => {
    const x = scrollerEl.value?.scrollLeft || 0;
    goTo(railNextStop(stops, x, dir));
  };
  const next = () => step(1);
  const prev = () => step(-1);
  /** Go to part `i` (0-based). */
  const goToPart = (i) => goTo(starts[i] ?? 0);
  /** Go to an element on the track (a paragraph, a figure). */
  const goToElement = (el) => goTo(railXOf(el, scrollerEl.value));
  /** Into the track, past the title card: its start, or where it is now
   *  when something else has already moved it. */
  function enter({ instant = false } = {}) {
    const x = scrollerEl.value?.scrollLeft || 0;
    if (!instant || !pinned.value) return goTo(x);
    window.scrollTo({
      top: Math.round(pinY() + railScrolledForX(x, geometry())),
      behavior: "instant",
    });
  }

  function start() {
    const scroller = scrollerEl.value;
    if (listening || !scroller || typeof window === "undefined") return;
    listening = true;
    bound = scroller;
    window.addEventListener("scroll", drive, { passive: true });
    lastWidth = window.innerWidth || 0;
    window.addEventListener("resize", onResize);
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener?.("change", queueMeasure);
    scroller.addEventListener("scroll", onTrackScroll, { passive: true });
    // An image arriving changes how the columns break.
    scroller.addEventListener("load", queueMeasure, true);
    scroller.addEventListener("toggle", queueMeasure, true);
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(queueMeasure);
      resizeObserver.observe(scroller);
    }
    if (typeof MutationObserver === "function") {
      // Text edited, a highlight painted, a figure mounted. Not attributes:
      // fitRailColumns writes style.width.
      mutationObserver = new MutationObserver(queueMeasure);
      mutationObserver.observe(scroller, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      // The reader's own motion setting (usePreferences).
      motionObserver = new MutationObserver(queueMeasure);
      motionObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-reduce-motion"],
      });
    }
    document.fonts?.ready?.then(queueMeasure);
    measure();
  }

  function stopListening() {
    if (!listening) return;
    listening = false;
    window.removeEventListener("scroll", drive);
    window.removeEventListener("resize", onResize);
    motionQuery?.removeEventListener?.("change", queueMeasure);
    motionQuery = null;
    const scroller = bound;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    visual = null;
    velocity = 0;
    previousTime = 0;
    scroller?.style.removeProperty("--rail-visual-offset");
    if (scroller) {
      delete scroller.dataset.railVisualOffset;
      delete scroller.dataset.railMax;
      delete scroller.dataset.railCardRead;
    }
    bound = null;
    scroller?.removeEventListener("scroll", onTrackScroll);
    scroller?.removeEventListener("load", queueMeasure, true);
    scroller?.removeEventListener("toggle", queueMeasure, true);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    motionObserver?.disconnect();
    resizeObserver = mutationObserver = motionObserver = null;
    clearRailColumns(scroller);
    pauseEl.value?.style.removeProperty("--rail-progress");
    max.value = 0;
    intro.value = 0;
    expected = null;
    starts = [];
    stops = [0];
    stop.value = 0;
    stopCount.value = 1;
  }

  // After the DOM shows the rail's layout (the parts switch on the same
  // flag), and again whenever the mode or the track element itself changes.
  watch(
    [how, scrollerEl],
    () => {
      stopListening();
      if (on.value) nextTick(start);
    },
    { immediate: true, flush: "post" }
  );
  // The card came or went (its picture's record arrived): the pin's length
  // changes with it.
  watch(
    () => !!toValue(card),
    () => {
      if (listening) queueMeasure();
    }
  );
  onBeforeUnmount(() => {
    disposed = true;
    stopListening();
  });

  return {
    pinned,
    reduced,
    room,
    // What the track's contract calls its lead (data-rail-lead): all the
    // page scroll before the track moves, the card's stretch included.
    lead: runIn,
    intro,
    stickyTop,
    active,
    atStart,
    atEnd,
    stop,
    stopCount,
    next,
    prev,
    goToPart,
    goToElement,
    enter,
    measure,
  };
}
