<script setup>
// Reader messages use public.feedback; reviewer notes have a separate workflow.
import { computed, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX,
  useFeedback,
} from "@/composables/useFeedback";

const props = defineProps({
  moduleId: { type: String, required: true },
  isAuthenticated: { type: Boolean, default: false },
});
const auth = useAuthStore();
const { sendFeedback } = useFeedback();
const kind = ref("content");
const message = ref("");
const status = ref("idle");
const pendingSignIn = ref(false);
let revision = 0;
const canSend = computed(
  () => !!message.value.trim() && status.value !== "sending"
);

watch(
  () => props.moduleId,
  () => {
    revision++;
    kind.value = "content";
    message.value = "";
    status.value = "idle";
    pendingSignIn.value = false;
  }
);
watch(
  () => props.isAuthenticated,
  (signedIn) => {
    if (signedIn && pendingSignIn.value) {
      pendingSignIn.value = false;
      send();
    }
  }
);
watch(
  () => auth.activeAuth,
  (open) => {
    if (!open && !props.isAuthenticated) pendingSignIn.value = false;
  }
);

async function send() {
  if (!canSend.value || !props.moduleId) return;
  if (!props.isAuthenticated) {
    pendingSignIn.value = true;
    auth.openAuth("login");
    return;
  }
  const current = revision;
  status.value = "sending";
  try {
    await sendFeedback({
      kind: kind.value,
      message: message.value,
      // Explicit chapter context: opening another feedback entry cannot change it.
      context: { moduleId: props.moduleId, sectionId: null },
    });
    if (current === revision) status.value = "sent";
  } catch {
    if (current === revision) status.value = "error";
  }
}
</script>

<template>
  <div class="reader-feedback" data-reader-feedback>
    <div class="reader-feedback-intro">
      <h3>Tell us what you think</h3>
      <p>What worked in this chapter? What could we make better?</p>
    </div>
    <div class="reader-feedback-body">
      <p role="status" class="reader-feedback-status">
        <template v-if="status === 'sent'">
          Thank you. Your feedback has been sent to the authors.
        </template>
        <template v-else-if="status === 'sending'"
          >Sending your feedback…</template
        >
      </p>
      <form v-if="status !== 'sent'" @submit.prevent="send">
        <label>
          Category
          <select v-model="kind" :disabled="status === 'sending'">
            <option
              v-for="option in FEEDBACK_KINDS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <label>
          Your message
          <textarea
            v-model="message"
            rows="4"
            :maxlength="FEEDBACK_MAX"
            :disabled="status === 'sending'"
            required
          ></textarea>
        </label>
        <p v-if="status === 'error'" role="alert">
          It didn't send. Your message is still here. Please try again.
        </p>
        <div class="reader-feedback-actions">
          <p v-if="!isAuthenticated">
            Sign in to send. We'll keep your message here.
          </p>
          <button type="submit" :disabled="!canSend">
            {{
              status === "sending"
                ? "Sending…"
                : isAuthenticated
                  ? "Send"
                  : "Sign in to send"
            }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.reader-feedback {
  display: grid;
  gap: 1.5rem 3rem;
  margin-top: clamp(3rem, 6cqw, 5.5rem);
  padding-top: 2rem;
  border-top: 1px solid var(--cc-line, rgb(var(--color-line)));
  font-family: var(--font-body);
  color: inherit;
}
h3 {
  margin: 0;
  padding: 0;
  font-size: var(--ui-size-24);
  font-weight: 450;
  line-height: 1.3;
}
p {
  margin: 0.75rem 0 0;
  padding: 0;
  font-size: var(--ui-size-16);
  line-height: 1.5;
  max-width: 35ch;
}
.reader-feedback-body {
  min-width: 0;
}
.reader-feedback-status:empty {
  margin: 0;
}
form,
label {
  display: grid;
  gap: 0.5rem;
}
form {
  gap: 1rem;
}
label {
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  line-height: 1.5;
}
select,
textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  padding: 0.75rem;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  font-size: var(--ui-size-16);
  line-height: 1.5;
}
textarea {
  resize: vertical;
}
.reader-feedback-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}
.reader-feedback-actions p {
  margin: 0;
  font-size: var(--ui-size-13);
}
button {
  min-height: 2.75rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid currentColor;
  border-radius: var(--radius-control);
  color: inherit;
  background: transparent;
  font-family: var(--font-mono);
  font-size: var(--ui-size-13);
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: default;
}
button:hover:not(:disabled) {
  text-decoration: underline;
  text-underline-offset: 0.25em;
}
select:focus-visible,
textarea:focus-visible,
button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
@container (min-width: 48rem) {
  .reader-feedback {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
