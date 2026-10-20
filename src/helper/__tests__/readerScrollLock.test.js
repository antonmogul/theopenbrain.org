import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lockReaderScroll } from "@/helper/readerScrollLock";

/* Stuart, 7 Oct: opening the chapter menu and closing it "brings me back
   to the very top of the chapter" (OPENBRAIN-145). The lock keeps the
   reader's place: if the page went to the top while locked, the release
   puts it back. */

function setScrollY(y) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  Object.defineProperty(window, "pageYOffset", {
    value: y,
    configurable: true,
  });
}

const originalScrollTo = window.scrollTo;
// happy-dom's style object reads "" after a value was cleared once; the
// style attribute is what a browser would apply, so read that.
const overflowOf = (el) =>
  /overflow:\s*([^;]+)/.exec(el.getAttribute("style") || "")?.[1] ?? "";
const htmlOverflow = () => overflowOf(document.documentElement);
const bodyOverflow = () => overflowOf(document.body);

beforeEach(() => {
  window.scrollTo = vi.fn((opts) => {
    if (opts && typeof opts === "object") setScrollY(opts.top);
  });
  setScrollY(3000);
});

afterEach(() => {
  window.scrollTo = originalScrollTo;
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
});

describe("lockReaderScroll", () => {
  it("locks html and body and restores their previous overflow", () => {
    document.body.style.overflow = "auto";
    const release = lockReaderScroll();
    expect(htmlOverflow()).toBe("hidden");
    expect(bodyOverflow()).toBe("hidden");
    release();
    expect(htmlOverflow()).toBe("");
    expect(bodyOverflow()).toBe("auto");
  });

  it("scrolls back to where it was locked if the page went to the top meanwhile", () => {
    const release = lockReaderScroll();
    setScrollY(0); // the document collapsed under the lock
    release();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 3000,
      left: 0,
      behavior: "auto",
    });
    expect(window.scrollY).toBe(3000);
  });

  it("leaves the page alone when it did not move, or moved on purpose", () => {
    let release = lockReaderScroll();
    release();
    expect(window.scrollTo).not.toHaveBeenCalled();

    // A jump started as the overlay closes (the phone scrubber) stands.
    release = lockReaderScroll();
    setScrollY(5200);
    release();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing when locked at the top", () => {
    setScrollY(0);
    const release = lockReaderScroll();
    release();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("restores only when the last nested lock releases, and a release is idempotent", () => {
    const outer = lockReaderScroll();
    const inner = lockReaderScroll();
    setScrollY(0);
    inner();
    expect(htmlOverflow()).toBe("hidden");
    expect(window.scrollTo).not.toHaveBeenCalled();
    inner();
    outer();
    expect(htmlOverflow()).toBe("");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    outer();
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });
});
