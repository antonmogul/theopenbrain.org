import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import HighlightToolbar from "@/components/chapter/HighlightToolbar.vue";

// A note without highlighting first, and one note per highlight
// (Stuart, 24 Sep; OPENBRAIN-103).
const mountToolbar = (props) =>
  mount(HighlightToolbar, {
    props: { visible: true, position: { x: 0, y: 0 }, ...props },
    global: { stubs: { Teleport: true, Transition: false } },
  });

describe("HighlightToolbar notes", () => {
  it("offers Note on a fresh selection, which highlights and asks for a note", async () => {
    const w = mountToolbar({ mode: "create", selection: { text: "rods" } });
    await w.find('[data-testid="create-note"]').trigger("click");
    expect(w.emitted("highlight")[0][0]).toMatchObject({
      color: "yellow",
      withNote: true,
    });
  });

  it("opens straight on the note, filled from the note row", async () => {
    const w = mountToolbar({
      mode: "edit",
      activeHighlight: { id: "h1", paragraph_id: "p1", note: null, tags: [] },
      note: { id: "n1", content: "Rods see in the dark" },
      openNote: true,
    });
    await nextTick();
    const ta = w.find('[data-testid="edit-note-textarea"]');
    expect(ta.exists()).toBe(true);
    expect(ta.element.value).toBe("Rods see in the dark");
  });

  it("saves into the existing note instead of adding another", async () => {
    const w = mountToolbar({
      mode: "edit",
      activeHighlight: { id: "h1", paragraph_id: "p1", tags: [] },
      note: { id: "n1", content: "old" },
      openNote: true,
    });
    await nextTick();
    await w.find('[data-testid="edit-note-textarea"]').setValue("new");
    await w.find('[data-testid="edit-note-save"]').trigger("click");
    expect(w.emitted("save-note")[0][0]).toEqual({
      highlightId: "h1",
      paragraphId: "p1",
      noteId: "n1",
      content: "new",
    });
  });
});
