import { beforeEach, describe, it, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";

// "Share with readers" on an existing highlight (OPENBRAIN-128): it sets
// is_public, which the database counts into trending_highlights. New
// highlights stay private. The switch waits for the database's
// trending_sharing_ready() (useTrendingSharing), here answered by `probe`.
const { probe, auth } = vi.hoisted(() => ({
  probe: vi.fn(),
  auth: { isAuthenticated: null },
}));
vi.mock("@/services/api/client", () => ({ post: probe }));
vi.mock("@/composables/useAuth", () => ({ useAuth: () => auth }));

beforeEach(() => {
  // A fresh page load each time: useTrendingSharing caches its answer.
  vi.resetModules();
  probe.mockReset();
  probe.mockResolvedValue(true);
  auth.isAuthenticated = ref(true);
});

const mountToolbar = async (props) => {
  const { default: HighlightToolbar } =
    await import("@/components/chapter/HighlightToolbar.vue");
  const w = mount(HighlightToolbar, {
    props: { visible: true, position: { x: 0, y: 0 }, ...props },
    global: { stubs: { Teleport: true, Transition: false } },
  });
  await flushPromises();
  return w;
};

const editProps = (highlight = {}) => ({
  mode: "edit",
  activeHighlight: {
    id: "h1",
    paragraph_id: "p1",
    color: "yellow",
    tags: [],
    is_public: false,
    ...highlight,
  },
});

const shareSwitch = (w) => w.find('[data-testid="share-switch"]');

// Merging deploys the switch before `supabase db push`, and
// until the migration is in, the old public-read policy exposes shared rows.
describe("HighlightToolbar sharing gate", () => {
  it("offers sharing once the database answers that it is ready", async () => {
    const w = await mountToolbar(editProps());
    expect(probe).toHaveBeenCalledWith("rpc/trending_sharing_ready", {});
    expect(w.find('[data-testid="share-row"]').exists()).toBe(true);
  });

  it.each([
    [
      "before the migration is pushed (404)",
      () =>
        Promise.reject(
          Object.assign(new Error('API Error 404: {"code":"PGRST202"}'), {
            status: 404,
          })
        ),
    ],
    ["offline", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("hides the switch %s", async (_, answer) => {
    probe.mockImplementation(answer);
    const w = await mountToolbar(editProps());
    expect(w.find('[data-testid="share-row"]').exists()).toBe(false);
    // The rest of the edit toolbar is unchanged.
    expect(w.find('[data-testid="edit-note-btn"]').exists()).toBe(true);
  });

  it("never shows it to an anonymous reader, and does not ask", async () => {
    auth.isAuthenticated.value = false;
    const w = await mountToolbar(editProps());
    expect(probe).not.toHaveBeenCalled();
    expect(w.find('[data-testid="share-row"]').exists()).toBe(false);
  });
});

describe("HighlightToolbar sharing", () => {
  it("has no share switch on a fresh selection, and new highlights are private", async () => {
    const w = await mountToolbar({
      mode: "create",
      selection: { text: "rods" },
    });
    expect(w.find('[data-testid="share-row"]').exists()).toBe(false);

    await w.find('[data-testid="create-note"]').trigger("click");
    expect(w.emitted("highlight")[0][0]).toMatchObject({ isPublic: false });
  });

  it("shows the highlight's sharing, labelled and explained", async () => {
    const w = await mountToolbar(editProps({ is_public: true }));
    const sw = shareSwitch(w);
    expect(sw.attributes("role")).toBe("switch");
    expect(sw.attributes("aria-checked")).toBe("true");

    const label = w.find(`#${sw.attributes("aria-labelledby")}`);
    expect(label.text()).toBe("Share with readers");
    expect(label.attributes("for")).toBe(sw.attributes("id"));
    expect(w.find(`#${sw.attributes("aria-describedby")}`).text()).toBe(
      "Counts toward Trending. Your name isn't shown."
    );
  });

  it("shares a private highlight with the column update ChapterView patches", async () => {
    const w = await mountToolbar(editProps());
    expect(shareSwitch(w).attributes("aria-checked")).toBe("false");

    await shareSwitch(w).trigger("click");
    expect(w.emitted("update-highlight")).toEqual([
      [{ id: "h1", updates: { is_public: true }, done: expect.any(Function) }],
    ]);
    expect(shareSwitch(w).attributes("aria-checked")).toBe("true");

    // Saved: it stays on, with nothing to report.
    w.emitted("update-highlight")[0][0].done(true);
    await nextTick();
    expect(shareSwitch(w).attributes("aria-checked")).toBe("true");
    expect(w.find('[data-testid="share-error"]').exists()).toBe(false);
  });

  // The switch flipped before the PATCH and stayed on when it
  // failed, while the highlight was still private.
  it("goes back and says so when sharing fails to save", async () => {
    const w = await mountToolbar(editProps());
    await shareSwitch(w).trigger("click");
    w.emitted("update-highlight")[0][0].done(false);
    await nextTick();

    expect(shareSwitch(w).attributes("aria-checked")).toBe("false");
    const error = w.get('[data-testid="share-error"]');
    expect(error.attributes("role")).toBe("alert");
    expect(error.text()).toBe("Couldn't share this highlight. Try again.");
    expect(shareSwitch(w).attributes("aria-describedby")).toContain(
      error.attributes("id")
    );

    // Trying again clears the message until that save answers.
    await shareSwitch(w).trigger("click");
    expect(shareSwitch(w).attributes("aria-checked")).toBe("true");
    expect(w.find('[data-testid="share-error"]').exists()).toBe(false);
  });

  it("stays shared and says so when unsharing fails to save", async () => {
    const w = await mountToolbar(editProps({ is_public: true }));
    await shareSwitch(w).trigger("click");
    expect(shareSwitch(w).attributes("aria-checked")).toBe("false");
    w.emitted("update-highlight")[0][0].done(false);
    await nextTick();

    expect(shareSwitch(w).attributes("aria-checked")).toBe("true");
    expect(w.get('[data-testid="share-error"]').text()).toBe(
      "Couldn't stop sharing this highlight. Try again."
    );
  });

  it("ignores a late failure once the reader toggled again or moved on", async () => {
    const w = await mountToolbar(editProps());
    await shareSwitch(w).trigger("click"); // on
    await shareSwitch(w).trigger("click"); // off again
    const [first, second] = w.emitted("update-highlight").map(([e]) => e);
    first.done(false);
    await nextTick();
    expect(shareSwitch(w).attributes("aria-checked")).toBe("false");
    expect(w.find('[data-testid="share-error"]').exists()).toBe(false);

    await w.setProps(editProps({ id: "h2", is_public: true }));
    second.done(false);
    await nextTick();
    expect(shareSwitch(w).attributes("aria-checked")).toBe("true");
    expect(w.find('[data-testid="share-error"]').exists()).toBe(false);
  });

  it("unshares a public highlight", async () => {
    const w = await mountToolbar(editProps({ is_public: true }));
    await shareSwitch(w).trigger("click");
    expect(w.emitted("update-highlight")[0][0]).toMatchObject({
      id: "h1",
      updates: { is_public: false },
    });
    expect(shareSwitch(w).attributes("aria-checked")).toBe("false");
  });

  it("follows the active highlight when another one is opened", async () => {
    const w = await mountToolbar(editProps({ is_public: true }));
    await w.setProps(editProps({ id: "h2", is_public: false }));
    expect(shareSwitch(w).attributes("aria-checked")).toBe("false");
  });

  it("steps aside while the note panel is open", async () => {
    const w = await mountToolbar(editProps());
    await w.find('[data-testid="edit-note-btn"]').trigger("click");
    expect(w.find('[data-testid="share-row"]').exists()).toBe(false);

    await w.find('[data-testid="edit-note-btn"]').trigger("click");
    await nextTick();
    expect(w.find('[data-testid="share-row"]').exists()).toBe(true);
  });
});
