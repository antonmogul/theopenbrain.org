import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
const state = vi.hoisted(() => ({ user: null }));
vi.mock("../useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/utils/authHelpers", () => ({
  ensureFreshSession: async () => ({ access_token: "test-token" }),
}));
vi.mock("@/helper/studyPartner", async (importOriginal) => ({
  ...(await importOriginal()),
  STUDY_PARTNER_URL: "http://localhost:4296",
}));
import { useStudyPartner } from "../useStudyPartner";
import { readStudyStream } from "@/helper/studyPartner";
let scope;
afterEach(() => {
  scope?.stop();
  vi.unstubAllGlobals();
});
function mount() {
  state.user = ref({ id: "a" });
  scope = effectScope();
  return scope.run(() => useStudyPartner());
}
function stream(parts) {
  return new ReadableStream({
    start(c) {
      for (const part of parts) c.enqueue(new TextEncoder().encode(part));
      c.close();
    },
  });
}
describe("Study partner transport", () => {
  it("parses split SSE and refuses interrupted replies", async () => {
    const events = [];
    await readStudyStream(
      stream([
        "event: te",
        'xt\ndata: {"text":"hé"}\n\n',
        "event: done\ndata: {}\n\n",
      ]),
      (e, d) => events.push([e, d])
    );
    expect(events[0]).toEqual(["text", { text: "hé" }]);
    await expect(
      readStudyStream(
        stream(['event: text\ndata: {"text":"partial"}\n\n']),
        () => {}
      )
    ).rejects.toThrow("interrupted");
  });
  it("sends only text and a conversation id with the fresh bearer", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          stream([
            'event: conversation\ndata: {"id":"c"}\n\nevent: text\ndata: {"text":"Hello"}\n\nevent: done\ndata: {"citations":[]}\n\n',
          ])
        )
    );
    vi.stubGlobal("fetch", fetcher);
    const api = mount();
    expect(await api.send("Test me")).toBe(true);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      message: "Test me",
      conversationId: null,
    });
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer test-token"
    );
    expect(api.messages.value.at(-1).text).toBe("Hello");
    expect(api.conversationId.value).toBe("c");
  });
  it("retains an error, resets on user switch and does not request for anonymous readers", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ error: "Reading break" }, { status: 429 })
    );
    vi.stubGlobal("fetch", fetcher);
    const api = mount();
    expect(await api.send("Test me")).toBe(false);
    expect(api.error.value).toBe("Reading break");
    state.user.value = null;
    await nextTick();
    expect(api.error.value).toBe("");
    expect(api.messages.value).toEqual([]);
    await api.opening();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
