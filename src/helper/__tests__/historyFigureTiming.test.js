import { afterEach, describe, expect, it } from "vitest";
import { historyFigureEnd } from "../historyFigureTiming";
const records = [
  { id: "animationFoundationsFig9", imageUrl: "/broca.jpg" },
  { id: "animationFoundationsFig10", imageUrl: "/fritsch.jpg" },
];
function fixture() {
  document.body.innerHTML = `<section id="s"><span id="triggerAnimationFoundationsFig9"></span><div class="prose"></div><span id="triggerAnimationFoundationsFig10"></span></section>`;
  const section = document.querySelector("section");
  section.getBoundingClientRect = () => ({ top: 0, bottom: 1800 });
  const [first, second] = section.querySelectorAll("span");
  first.getBoundingClientRect = () => ({ top: 300, bottom: 340 });
  second.getBoundingClientRect = () => ({ top: 1100, bottom: 1200 });
  return { section, first, second, triggers: [first, second] };
}
const viewport = { innerHeight: 800, scrollY: 200 };
afterEach(() => {
  document.body.innerHTML = "";
});
describe("History static-figure reading intervals", () => {
  it("keeps a short Broca paragraph's figure up to the next authored figure", () => {
    const { first, triggers } = fixture();
    expect(historyFigureEnd(first, triggers, records, viewport)).toBe(900);
  });
  it("holds the last figure only to the current section boundary", () => {
    const { second, triggers } = fixture();
    expect(historyFigureEnd(second, triggers, records, viewport)).toBe(1600);
  });
  it.each(["fb-slot", "wb"])(
    "stops at a %s boundary so figures cannot linger across a breakout",
    (className) => {
      const { section, first, triggers } = fixture();
      const barrier = document.createElement("div");
      barrier.className = className;
      barrier.getBoundingClientRect = () => ({ top: 750, bottom: 1000 });
      section.appendChild(barrier);
      expect(historyFigureEnd(first, triggers, records, viewport)).toBe(550);
    }
  );
  it("remeasures boundaries after viewport or chapter reflow", () => {
    const { first, second, triggers } = fixture();
    second.getBoundingClientRect = () => ({ top: 1500, bottom: 1600 });
    expect(
      historyFigureEnd(first, triggers, records, {
        innerHeight: 1000,
        scrollY: 200,
      })
    ).toBe(1200);
  });
  it.each([
    { id: "animationEyeStructur", imageUrl: "/eye.jpg" },
    { id: "animationFoundationsFig9", scroll: true, imageUrl: "/broca.jpg" },
    {
      id: "animationFoundationsFig9",
      fullscreen: true,
      imageUrl: "/broca.jpg",
    },
    { id: "animationFoundationsFig9", placeholder: true },
  ])("leaves animation/other-chapter/non-image timing alone: $id", (record) => {
    const { first, triggers } = fixture();
    first.id = `trigger${record.id}`;
    expect(historyFigureEnd(first, triggers, [record], viewport)).toBe(
      "bottom 400"
    );
  });
});
