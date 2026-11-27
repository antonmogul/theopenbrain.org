<script setup>
import { nextTick, ref, watch } from "vue";
import { jumpToId } from "@/helper/readerJump";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  signedIn: Boolean,
  messages: { type: Array, default: () => [] },
  conversations: { type: Array, default: () => [] },
  busy: Boolean,
  error: { type: String, default: "" },
});
const emit = defineEmits(["send", "retry", "new", "load", "cancel"]);
const draft = ref("");
const log = ref(null);
const flips = ref({});
const answers = ref({});
const historyOpen = ref(false);
watch(
  () => props.messages,
  () => {
    flips.value = {};
    answers.value = {};
  }
);
const { close } = useReaderSidebar();
const auth = useAuthStore();
function send(text = draft.value) {
  if (!text.trim() || props.busy) return;
  emit("send", text);
}
// Keep the draft on errors; clear it only after a completed reply.
watch(
  () => props.busy,
  (busy) => {
    if (!busy && !props.error) draft.value = "";
  }
);
watch(
  () => props.messages.map((m) => m.text).join(""),
  async () => {
    const nearEnd =
      !log.value ||
      log.value.scrollHeight - log.value.scrollTop - log.value.clientHeight <
        120;
    await nextTick();
    if (nearEnd && log.value) log.value.scrollTop = log.value.scrollHeight;
  }
);
function citationPath(citation) {
  return `/chapter/${encodeURIComponent(citation.number)}/${encodeURIComponent(citation.chapter)}#${encodeURIComponent(citation.id)}`;
}
function jump(event, citation) {
  if (
    window.location.pathname.endsWith(`/${citation.chapter}`) &&
    jumpToId(citation.id, { flash: true, focus: true })
  ) {
    event.preventDefault();
    if (window.innerWidth < 768) close();
  }
  // Cross-chapter native navigation uses ChapterView's readerJump hash landing.
}
function sourceFor(message, id) {
  return message.citations?.find((c) => c.id === id);
}
function visibleText(text) {
  return (text || "").replace(/\[¶[^\]]+\]/g, "");
}
</script>

