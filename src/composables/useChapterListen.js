import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import {
  extractChapterSpeech,
  shortVoiceList,
  speechChunks,
  speechStartIndex,
} from "@/helper/chapterListen";
import { jumpToElement } from "@/helper/readerJump";

/** One player per reader mount. All speech starts synchronously in a control's
 * click handler. Pause cancels and resumes the current short sentence, avoiding
 * Safari's stuck paused queue; nothing is spoken automatically on mount. */
export function useChapterListen({
  getRoot = () => document.getElementById("text"),
  synth = globalThis.window?.speechSynthesis,
  Utterance = globalThis.window?.SpeechSynthesisUtterance,
  jump = jumpToElement,
} = {}) {
  const supported = !!(synth && Utterance);
  const read = (key, fallback) => {
    try {
      return localStorage.getItem("ob.listen." + key) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key, value) => {
    try {
      localStorage.setItem("ob.listen." + key, String(value));
    } catch {
      /* Private browsing still permits listening. */
    }
  };
  const rate = ref(Math.min(1.5, Math.max(0.8, Number(read("rate", 1)) || 1)));
  const voiceURI = ref(read("voice", ""));
  const includeBoxes = ref(read("boxes", "1") !== "0");
  const voices = shallowRef([]);
  const entries = shallowRef([]);
  const index = ref(-1);
  const state = ref("idle");
  const message = ref("Read this chapter from your place.");
  const following = ref(true);
  const current = computed(() => entries.value[index.value] || null);
  let chunk = 0;
  let generation = 0;
  let utterance = null;
  let marked = null;
  let disposed = false;

  function loadVoices() {
    if (!supported) return;
    // Every English voice, or the short list once it is approved
    // (LISTEN_VOICE_LIMIT, OPENBRAIN-92); the reader's own always stays.
    voices.value = shortVoiceList(
      synth.getVoices().filter((v) => /^en(?:[-_]|$)/i.test(v.lang)),
      { keep: voiceURI.value }
    );
  }
  function cancel() {
    generation += 1;
    if (utterance) utterance.onend = utterance.onerror = null;
    utterance = null;
    synth?.cancel();
  }
  function clearMark() {
    marked?.classList.remove("ob-listening");
    marked = null;
  }
  function reveal() {
    if (current.value?.element?.isConnected)
      jump(current.value.element, { align: "reading-line", remember: false });
  }
  function mark() {
    clearMark();
    marked = current.value?.element;
    marked?.classList.add("ob-listening");
    if (following.value) reveal();
  }
  function stop() {
    cancel();
    clearMark();
    entries.value = [];
    index.value = -1;
    chunk = 0;
    state.value = "idle";
    message.value = "Read this chapter from your place.";
  }
  function speak() {
    if (disposed || !current.value?.element?.isConnected) {
      stop();
      return;
    }
    const chunks = speechChunks(current.value.text);
    const token = generation;
    utterance = new Utterance(chunks[chunk]);
    utterance.rate = rate.value;
    const voice =
      voices.value.find((v) => v.voiceURI === voiceURI.value) ||
      voices.value.find((v) => v.default) ||
      voices.value[0];
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en";
    utterance.onend = () => {
      if (disposed || token !== generation || state.value !== "playing") return;
      utterance = null;
      chunk += 1;
      if (chunk >= chunks.length) {
        chunk = 0;
        index.value += 1;
        if (!current.value) {
          state.value = "ended";
          message.value = "End of chapter.";
          clearMark();
          return;
        }
        mark();
        announce();
      }
      speak();
    };
    utterance.onerror = () => {
      if (disposed || token !== generation) return;
      cancel();
      state.value = "error";
      message.value =
        "Speech stopped. Try Play or choose another English voice.";
    };
    // cancel() does not reset the browser's paused state.
    synth.resume();
    synth.speak(utterance);
  }
  function announce() {
    message.value = `${state.value === "paused" ? "Paused" : "Reading"} passage ${index.value + 1} of ${entries.value.length}.`;
  }
  function play() {
    if (!supported || state.value === "playing") return;
    loadVoices();
    if (!current.value || state.value === "ended") {
      entries.value = extractChapterSpeech(getRoot(), {
        includeBoxes: includeBoxes.value,
      });
      if (!entries.value.length) {
        message.value =
          "No chapter text is ready to read. Wait for the chapter to load and try Play.";
        return;
      }
      index.value = speechStartIndex(
        entries.value.map((e) => e.element.getBoundingClientRect()),
        window.innerHeight / 2
      );
      chunk = 0;
      following.value = true;
    }
    cancel();
    state.value = "playing";
    mark();
    announce();
    speak();
  }
  function pause() {
    if (state.value !== "playing") return;
    cancel();
    state.value = "paused";
    announce();
  }
  function step(delta) {
    if (!current.value) return;
    const playing = state.value === "playing";
    let target = index.value + delta;
    while (entries.value[target]?.kind === "heading") target += delta;
    if (!entries.value[target]) return;
    index.value = target;
    cancel();
    chunk = 0;
    mark();
    announce();
    if (playing) speak();
  }
  function restartSettings() {
    if (state.value === "playing") {
      cancel();
      speak();
    }
  }
  function setRate(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    rate.value = Math.min(1.5, Math.max(0.8, n));
    save("rate", rate.value);
    restartSettings();
  }
  function setVoice(value) {
    voiceURI.value = value;
    save("voice", value);
    restartSettings();
  }
  function setBoxes(value) {
    const previous = current.value?.element;
    includeBoxes.value = !!value;
    save("boxes", value ? "1" : "0");
    if (!previous) return;
    const playing = state.value === "playing";
    cancel();
    entries.value = extractChapterSpeech(getRoot(), {
      includeBoxes: includeBoxes.value,
    });
    if (!entries.value.length) {
      stop();
      return;
    }
    const same = entries.value.findIndex((e) => e.element === previous);
    index.value =
      same >= 0
        ? same
        : speechStartIndex(
            entries.value.map((e) => e.element.getBoundingClientRect()),
            window.innerHeight / 2
          );
    chunk = 0;
    mark();
    announce();
    if (playing) speak();
  }
  function backToReading() {
    following.value = true;
    reveal();
  }
  function manualScroll(event) {
    if (!current.value) return;
    if (event.type === "pointerdown") {
      // A drag on the browser's scrollbar is reader input too.
      if (event.clientX < document.documentElement.clientWidth) return;
    }
    if (event.type === "keydown") {
      if (
        event.target?.closest?.(
          'input, select, textarea, [contenteditable="true"]'
        )
      )
        return;
      if (event.key === " " && event.target?.closest?.("button")) return;
      if (
        ![
          "ArrowDown",
          "ArrowUp",
          "PageDown",
          "PageUp",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      )
        return;
    }
    following.value = false;
  }
  // Input intent distinguishes the reader's scroll from readerJump/GSAP's.
  const inputs = ["wheel", "touchmove", "keydown", "pointerdown"];
  onMounted(() => {
    loadVoices();
    synth?.addEventListener("voiceschanged", loadVoices);
    inputs.forEach((type) =>
      window.addEventListener(type, manualScroll, { passive: true })
    );
  });
  onBeforeUnmount(() => {
    disposed = true;
    stop();
    synth?.removeEventListener("voiceschanged", loadVoices);
    inputs.forEach((type) => window.removeEventListener(type, manualScroll));
  });
  return {
    supported,
    rate,
    voiceURI,
    includeBoxes,
    voices,
    index,
    entries,
    state,
    message,
    following,
    current,
    play,
    pause,
    stop,
    step,
    setRate,
    setVoice,
    setBoxes,
    backToReading,
  };
}
