// @vitest-environment happy-dom
/*
 * The chapter's references, full width (OPENBRAIN-179): the list, its
 * filter, the jump from the text and the way back.
 */
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jumpToElement = vi.fn(() => true);
vi.mock("@/helper/readerJump", () => ({
  jumpToElement: (...a) => jumpToElement(...a),
}));

import ChapterReferences from "../ChapterReferences.vue";
import ReferenceList from "../ReferenceList.vue";
import FurtherReading from "../FurtherReading.vue";
import {
  forgetReferenceJump,
  jumpToReference,
  referenceListOnPage,
  returnFromReference,
  useReferenceJump,
} from "@/composables/useReferenceJump";

const REFS = Array.from({ length: 14 }, (_, i) => ({
  number: i + 1,
  authors: `Author${i + 1}, A`,
  title: `Title number ${i + 1}`,
  year: 1900 + i,
  doi: i % 2 ? `10.1000/x${i + 1}` : null,
  url: i % 2 ? null : `https://example${i + 1}.org/page`,
  raw_text: `Author${i + 1}, A. Title number ${i + 1}. <em>Journal</em> (${1900 + i}).`,
}));
REFS[2].raw_text =
  "Golgi, C. Sulla fina anatomia. <em>Histochemistry</em> (1902).";
REFS[2].authors = "Golgi, C";
REFS[2].title = "Sulla fina anatomia";

// An IntersectionObserver the test drives.
let intersect = null;
class Observer {
  constructor(callback) {
    intersect = (isIntersecting) => callback([{ isIntersecting }]);
  }
  observe() {}
  disconnect() {}
}

