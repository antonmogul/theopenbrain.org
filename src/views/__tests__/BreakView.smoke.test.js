import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const routeState = { params: { video: "dowling-and-werblin" } };
const routerMock = { go: vi.fn() };

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => routerMock,
}));

import BreakView from "@/views/BreakView.vue";
import breakVideos from "@/assets/json_backend/breakVideos.json";

const stubs = {
  RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
};

describe("BreakView", () => {
  it("plays a known break video with its caption", () => {
    routeState.params = { video: "dowling-and-werblin" };
    const wrapper = mount(BreakView, { global: { stubs } });
    const source = wrapper.find("video source");
    expect(source.attributes("src")).toBe(
      "/publicAssets/video/breakSections/dowling-and-werblin.mp4"
    );
    expect(wrapper.text()).toContain(
      breakVideos.videos["dowling-and-werblin"].title
    );
    expect(wrapper.find('[data-testid="break-not-found"]').exists()).toBe(
      false
    );
  });

  it("shows a not-found panel instead of a broken video for an unknown key", () => {
    routeState.params = { video: "introduction" };
    const wrapper = mount(BreakView, { global: { stubs } });
    expect(wrapper.find("video").exists()).toBe(false);
    const panel = wrapper.find('[data-testid="break-not-found"]');
    expect(panel.exists()).toBe(true);
    expect(panel.text()).toContain("introduction");
    expect(panel.find("a").attributes("href")).toBe("/chapters");
  });
});
