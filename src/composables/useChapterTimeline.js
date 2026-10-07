/*
 * Chapter timeline runtime (OPENBRAIN-128). helper/chapterTimeline.js turns
 * the chapter into bars; this measures them against the page and keeps the
 * reading line's place among them, so the dock (ChapterTimeline) stays
 * presentational:
 *
 *   model     buildTimeline over useText's chapter, numbered with the same
 *             section labels the prose and the opener print.
 *   position  the reading line (READING_LINE of the viewport) as a fractional
 *             item index: 12.4 is four tenths of the way through item 12.
 *   layers    the reader's highlights and notes, and the community's trending
 *             passages, by item index. useHighlights and useNotes hold every
 *             chapter's rows; only this chapter's paragraphs land.
 *   jumpTo    scroll an item (or a section's heading) under the top bar,
 *             flash it and move focus there.
 *   refreshTrending  fetch the trending passages again (a share changes them).
 *
 * Each item's top is measured once (rect.top + scrollY), not per scroll
 * event: the scroll listener only maps scrollY through those tops. They are
 * measured again, at most once a frame, whenever layout can have moved: the
 * content appearing, a resize, #text changing size (figures loading,
 * inline stages opening) and ScrollTrigger's refresh (pins that add height).
 */
import { computed, nextTick, onScopeDispose, ref, toValue, watch } from "vue";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sectionLabelMap } from "@/composables/useChapterOutline";
import { useTrendingHighlights } from "@/composables/useTrendingHighlights";
import {
  READING_LINE,
  buildTimeline,
  monotonic,
  positionForY,
  scrollYForIndex,
} from "@/helper/chapterTimeline";
import {
  findReaderAnchor,
  flashElement,
  focusElement,
  jumpToElement,
  readerTopInset,
  readingStartOf,
  scrollToY,
} from "@/helper/readerJump";

const EMPTY_MODEL = Object.freeze({
  items: [],
  sections: [],
  subsections: [],
  maxWords: 1,
  byId: new Map(),
});

/* Push `entry` onto the list at `index` in `map`. */
function add(map, index, entry) {
  if (!map.has(index)) map.set(index, []);
  map.get(index).push(entry);
}

/* Rows on this chapter's paragraphs as [itemIndex, row], in item order
   (then `order` within an item); rows on other chapters' paragraphs, or on
   none, are dropped. */
function placed(rows, paragraphOf, byId, order = () => 0) {
  const out = [];
  for (const row of rows || []) {
    const id = row ? paragraphOf(row) : null;
    const index = id == null ? undefined : byId.get(String(id));
    if (index !== undefined) out.push([index, row]);
  }
  return out.sort((a, b) => a[0] - b[0] || order(a[1], b[1]));
}

/* An element's viewport rect, or null when it has no box (missing, or
   display: none, whose all-zero rect would read as "at the viewport top"). */
function boxOf(el) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (!rect.width && !rect.height && !rect.top && !rect.left) return null;
  return rect;
}

const offset = (h) => Number(h.start_offset) || 0;
const count = (row) => Number(row.highlight_count) || 0;

/**
 * @param {{
 *   text: import("vue").Ref<object|null>,        // useText().text
 *   moduleId: import("vue").Ref<string|null>,
 *   highlights: import("vue").Ref<object[]>,     // useHighlights().highlights
 *   notes: import("vue").Ref<object[]>,          // useNotes().notes
 *   enabled?: import("vue").Ref<boolean>,        // measure/listen only while true
 * }} opts
 * @returns {{
 *   model: import("vue").ComputedRef<ReturnType<typeof buildTimeline>>,
 *   position: import("vue").Ref<number>,         // fractional item index, 0..n
 *   layers: import("vue").ComputedRef<{
 *     highlights: Map<number, Array<{ id, color, text }>>,
 *     notes: Map<number, Array<{ id, content }>>,
 *     trending: Map<number, Array<{ text, count }>>,  // count desc
 *   }>,
 *   measure: () => void,
 *   jumpTo: (
 *     target: number | { index: number, anchorId?: string },
 *     how?: { pointer?: boolean },
 *   ) => void,
 *   refreshTrending: () => Promise<void>,
 * }}
 */
