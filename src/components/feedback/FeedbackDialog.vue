<script setup>
/*
 * FeedbackDialog — "Send feedback" (OPENBRAIN-101). Mounted once (App.vue);
 * any entry opens it through useFeedback().openFeedback(context). Signed-out
 * readers are asked to sign in, since feedback rows belong to an account.
 */
import { computed, ref, watch } from "vue";
import BaseModal from "@/components/dashboard/shared/BaseModal.vue";
import Button from "@/components/dashboard/shared/Button.vue";
import FormField from "@/components/dashboard/shared/FormField.vue";
import SegmentedControl from "@/components/dashboard/shared/SegmentedControl.vue";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX,
  useFeedback,
} from "@/composables/useFeedback";
import { useAuth } from "@/composables/useAuth";
import { useAuthStore } from "@/stores/auth";

const { open, context, closeFeedback, sendFeedback } = useFeedback();
const { user } = useAuth();
const authStore = useAuthStore();

const kind = ref("general");
const message = ref("");
const status = ref("idle"); // idle | sending | sent | error
const error = ref("");

// A fresh form each time it opens.
watch(open, (isOpen) => {
  if (!isOpen) return;
  kind.value = "general";
  message.value = "";
  status.value = "idle";
  error.value = "";
});

const left = computed(() => FEEDBACK_MAX - message.value.length);
const canSend = computed(
  () => message.value.trim().length > 0 && status.value !== "sending"
);

async function send() {
  if (!canSend.value) return;
  status.value = "sending";
  error.value = "";
  try {
    await sendFeedback({ kind: kind.value, message: message.value });
    status.value = "sent";
  } catch (e) {
    status.value = "error";
    error.value =
      e?.message && !/^HTTP|fetch/i.test(e.message)
        ? e.message
        : "It didn't send. Check your connection and try again.";
  }
}

function signIn() {
  closeFeedback();
  authStore.openAuth("login");
}
</script>

<template>
  <BaseModal
    :model-value="open"
    title="Send feedback"
    size="md"
    @close="closeFeedback"
  >
    <div class="fb">
      <template v-if="!user">
        <p class="fb-lead">
          Sign in to send feedback, so the authors can follow up with you.
        </p>
      </template>

      <template v-else-if="status === 'sent'">
        <p class="fb-lead">
          Thank you. The authors read every message
          <template v-if="context.label"> about {{ context.label }}</template
          >.
        </p>
      </template>

      <template v-else>
        <p class="fb-lead">
          Tell the authors what worked, what didn't, or what you'd like to see.
          <span v-if="context.label" class="fb-about"
            >About: {{ context.label }}</span
          >
        </p>
        <SegmentedControl
          v-model="kind"
          :options="FEEDBACK_KINDS"
          aria-label="What is it about"
        />
        <FormField
          label="Your feedback"
          :hint="`${left} characters left`"
          :error="status === 'error' ? error : ''"
        >
          <textarea
            v-model="message"
            rows="6"
            :maxlength="FEEDBACK_MAX"
            placeholder="Write here…"
            @keydown.meta.enter="send"
            @keydown.ctrl.enter="send"
          ></textarea>
        </FormField>
      </template>
    </div>

    <template #footer>
      <template v-if="!user">
        <Button variant="ghost" @click="closeFeedback">Not now</Button>
        <Button @click="signIn">Sign in</Button>
      </template>
      <template v-else-if="status === 'sent'">
        <Button @click="closeFeedback">Done</Button>
      </template>
      <template v-else>
        <Button variant="ghost" @click="closeFeedback">Cancel</Button>
        <Button
          :disabled="!canSend"
          :loading="status === 'sending'"
          @click="send"
          >Send</Button
        >
      </template>
    </template>
  </BaseModal>
</template>

<style scoped>
.fb {
  display: grid;
  gap: 1rem;
}
.fb-lead {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.55;
  color: rgb(var(--color-ink));
}
.fb-about {
  display: block;
  margin-top: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
textarea {
  width: 100%;
  resize: vertical;
}
</style>
