/* Optional design-preview geometry only. No estimates, fabricated waveform,
   or production-reader activation. Entry/exit refer to the viewport midpoint. */
export function measureChapterRange(root, viewport) {
  if (!root?.isConnected) return null;
  const { scrollY, height, maxScroll } = viewport;
  if (
    ![scrollY, height, maxScroll].every(Number.isFinite) ||
    height <= 0 ||
    maxScroll <= 0
  )
    return null;
  const rect = root.getBoundingClientRect();
  if (
    ![rect.top, rect.bottom, rect.width].every(Number.isFinite) ||
    rect.width <= 0 ||
    rect.bottom <= rect.top
  )
    return null;
  const start = Math.max(0, rect.top + scrollY - height / 2);
  const end = Math.min(maxScroll, rect.bottom + scrollY - height / 2);
  if (end <= start) return null;
  const clamp = (value) => Math.max(start, Math.min(end, value));
  const intervals = [];
  for (const node of root.querySelectorAll("[data-preview-figure]")) {
    const box = node.getBoundingClientRect();
    if (
      ![box.top, box.bottom, box.width].every(Number.isFinite) ||
      box.width <= 0 ||
      box.bottom <= box.top
    )
      continue;
    const entry = clamp(box.top + scrollY - height / 2);
    const exit = clamp(box.bottom + scrollY - height / 2);
    if (exit <= entry) continue;
    intervals.push({
      label: node.dataset.previewFigure || "Figure",
      entry,
      exit,
    });
  }
  return { start, end, intervals };
}
