import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ChapterBlockEditor from "@/components/dashboard/chapters/ChapterBlockEditor.vue";

// happy-dom has no IntersectionObserver (the preview's scroll sync uses it).
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    disconnect() {}
  }
);

// TipTap pulls in ProseMirror; the read-only contract doesn't need it.
vi.mock("@/components/Editor/TipTapEditor.vue", () => ({
  default: { template: "<div />" },
}));

const sections = [{ id: "s1", title: "Intro", slug: "intro", order_index: 0 }];
const paragraphs = [
  {
    id: "p1",
    section_id: "s1",
    order_index: 0,
    content: { blocks: [] },
    content_text: "",
    animation_id: "a1",
    animation_trigger: "auto",
  },
  {
    id: "p2",
    section_id: "s1",
    order_index: 1,
    content: { blocks: [{ type: "paragraph", content: "Text" }] },
    content_text: "Text",
    animation_id: null,
    animation_trigger: null,
  },
];
const mediaItems = [{ id: "a1", title: "Posner cueing", animation_key: "k" }];

function mountEditor(readonly) {
  return mount(ChapterBlockEditor, {
    props: { sections, paragraphs, mediaItems, readonly },
  });
}

describe("ChapterBlockEditor read-only mode (OPENBRAIN-50)", () => {
  it("offers no way to change a chapter while read-only", async () => {
    const wrapper = mountEditor(true);
    expect(wrapper.find(".media-badge-x").exists()).toBe(false);
    expect(wrapper.find(".attach-media-btn").exists()).toBe(false);
    expect(wrapper.find('[draggable="true"]').exists()).toBe(false);

    await wrapper.findAll(".block-item.paragraph")[1].trigger("click");
    expect(wrapper.find(".editor-content").exists()).toBe(false);
  });

  it("names the figure by its media title, not its trigger", () => {
    const wrapper = mountEditor(true);
    expect(wrapper.find(".media-badge-label").text()).toBe("Posner cueing");
    expect(wrapper.find(".block-preview").text()).toBe("Figure");
  });

  it("only the remove button asks to detach, once editing", async () => {
    const wrapper = mountEditor(false);
    await wrapper.find(".media-badge").trigger("click");
    expect(wrapper.emitted("detach-media")).toBeUndefined();

    const remove = wrapper.find(".media-badge-x");
    expect(remove.attributes("aria-label")).toBe(
      "Remove Posner cueing from P1"
    );
    await remove.trigger("click");
    expect(wrapper.emitted("detach-media")[0][0].id).toBe("p1");
  });

  it("closes an open paragraph editor when editing ends", async () => {
    const wrapper = mountEditor(false);
    await wrapper.findAll(".block-item.paragraph")[1].trigger("click");
    expect(wrapper.find(".editor-content").exists()).toBe(true);

    await wrapper.setProps({ readonly: true });
    expect(wrapper.find(".editor-content").exists()).toBe(false);
  });
});