export function useChapterTimeline({
  text,
  moduleId,
  highlights,
  notes,
  enabled = true,
} = {}) {
  const model = computed(() => {
    const chapter = toValue(text);
    if (!chapter) return EMPTY_MODEL;
    return buildTimeline(chapter, {
      labels: sectionLabelMap(chapter.sections),
    });
  });

  const position = ref(0);

  /* ---- Layers ---------------------------------------------------------- */

  const { trending, fetchTrendingForModule } = useTrendingHighlights();

  /** Fetch this chapter's trending passages again (after a share or unshare). */
  function refreshTrending() {
    return fetchTrendingForModule(toValue(moduleId) || null);
  }

  // Signed out included: trending is public. A failure is an empty lane.
  watch(() => toValue(moduleId), refreshTrending, { immediate: true });

  const layers = computed(() => {
    const { byId } = model.value;
    const out = {
      highlights: new Map(),
      notes: new Map(),
      trending: new Map(),
    };

    // Highlights in reading order, as HighlightRenderer paints them.
    const own = placed(
      toValue(highlights),
      (h) => h.paragraph_id,
      byId,
      (a, b) => offset(a) - offset(b)
    );
    for (const [index, h] of own)
      add(out.highlights, index, {
        id: h.id,
        color: h.color || "yellow",
        text: h.selected_text || "",
      });

    // A note sits on its paragraph, or on its highlight's.
    const noted = placed(
      toValue(notes),
      (n) => n.paragraph_id ?? n.highlight?.paragraph_id,
      byId
    );
    for (const [index, n] of noted)
      add(out.notes, index, { id: n.id, content: n.content || "" });

    // Most-highlighted first within a paragraph.
    const popular = placed(
      trending.value,
      (row) => row.paragraph_id,
      byId,
      (a, b) => count(b) - count(a)
    );
    for (const [index, row] of popular)
      add(out.trending, index, {
        text: row.selected_text || "",
        count: count(row),
      });

    return out;
  });

  /* ---- Measurement ----------------------------------------------------- */

  // Document-space tops of every item (non-decreasing) and the bottom of
  // the last one; [] until something on the page has been found.
  let tops = [];
  let endY = NaN;

  const scrollTop = () => window.scrollY || window.pageYOffset || 0;

  function updatePosition() {
    const n = model.value.items.length;
    if (!n || !tops.length) {
      position.value = 0;
      return;
    }
    const readingY = scrollTop() + window.innerHeight * READING_LINE;
    position.value = Math.min(n, positionForY(tops, readingY, endY));
  }

  /** Measure every item's top now (a layout read) and update `position`. */
  function measure() {
    if (typeof window === "undefined") return;
    const items = model.value.items;
    const y = scrollTop();
    let last = null;
    const raw = items.map((item, i) => {
      const rect = boxOf(findReaderAnchor(item.id));
      if (i === items.length - 1) last = rect;
      return rect ? rect.top + y : NaN;
    });
    // Nothing on the page (content not rendered yet): no tops rather than
    // all-zero ones, which would read as the whole chapter passed.
    tops = raw.some(Number.isFinite) ? monotonic(raw) : [];
    endY = last ? last.bottom + y : NaN;
    updatePosition();
  }

  // One frame for both jobs: a scroll only moves the reading line, anything
  // else measures (which moves it too).
  let frame = null;
  let measureDue = false;

  function flush() {
    frame = null;
    if (measureDue) {
      measureDue = false;
      measure();
    } else updatePosition();
  }

  function schedule(remeasure) {
    if (remeasure) measureDue = true;
    if (frame === null) frame = requestAnimationFrame(flush);
  }

  const onScroll = () => schedule(false);
  const onLayout = () => schedule(true);

  /* ---- Listeners ------------------------------------------------------- */

  let listening = false;
  let resizeObserver = null;
  let observed = null;

  // #text (TextComp's <main>) is rendered with the content, so it is looked
  // up after the DOM updates, and again if the chapter re-renders it.
  function observeText() {
    const main = document.getElementById("text");
    if (main === observed) return;
    resizeObserver?.disconnect();
    observed = main;
    if (!main || typeof ResizeObserver === "undefined") return;
    resizeObserver ??= new ResizeObserver(onLayout);
    resizeObserver.observe(main);
  }

  function start() {
    if (listening || typeof window === "undefined") return;
    listening = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onLayout);
    ScrollTrigger.addEventListener("refresh", onLayout);
    afterRender();
  }

  function stop() {
    if (!listening) return;
    listening = false;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onLayout);
    ScrollTrigger.removeEventListener("refresh", onLayout);
    resizeObserver?.disconnect();
    resizeObserver = null;
    observed = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    measureDue = false;
  }

  // Measure once the DOM shows what the model describes.
  function afterRender() {
    nextTick(() => {
      if (!listening) return;
      observeText();
      schedule(true);
    });
  }

  watch(
    () => toValue(enabled),
    (on) => (on ? start() : stop()),
    { immediate: true }
  );

  // A new chapter, or the same one edited: the old tops describe other
  // paragraphs. While listening they serve until the next frame measures.
  watch(model, () => {
    if (listening) return afterRender();
    tops = [];
    endY = NaN;
    position.value = 0;
  });

  onScopeDispose(stop);

  /* ---- Jumping --------------------------------------------------------- */

  /**
   * Scroll item `index` under the top bar (smooth unless reduced motion),
   * flash it and move focus to it. `{ index, anchorId }` lands on that
   * element instead when it is on the page: a section's or subsection's
   * heading sits above its first item, and the map's entries for them should
   * show it, as the opener's contents do (past a section's opening
   * transition spacer: readingStartOf). `pointer`: the reader clicked or
   * tapped, so the focus it moves shows no focus ring.
   */
  function jumpTo(target, { pointer = false } = {}) {
    if (typeof window === "undefined") return;
    const { index, anchorId } =
      target !== null && typeof target === "object"
        ? target
        : { index: target };
    const focusVisible = pointer ? false : undefined;
    const anchor = anchorId == null ? null : findReaderAnchor(anchorId);
    if (boxOf(anchor)) {
      jumpToElement(readingStartOf(anchor), {
        align: "top",
        focus: true,
        focusVisible,
      });
      return;
    }
    const i = Math.floor(Number(index));
    const item = model.value.items[i];
    if (!item) return;
    // Fresh tops: figures above may have loaded since the last measure (and
    // again if the scroll is cut short, scrollToY).
    const landed = scrollToY(() => {
      measure();
      return tops.length ? scrollYForIndex(tops, i, readerTopInset()) : NaN;
    });
    if (!landed) return;
    const el = findReaderAnchor(item.id);
    flashElement(el);
    focusElement(el, { focusVisible });
  }

  return { model, position, layers, measure, jumpTo, refreshTrending };
}
