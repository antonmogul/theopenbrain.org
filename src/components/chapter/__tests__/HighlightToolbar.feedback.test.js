import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";

// "Feedback" on a selection (OPENBRAIN-204): while the book is in review the
// toolbar sends the passage to the review widget; a signed-out reviewer
// gets it alone, with no colours or Note (those need an account).
vi.mock("@/services/api/client", () => ({
  post: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: ref(false) }),
}));

const { default: HighlightToolbar } =
  await import("@/components/chapter/HighlightToolbar.vue");

const paragraphElement = { id: "para" };
const mountToolbar = async (props) => {
  const w = mount(HighlightToolbar, {
    props: {
      visible: true,
      position: { x: 0, y: 0 },
      selection: {
        text: "rods are sensitive",
        paragraphId: "p-1",
        paragraphElement,
      },
      ...props,
    },
    global: { stubs: { Teleport: true, Transition: false } },
  });
  await flushPromises();
  return w;
};

describe("HighlightToolbar in review", () => {
  it("offers Feedback and emits the passage", async () => {
    const w = await mountToolbar({ reviewing: true });
    await w.get('[data-testid="selection-feedback"]').trigger("click");
    expect(w.emitted("feedback")[0][0]).toEqual({
      text: "rods are sensitive",
      paragraphId: "p-1",
      paragraphElement,
    });
    // Signed in: the colours and Note are still there.
    expect(w.find('[data-testid="create-note"]').exists()).toBe(true);
  });

  it("a signed-out reviewer gets Feedback alone", async () => {
    const w = await mountToolbar({ reviewing: true, highlighting: false });
    expect(w.find('[data-testid="selection-feedback"]').exists()).toBe(true);
    expect(w.find('[data-testid="create-note"]').exists()).toBe(false);
    expect(w.find(".hl-divider").exists()).toBe(false);
  });

  it("on a highlight, Feedback sends the highlight's words", async () => {
    const w = await mountToolbar({
      reviewing: true,
      mode: "edit",
      selection: null,
      activeHighlight: {
        id: "h1",
        paragraph_id: "p-9",
        selected_text: "cones see colour",
        color: "yellow",
        tags: [],
      },
    });
    await w.get('[data-testid="selection-feedback"]').trigger("click");
    expect(w.emitted("feedback")[0][0]).toMatchObject({
      text: "cones see colour",
      paragraphId: "p-9",
    });
  });

  it("no Feedback when the book is not in review", async () => {
    const w = await mountToolbar({});
    expect(w.find('[data-testid="selection-feedback"]').exists()).toBe(false);
  });
});
