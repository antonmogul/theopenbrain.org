import assert from "node:assert/strict";

/** Real reader regression: the card and first figure keep the same image
 * element, layout box and fit through the reading line in both directions.
 * OPENBRAIN-100: its visual box may gently zoom (1.08→1) with the wash.
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
  const preview = page.locator(
    ".section-figure-preview:not(.fade-leave-active)"
  );
  for (; start < end; start += 50) {
    await move(start);
    if (await preview.count()) break;
  }
  assert(start < end, "matching card appears before the first figure");
  await page.waitForTimeout(600);
  const image = page.locator(".figure-pane .figimg-img:not(.figimg-wash)");
  await image.waitFor({ state: "visible" });
  const original = await image.elementHandle();
  const layoutBox = () =>
    image.evaluate((el) => ({
      left: el.offsetLeft,
      top: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
      position: getComputedStyle(el).objectPosition,
    }));
  const bounds = await layoutBox();
  const fit = await image.evaluate((el) => getComputedStyle(el).objectFit);
  assert.equal(await preview.count(), 1);
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
      // The zoom is clipped by the art box. Check the picture's visible
      // portion, including at the edge of a full-bleed photograph.
      picture: box(picture).map((v, i) =>
        i < 2
          ? Math.max(v, box(ground.parentElement)[i])
          : Math.min(v, box(ground.parentElement)[i])
      ),
      groundColour: getComputedStyle(ground).backgroundColor,
      groundUnder: Number(getComputedStyle(ground).zIndex) < 0,
      colourOver: after(picture, colour),
      blend: getComputedStyle(colour).mixBlendMode,
      scope: getComputedStyle(ground.parentElement).isolation,
    };
  });
  // Under reduced motion there is no wash at all (the plain still), which
  // is how the hosted fixture runs: check that, then only the geometry.
  const reduced = await page.evaluate(
    () =>
      document.documentElement.dataset.reduceMotion === "1" ||
      (document.documentElement.dataset.reduceMotion !== "0" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
  if (reduced) {
    assert.equal(veil, null, "no wash under reduced motion");
    assert.equal(await wash.count(), 0, "nothing is washed");
  } else {
    assert(veil, "the opener's wash has a ground and a colour layer");
    assert.equal(await wash.count(), 2, "and nothing else is washed");
    assert.equal(veil.groundColour, "rgb(255, 255, 255)", "white ground");
    assert(veil.groundUnder, "the ground is under the picture");
    assert(veil.colourOver, "the colour is over the picture");
    assert.equal(veil.blend, "multiply");
    assert.equal(veil.scope, "isolate", "multiplied with the art box only");
    assert.deepEqual(veil.colour, veil.ground, "the two layers share one box");
    assert.equal(
      veil.ground[0],
      veil.pane[0],
      "the wash reaches the left edge"
    );
    assert.equal(veil.ground[2], veil.pane[2], "and the right edge");
    assert(
      veil.ground[0] <= veil.picture[0] &&
        veil.ground[1] <= veil.picture[1] &&
        veil.ground[2] >= veil.picture[2] &&
        veil.ground[3] >= veil.picture[3],
      "the wash covers the whole picture"
    );
  }
  let previous = 1;
  const frames = [];
  for (let y = start; y <= end + 100; y += 50) {
    await move(y);
    assert(
      await image.evaluate((el, first) => el === first, original),
      "same image node through hand-over"
    );
    assert.deepEqual(
      await layoutBox(),
      bounds,
      "same image layout through hand-over"
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
    const scale = await image.evaluate((el) => {
      const zoom = el.closest("[data-section-zoom]");
      return zoom
        ? Number(
            getComputedStyle(zoom).transform.match(/matrix\(([^,]+)/)?.[1] || 1
          )
        : 1;
    });
    assert(
      Math.abs(scale - (reduced ? 1 : 1 + 0.08 * opacity)) < 0.0001,
      "zoom follows the wash without a second entrance"
    );
    frames.push({ y, opacity, scale });
  }
  assert.equal(previous, 0, "no second wash when the figure takes over");
  assert.equal(await preview.count(), 0);
  await move(Math.max(start, end - 100));
  assert(
    await image.evaluate((el, first) => el === first, original),
    "reverse scroll keeps the same image node"
  );
  assert.deepEqual(await layoutBox(), bounds);
  await original.dispose();
  return frames;
}
