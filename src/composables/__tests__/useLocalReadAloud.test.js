import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { routerKey } from "vue-router";
import { useLocalReadAloud } from "../useLocalReadAloud";

const localVoice = {
  name: "Device English",
  voiceURI: "device-en",
  lang: "en-GB",
  localService: true,
};
const remoteVoice = {
  name: "Remote default",
  voiceURI: "remote-en",
  lang: "en-US",
  localService: false,
  default: true,
};
let voiceList;
let synthesis;
let callbacks;
let wrappers;
let narration;

function mountReader(router = null) {
  const wrapper = mount(
    {
      setup() {
        narration = useLocalReadAloud();
        return () => null;
      },
    },
    {
      global: { provide: router ? { [routerKey]: router } : {} },
    }
  );
  wrappers.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  wrappers = [];
  voiceList = [remoteVoice, localVoice];
  callbacks = {};
  synthesis = {
    getVoices: vi.fn(() => voiceList),
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn((event, callback) => {
      callbacks[event] = callback;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("speechSynthesis", synthesis);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(text) {
        this.text = text;
      }
    }
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("No network allowed in offline playback test");
    })
  );
});

afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe("local-device read-aloud", () => {
  it("does not autoplay and explicitly selects only a browser-reported local voice", () => {
    mountReader();
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(synthesis.cancel).not.toHaveBeenCalled();
    expect(narration.voices.value).toHaveLength(1);
    narration.play(["Source text."]);
    const utterance = synthesis.speak.mock.calls[0][0];
    expect(utterance.voice).toBe(localVoice);
    expect(utterance.text).toBe("Source text.");
  });

  it("fails closed without the speech API", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    mountReader();
    narration.play(["Source text"]);
    expect(narration.available.value).toBe(false);
    expect(narration.unavailableReason.value).toMatch(/not supported/);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("never uses remote, unknown, or truthy-but-not-boolean local voices", () => {
    voiceList = [
      remoteVoice,
      { ...localVoice, localService: undefined },
      { ...localVoice, localService: "true" },
    ];
    mountReader();
    narration.play(["Source text"]);
    expect(narration.available.value).toBe(false);
    expect(narration.unavailableReason.value).toMatch(/No local-device voice/);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("handles a voice list arriving late without autoplay", () => {
    voiceList = [];
    mountReader();
    voiceList = [localVoice];
    callbacks.voiceschanged();
    expect(narration.available.value).toBe(true);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("guards repeated Play/Pause/Resume and cancels stale callbacks on Stop", () => {
    mountReader();
    narration.play(["First", "Second"]);
    const stale = synthesis.speak.mock.calls[0][0];
    narration.play(["Do not replace"]);
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    narration.pause();
    narration.pause();
    expect(synthesis.pause).toHaveBeenCalledTimes(1);
    narration.resume();
    narration.resume();
    expect(synthesis.resume).toHaveBeenCalledTimes(1);
    narration.stop();
    narration.stop();
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    stale.onend();
    stale.onerror();
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(narration.error.value).toBe("");
    expect(narration.state.value).toBe("idle");
  });

  it("plays one source chunk at a time and reports completion", () => {
    mountReader();
    narration.play(["First", "Second"]);
    synthesis.speak.mock.calls[0][0].onend();
    expect(synthesis.speak).toHaveBeenCalledTimes(2);
    expect(narration.progress.value).toBe(50);
    synthesis.speak.mock.calls[1][0].onend();
    expect(narration.progress.value).toBe(100);
    expect(narration.state.value).toBe("idle");
  });

  it("does not start another chunk when an end event arrives while paused", () => {
    mountReader();
    narration.play(["First", "Second"]);
    narration.pause();
    synthesis.speak.mock.calls[0][0].onend();
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    narration.resume();
    expect(synthesis.speak).toHaveBeenCalledTimes(2);
  });

  it("stops when its selected local voice disappears, without a remote fallback", () => {
    mountReader();
    narration.play(["First", "Second"]);
    const stale = synthesis.speak.mock.calls[0][0];
    voiceList = [remoteVoice];
    callbacks.voiceschanged();
    stale.onend();
    expect(narration.available.value).toBe(false);
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("revalidates voice locality before the next chunk and resume", () => {
    mountReader();
    narration.play(["First", "Second"]);
    narration.pause();
    voiceList = [remoteVoice];
    narration.resume();
    expect(narration.state.value).toBe("idle");
    expect(narration.error.value).toMatch(/could not resume/);
    expect(synthesis.resume).not.toHaveBeenCalled();
  });

  it("reports synthesis failures without getting stuck playing", () => {
    synthesis.speak.mockImplementation(() => {
      throw new Error("Device error");
    });
    mountReader();
    narration.play(["Source text"]);
    expect(narration.state.value).toBe("idle");
    expect(narration.error.value).toMatch(/could not start/);
  });

  it("stops and removes listeners on unmount; stale events cannot restart speech", () => {
    const wrapper = mountReader();
    narration.play(["First", "Second"]);
    const stale = synthesis.speak.mock.calls[0][0];
    wrapper.unmount();
    wrappers = [];
    stale.onend();
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    expect(synthesis.removeEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      callbacks.voiceschanged
    );
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("stops on route navigation and page exit", () => {
    let navigate;
    const removeHook = vi.fn();
    mountReader({
      afterEach: (callback) => {
        navigate = callback;
        return removeHook;
      },
    });
    narration.play(["First", "Second"]);
    navigate();
    expect(narration.state.value).toBe("idle");
    narration.play(["First", "Second"]);
    window.dispatchEvent(new Event("pagehide"));
    expect(narration.state.value).toBe("idle");
    expect(synthesis.cancel).toHaveBeenCalledTimes(2);
    wrappers[0].unmount();
    wrappers = [];
    expect(removeHook).toHaveBeenCalledTimes(1);
  });
  it("stops rather than substituting a voice when locality changes before the next chunk", () => {
    mountReader();
    narration.play(["First", "Second"]);
    const first = synthesis.speak.mock.calls[0][0];
    voiceList = [{ ...localVoice, localService: false }];
    first.onend();
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(narration.state.value).toBe("idle");
    expect(narration.error.value).toMatch(/local-device voice/);
  });

  it("handles voice enumeration failure without starting or cancelling unrelated speech", () => {
    synthesis.getVoices.mockImplementation(() => {
      throw new Error("Device error");
    });
    mountReader();
    narration.play(["Source text"]);
    expect(narration.available.value).toBe(false);
    expect(narration.error.value).toMatch(/could not list/);
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(synthesis.cancel).not.toHaveBeenCalled();
  });

  it("stops when Pause fails and exposes a recoverable local error", () => {
    mountReader();
    narration.play(["Source text"]);
    synthesis.pause.mockImplementation(() => {
      throw new Error("Unsupported pause");
    });
    narration.pause();
    expect(narration.state.value).toBe("idle");
    expect(narration.error.value).toMatch(/could not pause/);
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
  });
  it.each(["stop", "unmount"])(
    "restarts after Pause then %s even when cancel keeps the native engine paused",
    (action) => {
      synthesis.paused = false;
      synthesis.pause.mockImplementation(() => {
        synthesis.paused = true;
      });
      synthesis.resume.mockImplementation(() => {
        synthesis.paused = false;
      });
      const wrapper = mountReader();
      narration.play(["First source"]);
      narration.pause();
      if (action === "stop") narration.stop();
      else {
        wrapper.unmount();
        wrappers = [];
        mountReader();
      }
      expect(synthesis.paused).toBe(true);
      narration.play(["New source"]);
      expect(synthesis.paused).toBe(false);
      expect(synthesis.resume).toHaveBeenCalledTimes(1);
      expect(synthesis.speak).toHaveBeenCalledTimes(2);
      expect(synthesis.speak.mock.calls[1][0].voice).toBe(localVoice);
      expect(narration.state.value).toBe("speaking");
    }
  );
});
