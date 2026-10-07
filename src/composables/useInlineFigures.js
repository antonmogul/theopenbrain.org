/*
 * Whether a paragraph's figure renders inline, in the text, instead of in
 * the pinned figure pane (OPENBRAIN-91).
 *
 * Below the two-column breakpoint there is no pane, so figures are always
 * inline. Above it they are inline only inside a full-width block that
 * covers the pane: a breakout box floating in the stage layer (FullBleed
 * provides its `floating` state).
 */
import { computed, inject, toRaw } from "vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";
import { useText } from "@/stores";

export const FULL_BLEED_FLOATING = Symbol("fullBleedFloating");

export function useInlineFigures() {
  const narrow = useMediaQuery(READER_NARROW_QUERY);
  const floating = inject(FULL_BLEED_FLOATING, null);
  return computed(() => !!narrow.value || !!floating?.value);
}

/**
 * The first block, in reading order, that shows each figure in a chapter
 * tree (useText's `text`: sections → paragraphs → subSection → …). Several
 * paragraphs can trigger states of one figure: the pane shows it once and
 * moves it through them. Inline, it was drawn again at every trigger (the
 * Retina's cell types five times over); now it is drawn at the first, with
 * its own state controls (OPENBRAIN-99).
 * Blocks are matched as objects (not by id: some wrappers have none).
 * @returns {Map<string, object>} animation id → the (raw) block
 */
export function firstFigureBlocks(tree) {
  const first = new Map();
  const seen = new Set();
  const walk = (value) => {
    const node = toRaw(value);
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const figure = node.animation?.id;
    if (figure && !first.has(figure)) first.set(figure, node);
    for (const value of Object.values(node))
      if (value && typeof value === "object") walk(value);
  };
  walk(tree);
  return first;
}

/**
 * Whether a block (section or paragraph) draws its figure inline: figures
 * are inline here (useInlineFigures) and, below the two-column reader, this
 * is the figure's first block. A breakout box floating over the pane keeps
 * its figures, which the pane is not showing.
 */
export function useInlineFigureFor() {
  const inline = useInlineFigures();
  const narrow = useMediaQuery(READER_NARROW_QUERY);
  const store = useText();
  const first = computed(() => firstFigureBlocks(store.text));
  return (block) => {
    const figure = block?.animation?.id;
    if (!inline.value || !figure) return false;
    return !narrow.value || first.value.get(figure) === toRaw(block);
  };
}
