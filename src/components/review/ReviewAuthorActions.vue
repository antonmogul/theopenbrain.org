<script setup>
import { ref } from "vue";
import "./review.css";

const props = defineProps({
  note: { type: Object, required: true },
  /** Resolves on success, throws on failure. Supplied only for this browser's notes. */
  action: { type: Function, default: null },
});
const reopening = ref(false);
const comment = ref("");
const busy = ref(false);
const error = ref("");
async function act(action) {
  if (busy.value || !props.action) return;
  busy.value = true;
  error.value = "";
  try {
    await props.action(props.note.id, action, comment.value.trim());
    comment.value = "";
    reopening.value = false;
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div
    v-if="action && ['done', 'wont_do', 'verified'].includes(note.status)"
    class="rv-author-actions"
  >
    <div class="rv-action-buttons">
      <button
        v-if="note.status !== 'verified'"
        type="button"
        class="rv-btn rv-btn--check"
        :disabled="busy"
        @click="act('verify')"
      >
        Looks good ✓
      </button>
      <button
        type="button"
        class="rv-btn"
        :disabled="busy"
        :aria-expanded="reopening"
        @click="reopening = !reopening"
      >
        Not quite
      </button>
    </div>
    <form v-if="reopening" class="rv-reopen" @submit.prevent="act('reopen')">
      <label class="rv-label"
        >What still needs changing?
        <textarea
          v-model="comment"
          class="rv-textarea"
          required
          maxlength="4000"
          :disabled="busy"
        ></textarea>
      </label>
      <button type="submit" class="rv-btn" :disabled="busy || !comment.trim()">
        {{ busy ? "Saving…" : "Reopen with comment" }}
      </button>
    </form>
    <p v-if="busy" class="rv-hint" role="status">Saving your check…</p>
    <p v-if="error" class="rv-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.rv-author-actions,
.rv-reopen {
  display: grid;
  gap: 8px;
}
.rv-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.rv-btn--check {
  background: rgb(var(--color-complete));
  color: rgb(var(--color-dark-surface));
  border-color: transparent;
}
</style>
