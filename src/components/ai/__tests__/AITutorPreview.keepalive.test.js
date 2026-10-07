import { afterEach, expect, it, vi } from "vitest";
import { ref, h, KeepAlive, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import AITutorPreview from "@/components/ai/AITutorPreview.vue";
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});
it("stops local speech when the reader caches the Chat tab and switches to Info", async () => {
  const synthesis = {
    getVoices: () => [
      { name: "Local", voiceURI: "local", lang: "en", localService: true },
    ],
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
  const active = ref(true);
  const ChatTab = {
    name: "ChatTab",
    setup: () => () =>
      h(AITutorPreview, {
        chapter: {
          sections: [
            { title: "Heading", paragraphs: [{ text: "Body prose." }] },
          ],
        },
      }),
  };
  wrapper = mount({
    setup: () => () =>
      h(KeepAlive, { include: "ChatTab" }, () =>
        active.value ? h(ChatTab) : h("div", "Info tab")
      ),
  });
  const btn = (label) =>
    wrapper.findAll("button").find((x) => x.text() === label);
  await btn("Read aloud").trigger("click");
  await btn("Play").trigger("click");
  const stale = synthesis.speak.mock.calls[0][0];
  active.value = false;
  await nextTick();
  expect(wrapper.text()).toBe("Info tab");
  stale.onend();
  expect(synthesis.cancel).toHaveBeenCalledTimes(1);
  expect(synthesis.speak).toHaveBeenCalledTimes(1);
  active.value = true;
  await nextTick();
  expect(synthesis.speak).toHaveBeenCalledTimes(1);
  await btn("Play").trigger("click");
  expect(synthesis.speak).toHaveBeenCalledTimes(2);
});
