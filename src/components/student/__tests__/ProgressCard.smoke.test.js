import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ProgressCard from "@/components/student/ProgressCard.vue";

const RouterLinkStub = {
  name: "RouterLink",
  props: ["to"],
  template: '<a href="#"><slot /></a>',
};

const continueReading = {
  module: {
    title: "Foundations of Neuroscience",
    slug: "foundations-of-neuroscience",
    order_index: 2,
  },
  course: { title: "The Open Brain" },
  scrollPosition: 42.4,
  lastAccessedAt: new Date(),
};

describe("ProgressCard", () => {
  it("renders Continue Reading as a keyboard-operable link with resume intent", () => {
    const wrapper = mount(ProgressCard, {
      props: { continueReading },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toEqual({
      name: "chapter",
      params: { number: 2, slug: "foundations-of-neuroscience" },
      query: { resume: "1" },
    });
    expect(wrapper.get("a").attributes("aria-label")).toContain(
      "at 42 percent"
    );
  });

  it("exposes the visual percentage as an accessible progressbar", () => {
    const wrapper = mount(ProgressCard, {
      props: { continueReading },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });

    const progress = wrapper.get('[role="progressbar"]');
    expect(progress.attributes("aria-valuenow")).toBe("42");
    expect(progress.attributes("aria-valuemax")).toBe("100");
  });
});
