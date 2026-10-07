/*
 * DeckView's sources (OPENBRAIN-129): /deck falls back to the bundled
 * funding deck, a pinned or shared deck from the database renders its own
 * slides, a bad share link says it isn't available (and makes no request),
 * the draft presenter names a missing deck, and only creators get the Edit
 * link.
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
import { createMemoryHistory, createRouter } from "vue-router";
import { ref } from "vue";

const { auth } = vi.hoisted(() => ({ auth: { creator: null } }));

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
  authedRequest: vi.fn(),
  isApiConfigured: vi.fn(() => true),
}));
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ isCreator: auth.creator }),
}));

import {
  apiRequest,
  authedRequest,
  isApiConfigured,
} from "@/services/api/client";
import DeckView from "../DeckView.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
});

const TOKEN = "4f1c0a9e2b7d4c6f8a3e5d1b9c0f2a7e";
const DB_DECK = {
  slug: "sfn-2026-pitch",
  title: "SfN 2026 pitch",
  kind: "pitch",
  published_at: "2026-10-07T14:02:00Z",
  slides: [
    {
      id: "title",
      label: "Title",
      layout: "hero",
      props: { title: "Open Brain at SfN", size: "display" },
    },
    {
      id: "why",
      label: "Why",
      layout: "section",
      props: { eyebrow: "02 · Why", title: "Reading with figures" },
    },
  ],
};

let wrapper;
async function mountView(props, path = "/deck") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div />" } }],
  });
  await router.push(path);
  wrapper = mount(DeckView, {
    props,
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}
const slideCount = () => wrapper.findAll(".deck-stage__slide").length;
const source = () => wrapper.find(".deck-view").attributes("data-deck-source");

let warn;
beforeEach(() => {
  vi.clearAllMocks();
  isApiConfigured.mockReturnValue(true);
  auth.creator = ref(false);
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  wrapper?.unmount();
  // The only warning allowed is the pinned fallback's own: no Vue warnings.
  for (const [message] of warn.mock.calls)
    expect(String(message)).toMatch(/^\[deck\]/);
  warn.mockRestore();
});

describe("DeckView", () => {
  it("keeps the bundled templates as they were, with no request", async () => {
    await mountView({ deck: "templates" }, "/deck/templates");
    expect(slideCount()).toBe(DECK_TEMPLATES.length);
    expect(source()).toBe("bundled");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("falls back to the 9 bundled funding slides when /deck's request fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    apiRequest.mockRejectedValue(
      Object.assign(new Error("API Error 404"), { status: 404 })
    );
    await mountView({ source: "pinned", deck: "funding" });
    expect(apiRequest).toHaveBeenCalledWith(
      "rpc/get_pinned_deck",
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(slideCount()).toBe(FUNDING_DECK.length);
    expect(slideCount()).toBe(9);
    expect(source()).toBe("bundled");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("uses the bundled deck without asking when Supabase isn't configured", async () => {
    isApiConfigured.mockReturnValue(false);
    await mountView({ source: "pinned", deck: "funding" });
    expect(apiRequest).not.toHaveBeenCalled();
    expect(slideCount()).toBe(9);
    expect(source()).toBe("bundled");
  });

  it("renders the pinned deck's own slides from the database", async () => {
    apiRequest.mockResolvedValue(DB_DECK);
    await mountView({ source: "pinned", deck: "funding" });
    expect(source()).toBe("db");
    expect(slideCount()).toBe(2);
    expect(wrapper.text()).toContain("Open Brain at SfN");
    expect(document.title).toBe("SfN 2026 pitch · The Open Brain");
  });

  it("opens the slide in the hash once database slides arrive", async () => {
    apiRequest.mockResolvedValue(DB_DECK);
    await mountView({ source: "pinned", deck: "funding" }, "/deck#2");
    const shown = wrapper
      .findAll(".deck-stage__slide")
      .filter((s) => s.element.style.display !== "none");
    expect(shown).toHaveLength(1);
    expect(shown[0].attributes("data-slide")).toBe("why");
  });

  it("shows a shared deck from its token", async () => {
    apiRequest.mockResolvedValue(DB_DECK);
    await mountView({ source: "shared", token: TOKEN }, `/deck/s/${TOKEN}`);
    expect(apiRequest).toHaveBeenCalledWith(
      `rpc/get_shared_deck?p_token=${TOKEN}`
    );
    expect(slideCount()).toBe(2);
    expect(source()).toBe("db");
  });

  it("says a malformed share link isn't available, without a request", async () => {
    await mountView({ source: "shared", token: "not-a-token" }, "/deck/s/x");
    expect(apiRequest).not.toHaveBeenCalled();
    expect(slideCount()).toBe(0);
    expect(wrapper.find("main h1").text()).toBe("This link isn't available.");
    expect(wrapper.text()).toContain(
      "Ask the person who sent it for a new one."
    );
  });

  it("says an old share link isn't available, and never falls back", async () => {
    apiRequest.mockResolvedValue(null);
    await mountView({ source: "shared", token: TOKEN }, `/deck/s/${TOKEN}`);
    expect(slideCount()).toBe(0);
    expect(wrapper.text()).toContain("This link isn't available.");
    // Loading ended in a message: focus goes to it, so a screen reader that
    // read "Loading deck…" hears what happened.
    expect(document.activeElement).toBe(wrapper.get("main h1").element);
  });

  it("doesn't move focus for a message that was the page from the start", async () => {
    await mountView({ source: "shared", token: "not-a-token" }, "/deck/s/x");
    expect(document.activeElement).toBe(document.body);
  });

  it("describes Retry by the error it is for", async () => {
    apiRequest.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await mountView({ source: "shared", token: TOKEN }, `/deck/s/${TOKEN}`);
    const retry = wrapper.findAll("button").find((b) => b.text() === "Retry");
    expect(document.activeElement).toBe(retry.element);
    const text = retry
      .attributes("aria-describedby")
      .split(" ")
      .map((id) => document.getElementById(id).textContent)
      .join(" ");
    expect(text).toBe(
      "The deck couldn't load. Check your connection and try again."
    );
  });

  describe("speaker notes", () => {
    const notesButton = () =>
      wrapper.findAll("button").find((b) => b.text().trim() === "Notes");

    it("never reach a funder through the bundled fallback", async () => {
      apiRequest.mockRejectedValue(
        Object.assign(new Error("API Error 404"), { status: 404 })
      );
      await mountView({ source: "pinned", deck: "funding" });
      expect(source()).toBe("bundled");
      expect(notesButton()).toBeUndefined();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));
      await flushPromises();
      expect(wrapper.find(".deck-stage__notes").exists()).toBe(false);
    });

    it("stay for a creator presenting the fallback", async () => {
      auth.creator = ref(true);
      isApiConfigured.mockReturnValue(false);
      await mountView({ source: "pinned", deck: "funding" });
      expect(notesButton()).toBeDefined();
    });
  });

  it("offers Retry when a share link's request fails", async () => {
    apiRequest.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await mountView({ source: "shared", token: TOKEN }, `/deck/s/${TOKEN}`);
    expect(wrapper.text()).toContain("The deck couldn't load.");
    apiRequest.mockResolvedValue(DB_DECK);
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Retry")
      .trigger("click");
    await flushPromises();
    expect(slideCount()).toBe(2);
  });

  it("shows a loading frame while the deck is on its way", async () => {
    apiRequest.mockReturnValue(new Promise(() => {}));
    await mountView({ source: "shared", token: TOKEN }, `/deck/s/${TOKEN}`);
    const frame = wrapper.find('[aria-busy="true"]');
    expect(frame.text()).toBe("Loading deck…");
  });

  it("names a draft that doesn't exist and links back to Decks", async () => {
    authedRequest.mockResolvedValue([]);
    await mountView(
      { source: "draft", slug: "nope" },
      "/dashboard/decks/nope/present"
    );
    expect(wrapper.find("main h1").text()).toBe("No deck called “nope”.");
    expect(wrapper.find('a[href="/dashboard?section=decks"]').exists()).toBe(
      true
    );
  });

  it("presents the working copy, hidden slides skipped, broken ones explained", async () => {
    authedRequest.mockResolvedValue([
      {
        slug: "sfn-2026-pitch",
        title: "SfN 2026 pitch",
        slides: [
          ...DB_DECK.slides,
          { ...DB_DECK.slides[1], id: "gone", hidden: true },
          { id: "odd", label: "Odd", layout: "carousel", props: {} },
        ],
      },
    ]);
    await mountView(
      { source: "draft", slug: "sfn-2026-pitch" },
      "/dashboard/decks/sfn-2026-pitch/present"
    );
    expect(authedRequest).toHaveBeenCalledWith(
      "decks?slug=eq.sfn-2026-pitch&select=slug,title,slides"
    );
    expect(slideCount()).toBe(3);
    expect(wrapper.text()).toContain("Slide 4 can't be shown");
    expect(document.title).toBe("Draft · SfN 2026 pitch · The Open Brain");
  });

  describe("Edit link", () => {
    it("is not there for readers", async () => {
      apiRequest.mockResolvedValue(DB_DECK);
      await mountView({ source: "pinned", deck: "funding" });
      expect(wrapper.find(".deck-stage__edit").exists()).toBe(false);
    });

    it("opens the deck's editor for a creator", async () => {
      auth.creator = ref(true);
      apiRequest.mockResolvedValue(DB_DECK);
      await mountView({ source: "pinned", deck: "funding" });
      expect(wrapper.find(".deck-stage__edit").attributes("href")).toBe(
        "/dashboard/decks/sfn-2026-pitch"
      );
    });

    it("points the bundled funding fallback at Decks", async () => {
      auth.creator = ref(true);
      isApiConfigured.mockReturnValue(false);
      await mountView({ source: "pinned", deck: "funding" });
      expect(wrapper.find(".deck-stage__edit").attributes("href")).toBe(
        "/dashboard?section=decks"
      );
    });

    it("is never on the templates", async () => {
      auth.creator = ref(true);
      await mountView({ deck: "templates" }, "/deck/templates");
      expect(wrapper.find(".deck-stage__edit").exists()).toBe(false);
    });
  });

  it("keeps the deck out of search results", async () => {
    await mountView({ deck: "templates" }, "/deck/templates");
    expect(
      document.head.querySelector('meta[name="robots"]').getAttribute("content")
    ).toBe("noindex, nofollow");
    wrapper.unmount();
    wrapper = null;
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
