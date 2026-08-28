import { describe, expect, it, vi } from "vitest";
import { shallowMount, flushPromises } from "@vue/test-utils";

const { stubComponent } = vi.hoisted(() => ({
  stubComponent: { template: "<div />" },
}));
const { testInitForModule, testStopTracking } = vi.hoisted(() => ({
  testInitForModule: vi.fn(),
  testStopTracking: vi.fn(),
}));
vi.mock("@/components/chapter/TextComp.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/Illus/IllustrationsComp.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/text/EyeStart.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/icons/custom/CloseIcon.vue", () => ({ default: stubComponent }));
vi.mock("@/components/chapter/text/CommentComp.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/text/FootNotesWindow.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/Navigation/MenuTutorial.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/HighlightToolbar.vue", () => ({
  default: stubComponent,
}));
vi.mock("@/components/chapter/ReaderTopBar.vue", () => ({
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

vi.mock("vue-router", async () => {
  const { reactive } = await vi.importActual("vue");
  const route = reactive({
    params: { number: "1", slug: "the-retina" },
    query: {},
  });
  return {
    useRoute: () => route,
    testRoute: route,
  };
});

vi.mock("@/stores", async () => {
  const { reactive } = await vi.importActual("vue");
  const general = reactive({
    progress: 0,
    isScrolling: false,
    imgActive: false,
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
  const loading = ref(false);
  const error = ref(null);
  const fetchChapter = vi.fn(async (slug) => {
    if (slug === "the-retina") {
      const data = {
        moduleId: "module-retina",
        intro: [{ id: "intro", title: "The Retina", paragraphs: [] }],
        sections: [],
      };
      transformedData.value = data;
      error.value = null;
      return { data, error: null };
    }

    transformedData.value = null;
    error.value = `Chapter with slug "${slug}" not found`;
    return { data: null, error: new Error(error.value) };
  });
  return {
    useChapter: () => ({ fetchChapter, transformedData, loading, error }),
  };
});

vi.mock("@/composables/useReadingProgress", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useReadingProgress: () => ({
      initForModule: testInitForModule,
      progress: ref(null),
      scrollPercent: ref(0),
      timeSpent: ref(0),
      saveError: ref(null),
      identityVersion: ref(0),
      readyIdentityVersion: ref(null),
      retrySave: vi.fn(),
      stopTracking: testStopTracking,
    }),
  };
});

vi.mock("@/composables/useAuth", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useAuth: () => ({ user: ref(null), isAuthenticated: ref(false) }),
  };
});

vi.mock("@/composables/useTextSelection", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useTextSelection: () => ({
      selection: ref(null),
      toolbarPosition: ref(null),
      showToolbar: ref(false),
      activeHighlight: ref(null),
      toolbarMode: ref("create"),
      clearSelection: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useHighlights", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useHighlights: () => ({
      highlights: ref([]),
      loading: ref(false),
      highlightsByParagraph: ref({}),
      fetchHighlights: vi.fn(),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(),
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
      loading: ref(false),
      fetchRefs: vi.fn(),
      getReference: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useReaderSidebar", async () => {
  const { ref } = await vi.importActual("vue");
  return {
    useReaderSidebar: () => ({ toggle: vi.fn(), isOpen: ref(false) }),
  };
});

vi.mock("@/composables/useChapterCatalog", () => ({
  useChapterCatalog: () => ({
    fetchCatalog: vi.fn(),
    nextAfter: vi.fn(),
    findById: vi.fn(),
  }),
}));

import { testRoute } from "vue-router";
import ChapterView from "@/views/ChapterView.vue";

describe("ChapterView route changes", () => {
  it("does not initialize the preceding module after valid-to-missing navigation", async () => {
    const storage = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      clear: () => storage.clear(),
    });
    localStorage.clear();
    testRoute.params.number = "1";
    testRoute.params.slug = "the-retina";
    testRoute.query = {};
    testInitForModule.mockClear();
    testStopTracking.mockClear();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = shallowMount(ChapterView, {
      global: { stubs: { RouterLink: stubComponent } },
    });
    await flushPromises();

    expect(testInitForModule).toHaveBeenCalledTimes(1);
    expect(testInitForModule).toHaveBeenLastCalledWith("module-retina", null);

    testRoute.params.number = "2";
    testRoute.params.slug = "visual-perception-ux";
    await flushPromises();
    await flushPromises();

    expect(testStopTracking).toHaveBeenCalledTimes(1);
    expect(testInitForModule).toHaveBeenCalledTimes(2);
    expect(testInitForModule).toHaveBeenLastCalledWith(null, null);
    expect(wrapper.text()).toContain("Chapter not found");

    wrapper.unmount();
    log.mockRestore();
    error.mockRestore();
    vi.unstubAllGlobals();
  });
});