const wrappers = [];
function mountList(props = {}) {
  const wrapper = mount(ChapterReferences, {
    props: {
      references: REFS,
      title: "References",
      label: "6",
      sectionId: "section-refs",
      sectionSlug: "references",
      ...props,
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", Observer);
  jumpToElement.mockClear();
  forgetReferenceJump();
});
afterEach(() => {
  for (const w of wrappers.splice(0)) w.unmount();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the list", () => {
  it("is the section: its id, slug, number and title, and how many sources", () => {
    const wrapper = mountList();
    const root = wrapper.find("[data-chapter-references]");
    expect(root.attributes("id")).toBe("section-refs");
    expect(root.attributes("data-section-slug")).toBe("references");
    expect(root.attributes("role")).toBe("region");
    expect(wrapper.find(".cr-n").text()).toBe("6");
    expect(wrapper.find(".cr-title").text()).toBe("6References");
    expect(wrapper.find(".cr-count").text()).toBe("14 sources");
    expect(referenceListOnPage()).toBe(true);
  });

  it("carries no section id or number for a chapter whose list is not a section", () => {
    const wrapper = mountList({
      label: "",
      sectionId: null,
      sectionSlug: null,
      references: REFS.slice(0, 1),
    });
    const root = wrapper.find("[data-chapter-references]");
    expect(root.attributes("id")).toBeUndefined();
    expect(root.attributes("data-section-slug")).toBeUndefined();
    expect(wrapper.find(".cr-n").exists()).toBe(false);
    expect(wrapper.find(".cr-count").text()).toBe("1 source");
  });

  it("gives every entry its anchor, its number, its text and its links", () => {
    const wrapper = mountList();
    const items = wrapper.findAll(".ref-list__item");
    expect(items).toHaveLength(14);
    expect(items[0].attributes("id")).toBe("ref-1");
    expect(items[0].find(".ref-list__n").text()).toBe("1");
    expect(items[0].find(".ref-authors").text()).toBe("Author1, A.");
    expect(items[0].find(".ref-title").text()).toBe("Title number 1");
    const web = items[0].find(".ref-list__source");
    expect(web.attributes("href")).toBe("https://example1.org/page");
    expect(web.attributes("target")).toBe("_blank");
    expect(web.attributes("rel")).toBe("noopener noreferrer");
    expect(web.text()).toContain("example1.org");
    const doi = items[1].find(".ref-list__source");
    expect(doi.attributes("href")).toBe("https://doi.org/10.1000/x2");
    expect(doi.attributes("data-kind")).toBe("doi");
    expect(doi.text()).toContain("doi:10.1000/x2");
  });
});

describe("the filter", () => {
  it("is only offered on a list long enough to need one", () => {
    expect(mountList().find("#chapter-references-filter").exists()).toBe(true);
    expect(
      mountList({ references: REFS.slice(0, 5) })
        .find("#chapter-references-filter")
        .exists()
    ).toBe(false);
  });

  it("narrows the list to entries holding every word, and says how many", async () => {
    const wrapper = mountList();
    await wrapper.find("#chapter-references-filter").setValue("GOLGI 1902");
    expect(
      wrapper.findAll(".ref-list__item").map((i) => i.attributes("id"))
    ).toEqual(["ref-3"]);
    expect(wrapper.find(".cr-count").text()).toBe("1 of 14 sources");
    // A DOI is searchable too.
    await wrapper.find("#chapter-references-filter").setValue("10.1000/x4");
    expect(wrapper.findAll(".ref-list__item")).toHaveLength(1);
  });

  it("says so when nothing matches, and shows everything again on request", async () => {
    const wrapper = mountList();
    await wrapper.find("#chapter-references-filter").setValue("zzz");
    expect(wrapper.find(".ref-list").exists()).toBe(false);
    expect(wrapper.find(".cr-none").text()).toContain("“zzz”");
    await wrapper.find(".cr-none-all").trigger("click");
    expect(wrapper.findAll(".ref-list__item")).toHaveLength(14);
  });

  it("is dropped when the address names an entry", async () => {
    const wrapper = mountList();
    await wrapper.find("#chapter-references-filter").setValue("golgi");
    window.location.hash = "#ref-9";
    window.dispatchEvent(new Event("hashchange"));
    await flushPromises();
    expect(wrapper.findAll(".ref-list__item")).toHaveLength(14);
    window.location.hash = "";
  });
});

describe("from the text to an entry, and back", () => {
  it("lands the entry mid-screen, flashed and focused, even through a filter", async () => {
    const wrapper = mountList();
    await wrapper.find("#chapter-references-filter").setValue("golgi");
    expect(document.getElementById("ref-9")).toBeNull();

    const citation = document.createElement("sup");
    document.body.appendChild(citation);
    expect(await jumpToReference(9, citation)).toBe(true);

    expect(wrapper.find("#chapter-references-filter").element.value).toBe("");
    expect(jumpToElement).toHaveBeenCalledWith(
      document.getElementById("ref-9"),
      expect.objectContaining({ align: "center", flash: true, focus: true })
    );
  });

  it("offers the way back while the reader is in the list, and takes it", async () => {
    mountList();
    const citation = document.createElement("sup");
    document.body.appendChild(citation);
    await jumpToReference(2, citation);
    await flushPromises();
    intersect(true);

    const pill = document.querySelector("[data-reference-return]");
    expect(pill).not.toBeNull();
    expect(pill.textContent).toContain("Back to the text");

    jumpToElement.mockClear();
    pill.querySelector(".cr-return-back").click();
    await flushPromises();
    expect(jumpToElement).toHaveBeenCalledWith(
      citation,
      expect.objectContaining({ align: "center", flash: true, remember: false })
    );
    expect(document.querySelector("[data-reference-return]")).toBeNull();
  });

  it("drops the way back once the reader has left the list, or says to stay", async () => {
    mountList();
    const citation = document.createElement("sup");
    document.body.appendChild(citation);

    await jumpToReference(2, citation);
    await flushPromises();
    // Still on the way there: the list is not on screen yet.
    intersect(false);
    await flushPromises();
    expect(document.querySelector("[data-reference-return]")).not.toBeNull();
    intersect(true);
    intersect(false);
    await flushPromises();
    expect(document.querySelector("[data-reference-return]")).toBeNull();

    await jumpToReference(3, citation);
    await flushPromises();
    document.querySelector(".cr-return-close").click();
    await flushPromises();
    expect(document.querySelector("[data-reference-return]")).toBeNull();
  });

  it("offers no way back for a jump that came from nowhere, and none to a place that is gone", async () => {
    mountList();
    await jumpToReference(2);
    await flushPromises();
    expect(document.querySelector("[data-reference-return]")).toBeNull();

    const gone = document.createElement("sup");
    await jumpToReference(2, gone); // never attached
    jumpToElement.mockClear();
    expect(returnFromReference()).toBe(false);
    expect(jumpToElement).not.toHaveBeenCalled();
  });

  it("moves nothing for a number the list does not have", async () => {
    mountList();
    expect(await jumpToReference(99)).toBe(false);
    expect(jumpToElement).not.toHaveBeenCalled();
  });

  it("goes again when the first scroll was stopped before it moved", async () => {
    mountList();
    const entry = document.getElementById("ref-12");
    entry.getBoundingClientRect = () => ({ top: 5000, bottom: 5100 });
    await jumpToReference(12);
    expect(jumpToElement).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    expect(jumpToElement).toHaveBeenCalledTimes(2);
    expect(jumpToElement).toHaveBeenLastCalledWith(
      entry,
      expect.objectContaining({ remember: false })
    );
  });

  it("leaves a jump that arrived alone", async () => {
    mountList();
    const entry = document.getElementById("ref-12");
    entry.getBoundingClientRect = () => ({ top: 300, bottom: 400 });
    await jumpToReference(12);
    vi.advanceTimersByTime(400);
    expect(jumpToElement).toHaveBeenCalledTimes(1);
  });

  it("forgets the way back when the list goes away", async () => {
    const wrapper = mountList();
    const citation = document.createElement("sup");
    document.body.appendChild(citation);
    await jumpToReference(2, citation);
    wrapper.unmount();
    wrappers.length = 0;
    expect(useReferenceJump().returnTo.value).toBeNull();
    expect(referenceListOnPage()).toBe(false);
  });
});

describe("Further reading", () => {
  const content = {
    title: "Further reading:",
    paragraphs: [
      {
        title: "For a broader overview, see these.",
        links: [
          { url: "#ref-2", text: "2. Gross — A Hole in the Head" },
          { url: "https://webvision.med.utah.edu/", text: "Webvision" },
        ],
      },
    ],
  };

  it("drops the title's lead-in colon and keeps the authors' words", () => {
    const wrapper = mount(FurtherReading, { props: { content } });
    expect(wrapper.find("#further-reading-title").text()).toBe(
      "Further reading"
    );
    expect(wrapper.text()).toContain("For a broader overview, see these.");
    wrapper.unmount();
  });

  it("lands a link to an entry through the list, with the way back", async () => {
    mountList();
    const wrapper = mount(FurtherReading, {
      props: { content },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    const [toEntry, outside] = wrapper.findAll("a");
    await toEntry.trigger("click");
    await flushPromises();
    expect(jumpToElement).toHaveBeenCalledWith(
      document.getElementById("ref-2"),
      expect.objectContaining({ flash: true })
    );
    expect(useReferenceJump().returnTo.value.origin).toBe(toEntry.element);
    // A link out is the browser's own.
    jumpToElement.mockClear();
    await outside.trigger("click");
    await flushPromises();
    expect(jumpToElement).not.toHaveBeenCalled();
    expect(outside.attributes("target")).toBe("_blank");
  });

  it("falls back to the address when the list is not on the page", async () => {
    const wrapper = mount(FurtherReading, {
      props: { content },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    await wrapper.find("a").trigger("click");
    await flushPromises();
    expect(jumpToElement).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#ref-2");
    window.location.hash = "";
  });
});

describe("ReferenceList on its own (a text column)", () => {
  it("lists a chapter's own entries as they are", () => {
    const wrapper = mount(ReferenceList, {
      props: {
        references: [
          { number: 7, html: "Hubel, D. H. Eye, brain and vision." },
        ],
      },
    });
    const item = wrapper.find("#ref-7");
    expect(item.find(".ref-list__text").text()).toBe(
      "Hubel, D. H. Eye, brain and vision."
    );
    expect(item.find(".ref-list__links").exists()).toBe(false);
    wrapper.unmount();
  });
});