<template>
  <div class="study-partner" data-testid="study-partner">
    <header class="sp-heading">
      <span class="sp-brain" :class="{ 'is-thinking': busy }" aria-hidden="true"
        ><i></i><i></i
      ></span>
      <div>
        <h2>Study partner</h2>
        <p>A little company. A lot to discover.</p>
      </div>
      <button
        v-if="signedIn"
        type="button"
        class="sp-new"
        :disabled="busy"
        @click="$emit('new')"
      >
        New
      </button>
    </header>
    <div v-if="!signedIn" class="sp-empty">
      <h3>Let’s get to know your reading.</h3>
      <p>
        Sign in to pick up from your highlights, notes and place in the book.
      </p>
      <button type="button" class="sp-primary" @click="auth.openAuth('login')">
        Sign in
      </button>
    </div>
    <template v-else>
      <div v-if="conversations.length" class="sp-history">
        <button
          type="button"
          :aria-expanded="historyOpen"
          @click="historyOpen = !historyOpen"
        >
          Recent conversations
        </button>
        <div v-if="historyOpen">
          <button
            v-for="conversation in conversations"
            :key="conversation.id"
            type="button"
            :disabled="busy"
            @click="
              $emit('load', conversation.id);
              historyOpen = false;
            "
          >
            {{ conversation.title }}
          </button>
        </div>
      </div>
      <div
        ref="log"
        class="sp-log"
        role="log"
        aria-label="Study conversation"
        :aria-busy="busy"
      >
        <div v-if="!messages.length && !busy && !error" class="sp-empty">
          <h3>Where shall we start?</h3>
          <p>
            Your partner can help you explore the book, one question at a time.
          </p>
          <button type="button" @click="$emit('retry')">
            Meet your study partner
          </button>
        </div>
        <article
          v-for="(message, mi) in messages"
          :key="mi"
          class="sp-message"
          :class="`sp-message--${message.role}`"
        >
          <span class="sp-speaker">{{
            message.role === "user" ? "You" : "Study partner"
          }}</span>
          <p v-if="message.text" class="sp-text">
            {{ visibleText(message.text) }}
          </p>
          <template v-for="(tool, ti) in message.tools || []" :key="ti">
            <div v-if="tool.name === 'suggest_actions'" class="sp-actions">
              <button
                v-for="action in tool.input.actions"
                :key="action"
                type="button"
                :disabled="busy"
                @click="send(action)"
              >
                {{ action }} <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div v-if="tool.name === 'show_flashcards'" class="sp-cards">
              <p class="sp-note">
                Saved here in your conversation. Tap a card to turn it over.
              </p>
              <div
                v-for="(card, ci) in tool.input.cards"
                :key="ci"
                class="sp-card-wrap"
              >
                <button
                  type="button"
                  class="sp-flip"
                  :aria-pressed="!!flips[`${mi}-${ti}-${ci}`]"
                  @click="
                    flips[`${mi}-${ti}-${ci}`] = !flips[`${mi}-${ti}-${ci}`]
                  "
                >
                  <span class="sp-speaker">{{
                    flips[`${mi}-${ti}-${ci}`] ? "Answer" : `Card ${ci + 1}`
                  }}</span>
                  <span>{{
                    flips[`${mi}-${ti}-${ci}`] ? card.back : card.front
                  }}</span>
                  <small>{{
                    flips[`${mi}-${ti}-${ci}`]
                      ? "Back to question"
                      : "Turn over"
                  }}</small>
                </button>
                <a
                  v-if="sourceFor(message, card.sourceParagraphId)"
                  class="sp-source"
                  :href="
                    citationPath(sourceFor(message, card.sourceParagraphId))
                  "
                  @click="
                    jump($event, sourceFor(message, card.sourceParagraphId))
                  "
                  >Read the source ↗</a
                >
              </div>
            </div>
            <div v-if="tool.name === 'show_quiz'" class="sp-quiz">
              <p class="sp-note">
                Practice, not a graded course quiz. Choose an answer to reveal
                the explanation.
              </p>
              <fieldset
                v-for="(question, qi) in tool.input.questions"
                :key="qi"
              >
                <legend>{{ qi + 1 }}. {{ question.question }}</legend>
                <button
                  v-for="(option, oi) in question.options"
                  :key="oi"
                  type="button"
                  :disabled="answers[`${mi}-${ti}-${qi}`] !== undefined"
                  :class="{ 'is-chosen': answers[`${mi}-${ti}-${qi}`] === oi }"
                  @click="answers[`${mi}-${ti}-${qi}`] = oi"
                >
                  {{ option }}
                </button>
                <div
                  v-if="answers[`${mi}-${ti}-${qi}`] !== undefined"
                  class="sp-reveal"
                  role="status"
                >
                  <strong>{{
                    answers[`${mi}-${ti}-${qi}`] === question.correctIndex
                      ? "You’ve got it."
                      : "Worth another look."
                  }}</strong>
                  <p>
                    {{ question.options[question.correctIndex] }} —
                    {{ question.explanation }}
                  </p>
                  <a
                    v-if="sourceFor(message, question.sourceParagraphId)"
                    :href="
                      citationPath(
                        sourceFor(message, question.sourceParagraphId)
                      )
                    "
                    @click="
                      jump(
                        $event,
                        sourceFor(message, question.sourceParagraphId)
                      )
                    "
                    >Read the source ↗</a
                  >
                </div>
              </fieldset>
            </div>
          </template>
          <nav
            v-if="
              message.citations?.length &&
              !message.tools?.some((t) =>
                ['show_quiz', 'show_flashcards'].includes(t.name)
              )
            "
            class="sp-sources"
            aria-label="Sources in the book"
          >
            <a
              v-for="citation in message.citations"
              :key="citation.id"
              :href="citationPath(citation)"
              @click="jump($event, citation)"
              >§ {{ citation.title }} ↗</a
            >
          </nav>
        </article>
        <p v-if="busy" class="sp-note" role="status">
          Checking the book…
          <button type="button" @click="$emit('cancel')">Cancel</button>
        </p>
      </div>
      <div v-if="error" class="sp-error" role="alert">
        <p>{{ error }}</p>
        <button type="button" :disabled="busy" @click="$emit('retry')">
          Try again
        </button>
      </div>
      <form class="sp-compose" @submit.prevent="send()">
        <label for="study-question" class="sr-only">Ask about the book</label>
        <textarea
          id="study-question"
          v-model="draft"
          maxlength="4000"
          rows="2"
          placeholder="What are you curious about?"
          :disabled="busy"
          @keydown.enter.exact.prevent="send()"
        ></textarea>
        <button
          class="sp-primary"
          type="submit"
          :disabled="busy || !draft.trim()"
        >
          Ask
        </button>
      </form>
      <p class="sp-footnote">
        Stays inside the book. Follow the sources to check an answer.
      </p>
    </template>
  </div>
</template>

