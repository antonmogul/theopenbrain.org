import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const routeState = { params: { video: "dowling-and-werblin" } };
const routerMock = { go: vi.fn() };

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => routerMock,
}));

import BreakView from "@/views/BreakView.vue";
import { breakVideos } from "@/stories/breakVideoFixtures";
vi.mock("@/services/api/breakVideos", () => ({
  fetchBreakVideo: vi.fn(async (slug) => breakVideos[slug] || null),
}));

const stubs = {
  RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
};

describe("BreakView", () => {
  it("plays a known break video with its caption", async () => {
    routeState.params = { video: "dowling-and-werblin" };
    const wrapper = mount(BreakView, { global: { stubs } });
    await flushPromises();
    await wrapper.get('button[aria-label^="Play video:"]').trigger("click");
    const source = wrapper.find("video source");
    expect(source.attributes("src")).toBe(
      "/publicAssets/video/breakSections/dowling-and-werblin.mp4"
    );
    expect(wrapper.text()).toContain(breakVideos["dowling-and-werblin"].title);
    expect(wrapper.find('[data-testid="break-not-found"]').exists()).toBe(
      false
    );
  });

  it("plays Baden's restored local film with its poster and caption", async () => {
    routeState.params = { video: "baden" };
    const wrapper = mount(BreakView, { global: { stubs } });
    await flushPromises();
    await wrapper.get('button[aria-label^="Play video:"]').trigger("click");
    expect(wrapper.find("video source").attributes("src")).toBe(
      "/publicAssets/videos/baden.mp4"
    );
    expect(wrapper.find("video").attributes("poster")).toBe(
      "/publicAssets/videos/baden.webp"
    );
    expect(wrapper.text()).toContain(
      "Tom Baden — Is our retina really upside down?"
    );
    expect(wrapper.find("video").attributes("autoplay")).toBeUndefined();
  });

  it("shows a not-found panel instead of a broken video for an unknown key", async () => {
    routeState.params = { video: "introduction" };
    const wrapper = mount(BreakView, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find("video").exists()).toBe(false);
    const panel = wrapper.find('[data-testid="break-not-found"]');
    expect(panel.exists()).toBe(true);
    expect(panel.text()).toContain("introduction");
    expect(panel.find("a").attributes("href")).toBe("/chapters");
  });
});
