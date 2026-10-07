<script setup>
// Destructive/confirm prompt built on BaseModal + Button. Token danger language.
// Opening it moves focus to Cancel (the safe answer, whatever the variant, so
// a held or repeated Enter from the button that asked can't confirm);
// closing it returns focus to that button.
import { computed, ref } from "vue";
import { useDialogFocus } from "@/composables/useDialogFocus.js";
import BaseModal from "./BaseModal.vue";
import Button from "./Button.vue";
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  show: { type: Boolean, default: undefined },
  title: { type: String, default: "Confirm" },
  message: { type: String, default: "Are you sure?" },
  confirmLabel: { type: String, default: "Confirm" },
  cancelLabel: { type: String, default: "Cancel" },
  variant: { type: String, default: "danger" }, // danger | warn | info
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);
const confirmVariant = computed(() =>
  props.variant === "info" ? "solid" : "danger"
);
const openValue = computed(() =>
  props.show !== undefined ? props.show : props.modelValue
);
function cancel() {
  emit("update:modelValue", false);
  emit("cancel");
}
const cancelButton = ref(null);
useDialogFocus(
  () => openValue.value,
  () => cancelButton.value?.$el ?? cancelButton.value
);
</script>

<template>
  <BaseModal
    :model-value="openValue"
    :title="title"
    size="sm"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="cancel"
  >
    <p class="confirm-msg">
      <slot>{{ message }}</slot>
    </p>
    <template #footer>
      <Button ref="cancelButton" variant="ghost" size="sm" @click="cancel">{{
        cancelLabel
      }}</Button>
      <Button
        :variant="confirmVariant"
        size="sm"
        :loading="loading"
        @click="$emit('confirm')"
        >{{ confirmLabel }}</Button
      >
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm-msg {
  font-family: var(--font-body);
  font-size: var(--ui-size-15);
  line-height: 1.5;
  color: rgb(var(--color-ink));
  margin: 0;
}
</style>