<style scoped>
.study-partner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  background: rgb(var(--color-paper));
}
.sp-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.sp-heading h2 {
  font-size: 18px;
  font-weight: 550;
  line-height: 1.2;
  margin: 0;
}
.sp-heading p,
.sp-footnote,
.sp-note {
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--color-mute));
}
.sp-heading p {
  margin: 4px 0 0;
}
.sp-brain {
  display: flex;
  flex: none;
  width: 32px;
  height: 30px;
  transform: rotate(-8deg);
}
.sp-brain i {
  width: 16px;
  border: 1.5px solid currentColor;
  border-radius: 65% 40% 35% 65%;
  background: rgb(var(--color-chapter) / 0.15);
}
.sp-brain i::after {
  content: "";
  display: block;
  width: 7px;
  height: 17px;
  margin: 5px 3px;
  border-top: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  border-radius: 50%;
}
.sp-brain i + i {
  transform: scaleX(-1);
  margin-left: 2px;
}
.is-thinking {
  animation: sp-think 1.8s ease-in-out infinite;
}
@keyframes sp-think {
  50% {
    transform: rotate(8deg) translateY(-2px);
  }
}
.sp-new {
  margin-left: auto;
}
button,
a {
  touch-action: manipulation;
}
button {
  cursor: pointer;
  font: inherit;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
button:focus-visible,
a:focus-visible,
textarea:focus-visible {
  outline: 2px solid rgb(var(--color-ink));
  outline-offset: 3px;
}
.sp-new,
.sp-history button,
.sp-error button,
.sp-note button {
  min-height: 36px;
  text-decoration: underline;
  font-size: 12px;
}
.sp-history {
  padding: 0 18px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.sp-history > div {
  display: grid;
  max-height: 140px;
  overflow: auto;
}
.sp-history > div button {
  text-align: left;
}
.sp-log {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 20px 18px;
}
.sp-message {
  margin-bottom: 24px;
}
.sp-message--user {
  margin-left: 24px;
  padding: 12px;
  background: rgb(var(--color-ink) / 0.05);
}
.sp-speaker {
  display: block;
  font-family: var(--font-mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
  margin-bottom: 7px;
}
.sp-text {
  hyphens: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 15px;
  line-height: 1.55;
  margin: 0;
}
.sp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
}
.sp-actions button {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  text-align: left;
  min-height: 48px;
  border: 1px solid rgb(var(--color-line));
  padding: 10px;
  font-size: 13px;
  line-height: 1.3;
}
.sp-actions button:hover:not(:disabled) {
  border-color: rgb(var(--color-ink));
  background: rgb(var(--color-ink) / 0.03);
}
.sp-empty {
  padding: 24px 18px;
}
.sp-empty h3 {
  font-size: 22px;
  line-height: 1.25;
  font-family: var(--font-display);
}
.sp-empty p {
  margin: 12px 0 20px;
  line-height: 1.5;
}
.sp-compose {
  display: flex;
  gap: 8px;
  padding: 12px 18px 6px;
  border-top: 1px solid rgb(var(--color-line));
}
.sp-compose textarea {
  flex: 1;
  min-width: 0;
  resize: none;
  padding: 10px;
  border: 1px solid rgb(var(--color-line));
  background: transparent;
  font: inherit;
  font-size: 16px;
}
.sp-primary {
  font-size: 14px;
  padding: 10px 16px;
  min-height: 44px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.sp-footnote {
  margin: 0;
  padding: 4px 18px 12px;
  font-size: 10px;
}
.sp-error {
  padding: 12px 18px;
  border-top: 1px solid rgb(var(--color-line));
  font-size: 13px;
}
.sp-flip {
  width: 100%;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 20px;
  border: 1px solid rgb(var(--color-ink));
  background: rgb(var(--color-chapter) / 0.05);
  font-size: 16px;
  line-height: 1.45;
  text-align: left;
}
.sp-flip small {
  font: 11px var(--font-mono);
}
.sp-card-wrap {
  margin: 14px 0;
}
.sp-source,
.sp-sources a,
.sp-reveal a {
  display: inline-block;
  padding: 10px 0;
  font-size: 12px;
  text-decoration: underline;
}
.sp-sources {
  display: flex;
  flex-wrap: wrap;
  column-gap: 12px;
}
.sp-quiz fieldset {
  margin: 20px 0;
  padding: 12px;
  border: 1px solid rgb(var(--color-line));
}
.sp-quiz legend {
  padding: 0 4px;
  font-size: 15px;
  line-height: 1.5;
}
.sp-quiz fieldset > button {
  display: block;
  width: 100%;
  text-align: left;
  min-height: 44px;
  border: 1px solid rgb(var(--color-line));
  padding: 8px;
  margin: 6px 0;
  font-size: 13px;
}
.sp-quiz .is-chosen {
  border-color: rgb(var(--color-ink));
  opacity: 1;
}
.sp-reveal {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.5;
}
@media (prefers-reduced-motion: reduce) {
  :global(html:not([data-reduce-motion="0"])) .is-thinking {
    animation: none;
  }
}
:global([data-reduce-motion="1"]) .is-thinking {
  animation: none;
}
</style>
