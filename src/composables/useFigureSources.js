/*
 * useFigureSources — the image files a set of figures shows (OPENBRAIN-187).
 *
 * An "Explore more" paragraph carries a picture of its own (content.explore
 * .image) and often a figure too, and in History the two were the same file
 * more than once: the rete mirabile's card image is Figure C's only image,
 * so the reader saw it twice (Stuart, 12 Nov: "the image shows up again,
 * this time with legend and full screen button"). The rail part and the
 * fold-out card ask this which files their figures already show and leave
 * out a picture that would repeat one.
 *
 * Figures resolve as IllustrationInline resolves them: the database first,
 * animations.json as the fallback, quietly while the fetch is out.
 */
import { computed, onMounted, toValue, watch } from "vue";
import { useAnimations } from "@/composables/useAnimations";
import { resolveAnimationRecord } from "@/helper/animationResolve";
import { figureImages } from "@/helper/figureCycle";
import { imageUrl } from "@/editor/media.mjs";
import animationJSON from "@/assets/json_backend/animations.json";

/**
 * @param {import("vue").MaybeRefOrGetter<string[]>} ids animation ids
 * @returns {import("vue").ComputedRef<Set<string>>} their images' urls
 */
export function useFigureSources(ids) {
  const records = useFigureRecords(ids);
  return computed(() => {
    const out = new Set();
    for (const record of records.value)
      for (const image of figureImages(record)) out.add(imageUrl(image.src));
    return out;
  });
}

/**
 * The figures' records, in the order of `ids`; null for one that has not
 * resolved (the fetch is out, or nothing has it). A rail part draws its
 * image figures itself from these (RailFigure, OPENBRAIN-194).
 * @param {import("vue").MaybeRefOrGetter<string[]>} ids animation ids
 * @returns {import("vue").ComputedRef<(object | null)[]>}
 */
export function useFigureRecords(ids) {
  const { animations, fetchAnimations } = useAnimations();
  // Once there are figures to look up (a box's figures are drawn only once
  // it floats, after its first render). Shared and cached: the figures
  // themselves make the same request.
  let asked = false;
  const ask = () => {
    if (asked || !(toValue(ids) || []).length) return;
    asked = true;
    Promise.resolve(fetchAnimations()).catch(() => {});
  };
  onMounted(ask);
  watch(() => toValue(ids), ask);
  return computed(() =>
    (toValue(ids) || []).map(
      (id) =>
        resolveAnimationRecord(
          id,
          animations.value,
          animationJSON.animations,
          () => {}
        ) || null
    )
  );
}

/** Whether `src` is one of `sources` (a Set from useFigureSources). */
export const shownBy = (sources, src) =>
  !!src && !!sources?.has?.(imageUrl(src));
