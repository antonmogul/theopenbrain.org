export function clampReadingPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/*
 * Reading progress is measured over the READING BODY, not the whole
 * document (OPENBRAIN-32). The chapter opener (cover + title/TOC) sits above
 * the prose and its height varies per chapter and viewport; if it counted,
 * every saved percentage would shift whenever the opener changed height.
 * `offset` is that opener height in px: scrolling within the opener reads
 * as 0%, and 100% is the end of the prose.
 */
export function readingOffset(root = globalThis.document?.documentElement) {
  const raw = root?.style?.getPropertyValue?.("--opener-h") || "";
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : 0;
}

export function readingPercentForScroll(
  scrollY,
  documentHeight,
  viewportHeight,
  offset = 0
) {
  const scrollableHeight = Math.max(
    0,
    documentHeight - viewportHeight - offset
  );
  if (scrollableHeight === 0) return 100;
  const y = Math.max(0, scrollY - offset);
  return clampReadingPercent((y / scrollableHeight) * 100);
}

export function scrollTopForReadingPercent(
  percent,
  documentHeight,
  viewportHeight,
  offset = 0
) {
  const scrollableHeight = Math.max(
    0,
    documentHeight - viewportHeight - offset
  );
  return offset + (clampReadingPercent(percent) / 100) * scrollableHeight;
}

// Layout can settle asynchronously while the route, course, or authenticated
// reader changes. Keep the final validity check adjacent to the scroll side
// effect so a stale restore can never jump the next reader's document.
export async function restoreAfterLayout({
  waitForLayout,
  isCurrent,
  restore,
}) {
  await waitForLayout();
  if (!isCurrent()) return false;
  restore();
  return true;
}
