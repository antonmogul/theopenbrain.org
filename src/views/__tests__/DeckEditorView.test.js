/*
 * The deck editor page (OPENBRAIN-129): it loads a deck into the rail,
 * preview and form; Publish is off while the deck has errors and asks
 * before publishing; a lost save race opens the conflict dialog; undo is
 * bound on the editor root and leaves text fields alone; below 1024px there
 * is only Present draft and Share. Requests go to the in-memory decks API
 * the stories use (src/stories/deckFixtures.js).
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { RouterView, createMemoryHistory, createRouter } from "vue-router";

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
  authedRequest: vi.fn(),
  isApiConfigured: () => true,
}));
vi.mock("@/composables/useAuth", () => ({ useAuth: () => ({}) }));

import { apiRequest, authedRequest } from "@/services/api/client";
import { h, nextTick } from "vue";
import DeckEditorView from "../DeckEditorView.vue";
import AddSlideDialog from "@/components/deck/editor/AddSlideDialog.vue";
import DeckProblems from "@/components/deck/editor/DeckProblems.vue";
import DeckShareDialog from "@/components/deck/editor/DeckShareDialog.vue";
import { GALLERY } from "@/data/decks/index.js";
import { BROKEN_DECK, DECK_ROWS, decksApi } from "@/stories/deckFixtures.js";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
});

// The Storybook mock's lookup: the first fixture key the endpoint contains.
function serve(api) {
  const handle = async (endpoint, options = {}) => {
    const key = Object.keys(api).find(
      (k) => endpoint === k || endpoint.includes(k)
    );
    if (!key)
      return options.method && options.method !== "GET"
        ? { success: true }
        : [];
    const value = api[key];
    return structuredClone(
      await (typeof value === "function" ? value(endpoint, options) : value)
    );
  };
  authedRequest.mockImplementation(handle);
  apiRequest.mockImplementation(handle);
}

let wide = true;
let wrapper;
async function mountEditor(slug = "funding") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div />" } }],
  });
  await router.push(`/dashboard/decks/${slug}`);
  wrapper = mount(DeckEditorView, {
    props: { slug },
    global: { plugins: [router], stubs: { teleport: true } },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}
const button = (text) =>
  wrapper.findAll("button").find((b) => b.text().trim() === text);
const calls = (method) =>
  authedRequest.mock.calls.filter(([, o]) => (o?.method || "GET") === method);

beforeEach(() => {
  vi.clearAllMocks();
  wide = true;
  window.matchMedia = vi.fn(() => ({
    matches: wide,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("DeckEditorView", () => {
  it("loads the deck into the rail, the preview and the form", async () => {
    serve(decksApi());
    await mountEditor();
    expect(authedRequest).toHaveBeenCalledWith(
      "decks?slug=eq.funding&select=*"
    );
    expect(wrapper.find('input[aria-label="Deck title"]').element.value).toBe(
      "The Open Brain — Funding deck"
    );
    expect(wrapper.findAll(".deck-rail__slide")).toHaveLength(9);
    expect(
      wrapper.find('[role="img"][aria-label^="Preview of slide 1"]').exists()
    ).toBe(true);
    expect(wrapper.text()).toContain("Slide 1 of 9");
    expect(wrapper.find(".de-save-state").text()).toMatch(/^Saved/);
    // Published with changes since: Publish changes is on.
    const publish = button("Publish changes");
    expect(publish.attributes("disabled")).toBeUndefined();
  });

  it("keeps Publish off while the deck has errors, and says why", async () => {
    serve(
      decksApi({
        decks: [{ ...DECK_ROWS[0], slides: BROKEN_DECK }],
      })
    );
    await mountEditor();
    const publish = button("Publish changes");
    expect(publish.attributes("disabled")).toBeDefined();
    // The reason is on a wrapper: a disabled button takes no hover, so a
    // title on it never shows.
    const wrap = wrapper.find(".de-publish");
    expect(wrap.element.contains(publish.element)).toBe(true);
    expect(wrap.attributes("title")).toMatch(
      /^Fix \d+ problems? to publish\.$/
    );
    expect(wrapper.find("#de-publish-why").text()).toBe(
      wrap.attributes("title")
    );
    expect(wrapper.find(".de-problems").text()).toMatch(
      /Problems: \d+ errors?/
    );
  });

  it("asks, then publishes the saved version", async () => {
    serve(decksApi());
    await mountEditor();
    await button("Publish changes").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Publish 9 slides?");
    // /deck as an address of the site the editor is on.
    expect(wrapper.text()).toContain(`and ${location.host}/deck`);
    await wrapper
      .findAll(".modal-footer button")
      .find((b) => b.text() === "Publish changes")
      .trigger("click");
    await flushPromises();
    const [, options] = calls("POST").find(([e]) => e === "rpc/publish_deck");
    expect(JSON.parse(options.body)).toEqual({
      p_id: DECK_ROWS[0].id,
      p_version: 5,
    });
    expect(wrapper.text()).toContain("Published.");
    // Nothing new since: the button goes off.
    expect(button("Publish changes").attributes("disabled")).toBeDefined();
  });

  it("undoes on the editor root, but leaves a text field's own undo alone", async () => {
    serve(decksApi());
    await mountEditor();
    const input = wrapper.find('input[aria-label="Deck title"]');
    await input.setValue("Pitch for the Foundation");
    expect(wrapper.find(".de-save-state").text()).toBe("Saving…");

    await input.trigger("keydown", { key: "z", ctrlKey: true });
    expect(input.element.value).toBe("Pitch for the Foundation");

    await wrapper.find(".de").trigger("keydown", { key: "z", ctrlKey: true });
    expect(input.element.value).toBe("The Open Brain — Funding deck");
    await wrapper
      .find(".de")
      .trigger("keydown", { key: "z", ctrlKey: true, shiftKey: true });
    expect(input.element.value).toBe("Pitch for the Foundation");
  });

  it("saves with Ctrl+S and opens the conflict dialog when another tab won", async () => {
    serve(decksApi({ conflict: true }));
    await mountEditor();
    await wrapper
      .find('input[aria-label="Deck title"]')
      .setValue("Edited here");
    await wrapper.find(".de").trigger("keydown", { key: "s", ctrlKey: true });
    await flushPromises();

    const [patchUrl] = calls("PATCH")[0];
    expect(patchUrl).toContain("version=eq.5");
    expect(wrapper.text()).toContain(
      "This deck changed in another tab or by another creator at"
    );

    await button("Keep mine").trigger("click");
    await flushPromises();
    expect(calls("PATCH").at(-1)[0]).toContain("version=eq.6");
    expect(wrapper.find(".de-save-state").text()).toMatch(/^Saved/);
  });

  it("saves, then opens the draft presenter on the selected slide", async () => {
    serve(decksApi());
    await mountEditor();
    const tab = { opener: {}, location: { href: "" } };
    const open = vi.spyOn(window, "open").mockReturnValue(tab);
    await wrapper.findAll(".deck-rail__slide")[2].trigger("click");
    await button("Present draft").trigger("click");
    await flushPromises();
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe("/dashboard/decks/funding/present#3");
    open.mockRestore();
  });

  it("adds a picked slide after the selected one and focuses its title", async () => {
    serve(decksApi());
    await mountEditor();
    await wrapper.findAll(".deck-rail__slide")[1].trigger("click");
    await wrapper.find(".deck-rail__add").trigger("click");
    const dialog = wrapper.findComponent(AddSlideDialog);
    expect(dialog.props("open")).toBe(true);
    const blankText = GALLERY[0].entries.find((e) => e.layout === "text");
    dialog.vm.$emit("pick", blankText);
    await flushPromises();
    const rail = wrapper.findAll(".deck-rail__slide");
    expect(rail).toHaveLength(10);
    const added = rail[2];
    expect(added.attributes("aria-current")).toBe("true");
    const id = added.attributes("data-slide-id");
    expect(id).toMatch(/^s-[0-9a-f]{8}$/);
    expect(document.activeElement?.id).toBe(`deck-field-${id}-props-title`);
  });

  it("saves before the route is left", async () => {
    serve(decksApi());
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/dashboard/decks/:slug",
          component: DeckEditorView,
          props: true,
        },
        { path: "/:pathMatch(.*)*", component: { template: "<p>away</p>" } },
      ],
    });
    await router.push("/dashboard/decks/funding");
    wrapper = mount(
      { render: () => h(RouterView) },
      {
        global: { plugins: [router], stubs: { teleport: true } },
        attachTo: document.body,
      }
    );
    await flushPromises();
    await wrapper
      .find('input[aria-label="Deck title"]')
      .setValue("Saved on the way out");
    expect(calls("PATCH")).toHaveLength(0);
    await router.push("/dashboard?section=decks");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/dashboard?section=decks");
    const [url, options] = calls("PATCH")[0];
    expect(url).toContain("version=eq.5");
    expect(JSON.parse(options.body).title).toBe("Saved on the way out");
  });

  it("focuses the conflict's text, not an answer, so typing can't pick one", async () => {
    serve(decksApi({ conflict: true }));
    await mountEditor();
    const input = wrapper.find('input[aria-label="Deck title"]');
    input.element.focus();
    await input.setValue("Edited here");
    await wrapper.find(".de").trigger("keydown", { key: "s", ctrlKey: true });
    await flushPromises();
    await nextTick();
    const text = wrapper.find(".de-dialog-text");
    expect(document.activeElement).toBe(text.element);
    expect(document.activeElement.tagName).not.toBe("BUTTON");

    // Load theirs drops the edit, with Undo to bring it back.
    await button("Load theirs").trigger("click");
    await flushPromises();
    expect(input.element.value).toBe("The Open Brain — Funding deck");
    expect(wrapper.find(".de-toast").text()).toContain(
      "Loaded the latest version."
    );
    await wrapper.find(".de-toast-action").trigger("click");
    await flushPromises();
    expect(input.element.value).toBe("Edited here");
  });

  it("offers Undo only for the change its message is about", async () => {
    serve(decksApi());
    await mountEditor();
    // Every eyebrow already matches: nothing renumbered, nothing to undo.
    await wrapper.find(".de-morebtn").trigger("click");
    await button("Renumber eyebrows").trigger("click");
    await flushPromises();
    expect(wrapper.find(".de-toast").text()).toContain(
      "Eyebrows already match their slides."
    );
    expect(wrapper.find(".de-toast-action").exists()).toBe(false);

    // A deletion's Undo goes once the deck changes again.
    await wrapper
      .findAll(".deck-rail__slide")[1]
      .trigger("keydown", { key: "Delete" });
    await flushPromises();
    expect(wrapper.find(".de-toast-action").text()).toBe("Undo");
    await wrapper
      .find('input[aria-label="Deck title"]')
      .setValue("Typed after the delete");
    await flushPromises();
    expect(wrapper.find(".de-toast").exists()).toBe(false);
    expect(wrapper.findAll(".deck-rail__slide")).toHaveLength(8);
  });

  it("opens a closed list card or Advanced to reach a problem's field", async () => {
    serve(decksApi());
    await mountEditor();
    await wrapper.findAll(".deck-rail__slide")[1].trigger("click");
    await flushPromises();
    const toggles = () => wrapper.findAll(".deck-list__toggle");
    await toggles()[2].trigger("click");
    expect(toggles()[2].attributes("aria-expanded")).toBe("false");

    const problems = wrapper.findComponent(DeckProblems);
    problems.vm.$emit("jump", {
      slideId: "team",
      path: "props.people.2.name",
    });
    await flushPromises();
    expect(toggles()[2].attributes("aria-expanded")).toBe("true");
    expect(document.activeElement?.id).toBe(
      "deck-field-team-props-people-2-name"
    );

    const advanced = wrapper.find("details.deck-slide-form__advanced");
    expect(advanced.element.hasAttribute("open")).toBe(false);
    problems.vm.$emit("jump", { slideId: "team", path: "id" });
    await flushPromises();
    expect(advanced.element.hasAttribute("open")).toBe(true);
    expect(document.activeElement?.id).toBe("deck-field-team-id");
  });

  it("merges only what a share action changes, never the version", async () => {
    const api = decksApi();
    const table = api["decks?"];
    // The rotate's row comes back with a version from whenever it ran.
    api["decks?"] = async (endpoint, options = {}) => {
      const out = await table(endpoint, options);
      const body = options.body ? JSON.parse(options.body) : {};
      return "share_token" in body
        ? out.map((r) => ({ ...r, version: 99 }))
        : out;
    };
    serve(api);
    await mountEditor();
    wrapper.findComponent(DeckShareDialog).vm.$emit("rotate");
    await flushPromises();
    await wrapper
      .find('input[aria-label="Deck title"]')
      .setValue("After the new link");
    await wrapper.find(".de").trigger("keydown", { key: "s", ctrlKey: true });
    await flushPromises();
    expect(calls("PATCH").at(-1)[0]).toContain("version=eq.5");
    expect(wrapper.find(".de-save-state").text()).toMatch(/^Saved/);
  });

  it("switches /deck off for this deck only", async () => {
    serve(decksApi());
    await mountEditor();
    wrapper.findComponent(DeckShareDialog).vm.$emit("pin", false);
    await flushPromises();
    expect(
      authedRequest.mock.calls.some(([e]) => e === "rpc/set_pinned_deck")
    ).toBe(false);
    const [url, options] = calls("PATCH").at(-1);
    expect(url).toMatch(new RegExp(`^decks\\?id=eq\\.${DECK_ROWS[0].id}&`));
    expect(JSON.parse(options.body)).toEqual({ pinned: false });
    expect(wrapper.findComponent(DeckShareDialog).props("deck").pinned).toBe(
      false
    );
  });

  it("says when the share dialog couldn't copy the link", async () => {
    serve(decksApi());
    await mountEditor();
    wrapper
      .findComponent(DeckShareDialog)
      .vm.$emit("copy-failed", "https://x/deck/s/1");
    await flushPromises();
    expect(wrapper.find(".de-toast").classes()).toContain("is-error");
    expect(wrapper.find(".de-toast").text()).toContain(
      "The clipboard isn't available here"
    );
  });

  it("draws Problems and More as the shared outline Button", async () => {
    serve(decksApi());
    await mountEditor();
    for (const sel of [".de-problems", ".de-morebtn"])
      expect(wrapper.find(sel).classes()).toEqual(
        expect.arrayContaining(["btn", "v-outline", "s-sm"])
      );
  });

  it("names a deck that doesn't exist", async () => {
    serve(decksApi({ decks: [] }));
    await mountEditor("nope");
    expect(wrapper.text()).toContain("No deck called “nope”");
    expect(wrapper.find(".deck-rail").exists()).toBe(false);
  });

  it("asks for the migration when the table is missing", async () => {
    authedRequest.mockRejectedValue(
      Object.assign(new Error("API Error 404"), {
        status: 404,
        response: '{"code":"PGRST205"}',
      })
    );
    await mountEditor();
    expect(wrapper.text()).toContain("Decks need a database update");
    expect(wrapper.text()).toContain("supabase db push");
  });

  it("offers only Present draft and Share below 1024px", async () => {
    wide = false;
    serve(decksApi());
    await mountEditor();
    expect(wrapper.text()).toContain("Open this on a laptop to edit decks");
    expect(wrapper.find(".deck-rail").exists()).toBe(false);
    expect(wrapper.find("form.deck-slide-form").exists()).toBe(false);
    expect(wrapper.findAll("button").map((b) => b.text().trim())).toEqual(
      expect.arrayContaining(["Present draft", "Share"])
    );
    expect(button("Publish changes")).toBeUndefined();
    expect(wrapper.find('a[href="/dashboard?section=decks"]').exists()).toBe(
      true
    );
  });
});
