import { describe, it, expect } from "vitest";
import { mountSection } from "@/test/mountSection";
import MediaSection from "@/components/dashboard/sections/MediaSection.vue";

const emptyByType = {
  lottie: [],
  video: [],
  image: [],
  youtube: [],
  gsap: [],
  css: [],
};

describe("MediaSection (render smoke)", () => {
  const base = {
    mediaFilter: "all",
    mediaFilterOptions: [{ value: "all", label: "All" }],
    mediaLoading: false,
    mediaError: null,
    filteredMedia: [],
    mediaByType: emptyByType,
    formatFileSize: (b) => `${b} B`,
    mediaSearch: "",
    selectedMedia: null,
  };

  it("renders empty state with no media", () => {
    const w = mountSection(MediaSection, base);
    expect(w.exists()).toBe(true);
    expect(w.text()).toContain("No media found");
  });

  it("renders a lottie group with a card", () => {
    const w = mountSection(MediaSection, {
      ...base,
      filteredMedia: [{ id: "a1" }],
      mediaByType: {
        ...emptyByType,
        lottie: [{ id: "a1", title: "Spin", file_size_bytes: 1024 }],
      },
    });
    expect(w.text()).toContain("Lottie animations (1)");
    expect(w.text()).toContain("Spin");
  });

  it("emits delete from the detail modal footer for an unused asset", async () => {
    const w = mountSection(MediaSection, {
      ...base,
      selectedMedia: { id: "a1", media_type: "image", animation_key: "k" },
      mediaUsage: { places: [], states: 0, variants: 0, inUse: false },
    });
    const delBtn = w.findAll("button").find((b) => b.text() === "Delete asset");
    await delBtn.trigger("click");
    expect(w.emitted("delete")[0]).toEqual(["a1"]);
  });

  it("disables delete and lists where an asset is used (OPENBRAIN-55)", () => {
    const w = mountSection(MediaSection, {
      ...base,
      selectedMedia: { id: "a1", media_type: "image", animation_key: "k" },
      mediaUsage: {
        places: [{ chapter: "The Retina", where: "Anatomy · paragraph 3" }],
        states: 2,
        variants: 0,
        inUse: true,
      },
    });
    const delBtn = w.findAll("button").find((b) => b.text() === "Delete asset");
    expect(delBtn.attributes("disabled")).toBeDefined();
    expect(w.text()).toContain("The Retina · Anatomy · paragraph 3");
    expect(w.text()).toContain("Carries 2 figure states");
  });
});
