import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount, flushPromises } from "@vue/test-utils";

// What ChapterView hands the reader chrome (review of #119): the draft
// notice goes to the top bar (as a fixed ribbon it covered the creator's
// Edit chapter toggle), and a highlight update that fails to save is
// reported back to the toolbar instead of only logged.
const { stubComponent, state } = vi.hoisted(() => ({
  stubComponent: { template: "<div />" },
  state: {
    status: "draft",
    updateHighlight: null,
    createHighlight: null,
    fetchHighlights: null,
    refreshTrending: null,
    selection: null,
  },
}));

vi.mock("@/components/chapter/TextComp.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/Illus/IllustrationsComp.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/opener/ChapterOpener.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/icons/custom/CloseIcon.vue", () => ({ default: stubComponent }));
vi.mock("@/components/chapter/text/CommentComp.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/text/FootNotesWindow.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/ReaderSidebar.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/CitationTooltip.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/EndOfChapterCallout.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/timeline/ChapterTimeline.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/ReaderTopBar.vue", () => ({
  default: {
    name: "ReaderTopBar",
    props: [
      "chapterTitle",
      "chapterNumber",
      "sections",
      "isAuthenticated",
      "isDraft",
    ],
    template: '<div data-testid="reader-top-bar" />',
  },
}));
vi.mock("@/components/chapter/HighlightToolbar.vue", () => ({
  default: {
    name: "HighlightToolbar",
    props: [
      "visible",
      "position",
      "selection",
      "mode",
      "activeHighlight",
      "note",
      "openNote",
    ],
    emits: [
      "highlight",
      "cancel",
      "update-highlight",
      "delete-highlight",
      "save-note",
    ],
    template: '<div data-testid="highlight-toolbar" />',
  },
}));

vi.mock("@/composables/useChapterTimeline", async () => {
  const { computed, ref } = await vi.importActual("vue");
  return {
    useChapterTimeline: () => ({
      model: computed(() => ({ items: [], sections: [], byId: new Map() })),
      position: ref(0),
      layers: computed(() => ({
        highlights: new Map(),
        notes: new Map(),
        trending: new Map(),
      })),
      jumpTo: vi.fn(),
      refreshTrending: (...args) => state.refreshTrending(...args),
    }),
  };
});

vi.mock("vue-router", async () => {
  const { reactive } = await vi.importActual("vue");
  const route = reactive({
    params: { number: "4", slug: "stress" },
    query: {},
  });
  return { useRoute: () => route, onBeforeRouteLeave: () => {} };
});

vi.mock("@/stores", async () => {
  const { reactive } = await vi.importActual("vue");
  const general = reactive({
    progress: 0,
    isScrolling: false,
    superScriptActive: false,
  });
  const text = reactive({
    text: null,
    updateText(_part, nextText) {
      this.text = nextText;
    },
  });
  return {
    useGeneral: () => general,
    useText: () => text,
    useCom: () => ({ activeCom: false }),
  };
});

vi.mock("@/composables/useChapter", async () => {
  const { ref } = await vi.importActual("vue");
  const transformedData = ref(null);
  const chapterData = ref(null);
  const fetchChapter = vi.fn(async (slug) => {
    const data = {
      moduleId: "module-stress",
      intro: [{ id: "intro", title: "Stress", paragraphs: [] }],
      sections: [],
    };
    transformedData.value = data;
    chapterData.value = {
      id: "module-stress",
      slug,
      title: "Stress",
      order_index: 4,
      status: state.status,
    };
    return { data, error: null };
  });
  return {
    useChapter: () => ({
      fetchChapter,
      chapterData,
      transformedData,
      loading: ref(false),
      error: ref(null),
    }),
  };
});

vi.mock("@/composables/useReadingProgress", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useReadingProgress: () => ({
      initForModule: vi.fn(),
      progress: ref(null),
      scrollPercent: ref(0),
      timeSpent: ref(0),
      saveError: ref(null),
      identityVersion: ref(0),
      readyIdentityVersion: ref(null),
      retrySave: vi.fn(),
      stopTracking: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useAuth", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useAuth: () => ({ user: ref({ id: "u1" }), isAuthenticated: ref(true) }),
  };
});

vi.mock("@/composables/useTextSelection", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    editToolbarPosition: (rect) => ({ x: 0, y: rect.bottom, above: false }),
    useTextSelection: () => {
      state.selection = {
        selection: ref(null),
        toolbarPosition: ref({ x: 0, y: 0 }),
        showToolbar: ref(true),
        activeHighlight: ref({ id: "h1", is_public: false }),
        toolbarMode: ref("edit"),
        clearSelection: vi.fn(),
      };
      return state.selection;
    },
  };
});

