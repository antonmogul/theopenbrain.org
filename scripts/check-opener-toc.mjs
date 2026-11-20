/* Layout regression for the no-art contents (OPENBRAIN-53). Shared by the
 * app smoke and local Chromium/WebKit checks; happy-dom cannot test sticky.
 * Returns problems so the smoke can keep reporting its other assertions. */
export async function checkOpenerToc(page) {
  return page.evaluate(async () => {
    const illustrated = document.querySelector("#chapter-toc.otoc");
    if (illustrated) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      const problems = [];
      const nav = illustrated.querySelector("nav");
      const list = illustrated.querySelector("ol");
      const rows = illustrated.querySelectorAll(".otoc__row");
      if (!rows.length) problems.push("no illustrated contents rows");
      if (innerWidth >= 1024) {
        if (Math.abs(illustrated.offsetHeight - innerHeight) > 1)
          problems.push("illustrated contents is not one screen");
        // Very short windows may intentionally scroll the column; otherwise
        // all rows must fit without clipping or changing the opener height.
        if (
          !illustrated.classList.contains("otoc--scrolls") &&
          list.scrollHeight > nav.clientHeight + 4
        )
          problems.push("illustrated contents is clipped");
      } else if (getComputedStyle(nav).overflowY === "auto")
        problems.push("phone contents traps page scrolling");
      if (illustrated.querySelector("[aria-expanded]"))
        problems.push("contents expand subsections");
      if (document.documentElement.scrollWidth > innerWidth + 1)
        problems.push("the page scrolls horizontally");
      return problems;
    }
    const block = document.querySelector("#chapter-toc.opener-toc");
    const title = block?.querySelector(".opener-toc__h1");
    const list = block?.querySelector(".opener-toc__list");
    if (!title || !list) return ["no numbered contents"];
    // WebKit can leave unused local IBM Plex faces in "loading" after
    // networkidle. Bound the wait; the geometry checks still catch a swap.
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    const problems = [];
    const rect = (el) => el.getBoundingClientRect();
    const root = document.documentElement;
    const openerHeight = () => root.style.getPropertyValue("--opener-h");
    const before = {
      y: scrollY,
      height: rect(block).height,
      h: openerHeight(),
    };
    const top = rect(block).top + scrollY;
    const pad = parseFloat(getComputedStyle(block).paddingTop);
    const bar = rect(document.querySelector(".reader-top-bar")).bottom;
    const scroll = async (y) => {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 100));
    };
    try {
      if (innerWidth >= 1024) {
        const style = getComputedStyle(title);
        const inset = parseFloat(style.top);
        if (style.position !== "sticky" || !Number.isFinite(inset))
          return ["the desktop title is not sticky"];
        if (inset < bar) problems.push("the title overlaps the top bar");
        // Leave room before the heading releases at the bottom of its column.
        const travel = list.offsetHeight - title.offsetHeight;
        if (travel < 40) return ["contents too short to exercise sticky"];
        await scroll(top + pad - inset + travel * 0.2);
        const first = {
          title: rect(title).top,
          list: rect(list).top,
          y: scrollY,
        };
        await scroll(top + pad - inset + travel * 0.6);
        if (
          Math.abs(rect(title).top - first.title) > 1 ||
          Math.abs(first.title - inset) > 1
        )
          problems.push("the title moves while the contents scroll");
        if (Math.abs(rect(list).top - first.list + scrollY - first.y) > 1)
          problems.push("the contents do not scroll with the page");
        if (rect(title).bottom > rect(block).bottom + 1)
          problems.push("the title escapes the dark block");
        await scroll(top + before.height);
        if (rect(title).bottom > bar)
          problems.push("the title stays pinned over the reading body");
      } else {
        if (getComputedStyle(title).position === "sticky")
          problems.push("the stacked title is sticky");
        await scroll(top);
        const first = {
          title: rect(title).top,
          list: rect(list).top,
          y: scrollY,
        };
        if (rect(list).top < rect(title).bottom)
          problems.push("the contents no longer stack below the title");
        await scroll(top + 120);
        if (
          Math.abs(rect(title).top - first.title + scrollY - first.y) > 1 ||
          Math.abs(rect(list).top - first.list + scrollY - first.y) > 1
        )
          problems.push(
            "the stacked title and contents do not scroll together"
          );
      }
      if (
        Math.abs(rect(block).height - before.height) > 1 ||
        openerHeight() !== before.h
      )
        problems.push("scrolling changes the opener height");
      if (root.scrollWidth > root.clientWidth + 1)
        problems.push("the page scrolls horizontally");
    } finally {
      await scroll(before.y);
    }
    return problems;
  });
}
