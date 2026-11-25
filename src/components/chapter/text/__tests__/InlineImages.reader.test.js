import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import SectionComp from "../SectionComp.vue";
import {
  transformParagraph,
  contentBlocksToHTML,
} from "@/composables/chapterTransform.mjs";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";

vi.mock("gsap/ScrollTrigger", () => ({ default: { refresh: vi.fn() } }));
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});
const image = {
  type: "image",
  src: "waveLength",
  caption: "Rod and cone spectra",
  figureNumber: 9,
  title: "Absorption spectra",
};
const row = (blocks) => ({ id: "photoreceptors", content: { blocks } });

describe("image blocks through the real reader", () => {
  it.each([false, true])(
    "renders one copy after transform and resize (narrow=%s)",
    async (initialNarrow) => {
      let narrow = initialNarrow;
      const listeners = new Set();
      vi.stubGlobal("matchMedia", (query) => ({
        matches: query === READER_NARROW_QUERY && narrow,
        addEventListener: (_, fn) => {
          if (query === READER_NARROW_QUERY) listeners.add(fn);
        },
        removeEventListener: (_, fn) => listeners.delete(fn),
      }));
      const paragraph = transformParagraph(
        row([{ type: "text", content: "Photoreceptors detect light." }, image])
      );
      wrapper = mount(SectionComp, {
        props: {
          section: {
            id: "section",
            title: "Photoreceptors",
            paragraphs: [paragraph],
          },
          index: 0,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            StartEndIcon: true,
            IllustrationInline: true,
            FullScreenIllustration: true,
            Transition: true,
          },
        },
      });
      for (const next of [initialNarrow, !initialNarrow, initialNarrow]) {
        narrow = next;
        for (const fn of listeners) fn({ matches: narrow });
        await flushPromises();
        // Count the whole paragraph + its slot: counting only inside the
        // shell missed the raw, oversized copy injected into v-html.
        expect(
          wrapper.findAll('img[src="/publicAssets/images/waveLength.png"]')
        ).toHaveLength(1);
        expect(wrapper.find("[data-paragraph-id] img").exists()).toBe(false);
        expect(wrapper.find("[data-inline-image]").exists()).toBe(narrow);
        expect(wrapper.find(".w-text").exists()).toBe(!narrow);
        expect(wrapper.find("[data-figure-number='9']").exists()).toBe(true);
      }
    }
  );

  it("preserves additional images and stored blocks for editing", () => {
    const blocks = [
      { type: "image", src: "other" },
      { type: "text", content: "Prose" },
      image,
    ];
    const p = transformParagraph(row(blocks));
    expect(p.text).toContain("other.png");
    expect(p.text).not.toContain("waveLength.png");
    expect(p.img).toBe("waveLength");
    expect(p.imgCap).toBe(image.caption);
    expect(p.blocks).toBe(blocks);
    // Standalone HTML conversion still includes its images; only the
    // reader hands one image to the separate InlineImages renderer.
    expect(contentBlocksToHTML(blocks).text).toContain("waveLength.png");
  });
});
