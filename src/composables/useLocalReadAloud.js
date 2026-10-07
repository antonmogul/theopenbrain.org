import {
  computed,
  inject,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";
import { routerKey } from "vue-router";
import { speechChunks } from "@/helper/chapterPreview";

export function useLocalReadAloud() {
  const router = inject(routerKey, null);
  const voices = ref([]);
  const selectedVoiceId = ref("");
  const supported = ref(false);
  const state = ref("idle");
  const error = ref("");
  const progress = ref(0);
  let synthesis;
  let utterance = null;
  let queue = [];
  let cursor = 0;
  let generation = 0;
  let removeNavigationHook;
  const voiceId = (voice) => `${voice.voiceURI || voice.name}|${voice.lang}`;
  const available = computed(() => supported.value && voices.value.length > 0);
  const unavailableReason = computed(() =>
    !supported.value
      ? "Local read-aloud is not supported by this browser. The text preview is still available."
      : "No local-device voice is available. Remote voices are never used."
  );

  function stop() {
    generation += 1;
    const ownedPlayback = utterance || state.value !== "idle";
    utterance = null;
    queue = [];
    cursor = 0;
    progress.value = 0;
    state.value = "idle";
    if (ownedPlayback) {
      try {
        synthesis?.cancel();
      } catch {
        /* State is already safely stopped. */
      }
    }
  }

  function refreshVoices() {
    if (!supported.value) return;
    try {
      // Strict true is required. Missing/unknown locality never falls back to a
      // default voice, because that default could use a remote service.
      voices.value = synthesis
        .getVoices()
        .filter((voice) => voice.localService === true);
      if (
        !voices.value.some((voice) => voiceId(voice) === selectedVoiceId.value)
      ) {
        stop();
        selectedVoiceId.value = voices.value.length
          ? voiceId(voices.value[0])
          : "";
      }
    } catch {
      stop();
      voices.value = [];
      error.value = "The browser could not list local-device voices.";
    }
  }

  function currentVoice() {
    // Revalidate against the browser before each utterance and resume; never
    // hand a stale or remote voice to the speech engine.
    return synthesis
      ?.getVoices()
      .find(
        (voice) =>
          voice.localService === true &&
          voiceId(voice) === selectedVoiceId.value
      );
  }

  function speakNext(run) {
    if (run !== generation || state.value !== "speaking") return;
    if (cursor >= queue.length) {
      utterance = null;
      state.value = "idle";
      progress.value = 100;
      return;
    }
    try {
      const voice = currentVoice();
      if (!voice)
        throw new Error("The selected local voice is no longer available.");
      utterance = new window.SpeechSynthesisUtterance(queue[cursor]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.onend = () => {
        if (run !== generation) return;
        utterance = null;
        cursor += 1;
        progress.value = Math.round((cursor / queue.length) * 100);
        speakNext(run);
      };
      utterance.onerror = () => {
        if (run !== generation) return;
        stop();
        error.value =
          "Local playback stopped. You can try Play again or read the transcript.";
      };
      synthesis.speak(utterance);
    } catch {
      stop();
      error.value =
        "Local playback could not start. A working local-device voice is required.";
    }
  }

  function play(passages) {
    if (state.value !== "idle") return;
    error.value = "";
    refreshVoices();
    if (!available.value) return;
    queue = speechChunks(passages);
    if (!queue.length) return;
    try {
      // cancel() does not reset the browser engine's paused flag. Normalize it
      // only on this explicit Play, including after a paused component unmount.
      // Clear a paused queue before resume so no stale utterance can restart.
      if (synthesis.paused) {
        synthesis.cancel();
        synthesis.resume();
      }
    } catch {
      stop();
      error.value =
        "Local playback could not restart. Try another local-device voice.";
      return;
    }
    cursor = 0;
    progress.value = 0;
    state.value = "speaking";
    speakNext(++generation);
  }

  function pause() {
    if (state.value !== "speaking") return;
    try {
      state.value = "paused";
      synthesis.pause();
    } catch {
      stop();
      error.value =
        "This browser could not pause local playback. Playback was stopped.";
    }
  }

  function resume() {
    if (state.value !== "paused") return;
    try {
      if (!currentVoice()) throw new Error("Local voice unavailable");
      synthesis.resume();
      state.value = "speaking";
      if (!utterance) speakNext(generation);
    } catch {
      stop();
      error.value = "Local playback could not resume. Try Play again.";
    }
  }

  watch(selectedVoiceId, stop, { flush: "sync" });

  onMounted(() => {
    synthesis = window.speechSynthesis;
    supported.value =
      typeof window.SpeechSynthesisUtterance === "function" &&
      ["getVoices", "speak", "cancel", "pause", "resume"].every(
        (method) => typeof synthesis?.[method] === "function"
      );
    refreshVoices();
    synthesis?.addEventListener?.("voiceschanged", refreshVoices);
    window.addEventListener("pagehide", stop);
    removeNavigationHook = router?.afterEach(stop);
  });
  // ChatTab is cached with KeepAlive. Leaving it must not keep invisible
  // narration running, and returning requires an explicit Play action.
  onDeactivated(stop);
  onBeforeUnmount(() => {
    stop();
    synthesis?.removeEventListener?.("voiceschanged", refreshVoices);
    window.removeEventListener("pagehide", stop);
    removeNavigationHook?.();
  });

  return {
    voices,
    voiceId,
    selectedVoiceId,
    available,
    unavailableReason,
    state,
    error,
    progress,
    play,
    pause,
    resume,
    stop,
  };
}
