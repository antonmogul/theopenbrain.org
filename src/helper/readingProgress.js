export function clampReadingPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

export function readingPercentForScroll(
  scrollY,
  documentHeight,
  viewportHeight
) {
  const scrollableHeight = Math.max(0, documentHeight - viewportHeight);
  if (scrollableHeight === 0) return 100;
  return clampReadingPercent((scrollY / scrollableHeight) * 100);
}

export function scrollTopForReadingPercent(
  percent,
  documentHeight,
  viewportHeight
) {
  const scrollableHeight = Math.max(0, documentHeight - viewportHeight);
  return (clampReadingPercent(percent) / 100) * scrollableHeight;
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
