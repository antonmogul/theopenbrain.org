/*
 * useExploreRail — drives a breakout box's side-scrolling track
 * (OPENBRAIN-163; the format and its DOM contract are in
 * helper/exploreRail.js).
 *
 * Two scroll positions, one truth. While the box is pinned, the page's
 * scroll through the pause spacer sets the track's scrollLeft (drive). When
 * the track moves any other way (a sideways swipe, the arrow keys on the
 * focused track, focus landing on a link in a later part), the page is
 * scrolled to the matching position at once (onTrackScroll), so the next
 * wheel tick carries on from there instead of snapping back. `expected`
 * tells the two apart: it is what drive last wrote.
 *
 * Under reduced motion nothing is pinned (BreakoutBox's CSS already drops
 * the pause) and the page does not drive the track: it is a plain
 * horizontal scroller with Previous and Next.
 */
import { computed, nextTick, onBeforeUnmount, ref, toValue, watch } from "vue";
import {
  RAIL_LEAD,
  clearRailColumns,
  fitRailColumns,
  railActivePart,
  railMax,
  railNextStop,
  railRoom,
  railScrolledForX,
  railStops,
  railXForScrolled,
  railXOf,
} from "@/helper/exploreRail";
import { reducedMotionPreferred, scrollToY } from "@/helper/readerJump";

/**
 * @param {{
 *   enabled: import("vue").MaybeRefOrGetter<boolean>,  // the rail is laid out
 *   pauseEl: import("vue").Ref<HTMLElement|null>,      // .bx-pause
 *   boxEl: import("vue").Ref<HTMLElement|null>,        // the sticky box
 *   scrollerEl: import("vue").Ref<HTMLElement|null>,   // the track
 * }} opts
 */
export function useExploreRail({ enabled, pauseEl, boxEl, scrollerEl }) {
  const max = ref(0);
  const lead = ref(0);
  const stickyTop = ref(0);
  const reduced = ref(false);
  const active = ref(0);
  const atStart = ref(true);
  const atEnd = ref(false);

  let starts = [];
  let view = 0;
  let expected = null;
  let listening = false;
  let bound = null; // the track the listeners are on
  let resizeObserver = null;
  let mutationObserver = null;
  let motionObserver = null;
  let measureQueued = false;
  let disposed = false;

  const on = computed(() => !!toValue(enabled));
  /** The page's scroll drives the track. */
  const pinned = computed(() => on.value && !reduced.value && max.value > 0);
  /** The pause spacer's height in px (0: leave it to the box's CSS). */
  const room = computed(() =>
    pinned.value ? railRoom({ lead: lead.value, max: max.value }) : 0
  );

  const scrollY = () => window.scrollY || window.pageYOffset || 0;
  const geometry = () => ({ lead: lead.value, max: max.value });
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
    pauseEl.value?.style.setProperty(
      "--rail-progress",
      max.value > 0 ? String(Math.min(1, Math.max(0, x / max.value))) : "0"
    );
  }

  /** The page moved: put the track where the page says. */
  function drive() {
    const scroller = scrollerEl.value;
    const pause = pauseEl.value;
    if (!pinned.value || !scroller || !pause) return;
    const scrolled = stickyTop.value - pause.getBoundingClientRect().top;
    const x = railXForScrolled(scrolled, geometry());
    expected = x;
    if (Math.abs(scroller.scrollLeft - x) > 0.5) scroller.scrollLeft = x;
    report(x);
  }

  /** The track moved: if the page did not move it, the page follows. */
  function onTrackScroll() {
    const scroller = scrollerEl.value;
    if (!on.value || !scroller) return;
    const x = scroller.scrollLeft;
    if (pinned.value && (expected === null || Math.abs(x - expected) > 1.5)) {
      expected = x;
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
    fitRailColumns(scroller);
    view = scroller.clientWidth;
    max.value = railMax(scroller);
    lead.value = Math.round((window.innerHeight || 0) * RAIL_LEAD);
    stickyTop.value = parseFloat(getComputedStyle(boxEl.value).top) || 0;
    // Each part's start at scrollLeft 0, whatever the track is at now.
    starts = [...scroller.querySelectorAll("[data-explore]")].map((part) => {
      const pad = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
      const x =
        part.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left +
        scroller.scrollLeft -
        pad;
      return Math.min(max.value, Math.max(0, Math.round(x)));
    });
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
    goTo(railNextStop(railStops(starts, view, max.value), x, dir));
  };
  const next = () => step(1);
  const prev = () => step(-1);
  /** Go to part `i` (0-based). */
  const goToPart = (i) => goTo(starts[i] ?? 0);
  /** Go to an element on the track (a paragraph, a figure). */
  const goToElement = (el) => goTo(railXOf(el, scrollerEl.value));

  function start() {
    const scroller = scrollerEl.value;
    if (listening || !scroller || typeof window === "undefined") return;
    listening = true;
    bound = scroller;
    window.addEventListener("scroll", drive, { passive: true });
    window.addEventListener("resize", queueMeasure);
    scroller.addEventListener("scroll", onTrackScroll, { passive: true });
    // An image arriving changes how the columns break.
    scroller.addEventListener("load", queueMeasure, true);
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

  function stop() {
    if (!listening) return;
    listening = false;
    window.removeEventListener("scroll", drive);
    window.removeEventListener("resize", queueMeasure);
    const scroller = bound;
    bound = null;
    scroller?.removeEventListener("scroll", onTrackScroll);
    scroller?.removeEventListener("load", queueMeasure, true);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    motionObserver?.disconnect();
    resizeObserver = mutationObserver = motionObserver = null;
    clearRailColumns(scroller);
    pauseEl.value?.style.removeProperty("--rail-progress");
    max.value = 0;
    expected = null;
    starts = [];
  }

  // After the DOM shows the rail's layout (the cards switch on the same
  // flag), and again whenever the track element itself is replaced.
  watch(
    [on, scrollerEl],
    () => {
      stop();
      if (on.value) nextTick(start);
    },
    { immediate: true, flush: "post" }
  );
  onBeforeUnmount(() => {
    disposed = true;
    stop();
  });

  return {
    pinned,
    room,
    lead,
    stickyTop,
    active,
    atStart,
    atEnd,
    next,
    prev,
    goToPart,
    goToElement,
    measure,
  };
}
