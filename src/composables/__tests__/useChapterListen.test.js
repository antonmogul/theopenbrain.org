import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useChapterListen } from "../useChapterListen";

let wrapper, player, synth, jump;
class Utterance {
  constructor(text) {
    this.text = text;
  }
}
const english = {
  voiceURI: "en-local",
  name: "English",
  lang: "en-GB",
  default: true,
};
function setup(options = {}) {
  wrapper = mount(
    defineComponent({
      setup() {
        player = useChapterListen({ synth, Utterance, jump, ...options });
        return () => null;
      },
    })
  );
  return player;
}
function latest() {
  return synth.speak.mock.calls.at(-1)[0];
}
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML =
    '<main id="text"><div data-paragraph-id="p1">First sentence. Second sentence.</div><div data-paragraph-id="p2">Next paragraph.</div></main>';
  const els = document.querySelectorAll("[data-paragraph-id]");
  els[0].getBoundingClientRect = () => ({ top: 0, bottom: 800 });
  els[1].getBoundingClientRect = () => ({ top: 900, bottom: 1000 });
  synth = {
    getVoices: vi.fn(() => [english, { voiceURI: "fr", lang: "fr-CA" }]),
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  jump = vi.fn();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
describe("chapter listener", () => {
  it("does not auto-play, starts at the reading line, chains short utterances and ends cleanly", () => {
    const p = setup();
    expect(synth.speak).not.toHaveBeenCalled();
    p.play();
    expect(latest().text).toBe("First sentence.");
    expect(latest().voice).toEqual(english);
    expect(p.voices.value).toEqual([english]);
    expect(document.querySelector(".ob-listening").dataset.paragraphId).toBe(
      "p1"
    );
    expect(jump).toHaveBeenCalledWith(p.current.value.element, {
      align: "reading-line",
      remember: false,
    });
    latest().onend();
    expect(latest().text).toBe("Second sentence.");
    latest().onend();
    expect(latest().text).toBe("Next paragraph.");
    latest().onend();
    expect(p.state.value).toBe("ended");
    expect(p.message.value).toBe("End of chapter.");
    expect(document.querySelector(".ob-listening")).toBe(null);
  });
  it("pause cancels Safari speech, resumes the sentence, and rejects stale completion events", () => {
    const p = setup();
    p.play();
    const stale = latest().onend;
    p.pause();
    expect(p.state.value).toBe("paused");
    expect(latest().onend).toBe(null);
    p.play();
    stale();
    expect(p.index.value).toBe(0);
    expect(latest().text).toBe("First sentence.");
    expect(synth.resume).toHaveBeenCalled();
  });
  it("previous/next work while playing and paused without starting a paused queue", () => {
    const p = setup();
    p.play();
    p.step(1);
    expect(latest().text).toBe("Next paragraph.");
    p.pause();
    const count = synth.speak.mock.calls.length;
    p.step(-1);
    expect(p.index.value).toBe(0);
    expect(synth.speak).toHaveBeenCalledTimes(count);
    p.play();
    expect(latest().text).toBe("First sentence.");
  });
  it("loads late English voices, remembers settings and bounds rates", () => {
    localStorage.setItem("ob.listen.rate", "1.3");
    localStorage.setItem("ob.listen.voice", "en-local");
    const p = setup();
    expect(p.rate.value).toBe(1.3);
    p.play();
    p.setRate(2);
    expect(latest().rate).toBe(1.5);
    expect(localStorage.getItem("ob.listen.rate")).toBe("1.5");
    p.setVoice("en-local");
    expect(localStorage.getItem("ob.listen.voice")).toBe("en-local");
    synth.getVoices.mockReturnValue([{ voiceURI: "new", lang: "en-US" }]);
    synth.addEventListener.mock.calls[0][1]();
    expect(p.voices.value[0].voiceURI).toBe("new");
  });
  it("lets wheel, touch and reading keys turn follow off, then returns through readerJump", () => {
    const p = setup();
    p.play();
    jump.mockClear();
    window.dispatchEvent(new Event("wheel"));
    latest().onend();
    latest().onend();
    expect(p.following.value).toBe(false);
    expect(jump).not.toHaveBeenCalled();
    p.backToReading();
    expect(jump).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown" }));
    expect(p.following.value).toBe(false);
    p.backToReading();
    window.dispatchEvent(new Event("touchmove"));
    expect(p.following.value).toBe(false);
  });
  it("stops on error with recovery, handles missing text and cancels on unmount", () => {
    const p = setup();
    p.play();
    latest().onerror();
    expect(p.state.value).toBe("error");
    expect(p.message.value).toContain("choose another");
    p.play();
    expect(p.state.value).toBe("playing");
    wrapper.unmount();
    wrapper = null;
    expect(synth.removeEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      expect.any(Function)
    );
    expect(document.querySelector(".ob-listening")).toBe(null);
    document.getElementById("text").innerHTML = "";
    setup().play();
    expect(player.message.value).toContain("No chapter text");
  });
  it("starts at the current paragraph rather than the beginning when already scrolled", () => {
    document.querySelector('[data-paragraph-id="p1"]').getBoundingClientRect =
      () => ({ top: -200, bottom: -100 });
    const p = setup();
    p.play();
    expect(latest().text).toBe("Next paragraph.");
  });
  it("hides unsupported speech", async () => {
    const p = setup({ synth: null, Utterance: null });
    expect(p.supported).toBe(false);
    p.play();
    expect(synth.speak).not.toHaveBeenCalled();
    await nextTick();
  });
  it("tolerates unavailable localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const p = setup();
    expect(() => {
      p.setRate(1.2);
      p.setVoice("en-local");
      p.play();
    }).not.toThrow();
    expect(latest().rate).toBe(1.2);
  });
  it("paragraph controls skip headings and do not cancel at a boundary", () => {
    document.getElementById("text").innerHTML =
      '<div data-paragraph-id="p1">First.</div><h2 class="subChapter">A section</h2><div data-paragraph-id="p2">Second.</div>';
    const p = setup();
    p.play();
    p.step(1);
    expect(p.index.value).toBe(2);
    const calls = synth.cancel.mock.calls.length;
    p.step(1);
    expect(synth.cancel).toHaveBeenCalledTimes(calls);
    p.step(-1);
    expect(p.index.value).toBe(0);
  });
  it("can skip breakout text while playing", () => {
    document.querySelector('[data-paragraph-id="p2"]').outerHTML =
      '<div data-breakout-box="b"><div data-paragraph-id="box">Box text.</div></div><div data-paragraph-id="after">After.</div>';
    const p = setup();
    p.play();
    p.setBoxes(false);
    expect(p.entries.value.map((e) => e.text)).toEqual([
      "First sentence. Second sentence.",
      "After.",
    ]);
    expect(localStorage.getItem("ob.listen.boxes")).toBe("0");
  });
});
