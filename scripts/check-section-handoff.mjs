import assert from "node:assert/strict";

/** Real reader regression: the card and first figure must keep the same
 * image element, box and fit through the reading line in both directions.
 * Runs in the hosted History fixture and against a local preview.
 * `slug` is the section whose first figure carries its card: History's
 * first section by default, "closing-words" once its row names the cover
 * as its picture's wash (OPENBRAIN-86). */
export async function checkSectionHandoff(page, slug = "where-is-my-mind") {
  const width = await page.evaluate(() => innerWidth);
  if (width < 1024) {
    assert.equal(await page.locator("[data-section-card]").count(), 0);
    return;
  }
  const trigger = page
    .locator(`[data-section-slug="${slug}"] .animationTrigger`)
    .first();
  const end = await trigger.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY - innerHeight / 2
  );
  const move = async (y) => {
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(100);
  };
  // A previous figure keeps its authored hold into the gap. Find the
  // actual card interval rather than assuming it begins 400px early.
  let start = end - 600;
  for (; start < end; start += 50) {
    await move(start);
    if (await page.locator(".section-figure-preview").count()) break;
  }
  assert(start < end, "matching card appears before the first figure");
  await page.waitForTimeout(600);
  const image = page.locator(".figure-pane .figimg-img:not(.figimg-wash)");
  await image.waitFor({ state: "visible" });
  const original = await image.elementHandle();
  const bounds = await image.boundingBox();
  const fit = await image.evaluate((el) => getComputedStyle(el).objectFit);
  assert.equal(await page.locator(".section-figure-preview").count(), 1);
  let previous = 1;
  const frames = [];
  for (let y = start; y <= end + 100; y += 50) {
    await move(y);
    assert(
      await image.evaluate((el, first) => el === first, original),
      "same image node through hand-over"
    );
    assert.deepEqual(
      await image.boundingBox(),
      bounds,
      "same image box through hand-over"
    );
    assert.equal(
      await image.evaluate((el) => getComputedStyle(el).objectFit),
      fit
    );
    const wash = page.locator(".figure-pane [data-figure-wash]");
    const opacity = (await wash.count())
      ? Number(await wash.evaluate((el) => el.style.opacity))
      : 0;
    assert(opacity <= previous + 0.001, "wash clears monotonically");
    previous = opacity;
    frames.push({ y, opacity });
  }
  assert.equal(previous, 0, "no second wash when the figure takes over");
  assert.equal(await page.locator(".section-figure-preview").count(), 0);
  await move(Math.max(start, end - 100));
  assert(
    await image.evaluate((el, first) => el === first, original),
    "reverse scroll keeps the same image node"
  );
  assert.deepEqual(await image.boundingBox(), bounds);
  await original.dispose();
  return frames;
}