vi.mock("@/composables/useHighlights", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useHighlights: () => ({
      highlights: ref([]),
      highlightsByParagraph: ref({}),
      fetchHighlights: (...args) => state.fetchHighlights(...args),
      createHighlight: (...args) => state.createHighlight(...args),
      updateHighlight: (...args) => state.updateHighlight(...args),
      deleteHighlight: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useHighlightRenderer", () => ({
  useHighlightRenderer: () => ({ renderAllHighlights: vi.fn() }),
}));

vi.mock("@/composables/useNotes", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useNotes: () => ({
      notes: ref([]),
      fetchNotes: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useReferences", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useReferences: () => ({
      references: ref([]),
      fetchRefs: vi.fn(),
      getReference: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useChapterCatalog", () => ({
  useChapterCatalog: () => ({
    fetchCatalog: vi.fn(),
    nextAfter: vi.fn(),
    findById: vi.fn(),
  }),
}));

import ChapterView from "@/views/ChapterView.vue";

let log;
let error;

beforeEach(() => {
  const storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  });
  state.status = "draft";
  state.updateHighlight = vi.fn(async () => {});
  state.createHighlight = vi.fn(async () => ({
    id: "h-new",
    color: "yellow",
    tags: [],
    paragraph_id: "p1",
    selected_text: "rods",
    is_public: false,
  }));
  state.fetchHighlights = vi.fn(async () => {});
  state.refreshTrending = vi.fn();
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
  error.mockRestore();
  vi.unstubAllGlobals();
});

async function mountView() {
  const wrapper = shallowMount(ChapterView, {
    global: { stubs: { RouterLink: stubComponent } },
  });
  await flushPromises();
  return wrapper;
}

describe("ChapterView reader chrome", () => {
  it("marks a draft in the top bar, with no ribbon of its own", async () => {
    const wrapper = await mountView();
    const bar = wrapper.findComponent({ name: "ReaderTopBar" });
    expect(bar.props("isDraft")).toBe(true);
    expect(wrapper.find(".draft-ribbon").exists()).toBe(false);
    wrapper.unmount();
  });

  it("does not mark a published chapter", async () => {
    state.status = "published";
    const wrapper = await mountView();
    expect(
      wrapper.findComponent({ name: "ReaderTopBar" }).props("isDraft")
    ).toBe(false);
    wrapper.unmount();
  });

  // The selection's "Note" reopens the toolbar on the new highlight, note
  // open: placed as for a highlight, not at the selection pill's spot above
  // the passage, which the taller toolbar would cover or run off.
  it("reopens the toolbar for a note where an edit toolbar goes", async () => {
    const wrapper = await mountView();
    const { selection, toolbarPosition, activeHighlight } = state.selection;
    selection.value = {
      text: "rods",
      paragraphId: "p1",
      startOffset: 0,
      endOffset: 4,
      range: {
        getBoundingClientRect: () => ({ top: 200, bottom: 224, left: 0 }),
      },
    };
    toolbarPosition.value = { x: 0, y: 150, above: true };
    wrapper
      .findComponent({ name: "HighlightToolbar" })
      .vm.$emit("highlight", { color: "yellow", withNote: true });
    await flushPromises();

    expect(activeHighlight.value?.id).toBe("h-new");
    // editToolbarPosition's answer for the selection's rect (mocked above).
    expect(toolbarPosition.value).toEqual({ x: 0, y: 224, above: false });
    wrapper.unmount();
  });

  it("tells the toolbar when a share fails to save", async () => {
    state.updateHighlight = vi.fn(async () => {
      throw new Error("API Error 500");
    });
    const wrapper = await mountView();
    const done = vi.fn();
    wrapper
      .findComponent({ name: "HighlightToolbar" })
      .vm.$emit("update-highlight", {
        id: "h1",
        updates: { is_public: true },
        done,
      });
    await flushPromises();

    expect(state.updateHighlight).toHaveBeenCalledWith("h1", {
      is_public: true,
    });
    expect(done).toHaveBeenCalledWith(false);
    // Nothing changed, so nothing to refresh.
    expect(state.fetchHighlights).not.toHaveBeenCalled();
    expect(state.refreshTrending).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("tells the toolbar a share saved, then refreshes the marks and Trending", async () => {
    const wrapper = await mountView();
    const done = vi.fn();
    wrapper
      .findComponent({ name: "HighlightToolbar" })
      .vm.$emit("update-highlight", {
        id: "h1",
        updates: { is_public: true },
        done,
      });
    await flushPromises();

    expect(done).toHaveBeenCalledWith(true);
    expect(state.fetchHighlights).toHaveBeenCalled();
    expect(state.refreshTrending).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("still reports a saved share when refreshing afterwards fails", async () => {
    state.fetchHighlights = vi.fn(async () => {
      throw new Error("offline");
    });
    const wrapper = await mountView();
    const done = vi.fn();
    wrapper
      .findComponent({ name: "HighlightToolbar" })
      .vm.$emit("update-highlight", {
        id: "h1",
        updates: { is_public: false },
        done,
      });
    await flushPromises();

    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });
});
