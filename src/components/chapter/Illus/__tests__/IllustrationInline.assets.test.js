import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
const records = ref([]);
vi.mock("@/composables/useAnimations", () => ({
  useAnimations: () => ({
    animations: records,
    fetchAnimations: async () => ({ data: records.value }),
  }),
}));
vi.mock("@/composables/useLottie", () => ({ loadLottie: vi.fn() }));
import IllustrationInline from "../IllustrationInline.vue";
const mountFigure = (id) =>
  mount(IllustrationInline, {
    props: { animationId: id },
    global: {
      stubs: {
        IllustrationComp: {
          props: ["animation"],
          template: "<div data-live-flip>{{ animation.video }}</div>",
        },
      },
    },
  });
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
describe("inline video flip cards", () => {
  it.each(["NormalVision", "Cataracts"])(
    "mounts %s without probing a nonexistent Lottie",
    async (name) => {
      records.value = [
        { id: `animation${name}`, title: name, flip: true, video: name },
      ];
      const w = mountFigure(`animation${name}`);
      await flushPromises();
      expect(w.find("[data-live-flip]").text()).toBe(name);
      expect(fetch).not.toHaveBeenCalled();
      w.unmount();
    }
  );
  it("warns when a database record is missing", async () => {
    records.value = [];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = mountFigure("animationMissing");
    await flushPromises();
    expect(w.find("figure").exists()).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("animationMissing")
    );
    w.unmount();
    warn.mockRestore();
  });
});

it("keeps an inline YouTube figure local until the reader presses play", async () => {
  records.value = [
    {
      id: "animationWavesOfActivity",
      title: "Spontaneous waves of activity",
      illuImage: true,
      youtubeID: "k0_HXpcH4zI",
    },
  ];
  const w = mountFigure("animationWavesOfActivity");
  await flushPromises();
  expect(w.find("iframe").exists()).toBe(false);
  await w
    .get('button[aria-label="Play video: Spontaneous waves of activity"]')
    .trigger("click");
  expect(w.get("iframe").attributes("src")).toContain(
    "https://www.youtube-nocookie.com/embed/k0_HXpcH4zI"
  );
  w.unmount();
});
