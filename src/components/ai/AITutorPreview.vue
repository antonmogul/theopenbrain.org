<script setup>
import { computed, ref, watch } from "vue";
import { buildChapterPreview } from "@/helper/chapterPreview";
import { useLocalReadAloud } from "@/composables/useLocalReadAloud";

const props = defineProps({ chapter: { type: Object, default: null } });
const mode = ref("chat");
const selectedSection = ref("");
const preview = computed(() => buildChapterPreview(props.chapter));
const section = computed(
  () =>
    preview.value.sections.find(
      (entry) => entry.id === selectedSection.value
    ) || preview.value.sections[0]
);
const {
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
} = useLocalReadAloud();
const spokenPassages = computed(() =>
  mode.value === "podcast" ? preview.value.podcastLines : preview.value.passages
);
const transcriptDownload = computed(
  () =>
    `data:text/plain;charset=utf-8,${encodeURIComponent(preview.value.podcastTranscript)}`
);
watch(
  [mode, preview],
  () => {
    stop();
    selectedSection.value = preview.value.sections[0]?.id || "";
  },
  { flush: "sync", immediate: true }
);
</script>

<template>
  <section class="offline-preview" aria-label="Offline chapter previews">
    <h3>Offline previews</h3>
    <p class="preview-notice">
      These scripted previews use the loaded chapter. They are not live AI.
      These previews send no chapter text and save no messages. Live AI chat, AI
      narration and AI podcast generation still need a server integration.
    </p>
    <div class="preview-modes" aria-label="Preview format">
      <button
        type="button"
        :aria-pressed="mode === 'chat'"
        @click="mode = 'chat'"
      >
        Chat walkthrough
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'read'"
        @click="mode = 'read'"
      >
        Read aloud
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'podcast'"
        @click="mode = 'podcast'"
      >
        Podcast format
      </button>
    </div>
    <p v-if="!preview.sections.length" role="status">
      Load a chapter with text to try these previews.
    </p>
    <template v-else>
      <div v-if="mode === 'chat'" class="scripted-chat">
        <p>
          Scripted walkthrough. Choose a chapter section to reveal its opening
          passage; there are no generated answers or free-form prompts.
        </p>
        <label
          >Chapter section
          <select v-model="selectedSection">
            <option
              v-for="entry in preview.sections"
              :key="entry.id"
              :value="entry.id"
            >
              {{ entry.heading }}
            </option>
          </select>
        </label>
        <div class="source-excerpt" aria-live="polite">
          <p>
            <strong>Reader:</strong> Show the opening passage of “{{
              section.heading
            }}”.
          </p>
          <p><strong>Source reader:</strong> {{ section.excerpt.text }}</p>
          <p class="source-label">
            {{
              section.excerpt.shortened
                ? "Shortened opening excerpt"
                : "Opening excerpt"
            }}
            · {{ section.heading }} · Source wording, with formatting and
            whitespace normalized
          </p>
        </div>
      </div>
      <template v-else>
        <p v-if="mode === 'read'">
          Read the loaded chapter's headings and prose aloud. Figures,
          interactive content, captions, reference lists and footnotes are not
          narrated. This is device text-to-speech, not AI narration.
        </p>
        <p v-else>
          Scripted host-and-reader format using opening excerpts from up to four
          chapter sections. This is a short source-reading preview, not an
          AI-generated episode or audio file.
        </p>
        <p class="voice-notice">
          Playback uses only a voice your browser identifies as local to this
          device. It starts only when you choose Play.
        </p>
        <div v-if="available" class="playback">
          <label
            >Local-device voice
            <select v-model="selectedVoiceId" :disabled="state !== 'idle'">
              <option
                v-for="voice in voices"
                :key="voiceId(voice)"
                :value="voiceId(voice)"
              >
                {{ voice.name }} ({{ voice.lang }})
              </option>
            </select>
          </label>
          <div class="playback-buttons">
            <button
              type="button"
              :disabled="state !== 'idle'"
              @click="play(spokenPassages)"
            >
              Play
            </button>
            <button v-if="state === 'paused'" type="button" @click="resume">
              Resume
            </button>
            <button
              v-else
              type="button"
              :disabled="state !== 'speaking'"
              @click="pause"
            >
              Pause
            </button>
            <button type="button" :disabled="state === 'idle'" @click="stop">
              Stop
            </button>
          </div>
          <p role="status">
            {{
              state === "speaking"
                ? "Playing"
                : state === "paused"
                  ? "Paused"
                  : progress === 100
                    ? "Finished"
                    : "Stopped"
            }}
            · {{ progress }}%
          </p>
        </div>
        <p v-else role="status">{{ unavailableReason }}</p>
        <p v-if="error" role="alert">{{ error }}</p>
        <template v-if="mode === 'podcast'">
          <a
            class="transcript-download"
            :href="transcriptDownload"
            download="chapter-podcast-preview.txt"
            >Download plain transcript</a
          >
          <div class="transcript" aria-label="Scripted podcast transcript">
            <p v-for="(line, index) in preview.podcastLines" :key="index">
              {{ line }}
            </p>
          </div>
        </template>
      </template>
    </template>
  </section>
</template>

<style scoped>
.offline-preview {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  color: rgb(var(--color-ink));
  font-size: var(--ui-size-13);
  line-height: 1.5;
}
h3 {
  margin: 0 0 8px;
  font-size: var(--ui-size-16);
}
p {
  margin: 0 0 12px;
}
.preview-notice,
.voice-notice,
.source-label {
  color: rgb(var(--color-mute));
}
.preview-modes,
.playback-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
button,
select {
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font: inherit;
  padding: 8px;
}
button {
  cursor: pointer;
}
button[aria-pressed="true"] {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
label {
  display: block;
}
select {
  display: block;
  width: 100%;
  margin-top: 6px;
}
.source-excerpt,
.transcript {
  margin-top: 16px;
  border-top: 1px solid rgb(var(--color-line));
  padding-top: 16px;
  overflow-wrap: anywhere;
}
.transcript-download {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}
</style>
