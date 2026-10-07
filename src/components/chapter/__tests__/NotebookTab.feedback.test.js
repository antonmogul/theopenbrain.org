import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import NotebookTab from "@/components/chapter/sidebar/NotebookTab.vue";

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user: ref(null) }),
}));
vi.mock("@/composables/useTrendingHighlights", () => ({
  useTrendingHighlights: () => ({
    trending: ref([]),
    loading: ref(false),
    fetchTrending: vi.fn(),
    scrollToHighlight: vi.fn(),
    formatRelativeTime: () => "today",
    truncateText: (text) => text,
  }),
}));

const wrappers = [];
let highlights, notes, createNote, updateNote, deleteNote;
function openNotebook() {
  const wrapper = mount(NotebookTab, {
    global: {
      provide: {
        highlights: { highlights },
        notes: { notes, createNote, updateNote, deleteNote },
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
const button = (wrapper, text) =>
  wrapper.findAll("button").find((el) => el.text() === text);
beforeEach(() => {
  highlights = ref([]);
  notes = ref([]);
  createNote = vi.fn(async ({ content }) =>
    notes.value.push({ id: "note-1", content })
  );
  updateNote = vi.fn(async () => {});
  deleteNote = vi.fn(async () => {});
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

describe("Notebook: Stuart's standalone notes and tags", () => {
  it("creates a standalone note without a selection or a highlight", async () => {
    const wrapper = openNotebook();
    await button(wrapper, "Notes").trigger("click");
    expect(wrapper.text()).toContain(
      'Select text and choose Note, or click "Add Note"'
    );
    await button(wrapper, "Add Note").trigger("click");
    expect(button(wrapper, "Save").attributes("disabled")).toBeDefined();
    await wrapper.get("textarea").setValue("  Compare rods and cones  ");
    await button(wrapper, "Save").trigger("click");
    await flushPromises();
    expect(createNote).toHaveBeenCalledWith({
      content: "Compare rods and cones",
    });
    expect(wrapper.get(".note-content").text()).toBe("Compare rods and cones");
    expect(highlights.value).toEqual([]);
    expect(wrapper.find("textarea").exists()).toBe(false);
  });

  it("cancels a standalone draft without saving it", async () => {
    const wrapper = openNotebook();
    await button(wrapper, "Notes").trigger("click");
    await button(wrapper, "Add Note").trigger("click");
    await wrapper.get("textarea").setValue("Unfinished thought");
    await button(wrapper, "Cancel").trigger("click");
    expect(createNote).not.toHaveBeenCalled();
    await button(wrapper, "Add Note").trigger("click");
    expect(wrapper.get("textarea").element.value).toBe("");
  });

  it("keeps an unsaved note available after a failed save", async () => {
    createNote.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = openNotebook();
    await button(wrapper, "Notes").trigger("click");
    await button(wrapper, "Add Note").trigger("click");
    await wrapper.get("textarea").setValue("Keep this thought");
    await button(wrapper, "Save").trigger("click");
    await flushPromises();
    expect(wrapper.get("textarea").element.value).toBe("Keep this thought");
    expect(notes.value).toEqual([]);
  });

  it("groups highlights by tags, combines a color filter, and can clear each", async () => {
    highlights.value = [
      { id: "a", selected_text: "Rods", color: "yellow", tags: ["exam"] },
      {
        id: "b",
        selected_text: "Cones",
        color: "blue",
        tags: ["exam", "confusing"],
      },
      {
        id: "c",
        selected_text: "Ganglion cells",
        color: "yellow",
        tags: ["confusing"],
      },
    ];
    const wrapper = openNotebook();
    const exam = wrapper
      .findAll(".tag-chip--filter")
      .find((el) => el.text() === "exam");
    await exam.trigger("click");
    expect(exam.attributes("aria-pressed")).toBe("true");
    expect(wrapper.findAll(".highlight-item")).toHaveLength(2);
    await wrapper.get('[title="Blue"]').trigger("click");
    expect(wrapper.findAll(".highlight-item")).toHaveLength(1);
    expect(wrapper.get(".item-text").text()).toContain("Cones");
    await wrapper.get('[title="All colors"]').trigger("click");
    await exam.trigger("click");
    expect(wrapper.findAll(".highlight-item")).toHaveLength(3);
    expect(exam.attributes("aria-pressed")).toBe("false");
  });
});
