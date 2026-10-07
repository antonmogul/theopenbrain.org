import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AITutorPreview from "../AITutorPreview.vue";

const chapter = {
  title: "Source chapter",
  intro: [
    {
      title: "Source chapter",
      paragraphs: [{ text: "The exact introduction." }],
    },
  ],
  sections: [
    {
      title: "Second section",
      paragraphs: [{ text: "The exact second passage." }],
    },
  ],
};
let synthesis;
let wrapper;
const button = (label) =>
  wrapper.findAll("button").find((node) => node.text() === label);

beforeEach(() => {
  synthesis = {
    getVoices: vi.fn(() => [
      { name: "Local", voiceURI: "local", lang: "en", localService: true },
    ]),
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
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
      throw new Error("No network in offline preview");
    })
  );
});

afterEach(() => {
  wrapper?.unmount();
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe("offline chapter previews", () => {
  it("labels scripted chat honestly and reveals only selected source openings", async () => {
    wrapper = mount(AITutorPreview, { props: { chapter } });
    expect(wrapper.text()).toContain("not live AI");
    expect(wrapper.text()).toContain("The exact introduction.");
    expect(wrapper.get("select").element.value).toBe("source-section-0");
    await wrapper.get("select").setValue("source-section-1");
    expect(wrapper.get(".source-excerpt").text()).toContain(
      "The exact second passage."
    );
    expect(wrapper.find("textarea").exists()).toBe(false);
    expect(wrapper.find("input").exists()).toBe(false);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it("requires explicit playback, provides Pause/Resume/Stop and cancels on rapid mode changes", async () => {
    wrapper = mount(AITutorPreview, { props: { chapter } });
    await button("Read aloud").trigger("click");
    expect(synthesis.speak).not.toHaveBeenCalled();
    await button("Play").trigger("click");
    await button("Play").trigger("click");
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    const stale = synthesis.speak.mock.calls[0][0];
    await button("Pause").trigger("click");
    expect(wrapper.text()).toContain("Paused");
    await button("Resume").trigger("click");
    expect(synthesis.resume).toHaveBeenCalledTimes(1);
    await button("Podcast format").trigger("click");
    await button("Chat walkthrough").trigger("click");
    stale.onend();
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("provides a plain source-grounded scripted transcript without requiring a voice", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    wrapper = mount(AITutorPreview, { props: { chapter } });
    await button("Podcast format").trigger("click");
    expect(wrapper.text()).toContain("not supported by this browser");
    const link = wrapper.get('[download="chapter-podcast-preview.txt"]');
    const transcript = decodeURIComponent(
      link.attributes("href").split(",")[1]
    );
    expect(transcript).toContain("NOT AI-GENERATED");
    expect(transcript).toContain("The exact introduction.");
    expect(transcript).toContain("The exact second passage.");
    expect(link.attributes("href")).toMatch(/^data:text\/plain;charset=utf-8,/);
  });

  it("cancels the old chapter before showing a new chapter", async () => {
    wrapper = mount(AITutorPreview, { props: { chapter } });
    await button("Read aloud").trigger("click");
    await button("Play").trigger("click");
    const stale = synthesis.speak.mock.calls[0][0];
    await wrapper.setProps({
      chapter: {
        sections: [
          { title: "New source", paragraphs: [{ text: "New passage." }] },
        ],
      },
    });
    stale.onend();
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    await button("Chat walkthrough").trigger("click");
    expect(wrapper.text()).toContain("New passage.");
    expect(wrapper.text()).not.toContain("The exact introduction.");
  });

  it("shows an honest empty state and no play/download without loaded prose", async () => {
    wrapper = mount(AITutorPreview);
    await button("Read aloud").trigger("click");
    expect(wrapper.text()).toContain("Load a chapter with text");
    expect(button("Play")).toBeUndefined();
    await button("Podcast format").trigger("click");
    expect(wrapper.find("a[download]").exists()).toBe(false);
  });
  it("renders the downloadable podcast transcript for long no-space Unicode source", async () => {
    wrapper = mount(AITutorPreview, {
      props: {
        chapter: {
          sections: [
            {
              title: "Unicode source",
              paragraphs: [{ text: "A" + "🧠".repeat(400) }],
            },
          ],
        },
      },
    });
    await button("Podcast format").trigger("click");
    const transcript = decodeURIComponent(
      wrapper.get("a[download]").attributes("href").split(",")[1]
    );
    expect(transcript).toContain("READER (shortened opening excerpt): A🧠");
  });
});
