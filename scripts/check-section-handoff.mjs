import assert from "node:assert/strict";

/** Real reader regression: the card and first figure must keep the same
 * image element, box and fit through the reading line in both directions.
 * The card's colour is the opener's wash (OPENBRAIN-93): a white ground
 * under the picture and the chapter colour multiplied over it, both the
 * size of the art box, clearing together.
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
  const wash = page.locator(".figure-pane [data-figure-wash]");
  const veil = await page.evaluate(() => {
    const pane = document.querySelector(".figure-pane");
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom];
    };
    const ground = pane.querySelector(".fig-veil--ground");
    const colour = pane.querySelector(".fig-veil--colour");
    const picture = pane.querySelector(".figimg-img");
    if (!ground || !colour || !picture) return null;
    const after = (a, b) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      pane: box(pane),
      ground: box(ground),
      colour: box(colour),
      picture: box(picture),
      groundColour: getComputedStyle(ground).backgroundColor,
      groundUnder: Number(getComputedStyle(ground).zIndex) < 0,
      colourOver: after(picture, colour),
      blend: getComputedStyle(colour).mixBlendMode,
      scope: getComputedStyle(ground.parentElement).isolation,
    };
  });
  assert(veil, "the opener's wash has a ground and a colour layer");
  assert.equal(await wash.count(), 2, "and nothing else is washed");
  assert.equal(veil.groundColour, "rgb(255, 255, 255)", "white ground");
  assert(veil.groundUnder, "the ground is under the picture");
  assert(veil.colourOver, "the colour is over the picture");
  assert.equal(veil.blend, "multiply");
  assert.equal(veil.scope, "isolate", "multiplied with the art box only");
  assert.deepEqual(veil.colour, veil.ground, "the two layers share one box");
  assert.equal(veil.ground[0], veil.pane[0], "the wash reaches the left edge");
  assert.equal(veil.ground[2], veil.pane[2], "and the right edge");
  assert(
    veil.ground[0] <= veil.picture[0] &&
      veil.ground[1] <= veil.picture[1] &&
      veil.ground[2] >= veil.picture[2] &&
      veil.ground[3] >= veil.picture[3],
    "the wash covers the whole picture"
  );
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
    const opacities = await wash.evaluateAll((els) =>
      els.map((el) => Number(el.style.opacity))
    );
    const opacity = opacities[0] ?? 0;
    assert(
      opacities.every((o) => o === opacity),
      "the ground and the colour clear together"
    );
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
