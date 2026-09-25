/*
 * Whether a paragraph's figure renders inline, in the text, instead of in
 * the pinned figure pane (OPENBRAIN-91).
 *
 * Below the two-column breakpoint there is no pane, so figures are always
 * inline. Above it they are inline only inside a full-width block that
 * covers the pane: a breakout box floating in the stage layer (FullBleed
 * provides its `floating` state).
 */
import { computed, inject } from "vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";

export const FULL_BLEED_FLOATING = Symbol("fullBleedFloating");

export function useInlineFigures() {
  const narrow = useMediaQuery(READER_NARROW_QUERY);
  const floating = inject(FULL_BLEED_FLOATING, null);
  return computed(() => !!narrow.value || !!floating?.value);
}
