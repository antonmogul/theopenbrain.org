<script setup>
/*
 * ReviewIdentity — who is writing (OPENBRAIN-204). Asked once, kept in this
 * browser (ob.review.identity), shown on every note in the dashboard.
 */
import { ref, useId } from "vue";
import { REVIEW_LIMITS, REVIEW_ROLES } from "@/composables/useReviewFeedback";
import "./review.css";

const props = defineProps({
  /** Prefill: { name, role }. */
  initial: { type: Object, default: null },
});
const emit = defineEmits(["save"]);

const id = useId();
const name = ref(props.initial?.name || "");
const role = ref(props.initial?.role || "author");
const error = ref("");

function save() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    error.value = "Your name, so the authors know who wrote the note.";
    return;
  }
  error.value = "";
  emit("save", { name: trimmed, role: role.value });
}
</script>

<template>
  <form class="rv-id" data-review-ui @submit.prevent="save">
    <p class="rv-id-lead">
      Notes go straight to the book's team, with your name on them. Point at the
      place, or select the words, and say what should change.
    </p>
    <label class="rv-label" :for="`${id}-name`">Your name</label>
    <input
      :id="`${id}-name`"
      v-model="name"
      class="rv-input"
      type="text"
      autocomplete="name"
      :maxlength="REVIEW_LIMITS.name"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : undefined"
      data-testid="review-name"
    />
    <fieldset class="rv-roles">
      <legend class="rv-label">You are</legend>
      <label v-for="r in REVIEW_ROLES" :key="r.value" class="rv-role">
        <input
          v-model="role"
          type="radio"
          :name="`${id}-role`"
          :value="r.value"
        />
        <span>{{ r.label }}</span>
      </label>
    </fieldset>
    <p v-if="error" :id="`${id}-error`" class="rv-error" role="alert">
      {{ error }}
    </p>
    <button
      type="submit"
      class="rv-btn rv-btn--go"
      data-testid="review-name-save"
    >
      Start reviewing
    </button>
  </form>
</template>

<style scoped>
.rv-id {
  display: grid;
  gap: 10px;
}

.rv-id-lead {
  margin: 0 0 4px;
  color: rgb(var(--color-mute));
  font-size: var(--ui-size-13);
  line-height: 1.45;
}

.rv-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  border: 0;
}

.rv-roles legend {
  margin-bottom: 4px;
}

.rv-role {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ui-size-14);
}
</style>
